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

export type ResearchTextResult = {
  text: string;
  citations: CitationRef[];
  searchCalls: number;
  responseId: string;
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
  tools?: Array<{ type: "web_search" }>;
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
};

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
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const json = (await response.json()) as ResponsesAPIResponse;
  if (!response.ok) {
    const msg = json?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Responses API error: ${msg}`);
  }
  return json;
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
}): Promise<ResearchTextResult> {
  const json = await callResponses(
    {
      model: RESEARCH_MODEL,
      input: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt }
      ],
      tools: opts.webSearch === false ? undefined : [{ type: "web_search" }]
    },
    opts.timeoutMs ?? 120_000
  );

  const { text, annotations, searchCalls } = extractFinalMessage(json);
  return {
    text,
    citations: annotationsToCitations(annotations),
    searchCalls,
    responseId: json.id
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
}): Promise<ResearchJSONResult<T>> {
  const jsonSchema = z.toJSONSchema(opts.schema, { target: "draft-7" });
  enforceStrictSchema(jsonSchema);

  const json = await callResponses(
    {
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
    },
    opts.timeoutMs ?? 180_000
  );

  const { text, annotations, searchCalls } = extractFinalMessage(json);
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
    responseId: json.id
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
