import { describe, expect, it } from "vitest";
import { buildTeacherEnrichJobHref, normalizeTeacherEnrichJobStatus } from "@/lib/teacher/enrich-jobs";

describe("normalizeTeacherEnrichJobStatus", () => {
  it("keeps supported job statuses and falls back to pending", () => {
    expect(normalizeTeacherEnrichJobStatus("running")).toBe("running");
    expect(normalizeTeacherEnrichJobStatus("completed")).toBe("completed");
    expect(normalizeTeacherEnrichJobStatus("bad")).toBe("pending");
  });
});

describe("buildTeacherEnrichJobHref", () => {
  it("returns to the enrich page with the started job id", () => {
    expect(buildTeacherEnrichJobHref({ groupId: "section-a", jobId: "job-1" })).toBe(
      "/teacher/enrich?groupId=section-a&jobId=job-1&started=1",
    );
  });
});
