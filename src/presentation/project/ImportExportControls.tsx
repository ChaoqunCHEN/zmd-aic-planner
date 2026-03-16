import { useRef } from "react";
import styles from "./ImportExportControls.module.css";

type ImportExportControlsProps = {
  errors: { code: string; message: string }[];
  onExport: () => void;
  onImport: (serialized: string) => void;
  warnings: { code: string; message: string }[];
};

export function ImportExportControls({
  errors,
  onExport,
  onImport,
  warnings
}: ImportExportControlsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className={styles.controls}>
      <button
        className={styles.button}
        data-testid="export-project-button"
        onClick={onExport}
        type="button"
      >
        Export JSON
      </button>
      <button
        className={styles.button}
        data-testid="import-project-button"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        Import JSON
      </button>
      <input
        ref={inputRef}
        className={styles.hiddenInput}
        data-testid="import-project-input"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          onImport(await file.text());
          event.target.value = "";
        }}
        type="file"
      />
      {warnings.length > 0 || errors.length > 0 ? (
        <div className={styles.notices}>
          {warnings.map((warning) => (
            <p key={`${warning.code}:${warning.message}`} className={styles.warning}>
              {warning.message}
            </p>
          ))}
          {errors.map((error) => (
            <p key={`${error.code}:${error.message}`} className={styles.error}>
              {error.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
