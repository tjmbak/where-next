import { z } from "zod";
import { runAgentTurn } from "@/lib/compose/agent";
import type { ComposeMessage } from "@/lib/compose/types";
import type { Itinerary } from "@/lib/itineraries/generate";

export const runtime = "nodejs";
// Streamed agent turns can run ~10-30s for the suggest_itineraries tool.
// Vercel default is 10s; bump explicitly.
export const maxDuration = 60;

const messageSchema = z.object({
  id: z.string().max(64),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
  createdAt: z.string().max(40)
});

// currentDraft can balloon to ~20KB serialized; allow it but cap message size.
// Loose validation here — generateItinerary's schema is the source of truth.
const draftSchema = z
  .object({
    destinationSlug: z.string(),
    title: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    durationDays: z.number().int(),
    legs: z.array(z.object({ destinationSlug: z.string(), days: z.number().int() })),
    vibeTags: z.array(z.string()),
    budgetBand: z.string(),
    days: z.array(z.record(z.string(), z.unknown())),
    generatedAt: z.string(),
    model: z.string()
  })
  .passthrough();

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  currentDraft: draftSchema.nullable().optional()
});

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "openai-not-configured" }), {
      status: 503,
      headers: { "content-type": "application/json" }
    });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid", issues: parsed.error.issues }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }

  const messages: ComposeMessage[] = parsed.data.messages;
  const currentDraft = (parsed.data.currentDraft as Itinerary | undefined | null) ?? null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        // SSE format: each event is `event: <name>\ndata: <json>\n\n`
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // controller already closed (client disconnected) — swallow
        }
      };

      try {
        for await (const ev of runAgentTurn({ messages, apiKey, currentDraft })) {
          send(ev.type, ev);
        }
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "unknown" });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    }
  });
}
