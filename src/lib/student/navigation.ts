export type StudentMenuId = "word-learning";

export const studentMenus: Array<{ id: StudentMenuId; label: string; href: string }> = [
  { id: "word-learning", label: "单词学习", href: "/learn?menu=word-learning" },
];

export function normalizeStudentMenu(value?: string | null): StudentMenuId {
  if (value === "word-learning") return value;
  return "word-learning";
}

export function buildStudentMaterialHref({ tab, groupId, progressStatus }: { tab?: string; groupId?: string; progressStatus?: string }) {
  const searchParams = new URLSearchParams({ menu: "word-learning" });
  if (tab) searchParams.set("tab", tab);
  if (groupId) searchParams.set("groupId", groupId);
  if (progressStatus) searchParams.set("progressStatus", progressStatus);
  return `/learn?${searchParams.toString()}`;
}
