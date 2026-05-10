"use client";

import { useState } from "react";

type ShareButtonsProps = {
  url: string;
  title: string;
  className?: string;
};

export function ShareButtons({ url, title, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  function track(channel: string) {
    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "destination_share", payload: { channel, url, title } }),
      keepalive: true
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      track("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore — clipboard API may be blocked
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        track("native");
      } catch {
        // user dismissed
      }
    }
  }

  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} — ${url}`)}`;

  return (
    <div className={className ?? "flex flex-wrap items-center gap-3"}>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
      >
        {copied ? "link copied" : "copy link"}
      </button>
      <button
        type="button"
        onClick={handleNativeShare}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)] sm:hidden"
      >
        share →
      </button>
      <a
        href={x}
        target="_blank"
        rel="noreferrer"
        onClick={() => track("x")}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
      >
        share on x ↗
      </a>
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        onClick={() => track("whatsapp")}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
      >
        whatsapp ↗
      </a>
    </div>
  );
}
