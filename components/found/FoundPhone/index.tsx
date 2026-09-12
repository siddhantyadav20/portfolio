"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { found } from "@/content/found";
import { story as ep } from "@/content/found/story";
import type { AppId } from "@/content/found/types";
import { useMounted } from "@/lib/clientValue";
import { buzz, warmBuzz } from "@/lib/found/buzz";
import { battery, clockNow, dueEvents, has, sessionVars, stage, type CaseState } from "@/lib/found/engine";
import { progressServerSide, readProgress, subscribeProgress } from "@/lib/found/progress";
import { say } from "@/lib/found/voice";

import Calculator from "../apps/Calculator";
import Food from "../apps/Food";
import Guardian from "../apps/Guardian";
import Health from "../apps/Health";
import Maps from "../apps/Maps";
import Memos from "../apps/Memos";
import Messages from "../apps/Messages";
import News from "../apps/News";
import NightCam from "../apps/NightCam";
import Notes from "../apps/Notes";
import Photos from "../apps/Photos";
import Settings from "../apps/Settings";
import type { Nav } from "../apps/types";
import * as play from "./actions";
import Charge from "./Charge";
import EndCard from "./EndCard";
import Envelope from "./Envelope";
import Home from "./Home";
import { AppGlyph } from "./icons";
import LockScreen from "./LockScreen";
import styles from "./FoundPhone.module.css";

type Route = { app: AppId | "home"; arg?: string };
type Banner = { key: number; from: string; text: string; app: AppId; arg?: string };

/** How long after the moment a live message waits before it arrives. Long
 *  enough to feel like someone typing; the big beats wait longer. */
const EVENT_DELAY: Record<string, number> = {
  "cliff-you": 2600,
  "cliff-voice-photo": 5200,
  "cliff-voice-read": 5200,
  "e2-open-notes": 2200,
  "e2-3107-sorry": 3400,
  "e2-letterbox": 3600,
  "e2-thanks": 2800,
};
const DEFAULT_DELAY = 2400;
const BANNER_MS = 5200;
/** From the last text to the screen going dark, then the dark itself. */
const POWER_OFF_AFTER = 7500;
const DYING_MS = 3400;
/** From "Thank you." to Episode 2's end card. */
const EPISODE_END_AFTER = 6000;

/** What piled up while the phone was dead, for the banner that says so. */
const BACKLOG =
  ep.threads.reduce((n, t) => n + t.messages.filter((m) => m.requires?.length === 1 && m.requires[0] === "ep:2").length, 0) +
  ep.headlines.filter((h) => h.requires?.length === 1 && h.requires[0] === "ep:2").length;

/** Whether this page load has already reported a returning player. */
let resumeCounted = false;

/**
 * The phone, the room it's in, and the order things happen.
 *
 * Owns only what the screen is doing right now: which app is open, which
 * banner is showing, which threads have something new, and how long each app
 * has been on screen (Guardian counts it, so the story can too). Everything
 * about the case itself is in the progress store and changes through
 * `./actions`. What the screen shows is the story's current stage.
 */
export default function FoundPhone() {
  const mounted = useMounted();
  const s = useSyncExternalStore(subscribeProgress, readProgress, progressServerSide);
  const [route, setRoute] = useState<Route>({ app: "home" });
  const [banner, setBanner] = useState<Banner | null>(null);
  const [unread, setUnread] = useState<ReadonlySet<string>>(() => new Set());
  const [dying, setDying] = useState(false);
  const [now, setNow] = useState(0);
  const bannerKey = useRef(0);

  // The recorded buzz, decoded before the first text needs it.
  useEffect(() => warmBuzz(), []);

  // Counted once per page load, and only for a case that was already open.
  // The module flag, not the effect, is what makes it once: Strict Mode and
  // Fast Refresh both run mount effects again.
  useEffect(() => {
    if (resumeCounted || !readProgress()) return;
    resumeCounted = true;
    play.resumed();
  }, []);

  // The status bar's clock moves with the story's.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 20_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const nav: Nav = useMemo(
    () => ({
      go: (app, arg) => {
        setRoute({ app, arg });
        setBanner(null);
      },
      home: () => setRoute({ app: "home" }),
    }),
    [],
  );

  // Time in each app, for Mum's report: counted from open to close, a pickup
  // each time one opens.
  useEffect(() => {
    if (route.app === "home") return;
    const app = route.app;
    const since = Date.now();
    play.openApp();
    return () => play.logUsage(app, Date.now() - since);
  }, [route.app]);

  const markRead = useCallback((thread: string) => {
    setUnread((u) => {
      if (!u.has(thread)) return u;
      const next = new Set(u);
      next.delete(thread);
      return next;
    });
  }, []);

  const showBanner = useCallback((b: Omit<Banner, "key">) => {
    bannerKey.current += 1;
    setBanner({ ...b, key: bannerKey.current });
  }, []);

  /* Live events, one at a time, each after a beat. Whatever is due fires in
     script order; the next one is scheduled when the state changes again. */
  const due = s ? dueEvents(ep, s)[0] : undefined;
  useEffect(() => {
    if (!due) return;
    const timer = window.setTimeout(() => {
      const cur = readProgress();
      if (!cur) return;
      play.fire(due.id);
      if (due.effect === "open-notes") {
        setRoute({ app: "notes" });
        return;
      }
      const vars = sessionVars(ep, cur);
      const thread = due.thread ? ep.threads.find((t) => t.id === due.thread) : undefined;
      if (thread) {
        buzz();
        const first = due.messages.find((m) => m.text) ?? due.messages[0];
        setUnread((u) => new Set(u).add(thread.id));
        showBanner({
          from: cur.names[thread.id] ?? thread.contact,
          text: first?.text ? say(first.text, cur.cast, vars) : "Photo",
          app: "messages",
          arg: thread.id,
        });
      } else if (due.banner) {
        buzz();
        const app: AppId = due.id === "e2-nightcam" ? "nightcam" : due.id === "e2-vault" ? "calculator" : "maps";
        showBanner({ from: app === "maps" ? "Maps" : app === "nightcam" ? "NightCam" : "Calculator", text: say(due.banner, cur.cast, vars), app });
      }
    }, EVENT_DELAY[due.id] ?? DEFAULT_DELAY);
    return () => window.clearTimeout(timer);
  }, [due, showBanner]);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [banner]);

  /* Episode 2 opens on three days of backlog: say so once, as it lands. */
  const unlocked2 = !!s && has(s, "did:unlock-2");
  const announced = useRef(false);
  useEffect(() => {
    if (!unlocked2 || announced.current) return;
    announced.current = true;
    const timer = window.setTimeout(() => {
      buzz();
      showBanner({ from: "While it was off", text: `${BACKLOG} notifications`, app: "messages" });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [unlocked2, showBanner]);

  /* The end of Episode 1: the last text lands, the phone holds, then the
     battery goes. Re-armed on a reload that lands in between. */
  const lastWords = !!s && (has(s, "fired:cliff-voice-photo") || has(s, "fired:cliff-voice-read")) && !has(s, "dead");
  useEffect(() => {
    if (!lastWords) return;
    const timer = window.setTimeout(() => setDying(true), POWER_OFF_AFTER);
    return () => window.clearTimeout(timer);
  }, [lastWords]);

  useEffect(() => {
    if (!dying) return;
    const timer = window.setTimeout(() => {
      play.die();
      setDying(false);
    }, DYING_MS);
    return () => window.clearTimeout(timer);
  }, [dying]);

  /* The end of Episode 2: "Thank you.", a beat, then the end card. */
  const thanked = !!s && has(s, "fired:e2-thanks") && !has(s, "ep:2-done");
  useEffect(() => {
    if (!thanked) return;
    const timer = window.setTimeout(() => play.perform("finish-ep2"), EPISODE_END_AFTER);
    return () => window.clearTimeout(timer);
  }, [thanked]);

  // Escape goes home. Anything held with ⌘/Ctrl belongs to the site (⌘K).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (e.key === "Escape") setRoute({ app: "home" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const st = s ? stage(ep, s) : null;
  let body: React.ReactNode = null;

  if (mounted && !s) body = <Envelope onOpen={play.start} />;
  else if (mounted && s && st?.screen === "end") body = <EndCard state={s} episode={st.episode} onReplay={play.reset} />;
  else if (mounted && s && st) {
    const charging = st.episode === 2;
    body = (
      <div className={styles.device}>
        <div className={styles.screen} style={{ "--wallpaper": `url(${found.wallpaper})` } as React.CSSProperties}>
          {st.screen === "charge" ? (
            <Charge onPlug={() => play.perform("plug")} />
          ) : (
            <>
              <StatusBar percent={battery(ep, s)} clock={clockNow(s, now)} charging={charging} />
              {st.screen === "lock" || st.screen === "relock" ? (
                <LockScreen state={s} mode={st.screen === "relock" ? "restart" : "first"} clock={clockNow(s, now)} />
              ) : (
                <>
                  {route.app === "home" ? (
                    <Home state={s} nav={nav} unread={unread.size} />
                  ) : (
                    <App
                      key={`${route.app}:${route.arg ?? ""}`}
                      route={route}
                      state={s}
                      nav={nav}
                      unread={unread}
                      markRead={markRead}
                    />
                  )}
                  <button type="button" className={styles.homeBar} aria-label="Home" onClick={nav.home} />
                </>
              )}
            </>
          )}
          {banner && (
            <button
              type="button"
              key={banner.key}
              className={styles.banner}
              onClick={() => nav.go(banner.app, banner.arg)}
              aria-live="polite"
            >
              <span className={styles.bannerIcon}>
                <AppGlyph app={banner.app} />
              </span>
              <span className={styles.bannerText}>
                <span className={styles.bannerFrom}>{banner.from}</span>
                <span className={styles.bannerBody}>{banner.text}</span>
              </span>
              <span className={styles.bannerNow}>now</span>
            </button>
          )}
          {dying && (
            <div className={styles.powerOff} role="status">
              <div className={styles.dying}>
                <span className={styles.bigCell} />
                <span>0%</span>
              </div>
              {/* The last thing the phone does before it dies: tells Mum. */}
              <p className={styles.sting}>{ep.guardian.sting}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.surface} data-cursor="native">
      <h1 className={styles.hidden}>{ep.title}: someone is missing, and their phone has arrived in your post.</h1>
      {body}
    </div>
  );
}

function StatusBar({ percent, clock, charging }: { percent: number; clock: string; charging: boolean }) {
  // At 1–4% a true-width fill is a hairline; Episode 1 draws it generously.
  const width = charging ? percent : percent * 6;
  return (
    <div className={styles.status} aria-hidden="true">
      <span>{clock}</span>
      <span
        className={styles.battery}
        data-low={(!charging && percent <= 2) || undefined}
        data-charging={charging || undefined}
      >
        {percent}%
        <span className={styles.cell}>
          <span className={styles.fill} style={{ width: `${Math.max(8, Math.min(100, width))}%` }} />
        </span>
      </span>
    </div>
  );
}

function App({
  route,
  state,
  nav,
  unread,
  markRead,
}: {
  route: Route;
  state: CaseState;
  nav: Nav;
  unread: ReadonlySet<string>;
  markRead: (thread: string) => void;
}) {
  const props = { state, nav, arg: route.arg };
  switch (route.app) {
    case "messages":
      return <Messages {...props} unread={unread} onRead={markRead} />;
    case "photos":
      return <Photos {...props} />;
    case "calculator":
      return <Calculator {...props} />;
    case "health":
      return <Health />;
    case "settings":
      return <Settings {...props} />;
    case "maps":
      return <Maps {...props} />;
    case "memos":
      return <Memos />;
    case "notes":
      return <Notes {...props} />;
    case "guardian":
      return <Guardian {...props} />;
    case "nightcam":
      return <NightCam {...props} />;
    case "news":
      return <News {...props} />;
    case "food":
      return <Food {...props} />;
    default:
      return null;
  }
}
