export type TeacherEnrichJobStatus = "pending" | "running" | "completed" | "failed";
export type TeacherEnrichJobItemStatus = "pending" | "running" | "completed" | "failed";

export function normalizeTeacherEnrichJobStatus(value?: string | null): TeacherEnrichJobStatus {
  if (value === "running" || value === "completed" || value === "failed" || value === "pending") return value;
  return "pending";
}

export function buildTeacherEnrichJobHref({ groupId, jobId }: { groupId: string; jobId: string }) {
  const searchParams = new URLSearchParams({ groupId, jobId, started: "1" });
  return `/teacher/enrich?${searchParams.toString()}`;
}
