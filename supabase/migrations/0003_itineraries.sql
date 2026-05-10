-- Engine 7 — Itineraries
--
-- Day-by-day trip plans generated from destination + events + user prefs.
-- Each itinerary anchors each day on a known event or venue from the
-- curated dataset; the LLM only stitches structure around known supply.

create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  destination_slug text not null,
  title text not null,
  start_date date,
  end_date date,
  duration_days int not null check (duration_days between 1 and 14),
  vibe_tags text[] not null default '{}',
  budget_band text check (budget_band in ('low','medium','high','luxury')),
  days jsonb not null,
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  generation_meta jsonb,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists itineraries_owner_idx on public.itineraries(owner_id);
create index if not exists itineraries_destination_idx on public.itineraries(destination_slug);
create index if not exists itineraries_created_idx on public.itineraries(created_at desc);

alter table public.itineraries enable row level security;

drop policy if exists "itineraries public read" on public.itineraries;
create policy "itineraries public read" on public.itineraries
  for select using (
    visibility in ('public','unlisted')
    or (owner_id is not null and owner_id = auth.uid())
  );

drop policy if exists "itineraries owner write" on public.itineraries;
create policy "itineraries owner write" on public.itineraries
  for all using (owner_id is not null and owner_id = auth.uid())
  with check (owner_id is not null and owner_id = auth.uid());

drop trigger if exists touch_itineraries on public.itineraries;
create trigger touch_itineraries before update on public.itineraries
  for each row execute procedure public.touch_updated_at();

grant all on public.itineraries to anon, authenticated, service_role;
