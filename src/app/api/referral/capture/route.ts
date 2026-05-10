import { NextResponse } from "next/server";
import { z } from "zod";
import { setReferralCookie } from "@/lib/referral";

const schema = z.object({
  ref: z.string().trim().min(1).max(80),
  source: z.string().trim().max(40).optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await setReferralCookie(parsed.data.ref, parsed.data.source ?? null);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref");
  const source = url.searchParams.get("source");
  const next = url.searchParams.get("next") ?? "/";
  if (!ref) return NextResponse.redirect(new URL(next, url.origin));
  await setReferralCookie(ref, source);
  return NextResponse.redirect(new URL(next, url.origin));
}
