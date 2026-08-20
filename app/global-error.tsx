"use client";

import { useEffect } from "react";

/**
 * The last resort: a throw in the root layout itself.
 *
 * This boundary *replaces* the whole document, so it has to render its own
 * `<html>` and `<body>` — and it cannot rely on globals.css, the theme script
 * or the fonts, since the layout that loads them is what failed. Everything
 * here is therefore inline and deliberately plain.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[app] root layout error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 32,
          backgroundColor: "#f3f3f3",
          color: "#191919",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: "46ch" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>
            Something went wrong.
          </h1>
          <p style={{ margin: 0, lineHeight: 1.6, color: "rgba(34,34,34,0.7)" }}>
            The page failed to load.{" "}
            <a href="/" style={{ color: "#ea580b" }}>
              Reload the homepage
            </a>
            .
          </p>
        </div>
      </body>
    </html>
  );
}
