import type { ComposeMessage } from "@/lib/compose/types";
import type { Itinerary } from "@/lib/itineraries/generate";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz23456789";
const TOKEN_LEN = 24;

/**
 * Generates a stable client-side session token. Used as the join key
 * for the compose_sessions table — anon users carry it in localStorage,
 * and on auth we adopt the row by owner_id.
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(TOKEN_LEN);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < TOKEN_LEN; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < TOKEN_LEN; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export type ComposeSessionRow = {
  id: string;
  session_token: string;
  owner_id: string | null;
  title: string;
  messages: ComposeMessage[];
  current_draft: Itinerary | null;
  message_count: number;
  created_at: string;
  updated_at: string;
};

export function titleFromMessages(messages: ComposeMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "Untitled chat";
  return firstUser.content.slice(0, 80).trim() || "Untitled chat";
}
