import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/research/admin-auth";
import {
  listApproved,
  listDraftSummaries,
  loadDraft
} from "@/lib/research/draft-store";
import { DESTINATIONS } from "@/data/music-travel";
import type { MonthNumber } from "@/types/content";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const blocked = requireAdmin(req);
  if (blocked) return blocked;

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const monthStr = url.searchParams.get("month");
  const yearStr = url.searchParams.get("year");

  if (slug && monthStr && yearStr) {
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year)
    ) {
      return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }
    const draft = loadDraft(slug, year, month as MonthNumber);
    if (!draft) {
      return NextResponse.json({ ok: true, draft: null });
    }
    return NextResponse.json({ ok: true, draft });
  }

  const drafts = listDraftSummaries();
  const approved = listApproved().map((entry) => ({
    slug: entry.slug,
    month: entry.month,
    year: entry.year,
    approvedAt: entry.approvedAt,
    eventsCount: entry.data.events?.length ?? 0
  }));

  return NextResponse.json({
    ok: true,
    destinations: DESTINATIONS.map((d) => ({
      slug: d.slug,
      city: d.city,
      country: d.country,
      activeMonths: d.activeMonths,
      peakMonths: d.peakMonths
    })),
    drafts,
    approved
  });
}
