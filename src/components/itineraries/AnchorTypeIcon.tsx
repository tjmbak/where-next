import type { CSSProperties } from "react";

type AnchorIconKind =
  | "festival"
  | "club-night"
  | "residency"
  | "beach-club"
  | "concert"
  | "carnival"
  | "conference"
  | "venue"
  | "free";

type AnchorTypeIconProps = {
  kind: AnchorIconKind;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function AnchorTypeIcon({ kind, size = 22, className, style }: AnchorTypeIconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
    style
  };

  switch (kind) {
    case "festival":
      // Festival flag on a pole
      return (
        <svg {...props}>
          <line x1="6" y1="3" x2="6" y2="21" />
          <path d="M6 5 L18 7 L13 11 L18 15 L6 13" />
          <circle cx="6" cy="3" r="0.7" fill="currentColor" />
        </svg>
      );
    case "club-night":
      // Club door / arch with disco glint
      return (
        <svg {...props}>
          <path d="M5 21V12a7 7 0 0 1 14 0v9" />
          <line x1="5" y1="21" x2="19" y2="21" />
          <circle cx="12" cy="11" r="1" fill="currentColor" />
          <line x1="9" y1="8" x2="9.5" y2="8.5" />
          <line x1="15" y1="8" x2="14.5" y2="8.5" />
        </svg>
      );
    case "residency":
      // Repeating arrows
      return (
        <svg {...props}>
          <path d="M4 8h12l-3-3" />
          <path d="M20 16H8l3 3" />
        </svg>
      );
    case "beach-club":
      // Sun + wave + parasol
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="3" />
          <path d="M3 18 Q 7 14 11 18 T 19 18 T 23 18" />
          <line x1="8" y1="3" x2="8" y2="4" />
          <line x1="14" y1="6" x2="13" y2="7" />
        </svg>
      );
    case "concert":
      // Speaker / mic
      return (
        <svg {...props}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <line x1="12" y1="14" x2="12" y2="20" />
          <line x1="8" y1="20" x2="16" y2="20" />
          <path d="M6 11a6 6 0 0 0 12 0" />
        </svg>
      );
    case "carnival":
      // Mask
      return (
        <svg {...props}>
          <path d="M3 9 Q 12 3 21 9 V 13 Q 12 21 3 13 Z" />
          <circle cx="9" cy="11" r="1.5" fill="currentColor" />
          <circle cx="15" cy="11" r="1.5" fill="currentColor" />
        </svg>
      );
    case "conference":
      // Podium / lecture
      return (
        <svg {...props}>
          <rect x="5" y="14" width="14" height="6" rx="1" />
          <line x1="9" y1="14" x2="9" y2="6" />
          <line x1="15" y1="14" x2="15" y2="6" />
          <path d="M8 6h8" />
          <circle cx="12" cy="3" r="0.8" fill="currentColor" />
        </svg>
      );
    case "venue":
      // Pin / building
      return (
        <svg {...props}>
          <path d="M12 21s7-7.4 7-12a7 7 0 0 0-14 0c0 4.6 7 12 7 12z" />
          <circle cx="12" cy="9" r="2.4" />
        </svg>
      );
    case "free":
      // Sun / open
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="3" x2="12" y2="5" />
          <line x1="12" y1="19" x2="12" y2="21" />
          <line x1="3" y1="12" x2="5" y2="12" />
          <line x1="19" y1="12" x2="21" y2="12" />
          <line x1="5.5" y1="5.5" x2="6.8" y2="6.8" />
          <line x1="17.2" y1="17.2" x2="18.5" y2="18.5" />
          <line x1="5.5" y1="18.5" x2="6.8" y2="17.2" />
          <line x1="17.2" y1="6.8" x2="18.5" y2="5.5" />
        </svg>
      );
  }
}

export function anchorIconKindFor(args: {
  kind: "event" | "venue" | "free";
  type?: string;
}): AnchorIconKind {
  if (args.kind === "free") return "free";
  if (args.kind === "venue") return "venue";
  const t = args.type ?? "concert";
  if (t === "festival") return "festival";
  if (t === "club-night") return "club-night";
  if (t === "residency") return "residency";
  if (t === "beach-club") return "beach-club";
  if (t === "concert") return "concert";
  if (t === "carnival") return "carnival";
  if (t === "conference") return "conference";
  return "concert";
}

// Tone palette per anchor kind — used as a subtle gradient wash on day cards.
// Stays restrained so cards still feel editorial, not video-game.
export function gradientTokensFor(kind: AnchorIconKind): { from: string; via: string; to: string } {
  switch (kind) {
    case "festival":
      return { from: "rgba(255,139,61,0.12)", via: "rgba(255,139,61,0.04)", to: "transparent" };
    case "club-night":
      return { from: "rgba(120,108,220,0.14)", via: "rgba(120,108,220,0.04)", to: "transparent" };
    case "residency":
      return { from: "rgba(150,120,200,0.10)", via: "rgba(150,120,200,0.03)", to: "transparent" };
    case "beach-club":
      return { from: "rgba(255,180,90,0.12)", via: "rgba(255,180,90,0.04)", to: "transparent" };
    case "concert":
      return { from: "rgba(80,180,210,0.12)", via: "rgba(80,180,210,0.03)", to: "transparent" };
    case "carnival":
      return { from: "rgba(220,90,140,0.12)", via: "rgba(220,90,140,0.03)", to: "transparent" };
    case "conference":
      return { from: "rgba(110,140,170,0.10)", via: "rgba(110,140,170,0.03)", to: "transparent" };
    case "venue":
      return { from: "rgba(140,160,200,0.10)", via: "rgba(140,160,200,0.03)", to: "transparent" };
    case "free":
      return { from: "rgba(180,180,180,0.07)", via: "rgba(180,180,180,0.02)", to: "transparent" };
  }
}
