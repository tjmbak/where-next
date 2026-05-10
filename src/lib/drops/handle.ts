// 8-char base32 handles for human-friendly drop permalinks. Collision space
// is ~1 trillion, so collisions become a real concern around the 1M-user
// mark — at that point, switch to 10 chars or sign with HMAC.

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // skip 0/1/i/l/o for legibility

export function generateHandle(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
