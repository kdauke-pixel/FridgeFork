-- Run once in your Supabase project's SQL Editor. Never use a service-role key in the browser.
-- Afterwards run migrations/20261116_favorites.sql to create the current favorites table.
create table if not exists public.account_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pantry jsonb not null default '[]'::jsonb check (jsonb_typeof(pantry) = 'array'),
  favorites jsonb not null default '{}'::jsonb check (jsonb_typeof(favorites) = 'object'),
  adaptations jsonb not null default '[]'::jsonb check (jsonb_typeof(adaptations) = 'array'),
  conversations jsonb not null default '[]'::jsonb check (jsonb_typeof(conversations) = 'array')
);

alter table public.account_data enable row level security;
revoke all on public.account_data from anon;
grant select, insert, update, delete on public.account_data to authenticated;

create policy "Read own account data" on public.account_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own account data" on public.account_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own account data" on public.account_data
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own account data" on public.account_data
  for delete to authenticated using ((select auth.uid()) = user_id);
