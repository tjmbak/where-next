import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.TRIP_INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-do-not-use";
const ROLE_VALUES = ["editor", "viewer"] as const;
export type InviteRole = (typeof ROLE_VALUES)[number];

type Payload = {
  tripId: string;
  role: InviteRole;
  exp: number;
};

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64url(input: string) {
  return Buffer.from(input, "base64url");
}

export function signInviteToken(tripId: string, role: InviteRole, ttlMs = 1000 * 60 * 60 * 24 * 7) {
  const exp = Date.now() + ttlMs;
  const payload: Payload = { tripId, role, exp };
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac("sha256", SECRET).update(body).digest();
  return `${body}.${base64url(sig)}`;
}

export function verifyInviteToken(token: string): Payload | null {
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
  if (!payload || typeof payload.tripId !== "string") return null;
  if (!ROLE_VALUES.includes(payload.role)) return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}
