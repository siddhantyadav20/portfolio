import { ImageResponse } from "next/og";

/**
 * The iOS home-screen icon.
 *
 * Same monogram as `icon.tsx`, at the size iOS actually asks for, and without
 * a corner radius — iOS applies its own mask and a radius here would show as a
 * dark ring inside it.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 120,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
