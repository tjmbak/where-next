"use client";

// Inline 30s artist preview: the emotion layer for event rows. Lazy — nothing
// is fetched until the first tap. Only one preview plays at a time site-wide.

import { useCallback, useEffect, useRef, useState } from "react";

type EventAudioProps = {
  artist: string;
};

type PreviewData = {
  artist: string;
  track: string;
  previewUrl: string;
};

type Status = "idle" | "loading" | "playing" | "paused" | "unavailable";

// Module-level singleton so starting one preview stops any other.
let currentAudio: HTMLAudioElement | null = null;
let currentStop: (() => void) | null = null;

export function EventAudio({ artist }: EventAudioProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<PreviewData | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setStatus((s) => (s === "playing" ? "paused" : s));
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (currentAudio === audioRef.current) {
          currentAudio = null;
          currentStop = null;
        }
        audioRef.current = null;
      }
    };
  }, []);

  const play = useCallback(
    (preview: PreviewData) => {
      // Stop whatever else is playing anywhere on the page.
      if (currentAudio && currentAudio !== audioRef.current) {
        currentAudio.pause();
        currentStop?.();
      }
      if (!audioRef.current) {
        audioRef.current = new Audio(preview.previewUrl);
        audioRef.current.addEventListener("ended", () => setStatus("paused"));
      }
      currentAudio = audioRef.current;
      currentStop = stopPlayback;
      void audioRef.current.play().then(
        () => setStatus("playing"),
        () => setStatus("unavailable")
      );
    },
    [stopPlayback]
  );

  const handleClick = useCallback(async () => {
    if (status === "playing") {
      stopPlayback();
      return;
    }
    if (data) {
      play(data);
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch(`/api/audio-preview?artist=${encodeURIComponent(artist)}`);
      if (!response.ok) {
        setStatus("unavailable");
        return;
      }
      const body = (await response.json()) as PreviewData;
      setData(body);
      play(body);
    } catch {
      setStatus("unavailable");
    }
  }, [artist, data, play, status, stopPlayback]);

  if (status === "unavailable") return null;

  const playing = status === "playing";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={playing}
      aria-label={playing ? `Pause ${artist} preview` : `Play a 30 second ${artist} preview`}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition ${
        playing
          ? "border-[var(--signal)]/60 bg-[var(--signal)]/10 text-[var(--signal)]"
          : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      <span aria-hidden className="text-[10px] leading-none">
        {status === "loading" ? "…" : playing ? "❚❚" : "▶"}
      </span>
      <span className="truncate">
        {playing && data ? `${data.track}` : `Hear ${artist}`}
      </span>
    </button>
  );
}
