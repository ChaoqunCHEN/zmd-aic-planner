import { useDeferredValue } from "react";
import styles from "./ReferencePane.module.css";

export type ReferenceEntry = {
  id: string;
  name: string;
  secondaryName?: string | null;
  kindLabel: string;
  iconUrl?: string | null;
  iconLabel: string;
  searchText: string;
  statusLabel?: string | null;
  statusDetail?: string | null;
};

type ReferencePaneProps = {
  query: string;
  entries: ReferenceEntry[];
  focusTitle: string | null;
  focusSecondaryTitle?: string | null;
  focusSummary: string | null;
  focusIconUrl?: string | null;
  focusIconLabel?: string | null;
  focusStatusLabel?: string | null;
  focusStatusDetail?: string | null;
  focusFacts?: string[];
  onQueryChange: (value: string) => void;
};

export function ReferencePane({
  query,
  entries,
  focusTitle,
  focusSecondaryTitle,
  focusSummary,
  focusIconUrl,
  focusIconLabel,
  focusStatusLabel,
  focusStatusDetail,
  focusFacts = [],
  onQueryChange
}: ReferencePaneProps) {
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredEntries = normalizedQuery
    ? entries.filter((entry) => entry.searchText.includes(normalizedQuery))
    : entries;

  return (
    <section className={styles.panel} data-testid="reference-pane">
      <h2 className={styles.heading}>Reference</h2>
      <input
        className={styles.search}
        data-testid="reference-search-input"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="搜索中文名、English 名称、分类或 ID"
        value={query}
      />
      {focusTitle && focusSummary ? (
        <div className={styles.focusCard}>
          <div className={styles.focusHeader}>
            <span className={styles.iconWrap}>
              {focusIconUrl ? (
                <img alt="" className={styles.icon} src={focusIconUrl} />
              ) : (
                <span aria-hidden className={styles.fallbackIcon}>
                  {focusIconLabel}
                </span>
              )}
            </span>
            <div className={styles.focusIdentity}>
              <h3>{focusTitle}</h3>
              {focusSecondaryTitle ? (
                <p className={styles.secondaryText}>{focusSecondaryTitle}</p>
              ) : null}
              {focusStatusLabel ? (
                <p className={styles.statusText}>
                  {focusStatusLabel}
                  {focusStatusDetail ? ` · ${focusStatusDetail}` : ""}
                </p>
              ) : null}
            </div>
          </div>
          <p>{focusSummary}</p>
          {focusFacts.length > 0 ? (
            <ul className={styles.factList}>
              {focusFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className={styles.list}>
        <h3>内置资料</h3>
        {filteredEntries.map((entry) => (
          <div key={entry.id} className={styles.entry}>
            <span className={styles.iconWrap}>
              {entry.iconUrl ? (
                <img alt="" className={styles.icon} src={entry.iconUrl} />
              ) : (
                <span aria-hidden className={styles.fallbackIcon}>
                  {entry.iconLabel}
                </span>
              )}
            </span>
            <div className={styles.entryBody}>
              <p className={styles.entryName}>{entry.name}</p>
              {entry.secondaryName ? (
                <p className={styles.secondaryText}>{entry.secondaryName}</p>
              ) : null}
              <p className={styles.entryMeta}>
                {entry.kindLabel}
                {entry.statusLabel ? ` · ${entry.statusLabel}` : ""}
              </p>
              {entry.statusDetail ? (
                <p className={styles.statusText}>{entry.statusDetail}</p>
              ) : null}
            </div>
          </div>
        ))}
        {filteredEntries.length === 0 ? (
          <p className={styles.empty}>没有匹配的资料。</p>
        ) : null}
      </div>
    </section>
  );
}
