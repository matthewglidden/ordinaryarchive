import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(180deg, #dff2ff 0%, #bfe3ff 28%, #d7f3d1 55%, #a6db90 100%)",
          padding: 64,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.55) 0, rgba(255, 255, 255, 0.55) 2px, transparent 2px), radial-gradient(circle at 78% 22%, rgba(255, 255, 255, 0.45) 0, rgba(255, 255, 255, 0.45) 2px, transparent 2px), radial-gradient(circle at 15% 72%, rgba(34, 197, 94, 0.12) 0, rgba(34, 197, 94, 0.12) 3px, transparent 3px)",
            backgroundSize: "46px 46px, 52px 52px, 40px 40px",
          }}
        />

        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", inset: 0 }}
        >
          <path
            d="M-40 470 C 220 420, 450 430, 720 480 C 900 510, 1040 520, 1260 470"
            fill="none"
            stroke="rgba(21, 128, 61, 0.25)"
            strokeWidth="60"
            strokeLinecap="round"
          />
          <path
            d="M-80 520 C 220 380, 480 340, 820 420"
            fill="none"
            stroke="rgba(239, 68, 68, 0.25)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M1220 110 C 980 180, 740 240, 420 200"
            fill="none"
            stroke="rgba(239, 68, 68, 0.18)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </svg>

        <div
          style={{
            position: "absolute",
            right: 64,
            top: 80,
            width: 360,
            height: 360,
            borderRadius: 36,
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(148, 163, 184, 0.6)",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            padding: 18,
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.08)",
          }}
        >
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              style={{
                width: 100,
                height: 100,
                background:
                  index % 5 === 0
                    ? "linear-gradient(135deg, #bfdbfe, #60a5fa)"
                    : "rgba(226, 232, 240, 0.8)",
                borderRadius: 12,
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              textTransform: "uppercase",
              letterSpacing: "0.35em",
              fontSize: 18,
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            Ordinary Archive
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: 640,
            }}
          >
            Immaculate Grid search
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#334155",
              maxWidth: 640,
            }}
          >
            Find past baseball grids by team, award, stat, or birthplace in seconds.
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#64748b",
            }}
          >
            Past puzzles, ordinary effort.
          </div>
        </div>
      </div>
    ),
    size
  );
}
