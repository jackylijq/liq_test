"use client";

import { useState } from "react";
import { updateLearningProgressAction } from "./actions";
import type { LearningStatus } from "@/lib/learning/progress";

type LearnTermCardProps = {
  activeStatus?: LearningStatus;
  audioUrl?: string;
  categoryId?: string;
  detailLines: string[];
  groupId?: string;
  phoneticSymbol?: string | null;
  termId: string;
  termText: string;
  termTypeLabel: string;
  unitId?: string;
};

export function LearnTermCard({
  activeStatus,
  audioUrl,
  categoryId,
  detailLines,
  groupId,
  phoneticSymbol,
  termId,
  termText,
  termTypeLabel,
  unitId,
}: LearnTermCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article className="study-card">
      <div className="study-card-main">
        <h2>
          <span>{termText}</span>
          {phoneticSymbol ? <small>{phoneticSymbol}</small> : null}
        </h2>
        <p>{termTypeLabel}</p>
        {activeStatus ? <p className={`study-status-label ${activeStatus}`}>{formatLearningStatus(activeStatus)}</p> : null}
        {audioUrl ? <audio aria-label={`${termText} 发音`} controls preload="none" src={audioUrl} /> : null}
        {isExpanded ? (
          <div className="study-detail-body">
            {detailLines.map((line, index) => (
              <p key={`${termId}-detail-${index}`}>{line}</p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="study-card-actions">
        <button
          aria-label={isExpanded ? "收起内容" : "展开内容"}
          className={`study-icon-button study-toggle-button ${isExpanded ? "active" : ""}`}
          onClick={() => setIsExpanded((value) => !value)}
          title={isExpanded ? "收起内容" : "展开内容"}
          type="button"
        >
          {isExpanded ? <EyeOffIcon /> : <EyeIcon />}
        </button>
        <LearningStatusForm
          activeStatus={activeStatus}
          categoryId={categoryId}
          groupId={groupId}
          status="mastered"
          termId={termId}
          unitId={unitId}
        />
        <LearningStatusForm
          activeStatus={activeStatus}
          categoryId={categoryId}
          groupId={groupId}
          status="unmastered"
          termId={termId}
          unitId={unitId}
        />
      </div>
    </article>
  );
}

function formatLearningStatus(status: LearningStatus) {
  return status === "mastered" ? "已掌握" : "未掌握";
}

function LearningStatusForm({
  activeStatus,
  categoryId,
  groupId,
  status,
  termId,
  unitId,
}: {
  activeStatus?: LearningStatus;
  categoryId?: string;
  groupId?: string;
  status: LearningStatus;
  termId: string;
  unitId?: string;
}) {
  const isActive = activeStatus === status;
  return (
    <form action={updateLearningProgressAction} className="study-status-form">
      <input name="termId" type="hidden" value={termId} />
      <input name="status" type="hidden" value={status} />
      {groupId ? <input name="groupId" type="hidden" value={groupId} /> : null}
      {unitId ? <input name="unitId" type="hidden" value={unitId} /> : null}
      {categoryId ? <input name="categoryId" type="hidden" value={categoryId} /> : null}
      <button
        aria-label={status === "mastered" ? "标记为掌握" : "标记为未掌握"}
        aria-pressed={isActive}
        className={`study-icon-button study-status-button ${status} ${isActive ? "active" : ""}`}
        title={status === "mastered" ? "掌握" : "未掌握"}
        type="submit"
      >
        {status === "mastered" ? <CheckIcon /> : <XIcon />}
      </button>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-3.1 4.1" />
      <path d="M6.6 6.6A15.2 15.2 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.5-.9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
