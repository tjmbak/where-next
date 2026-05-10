"use client";

import type { Budget, DiscoveryFilters as DiscoveryFiltersValue, Genre, Region, Vibe } from "@/types/content";
import { BUDGET_LABELS, GENRE_LABELS, REGIONS, VIBE_LABELS } from "@/data/taxonomy";

type DiscoveryFiltersProps = {
  value: DiscoveryFiltersValue;
  onChange: (value: DiscoveryFiltersValue) => void;
};

const genres = Object.keys(GENRE_LABELS) as Genre[];
const vibes = Object.keys(VIBE_LABELS) as Vibe[];
const budgets = Object.keys(BUDGET_LABELS) as Budget[];

export function DiscoveryFilters({ value, onChange }: DiscoveryFiltersProps) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-[var(--border)] py-5 sm:grid-cols-2 lg:grid-cols-4">
      <FilterRow
        label="genre"
        value={value.genre ?? "all"}
        onChange={(genre) => onChange({ ...value, genre: genre as Genre | "all" })}
        options={[
          { label: "all", value: "all" },
          ...genres.map((genre) => ({ label: GENRE_LABELS[genre], value: genre }))
        ]}
      />
      <FilterRow
        label="vibe"
        value={value.vibe ?? "all"}
        onChange={(vibe) => onChange({ ...value, vibe: vibe as Vibe | "all" })}
        options={[
          { label: "all", value: "all" },
          ...vibes.map((vibe) => ({ label: VIBE_LABELS[vibe], value: vibe }))
        ]}
      />
      <FilterRow
        label="budget"
        value={value.budget ?? "all"}
        onChange={(budget) => onChange({ ...value, budget: budget as Budget | "all" })}
        options={[
          { label: "any", value: "all" },
          ...budgets.map((budget) => ({ label: `${BUDGET_LABELS[budget]} ${budget}`, value: budget }))
        ]}
      />
      <FilterRow
        label="region"
        value={value.region ?? "all"}
        onChange={(region) => onChange({ ...value, region: region as Region | "all" })}
        options={[
          { label: "all", value: "all" },
          ...REGIONS.map((region) => ({ label: region, value: region }))
        ]}
      />
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="group flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</span>
      <span className="relative flex items-center">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none border-b border-[var(--border)] bg-transparent pb-1.5 pr-6 text-[15px] font-medium text-[var(--foreground)] outline-none transition hover:border-[var(--foreground)] focus:border-[var(--foreground)]"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-[var(--surface)] text-[var(--foreground)]"
            >
              {option.label}
            </option>
          ))}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-0 font-mono text-[10px] text-[var(--muted)]">
          ▾
        </span>
      </span>
    </label>
  );
}
