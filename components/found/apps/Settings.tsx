"use client";

import { useEffect, useState } from "react";

import { story as ep } from "@/content/found/story";
import { actionAvailable, all, battery, has } from "@/lib/found/engine";
import { say } from "@/lib/found/voice";
import * as play from "../FoundPhone/actions";
import AppBar, { Chevron } from "./AppBar";
import Switch from "./Switch";
import type { AppProps } from "./types";
import app from "./App.module.css";

type Page = "root" | "wifi" | "sharing" | "messages" | "passcode" | "account";

/** A settings row: a page behind it when `onOpen` is given, a plain fact when not. */
function Row({ title, meta, sub, onOpen }: { title: string; meta?: string; sub?: string; onOpen?: () => void }) {
  const inner = (
    <>
      <span className={app.rowMain}>
        <span className={app.rowTitle}>{title}</span>
        {sub && <span className={app.rowSub}>{sub}</span>}
      </span>
      {meta && <span className={app.rowMeta}>{meta}</span>}
    </>
  );
  return onOpen ? (
    <li>
      <button type="button" className={app.row} onClick={onOpen}>
        {inner}
        <Chevron />
      </button>
    </li>
  ) : (
    <li className={app.row}>{inner}</li>
  );
}

/**
 * Settings, where nobody thinks to look, and where the phone keeps what it
 * knows about itself: every network it joined and when, who can see where it
 * is, what it does to someone who types the wrong passcode, and which other
 * devices are signed in. Some of the switches work. What the player flips is
 * something the phone did.
 */
export default function Settings({ state }: AppProps) {
  const [page, setPage] = useState<Page>("root");
  const t = (x: string) => say(x, state.cast);
  const ep2 = has(state, "ep:2");
  const online = has(state, "did:wifi-on");
  const canWifi = actionAvailable(ep, state, "wifi-on");
  const sharing = !has(state, "did:sharing-off");
  const receipts = !has(state, "did:receipts-off");
  const networks = ep.wifi.filter((n) => all(state, n.requires));
  const devices = ep.devices.filter((d) => all(state, d.requires));

  useEffect(() => {
    if (page === "wifi") play.seeAll(networks.map((n) => n.evidence));
    if (page === "account") play.seeAll(devices.map((d) => d.evidence));
  }, [page, networks, devices]);

  const Back = (title: string) => <AppBar title={title} onBack={() => setPage("root")} backLabel="Settings" />;

  if (page === "wifi") {
    return (
      <section className={app.view}>
        {Back("Wi-Fi")}
        <div className={app.body}>
          <ul className={app.group}>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Wi-Fi</span>
              </span>
              <Switch on={online} disabled={online || !canWifi} onChange={() => play.perform("wifi-on")} label="Wi-Fi" />
            </li>
          </ul>
          <p className={app.note}>
            {online
              ? "Connected to Home-4B."
              : canWifi
                ? "There's enough charge now."
                : ep2
                  ? "Needs more charge."
                  : "Turned off by Low Power Mode."}
          </p>
          <p className={app.groupLabel}>Known networks</p>
          <ul className={app.group}>
            {networks.map((n) => (
              <li key={n.ssid} className={app.row}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>{n.ssid}</span>
                  <span className={app.rowSub}>{n.lastJoined === "Connected" ? "Connected" : `Last joined ${n.lastJoined}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (page === "sharing") {
    return (
      <section className={app.view}>
        {Back("Location Sharing")}
        <div className={app.body}>
          <ul className={app.group}>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Share My Location</span>
              </span>
              <Switch on={sharing} disabled={!sharing} onChange={() => play.perform("sharing-off")} label="Share My Location" />
            </li>
          </ul>
          <p className={app.groupLabel}>Sharing with</p>
          <ul className={app.group}>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>K.</span>
                <span className={app.rowSub}>{sharing ? "Since Sat 00:05" : "Stopped"}</span>
              </span>
            </li>
          </ul>
        </div>
      </section>
    );
  }

  if (page === "messages") {
    return (
      <section className={app.view}>
        {Back("Messages")}
        <div className={app.body}>
          <ul className={app.group}>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Send Read Receipts</span>
              </span>
              <Switch on={receipts} disabled={!receipts} onChange={() => play.perform("receipts-off")} label="Send Read Receipts" />
            </li>
          </ul>
          <p className={app.note}>When this is on, people are told when you&apos;ve read their messages.</p>
        </div>
      </section>
    );
  }

  if (page === "passcode") {
    return (
      <section className={app.view}>
        {Back("Face & Passcode")}
        <div className={app.body}>
          <ul className={app.group}>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Passcode</span>
              </span>
              <span className={app.rowMeta}>On</span>
            </li>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Face</span>
                <span className={app.rowSub}>{t("Set up for {name}")}</span>
              </span>
            </li>
            <li className={app.row}>
              <span className={app.rowMain}>
                <span className={app.rowTitle}>Photo after a wrong passcode</span>
                <span className={app.rowSub}>{t("Emails it to {name}")}</span>
              </span>
              <span className={app.rowMeta}>On</span>
            </li>
          </ul>
        </div>
      </section>
    );
  }

  if (page === "account") {
    return (
      <section className={app.view}>
        {Back("Account")}
        <div className={app.body}>
          <p className={app.groupLabel}>Signed in on</p>
          <ul className={app.group}>
            {devices.map((d) => (
              <li key={d.id} className={app.row}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>{t(d.name)}</span>
                  <span className={app.rowSub}>{t(d.detail)}</span>
                </span>
              </li>
            ))}
            {!online && (
              <li className={app.row}>
                <span className={app.rowMain}>
                  <span className={app.rowTitle}>Refreshing…</span>
                  <span className={app.rowSub}>Needs Wi-Fi</span>
                </span>
              </li>
            )}
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
          <Row title="Wi-Fi" meta={online ? "Home-4B" : "Off"} onOpen={() => setPage("wifi")} />
          <Row title="Location Services" meta="Off" />
          <Row title="Location Sharing" meta={sharing ? "K." : "Off"} onOpen={() => setPage("sharing")} />
        </ul>
        <ul className={app.group}>
          <Row title="Messages" onOpen={() => setPage("messages")} />
          <Row title="Face & Passcode" onOpen={() => setPage("passcode")} />
          <Row title="Account" onOpen={() => setPage("account")} />
        </ul>
        <ul className={app.group}>
          <Row title="NightCam" meta="Cloud only" sub="Last synced Fri 23:51 via SRM-GATE3-GUEST" />
        </ul>
        <ul className={app.group}>
          <Row title="Low Power Mode" meta={ep2 ? "Off" : "On"} />
          <Row title="Battery" meta={`${battery(ep, state)}%${ep2 ? " · charging" : ""}`} />
        </ul>
      </div>
    </section>
  );
}
