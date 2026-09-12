"use client";

import Link from "next/link";
import { useState } from "react";

import { story as ep } from "@/content/found/story";
import type { CaseState } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import * as play from "./actions";
import { joinNextEpisode } from "./submit";
import styles from "./EndCard.module.css";

/**
 * Between episodes, in the site's voice: the questions left open, and then
 * either the way on (Episode 1: charge it) or the one question the pilot
 * exists to ask (Episode 2: would you play Episode 3?).
 */
export default function EndCard({
  state,
  episode,
  onReplay,
}: {
  state: CaseState;
  episode: 1 | 2;
  onReplay: () => void;
}) {
  const end = episode === 1 ? ep.end : ep.end2;
  const next = episode + 1;
  const [vote, setVote] = useState<"yes" | "no" | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<"idle" | "sending" | "done" | "error">("idle");

  const choose = (v: "yes" | "no") => {
    if (vote) return;
    setVote(v);
    play.verdict(`ep${next}:${v}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sent === "sending") return;
    setSent("sending");
    const r = await joinNextEpisode(email, next);
    setSent(r.ok ? "done" : "error");
    if (r.ok) play.verdict("email");
  };

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>{end.title}</p>
      <h2 className={styles.title}>{episode === 1 ? ep.title : "Read Receipts"}</h2>
      <ul className={styles.questions}>
        {end.questions.map((q) => (
          <li key={q}>{say(q, state.cast)}</li>
        ))}
      </ul>

      <div className={styles.ask}>
        <p className={styles.askText}>{end.ask}</p>
        {episode === 1 ? (
          <div className={styles.choices}>
            <button type="button" className={styles.primary} onClick={() => play.perform("start-ep2")}>
              {end.cta ?? "Continue"}
            </button>
          </div>
        ) : vote === null ? (
          <div className={styles.choices}>
            <button type="button" className={styles.primary} onClick={() => choose("yes")}>
              Yes
            </button>
            <button type="button" className={styles.secondary} onClick={() => choose("no")}>
              Not really
            </button>
          </div>
        ) : vote === "no" ? (
          <p className={styles.thanks}>Thank you for telling me. That&apos;s the most useful answer there is.</p>
        ) : sent === "done" ? (
          <p className={styles.thanks}>Done. You&apos;ll hear when Episode {next} is out.</p>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <label className={styles.formLabel} htmlFor="found-email">
              Want to know when it&apos;s out? (optional)
            </label>
            <div className={styles.row}>
              <input
                id="found-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
              <button type="submit" className={styles.primary} disabled={sent === "sending"}>
                {sent === "sending" ? "Sending…" : "Tell me"}
              </button>
            </div>
            {sent === "error" && <p className={styles.error}>That didn&apos;t go through. Check the address?</p>}
          </form>
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.link} onClick={onReplay}>
          Start over, with someone else missing
        </button>
        <Link className={styles.link} href="/">
          Back to Siddhant&apos;s site
        </Link>
      </div>
    </div>
  );
}
