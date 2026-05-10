with seed (
  slug, city, country, region, latitude, longitude, tagline, summary, active_months, peak_months,
  genres, vibes, budget, spend_low, spend_high, who_for, when_to_book, travel_notes
) as (
  values
  ('ibiza','Ibiza','Spain','Europe',38.9067,1.4206,'Peak club season and global house residencies.','Superclubs, beach clubs, promoter brands, and late-night island energy.',array[5,6,7,8,9,10],array[7,8,9],array['house','techno','afro-house','electronic'],array['beach','luxury','late-night','group-trip'],'luxury',260,700,array['House and techno fans','Group trips'],'Book 8-12 weeks ahead for July and August.','Shoulder months can be better value.'),
  ('mykonos','Mykonos','Greece','Europe',37.4467,25.3289,'Cycladic luxury and sunset dance programming.','Beach clubs, villas, and summer headline sets.',array[6,7,8,9],array[7,8],array['house','afro-house','electronic'],array['beach','luxury','group-trip'],'luxury',280,850,array['Luxury beach groups','Afro-house fans'],'Book villas and beach clubs early.','Transport planning matters.'),
  ('lisbon-portimao','Lisbon / Portimao','Portugal','Europe',38.7223,-9.1393,'City culture and Atlantic coast festivals.','Lisbon nightlife plus Algarve festival travel.',array[5,6,7,8,9],array[6,7],array['afro-house','amapiano','electronic','festival','house'],array['festival','beach','city','group-trip'],'medium',130,360,array['Festival travelers','Afrobeats fans'],'Book Algarve stays early.','Plan separate coastal transport.'),
  ('barcelona','Barcelona','Spain','Europe',41.3874,2.1686,'Beach city festivals and electronic weeks.','Major festivals, beach access, and club programming.',array[5,6,7,8,9],array[6],array['festival','electronic','house','techno','pop'],array['city','beach','festival','late-night'],'high',170,420,array['Festival travelers','Electronic fans'],'Book flagship festival weeks early.','Beach and festival venues can be spread out.'),
  ('berlin','Berlin','Germany','Europe',52.52,13.405,'Underground club culture year-round.','A reliable music-first city trip for techno and experimental programming.',array[1,2,3,4,5,6,7,8,9,10,11,12],array[5,6,9,10],array['techno','electronic','house'],array['underground','city','late-night','cultural'],'medium',130,320,array['Techno travelers','Underground club fans'],'Keep plans flexible.','Leave space for late lineups and door policies.'),
  ('amsterdam','Amsterdam','Netherlands','Europe',52.3676,4.9041,'ADE and compact electronic clubbing.','Dance music infrastructure with a strong October peak.',array[4,5,6,7,8,9,10],array[10],array['electronic','house','techno','festival'],array['city','festival','late-night'],'high',180,430,array['Electronic music fans','Conference week travelers'],'Book very early for ADE.','Hotel pricing spikes during flagship weeks.'),
  ('london','London','United Kingdom','Europe',51.5072,-0.1276,'Always-on global touring density.','A year-round capital across clubs, jazz, grime, amapiano, and festivals.',array[1,2,3,4,5,6,7,8,9,10,11,12],array[6,7,8],array['electronic','house','techno','hip-hop','jazz','amapiano'],array['city','cultural','late-night','festival'],'high',190,500,array['Genre explorers','Big city travelers'],'Book summer hotels early.','Plan by neighborhood.'),
  ('miami','Miami','United States','North America',25.7617,-80.1918,'Winter sun and Miami Music Week.','Electronic, Latin, hip-hop, luxury nightlife, March and December peaks.',array[1,2,3,4,5,10,11,12],array[3,12],array['electronic','house','latin','hip-hop'],array['beach','luxury','city','late-night'],'luxury',260,760,array['Electronic travelers','Winter sun seekers'],'Book Music Week and Art Basel early.','Cluster plans by neighborhood.'),
  ('tulum','Tulum','Mexico','North America',20.2114,-87.4654,'Jungle venues and winter dance travel.','Beach clubs and long-form electronic programming.',array[1,2,3,11,12],array[1],array['afro-house','house','electronic','techno'],array['beach','luxury','late-night','group-trip'],'high',210,650,array['Winter dance travelers','Beach venue fans'],'Book January months ahead.','Hotel location matters.'),
  ('los-angeles','Los Angeles','United States','North America',34.0522,-118.2437,'Touring density and Coachella orbit.','Warehouse parties, label culture, and festival adjacency.',array[1,2,3,4,5,6,8,9,10,11,12],array[4,10],array['electronic','hip-hop','r-and-b','pop','festival'],array['city','festival','late-night','cultural'],'high',220,600,array['Live music travelers','Warehouse fans'],'Book April early.','Area planning is essential.'),
  ('new-york','New York','United States','North America',40.7128,-74.006,'Clubs, jazz, arenas, and summer festivals.','Dense year-round depth across Brooklyn, Manhattan, and outdoor programming.',array[1,2,3,4,5,6,7,8,9,10,11,12],array[6,7,9],array['house','techno','hip-hop','jazz','r-and-b','pop'],array['city','cultural','underground','late-night'],'luxury',250,750,array['City music travelers','Jazz and club fans'],'Book summer weekends early.','Plan by borough.'),
  ('cape-town','Cape Town','South Africa','Africa',-33.9249,18.4241,'Southern hemisphere summer and Afro-electronic scenes.','Outdoor parties, beach culture, and summer music travel.',array[1,2,3,11,12],array[12,1],array['afro-house','amapiano','house','electronic'],array['beach','cultural','group-trip','city'],'medium',110,330,array['December sun seekers','Afro-house fans'],'Book December early.','Plan trusted late-night transport.'),
  ('lagos','Lagos','Nigeria','Africa',6.5244,3.3792,'Detty December and afrobeats gravity.','Concerts, clubs, beach events, and diaspora travel.',array[11,12,1],array[12],array['afro-house','amapiano','hip-hop','r-and-b','festival'],array['cultural','late-night','group-trip','city'],'high',150,480,array['Afrobeats travelers','Diaspora trips'],'Book December flights and stays early.','Local knowledge matters.'),
  ('accra','Accra','Ghana','Africa',5.6037,-0.187,'December festivals and beach nightlife.','Diaspora-led cultural programming and afrobeats travel.',array[11,12,1],array[12],array['afro-house','amapiano','hip-hop','r-and-b','festival'],array['cultural','beach','group-trip','late-night'],'high',140,430,array['December culture travelers','Afrobeats fans'],'Book December months ahead.','Pair events with neighborhoods and beach days.'),
  ('paris','Paris','France','Europe',48.8566,2.3522,'Fashion weeks, jazz rooms, and electronic nights.','Culture-led music travel with club, jazz, and arena programming.',array[2,3,5,6,7,9,10],array[6,9],array['electronic','house','jazz','pop','hip-hop'],array['city','cultural','luxury'],'high',190,520,array['Culture-led travelers','Jazz fans'],'Book fashion week and summer weekends early.','Pair music with food, galleries, and neighborhoods.'),
  ('dubai','Dubai','United Arab Emirates','Middle East',25.2048,55.2708,'Winter luxury nightlife and beach clubs.','Cooler months bring beach clubs, venues, and touring artists.',array[1,2,3,10,11,12],array[12,1,2],array['house','afro-house','hip-hop','pop','electronic'],array['luxury','beach','city','group-trip'],'luxury',240,800,array['Luxury nightlife travelers','Winter sun groups'],'Book winter weekends early.','Reservations and dress codes matter.'),
  ('bali','Bali','Indonesia','Asia',-8.3405,115.092,'Beach clubs and sunset electronic programming.','Dry-season beach culture with long-stay music travel.',array[5,6,7,8,9,10],array[7,8],array['house','afro-house','electronic'],array['beach','group-trip','luxury','cultural'],'medium',90,300,array['Long-stay travelers','Beach club fans'],'Book dry-season stays early.','Choose a base near venues.'),
  ('marbella','Marbella','Spain','Europe',36.5101,-4.8824,'Mediterranean luxury and beach clubs.','Summer party weekends and coastal nightlife.',array[6,7,8,9],array[7,8],array['house','afro-house','hip-hop','r-and-b'],array['beach','luxury','group-trip'],'luxury',240,700,array['Luxury group trips','Beach club travelers'],'Book villas and tables early.','More lifestyle calendar than single mega-event.'),
  ('split','Split','Croatia','Europe',43.5081,16.4402,'Adriatic festivals and island routes.','Summer festival travel, boat days, and coastal lineups.',array[6,7,8],array[7],array['electronic','house','techno','festival'],array['beach','festival','group-trip'],'medium',130,350,array['Festival groups','Island travelers'],'Book festival weeks and ferries early.','Works well as a Croatia base.'),
  ('malta','Malta','Malta','Europe',35.9375,14.3754,'Island festivals and compact club trips.','Warm-weather group music travel with boat parties.',array[5,6,7,8,9],array[6,7],array['festival','house','techno','electronic','hip-hop'],array['beach','festival','group-trip'],'medium',120,330,array['Festival travelers','Boat party fans'],'Book around festival announcements.','Compact and first-time friendly.'),
  ('montreal','Montreal','Canada','North America',45.5019,-73.5674,'Summer festivals, jazz, and electronic culture.','Long weekends with outdoor festivals and compact city energy.',array[5,6,7,8,9],array[6,7],array['electronic','house','techno','jazz','festival'],array['city','festival','cultural','late-night'],'medium',140,340,array['Summer city travelers','Jazz and electronic fans'],'Book around festival calendar drops.','Music density without huge-city friction.'),
  ('rio-de-janeiro','Rio de Janeiro','Brazil','South America',-22.9068,-43.1729,'Carnival, funk, samba, and beach culture.','A world-class February music-travel peak.',array[1,2,3,12],array[2],array['latin','festival','house','hip-hop'],array['beach','cultural','festival','group-trip'],'medium',100,330,array['Carnival travelers','Latin music fans'],'Book Carnival many months ahead.','Safety and trusted local guidance are essential.'),
  ('detroit','Detroit','United States','North America',42.3314,-83.0458,'Techno history and Memorial Day pilgrimage.','A historically important techno destination.',array[5,6,9],array[5],array['techno','house','electronic','festival'],array['underground','cultural','festival','city'],'medium',120,330,array['Techno fans','Music history travelers'],'Book Memorial Day early.','History and community are core to the trip.'),
  ('las-vegas','Las Vegas','United States','North America',36.1716,-115.1391,'EDC, residencies, and pool parties.','High-production clubs and festival weekends.',array[3,4,5,6,7,8,9,10],array[5],array['electronic','house','hip-hop','pop','festival'],array['luxury','festival','group-trip','late-night'],'high',190,620,array['EDM fans','Group trips'],'Book festival weekends early.','Major overlaps drive pricing.'),
  ('marrakech','Marrakech','Morocco','Africa',31.6295,-7.9811,'Boutique festivals and Afro-electronic destination travel.','Luxury cultural weekends with spring and autumn music timing.',array[3,4,5,9,10,11],array[5,10],array['afro-house','house','electronic'],array['luxury','cultural','festival','group-trip'],'high',150,500,array['Boutique festival travelers','Afro-house fans'],'Book riads around spring and autumn dates.','Culture plus music, not pure nightlife.')
)
insert into public.destinations (
  slug, city, country, region, latitude, longitude, tagline, summary, active_months, peak_months,
  genres, vibes, budget, average_daily_spend_low_usd, average_daily_spend_high_usd, who_for,
  when_to_book, travel_notes
)
select slug, city, country, region::public.destination_region, latitude, longitude, tagline, summary,
  active_months, peak_months, genres, vibes, budget::public.destination_budget, spend_low, spend_high,
  who_for, when_to_book, travel_notes
from seed
on conflict (slug) do update set
  tagline = excluded.tagline,
  summary = excluded.summary,
  active_months = excluded.active_months,
  peak_months = excluded.peak_months,
  genres = excluded.genres,
  vibes = excluded.vibes,
  updated_at = now();

insert into public.monthly_destination_scores (
  destination_id, month, year, overall_score, confidence, editorial_summary, genre_scores, why_now
)
select
  d.id,
  active_month,
  null,
  case when active_month = any(d.peak_months) then 92 when cardinality(d.active_months) > 8 then 74 else 68 end,
  case when active_month = any(d.peak_months) then 'high'::public.curation_confidence else 'medium'::public.curation_confidence end,
  case when active_month = any(d.peak_months)
    then d.city || ' is in one of its clearest music-travel months.'
    else d.city || ' is active this month and worth monitoring before booking.'
  end,
  jsonb_build_object(d.genres[1], case when active_month = any(d.peak_months) then 92 else 68 end),
  array[
    case when active_month = any(d.peak_months) then 'Peak destination timing.' else 'Credible music-travel activity.' end,
    d.tagline,
    'Confirm current lineups through official sources before booking.'
  ]
from public.destinations d
cross join unnest(d.active_months) as active_month
on conflict (destination_id, month, year) do update set
  overall_score = excluded.overall_score,
  confidence = excluded.confidence,
  editorial_summary = excluded.editorial_summary,
  genre_scores = excluded.genre_scores,
  why_now = excluded.why_now,
  updated_at = now();

with venue_seed(slug, external_id, name, type, official_url) as (
  values
  ('ibiza','hi-ibiza','Hi Ibiza','venue','https://www.hiibiza.com/'),
  ('mykonos','scorpios','Scorpios Mykonos','beach-club','https://www.scorpiosmykonos.com/'),
  ('lisbon-portimao','afro-nation','Afro Nation Portugal','festival','https://www.afronation.com/'),
  ('barcelona','primavera','Primavera Sound','festival','https://www.primaverasound.com/'),
  ('berlin','berghain','Berghain / Panorama Bar','venue','https://www.berghain.berlin/'),
  ('amsterdam','ade','Amsterdam Dance Event','conference','https://www.amsterdam-dance-event.nl/'),
  ('london','fabric','fabric London','venue','https://www.fabriclondon.com/'),
  ('miami','ultra-miami','Ultra Music Festival','festival','https://ultramusicfestival.com/'),
  ('tulum','zamna','Zamna Tulum','festival','https://zamnafestival.com/'),
  ('los-angeles','coachella','Coachella','festival','https://www.coachella.com/'),
  ('new-york','brooklyn-mirage','Brooklyn Mirage','venue','https://www.avant-gardner.com/'),
  ('cape-town','rocking-the-daisies','Rocking the Daisies','festival','https://rockingthedaisies.com/'),
  ('lagos','detty-december-lagos','Detty December Lagos','festival','https://www.google.com/search?q=Detty+December+Lagos+events'),
  ('accra','afrofuture','AfroFuture','festival','https://www.afrofuture.com/'),
  ('paris','rex-club','Rex Club','venue','https://rexclub.com/'),
  ('dubai','soho-garden','Soho Garden','venue','https://sohogardendxb.com/'),
  ('bali','potato-head','Potato Head Bali','beach-club','https://seminyak.potatohead.co/'),
  ('marbella','olivia-valere','Olivia Valere','venue','https://oliviavalere.com/'),
  ('split','ultra-europe','Ultra Europe','festival','https://ultraeurope.com/'),
  ('malta','malta-festival-season','Malta festival season','festival','https://www.visitmalta.com/'),
  ('montreal','piknic','Piknic Electronik','festival','https://piknicelectronik.com/'),
  ('rio-de-janeiro','rio-carnival','Rio Carnival','carnival','https://riotur.rio/'),
  ('detroit','movement','Movement Detroit','festival','https://movementfestival.com/'),
  ('las-vegas','edc-vegas','EDC Las Vegas','festival','https://lasvegas.electricdaisycarnival.com/'),
  ('marrakech','oasis-into-the-wild','Oasis Into the Wild','festival','https://theoasisfest.com/')
),
inserted_venues as (
  insert into public.venues (destination_id, external_id, name, type, official_url, scene_tags)
  select d.id, v.external_id, v.name, v.type, v.official_url, d.vibes[1:2]
  from venue_seed v
  join public.destinations d on d.slug = v.slug
  on conflict (external_id) do update set name = excluded.name, official_url = excluded.official_url, updated_at = now()
  returning id, destination_id, external_id, name, type, official_url
)
insert into public.events (
  destination_id, venue_id, external_id, title, start_date, end_date, type, genres, importance_score, summary, source_url, ticket_url
)
select
  d.id,
  v.id,
  v.external_id || '-highlight',
  v.name,
  make_date(2026, d.peak_months[1], 1),
  make_date(2026, d.peak_months[1], 28),
  case when v.type = 'venue' then 'club-night' else v.type end,
  d.genres[1:3],
  92,
  v.name || ' is a launch highlight for ' || d.city || '. Confirm exact dates and lineups through the official source before booking.',
  v.official_url,
  v.official_url
from inserted_venues v
join public.destinations d on d.id = v.destination_id
on conflict (external_id) do update set
  title = excluded.title,
  summary = excluded.summary,
  source_url = excluded.source_url,
  ticket_url = excluded.ticket_url,
  updated_at = now();

insert into public.curation_sources (destination_id, event_id, source_url, publisher, last_checked, notes)
select d.id, e.id, e.source_url, e.title, date '2026-05-05', 'Launch seed source for destination and event verification.'
from public.events e
join public.destinations d on d.id = e.destination_id
on conflict do nothing;
