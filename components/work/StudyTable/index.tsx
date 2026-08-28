import FigureLabel from "@/components/work/FigureLabel";
import type { StudyCaption, StudyTableRow } from "@/content/work";
import styles from "./StudyTable.module.css";

type Props = {
  columns: readonly [string, string];
  rows: readonly StudyTableRow[];
  caption: StudyCaption;
};

/**
 * Figma 761:13108 — the two-column comparison table, and the label under it.
 *
 * A real `<table>` rather than a grid of divs. It has a header row that names
 * what is under it and rows whose two cells only mean anything as a pair,
 * which is the definition of tabular data: a screen reader announcing "ML
 * capabilities, WHAT IT MEANT FOR DESIGN, Assistance could suggest…" is the
 * whole content of the figure, and a stack of divs cannot say that.
 *
 * The design's fixed row heights (56, with one row at 64 because its second
 * cell runs to two lines) are not transcribed. They are what Figma writes down
 * when a cell wraps; here the cell wraps on its own, at whatever width the
 * reader happens to be, and a fixed height would only be right at 1440.
 */
export default function StudyTable({ columns, rows, caption }: Props) {
  return (
    <figure className={styles.block}>
      <div className={styles.frame}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.head}>
              <th className={`${styles.cell} ${styles.term} ${styles.label}`} scope="col">
                {columns[0]}
              </th>
              <th className={`${styles.cell} ${styles.label}`} scope="col">
                {columns[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([term, meaning]) => (
              <tr key={term} className={styles.row}>
                {/* A row header, not a cell: the left column is the name of
                    the constraint the right column is about. */}
                <th className={`${styles.cell} ${styles.term}`} scope="row">
                  {term}
                </th>
                <td className={`${styles.cell} ${styles.meaning}`}>{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FigureLabel caption={caption} />
    </figure>
  );
}
