import type { Metadata } from "next";
import FoundPhone from "@/components/found/FoundPhone";
import { found } from "@/content/found";

export const metadata: Metadata = {
  /** Half a title; the root template adds the name. */
  title: found.title,
  description: found.description,
  /** Without these the homepage's canonical and share card cascade down. */
  alternates: { canonical: found.href },
  openGraph: {
    title: `${found.title} — Siddhant Yadav`,
    description: found.description,
    url: found.href,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${found.title} — Siddhant Yadav`,
    description: found.description,
  },
};

/**
 * Found: a mystery played on the missing person's phone.
 *
 * A pilot, living here so it can be measured before it becomes its own app.
 * Everything is client-side; the server renders the room and a heading, and
 * the envelope (or a saved case) arrives once the browser has read storage.
 */
export default function FoundPage() {
  return <FoundPhone />;
}
