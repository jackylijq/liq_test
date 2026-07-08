import { prisma } from "@/lib/db";

export type TeacherGroupOption = {
  id: string;
  name: string;
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
  return prisma.group.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
}

export async function getTeacherGroupTerms(groupId: string) {
  return prisma.term.findMany({
    where: { groups: { some: { groupId } } },
    include: { meanings: true },
    orderBy: [{ termType: "asc" }, { text: "asc" }],
  });
}
