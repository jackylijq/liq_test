CREATE TABLE "GroupImportAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupImportAlias_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GroupImportAlias_sourceType_sourceKey_key" ON "GroupImportAlias"("sourceType", "sourceKey");
CREATE INDEX "GroupImportAlias_groupId_idx" ON "GroupImportAlias"("groupId");
