import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  importRow: {
    findMany: vi.fn(),
  },
  term: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}));

import { getTeacherImportBatchTerms } from "@/lib/teacher/groups";

describe("getTeacherImportBatchTerms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads only terms referenced by the import batch and keeps row order", async () => {
    prismaMock.importRow.findMany.mockResolvedValue([
      {
        enrichedJson: JSON.stringify({
          text: "Across the country",
          termType: "phrase",
        }),
      },
      {
        enrichedJson: JSON.stringify({
          text: "Care",
          termType: "word",
        }),
      },
    ]);
    prismaMock.term.findMany.mockResolvedValue([
      {
        id: "care-id",
        text: "care",
        normalizedText: "care",
        termType: "word",
        meanings: [],
      },
      {
        id: "across-id",
        text: "Across the country",
        normalizedText: "across the country",
        termType: "phrase",
        meanings: [],
      },
    ]);

    const terms = await getTeacherImportBatchTerms("batch-1");

    expect(prismaMock.importRow.findMany).toHaveBeenCalledWith({
      where: { batchId: "batch-1" },
      orderBy: { rowIndex: "asc" },
      select: { enrichedJson: true },
    });
    expect(prismaMock.term.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { normalizedText: "across the country", termType: "phrase" },
          { normalizedText: "care", termType: "word" },
        ],
      },
      include: {
        meanings: {
          orderBy: [{ partOfSpeech: "asc" }, { createdAt: "asc" }],
        },
        groups: {
          include: { group: true },
        },
      },
    });
    expect(terms.map((term) => term.id)).toEqual(["across-id", "care-id"]);
  });
});
