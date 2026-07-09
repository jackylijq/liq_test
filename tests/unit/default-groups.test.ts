import { describe, expect, it } from "vitest";
import { defaultGradeGroupNames } from "@/lib/teacher/default-groups";

describe("defaultGradeGroupNames", () => {
  it("includes primary and junior middle school semester groups", () => {
    expect(defaultGradeGroupNames).toHaveLength(18);
    expect(defaultGradeGroupNames.slice(0, 2)).toEqual(["1年级上册", "1年级下册"]);
    expect(defaultGradeGroupNames.slice(-6)).toEqual([
      "7年级上册",
      "7年级下册",
      "8年级上册",
      "8年级下册",
      "9年级上册",
      "9年级下册",
    ]);
  });
});
