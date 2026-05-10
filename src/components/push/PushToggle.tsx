"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push/client";

type PushToggleProps = {
  initialEnabled?: boolean;
  className?: string;
};

export function PushToggle({ initialEnabled = false, className }: PushToggleProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "denied" | "unsupported" | "not-configured" | "error">(
    "idle"
  );
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!("Notification" in window) || !("PushManager" in window)) {
        setStatus("unsupported");
      } else if (Notification.permission === "denied") {
        setStatus("denied");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnable() {
    setStatus("loading");
    setMessage(null);
    const result = await subscribeToPush();
    if (result.kind === "ok") {
      setEnabled(true);
      setStatus("idle");
      setMessage("Notifications on.");
    } else if (result.kind === "denied") {
      setStatus("denied");
      setMessage("Permission denied. Re-enable in your browser to turn on alerts.");
    } else if (result.kind === "unsupported") {
      setStatus("unsupported");
      setMessage("This browser doesn't support web push.");
    } else if (result.kind === "not-configured") {
      setStatus("not-configured");
      setMessage("Push isn't configured for this environment.");
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  }

  async function handleDisable() {
    setStatus("loading");
    setMessage(null);
    await unsubscribeFromPush();
    setEnabled(false);
    setStatus("idle");
    setMessage("Notifications off.");
  }

  if (status === "unsupported") {
    return (
      <p className={className ? className : "font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-2)]"}>
        push not supported on this device
      </p>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={enabled ? handleDisable : handleEnable}
        disabled={status === "loading" || status === "denied"}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "…" : enabled ? "alerts on · turn off" : "turn on alerts"}
        <span aria-hidden>→</span>
      </button>
      {message ? (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{message}</p>
      ) : null}
    </div>
  );
}
