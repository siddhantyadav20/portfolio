import { ImageResponse } from "next/og";
import { intro } from "@/content/site";

/**
 * The homepage's share card.
 *
 * Drawn rather than photographed: `ImageResponse` renders this at request time
 * (and bakes it at build time for a static route), so there is no 1200x630 PNG
 * to keep in sync with the copy. The name and tagline come from the same
 * `content/site.ts` the page reads, which is the point — a share card that
 * quietly disagrees with the page is worse than none.
 *
 * The palette is globals.css's light theme, by value: this file cannot import
 * a stylesheet, and Satori resolves no custom properties.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Siddhant Yadav — Product Designer";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#f3f3f3",
          // The homepage's own wash, flattened to two stops.
          backgroundImage:
            "linear-gradient(97deg, #ebebeb 0%, rgba(237,237,237,0.55) 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "rgba(34,34,34,0.5)",
            }}
          >
            Product Designer
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#191919",
            }}
          >
            {intro.title}
          </div>
          <div
            style={{
              fontSize: 40,
              lineHeight: 1.35,
              color: "rgba(34,34,34,0.7)",
              maxWidth: 900,
            }}
          >
            {intro.tagline}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            color: "rgba(34,34,34,0.6)",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: "#ea580b",
            }}
          />
          {intro.note.replace(/^-\s*/, "")}
        </div>
      </div>
    ),
    size,
  );
}
