import { notFound } from "next/navigation";
import styles from "./page.module.css";

/**
 * Three viewports at once, live.
 *
 * Figma has exactly two frames for this site — `Portfolio` at 1440 and the case
 * study modal at 1440 — so there is no phone design to transcribe. The mobile
 * layouts have to be *designed*, and the only honest way to design a responsive
 * layout is to watch all of its widths change together as you edit one
 * stylesheet.
 *
 * That is all this is: the real site, in real iframes, at the three widths the
 * breakpoints are drawn around. Editing any card's CSS reloads all three.
 *
 * Development only — `notFound()` below, plus `X-Frame-Options: SAMEORIGIN` in
 * `next.config.ts` is likewise dev-only, so this route cannot work in
 * production even if it somehow shipped.
 *
 *   /dev/responsive                     the homepage
 *   /dev/responsive?path=/work/search   any other route
 *   /dev/responsive?w=320,414           other widths
 *   /dev/responsive?w=2560&fit=1        shrink to fit the screen
 *
 * `fit` scales the frame down visually with a transform. The iframe still
 * *lays out* at its true width, so media queries, container queries and `--u`
 * all resolve exactly as they would on a real 2560 monitor — only the pixels
 * you are shown are smaller. That distinction is the whole reason this is a
 * transform and not a narrower iframe.
 */

const DEFAULT_WIDTHS = [390, 768, 1440];
const HEIGHT = 844;

export default async function ResponsivePage({
  searchParams,
}: PageProps<"/dev/responsive">) {
  if (process.env.NODE_ENV !== "development") notFound();

  const params = await searchParams;
  const raw = Array.isArray(params.path) ? params.path[0] : params.path;

  /* Same-origin only, and a path rather than a URL. This is a dev tool, but a
     dev tool that will frame whatever a query string names is still a dev tool
     with an open redirect in it. */
  const path = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  const fitRaw = Array.isArray(params.fit) ? params.fit[0] : params.fit;
  const fit = fitRaw === "" || fitRaw === "1" || fitRaw === "true";

  const wRaw = Array.isArray(params.w) ? params.w[0] : params.w;
  const widths = (wRaw?.split(",") ?? [])
    .map((n) => Number.parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n >= 240 && n <= 3840);

  const shown = widths.length > 0 ? widths : DEFAULT_WIDTHS;

  /* Fitted frames are painted at half size, so the default viewport height is
     half a screen of nothing. Take a taller one there, and let `?h=` override
     either way. */
  const hRaw = Array.isArray(params.h) ? params.h[0] : params.h;
  const hNum = Number.parseInt(hRaw ?? "", 10);
  const height = Number.isFinite(hNum) && hNum >= 400 && hNum <= 6000
    ? hNum
    : fit
      ? 1700
      : HEIGHT;

  return (
    <main className={styles.bench}>
      <header className={styles.bar}>
        <span className={styles.title}>Responsive bench</span>
        <code className={styles.path}>{path}</code>
        <span className={styles.hint}>
          dev only · ?path=… · ?w=1440,1920 · ?fit=1 · ?h=1700
        </span>
      </header>

      <div className={styles.rail} data-fit={fit ? "" : undefined}>
        {shown.map((width) => (
          <figure
            className={styles.frame}
            key={width}
            /* When fitting, the figure reserves the *scaled* size — the
               transform below paints smaller but reserves the original box,
               which would otherwise leave a screenful of dead space. */
            style={
              fit
                ? ({
                    ["--fit-w" as string]: `${width}px`,
                    ["--fit-h" as string]: `${height}px`,
                  } as React.CSSProperties)
                : { width }
            }
          >
            <figcaption className={styles.label}>
              {width}
              {fit ? " · fitted" : ""}
            </figcaption>
            {/* Not lazy: the point is to see all of them at once. */}
            <iframe
              src={path}
              title={`${path} at ${width}px`}
              width={width}
              height={height}
              className={styles.viewport}
            />
          </figure>
        ))}
      </div>
    </main>
  );
}
