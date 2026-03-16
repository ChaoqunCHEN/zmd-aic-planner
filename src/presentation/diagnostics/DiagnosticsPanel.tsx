import type { Diagnostic } from "../../domain/diagnostics/types";
import styles from "./DiagnosticsPanel.module.css";

type DiagnosticsPanelProps = {
  diagnostics: Diagnostic[];
  selectedDiagnosticId: string | null;
  onSelectDiagnostic: (diagnosticId: string) => void;
};

export function DiagnosticsPanel({
  diagnostics,
  selectedDiagnosticId,
  onSelectDiagnostic
}: DiagnosticsPanelProps) {
  return (
    <section className={styles.panel} data-testid="diagnostics-panel">
      <h2 className={styles.heading}>Diagnostics</h2>
      {diagnostics.length === 0 ? (
        <p className={styles.empty}>No diagnostics yet. Start placing nodes to evaluate the layout.</p>
      ) : (
        <div className={styles.list}>
          {diagnostics.map((diagnostic) => (
            <button
              key={diagnostic.id}
              className={`${styles.item} ${selectedDiagnosticId === diagnostic.id ? styles.selected : ""}`}
              data-testid={`diagnostic-item:${diagnostic.code}`}
              onClick={() => onSelectDiagnostic(diagnostic.id)}
              type="button"
            >
              <p className={styles.code}>{diagnostic.code}</p>
              <p className={styles.message}>{diagnostic.message}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
