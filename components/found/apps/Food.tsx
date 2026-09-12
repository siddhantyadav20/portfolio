"use client";

import { story as ep } from "@/content/found/story";
import AppBar from "./AppBar";
import type { AppProps } from "./types";
import app from "./App.module.css";

/** A food app, because everyone has one: a cake for Tara, chai on Tuesday night. */
export default function Food({ state }: AppProps) {
  return (
    <section className={app.view}>
      <AppBar />
      <div className={app.body}>
        <h2 className={app.big}>Dabba</h2>
        <p className={app.groupLabel}>Past orders</p>
        <ul className={app.group}>
          {ep.food.map((o) => (
            <li key={o.at} className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>{o.item}</span>
                <span className={app.rowSub}>
                  {o.to} · {o.at} · paid by {state.cast.name}
                </span>
              </span>
              <span className={app.rowMeta}>{o.price}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
