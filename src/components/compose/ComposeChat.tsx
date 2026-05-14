"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ComposeItineraryCardView } from "@/components/compose/ComposeItineraryCardView";
import { ComposeDestinationStrip } from "@/components/compose/ComposeDestinationStrip";
import { trackEvent } from "@/lib/analytics";
import type {
  ComposeDestinationCard,
  ComposeItineraryCard,
  ComposeMessage,
  ComposeToolResult
} from "@/lib/compose/types";

const STORAGE_KEY = "wn:compose:history:v1";
const MAX_PERSISTED = 24;

type ComposeChatProps = {
  suggestions: string[];
};

export function ComposeChat({ suggestions }: ComposeChatProps) {
  const [messages, setMessages] = useState<ComposeMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore history on mount. Deferred via queueMicrotask so we don't trigger
  // a cascading render during the mount effect (linter-enforced React pattern).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as ComposeMessage[];
        if (Array.isArray(parsed)) setMessages(parsed.slice(-MAX_PERSISTED));
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist history on every change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_PERSISTED)));
    } catch {
      /* quota or private-mode */
    }
  }, [messages]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, phaseLabel]);

  const handleSseBlock = useCallback((rawBlock: string, assistantId: string) => {
    // Each block contains lines like "event: foo" and "data: { ... }"
    let eventName = "message";
    let dataLine = "";
    for (const line of rawBlock.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLine = line.slice(5).trim();
    }
    if (!dataLine) return;

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(dataLine) as Record<string, unknown>;
    } catch {
      return;
    }

    if (eventName === "thinking") {
      setPhaseLabel("thinking…");
      return;
    }
    if (eventName === "tool_call_start") {
      const toolName = (data.name as string) ?? "tool";
      setPhaseLabel(toolLabel(toolName));
      return;
    }
    if (eventName === "tool_call_result") {
      setPhaseLabel("thinking…");
      const result = data.result as ComposeToolResult | undefined;
      if (!result) return;
      trackEvent("compose_tool_result", { kind: result.kind });
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantId
            ? { ...m, toolResults: [...(m.toolResults ?? []), result] }
            : m
        )
      );
      return;
    }
    if (eventName === "text_delta") {
      const delta = (data.delta as string) ?? "";
      if (!delta) return;
      setPhaseLabel(null);
      setMessages((current) =>
        current.map((m) =>
          m.id === assistantId ? { ...m, content: (m.content ?? "") + delta } : m
        )
      );
      return;
    }
    if (eventName === "done") {
      setPhaseLabel(null);
      return;
    }
    if (eventName === "error") {
      setError((data.message as string) ?? "error");
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || pending) return;

      setError(null);
      const userMessage: ComposeMessage = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString()
      };
      const assistantMessage: ComposeMessage = {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant",
        content: "",
        toolResults: [],
        createdAt: new Date().toISOString()
      };

      // Snapshot the conversation we're about to send (everything before the
      // empty placeholder assistant slot).
      const sendable = [...messages, userMessage];

      setMessages([...sendable, assistantMessage]);
      setDraft("");
      setPending(true);
      setPhaseLabel("thinking…");
      trackEvent("compose_send", { length: trimmed.length });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/compose/stream", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: sendable }),
          signal: controller.signal
        });

        if (!res.ok || !res.body) {
          const message = await res.text().catch(() => "request-failed");
          throw new Error(`stream-${res.status}: ${message.slice(0, 200)}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE event blocks: blank line between events.
          let blockEnd: number;
          while ((blockEnd = buffer.indexOf("\n\n")) !== -1) {
            const rawBlock = buffer.slice(0, blockEnd);
            buffer = buffer.slice(blockEnd + 2);
            handleSseBlock(rawBlock, assistantMessage.id);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          // user pressed stop — silent
        } else {
          setError(err instanceof Error ? err.message : "stream-failed");
        }
      } finally {
        setPending(false);
        setPhaseLabel(null);
        abortRef.current = null;
      }
    },
    [messages, pending, handleSseBlock]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSelectDestination = useCallback(
    (card: ComposeDestinationCard) => {
      const phrase = `let's plan around ${card.city.toLowerCase()} — ${card.matchReason || card.tagline}`;
      sendMessage(phrase);
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        ref={scrollRef}
        className="max-h-[60vh] min-h-[280px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        {messages.length === 0 ? (
          <ComposeEmptyState suggestions={suggestions} onPick={sendMessage} />
        ) : (
          <ol className="space-y-7">
            {messages.map((m) => (
              <li key={m.id} className="space-y-3">
                {m.role === "user" ? (
                  <UserBubble content={m.content} />
                ) : (
                  <AssistantBubble
                    content={m.content}
                    toolResults={m.toolResults ?? []}
                    onSelectDestination={handleSelectDestination}
                    pending={pending && m === messages[messages.length - 1]}
                    phaseLabel={phaseLabel}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {error ? (
        <p className="rounded-lg border border-[var(--signal)]/45 bg-[var(--signal)]/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--signal)]">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(draft);
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-end gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(draft);
              }
            }}
            placeholder="what kind of trip are you thinking…"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-7 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-2)]"
          />
          {pending ? (
            <button
              type="button"
              onClick={handleStop}
              className="shrink-0 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            >
              stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={draft.trim().length === 0}
              className="shrink-0 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--background)] transition hover:bg-transparent hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              send →
            </button>
          )}
        </div>

        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
          <span>enter to send · shift+enter for new line</span>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="transition hover:text-[var(--foreground)]"
            >
              clear conversation
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-md border border-[var(--border-strong)] bg-[var(--background)] px-4 py-3 text-[15px] leading-7 text-[var(--foreground)]">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  toolResults,
  onSelectDestination,
  pending,
  phaseLabel
}: {
  content: string;
  toolResults: ComposeToolResult[];
  onSelectDestination: (card: ComposeDestinationCard) => void;
  pending: boolean;
  phaseLabel: string | null;
}) {
  const showThinking = pending && content.length === 0 && toolResults.length === 0;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--signal)] font-mono text-[10px] font-bold text-[var(--background)]"
        >
          W
        </span>
        <div className="min-w-0 flex-1 text-[15px] leading-7 text-[var(--foreground)]">
          {showThinking ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--signal)]" />
              {phaseLabel ?? "thinking…"}
            </span>
          ) : content ? (
            <p className="whitespace-pre-line">{content}</p>
          ) : null}
          {pending && content.length > 0 && phaseLabel ? (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              {phaseLabel}
            </p>
          ) : null}
        </div>
      </div>

      {toolResults.map((result, idx) => {
        if (result.kind === "destinations") {
          return (
            <ComposeDestinationStrip
              key={`dests-${idx}`}
              items={result.items}
              onSelect={onSelectDestination}
            />
          );
        }
        if (result.kind === "itineraries") {
          return (
            <div key={`itins-${idx}`} className="grid gap-4 sm:grid-cols-2">
              {result.items.map((card: ComposeItineraryCard, cardIdx: number) => (
                <ComposeItineraryCardView key={cardIdx} card={card} />
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function ComposeEmptyState({
  suggestions,
  onPick
}: {
  suggestions: string[];
  onPick: (text: string) => void;
}) {
  return (
    <div className="py-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
        try one of these to start
      </p>
      <ul className="mt-4 grid gap-2">
        {suggestions.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="group block w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-left text-[14px] leading-6 text-[var(--foreground)]/85 transition hover:border-[var(--foreground)]/55 hover:text-[var(--foreground)]"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted-2)] transition group-hover:text-[var(--signal)]">
                example →
              </span>
              <span className="mt-1 block">{s}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function toolLabel(toolName: string): string {
  if (toolName === "search_destinations") return "scanning the catalog…";
  if (toolName === "suggest_itineraries") return "drafting your trip…";
  return `running ${toolName}…`;
}
