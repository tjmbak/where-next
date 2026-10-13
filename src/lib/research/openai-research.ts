import { z } from "zod";

/**
 * Wraps OpenAI's Responses API + hosted `web_search` tool.
 * One model only: gpt-5.5 (per project policy).
 *
 * Two helpers:
 *   - researchJSON(): grounded research with strict JSON output + citations.
 *   - researchText(): grounded research returning prose + citations (e.g. for
 *     short answers in the AI search bar).
 */

export const RESEARCH_MODEL = "gpt-5.5";

export type CitationRef = {
  title?: string;
  url: string;
  startIndex?: number;
  endIndex?: number;
};

export type ResearchUsage = {
  calls: number;
  searchCalls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
};

export type ResearchTextResult = {
  text: string;
  citations: CitationRef[];
  searchCalls: number;
  responseId: string;
  usage: ResearchUsage;
};

type Effort = "minimal" | "low" | "medium" | "high";

/**
 * Cost knobs. Each search pulls page text back in as input tokens that are
 * re-read on every later step, so the search cap is the biggest lever.
 */
export type ResearchCostOptions = {
  maxSearches?: number;
  effort?: Effort;
  searchContext?: "low" | "medium" | "high";
};

const DEFAULT_COST: Required<ResearchCostOptions> = {
  maxSearches: Number(process.env.WN_MAX_SEARCHES ?? 12),
  effort: (process.env.WN_REASONING_EFFORT as Effort | undefined) ?? "low",
  searchContext: (process.env.WN_SEARCH_CONTEXT as "low" | "medium" | "high" | undefined) ?? "low"
};

export type ResearchJSONResult<T> = ResearchTextResult & { data: T };

type ResponsesAPIRequest = {
  model: string;
  input:
    | string
    | Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }>;
  tools?: Array<{ type: "web_search"; search_context_size?: "low" | "medium" | "high" }>;
  max_output_tokens?: number;
  max_tool_calls?: number;
  reasoning?: { effort: Effort };
  text?: {
    format: {
      type: "json_schema";
      name: string;
      schema: Record<string, unknown>;
      strict: true;
    };
  };
};

type AnnotationItem = {
  type: string;
  url?: string;
  title?: string;
  start_index?: number;
  end_index?: number;
};

type ContentItem = {
  type: string;
  text?: string;
  annotations?: AnnotationItem[];
};

type OutputItem = {
  type: string;
  content?: ContentItem[];
};

type ResponsesAPIResponse = {
  id: string;
  output?: OutputItem[];
  error?: { message?: string };
  usage?: {
    input_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens?: number;
    output_tokens_details?: { reasoning_tokens?: number };
  };
};

const totals: ResearchUsage = { calls: 0, searchCalls: 0, inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 };

export function addUsage(a: ResearchUsage, b: ResearchUsage): ResearchUsage {
  return {
    calls: a.calls + b.calls,
    searchCalls: a.searchCalls + b.searchCalls,
    inputTokens: a.inputTokens + b.inputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens
  };
}

/** Running totals for this process; batch scripts print them at the end. */
export function getUsageTotals(): ResearchUsage {
  return { ...totals };
}

/**
 * Dollar estimate from WN_PRICE_INPUT / WN_PRICE_CACHED / WN_PRICE_OUTPUT (per
 * 1M tokens) and WN_PRICE_SEARCH (per 1K calls). Copy current rates from the
 * OpenAI pricing page; returns null when they aren't set.
 */
export function estimateCost(u: ResearchUsage): number | null {
  const price = (key: string) => (process.env[key] ? Number(process.env[key]) : null);
  const input = price("WN_PRICE_INPUT");
  const output = price("WN_PRICE_OUTPUT");
  const search = price("WN_PRICE_SEARCH");
  if (input === null || output === null || search === null) return null;
  const cached = price("WN_PRICE_CACHED") ?? input;
  return (
    ((u.inputTokens - u.cachedTokens) * input + u.cachedTokens * cached + u.outputTokens * output) / 1_000_000 +
    (u.searchCalls * search) / 1000
  );
}

export function formatUsage(u: ResearchUsage): string {
  const k = (n: number) => `${(n / 1000).toFixed(0)}k`;
  const cost = estimateCost(u);
  return (
    `${u.calls} calls, ${u.searchCalls} searches, ${k(u.inputTokens)} input tokens (${k(u.cachedTokens)} cached), ` +
    `${k(u.outputTokens)} output (${k(u.reasoningTokens)} reasoning)${cost === null ? "" : `, ≈ $${cost.toFixed(2)}`}`
  );
}

// Parameters the model rejected once; dropped from later requests in this process.
const unsupported = new Set<string>();

function withCost(body: ResponsesAPIRequest, opts: ResearchCostOptions = {}): ResponsesAPIRequest {
  const cost = { ...DEFAULT_COST, ...opts };
  if (!body.tools) return { ...body, reasoning: { effort: cost.effort } };
  return {
    ...body,
    reasoning: { effort: cost.effort },
    max_tool_calls: cost.maxSearches,
    tools: body.tools.map((t) => ({ ...t, search_context_size: cost.searchContext }))
  };
}

function stripUnsupported(body: ResponsesAPIRequest): ResponsesAPIRequest {
  const next = { ...body };
  if (unsupported.has("reasoning")) delete next.reasoning;
  if (unsupported.has("max_tool_calls")) delete next.max_tool_calls;
  if (unsupported.has("search_context_size")) next.tools = next.tools?.map(({ type }) => ({ type }));
  return next;
}

const ENDPOINT = "https://api.openai.com/v1/responses";

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

async function callResponses(
  body: ResponsesAPIRequest,
  timeoutMs: number
): Promise<ResponsesAPIResponse> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`
    },
    body: JSON.stringify(stripUnsupported(body)),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const json = (await response.json()) as ResponsesAPIResponse;
  if (!response.ok) {
    const msg = json?.error?.message ?? `HTTP ${response.status}`;
    const rejected = ["search_context_size", "max_tool_calls", "reasoning"].find(
      (param) => !unsupported.has(param) && response.status === 400 && msg.includes(param)
    );
    if (rejected) {
      unsupported.add(rejected);
      process.stderr?.write?.(`   [openai] ${RESEARCH_MODEL} rejected "${rejected}", retrying without it\n`);
      return callResponses(body, timeoutMs);
    }
    throw new Error(`Responses API error: ${msg}`);
  }
  return json;
}

function recordUsage(json: ResponsesAPIResponse, searchCalls: number): ResearchUsage {
  const usage: ResearchUsage = {
    calls: 1,
    searchCalls,
    inputTokens: json.usage?.input_tokens ?? 0,
    cachedTokens: json.usage?.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
    reasoningTokens: json.usage?.output_tokens_details?.reasoning_tokens ?? 0
  };
  Object.assign(totals, addUsage(totals, usage));
  return usage;
}

/**
 * Tiny no-search call that fails fast when the key is invalid or the account
 * has no credits, so batch runs abort before planning hundreds of tasks.
 */
export async function assertResearchCredits(): Promise<void> {
  try {
    await callResponses({ model: RESEARCH_MODEL, input: "Reply with: ok", max_output_tokens: 16 }, 30_000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/no credits|insufficient_quota|billing|quota/i.test(msg)) {
      throw new Error(`OpenAI account is out of credits — top up at https://platform.openai.com/settings/organization/billing and re-run. (${msg})`);
    }
    throw err;
  }
}

function extractFinalMessage(json: ResponsesAPIResponse): {
  text: string;
  annotations: AnnotationItem[];
  searchCalls: number;
} {
  const items = json.output ?? [];
  const searchCalls = items.filter((i) => i.type === "web_search_call").length;

  const messages = items.filter((i) => i.type === "message");
  const last = messages[messages.length - 1];
  if (!last) throw new Error("Responses API returned no assistant message");

  const textPart = (last.content ?? []).find((c) => c.type === "output_text");
  if (!textPart || typeof textPart.text !== "string") {
    throw new Error("Responses API message had no output_text");
  }

  return {
    text: textPart.text,
    annotations: textPart.annotations ?? [],
    searchCalls
  };
}

function annotationsToCitations(annotations: AnnotationItem[]): CitationRef[] {
  return annotations
    .filter((a) => a.type === "url_citation" && typeof a.url === "string")
    .map((a) => ({
      url: a.url as string,
      title: a.title,
      startIndex: a.start_index,
      endIndex: a.end_index
    }));
}

export async function researchText(opts: {
  systemPrompt: string;
  userPrompt: string;
  webSearch?: boolean;
  timeoutMs?: number;
  cost?: ResearchCostOptions;
}): Promise<ResearchTextResult> {
  const json = await callResponses(
    withCost({
      model: RESEARCH_MODEL,
      input: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt }
      ],
      tools: opts.webSearch === false ? undefined : [{ type: "web_search" }]
    }, opts.cost),
    opts.timeoutMs ?? 120_000
  );

  const { text, annotations, searchCalls } = extractFinalMessage(json);
  return {
    text,
    citations: annotationsToCitations(annotations),
    searchCalls,
    responseId: json.id,
    usage: recordUsage(json, searchCalls)
  };
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
  const match = trimmed.match(fence);
  return match ? match[1].trim() : trimmed;
}

export async function researchJSON<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  webSearch?: boolean;
  timeoutMs?: number;
  cost?: ResearchCostOptions;
}): Promise<ResearchJSONResult<T>> {
  const jsonSchema = z.toJSONSchema(opts.schema, { target: "draft-7" });
  enforceStrictSchema(jsonSchema);

  const json = await callResponses(
    withCost({
      model: RESEARCH_MODEL,
      input: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt }
      ],
      tools: opts.webSearch === false ? undefined : [{ type: "web_search" }],
      text: {
        format: {
          type: "json_schema",
          name: opts.schemaName,
          schema: jsonSchema as Record<string, unknown>,
          strict: true
        }
      }
    }, opts.cost),
    opts.timeoutMs ?? 180_000
  );

  const { text, annotations, searchCalls } = extractFinalMessage(json);
  const usage = recordUsage(json, searchCalls);
  const cleaned = stripCodeFence(text);

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Model returned invalid JSON: ${cleaned.slice(0, 300)}${
        err instanceof Error ? ` (${err.message})` : ""
      }`
    );
  }

  const data = opts.schema.parse(parsedRaw);
  return {
    data,
    text: cleaned,
    citations: annotationsToCitations(annotations),
    searchCalls,
    responseId: json.id,
    usage
  };
}

/**
 * OpenAI's strict JSON-schema mode requires every object to set
 * `additionalProperties: false` and list every property in `required`.
 * zod's `toJSONSchema` is close but not always compliant, so we walk the
 * generated schema and tighten it.
 */
function enforceStrictSchema(node: unknown): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  if (obj.type === "object" && obj.properties && typeof obj.properties === "object") {
    obj.additionalProperties = false;
    obj.required = Object.keys(obj.properties as Record<string, unknown>);
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) enforceStrictSchema(item);
    } else if (value && typeof value === "object") {
      enforceStrictSchema(value);
    }
  }
}
