create extension if not exists postgis;

create type public.destination_region as enum (
  'Africa',
  'Asia',
  'Europe',
  'Middle East',
  'North America',
  'South America'
);

create type public.destination_budget as enum ('low', 'medium', 'high', 'luxury');
create type public.curation_confidence as enum ('low', 'medium', 'high');

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  city text not null,
  country text not null,
  region public.destination_region not null,
  latitude double precision not null,
  longitude double precision not null,
  location geography(point, 4326) generated always as (st_makepoint(longitude, latitude)::geography) stored,
  tagline text not null,
  summary text not null,
  hero_image text,
  active_months int[] not null default '{}',
  peak_months int[] not null default '{}',
  genres text[] not null default '{}',
  vibes text[] not null default '{}',
  budget public.destination_budget not null,
  average_daily_spend_low_usd int not null,
  average_daily_spend_high_usd int not null,
  who_for text[] not null default '{}',
  when_to_book text not null,
  travel_notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destinations_months_valid check (
    active_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]
    and peak_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]
  )
);

create table public.monthly_destination_scores (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int,
  overall_score int not null check (overall_score between 0 and 100),
  confidence public.curation_confidence not null default 'medium',
  editorial_summary text not null,
  genre_scores jsonb not null default '{}'::jsonb,
  why_now text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (destination_id, month, year)
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  external_id text unique,
  name text not null,
  type text not null,
  latitude double precision,
  longitude double precision,
  location geography(point, 4326) generated always as (
    case
      when longitude is null or latitude is null then null
      else st_makepoint(longitude, latitude)::geography
    end
  ) stored,
  scene_tags text[] not null default '{}',
  official_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete set null,
  external_id text unique,
  title text not null,
  start_date date not null,
  end_date date,
  type text not null,
  genres text[] not null default '{}',
  importance_score int not null check (importance_score between 0 and 100),
  summary text not null,
  source_url text not null,
  ticket_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  genres text[] not null default '{}',
  official_url text,
  created_at timestamptz not null default now()
);

create table public.event_artists (
  event_id uuid not null references public.events(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  billing_order int,
  primary key (event_id, artist_id)
);

create table public.curation_sources (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  source_url text not null,
  publisher text not null,
  last_checked date not null,
  notes text not null,
  created_at timestamptz not null default now()
);

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  home_city text,
  favorite_genres text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index destinations_region_idx on public.destinations(region);
create index destinations_location_idx on public.destinations using gist(location);
create index monthly_destination_scores_month_score_idx on public.monthly_destination_scores(month, overall_score desc);
create index events_destination_start_date_idx on public.events(destination_id, start_date);
create index venues_destination_idx on public.venues(destination_id);

alter table public.destinations enable row level security;
alter table public.monthly_destination_scores enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.curation_sources enable row level security;
alter table public.waitlist_signups enable row level security;
alter table public.analytics_events enable row level security;

create policy "Public read destinations" on public.destinations for select using (true);
create policy "Public read monthly scores" on public.monthly_destination_scores for select using (true);
create policy "Public read venues" on public.venues for select using (true);
create policy "Public read events" on public.events for select using (true);
create policy "Public read curation sources" on public.curation_sources for select using (true);
