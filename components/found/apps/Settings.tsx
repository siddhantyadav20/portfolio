"use client";

import { useEffect, useState } from "react";

import { episode1 as ep } from "@/content/found/episode1";
import { battery } from "@/lib/found/engine";
import * as play from "../FoundPhone/actions";
import AppBar, { Chevron } from "./AppBar";
import type { AppProps } from "./types";
import app from "./App.module.css";

/**
 * Settings, where nobody thinks to look. Wi-Fi is off (Low Power Mode), but
 * the list of networks the phone has joined, and when, is still there.
 */
export default function Settings({ state }: AppProps) {
  const [page, setPage] = useState<"root" | "wifi">("root");

  useEffect(() => {
    if (page === "wifi") play.seeAll(ep.wifi.map((n) => n.evidence));
  }, [page]);

  if (page === "wifi") {
    return (
      <section className={app.view}>
        <AppBar title="Wi-Fi" onBack={() => setPage("root")} backLabel="Settings" />
        <div className={app.body}>
          <ul className={app.group}>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Wi-Fi</span>
              </span>
              <span className={app.rowMeta}>Off</span>
            </li>
          </ul>
          <p className={app.note}>Turned off by Low Power Mode.</p>
          <p className={app.groupLabel}>Known networks</p>
          <ul className={app.group}>
            {ep.wifi.map((n) => (
              <li key={n.ssid} className={app.row}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>{n.ssid}</span>
                  <span className={app.rowSub}>Last joined {n.lastJoined}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className={app.view}>
      <AppBar />
      <div className={app.body}>
        <h2 className={app.big}>Settings</h2>
        <ul className={app.group}>
          <li>
            <button type="button" className={app.row} onClick={() => setPage("wifi")}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Wi-Fi</span>
              </span>
              <span className={app.rowMeta}>Off</span>
              <Chevron />
            </button>
          </li>
          <li className={app.row}>
            <span className={app.rowMain}>
              <span className={app.rowTitle}>Location Services</span>
            </span>
            <span className={app.rowMeta}>Off</span>
          </li>
        </ul>
        <ul className={app.group}>
          <li className={app.row}>
            <span className={app.rowMain}>
              <span className={app.rowTitle}>Low Power Mode</span>
            </span>
            <span className={app.rowMeta}>On</span>
          </li>
          <li className={app.row}>
            <span className={app.rowMain}>
              <span className={app.rowTitle}>Battery</span>
            </span>
            <span className={app.rowMeta}>{battery(ep, state)}%</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
