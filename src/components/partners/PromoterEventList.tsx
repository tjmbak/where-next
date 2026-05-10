"use client";

import { useState } from "react";
import { DESTINATIONS } from "@/data/music-travel";

type PromoterEventRow = {
  id: string;
  destination_slug: string;
  title: string;
  start_date: string;
  end_date: string | null;
  ticket_url: string | null;
  summary: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
};

type Props = {
  promoterId: string;
  initialEvents: PromoterEventRow[];
  canSubmit: boolean;
};

export function PromoterEventList({ promoterId, initialEvents, canSubmit }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [creating, setCreating] = useState(false);
  const [destinationSlug, setDestinationSlug] = useState(DESTINATIONS[0]?.slug ?? "");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/partners/promoter/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        promoterId,
        destinationSlug,
        title,
        startDate,
        endDate: endDate || null,
        ticketUrl: ticketUrl || null,
        summary: summary || null
      })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not save the event.");
      return;
    }
    const body = (await response.json()) as { event: PromoterEventRow };
    setEvents((current) => [...current, body.event]);
    setTitle("");
    setStartDate("");
    setEndDate("");
    setTicketUrl("");
    setSummary("");
    setCreating(false);
  }

  return (
    <section>
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-[var(--foreground)]">Events</h2>
        {canSubmit ? (
          <button
            type="button"
            onClick={() => setCreating((current) => !current)}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            {creating ? "cancel" : "+ submit event"}
          </button>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            account pending review
          </span>
        )}
      </header>

      {creating && canSubmit ? (
        <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">city</span>
            <select
              value={destinationSlug}
              onChange={(event) => setDestinationSlug(event.target.value)}
              className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
            >
              {DESTINATIONS.map((destination) => (
                <option key={destination.slug} value={destination.slug}>
                  {destination.city}, {destination.country}
                </option>
              ))}
            </select>
          </label>
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Event title"
            className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
            />
          </div>
          <input
            type="url"
            value={ticketUrl}
            onChange={(event) => setTicketUrl(event.target.value)}
            placeholder="Ticket URL (optional)"
            className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
          />
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            rows={3}
            placeholder="One-paragraph summary"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-[14px] outline-none focus:border-[var(--foreground)]"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--background)]"
          >
            submit for review →
          </button>
          {error ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</p>
          ) : null}
        </form>
      ) : null}

      <ol className="mt-8 divide-y divide-[var(--border)]">
        {events.length === 0 ? (
          <li className="py-6 text-[14px] text-[var(--muted)]">No events yet.</li>
        ) : (
          events.map((row) => (
            <li key={row.id} className="py-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                {row.start_date}
                {row.end_date ? ` → ${row.end_date}` : ""} · {row.destination_slug} · {row.status}
              </p>
              <h3 className="mt-1 text-lg font-medium text-[var(--foreground)]">{row.title}</h3>
              {row.summary ? <p className="mt-1 text-[14px] text-[var(--muted)]">{row.summary}</p> : null}
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
