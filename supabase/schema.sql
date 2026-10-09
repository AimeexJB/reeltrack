-- ============================================================================
-- Reeltrack database schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------- tables ----

-- One row per user (created automatically on sign-up — see trigger below).
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text not null unique check (username ~ '^[a-z0-9_.]{3,30}$'),
  display_name       text not null,
  avatar_url         text,
  -- Secret used in the Plex webhook URL to identify this user.
  plex_webhook_token uuid not null unique default gen_random_uuid(),
  -- If set, only this Plex account's viewings are logged.
  plex_username      text,
  created_at         timestamptz not null default now()
);

-- Titles on the user's watchlist / currently watching / completed.
create table if not exists public.library_entries (
  user_id    uuid not null references auth.users (id) on delete cascade,
  media_type text not null check (media_type in ('movie', 'tv')),
  tmdb_id    integer not null,
  media      jsonb not null,            -- poster, title, genres… (the app's MediaSummary)
  status     text not null check (status in ('watchlist', 'watching', 'completed')),
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, media_type, tmdb_id)
);

-- Every movie viewing / episode watched. All stats are calculated from this table.
create table if not exists public.watch_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  tmdb_id        integer not null,
  media_type     text not null check (media_type in ('movie', 'tv')),
  title          text not null,
  runtime        integer not null default 0,   -- minutes
  watched_at     timestamptz not null default now(),
  genre_ids      integer[] not null default '{}',
  season_number  integer,
  episode_number integer,
  source         text not null default 'app'   -- app | imdb | tvtime | plex | backup
);
create index if not exists watch_events_user_watched_idx on public.watch_events (user_id, watched_at);
create index if not exists watch_events_user_title_idx on public.watch_events (user_id, media_type, tmdb_id);

-- User-created lists ("Date night", "Best of 2026"…).
create table if not exists public.custom_lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  items      jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists custom_lists_user_idx on public.custom_lists (user_id);

-- ------------------------------------------------------ row level security --
-- Each user can only ever read and change their own rows.

alter table public.profiles        enable row level security;
alter table public.library_entries enable row level security;
alter table public.watch_events    enable row level security;
alter table public.custom_lists    enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Own library" on public.library_entries;
create policy "Own library" on public.library_entries
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own watches" on public.watch_events;
create policy "Own watches" on public.watch_events
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own lists" on public.custom_lists;
create policy "Own lists" on public.custom_lists
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.library_entries, public.watch_events, public.custom_lists to authenticated;

-- ------------------------------------------------------------- functions ----

-- Creates a profile whenever someone signs up (username + display name come from the sign-up form).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  suffix       text := substr(replace(new.id::text, '-', ''), 1, 6);
  new_username text := regexp_replace(lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))), '[^a-z0-9_.]', '', 'g');
begin
  if length(new_username) < 3 then
    new_username := new_username || suffix;
  end if;
  new_username := left(new_username, 30);
  if exists (select 1 from public.profiles p where p.username = new_username) then
    new_username := left(new_username, 23) || '_' || suffix;
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, new_username, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), new_username));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form check a username without exposing anyone's profile.
create or replace function public.username_available(name text)
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- Issues a new secret Plex webhook URL for the current user.
create or replace function public.regenerate_plex_webhook_token()
returns void
language sql
security definer set search_path = ''
as $$
  update public.profiles set plex_webhook_token = gen_random_uuid() where id = auth.uid();
$$;
revoke execute on function public.regenerate_plex_webhook_token() from public, anon;
grant execute on function public.regenerate_plex_webhook_token() to authenticated;
