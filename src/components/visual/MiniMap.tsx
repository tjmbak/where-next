import { useId, type CSSProperties } from "react";

type Dot = {
  lat: number;
  lng: number;
  label?: string;
  size?: "regular" | "peak";
};

type MiniMapProps = {
  dots: Dot[];
  size?: number;
  // When true, draw faint great-circle arcs connecting consecutive dots
  // (for itinerary days or drop picks). The first dot connects to second,
  // second to third, etc.
  connect?: boolean;
  // Optional alternate origin to draw a single arc to the first dot (e.g.
  // user's home city → destination).
  origin?: { lat: number; lng: number; label?: string } | null;
  className?: string;
  style?: CSSProperties;
};

// Equirectangular projection onto a square. We then clip to a circle via
// SVG to imply a "globe disc" without pretending it's an orthographic
// projection — the visual contract is "geographic position, stylized."
function projectXY(lat: number, lng: number, size: number) {
  const x = ((lng + 180) / 360) * size;
  const y = ((90 - lat) / 180) * size;
  return { x, y };
}

function arcPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // Curve magnitude: shallow for short hops, dramatic for long
  const curl = Math.min(dist * 0.45, 32);
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2 - curl;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

export function MiniMap({
  dots,
  size = 64,
  connect = false,
  origin = null,
  className,
  style
}: MiniMapProps) {
  const projectedDots = dots.map((d) => ({
    ...d,
    ...projectXY(d.lat, d.lng, size)
  }));
  const projectedOrigin = origin ? { ...origin, ...projectXY(origin.lat, origin.lng, size) } : null;

  // Small offset so the disc has a hairline border inside the SVG bounds
  const radius = size / 2 - 0.5;
  const cx = size / 2;
  const cy = size / 2;
  const reactId = useId().replace(/:/g, "");
  const clipId = `mm-clip-${reactId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={style}
      aria-hidden
      role="presentation"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={radius} />
        </clipPath>
        <radialGradient id={`${clipId}-bg`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="rgba(255,139,61,0.06)" />
          <stop offset="100%" stopColor="rgba(8,8,10,0.0)" />
        </radialGradient>
      </defs>

      {/* Disc */}
      <circle cx={cx} cy={cy} r={radius} fill="rgba(8,8,10,0.6)" />
      <circle cx={cx} cy={cy} r={radius} fill={`url(#${clipId}-bg)`} />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="rgba(237,237,235,0.15)"
        strokeWidth={0.6}
      />

      {/* Latitude/longitude grid (clipped to disc) */}
      <g clipPath={`url(#${clipId})`} stroke="rgba(237,237,235,0.08)" strokeWidth={0.5} fill="none">
        {/* Equator */}
        <line x1={0} y1={cy} x2={size} y2={cy} />
        {/* Tropics-ish */}
        <line x1={0} y1={cy * 0.6} x2={size} y2={cy * 0.6} />
        <line x1={0} y1={cy * 1.4} x2={size} y2={cy * 1.4} />
        {/* Meridians */}
        <line x1={cx} y1={0} x2={cx} y2={size} />
        <line x1={cx * 0.5} y1={0} x2={cx * 0.5} y2={size} />
        <line x1={cx * 1.5} y1={0} x2={cx * 1.5} y2={size} />
      </g>

      {/* Origin → first-dot arc */}
      {projectedOrigin && projectedDots[0] ? (
        <g clipPath={`url(#${clipId})`}>
          <path
            d={arcPath(projectedOrigin, projectedDots[0])}
            stroke="rgba(255,139,61,0.55)"
            strokeWidth={0.8}
            strokeLinecap="round"
            strokeDasharray="2 2"
            fill="none"
          />
          <circle cx={projectedOrigin.x} cy={projectedOrigin.y} r={1.4} fill="rgba(237,237,235,0.7)" />
        </g>
      ) : null}

      {/* Connecting arcs between dots */}
      {connect && projectedDots.length >= 2 ? (
        <g clipPath={`url(#${clipId})`}>
          {projectedDots.slice(0, -1).map((from, i) => {
            const to = projectedDots[i + 1];
            return (
              <path
                key={`${i}-arc`}
                d={arcPath(from, to)}
                stroke="rgba(255,139,61,0.45)"
                strokeWidth={0.7}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </g>
      ) : null}

      {/* Dots */}
      <g clipPath={`url(#${clipId})`}>
        {projectedDots.map((dot, i) => {
          const isPeak = dot.size === "peak";
          const r = isPeak ? 2.6 : 2;
          return (
            <g key={`${i}-dot`}>
              <circle
                cx={dot.x}
                cy={dot.y}
                r={r * 2.6}
                fill="rgba(255,139,61,0.18)"
              >
                <animate
                  attributeName="r"
                  values={`${r * 1.6};${r * 3};${r * 1.6}`}
                  dur="2.6s"
                  repeatCount="indefinite"
                  begin={`${i * 0.4}s`}
                />
                <animate
                  attributeName="opacity"
                  values="0.55;0;0.55"
                  dur="2.6s"
                  repeatCount="indefinite"
                  begin={`${i * 0.4}s`}
                />
              </circle>
              <circle
                cx={dot.x}
                cy={dot.y}
                r={r}
                fill="#ff8b3d"
                stroke="rgba(8,8,10,0.95)"
                strokeWidth={0.6}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
