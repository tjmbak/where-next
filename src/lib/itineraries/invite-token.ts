import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.ITINERARY_INVITE_SECRET ||
  process.env.TRIP_INVITE_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "dev-only-do-not-use";

const ROLES = ["editor", "viewer"] as const;
export type ItineraryInviteRole = (typeof ROLES)[number];

type Payload = { itineraryId: string; role: ItineraryInviteRole; exp: number };

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}
function fromBase64url(input: string) {
  return Buffer.from(input, "base64url");
}

export function signItineraryInviteToken(
  itineraryId: string,
  role: ItineraryInviteRole,
  ttlMs = 1000 * 60 * 60 * 24 * 14
): string {
  const exp = Date.now() + ttlMs;
  const payload: Payload = { itineraryId, role, exp };
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", SECRET).update(body).digest();
  return `${body}.${base64url(sig)}`;
}

export function verifyItineraryInviteToken(token: string): Payload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, providedSig] = parts;

  const expected = createHmac("sha256", SECRET).update(body).digest();
  const provided = fromBase64url(providedSig);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(new Uint8Array(provided), new Uint8Array(expected))) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(fromBase64url(body).toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (typeof payload.itineraryId !== "string") return null;
  if (!ROLES.includes(payload.role)) return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}
