-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Todo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'TODAY',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Todo" ("completed", "createdAt", "endDate", "id", "startDate", "title", "type", "updatedAt") SELECT "completed", "createdAt", "endDate", "id", "startDate", "title", "type", "updatedAt" FROM "Todo";
DROP TABLE "Todo";
ALTER TABLE "new_Todo" RENAME TO "Todo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- 기존 DAILY(매일 할 일) 데이터를 TODAY(오늘 할 일)로 이전한다.
-- TODAY 는 기준 날짜가 필요한데 기존 데이터에는 없으므로 "등록한 날"을 기준 날짜로 삼는다.
-- createdAt 은 UTC 이므로 마이그레이션을 실행하는 컴퓨터의 로컬 날짜로 환산한 뒤,
-- 날짜 전용 값의 저장 규칙(UTC 자정)에 맞춰 기록한다.
UPDATE "Todo"
SET "type" = 'TODAY',
    "startDate" = strftime('%Y-%m-%dT00:00:00.000+00:00', datetime("createdAt", 'localtime'))
WHERE "type" = 'DAILY';

-- 이미 완료된 항목은 완료 시각을 알 수 없으므로 마지막 수정 시각으로 채운다.
UPDATE "Todo"
SET "completedAt" = "updatedAt"
WHERE "completed" = true AND "completedAt" IS NULL;
