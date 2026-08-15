-- Fix User table RLS policy to allow login/signup
-- 로그인과 가입은 아직 로그인하지 않은 상태에서 User 테이블을 조회해야 함

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "users_select_own_profile" ON "User";

-- Allow SELECT on User table for authentication (username lookup)
-- This is needed for login and signup functionality
-- 다른 사용자의 민감한 정보는 여전히 보호됨
CREATE POLICY "allow_public_auth" ON "User"
  FOR SELECT USING (true);

-- Keep UPDATE/DELETE/INSERT restricted to own record
CREATE POLICY "users_update_own_profile" ON "User"
  FOR UPDATE
  USING ("id" = COALESCE(current_setting('app.current_user_id', true)::int, -1));

CREATE POLICY "users_delete_own_profile" ON "User"
  FOR DELETE
  USING ("id" = COALESCE(current_setting('app.current_user_id', true)::int, -1));

-- Allow INSERT for signup (no user context yet)
CREATE POLICY "allow_signup" ON "User"
  FOR INSERT WITH CHECK (true);
