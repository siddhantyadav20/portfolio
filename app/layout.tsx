import type { Metadata } from "next";
import CanvasCursor from "@/components/interaction/CanvasCursor";
import { THEME_SCRIPT } from "@/lib/theme";
import { canela, newsreader, outfit } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siddhant Yadav — Product Designer",
  description:
    "I design tools for people who work with their hands, not a mouse.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${canela.variable} ${outfit.variable} ${newsreader.variable}`}
      // The pre-paint script writes data-theme here before React sees the
      // document, so the server's markup and the client's disagree by design.
      // Without this, React "corrects" the attribute back off on hydration and
      // the page flashes to light — the exact bug the script exists to prevent.
      suppressHydrationWarning
    >
      <head>
        {/* Must be inline and in <head>: it has to run before first paint.
            See THEME_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        {/* Site-wide, so the canvas cursor survives navigation. */}
        <CanvasCursor />
      </body>
    </html>
  );
}
