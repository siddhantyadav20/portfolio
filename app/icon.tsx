import { ImageResponse } from "next/og";

/**
 * The tab icon.
 *
 * Only a legacy `favicon.ico` existed, which modern browsers use but Android
 * home screens and high-DPI tabs do not. Generated rather than exported so it
 * cannot drift from the accent in globals.css, and so there is no binary to
 * regenerate when the mark changes.
 *
 * The glyph is the "SY" monogram reduced to what survives at 32px: one letter.
 */

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#191919",
          color: "#f3f3f3",
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
