import { cookies } from "next/headers";

export const PENDING_FORK_COOKIE = "wn_pending_fork";
const COOKIE_MAX_AGE_S = 60 * 60 * 2; // 2 hours — enough to round-trip a magic link

export type PendingForkCookie = {
  sourceId: string;
  sourceSlug: string;
  capturedAt: string;
};

export async function readPendingForkCookie(): Promise<PendingForkCookie | null> {
  const store = await cookies();
  const raw = store.get(PENDING_FORK_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingForkCookie;
    if (typeof parsed.sourceId !== "string" || typeof parsed.sourceSlug !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setPendingForkCookie(sourceId: string, sourceSlug: string) {
  const store = await cookies();
  const payload: PendingForkCookie = {
    sourceId,
    sourceSlug,
    capturedAt: new Date().toISOString()
  };
  store.set(PENDING_FORK_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S
  });
}

export async function clearPendingForkCookie() {
  const store = await cookies();
  store.delete(PENDING_FORK_COOKIE);
}
