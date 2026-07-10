export const DEFAULT_STUDENT_USER_KEY = "default-student";

export const learningStatuses = ["mastered", "unmastered"] as const;

export type LearningStatus = (typeof learningStatuses)[number];

export function normalizeLearningStatus(value: FormDataEntryValue | string | null): LearningStatus {
  if (value === "mastered" || value === "unmastered") return value;
  throw new Error("无效的学习状态");
}

export function buildLearningReturnHref(params: {
  groupId?: string | null;
  unitId?: string | null;
  categoryId?: string | null;
}) {
  const searchParams = new URLSearchParams();
  if (params.groupId) searchParams.set("groupId", params.groupId);
  if (params.unitId) searchParams.set("unitId", params.unitId);
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  const query = searchParams.toString();
  return query ? `/learn?${query}` : "/learn";
}
