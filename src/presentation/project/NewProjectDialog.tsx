import { useEffect, useState } from "react";
import type { SitePreset } from "../../domain/types";
import styles from "./NewProjectDialog.module.css";

type NewProjectDialogProps = {
  open: boolean;
  presets: SitePreset[];
  onCreate: (input: { sitePresetId: string; name: string }) => void;
  onClose: () => void;
};

export function NewProjectDialog({
  open,
  presets,
  onCreate,
  onClose
}: NewProjectDialogProps) {
  const [name, setName] = useState("Training Yard Draft");
  const [sitePresetId, setSitePresetId] = useState(presets[0]?.id ?? "");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("Training Yard Draft");
    setSitePresetId(presets[0]?.id ?? "");
  }, [open, presets]);

  if (!open) {
    return null;
  }

  return (
    <div className={styles.scrim}>
      <section className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Create New Project</h2>
          <button className={styles.closeButton} onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Project name</span>
          <input
            className={styles.input}
            data-testid="new-project-name-input"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Site preset</span>
          <select
            className={styles.input}
            data-testid="site-preset-select"
            onChange={(event) => setSitePresetId(event.target.value)}
            value={sitePresetId}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className={styles.submitButton}
          data-testid="create-project-submit"
          onClick={() => {
            onCreate({
              sitePresetId,
              name
            });
          }}
          type="button"
        >
          Create Project
        </button>
      </section>
    </div>
  );
}
