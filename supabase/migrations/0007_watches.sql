-- Watch-anything backbone.
--
-- A watch is a subscription to a (destination, month, year) window. The
-- watch-alerts cron diffs the event corpus against `seen_event_ids` on each
-- run and emails users a digest of newly confirmed events, then advances the
-- baseline. `notified_at` is null until the first baseline pass so brand-new
-- watches never fire an alert for events that already existed.

create table if not exists public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  month int not null check (month between 1 and 12),
  year int not null,
  seen_event_ids text[] not null default '{}',
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, slug, month, year)
);

create index if not exists watches_user_idx on public.watches(user_id);
create index if not exists watches_slug_month_idx on public.watches(slug, month, year);

alter table public.watches enable row level security;

create policy "own watches read" on public.watches
  for select using (auth.uid() = user_id);
create policy "own watches insert" on public.watches
  for insert with check (auth.uid() = user_id);
create policy "own watches delete" on public.watches
  for delete using (auth.uid() = user_id);
