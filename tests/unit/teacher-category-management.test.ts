import { describe, expect, it } from "vitest";
import { buildTeacherCategoryOptions } from "@/lib/teacher/category-management";

describe("buildTeacherCategoryOptions", () => {
  it("lists the root default category before unit and section categories", () => {
    const options = buildTeacherCategoryOptions(
      { id: "grade-7", name: "7年级下册" },
      [
        {
          id: "unit-1",
          name: "Unit 1 Animal Friends",
          categories: [
            { id: "cat-1", rawName: "Section A 基础过关 - 重点词汇", name: "Section A-重点词汇" },
            { id: "cat-2", rawName: "Section A 基础过关 - 必会词块", name: "Section A-必会词块" },
          ],
        },
      ],
    );

    expect(options).toEqual([
      { id: "grade-7", label: "7年级下册（默认分类）" },
      { id: "unit-1", label: "Unit 1 Animal Friends" },
      { id: "cat-1", label: "Unit 1 Animal Friends / Section A-重点词汇" },
      { id: "cat-2", label: "Unit 1 Animal Friends / Section A-必会词块" },
    ]);
  });
});
