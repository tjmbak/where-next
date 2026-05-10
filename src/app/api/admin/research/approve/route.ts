import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/research/admin-auth";
import {
  approveDraft,
  deleteDraft,
  loadDraft,
  rejectApproved
} from "@/lib/research/draft-store";
import type { MonthNumber } from "@/types/content";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["approve", "reject", "discard-draft"]),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2025).max(2030)
});

export async function POST(req: Request) {
  const blocked = requireAdmin(req);
  if (blocked) return blocked;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { action, slug, month, year } = parsed.data;
  const m = month as MonthNumber;

  if (action === "approve") {
    const draft = loadDraft(slug, year, m);
    if (!draft) {
      return NextResponse.json({ error: "draft_not_found" }, { status: 404 });
    }
    const entry = approveDraft(draft);
    return NextResponse.json({ ok: true, approved: entry });
  }

  if (action === "reject") {
    const removed = rejectApproved(slug, year, m);
    return NextResponse.json({ ok: true, removed });
  }

  if (action === "discard-draft") {
    const removed = deleteDraft(slug, year, m);
    return NextResponse.json({ ok: true, removed });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
