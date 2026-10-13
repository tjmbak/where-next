import { ImageResponse } from "next/og";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

function pickString(value: string | null) {
  return value ?? undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eyebrow = pickString(url.searchParams.get("eyebrow")) ?? "where next";
  const title = pickString(url.searchParams.get("title")) ?? "Where Next";
  const subtitle = pickString(url.searchParams.get("subtitle"));
  const stat = pickString(url.searchParams.get("stat"));

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: "#f7f0e1",
          color: "#2a1c12",
          fontFamily: "Plus Jakarta Sans, Inter, sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              backgroundColor: "#2a1c12",
              color: "#f7f0e1",
              fontFamily: "Geist Mono, JetBrains Mono, monospace",
              fontSize: 22,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4
            }}
          >
            W
          </div>
          <div
            style={{
              fontFamily: "Geist Mono, JetBrains Mono, monospace",
              fontSize: 14,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#7a6a59"
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 600,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              color: "#2a1c12",
              maxWidth: 1000
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 28, color: "#7a6a59", lineHeight: 1.4, maxWidth: 900 }}>{subtitle}</div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: "1px solid rgba(42, 28, 18, 0.18)"
          }}
        >
          <div
            style={{
              fontFamily: "Geist Mono, JetBrains Mono, monospace",
              fontSize: 14,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#7a6a59"
            }}
          >
            wherenext.fm
          </div>
          {stat ? (
            <div
              style={{
                fontFamily: "Geist Mono, JetBrains Mono, monospace",
                fontSize: 16,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#e8590c"
              }}
            >
              {stat}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT
    }
  );
}
