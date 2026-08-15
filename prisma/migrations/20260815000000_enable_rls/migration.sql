-- Enable Row Level Security (RLS) on tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Todo" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Todo table
-- Users can only view their own todos
-- NULL 값은 항상 false로 처리되므로, app.current_user_id가 없으면 접근 불가
CREATE POLICY "users_select_own_todos" ON "Todo"
  FOR SELECT 
  USING ("userId" = COALESCE(current_setting('app.current_user_id', true)::int, -1));

-- Users can only insert their own todos
CREATE POLICY "users_insert_own_todos" ON "Todo"
  FOR INSERT 
  WITH CHECK ("userId" = COALESCE(current_setting('app.current_user_id', true)::int, -1));

-- Users can only update their own todos
CREATE POLICY "users_update_own_todos" ON "Todo"
  FOR UPDATE 
  USING ("userId" = COALESCE(current_setting('app.current_user_id', true)::int, -1));

-- Users can only delete their own todos
CREATE POLICY "users_delete_own_todos" ON "Todo"
  FOR DELETE 
  USING ("userId" = COALESCE(current_setting('app.current_user_id', true)::int, -1));

-- RLS Policies for User table
-- Users can only view their own profile
CREATE POLICY "users_select_own_profile" ON "User"
  FOR SELECT 
  USING ("id" = COALESCE(current_setting('app.current_user_id', true)::int, -1));

-- Allow superuser/service role to bypass RLS for maintenance
ALTER TABLE "Todo" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
