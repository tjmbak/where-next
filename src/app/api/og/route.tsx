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
          backgroundColor: "#0a0a0a",
          color: "#ededeb",
          fontFamily: "Inter, sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              backgroundColor: "#ededeb",
              color: "#0a0a0a",
              fontFamily: "JetBrains Mono, monospace",
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
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 14,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#888"
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 88,
              fontWeight: 500,
              lineHeight: 1.0,
              letterSpacing: "-0.03em",
              color: "#ededeb",
              maxWidth: 1000
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 28, color: "#a3a3a0", lineHeight: 1.4, maxWidth: 900 }}>{subtitle}</div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: "1px solid #2a2a2a"
          }}
        >
          <div
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 14,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#888"
            }}
          >
            wherenext.fm
          </div>
          {stat ? (
            <div
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 16,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#ededeb"
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
