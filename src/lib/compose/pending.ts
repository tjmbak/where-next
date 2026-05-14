import { cookies } from "next/headers";
import type { ItineraryDuration } from "@/lib/itineraries/generate";

export const PENDING_COMPOSE_COOKIE = "wn_pending_compose";
const COOKIE_MAX_AGE_S = 60 * 60 * 2; // 2h — survives magic-link round trip

/**
 * Minimal spec for regenerating the user's chosen itinerary after auth.
 * We deliberately don't stash the full itinerary payload — it can exceed
 * browser cookie limits (~4KB). Regenerating gives a near-identical result
 * because the catalog + tools are deterministic given the same inputs.
 */
export type PendingComposeCookie = {
  destinationSlug: string;
  durationDays: ItineraryDuration;
  startDate: string | null;
  vibeTags: string[];
  budgetBand: "low" | "medium" | "high" | "luxury" | null;
  // Display label for the success toast / log
  city: string;
  capturedAt: string;
};

export async function readPendingComposeCookie(): Promise<PendingComposeCookie | null> {
  const store = await cookies();
  const raw = store.get(PENDING_COMPOSE_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingComposeCookie;
    if (typeof parsed.destinationSlug !== "string") return null;
    if (typeof parsed.durationDays !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setPendingComposeCookie(spec: Omit<PendingComposeCookie, "capturedAt">) {
  const store = await cookies();
  const value: PendingComposeCookie = { ...spec, capturedAt: new Date().toISOString() };
  store.set(PENDING_COMPOSE_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S
  });
}

export async function clearPendingComposeCookie() {
  const store = await cookies();
  store.delete(PENDING_COMPOSE_COOKIE);
}
