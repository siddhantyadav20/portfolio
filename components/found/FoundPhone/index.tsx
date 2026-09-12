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
import { drag } from "./drag";
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
/** An app shrinking back into the home screen; a page sliding away after a swipe back. */
const CLOSE_MS = 260;
const BACK_MS = 260;

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
 *
 * It also owns the phone's gestures, the ones that belong to the OS rather
 * than an app: swipe up from the home bar to go home, swipe a screen right to
 * go back, flick a banner away.
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
  const screenRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);

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

  /* --- Gestures ---------------------------------------------------------------
     Each one follows the finger, then either lets go or springs back. The
     moving element is styled directly while the finger is down: a gesture
     re-rendering React sixty times a second would be the wrong trade. */

  // The open app shrinks back into the home screen, which is already there
  // underneath it.
  const closeApp = () => {
    const el = appRef.current;
    if (!el) {
      setRoute({ app: "home" });
      return;
    }
    const ease = `${CLOSE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    el.style.transition = `scale ${ease}, translate ${ease}, border-radius ${ease}, opacity ${CLOSE_MS}ms ease-in`;
    el.style.scale = "0.3";
    el.style.translate = "0 -18%";
    el.style.borderRadius = "56px";
    el.style.opacity = "0";
    window.setTimeout(() => setRoute({ app: "home" }), CLOSE_MS - 40);
  };

  // Swipe up from the home bar: the app shrinks toward a card as it rises,
  // and past a point (or on a flick) it goes.
  const pullHome = (e: React.PointerEvent) => {
    const el = appRef.current;
    if (!el) return;
    drag(e, {
      engage: (dx, dy) => dy < 0 && -dy > Math.abs(dx),
      move: (dx, dy) => {
        const p = Math.min(1, -dy / 360);
        el.style.transition = "none";
        el.style.scale = String(1 - p * 0.42);
        el.style.translate = `${dx * 0.25}px ${Math.min(0, dy) * 0.4}px`;
        el.style.borderRadius = `${Math.round(10 + p * 44)}px`;
      },
      end: ({ dy, vy }) => {
        if (dy < -80 || vy < -0.5) {
          closeApp();
          return;
        }
        const spring = "0.35s cubic-bezier(0.2, 0.9, 0.3, 1.1)";
        el.style.transition = `scale ${spring}, translate ${spring}, border-radius ${spring}`;
        el.style.scale = "";
        el.style.translate = "";
        el.style.borderRadius = "";
      },
    });
  };

  // Swipe right anywhere on a screen that has a back button, as iOS now
  // lets you: the screen follows the finger and lets go past a third. Touch
  // only, because with a mouse a sideways drag is someone selecting text;
  // and not from inside a field, a photo or a sheet (`data-no-swipe`).
  const swipeBack = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || route.app === "home") return;
    if ((e.target as Element).closest("input, textarea, [data-no-swipe]")) return;
    const backs = screenRef.current?.querySelectorAll<HTMLButtonElement>("[data-back]");
    const back = backs?.[backs.length - 1];
    const view = back?.closest("section");
    if (!back || !view) return;
    const width = view.clientWidth;
    drag(e, {
      engage: (dx, dy) => dx > 0 && dx > Math.abs(dy) * 1.3,
      move: (dx) => {
        view.style.transition = "none";
        view.style.translate = `${Math.max(0, dx)}px 0`;
        view.style.boxShadow = "-16px 0 36px rgba(0, 0, 0, 0.5)";
      },
      end: ({ dx, vx }) => {
        const go = dx > width * 0.33 || vx > 0.45;
        view.style.transition = `translate ${BACK_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
        view.style.translate = go ? `${width}px 0` : "0px 0";
        window.setTimeout(() => {
          if (go) back.click();
          view.style.transition = "";
          view.style.translate = "";
          view.style.boxShadow = "";
        }, BACK_MS);
      },
    });
  };

  // A banner flicked up goes away without opening anything. `transform`,
  // because its arrival animation owns `translate`.
  const flickBanner = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    drag(e, {
      engage: (dx, dy) => dy < 0 && -dy > Math.abs(dx),
      move: (_dx, dy) => {
        el.style.transition = "none";
        el.style.transform = `translateY(${Math.min(0, dy)}px)`;
      },
      end: ({ dy, vy }) => {
        if (dy < -26 || vy < -0.3) {
          el.style.transition = "transform 0.22s cubic-bezier(0.4, 0, 1, 1)";
          el.style.transform = "translateY(-160%)";
          window.setTimeout(() => setBanner(null), 220);
          return;
        }
        el.style.transition = "transform 0.3s cubic-bezier(0.2, 1.2, 0.3, 1)";
        el.style.transform = "";
      },
    });
  };

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
        <div
          ref={screenRef}
          className={styles.screen}
          style={{ "--wallpaper": `url(${found.wallpaper})` } as React.CSSProperties}
          onPointerDown={swipeBack}
        >
          <span className={styles.osIsland} aria-hidden="true" />
          {st.screen === "charge" ? (
            <Charge onPlug={() => play.perform("plug")} />
          ) : (
            <>
              <StatusBar
                percent={battery(ep, s)}
                clock={clockNow(s, now)}
                charging={charging}
                wifi={has(s, "did:wifi-on")}
                bars={charging ? 3 : 2}
              />
              {st.screen === "lock" || st.screen === "relock" ? (
                <LockScreen state={s} mode={st.screen === "relock" ? "restart" : "first"} clock={clockNow(s, now)} />
              ) : (
                <>
                  {/* Home stays underneath an open app, the way it does on a
                      phone: pulling the app away shows it. */}
                  <Home state={s} nav={nav} unread={unread.size} covered={route.app !== "home"} />
                  {route.app !== "home" && (
                    <div ref={appRef} className={styles.appLayer}>
                      <App
                        key={`${route.app}:${route.arg ?? ""}`}
                        route={route}
                        state={s}
                        nav={nav}
                        unread={unread}
                        markRead={markRead}
                      />
                    </div>
                  )}
                  <button type="button" className={styles.homeBar} aria-label="Home" onClick={closeApp} onPointerDown={pullHome} />
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
              onPointerDown={flickBanner}
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

/** The phone's status bar: the clock, the signal, Wi-Fi once it's on, and
 *  the battery with its number inside, the way the phone draws it now. */
function StatusBar({
  percent,
  clock,
  charging,
  wifi,
  bars,
}: {
  percent: number;
  clock: string;
  charging: boolean;
  wifi: boolean;
  bars: number;
}) {
  // At 1–4% a true-width fill is a hairline; Episode 1 draws it generously.
  const width = Math.max(8, Math.min(100, charging ? percent : percent * 6));
  return (
    <div className={styles.status} aria-hidden="true">
      <span>{clock}</span>
      <span className={styles.statusIcons}>
        <svg viewBox="0 0 18 12" className={styles.signal}>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 4.6} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="0.9" opacity={i < bars ? 1 : 0.3} />
          ))}
        </svg>
        {wifi && (
          <svg viewBox="0 0 16 12" className={styles.wifi}>
            <path d="M8 11.2 5.7 8.9a3.3 3.3 0 0 1 4.6 0L8 11.2Z" />
            <path d="M3.6 6.8a6.2 6.2 0 0 1 8.8 0l-1.3 1.3a4.4 4.4 0 0 0-6.2 0L3.6 6.8Z" />
            <path d="M1.4 4.6a9.3 9.3 0 0 1 13.2 0l-1.3 1.3a7.5 7.5 0 0 0-10.6 0L1.4 4.6Z" />
          </svg>
        )}
        <span
          className={styles.battery}
          data-low={(!charging && percent <= 2) || undefined}
          data-charging={charging || undefined}
        >
          <span className={styles.cell}>
            <span className={styles.fill} style={{ width: `${width}%` }} />
            {/* Dark digits once the level is under them, as the phone does. */}
            <span className={styles.cellNum} data-dark={width >= 55 || undefined}>
              {percent}
            </span>
          </span>
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
