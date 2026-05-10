"use client";

import { useState } from "react";

type PendingEventActionsProps = { id: string };

export function PendingEventActions({ id }: PendingEventActionsProps) {
  const [status, setStatus] = useState<"idle" | "approved" | "rejected">("idle");
  const [pending, setPending] = useState(false);

  async function handleAction(decision: "approved" | "rejected") {
    setPending(true);
    const response = await fetch(`/api/admin/ingest/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-token": getAdminToken() },
      body: JSON.stringify({ decision })
    });
    setPending(false);
    if (response.ok) setStatus(decision);
  }

  if (status !== "idle") {
    return (
      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
        {status === "approved" ? "approved" : "rejected"}
      </p>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={() => handleAction("approved")}
        disabled={pending}
        className="rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--background)] transition disabled:opacity-50"
      >
        approve
      </button>
      <button
        type="button"
        onClick={() => handleAction("rejected")}
        disabled={pending}
        className="rounded-full border border-[var(--border-strong)] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition disabled:opacity-50"
      >
        reject
      </button>
    </div>
  );
}

function getAdminToken(): string {
  if (typeof window === "undefined") return "";
  const fromStorage = window.localStorage.getItem("wn:admin-token");
  if (fromStorage) return fromStorage;
  const prompted = window.prompt("Admin token (will be saved to localStorage)");
  if (prompted) {
    window.localStorage.setItem("wn:admin-token", prompted);
    return prompted;
  }
  return "";
}
