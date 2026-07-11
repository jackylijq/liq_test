import { describe, expect, it } from "vitest";
import {
  buildGroupImportSourceKey,
  buildGroupImportSourceName,
  normalizeGroupImportSourceSegment,
} from "@/lib/teacher/group-import-aliases";

describe("normalizeGroupImportSourceSegment", () => {
  it("normalizes spacing and english case without changing Chinese text", () => {
    expect(normalizeGroupImportSourceSegment("  Section A  基础过关  -  重点词汇 ")).toBe("section a 基础过关-重点词汇");
  });
});

describe("buildGroupImportSourceKey", () => {
  it("builds a stable key from the original markdown path under the root group", () => {
    expect(buildGroupImportSourceKey("grade-7b", ["Unit 1 Animal Friends", "Section A 基础过关 - 重点词汇"])).toBe(
      "md:grade-7b:unit%201%20animal%20friends/section%20a%20%E5%9F%BA%E7%A1%80%E8%BF%87%E5%85%B3-%E9%87%8D%E7%82%B9%E8%AF%8D%E6%B1%87",
    );
  });
});

describe("buildGroupImportSourceName", () => {
  it("keeps a readable original path for maintenance and debugging", () => {
    expect(buildGroupImportSourceName(["Unit 1 Animal Friends", "Section A 基础过关 - 重点词汇"])).toBe(
      "Unit 1 Animal Friends / Section A 基础过关 - 重点词汇",
    );
  });
});
