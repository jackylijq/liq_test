CREATE TABLE "TeacherEnrichJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "targetGroupId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

CREATE TABLE "TeacherEnrichJobItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "termText" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "TeacherEnrichJobItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "TeacherEnrichJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TeacherEnrichJob_targetGroupId_idx" ON "TeacherEnrichJob"("targetGroupId");
CREATE INDEX "TeacherEnrichJob_status_idx" ON "TeacherEnrichJob"("status");
CREATE INDEX "TeacherEnrichJobItem_jobId_idx" ON "TeacherEnrichJobItem"("jobId");
CREATE INDEX "TeacherEnrichJobItem_termId_idx" ON "TeacherEnrichJobItem"("termId");
