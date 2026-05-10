import { cookies } from "next/headers";

export const REFERRAL_COOKIE = "wn_ref";
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

export type ReferralCookie = {
  referrerId: string;
  source: string | null;
  capturedAt: string;
};

export async function readReferralCookie(): Promise<ReferralCookie | null> {
  const store = await cookies();
  const raw = store.get(REFERRAL_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ReferralCookie;
    if (typeof parsed.referrerId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setReferralCookie(referrerId: string, source: string | null) {
  const store = await cookies();
  const payload: ReferralCookie = {
    referrerId,
    source,
    capturedAt: new Date().toISOString()
  };
  store.set(REFERRAL_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S
  });
}

export async function clearReferralCookie() {
  const store = await cookies();
  store.delete(REFERRAL_COOKIE);
}
