export const DEFAULT_STUDENT_USER_KEY = "default-student";

export const learningStatuses = ["mastered", "unmastered"] as const;
export const learningProgressFilters = ["mastered", "unmastered", "unlearned"] as const;

export type LearningStatus = (typeof learningStatuses)[number];
export type LearningProgressFilter = (typeof learningProgressFilters)[number];

export function normalizeLearningStatus(value: FormDataEntryValue | string | null): LearningStatus {
  if (value === "mastered" || value === "unmastered") return value;
  throw new Error("无效的学习状态");
}

export function buildLearningReturnHref(params: {
  groupId?: string | null;
  unitId?: string | null;
  categoryId?: string | null;
  progressStatus?: string | null;
}) {
  const searchParams = new URLSearchParams({ menu: "word-learning" });
  if (params.groupId) searchParams.set("groupId", params.groupId);
  if (params.unitId) searchParams.set("unitId", params.unitId);
  if (params.categoryId) searchParams.set("categoryId", params.categoryId);
  if (params.progressStatus) searchParams.set("progressStatus", params.progressStatus);
  return `/learn?${searchParams.toString()}`;
}

export function normalizeLearningProgressFilter(value?: string | null): LearningProgressFilter | undefined {
  if (value === "mastered" || value === "unmastered" || value === "unlearned") return value;
  return undefined;
}

export function summarizeLearningProgress({
  totalCount,
  statuses,
}: {
  totalCount: number;
  statuses: Array<LearningStatus | string | null | undefined>;
}) {
  const masteredCount = statuses.filter((status) => status === "mastered").length;
  const unmasteredCount = statuses.filter((status) => status === "unmastered").length;
  return {
    masteredCount,
    unmasteredCount,
    unlearnedCount: Math.max(0, totalCount - masteredCount - unmasteredCount),
  };
}
