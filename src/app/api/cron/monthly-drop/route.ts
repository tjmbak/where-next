import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/client";
import { renderMonthlyDropEmail } from "@/lib/email/templates/monthly-drop";
import { dropPeriodSlug, generateDropForUser, nextDropPeriod } from "@/lib/drops/generate";
import { generateHandle } from "@/lib/drops/handle";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Budget, Genre, MonthNumber, Region } from "@/types/content";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Preferences = {
  user_id: string;
  handle: string | null;
  genres: string[];
  regions: string[];
  budget: Budget | null;
  travel_windows: number[];
  drop_enabled: boolean;
};

type AuthUser = { id: string; email?: string | null };

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Allow execution in dev without a secret so local testing works; fail
    // closed in production.
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  // Vercel Cron sends `x-vercel-cron-signature`; we accept the bearer pattern
  // as the canonical, with the cron-signature as a fallback.
  return request.headers.get("x-vercel-cron-signature") === secret;
}

export async function POST(request: Request) {
  return run(request);
}

export async function GET(request: Request) {
  return run(request);
}

async function run(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase-not-configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const overrideMonth = url.searchParams.get("month");
  const overrideYear = url.searchParams.get("year");

  const period = overrideMonth && overrideYear
    ? { month: Number(overrideMonth) as MonthNumber, year: Number(overrideYear) }
    : nextDropPeriod(new Date());

  const { data: prefs, error: prefsError } = await supabase
    .from("user_preferences")
    .select("user_id, handle, genres, regions, budget, travel_windows, drop_enabled")
    .eq("drop_enabled", true);

  if (prefsError) {
    return NextResponse.json({ ok: false, error: prefsError.message }, { status: 500 });
  }

  if (!prefs || prefs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, period });
  }

  const userIds = (prefs as Preferences[]).map((row) => row.user_id);

  // Pull saves grouped by user
  const { data: savesData } = await supabase
    .from("saved_destinations")
    .select("user_id, slug")
    .in("user_id", userIds);
  const savesByUser = new Map<string, string[]>();
  for (const row of (savesData ?? []) as Array<{ user_id: string; slug: string }>) {
    const list = savesByUser.get(row.user_id) ?? [];
    list.push(row.slug);
    savesByUser.set(row.user_id, list);
  }

  // Skip users who already received this period (idempotency)
  const { data: existingSends } = await supabase
    .from("drop_sends")
    .select("user_id")
    .eq("drop_month", period.month)
    .eq("drop_year", period.year)
    .in("user_id", userIds);
  const alreadySent = new Set(((existingSends ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));

  // Fetch emails. Service role can read auth.users.
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    return NextResponse.json({ ok: false, error: authError.message }, { status: 500 });
  }
  const emailByUser = new Map<string, string>();
  for (const user of (authData?.users ?? []) as AuthUser[]) {
    if (user.email) emailByUser.set(user.id, user.email);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (const pref of prefs as Preferences[]) {
    if (alreadySent.has(pref.user_id)) {
      skipped++;
      continue;
    }
    const email = emailByUser.get(pref.user_id);
    if (!email) {
      skipped++;
      continue;
    }

    let handle = pref.handle;
    if (!handle) {
      // Generate a unique handle, retrying on collision
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateHandle();
        const { error: updateError } = await supabase
          .from("user_preferences")
          .update({ handle: candidate })
          .eq("user_id", pref.user_id);
        if (!updateError) {
          handle = candidate;
          break;
        }
      }
      if (!handle) {
        errors.push({ userId: pref.user_id, error: "handle-generation-failed" });
        continue;
      }
    }

    const drop = generateDropForUser({
      userId: pref.user_id,
      month: period.month as MonthNumber,
      year: period.year,
      preferences: {
        genres: (pref.genres ?? []) as Genre[],
        regions: (pref.regions ?? []) as Region[],
        budget: pref.budget,
        travelWindows: (pref.travel_windows ?? []) as MonthNumber[]
      },
      savedSlugs: savesByUser.get(pref.user_id) ?? []
    });

    const periodSlug = dropPeriodSlug(period.month as MonthNumber, period.year);
    const permalink = `${siteUrl}/drops/${periodSlug}/${handle}`;
    const unsubscribe = `${siteUrl}/api/preferences/unsubscribe?token=${pref.user_id}&channel=drop`;

    const rendered = renderMonthlyDropEmail({
      email,
      handle,
      month: period.month as MonthNumber,
      year: period.year,
      picks: drop.picks,
      permalinkUrl: permalink,
      unsubscribeUrl: unsubscribe,
      siteUrl
    });

    const result = await sendEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: "monthly-drop"
    });

    if (!result.ok) {
      errors.push({ userId: pref.user_id, error: result.error ?? "send-failed" });
      continue;
    }

    const { error: insertError } = await supabase.from("drop_sends").insert({
      user_id: pref.user_id,
      drop_month: period.month,
      drop_year: period.year,
      picks: drop.picks
    });
    if (insertError) {
      errors.push({ userId: pref.user_id, error: insertError.message });
      continue;
    }

    sent++;
  }

  return NextResponse.json({ ok: true, sent, skipped, errors, period });
}
