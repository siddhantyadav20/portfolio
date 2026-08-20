import styles from "./TokenAnatomy.module.css";

/**
 * What a composed token is made of, taken apart.
 *
 * The claim in the prose beside this — that the library is a graph and not a
 * palette — is the one readers are most likely to nod at and not believe. So
 * the two examples are drawn at full size with their ingredients listed:
 * `shadow/card` is two stacked effects over eight numeric primitives, and `h1`
 * is a font built from four. Change `shadow/12%` and every card in twelve
 * products re-rules; change `h1/line-height` and every page's first line
 * re-sets.
 *
 * Static, and no client JavaScript: this is a specimen, not an instrument.
 * The values are the library's, copied here as literals — the point is being
 * able to check them against the file.
 */
export default function TokenAnatomy() {
  return (
    <div className={styles.anatomy}>
      <figure className={styles.cell}>
        <div className={styles.stage}>
          <span className={styles.paper} />
        </div>
        <figcaption className={styles.recipe}>
          <p className={styles.token}>shadow/card</p>
          <ul className={styles.parts}>
            <li>
              <span className={styles.swatch} data-swatch="12" />
              shadow/12% <b>#919eab1f</b> · 0 12 24 −4
            </li>
            <li>
              <span className={styles.swatch} data-swatch="20" />
              shadow/20% <b>#919eab33</b> · 0 0 2 0
            </li>
          </ul>
          <p className={styles.note}>
            Two effects, eight primitives, one name. The dark mode swaps only
            the two colours — the geometry is shared.
          </p>
        </figcaption>
      </figure>

      <figure className={styles.cell}>
        <div className={styles.stage}>
          <span className={styles.specimen} aria-hidden="true">
            Aa
          </span>
        </div>
        <figcaption className={styles.recipe}>
          <p className={styles.token}>h1</p>
          <ul className={styles.parts}>
            <li>
              h1/size <b>64</b> · h1/line-height <b>80</b>
            </li>
            <li>
              h1/weight <b>800</b> · h1/letter-spacing <b>0</b>
            </li>
          </ul>
          <p className={styles.note}>
            The type styles hold no numbers of their own. Every one of them is
            assembled from four variables, which is what makes a scale change a
            single edit instead of eleven.
          </p>
        </figcaption>
      </figure>
    </div>
  );
}
