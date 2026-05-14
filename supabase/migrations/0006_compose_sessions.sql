-- 0006_compose_sessions.sql
-- Server-side persistence for Composer chats so authed users resume across
-- devices. Anon users still use localStorage; once they sign in we adopt
-- their pending session token by writing the row with their owner_id.

create table if not exists public.compose_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Stable client-side token (random nanoid-style). Used as the join key for
  -- adoption: anon writes by token; on auth the server upserts with owner_id.
  session_token text unique not null,
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Untitled chat',
  messages jsonb not null default '[]'::jsonb,
  current_draft jsonb,
  message_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compose_sessions_owner_updated_idx
  on public.compose_sessions(owner_id, updated_at desc);

create index if not exists compose_sessions_token_idx
  on public.compose_sessions(session_token);

alter table public.compose_sessions enable row level security;

drop policy if exists "own compose read" on public.compose_sessions;
create policy "own compose read" on public.compose_sessions
  for select using (auth.uid() = owner_id);

drop policy if exists "own compose write" on public.compose_sessions;
create policy "own compose write" on public.compose_sessions
  for insert with check (auth.uid() = owner_id);

drop policy if exists "own compose update" on public.compose_sessions;
create policy "own compose update" on public.compose_sessions
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "own compose delete" on public.compose_sessions;
create policy "own compose delete" on public.compose_sessions
  for delete using (auth.uid() = owner_id);

grant all on public.compose_sessions to service_role;
grant select, insert, update, delete on public.compose_sessions to authenticated;

-- updated_at touch trigger (mirrors the user_preferences pattern)
create or replace function public.touch_compose_session()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.message_count = coalesce(jsonb_array_length(new.messages), 0);
  return new;
end;
$$;

drop trigger if exists touch_compose_sessions on public.compose_sessions;
create trigger touch_compose_sessions before update on public.compose_sessions
  for each row execute procedure public.touch_compose_session();
