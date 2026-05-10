-- Engine 1 — Account and activation
-- Engine 2 — Retention engine
-- Engine 4 — Virality loop
-- Engine 5 — Monetization
-- Engine 6 — Operator and quality
--
-- Adds the user-facing tables built on top of Supabase auth.users:
--   user_preferences, saved_destinations, drop_sends, push_subscriptions,
--   trips, trip_collaborators, trip_polls, trip_poll_votes,
--   referrals, referral_credits, click_events, commissions,
--   concierge_requests, subscriptions, pending_events,
--   promoters, promoter_events, promoter_allocations, presale_codes
-- And an editorial_status column on destinations.

-- ---------------------------------------------------------------------------
-- Engine 1 — Account and activation
-- ---------------------------------------------------------------------------

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  home_city text,
  genres text[] not null default '{}',
  regions text[] not null default '{}',
  budget public.destination_budget,
  travel_windows int[] not null default '{}',
  push_enabled boolean not null default false,
  drop_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_travel_windows_valid check (
    travel_windows <@ array[1,2,3,4,5,6,7,8,9,10,11,12]
  )
);

create table if not exists public.saved_destinations (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create index if not exists saved_destinations_slug_idx on public.saved_destinations(slug);

alter table public.user_preferences enable row level security;
alter table public.saved_destinations enable row level security;

create policy "own prefs read" on public.user_preferences
  for select using (auth.uid() = user_id);
create policy "own prefs upsert" on public.user_preferences
  for insert with check (auth.uid() = user_id);
create policy "own prefs update" on public.user_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own saves read" on public.saved_destinations
  for select using (auth.uid() = user_id);
create policy "own saves write" on public.saved_destinations
  for insert with check (auth.uid() = user_id);
create policy "own saves delete" on public.saved_destinations
  for delete using (auth.uid() = user_id);

create or replace function public.create_default_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_preferences(user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_default_preferences();

-- ---------------------------------------------------------------------------
-- Engine 2 — Retention engine
-- ---------------------------------------------------------------------------

create table if not exists public.drop_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  drop_month int not null check (drop_month between 1 and 12),
  drop_year int not null,
  picks jsonb not null,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  unique (user_id, drop_month, drop_year)
);

create index if not exists drop_sends_user_idx on public.drop_sends(user_id, drop_year desc, drop_month desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  device_kind text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.drop_sends enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own drops read" on public.drop_sends
  for select using (auth.uid() = user_id);
create policy "own push read" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "own push insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "own push delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Engine 4 — Virality loop
-- ---------------------------------------------------------------------------

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination_slugs text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_owner_idx on public.trips(owner_id);

create table if not exists public.trip_collaborators (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.trip_polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  question text not null,
  options jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_poll_votes (
  poll_id uuid not null references public.trip_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_id text not null,
  voted_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid references auth.users(id) on delete set null,
  source text,
  signed_up_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on public.referrals(referrer_id);

create table if not exists public.referral_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('concierge_unlock','pro_month_free')),
  amount numeric not null default 1,
  granted_at timestamptz not null default now(),
  redeemed_at timestamptz
);

alter table public.trips enable row level security;
alter table public.trip_collaborators enable row level security;
alter table public.trip_polls enable row level security;
alter table public.trip_poll_votes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_credits enable row level security;

create policy "trips public read" on public.trips
  for select using (
    visibility in ('public','unlisted')
    or owner_id = auth.uid()
    or exists (
      select 1 from public.trip_collaborators c
      where c.trip_id = trips.id and c.user_id = auth.uid()
    )
  );
create policy "trips owner write" on public.trips
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "collab read" on public.trip_collaborators
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.trips t
      where t.id = trip_collaborators.trip_id and t.owner_id = auth.uid()
    )
  );
create policy "collab insert" on public.trip_collaborators
  for insert with check (
    exists (
      select 1 from public.trips t
      where t.id = trip_collaborators.trip_id and t.owner_id = auth.uid()
    )
    or user_id = auth.uid()
  );

create policy "polls read" on public.trip_polls
  for select using (
    exists (
      select 1 from public.trips t
      where t.id = trip_polls.trip_id
        and (t.visibility in ('public','unlisted')
          or t.owner_id = auth.uid()
          or exists (
            select 1 from public.trip_collaborators c
            where c.trip_id = t.id and c.user_id = auth.uid()))
    )
  );

create policy "poll votes read" on public.trip_poll_votes
  for select using (
    exists (
      select 1 from public.trip_polls p
      join public.trips t on t.id = p.trip_id
      where p.id = trip_poll_votes.poll_id
        and (t.visibility in ('public','unlisted')
          or t.owner_id = auth.uid()
          or exists (
            select 1 from public.trip_collaborators c
            where c.trip_id = t.id and c.user_id = auth.uid()))
    )
  );
create policy "poll votes write" on public.trip_poll_votes
  for insert with check (user_id = auth.uid());

create policy "own referrals read" on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_user_id);
create policy "own credits read" on public.referral_credits
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Engine 5 — Monetization
-- ---------------------------------------------------------------------------

create table if not exists public.click_events (
  click_id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  destination_slug text,
  context text,
  target_host text,
  user_agent text,
  referer text,
  created_at timestamptz not null default now()
);

create index if not exists click_events_provider_idx on public.click_events(provider, created_at desc);
create index if not exists click_events_destination_idx on public.click_events(destination_slug, created_at desc);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  click_id uuid references public.click_events(click_id) on delete set null,
  provider text not null,
  external_id text,
  amount_usd numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending',
  raw jsonb,
  received_at timestamptz not null default now()
);

create index if not exists commissions_provider_received_idx on public.commissions(provider, received_at desc);

create table if not exists public.concierge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brief jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  stripe_session_id text,
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null,
  status text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.click_events enable row level security;
alter table public.commissions enable row level security;
alter table public.concierge_requests enable row level security;
alter table public.subscriptions enable row level security;

create policy "own clicks read" on public.click_events
  for select using (auth.uid() = user_id);
create policy "own concierge read" on public.concierge_requests
  for select using (auth.uid() = user_id);
create policy "own subscription read" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Engine 6 — Operator and quality
-- ---------------------------------------------------------------------------

alter table public.destinations
  add column if not exists editorial_status text not null default 'featured'
    check (editorial_status in ('seed','published','featured'));

create table if not exists public.pending_events (
  id uuid primary key default gen_random_uuid(),
  destination_slug text not null,
  source text not null,
  source_url text not null,
  external_id text,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pending_events_status_idx on public.pending_events(status, created_at desc);

create table if not exists public.promoters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  city text,
  country text,
  contact_email text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.promoter_events (
  id uuid primary key default gen_random_uuid(),
  promoter_id uuid not null references public.promoters(id) on delete cascade,
  destination_slug text not null,
  title text not null,
  start_date date not null,
  end_date date,
  ticket_url text,
  summary text,
  status text not null default 'draft' check (status in ('draft','submitted','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.promoter_allocations (
  id uuid primary key default gen_random_uuid(),
  promoter_event_id uuid not null references public.promoter_events(id) on delete cascade,
  total_quantity int not null,
  remaining int not null,
  unit_price_usd numeric,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.presale_codes (
  id uuid primary key default gen_random_uuid(),
  promoter_event_id uuid not null references public.promoter_events(id) on delete cascade,
  code text not null,
  used boolean not null default false,
  granted_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pending_events enable row level security;
alter table public.promoters enable row level security;
alter table public.promoter_events enable row level security;
alter table public.promoter_allocations enable row level security;
alter table public.presale_codes enable row level security;

create policy "promoter own read" on public.promoters
  for select using (auth.uid() = owner_id or approved = true);
create policy "promoter own write" on public.promoters
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "promoter event own" on public.promoter_events
  for all using (
    exists (
      select 1 from public.promoters p
      where p.id = promoter_events.promoter_id and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.promoters p
      where p.id = promoter_events.promoter_id and p.owner_id = auth.uid()
    )
  );

-- Updated_at maintenance for tables that have it
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_preferences on public.user_preferences;
create trigger touch_user_preferences before update on public.user_preferences
  for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_trips on public.trips;
create trigger touch_trips before update on public.trips
  for each row execute procedure public.touch_updated_at();

drop trigger if exists touch_subscriptions on public.subscriptions;
create trigger touch_subscriptions before update on public.subscriptions
  for each row execute procedure public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Supabase configures these by default on a fresh project, but resetting the
-- public schema (drop schema public cascade; create schema public;) wipes
-- them. Re-applying here makes this migration safe to run on a freshly reset
-- schema. RLS policies above are still the access-control layer for
-- per-user data; these grants only let PostgREST and the Auth server reach
-- the tables in the first place.

grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
