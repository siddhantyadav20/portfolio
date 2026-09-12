"use client";

import { useEffect, useState } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import { has } from "@/lib/found/engine";
import { keyTap } from "@/lib/found/buzz";
import { calc } from "@/lib/found/calc";
import * as play from "../FoundPhone/actions";
import AppBar, { Chevron } from "./AppBar";
import Thread from "./Thread";
import type { AppProps } from "./types";
import app from "./App.module.css";
import styles from "./Calculator.module.css";

const OPS = ["÷", "×", "−", "+"];
const KEYS: { k: string; kind: "fn" | "num" | "op"; wide?: boolean }[] = [
  { k: "AC", kind: "fn" },
  { k: "±", kind: "fn" },
  { k: "%", kind: "fn" },
  { k: "÷", kind: "op" },
  { k: "7", kind: "num" },
  { k: "8", kind: "num" },
  { k: "9", kind: "num" },
  { k: "×", kind: "op" },
  { k: "4", kind: "num" },
  { k: "5", kind: "num" },
  { k: "6", kind: "num" },
  { k: "−", kind: "op" },
  { k: "1", kind: "num" },
  { k: "2", kind: "num" },
  { k: "3", kind: "num" },
  { k: "+", kind: "op" },
  { k: "0", kind: "num", wide: true },
  { k: ".", kind: "num" },
  { k: "=", kind: "op" },
];

const KEYBOARD: Record<string, string> = { "*": "×", x: "×", "/": "÷", "-": "−", "+": "+", Enter: "=", "=": "=", ".": "." };

/**
 * A working calculator, and a vault behind it: type the code, press =.
 * A wrong code does nothing a calculator wouldn't, because a vault app that
 * reacts to wrong codes isn't hiding anything.
 */
export default function Calculator({ state }: AppProps) {
  const [entry, setEntry] = useState("0");
  const [fresh, setFresh] = useState(true);
  const [inVault, setInVault] = useState(() => has(state, "lock:vault"));

  const press = (k: string) => {
    keyTap();
    if (/^\d$/.test(k)) {
      setEntry((e) => (fresh || e === "0" ? k : e.length < 16 ? e + k : e));
      setFresh(false);
    } else if (k === ".") {
      setEntry((e) => {
        if (fresh) return "0.";
        const tail = e.split(/[+−×÷]/).at(-1) ?? "";
        return tail.includes(".") ? e : e + ".";
      });
      setFresh(false);
    } else if (k === "AC") {
      setEntry("0");
      setFresh(true);
    } else if (k === "±") {
      setEntry((e) => (/^-?[\d.]+$/.test(e) && e !== "0" ? (e.startsWith("-") ? e.slice(1) : `-${e}`) : e));
    } else if (k === "%") {
      setEntry((e) => (/^-?[\d.]+$/.test(e) ? String(Number(e) / 100) : e));
    } else if (OPS.includes(k)) {
      setEntry((e) => (/[+−×÷]$/.test(e) ? e.slice(0, -1) + k : e + k));
      setFresh(false);
    } else if (k === "=") {
      if (!has(state, "lock:vault") && /^\d{4,}$/.test(entry) && play.unlock("vault", entry)) {
        setInVault(true);
        setEntry("0");
        setFresh(true);
        return;
      }
      setEntry(calc(entry));
      setFresh(true);
    }
  };

  const backspace = () => setEntry((e) => (e.length > 1 ? e.slice(0, -1) : "0"));

  useEffect(() => {
    if (inVault) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (KEYBOARD[e.key]) press(KEYBOARD[e.key]);
      else if (e.key === "Backspace") backspace();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (inVault) return <Vault state={state} onLock={() => setInVault(false)} />;

  const display = entry.replace(/-/g, "−");
  return (
    <section className={styles.calc}>
      <p className={styles.display} data-long={display.length > 9 || undefined} aria-live="polite">
        {display}
      </p>
      <div className={styles.keys}>
        {KEYS.map(({ k, kind, wide }) => (
          <button
            type="button"
            key={k}
            className={styles.key}
            data-kind={kind}
            data-wide={wide || undefined}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </section>
  );
}

function Vault({ state, onLock }: { state: AppProps["state"]; onLock: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const note = ep.vault.notes.find((n) => n.id === open);
  const thread = ep.vault.thread;

  return (
    <section className={app.view}>
      <AppBar title="Vault" onBack={onLock} backLabel="Lock" />
      <div className={app.body}>
        <p className={styles.vaultNote}>Hidden from Photos, Messages and search.</p>
        <ul className={app.group}>
          <li>
            <button type="button" className={app.row} onClick={() => setOpen(thread.id)}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>{thread.contact}</span>
                <span className={app.rowSub}>{thread.messages.length} messages</span>
              </span>
              <Chevron />
            </button>
          </li>
          {ep.vault.notes.map((n) => (
            <li key={n.id}>
              <button type="button" className={app.row} onClick={() => setOpen(n.id)}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>{n.title}</span>
                  <span className={app.rowSub}>Note</span>
                </span>
                <Chevron />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {open === thread.id && (
        <Thread
          contact={thread.contact}
          messages={thread.messages}
          cast={state.cast}
          composer={false}
          onBack={() => setOpen(null)}
          backLabel="Vault"
        />
      )}
      {note && (
        <section className={app.view}>
          <AppBar title={note.title} onBack={() => setOpen(null)} backLabel="Vault" />
          <div className={app.body}>
            <p className={styles.noteBody}>{note.body}</p>
          </div>
        </section>
      )}
    </section>
  );
}
