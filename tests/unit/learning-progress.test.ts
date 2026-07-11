import { describe, expect, it } from "vitest";
import { buildLearningReturnHref, normalizeLearningStatus, summarizeLearningProgress } from "@/lib/learning/progress";

describe("normalizeLearningStatus", () => {
  it("accepts supported learning statuses", () => {
    expect(normalizeLearningStatus("mastered")).toBe("mastered");
    expect(normalizeLearningStatus("unmastered")).toBe("unmastered");
  });

  it("rejects unsupported learning statuses", () => {
    expect(() => normalizeLearningStatus("unknown")).toThrow("无效的学习状态");
  });
});

describe("buildLearningReturnHref", () => {
  it("keeps the current learning filters after status updates", () => {
    expect(
      buildLearningReturnHref({
        groupId: "grade-7",
        unitId: "unit-1",
        categoryId: "section-a",
        progressStatus: "mastered",
      }),
    ).toBe("/learn?menu=word-learning&groupId=grade-7&unitId=unit-1&categoryId=section-a&progressStatus=mastered");
  });

  it("falls back to the learning page when no filters are selected", () => {
    expect(buildLearningReturnHref({})).toBe("/learn?menu=word-learning");
  });
});

describe("summarizeLearningProgress", () => {
  it("counts mastered, unmastered, and unlearned terms", () => {
    expect(
      summarizeLearningProgress({
        totalCount: 5,
        statuses: ["mastered", "unmastered", "mastered"],
      }),
    ).toEqual({
      masteredCount: 2,
      unmasteredCount: 1,
      unlearnedCount: 2,
    });
  });
});
