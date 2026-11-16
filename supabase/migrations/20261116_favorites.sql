-- Run the WHOLE file in the shared project's SQL Editor after schema.sql.
-- Close old app versions on both computers before running this migration.
-- Re-running is safe: the backfill runs once and does not resurrect deleted favorites.
begin;

select pg_advisory_xact_lock(hashtext('fridgefork:favorites-v1'));

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null check (recipe_id ~ '^[0-9]{1,10}$'),
  recipe_name text not null,
  image_url text not null,
  recipe_data jsonb not null check (jsonb_typeof(recipe_data) = 'object'),
  note text not null default '' check (char_length(note) <= 3000),
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table public.favorites enable row level security;
revoke all on public.favorites from public, anon;
grant select, insert, update, delete on public.favorites to authenticated;

drop policy if exists "Read own favorites" on public.favorites;
create policy "Read own favorites" on public.favorites
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own favorites" on public.favorites;
create policy "Insert own favorites" on public.favorites
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own favorites" on public.favorites;
create policy "Update own favorites" on public.favorites
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own favorites" on public.favorites;
create policy "Delete own favorites" on public.favorites
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Administrative bookkeeping, inaccessible to browser roles.
create table if not exists public.fridgefork_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table public.fridgefork_migrations enable row level security;
revoke all on public.fridgefork_migrations from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from public.fridgefork_migrations where name = 'favorites-v1') then
    -- Fail and roll back instead of silently skipping malformed legacy recipes.
    if exists (
      select 1 from public.account_data a
      cross join lateral jsonb_each(a.favorites) f
      where f.key !~ '^[0-9]{1,10}$'
        or jsonb_typeof(f.value -> 'meal') is distinct from 'object'
        or (f.value -> 'meal' ->> 'id') is distinct from f.key
        or f.value -> 'meal' ->> 'name' is null
        or f.value -> 'meal' ->> 'image' is null
        or char_length(coalesce(f.value ->> 'note', '')) > 3000
    ) then
      raise exception 'Legacy favorites contain invalid records. No data was migrated; inspect account_data.favorites.';
    end if;

    insert into public.favorites (user_id, recipe_id, recipe_name, image_url, recipe_data, note)
    select a.user_id, f.key,
      f.value -> 'meal' ->> 'name', f.value -> 'meal' ->> 'image',
      f.value -> 'meal', coalesce(f.value ->> 'note', '')
    from public.account_data a
    cross join lateral jsonb_each(a.favorites) f
    -- Existing new-table entries win, preserving any notes already edited there.
    on conflict (user_id, recipe_id) do nothing;

    insert into public.fridgefork_migrations (name) values ('favorites-v1');
  end if;
end;
$$;

-- account_data.favorites remains untouched as a historical backup, not a live source.
notify pgrst, 'reload schema';
commit;
