-- 0005_fork_notifications.sql
-- Creator-side fork loop: opt-out preference + throttle log so a parent owner
-- gets at most one email per source itinerary per 24h, no matter how many
-- forks land in that window.

alter table public.user_preferences
  add column if not exists fork_email_enabled boolean not null default true;

create table if not exists public.fork_notifications (
  id uuid primary key default gen_random_uuid(),
  source_itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  fork_itinerary_id uuid references public.itineraries(id) on delete set null,
  sent_at timestamptz not null default now()
);

create index if not exists fork_notifications_source_recipient_idx
  on public.fork_notifications(source_itinerary_id, recipient_user_id, sent_at desc);

alter table public.fork_notifications enable row level security;

-- Owner can read their own notification log (for an eventual /me/notifications view).
drop policy if exists "own fork notif read" on public.fork_notifications;
create policy "own fork notif read" on public.fork_notifications
  for select using (auth.uid() = recipient_user_id);

-- Service role manages writes (the notifier runs server-side with service-role auth).
grant all on public.fork_notifications to service_role;
grant select on public.fork_notifications to authenticated;
