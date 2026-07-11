import { describe, expect, it } from "vitest";
import { buildStudentMaterialHref, studentMenus, normalizeStudentMenu } from "@/lib/student/navigation";

describe("studentMenus", () => {
  it("starts with word learning as the student entry menu", () => {
    expect(studentMenus[0]).toEqual({ id: "word-learning", label: "单词学习", href: "/learn?menu=word-learning" });
  });
});

describe("normalizeStudentMenu", () => {
  it("falls back to word learning for missing or unknown menus", () => {
    expect(normalizeStudentMenu()).toBe("word-learning");
    expect(normalizeStudentMenu("bad")).toBe("word-learning");
    expect(normalizeStudentMenu("word-learning")).toBe("word-learning");
  });
});

describe("buildStudentMaterialHref", () => {
  it("keeps student material tabs and opens card detail through the learning page", () => {
    expect(buildStudentMaterialHref({ tab: "junior" })).toBe("/learn?menu=word-learning&tab=junior");
    expect(buildStudentMaterialHref({ groupId: "grade-7" })).toBe("/learn?menu=word-learning&groupId=grade-7");
  });
});
