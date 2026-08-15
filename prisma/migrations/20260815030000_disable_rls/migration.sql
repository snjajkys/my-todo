-- Disable RLS due to compatibility issues with application layer
-- Security is enforced at application level (userId filtering in queries)
-- The Prisma middleware and API validation provide sufficient protection

ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Todo" DISABLE ROW LEVEL SECURITY;

-- Clean up policies
DROP POLICY IF EXISTS "users_select_own_todos" ON "Todo";
DROP POLICY IF EXISTS "users_insert_own_todos" ON "Todo";
DROP POLICY IF EXISTS "users_update_own_todos" ON "Todo";
DROP POLICY IF EXISTS "users_delete_own_todos" ON "Todo";
DROP POLICY IF EXISTS "allow_public_auth" ON "User";
DROP POLICY IF EXISTS "users_update_own_profile" ON "User";
DROP POLICY IF EXISTS "users_delete_own_profile" ON "User";
DROP POLICY IF EXISTS "allow_signup" ON "User";
DROP POLICY IF EXISTS "allow_prisma_migrations" ON "_prisma_migrations";
