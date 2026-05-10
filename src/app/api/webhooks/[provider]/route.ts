import { NextResponse } from "next/server";
import { recordCommission } from "@/lib/affiliate/attribution";
import { isAffiliateProvider, type AffiliateProvider } from "@/lib/affiliate/providers";

type RouteContext = { params: Promise<{ provider: string }> };

// Webhook payloads are partner-specific. Each provider gets a small adapter
// that maps the shape onto the canonical CommissionEvent. Authentication is
// per-provider too — handled by header signature verification using a secret
// stored in env (e.g. BOOKING_WEBHOOK_SECRET).

type Adapter = (payload: unknown) => {
  externalId: string;
  amountUsd: number;
  currency?: string;
  status?: "pending" | "approved" | "paid" | "rejected";
  clickId?: string | null;
  raw: Record<string, unknown>;
} | null;

const ADAPTERS: Record<AffiliateProvider, Adapter> = {
  booking: (payload) => {
    const p = payload as { id?: string; commission?: number; currency?: string; click_label?: string; status?: string };
    if (!p?.id || typeof p.commission !== "number") return null;
    return {
      externalId: p.id,
      amountUsd: p.commission,
      currency: p.currency ?? "USD",
      clickId: p.click_label ?? null,
      status: (p.status as "pending" | "approved" | "paid" | "rejected") ?? "pending",
      raw: p as Record<string, unknown>
    };
  },
  skyscanner: (payload) => {
    const p = payload as { booking_id?: string; commission_usd?: number; click_id?: string; status?: string };
    if (!p?.booking_id || typeof p.commission_usd !== "number") return null;
    return {
      externalId: p.booking_id,
      amountUsd: p.commission_usd,
      clickId: p.click_id ?? null,
      status: (p.status as "pending" | "approved" | "paid" | "rejected") ?? "pending",
      raw: p as Record<string, unknown>
    };
  },
  gyg: (payload) => {
    const p = payload as { id?: string; commission_amount?: number; currency?: string; partner_click_id?: string; status?: string };
    if (!p?.id || typeof p.commission_amount !== "number") return null;
    return {
      externalId: p.id,
      amountUsd: p.commission_amount,
      currency: p.currency ?? "USD",
      clickId: p.partner_click_id ?? null,
      status: (p.status as "pending" | "approved" | "paid" | "rejected") ?? "pending",
      raw: p as Record<string, unknown>
    };
  },
  viagogo: (payload) => {
    const p = payload as { transaction_id?: string; commission?: number; AID?: string; status?: string };
    if (!p?.transaction_id || typeof p.commission !== "number") return null;
    return {
      externalId: p.transaction_id,
      amountUsd: p.commission,
      clickId: p.AID ?? null,
      status: (p.status as "pending" | "approved" | "paid" | "rejected") ?? "pending",
      raw: p as Record<string, unknown>
    };
  },
  raw: () => null
};

function authorize(provider: AffiliateProvider, request: Request) {
  const envName = `${provider.toUpperCase()}_WEBHOOK_SECRET`;
  const expected = process.env[envName];
  if (!expected) return process.env.NODE_ENV !== "production";
  const provided =
    request.headers.get("x-wn-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return provided === expected;
}

export async function POST(request: Request, ctx: RouteContext) {
  const { provider: providerParam } = await ctx.params;
  if (!isAffiliateProvider(providerParam) || providerParam === "raw") {
    return NextResponse.json({ ok: false, error: "unknown-provider" }, { status: 400 });
  }
  const provider = providerParam;

  if (!authorize(provider, request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const adapted = ADAPTERS[provider](payload);
  if (!adapted) return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });

  const result = await recordCommission({ provider, ...adapted });
  if (!result.ok) return NextResponse.json(result, { status: 500 });

  return NextResponse.json({ ok: true, mode: result.mode });
}
