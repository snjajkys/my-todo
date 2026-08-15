-- 20260815030000_disable_rls 가 정책만 지우고 남긴 잔재를 정리한다.

-- 1) Todo / User 에 FORCE 플래그가 그대로 남아 있다. 지금은 RLS 가 꺼져 있어
--    영향이 없지만, 나중에 누가 대시보드에서 RLS 를 다시 켜는 순간
--    "정책 0개 + FORCE" 가 되어 테이블 소유자까지 차단된다. 앱 전체가 멈춘다.
ALTER TABLE "Todo" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" NO FORCE ROW LEVEL SECURITY;

-- 2) _prisma_migrations 는 RLS 가 켜진 채 정책만 사라졌다.
--    소유자로 접속하므로 마이그레이션은 계속 돌지만,
--    Security Advisor 에 "RLS enabled, no policy" 로 남는다.
ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY;
