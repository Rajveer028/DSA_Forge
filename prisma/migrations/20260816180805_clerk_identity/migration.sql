-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_user_accounts" ("createdAt", "email", "id", "isActive", "lastLoginAt", "passwordHash", "updatedAt") SELECT "createdAt", "email", "id", "isActive", "lastLoginAt", "passwordHash", "updatedAt" FROM "user_accounts";
DROP TABLE "user_accounts";
ALTER TABLE "new_user_accounts" RENAME TO "user_accounts";
CREATE UNIQUE INDEX "user_accounts_email_key" ON "user_accounts"("email");
CREATE UNIQUE INDEX "user_accounts_clerkUserId_key" ON "user_accounts"("clerkUserId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
