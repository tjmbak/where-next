"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TripRow, TripVisibility } from "@/lib/trips";

type DestinationOption = { slug: string; label: string; region: string };

type TripEditorProps = {
  trip: TripRow;
  destinationOptions: DestinationOption[];
};

export function TripEditor({ trip, destinationOptions }: TripEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(trip.title);
  const [notes, setNotes] = useState(trip.notes ?? "");
  const [visibility, setVisibility] = useState<TripVisibility>(trip.visibility);
  const [slugs, setSlugs] = useState<string[]>(trip.destination_slugs);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return destinationOptions
      .filter((option) => !slugs.includes(option.slug))
      .filter((option) => (query ? option.label.toLowerCase().includes(query) : true))
      .slice(0, 25);
  }, [destinationOptions, slugs, searchQuery]);

  function addSlug(slug: string) {
    if (slugs.includes(slug)) return;
    setSlugs([...slugs, slug]);
  }

  function removeSlug(slug: string) {
    setSlugs(slugs.filter((item) => item !== slug));
  }

  function move(slug: string, direction: -1 | 1) {
    const index = slugs.indexOf(slug);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= slugs.length) return;
    const next = [...slugs];
    [next[index], next[target]] = [next[target], next[index]];
    setSlugs(next);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        notes: notes || undefined,
        visibility,
        destinationSlugs: slugs
      })
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not save. Please try again.");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  async function handleInvite() {
    setError(null);
    const response = await fetch(`/api/trips/${trip.id}/invite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "editor" })
    });
    if (!response.ok) {
      setError("Could not generate invite link.");
      return;
    }
    const body = (await response.json()) as { inviteUrl: string };
    setInviteUrl(body.inviteUrl);
    try {
      await navigator.clipboard.writeText(body.inviteUrl);
    } catch {
      // ignore — user can copy manually
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this trip permanently?")) return;
    const response = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
    if (response.ok) router.push("/");
  }

  return (
    <form className="space-y-10" onSubmit={(event) => { event.preventDefault(); void handleSave(); }}>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">title</span>
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[18px] tracking-[-0.01em] text-[var(--foreground)] outline-none focus:border-[var(--foreground)]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">notes (optional)</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-[14px] leading-6 outline-none focus:border-[var(--foreground)]"
          placeholder="Group notes, dates, anything worth remembering."
        />
      </label>

      <fieldset>
        <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">visibility</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["public", "unlisted", "private"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                visibility === value
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      <section>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">cities</p>
        <ol className="mt-3 space-y-2">
          {slugs.length === 0 ? (
            <li className="text-sm text-[var(--muted)]">Add cities below to start the plan.</li>
          ) : (
            slugs.map((slug, index) => {
              const option = destinationOptions.find((o) => o.slug === slug);
              return (
                <li
                  key={slug}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm text-[var(--foreground)]">{option?.label ?? slug}</span>
                  <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    <button type="button" onClick={() => move(slug, -1)} aria-label="Move up" className="px-1.5">↑</button>
                    <button type="button" onClick={() => move(slug, 1)} aria-label="Move down" className="px-1.5">↓</button>
                    <button
                      type="button"
                      onClick={() => removeSlug(slug)}
                      aria-label="Remove"
                      className="px-1.5 text-[var(--signal)]"
                    >
                      remove
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ol>

        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Add a city — search by name"
          className="mt-4 w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
        />
        {filtered.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((option) => (
              <li key={option.slug}>
                <button
                  type="button"
                  onClick={() => addSlug(option.slug)}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-left transition hover:border-[var(--border-strong)]"
                >
                  <span className="text-sm text-[var(--foreground)]">{option.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">+ add</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-6">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "saving…" : "save changes"}
            <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={handleInvite}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
          >
            invite a friend ↗
          </button>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)] transition hover:opacity-80"
        >
          delete trip
        </button>
      </footer>

      {savedAt ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          saved · {savedAt}
        </p>
      ) : null}
      {inviteUrl ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          invite copied · {inviteUrl}
        </p>
      ) : null}
      {error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</p>
      ) : null}
    </form>
  );
}
