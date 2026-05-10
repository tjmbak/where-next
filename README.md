# Where Next

Where Next is a curated music-travel discovery MVP. It helps travelers choose where to go by month based on festivals, club seasons, nightlife moments, venues, and destination context.

## What Is Built

- Interactive MapLibre activity map with month, genre, vibe, budget, and region filters.
- 25 curated launch destinations with editorial activity scores and peak months.
- SEO-friendly destination guides with events, venues, budget notes, source confidence, and outbound links.
- Supabase schema and seed SQL for destinations, monthly scores, events, venues, curation sources, waitlist signups, and analytics events.
- Waitlist capture and lightweight event tracking routes.
- Internal curation dashboard at `/admin`.

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` when connecting live services.

The app works with local curated TypeScript seed data without Supabase. Add Supabase keys to enable persistence for waitlist signups and analytics events.

## Supabase

Run the migration and seed files with the Supabase CLI or SQL editor:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/seed.sql`

The schema expects curated writes through Supabase Studio or a future protected admin form. Public reads are enabled for published destination content.

## Product Principle

This is not a generic event directory. The core question is:

> Where should I travel this month for music, and why?
