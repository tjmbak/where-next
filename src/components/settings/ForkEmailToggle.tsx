"use client";

import { useState } from "react";

type ForkEmailToggleProps = {
  initialEnabled: boolean;
};

export function ForkEmailToggle({ initialEnabled }: ForkEmailToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (saving) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ forkEmailEnabled: next })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "save-failed");
        setEnabled(!next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "save-failed");
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={saving}
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition disabled:cursor-wait ${
          enabled
            ? "border-[var(--foreground)] bg-[var(--foreground)]"
            : "border-[var(--border-strong)] bg-[var(--surface)]"
        }`}
      >
        <span
          aria-hidden
          className={`inline-block h-5 w-5 transform rounded-full transition ${
            enabled ? "translate-x-6 bg-[var(--background)]" : "translate-x-0.5 bg-[var(--foreground)]"
          }`}
        />
      </button>
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {saving ? "saving…" : enabled ? "on" : "off"}
      </span>
      {error ? (
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">
          couldn&apos;t save
        </span>
      ) : null}
    </div>
  );
}
