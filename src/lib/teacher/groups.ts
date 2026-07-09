import { prisma } from "@/lib/db";
import { defaultGradeGroupNames } from "./default-groups";

export type TeacherGroupOption = {
  id: string;
  name: string;
  rawName: string;
  parentId: string | null;
  sortOrder: number;
};

export type TeacherTermForSummary = {
  termType: string;
  meanings: Array<{
    chineseMeaning: string | null;
    exampleSentence: string | null;
    usageContext: string | null;
  }>;
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
    { wordCount: 0, phraseCount: 0, missingFieldCount: 0 },
  );
}

export async function getTeacherGroups(): Promise<TeacherGroupOption[]> {
  await ensureDefaultTeacherGroups();
  const groups = await prisma.group.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, sortOrder: true },
  });
  return flattenTeacherGroups(groups);
}

export async function getTeacherGroupTerms(groupId: string) {
  return prisma.term.findMany({
    where: { groups: { some: { groupId } } },
    include: { meanings: true },
    orderBy: [{ termType: "asc" }, { text: "asc" }],
  });
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

function flattenTeacherGroups(
  groups: Array<{ id: string; name: string; parentId: string | null; sortOrder: number }>,
): TeacherGroupOption[] {
  const childrenByParent = new Map<string | null, typeof groups>();
  for (const group of groups) {
    const children = childrenByParent.get(group.parentId) ?? [];
    children.push(group);
    childrenByParent.set(group.parentId, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  const flattened: TeacherGroupOption[] = [];

  function visit(parentId: string | null, parentPath: string[]) {
    for (const group of childrenByParent.get(parentId) ?? []) {
      const path = parentId ? [...parentPath, group.name] : [];
      flattened.push({
        ...group,
        rawName: group.name,
        name: path.length ? path.join(" / ") : group.name,
      });
      visit(group.id, path);
    }
  }

  visit(null, []);
  return flattened;
}
