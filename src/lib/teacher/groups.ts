import { prisma } from "@/lib/db";
import { defaultGradeGroupNames } from "./default-groups";

export type TeacherGroupOption = {
  id: string;
  name: string;
  rawName: string;
  parentId: string | null;
  sortOrder: number;
};

export type TeacherUnitFilter = {
  id: string;
  name: string;
  categories: Array<{
    id: string;
    name: string;
    rawName: string;
  }>;
};

export type TeacherTermForSummary = {
  termType: string;
  meanings: Array<{
    chineseMeaning: string | null;
    exampleSentence: string | null;
    usageContext: string | null;
  }>;
};

export type TeacherTermForEnrichmentSort = {
  text: string;
  termType: string;
  meanings: Array<{
    chineseMeaning: string | null;
    fieldSourcesJson?: string | null;
  }>;
};

export type TeacherGroupScope = {
  id: string;
  name: string;
  displayName: string;
  teacherHref: string;
  rootGroupId: string;
  unitId?: string;
  categoryId?: string;
};

export function selectTeacherGroup<T extends { id: string }>(
  groups: T[],
  selectedGroupId?: string | null,
): T | null {
  if (groups.length === 0) return null;
  return groups.find((group) => group.id === selectedGroupId) ?? groups[0];
}

export function summarizeTeacherTerms(terms: TeacherTermForSummary[]) {
  return terms.reduce(
    (summary, term) => {
      if (term.termType === "phrase") {
        summary.phraseCount += 1;
      } else if (term.termType === "sentence") {
        summary.sentenceCount += 1;
      } else {
        summary.wordCount += 1;
      }

      for (const meaning of term.meanings) {
        if (!meaning.chineseMeaning?.trim()) summary.missingFieldCount += 1;
        if (!meaning.exampleSentence?.trim()) summary.missingFieldCount += 1;
        if (term.termType === "phrase" && !meaning.usageContext?.trim()) {
          summary.missingFieldCount += 1;
        }
      }

      return summary;
    },
    { wordCount: 0, phraseCount: 0, sentenceCount: 0, missingFieldCount: 0 },
  );
}

export function sortTeacherTermsForEnrichment<T extends TeacherTermForEnrichmentSort>(terms: T[]) {
  return [...terms].sort((left, right) => {
    const leftMissing = hasNoVisibleChineseMeaning(left) ? 0 : 1;
    const rightMissing = hasNoVisibleChineseMeaning(right) ? 0 : 1;
    if (leftMissing !== rightMissing) return leftMissing - rightMissing;

    const typeOrder = left.termType.localeCompare(right.termType);
    if (typeOrder !== 0) return typeOrder;
    return left.text.localeCompare(right.text);
  });
}

export async function getTeacherGroups(): Promise<TeacherGroupOption[]> {
  await ensureDefaultTeacherGroups();
  const groups = await prisma.group.findMany({
    where: {
      parentId: null,
      name: { in: defaultGradeGroupNames },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  return groups.map((group) => ({ ...group, rawName: group.name }));
}

export async function getTeacherGroupTerms(groupId: string) {
  const groupIds = await getTeacherGroupScopeIds(groupId);
  return prisma.term.findMany({
    where: { groups: { some: { groupId: { in: groupIds } } } },
    include: { meanings: true },
    orderBy: [{ termType: "asc" }, { text: "asc" }],
  });
}

export async function getTeacherGroupScope(groupId: string): Promise<TeacherGroupScope | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      parent: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!group) return null;

  const root = group.parent?.parent ?? group.parent ?? group;
  const unit = group.parent?.parent ? group.parent : group.parent ? group : null;
  const category = group.parent?.parent ? group : null;
  const displayName = category ? formatTeacherCategoryName(category.name) : group.name;
  const searchParams = new URLSearchParams({ groupId: root.id });
  if (unit) searchParams.set("unitId", unit.id);
  if (category) searchParams.set("categoryId", category.id);

  return {
    id: group.id,
    name: group.name,
    displayName,
    teacherHref: `/teacher?${searchParams.toString()}`,
    rootGroupId: root.id,
    unitId: unit?.id,
    categoryId: category?.id,
  };
}

export async function getTeacherGroupScopeIds(groupId: string) {
  const groupIds = [groupId];
  let frontier = [groupId];

  while (frontier.length > 0) {
    const children = await prisma.group.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((child) => child.id);
    groupIds.push(...frontier);
  }

  return groupIds;
}

export async function getTeacherContentOutline(gradeGroupId: string): Promise<TeacherUnitFilter[]> {
  const units = await prisma.group.findMany({
    where: { parentId: gradeGroupId },
    include: {
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    categories: unit.children.map((category) => ({
      id: category.id,
      rawName: category.name,
      name: formatTeacherCategoryName(category.name),
    })),
  }));
}

export function formatTeacherCategoryName(name: string) {
  return name
    .replace(/\s*基础过关\s*/g, " ")
    .replace(/\s+-\s+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function hasNoVisibleChineseMeaning(term: TeacherTermForEnrichmentSort) {
  if (term.meanings.length === 0) return true;
  return !term.meanings.some((meaning) => {
    const chineseMeaning = meaning.chineseMeaning?.trim();
    if (!chineseMeaning) return false;
    return getFieldSource(meaning.fieldSourcesJson, "chineseMeaning") !== "mock_generated";
  });
}

function getFieldSource(json: string | null | undefined, fieldName: string) {
  if (!json) return undefined;
  try {
    const parsed = JSON.parse(json) as Record<string, string | undefined>;
    return parsed[fieldName];
  } catch {
    return undefined;
  }
}

async function ensureDefaultTeacherGroups() {
  for (const [index, name] of defaultGradeGroupNames.entries()) {
    const existing = await prisma.group.findFirst({
      where: { name, parentId: null },
    });

    if (existing) {
      if (existing.sortOrder !== index + 1) {
        await prisma.group.update({
          where: { id: existing.id },
          data: { sortOrder: index + 1 },
        });
      }
    } else {
      await prisma.group.create({
        data: { name, sortOrder: index + 1 },
      });
    }
  }
}
