"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { found } from "@/content/found";
import { episode1 as ep } from "@/content/found/episode1";
import type { AppId } from "@/content/found/types";
import { useMounted } from "@/lib/clientValue";
import { buzz, warmBuzz } from "@/lib/found/buzz";
import { act, battery, dueEvents, has } from "@/lib/found/engine";
import { progressServerSide, readProgress, subscribeProgress } from "@/lib/found/progress";
import { say } from "@/lib/found/voice";

import Calculator from "../apps/Calculator";
import Health from "../apps/Health";
import Maps from "../apps/Maps";
import Memos from "../apps/Memos";
import Messages from "../apps/Messages";
import Notes from "../apps/Notes";
import Photos from "../apps/Photos";
import Settings from "../apps/Settings";
import type { Nav } from "../apps/types";
import * as play from "./actions";
import EndCard from "./EndCard";
import Envelope from "./Envelope";
import Home from "./Home";
import { AppGlyph } from "./icons";
import LockScreen from "./LockScreen";
import styles from "./FoundPhone.module.css";

type Route = { app: AppId | "home"; arg?: string };
type Banner = { key: number; from: string; text: string; app: AppId; arg?: string };

/** How long after the moment a live message waits before it arrives. Long
 *  enough to feel like someone typing; the cliffhanger's voice waits longer. */
const EVENT_DELAY: Record<string, number> = { "cliff-share": 2600, "cliff-voice": 5200 };
const DEFAULT_DELAY = 2400;
const BANNER_MS = 5200;
/** From the last text to the screen going dark, then the dark itself. */
const POWER_OFF_AFTER = 7500;
const DYING_MS = 2600;

/** Whether this page load has already reported a returning player. */
let resumeCounted = false;

/**
 * The phone, the room it's in, and the order things happen.
 *
 * Owns only what the screen is doing right now: which app is open, which
 * banner is showing, which threads have something new. Everything about the
 * case itself is in the progress store and changes through `./actions`.
 */
export default function FoundPhone() {
  const mounted = useMounted();
  const s = useSyncExternalStore(subscribeProgress, readProgress, progressServerSide);
  const [route, setRoute] = useState<Route>({ app: "home" });
  const [banner, setBanner] = useState<Banner | null>(null);
  const [unread, setUnread] = useState<ReadonlySet<string>>(() => new Set());
  const [dying, setDying] = useState(false);
  const bannerKey = useRef(0);

  // Counted once per page load, and only for a case that was already open.
  // The module flag, not the effect, is what makes it once: Strict Mode and
  // Fast Refresh both run mount effects again, and each doubled the count.
  // The recorded buzz, decoded before the first text needs it.
  useEffect(() => warmBuzz(), []);

  useEffect(() => {
    if (resumeCounted || !readProgress()) return;
    resumeCounted = true;
    play.resumed();
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

  const markRead = useCallback((thread: string) => {
    setUnread((u) => {
      if (!u.has(thread)) return u;
      const next = new Set(u);
      next.delete(thread);
      return next;
    });
  }, []);

  /* Live events, one at a time, each after a beat. Whatever is due fires in
     script order; the next one is scheduled when the state changes again. */
  const due = s ? dueEvents(ep, s)[0] : undefined;
  useEffect(() => {
    if (!due) return;
    const timer = window.setTimeout(() => {
      const cast = readProgress()?.cast;
      if (!cast) return;
      play.fire(due.id);
      buzz();
      const first = due.messages.find((m) => m.text) ?? due.messages[0];
      const thread = due.thread ? ep.threads.find((t) => t.id === due.thread) : undefined;
      bannerKey.current += 1;
      if (thread) {
        setUnread((u) => new Set(u).add(thread.id));
        setBanner({
          key: bannerKey.current,
          from: thread.contact,
          text: first?.text ? say(first.text, cast) : "Photo",
          app: "messages",
          arg: thread.id,
        });
      } else if (due.banner) {
        setBanner({ key: bannerKey.current, from: "Maps", text: say(due.banner, cast), app: "maps" });
      }
    }, EVENT_DELAY[due.id] ?? DEFAULT_DELAY);
    return () => window.clearTimeout(timer);
  }, [due]);

  useEffect(() => {
    if (!banner) return;
    const timer = window.setTimeout(() => setBanner(null), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [banner]);

  /* The end: the last text lands, the phone holds for a few seconds, then
     the battery goes. Re-armed on a reload that lands in between. */
  const lastWords = !!s && has(s, "fired:cliff-voice") && !has(s, "dead");
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

  // Escape goes home. Anything held with ⌘/Ctrl belongs to the site (⌘K).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (e.key === "Escape") setRoute({ app: "home" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stage = !mounted ? null : !s ? (
    <Envelope onOpen={play.start} />
  ) : act(ep, s) === "dead" ? (
    <EndCard state={s} onReplay={play.reset} />
  ) : (
    <div className={styles.device}>
      <div className={styles.screen} style={{ "--wallpaper": `url(${found.wallpaper})` } as React.CSSProperties}>
        <StatusBar percent={battery(ep, s)} />
        {act(ep, s) === "locked" ? (
          <LockScreen state={s} />
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
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.surface} data-cursor="native">
      <h1 className={styles.hidden}>
        {ep.title}: someone is missing, and their phone has arrived in your post.
      </h1>
      {stage}
    </div>
  );
}

function StatusBar({ percent }: { percent: number }) {
  return (
    <div className={styles.status} aria-hidden="true">
      <span>08:12</span>
      <span className={styles.battery} data-low={percent <= 2 || undefined}>
        {percent}%
        <span className={styles.cell}>
          <span className={styles.fill} style={{ width: `${Math.max(8, percent * 6)}%` }} />
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
  state: NonNullable<ReturnType<typeof readProgress>>;
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
    default:
      return null;
  }
}
