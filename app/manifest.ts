import type { MetadataRoute } from "next";
import { intro, linkedin } from "@/content/site";

/**
 * The web app manifest.
 *
 * Modest on purpose: this is a portfolio, not an app, so there is no
 * `display: standalone` — someone who adds it to a home screen should get the
 * site in a browser, with the address bar they need to share it.
 *
 * `icons` is left to Next, which wires up `icon.tsx` and `apple-icon.tsx`
 * automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${linkedin.name} — ${linkedin.role}`,
    short_name: linkedin.name,
    description: intro.tagline,
    start_url: "/",
    background_color: "#f3f3f3",
    theme_color: "#f3f3f3",
  };
}
