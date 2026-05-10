"use client";

import { useState } from "react";

type Collaborator = {
  user_id: string;
  role: string;
  email?: string | null;
};

type CollaboratorPanelProps = {
  itineraryId: string;
  isOwner: boolean;
  collaborators: Collaborator[];
};

export function CollaboratorPanel({ itineraryId, isOwner, collaborators }: CollaboratorPanelProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite() {
    setGenerating(true);
    setError(null);
    const response = await fetch(`/api/itineraries/${itineraryId}/invite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "editor" })
    });
    setGenerating(false);
    if (!response.ok) {
      setError("Could not generate invite link.");
      return;
    }
    const body = (await response.json()) as { inviteUrl: string };
    setInviteUrl(body.inviteUrl);
    try {
      await navigator.clipboard.writeText(body.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            on this trip · {collaborators.length}
          </p>
          <ul className="mt-3 flex flex-wrap items-center gap-3">
            {collaborators.map((c) => {
              const initials = (c.email ?? "?").slice(0, 2).toUpperCase();
              return (
                <li
                  key={c.user_id}
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5"
                  title={c.email ?? c.user_id}
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--foreground)] font-mono text-[9px] font-semibold text-[var(--background)]">
                    {initials}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)]">
                    {c.email ?? c.user_id.slice(0, 6)}
                  </span>
                  {c.role === "owner" ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted-2)]">owner</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {isOwner ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-dashed border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={handleInvite}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? "generating…" : "invite a friend ↗"}
          </button>
          {inviteUrl ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              {copied ? "link copied · valid 14 days" : "link valid 14 days"}
            </span>
          ) : null}
          {error ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</span>
          ) : null}
        </div>
      ) : null}

      {inviteUrl ? (
        <p className="mt-3 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
          {inviteUrl}
        </p>
      ) : null}
    </section>
  );
}
