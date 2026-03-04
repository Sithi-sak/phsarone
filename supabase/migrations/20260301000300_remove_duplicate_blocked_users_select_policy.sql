-- Remove duplicate permissive SELECT policy on public.blocked_users
-- Keeps the canonical policy "Users can view blocked_users" from 20260224000100_blocked_users_rls.sql
DROP POLICY IF EXISTS "Users can see who they blocked" ON public.blocked_users;
