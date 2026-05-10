"use client";

import { useState } from "react";

type PollOption = { id: string; label: string };
type PollData = {
  id: string;
  question: string;
  options: PollOption[];
  counts: Record<string, number>;
};

type TripPollsProps = {
  tripId: string;
  polls: PollData[];
  isOwner: boolean;
  isAuthenticated: boolean;
};

export function TripPolls({ tripId, polls: initialPolls, isOwner, isAuthenticated }: TripPollsProps) {
  const [polls, setPolls] = useState(initialPolls);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  async function handleVote(pollId: string, optionId: string) {
    setPendingVote(pollId + optionId);
    const response = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ optionId })
    });
    if (response.ok) {
      setPolls((current) =>
        current.map((poll) =>
          poll.id === pollId
            ? {
                ...poll,
                counts: { ...poll.counts, [optionId]: (poll.counts[optionId] ?? 0) + 1 }
              }
            : poll
        )
      );
    }
    setPendingVote(null);
  }

  async function handleCreatePoll(event: React.FormEvent) {
    event.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 2 || cleanOptions.length < 2) return;
    const response = await fetch(`/api/trips/${tripId}/polls`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: question.trim(), options: cleanOptions })
    });
    if (response.ok) {
      const body = (await response.json()) as { poll: { id: string } };
      setPolls((current) => [
        ...current,
        {
          id: body.poll.id,
          question: question.trim(),
          options: cleanOptions.map((label, index) => ({ id: `opt-${index + 1}`, label })),
          counts: {}
        }
      ]);
      setQuestion("");
      setOptions(["", ""]);
      setCreating(false);
    }
  }

  if (polls.length === 0 && !isOwner) return null;

  return (
    <section className="mt-16">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">decide together</p>
      <h2 className="mt-3 text-2xl font-medium tracking-[-0.01em] text-[var(--foreground)]">Polls</h2>

      <ol className="mt-6 space-y-8">
        {polls.map((poll) => {
          const total = Object.values(poll.counts).reduce((sum, n) => sum + n, 0);
          return (
            <li key={poll.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-[15px] font-medium leading-6 text-[var(--foreground)]">{poll.question}</p>
              <ul className="mt-4 space-y-2">
                {poll.options.map((option) => {
                  const count = poll.counts[option.id] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const disabled = pendingVote === poll.id + option.id || !isAuthenticated;
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => handleVote(poll.id, option.id)}
                        className="group flex w-full items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-left transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed"
                      >
                        <span className="text-sm text-[var(--foreground)]">{option.label}</span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {count} · {pct}%
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {!isAuthenticated ? (
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                  sign in to vote
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {isOwner ? (
        <div className="mt-6">
          {creating ? (
            <form
              onSubmit={handleCreatePoll}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
            >
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Which weekend?"
                className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[15px] outline-none focus:border-[var(--foreground)]"
              />
              <div className="space-y-2">
                {options.map((option, index) => (
                  <input
                    key={index}
                    value={option}
                    onChange={(event) =>
                      setOptions((current) => current.map((o, i) => (i === index ? event.target.value : o)))
                    }
                    placeholder={`Option ${index + 1}`}
                    className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOptions((current) => [...current, ""])}
                  disabled={options.length >= 8}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-40"
                >
                  + add option
                </button>
                <button
                  type="submit"
                  className="ml-auto inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--background)]"
                >
                  create poll →
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]"
                >
                  cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
            >
              + add a poll
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
