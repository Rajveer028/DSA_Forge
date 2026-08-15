-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_university_tests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "universityId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "className" TEXT,
    "division" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "capacity" INTEGER NOT NULL DEFAULT 50,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,
    "passingMarks" INTEGER NOT NULL DEFAULT 40,
    "joinCode" TEXT,
    "joinOpen" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "instructions" TEXT,
    "allowedLanguages" JSONB,
    "partialScoring" BOOLEAN NOT NULL DEFAULT true,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "resultsPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "university_tests_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "university_tests_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "university_tests_classId_fkey" FOREIGN KEY ("classId") REFERENCES "university_classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_university_tests" ("allowedLanguages", "capacity", "classId", "className", "createdAt", "createdById", "description", "division", "durationMinutes", "endTime", "id", "instructions", "name", "partialScoring", "passingMarks", "resultsPublished", "shuffleQuestions", "startTime", "status", "subject", "totalMarks", "universityId", "updatedAt") SELECT "allowedLanguages", "capacity", "classId", "className", "createdAt", "createdById", "description", "division", "durationMinutes", "endTime", "id", "instructions", "name", "partialScoring", "passingMarks", "resultsPublished", "shuffleQuestions", "startTime", "status", "subject", "totalMarks", "universityId", "updatedAt" FROM "university_tests";
DROP TABLE "university_tests";
ALTER TABLE "new_university_tests" RENAME TO "university_tests";
CREATE UNIQUE INDEX "university_tests_joinCode_key" ON "university_tests"("joinCode");
CREATE INDEX "university_tests_universityId_status_idx" ON "university_tests"("universityId", "status");
CREATE INDEX "university_tests_startTime_idx" ON "university_tests"("startTime");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
