-- CreateTable
CREATE TABLE "TeacherMaterialFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userKey" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherMaterialFavorite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TeacherMaterialFavorite_userKey_groupId_key" ON "TeacherMaterialFavorite"("userKey", "groupId");

-- CreateIndex
CREATE INDEX "TeacherMaterialFavorite_userKey_idx" ON "TeacherMaterialFavorite"("userKey");
