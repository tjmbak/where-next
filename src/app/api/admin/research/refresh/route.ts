import { NextResponse } from "next/server";
import { z } from "zod";
import { refreshEvents } from "@/lib/research/refresh-events";
import { saveDraft, type DraftEnvelope } from "@/lib/research/draft-store";
import { requireAdmin } from "@/lib/research/admin-auth";
import type { MonthNumber } from "@/types/content";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2025).max(2030).optional()
});

export async function POST(req: Request) {
  const blocked = requireAdmin(req);
  if (blocked) return blocked;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 503 });
  }

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

  try {
    const result = await refreshEvents({
      slug: parsed.data.slug,
      month: parsed.data.month as MonthNumber,
      year: parsed.data.year
    });

    const envelope: DraftEnvelope = {
      slug: result.destination.slug,
      month: result.month,
      year: result.year,
      generatedAt: result.generatedAt,
      responseId: result.responseId,
      searchCalls: result.searchCalls,
      citations: result.citations,
      data: result.data
    };

    const file = saveDraft(envelope);

    return NextResponse.json({
      ok: true,
      file,
      envelope
    });
  } catch (err) {
    console.error("[admin/research/refresh] error:", err);
    return NextResponse.json(
      {
        error: "research_failed",
        message: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}
