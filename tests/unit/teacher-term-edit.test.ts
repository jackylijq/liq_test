import { describe, expect, it } from "vitest";
import { buildTeacherTermEditReturnHref, normalizeEditableTermType } from "@/lib/teacher/term-edit";

describe("normalizeEditableTermType", () => {
  it("accepts supported editable term types and falls back to word", () => {
    expect(normalizeEditableTermType("phrase")).toBe("phrase");
    expect(normalizeEditableTermType("sentence")).toBe("sentence");
    expect(normalizeEditableTermType("bad")).toBe("word");
  });
});

describe("buildTeacherTermEditReturnHref", () => {
  it("keeps the current teacher material filters after editing", () => {
    expect(
      buildTeacherTermEditReturnHref({
        groupId: "grade-7",
        unitId: "unit-1",
        categoryId: "section-a",
      }),
    ).toBe("/teacher?menu=materials&groupId=grade-7&unitId=unit-1&categoryId=section-a");
  });

  it("falls back to the material list when no group is selected", () => {
    expect(buildTeacherTermEditReturnHref({})).toBe("/teacher?menu=materials");
  });
});
