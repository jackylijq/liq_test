import { describe, expect, it } from "vitest";
import { studentMenus, normalizeStudentMenu } from "@/lib/student/navigation";

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
