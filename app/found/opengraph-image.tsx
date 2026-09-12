import { ImageResponse } from "next/og";
import { found } from "@/content/found";

/**
 * Found's share card: night, one line of story, and a battery at 4%.
 * Drawn, like the homepage's, so the copy can't drift from the page. Only
 * renders in a build (the dev server 500s on these — see memory).
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${found.title}: ${found.hint}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "80px 96px",
          backgroundColor: "#0a0908",
          backgroundImage: "radial-gradient(circle at 70% 20%, #2b221c 0%, #0a0908 65%)",
          color: "#f2ede6",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 640 }}>
          <div style={{ fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#ff8a3d" }}>
            A mystery in one sitting
          </div>
          <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1 }}>{found.title}</div>
          <div style={{ fontSize: 38, lineHeight: 1.35, color: "rgba(242,237,230,0.72)" }}>{found.hint}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            width: 250,
            height: 470,
            borderRadius: 44,
            border: "10px solid #1f1f21",
            backgroundColor: "#050505",
            color: "#ff453a",
            fontSize: 30,
          }}
        >
          <div style={{ display: "flex", width: 96, height: 44, border: "4px solid #555", borderRadius: 10, padding: 4 }}>
            <div style={{ width: 10, height: "100%", borderRadius: 4, backgroundColor: "#ff453a" }} />
          </div>
          4%
        </div>
      </div>
    ),
    size,
  );
}
