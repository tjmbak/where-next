import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { AffiliateProvider } from "@/lib/affiliate/providers";

export type CommissionEvent = {
  provider: AffiliateProvider;
  externalId: string;
  clickId?: string | null;
  amountUsd: number;
  currency?: string;
  status?: "pending" | "approved" | "paid" | "rejected";
  raw?: Record<string, unknown>;
};

export async function recordCommission(event: CommissionEvent) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, error: "supabase-not-configured" };

  // External ID dedupe: webhooks frequently retry, and we don't want to
  // double-credit. Upsert keyed on (provider, external_id).
  const existing = await supabase
    .from("commissions")
    .select("id")
    .eq("provider", event.provider)
    .eq("external_id", event.externalId)
    .maybeSingle();

  const payload = {
    provider: event.provider,
    external_id: event.externalId,
    click_id: event.clickId ?? null,
    amount_usd: event.amountUsd,
    currency: event.currency ?? "USD",
    status: event.status ?? "pending",
    raw: event.raw ?? {}
  };

  if (existing.data?.id) {
    const { error } = await supabase.from("commissions").update(payload).eq("id", existing.data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, mode: "updated" as const };
  }

  const { error } = await supabase.from("commissions").insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true, mode: "inserted" as const };
}
