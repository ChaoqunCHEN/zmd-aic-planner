import type { RecentProject } from "../../application/store/plannerStore";
import styles from "./RecentProjectsPanel.module.css";

type RecentProjectsPanelProps = {
  activeStorageKey: string | null;
  projects: RecentProject[];
  onOpenProject: (storageKey: string) => void;
};

export function RecentProjectsPanel({
  activeStorageKey,
  projects,
  onOpenProject
}: RecentProjectsPanelProps) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.heading}>Recent Projects</h2>
      <div className={styles.list} data-testid="recent-projects-list">
        {projects.length === 0 ? (
          <p className={styles.empty}>Autosaved projects will appear here after your first save.</p>
        ) : (
          projects.map((project) => (
            <button
              key={project.storageKey}
              className={styles.projectButton}
              data-active={project.storageKey === activeStorageKey}
              data-testid={`recent-project:${project.storageKey}`}
              onClick={() => onOpenProject(project.storageKey)}
              type="button"
            >
              <span>{project.name}</span>
              <span className={styles.meta}>{project.updatedAt}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
