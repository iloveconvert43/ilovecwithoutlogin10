-- ═══════════════════════════════════════════════════════════════
-- iLoveConvert — Supabase Database Setup
-- Run this entire script in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── STEP 1: Enable required extensions ───────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── STEP 2: Create tool_history table ────────────────────────
CREATE TABLE IF NOT EXISTS public.tool_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name   TEXT        NOT NULL,
  file_name   TEXT,
  action_type TEXT,
  result_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_tool_history_user_id   ON public.tool_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_history_created_at ON public.tool_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_history_tool_name  ON public.tool_history(tool_name);

-- ── STEP 3: Create favorite_tools table ──────────────────────
CREATE TABLE IF NOT EXISTS public.favorite_tools (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate favourites per user
  UNIQUE(user_id, tool_name)
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_favorite_tools_user_id  ON public.favorite_tools(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_tools_tool_name ON public.favorite_tools(tool_name);

-- ── STEP 4: Enable Row Level Security ────────────────────────
ALTER TABLE public.tool_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_tools  ENABLE ROW LEVEL SECURITY;

-- ── STEP 5: Drop existing policies (safe re-run) ─────────────
DROP POLICY IF EXISTS "Users read own history"      ON public.tool_history;
DROP POLICY IF EXISTS "Users insert own history"    ON public.tool_history;
DROP POLICY IF EXISTS "Users delete own history"    ON public.tool_history;
DROP POLICY IF EXISTS "Users read own favourites"   ON public.favorite_tools;
DROP POLICY IF EXISTS "Users insert own favourites" ON public.favorite_tools;
DROP POLICY IF EXISTS "Users delete own favourites" ON public.favorite_tools;

-- ── STEP 6: RLS Policies for tool_history ────────────────────

-- SELECT: Users can only read their own records
CREATE POLICY "Users read own history"
  ON public.tool_history
  FOR SELECT
  USING ( auth.uid() = user_id );

-- INSERT: Users can only insert records for themselves
CREATE POLICY "Users insert own history"
  ON public.tool_history
  FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- UPDATE: Users can update their own records
CREATE POLICY "Users update own history"
  ON public.tool_history
  FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- DELETE: Users can only delete their own records
CREATE POLICY "Users delete own history"
  ON public.tool_history
  FOR DELETE
  USING ( auth.uid() = user_id );

-- ── STEP 7: RLS Policies for favorite_tools ──────────────────

-- SELECT: Users can only read their own favourites
CREATE POLICY "Users read own favourites"
  ON public.favorite_tools
  FOR SELECT
  USING ( auth.uid() = user_id );

-- INSERT: Users can only insert favourites for themselves
CREATE POLICY "Users insert own favourites"
  ON public.favorite_tools
  FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- DELETE: Users can only delete their own favourites
CREATE POLICY "Users delete own favourites"
  ON public.favorite_tools
  FOR DELETE
  USING ( auth.uid() = user_id );

-- ── STEP 8: Optional - Limit history size per user ───────────
-- (Uncomment if you want automatic cleanup of old records)
-- CREATE OR REPLACE FUNCTION public.limit_history_per_user()
-- RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   DELETE FROM public.tool_history
--   WHERE user_id = NEW.user_id
--     AND id NOT IN (
--       SELECT id FROM public.tool_history
--       WHERE user_id = NEW.user_id
--       ORDER BY created_at DESC
--       LIMIT 500
--     );
--   RETURN NEW;
-- END;
-- $$;
-- CREATE TRIGGER trigger_limit_history
--   AFTER INSERT ON public.tool_history
--   FOR EACH ROW EXECUTE FUNCTION public.limit_history_per_user();

-- ── STEP 9: Verify setup ─────────────────────────────────────
-- Run these selects to confirm tables and policies exist:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- SELECT policyname, tablename, cmd FROM pg_policies WHERE schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════
-- GOOGLE OAUTH SETUP (do in Supabase Dashboard, not SQL):
-- 1. Go to: Authentication → Providers → Google
-- 2. Enable Google provider
-- 3. Get Client ID + Secret from: console.cloud.google.com
--    → Create OAuth 2.0 credentials
--    → Authorized redirect URIs: https://azxtfybmjpdgcfbhkutk.supabase.co/auth/v1/callback
-- 4. Add your site URL to: Authentication → URL Configuration
--    Site URL: https://iloveconvert.vercel.app
--    Redirect URLs: https://iloveconvert.vercel.app/**
-- ═══════════════════════════════════════════════════════════════

SELECT 'Setup complete! Tables and RLS policies created.' AS status;
