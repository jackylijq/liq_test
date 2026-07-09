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
  return prisma.term.findMany({
    where: { groups: { some: { groupId } } },
    include: { meanings: true },
    orderBy: [{ termType: "asc" }, { text: "asc" }],
  });
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
