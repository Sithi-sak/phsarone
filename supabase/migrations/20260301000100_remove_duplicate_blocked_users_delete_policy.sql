-- Remove duplicate permissive DELETE policy on public.blocked_users
-- Keeps the canonical policy "Users can delete blocked_users" from 20260224000100_blocked_users_rls.sql
DROP POLICY IF EXISTS "Users can unblock people" ON public.blocked_users;
