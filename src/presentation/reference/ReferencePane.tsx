import { useDeferredValue } from "react";
import styles from "./ReferencePane.module.css";

export type ReferenceEntry = {
  id: string;
  name: string;
  kindLabel: string;
};

type ReferencePaneProps = {
  query: string;
  entries: ReferenceEntry[];
  focusTitle: string | null;
  focusSummary: string | null;
  onQueryChange: (value: string) => void;
};

export function ReferencePane({
  query,
  entries,
  focusTitle,
  focusSummary,
  onQueryChange
}: ReferencePaneProps) {
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredEntries = normalizedQuery
    ? entries.filter((entry) => entry.name.toLowerCase().includes(normalizedQuery))
    : entries;

  return (
    <section className={styles.panel} data-testid="reference-pane">
      <h2 className={styles.heading}>Reference</h2>
      <input
        className={styles.search}
        data-testid="reference-search-input"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search materials, machines, recipes, or modes"
        value={query}
      />
      {focusTitle && focusSummary ? (
        <div className={styles.focusCard}>
          <h3>{focusTitle}</h3>
          <p>{focusSummary}</p>
        </div>
      ) : null}
      <div className={styles.list}>
        <h3>Bundled entries</h3>
        {filteredEntries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            <p className={styles.entryName}>{entry.name}</p>
            <p className={styles.entryMeta}>{entry.kindLabel}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
