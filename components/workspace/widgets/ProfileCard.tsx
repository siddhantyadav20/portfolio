import Image from "next/image";
import { profile } from "@/content/workspace";
import styles from "./ProfileCard.module.css";

/**
 * The anchor of the board — the card the camera opens framed on, and the only
 * widget that has to be read rather than played with.
 *
 * Unlike the records, books and stickers, this *is* a surface of the page, so
 * it themes with the rest of the site rather than keeping a fixed colour.
 */
export default function ProfileCard() {
  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <Image
          src={profile.avatar}
          alt=""
          width={44}
          height={44}
          className={styles.avatar}
        />
        <div>
          <h2 className={styles.name}>{profile.name}</h2>
          <p className={styles.role}>{profile.role}</p>
        </div>
      </header>

      <div className={styles.body}>
        {profile.body.map((p) => (
          <p key={p} className={styles.para}>
            {p}
          </p>
        ))}
      </div>

      <div className={styles.actions}>
        {profile.actions.map((a) => (
          <span key={a.label} className={styles.action}>
            {a.badge && <span className={styles.badge}>{a.badge}</span>}
            <span
              className="inkIcon"
              style={{
                ["--icon" as string]: `url(/icons/${a.icon}.svg)`,
                width: 16,
                height: 16,
              }}
            />
            {a.label}
          </span>
        ))}
      </div>

      <div className={styles.updates}>
        <h3 className={styles.updatesLabel}>{profile.updatesLabel}</h3>
        <ul className={styles.list}>
          {profile.updates.map((u) => (
            <li key={u.text} className={styles.update}>
              <span className={styles.dot} aria-hidden="true" />
              <span>
                <span className={styles.updateText}>{u.text}</span>
                <span className={styles.when}>{u.when}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
