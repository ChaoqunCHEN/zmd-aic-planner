import type { ReactNode } from "react";
import styles from "./ProjectToolbar.module.css";

type ProjectToolbarProps = {
  projectName: string;
  onNewProject: () => void;
  onExport: () => void;
  onImport: () => void;
  actionSlot?: ReactNode;
};

export function ProjectToolbar({
  projectName,
  onNewProject,
  onExport,
  onImport,
  actionSlot
}: ProjectToolbarProps) {
  return (
    <section className={styles.toolbar} data-testid="project-toolbar">
      <div className={styles.meta}>
        <p className={styles.label}>Current Project</p>
        <h2 className={styles.name}>{projectName}</h2>
      </div>
      <div className={styles.actions}>
        <button className={styles.button} data-testid="new-project-button" onClick={onNewProject} type="button">
          New Project
        </button>
        {actionSlot ?? (
          <>
            <button className={styles.button} data-testid="export-project-button" onClick={onExport} type="button">
              Export JSON
            </button>
            <button className={styles.button} data-testid="import-project-button" onClick={onImport} type="button">
              Import JSON
            </button>
          </>
        )}
      </div>
    </section>
  );
}
