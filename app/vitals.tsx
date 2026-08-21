"use client";

import dynamic from "next/dynamic";

/**
 * Core Web Vitals, measured on real visits rather than guessed at in a lab.
 *
 * A Lighthouse run on a fast laptop is a hypothesis; this is the answer. It
 * matters more than usual here because the heavy things on this site — the
 * canvas, the prototype recording, the album art — are exactly what a
 * synthetic run on a wired connection is least likely to catch.
 *
 * ---------------------------------------------------------------------------
 * Split out and loaded on demand, which is not premature. `next/web-vitals`
 * is about 10KB, and imported statically it landed in the first load of every
 * route — ten kilobytes spent measuring how long it takes to send ten
 * kilobytes, on every visit, whether or not anything was listening. With no
 * `NEXT_PUBLIC_TELEMETRY_URL` set there is nowhere for a measurement to go, so
 * the chunk is simply never requested.
 */
const Reporter = dynamic(() => import("./vitals-reporter"), { ssr: false });

export default function WebVitals() {
  if (!process.env.NEXT_PUBLIC_TELEMETRY_URL) return null;
  return <Reporter />;
}
