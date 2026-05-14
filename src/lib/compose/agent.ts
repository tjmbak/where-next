import { COMPOSE_TOOLS, destinationsCatalogSnippet, dispatchTool } from "@/lib/compose/tools";
import type { ComposeMessage, ComposeToolResult } from "@/lib/compose/types";

const MODEL = "gpt-4o-mini";

function systemPrompt(): string {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const currentYear = today.getUTCFullYear();
  const nextYear = currentYear + 1;
  return `You are the Where Next Composer — a music-travel trip designer that helps
travelers go from "I have some days off" to a curated, booked-ready itinerary.

You're conversational, decisive, and editorial. Short sentences. No hedging,
no walls of text. You talk like a friend who knows the scene, not a chatbot.

TODAY IS ${todayIso}. Always plan for ${currentYear} or ${nextYear}. NEVER
use past years (e.g. 2023) when filling startDate, even if you've seen those
dates in training data. If the user says "late September", pick a Thursday
in September ${currentYear} if it's still in the future; otherwise September
${nextYear}. Same logic for every month they mention.

GROUND TRUTH:
- You can only recommend cities that are in the Where Next catalog below.
  If the user asks about somewhere not in the catalog, say so and suggest
  the closest match.
- All event/venue/cost details come from the tools — never invent them.
- Tools available: search_destinations, suggest_itineraries.

WHEN YOU CALL search_destinations, YOU MUST PASS EVERY FILTER THE USER GAVE
YOU. If the user said "in Europe", pass regions:["Europe"]. If they said
"underground", pass vibes:["underground"]. If they said "cheap" or "low
budget", pass budget:"low". Missing a filter that the user explicitly stated
is the #1 failure mode — don't do it.

YOUR WORKFLOW:
1. If the user is vague about a city, call search_destinations FIRST with
   EVERY filter they gave you (region/vibe/budget/genre/month). Present
   3-5 matches as short prose ("Three shapes that fit:") and ask which
   they want to plan around. DO NOT skip this step just to be helpful.
2. Once you and the user have settled on a city + duration + (ideally) dates,
   call suggest_itineraries. Pass ONE plan unless the user explicitly asked
   to compare options or you're showing genuinely different cities.
3. After tool results render, your follow-up message should be short:
   acknowledge what you generated and invite the next action ("Tap save to
   keep it, or tell me what to swap.").

INPUTS YOU SHOULD CARE ABOUT:
- Vibe (underground/festival/beach/intimate/etc.) — this is the most
  important signal. If the user only said "trip ideas", ASK before guessing.
- Duration — only 3, 4, 5, 7, 10, or 14 days. Default to 5 if unclear.
- Dates — anchor to a Thursday in the user's month, in ${currentYear} or
  ${nextYear}, NEVER a past year.
- Budget — low / medium / high / luxury. Default medium if unclear.
- Home airport — if mentioned, remember it (used in subsequent suggestions).

RESPONSE LENGTH:
- Conversational replies: 1-3 short sentences.
- After tool calls: a single line acknowledging the result + a question or
  CTA. The cards do the heavy lifting visually.

DESTINATIONS CATALOG (slug → city/country/region/budget/genres/vibes/peak):
${destinationsCatalogSnippet()}
`;
}

type ChatCompletionTool = (typeof COMPOSE_TOOLS)[number];

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type OpenAIChoice = {
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: OpenAIToolCall[];
  };
  finish_reason: string;
};

type OpenAIResponse = {
  choices: OpenAIChoice[];
};

export type AgentEvent =
  | { type: "thinking" }
  | { type: "tool_call_start"; name: string }
  | { type: "tool_call_result"; result: ComposeToolResult }
  | { type: "text_delta"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type AgentTurnInput = {
  messages: ComposeMessage[];
  apiKey: string;
};

/**
 * Runs a single agent turn:
 *   1. POST chat with tools (non-streaming).
 *   2. If the model returned tool_calls, execute them locally, push results,
 *      then call POST chat again WITH streaming=true so the wrap-up message
 *      streams to the client.
 *   3. If no tool calls, stream a single completion immediately.
 *
 * The returned async generator yields AgentEvents the API route serializes
 * to SSE.
 */
export async function* runAgentTurn(input: AgentTurnInput): AsyncGenerator<AgentEvent> {
  const conversation: ChatMessage[] = [
    { role: "system", content: systemPrompt() },
    ...input.messages.map<ChatMessage>((m) => ({ role: m.role, content: m.content }))
  ];

  yield { type: "thinking" };

  let phase1: OpenAIResponse;
  try {
    phase1 = await callChat({
      apiKey: input.apiKey,
      messages: conversation,
      tools: COMPOSE_TOOLS,
      stream: false
    }) as OpenAIResponse;
  } catch (err) {
    yield { type: "error", message: errString(err) };
    yield { type: "done" };
    return;
  }

  const choice = phase1.choices[0];
  if (!choice) {
    yield { type: "error", message: "no response" };
    yield { type: "done" };
    return;
  }

  const toolCalls = choice.message.tool_calls ?? [];

  // No tool calls → stream the text reply directly.
  if (toolCalls.length === 0) {
    if (choice.message.content) {
      // Single shot — we already have the text; stream it in word chunks
      // so the UI feels alive. (Phase 1 was non-streaming.)
      for await (const delta of fauxStream(choice.message.content)) {
        yield { type: "text_delta", delta };
      }
    }
    yield { type: "done" };
    return;
  }

  // Execute tool calls. Push the assistant message + tool results into history.
  conversation.push({
    role: "assistant",
    content: choice.message.content ?? "",
    tool_calls: toolCalls
  });

  for (const call of toolCalls) {
    yield { type: "tool_call_start", name: call.function.name };
    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(call.function.arguments || "{}");
    } catch {
      parsedArgs = {};
    }
    const result = await dispatchTool(call.function.name, parsedArgs);

    if (result.kind === "error") {
      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify({ ok: false, error: result.message })
      });
      continue;
    }

    yield { type: "tool_call_result", result };
    conversation.push({
      role: "tool",
      tool_call_id: call.id,
      content: serializeToolResultForLLM(result)
    });
  }

  // Phase 2: streaming wrap-up. No tools second round (force a text reply).
  try {
    yield* streamChatCompletion({
      apiKey: input.apiKey,
      messages: conversation
    });
  } catch (err) {
    yield { type: "error", message: errString(err) };
  }
  yield { type: "done" };
}

// ---------------------------------------------------------------------------
// OpenAI helpers
// ---------------------------------------------------------------------------

async function callChat(args: {
  apiKey: string;
  messages: ChatMessage[];
  tools?: ChatCompletionTool[];
  stream: boolean;
}): Promise<unknown> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: args.messages,
      tools: args.tools,
      stream: args.stream
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`openai ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function* streamChatCompletion(args: {
  apiKey: string;
  messages: ChatMessage[];
}): AsyncGenerator<AgentEvent> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: args.messages,
      stream: true
    })
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`openai stream ${res.status}: ${text.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let lineEnd: number;
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const event = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = event.choices?.[0]?.delta?.content;
        if (delta) yield { type: "text_delta", delta };
      } catch {
        // ignore malformed lines
      }
    }
  }
}

async function* fauxStream(text: string): AsyncGenerator<string> {
  const chunks = text.match(/\S+\s*/g) ?? [text];
  for (const chunk of chunks) {
    yield chunk;
    await new Promise((r) => setTimeout(r, 18));
  }
}

function serializeToolResultForLLM(result: ComposeToolResult): string {
  if (result.kind === "destinations") {
    return JSON.stringify({
      ok: true,
      kind: "destinations",
      items: result.items.map((it) => ({
        slug: it.slug,
        city: it.city,
        country: it.country,
        region: it.region,
        budget: it.budget,
        matchReason: it.matchReason
      }))
    });
  }
  if (result.kind === "itineraries") {
    return JSON.stringify({
      ok: true,
      kind: "itineraries",
      items: result.items.map((it) => ({
        city: it.city,
        country: it.country,
        durationDays: it.durationDays,
        vibeSummary: it.vibeSummary,
        startDate: it.startDate,
        endDate: it.endDate,
        totalLow: it.totalLow,
        totalHigh: it.totalHigh,
        firstDayAnchor: it.itinerary.days[0]?.anchorTitle ?? null
      }))
    });
  }
  return JSON.stringify({ ok: false });
}

function errString(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
