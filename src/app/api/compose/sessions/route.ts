import { NextResponse } from "next/server";
import { z } from "zod";
import { titleFromMessages } from "@/lib/compose/session";
import type { ComposeMessage } from "@/lib/compose/types";
import type { Itinerary } from "@/lib/itineraries/generate";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

const messageSchema = z.object({
  id: z.string().max(64),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
  toolResults: z.array(z.record(z.string(), z.unknown())).optional(),
  createdAt: z.string().max(40)
});

const upsertSchema = z.object({
  token: z.string().min(8).max(64),
  messages: z.array(messageSchema).min(1).max(80),
  currentDraft: z.record(z.string(), z.unknown()).nullable().optional()
});

/**
 * Upsert a compose session. Authed only — anon users keep their session in
 * localStorage; we don't write to the DB until the user signs in (the home
 * client adopts the local token by sending it on the first authed upsert).
 */
export async function PUT(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) {
    return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const messages = parsed.data.messages as ComposeMessage[];
  const title = titleFromMessages(messages);
  const draft = (parsed.data.currentDraft as Itinerary | null | undefined) ?? null;

  const { data, error } = await supabase
    .from("compose_sessions")
    .upsert(
      {
        session_token: parsed.data.token,
        owner_id: userData.user.id,
        title,
        messages,
        current_draft: draft
      },
      { onConflict: "session_token" }
    )
    .select("id, session_token, title, message_count, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, session: data });
}

/**
 * List the user's compose sessions (for a future /me/composers index).
 */
export async function GET() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) {
    return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("compose_sessions")
    .select("id, session_token, title, message_count, updated_at")
    .eq("owner_id", userData.user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}
