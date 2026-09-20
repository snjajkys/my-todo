-- 할 일의 중요도. 화면과 API 는 이미 쓰고 있었는데 열이 없어 목록 조회부터 깨져 있었다.
--
-- 기본값을 둔 채로 넣는다. 이미 있던 할 일은 전부 "보통" 이 되고, 앞으로 들어오는
-- 행도 값을 주지 않으면 같은 값이 된다. NOT NULL 을 기본값 없이 넣으면 기존 행이
-- 채워지지 않아 마이그레이션 자체가 실패한다.
--
-- schema.prisma 에서 문자열로 둔 이유는 Todo.type 과 같다. enum 전환은 별도로 다룬다.

-- AlterTable
ALTER TABLE "Todo" ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'MEDIUM';
