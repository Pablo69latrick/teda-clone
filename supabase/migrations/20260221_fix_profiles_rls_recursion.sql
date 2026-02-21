-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: profiles RLS infinite recursion
-- ─────────────────────────────────────────────────────────────────────────────
-- The "profiles: admin read all" policy did SELECT FROM profiles inside a
-- profiles RLS policy → infinite recursion (42P17).
-- Fix: use a SECURITY DEFINER function that directly queries auth.users JWT
-- claims, bypassing RLS entirely.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helper function — checks admin role from profiles table WITH security definer
--    (bypasses RLS, so no recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Replace the recursive profiles admin policy
drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_admin());

-- 3. Also fix all other tables that reference profiles for admin checks
--    (these don't recurse, but using is_admin() is cleaner + faster)

drop policy if exists "accounts: admin read all" on public.accounts;
create policy "accounts: admin read all"
  on public.accounts for select
  using (public.is_admin());

drop policy if exists "positions: admin all" on public.positions;
create policy "positions: admin all"
  on public.positions for all
  using (public.is_admin());

drop policy if exists "orders: admin all" on public.orders;
create policy "orders: admin all"
  on public.orders for all
  using (public.is_admin());

drop policy if exists "templates: admin manage" on public.challenge_templates;
create policy "templates: admin manage"
  on public.challenge_templates for all
  using (public.is_admin());
