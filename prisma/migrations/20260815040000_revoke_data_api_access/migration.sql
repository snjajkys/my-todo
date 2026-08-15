-- Supabase 는 public 스키마에 anon / authenticated 기본 권한을 깔아 둔다.
-- 그래서 Prisma 가 만든 테이블이 만들어지는 즉시 Data API(PostgREST)에 열린다.
-- RLS 를 끈 상태에서는 anon 키만 있으면 User 의 아이디와 비밀번호 해시를 통째로
-- 읽고 Todo 를 지울 수 있다. anon 키는 브라우저에 넣으라고 만든 공개 키이므로
-- "아무도 모른다"에 기대면 안 된다.
--
-- 이 앱은 PostgREST 를 한 번도 쓰지 않고 Prisma 로 Postgres 에 직접 붙는다.
-- 행 단위로 거를 게 아니라 두 롤의 접근 자체를 회수한다.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 앞으로 추가할 테이블에 같은 구멍이 다시 뚫리지 않게 기본 권한도 되돌린다.
-- 기본 권한은 부여자별로 기록되는데 Prisma 는 postgres 로 접속하므로,
-- postgres 가 부여자인 항목만 손보면 Prisma 가 만드는 테이블은 전부 덮인다.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
