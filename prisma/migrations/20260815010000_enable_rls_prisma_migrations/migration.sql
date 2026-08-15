-- Enable Row Level Security on _prisma_migrations table
-- This is an internal Prisma metadata table used to track migration history
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Allow all operations on _prisma_migrations for Prisma migrations and admin tasks
-- This RLS policy is permissive to avoid blocking migration operations
CREATE POLICY "allow_prisma_migrations" ON "_prisma_migrations"
  FOR ALL USING (true);
