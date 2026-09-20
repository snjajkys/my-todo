-- 휴일 표시를 위한 세 테이블.
--
-- PublicHoliday 는 공공데이터포털에서 받아 온 법정공휴일이라 주인이 없다.
-- CustomHoliday 는 재량휴업일처럼 직접 넣은 날이라 사람마다 따로 둔다.
-- HolidaySync 는 연도별로 마지막에 받아 온 때를 적어 둔다 -- 임시공휴일이
-- 연중에 지정될 수 있어 한 번 받고 끝낼 수 없기 때문이다.
--
-- 날짜를 TEXT("YYYY-MM-DD")로 둔 이유는 schema.prisma 주석에 적어 두었다.

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "HolidaySync" (
    "year" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HolidaySync_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "CustomHoliday" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "CustomHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomHoliday_userId_idx" ON "CustomHoliday"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomHoliday_userId_date_key" ON "CustomHoliday"("userId", "date");

-- AddForeignKey
ALTER TABLE "CustomHoliday" ADD CONSTRAINT "CustomHoliday_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
