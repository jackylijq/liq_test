"use client";

import { useEffect, useRef, useState } from "react";

type EnrichJobItem = {
  id: string;
  termText: string;
  status: string;
  error: string | null;
};

type EnrichJobResponse = {
  status: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  items: EnrichJobItem[];
};

type Toast = {
  id: string;
  tone: "info" | "success" | "error";
  message: string;
};

export function TeacherEnrichJobToasts({ jobId }: { jobId?: string }) {
  const [toasts, setToasts] = useState<Toast[]>(() =>
    jobId ? [{ id: `${jobId}-started`, tone: "info", message: "正在补齐中" }] : [],
  );
  const announcedItemIds = useRef(new Set<string>());

  useEffect(() => {
    if (!jobId) return undefined;
    let stopped = false;

    async function poll() {
      const response = await fetch(`/api/teacher/enrich-jobs/${jobId}`, { cache: "no-store" });
      if (!response.ok || stopped) return;
      const job = (await response.json()) as EnrichJobResponse;
      const nextToasts = job.items
        .filter((item) => item.status === "completed" || item.status === "failed")
        .filter((item) => !announcedItemIds.current.has(item.id))
        .map((item) => {
          announcedItemIds.current.add(item.id);
          return {
            id: item.id,
            tone: item.status === "completed" ? "success" : "error",
            message: item.status === "completed" ? `${item.termText} 补齐完成` : `${item.termText} 补齐失败`,
          } satisfies Toast;
        });

      if (nextToasts.length > 0) {
        setToasts((current) => [...current, ...nextToasts].slice(-6));
      }

      if (job.status === "completed" || job.status === "failed") {
        setToasts((current) => [
          ...current,
          {
            id: `${jobId}-done`,
            tone: job.failedCount > 0 ? "error" : "success",
            message: job.failedCount > 0 ? `补齐完成，${job.failedCount} 条失败` : "全部补齐完成",
          },
        ]);
        return;
      }
      window.setTimeout(poll, 1800);
    }

    poll();
    return () => {
      stopped = true;
    };
  }, [jobId]);

  if (!jobId || toasts.length === 0) return null;

  return (
    <div className="teacher-enrich-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div className={`teacher-enrich-toast ${toast.tone}`} key={toast.id}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
