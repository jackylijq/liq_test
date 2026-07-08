-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Group_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "termType" TEXT NOT NULL,
    "createdSource" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TermGroup" (
    "termId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    PRIMARY KEY ("termId", "groupId"),
    CONSTRAINT "TermGroup_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TermGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TermMeaning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "termId" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "chineseMeaning" TEXT NOT NULL,
    "exampleSentence" TEXT,
    "explanation" TEXT,
    "usageContext" TEXT,
    "fieldSourcesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TermMeaning_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceType" TEXT NOT NULL,
    "fileName" TEXT,
    "targetGroupId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "parsedJson" TEXT NOT NULL,
    "enrichedJson" TEXT NOT NULL,
    "duplicateStatus" TEXT NOT NULL,
    "validationStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "selectedGroupIdsJson" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "submittedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExamAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examSessionId" TEXT NOT NULL,
    "questionIndex" INTEGER NOT NULL,
    "questionType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "optionsJson" TEXT NOT NULL,
    "correctOptionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "explanation" TEXT NOT NULL,
    "termSnapshotJson" TEXT NOT NULL,
    CONSTRAINT "ExamAnswer_examSessionId_fkey" FOREIGN KEY ("examSessionId") REFERENCES "ExamSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_parentId_key" ON "Group"("name", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Term_normalizedText_termType_key" ON "Term"("normalizedText", "termType");
