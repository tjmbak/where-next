import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/client";
import {
  renderWatchAlertsEmail,
  type WatchAlertSection
} from "@/lib/email/templates/watch-alerts";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getDestinationBySlug,
  getEventsForDestinationInMonth
} from "@/data/music-travel";
import type { MonthNumber } from "@/types/content";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_EVENTS_PER_SECTION = 6;

type WatchRow = {
  id: string;
  user_id: string;
  slug: string;
  month: MonthNumber;
  year: number;
  seen_event_ids: string[];
  notified_at: string | null;
};

type AuthUser = { id: string; email?: string | null };

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return request.headers.get("x-vercel-cron-signature") === secret;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase-not-configured" }, { status: 503 });
  }

  const { data: watchRows, error } = await supabase
    .from("watches")
    .select("id, user_id, slug, month, year, seen_event_ids, notified_at");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const watches = (watchRows ?? []) as WatchRow[];
  const now = new Date().toISOString();
  const sectionsByUser = new Map<string, WatchAlertSection[]>();
  let baselined = 0;
  let diffed = 0;

  for (const watch of watches) {
    const destination = getDestinationBySlug(watch.slug);
    if (!destination) continue;

    const currentEvents = getEventsForDestinationInMonth(watch.slug, watch.month, watch.year)
      // Estimates (blueprint projections for un-researched years) don't count
      // as news; only alert on confirmed entries.
      .filter((ev) => ev.confirmed !== false);
    const currentIds = currentEvents.map((ev) => ev.id);

    // First pass for a new watch: record the baseline silently so users are
    // only ever alerted about events confirmed *after* they started watching.
    if (watch.notified_at === null && watch.seen_event_ids.length === 0) {
      await supabase
        .from("watches")
        .update({ seen_event_ids: currentIds, notified_at: now })
        .eq("id", watch.id);
      baselined++;
      continue;
    }

    const seen = new Set(watch.seen_event_ids);
    const fresh = currentEvents.filter((ev) => !seen.has(ev.id));
    if (fresh.length === 0) continue;

    // Union keeps ids that temporarily vanish from re-alerting if they return.
    const mergedIds = Array.from(new Set([...watch.seen_event_ids, ...currentIds]));
    await supabase
      .from("watches")
      .update({ seen_event_ids: mergedIds, notified_at: now })
      .eq("id", watch.id);
    diffed++;

    const section: WatchAlertSection = {
      slug: watch.slug,
      city: destination.city,
      country: destination.country,
      month: watch.month,
      year: watch.year,
      newEvents: fresh.slice(0, MAX_EVENTS_PER_SECTION).map((ev) => ({
        title: ev.title,
        startDate: ev.startDate,
        endDate: ev.endDate ?? null,
        type: ev.type,
        summary: ev.summary
      }))
    };
    const list = sectionsByUser.get(watch.user_id);
    if (list) list.push(section);
    else sectionsByUser.set(watch.user_id, [section]);
  }

  if (sectionsByUser.size === 0) {
    return NextResponse.json({ ok: true, watches: watches.length, baselined, diffed, emailed: 0 });
  }

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    return NextResponse.json({ ok: false, error: authError.message }, { status: 500 });
  }
  const emailByUser = new Map<string, string>();
  for (const user of (authData?.users ?? []) as AuthUser[]) {
    if (user.email) emailByUser.set(user.id, user.email);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let emailed = 0;
  for (const [userId, sections] of sectionsByUser) {
    const email = emailByUser.get(userId);
    if (!email) continue;
    const rendered = renderWatchAlertsEmail({ email, sections, siteUrl });
    const result = await sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: "watch-alert"
    });
    if (result.ok) emailed++;
  }

  return NextResponse.json({
    ok: true,
    watches: watches.length,
    baselined,
    diffed,
    emailed
  });
}

export async function POST(request: Request) {
  return GET(request);
}
