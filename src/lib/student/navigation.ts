export type StudentMenuId = "word-learning";

export const studentMenus: Array<{ id: StudentMenuId; label: string; href: string }> = [
  { id: "word-learning", label: "单词学习", href: "/learn?menu=word-learning" },
];

export function normalizeStudentMenu(value?: string | null): StudentMenuId {
  if (value === "word-learning") return value;
  return "word-learning";
}
