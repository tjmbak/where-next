-- Multi-city itineraries (Engine 7 v2)
-- Collaborators on itineraries (Engine 4 extension)
-- Fork lineage so users can copy + customize a public itinerary

alter table public.itineraries
  add column if not exists legs jsonb,
  add column if not exists parent_id uuid references public.itineraries(id) on delete set null,
  add column if not exists fork_count int not null default 0;

-- Backfill: existing single-city itineraries get a one-leg legs[] array.
update public.itineraries
set legs = jsonb_build_array(
  jsonb_build_object(
    'destinationSlug', destination_slug,
    'days', duration_days
  )
)
where legs is null;

alter table public.itineraries alter column legs set not null;

create index if not exists itineraries_parent_idx on public.itineraries(parent_id);

-- Collaborators on itineraries (mirrors trip_collaborators shape so the
-- invite-token + accept flow can be reused with minimal divergence).
create table if not exists public.itinerary_collaborators (
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner','editor','viewer')),
  joined_at timestamptz not null default now(),
  primary key (itinerary_id, user_id)
);

alter table public.itinerary_collaborators enable row level security;

drop policy if exists "itin collab read" on public.itinerary_collaborators;
create policy "itin collab read" on public.itinerary_collaborators
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.itineraries i
      where i.id = itinerary_collaborators.itinerary_id and i.owner_id = auth.uid()
    )
  );

drop policy if exists "itin collab insert" on public.itinerary_collaborators;
create policy "itin collab insert" on public.itinerary_collaborators
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.itineraries i
      where i.id = itinerary_collaborators.itinerary_id and i.owner_id = auth.uid()
    )
  );

-- Update the read policy on itineraries to also let collaborators see private ones
drop policy if exists "itineraries public read" on public.itineraries;
create policy "itineraries public read" on public.itineraries
  for select using (
    visibility in ('public','unlisted')
    or (owner_id is not null and owner_id = auth.uid())
    or exists (
      select 1 from public.itinerary_collaborators c
      where c.itinerary_id = itineraries.id and c.user_id = auth.uid()
    )
  );

-- Update write policy: owners + editor-role collaborators can write
drop policy if exists "itineraries owner write" on public.itineraries;
create policy "itineraries write" on public.itineraries
  for update using (
    (owner_id is not null and owner_id = auth.uid())
    or exists (
      select 1 from public.itinerary_collaborators c
      where c.itinerary_id = itineraries.id and c.user_id = auth.uid() and c.role in ('owner','editor')
    )
  ) with check (
    (owner_id is not null and owner_id = auth.uid())
    or exists (
      select 1 from public.itinerary_collaborators c
      where c.itinerary_id = itineraries.id and c.user_id = auth.uid() and c.role in ('owner','editor')
    )
  );

drop policy if exists "itineraries owner insert" on public.itineraries;
create policy "itineraries insert" on public.itineraries
  for insert with check (owner_id is not null and owner_id = auth.uid());

drop policy if exists "itineraries owner delete" on public.itineraries;
create policy "itineraries delete" on public.itineraries
  for delete using (owner_id is not null and owner_id = auth.uid());

-- Atomic fork-count bump for public RPC use
create or replace function public.bump_itinerary_fork_count(itinerary_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.itineraries set fork_count = fork_count + 1 where id = itinerary_id;
$$;

grant execute on function public.bump_itinerary_fork_count(uuid) to anon, authenticated, service_role;
grant all on public.itinerary_collaborators to anon, authenticated, service_role;
