"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BUDGET_LABELS, GENRE_LABELS, MONTHS, REGIONS } from "@/data/taxonomy";
import type { UserPreferences } from "@/lib/preferences";
import type { Budget, Genre, MonthNumber, Region } from "@/types/content";

type StepId = "scenes" | "regions" | "calendar" | "budget" | "review";

const STEPS: ReadonlyArray<{ id: StepId; title: string; subtitle: string }> = [
  {
    id: "scenes",
    title: "Pick your scenes",
    subtitle: "We tune the monthly drop and alerts around these."
  },
  {
    id: "regions",
    title: "Where do you travel?",
    subtitle: "We'll prioritize cities in these regions when we surface options."
  },
  {
    id: "calendar",
    title: "When are you free?",
    subtitle: "Months you'd actually take a trip in. Pick as many as you like."
  },
  {
    id: "budget",
    title: "Travel budget",
    subtitle: "We use this as a ceiling, not a floor. You can change it any time."
  },
  {
    id: "review",
    title: "All set",
    subtitle: "We'll send your first drop on the first of next month."
  }
] as const;

type OnboardingFlowProps = {
  initial: UserPreferences;
  email: string | null;
};

export function OnboardingFlow({ initial, email }: OnboardingFlowProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [genres, setGenres] = useState<Genre[]>(initial.genres);
  const [regions, setRegions] = useState<Region[]>(initial.regions);
  const [travelWindows, setTravelWindows] = useState<MonthNumber[]>(initial.travelWindows);
  const [budget, setBudget] = useState<Budget | null>(initial.budget);
  const [homeCity, setHomeCity] = useState<string>(initial.homeCity ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const canAdvance = useMemo(() => {
    if (step.id === "scenes") return genres.length > 0;
    if (step.id === "regions") return regions.length > 0;
    if (step.id === "calendar") return travelWindows.length > 0;
    if (step.id === "budget") return budget !== null;
    return true;
  }, [step.id, genres.length, regions.length, travelWindows.length, budget]);

  function toggle<T>(value: T, current: T[], setter: (next: T[]) => void) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const response = await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        homeCity: homeCity.trim() || null,
        genres,
        regions,
        travelWindows,
        budget
      })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSubmitting(false);
      setError(body?.error ?? "Could not save your preferences. Please try again.");
      return;
    }
    router.push("/?welcome=1");
    router.refresh();
  }

  return (
    <div className="space-y-10">
      <ol className="flex items-center gap-2">
        {STEPS.map((item, index) => (
          <li
            key={item.id}
            className={`h-1 flex-1 rounded-full transition ${
              index <= stepIndex ? "bg-[var(--foreground)]" : "bg-[var(--border)]"
            }`}
            aria-current={index === stepIndex ? "step" : undefined}
          />
        ))}
      </ol>

      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          step {stepIndex + 1} of {STEPS.length}{email ? ` · ${email}` : ""}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)]">
          {step.title}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-[var(--muted)]">{step.subtitle}</p>
      </header>

      <section className="min-h-[180px]">
        {step.id === "scenes" ? (
          <ChipPicker
            options={Object.entries(GENRE_LABELS).map(([value, label]) => ({ value: value as Genre, label }))}
            selected={genres}
            onToggle={(value) => toggle(value, genres, setGenres)}
          />
        ) : null}

        {step.id === "regions" ? (
          <div className="space-y-6">
            <ChipPicker
              options={REGIONS.map((value) => ({ value, label: value }))}
              selected={regions}
              onToggle={(value) => toggle(value, regions, setRegions)}
            />
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                home city (optional)
              </span>
              <input
                value={homeCity}
                onChange={(event) => setHomeCity(event.target.value)}
                placeholder="London"
                className="w-full max-w-md border-b border-[var(--border)] bg-transparent pb-2 text-[15px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--foreground)]"
              />
            </label>
          </div>
        ) : null}

        {step.id === "calendar" ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {MONTHS.map((month) => {
              const active = travelWindows.includes(month.value);
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => toggle(month.value, travelWindows, setTravelWindows)}
                  className={`rounded-md border px-3 py-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                    active
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {month.shortLabel}
                </button>
              );
            })}
          </div>
        ) : null}

        {step.id === "budget" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.entries(BUDGET_LABELS) as Array<[Budget, string]>).map(([value, label]) => {
              const active = budget === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBudget(value)}
                  className={`flex items-center justify-between rounded-xl border px-5 py-4 text-left transition ${
                    active
                      ? "border-[var(--foreground)] bg-[var(--surface-2)]"
                      : "border-[var(--border)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="font-medium text-[var(--foreground)] capitalize">{value}</span>
                  <span className="font-mono text-sm text-[var(--muted)]">{label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {step.id === "review" ? (
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <Summary label="scenes" value={genres.map((g) => GENRE_LABELS[g]).join(", ") || "—"} />
            <Summary label="regions" value={regions.join(", ") || "—"} />
            <Summary
              label="months you travel"
              value={
                travelWindows.length
                  ? travelWindows
                      .slice()
                      .sort((a, b) => a - b)
                      .map((m) => MONTHS[m - 1].shortLabel)
                      .join(", ")
                  : "—"
              }
            />
            <Summary label="budget" value={budget ? `${budget} ${BUDGET_LABELS[budget]}` : "—"} />
            {homeCity ? <Summary label="home city" value={homeCity} /> : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</p>
      ) : null}

      <footer className="flex items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
        <button
          type="button"
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          disabled={stepIndex === 0}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← back
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "saving…" : "finish setup"}
            <span aria-hidden>→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStepIndex((index) => Math.min(STEPS.length - 1, index + 1))}
            disabled={!canAdvance}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            continue
            <span aria-hidden>→</span>
          </button>
        )}
      </footer>
    </div>
  );
}

function ChipPicker<T extends string>({
  options,
  selected,
  onToggle
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value, label }) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
              active
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</dt>
      <dd className="text-sm leading-6 text-[var(--foreground)]">{value}</dd>
    </div>
  );
}
