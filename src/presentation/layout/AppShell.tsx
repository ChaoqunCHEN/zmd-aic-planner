import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

type AppShellProps = {
  toolbar: ReactNode;
  workbench: ReactNode;
};

export function AppShell({ toolbar, workbench }: AppShellProps) {
  return (
    <main className={styles.shell} data-state="ready" data-testid="app-shell">
      <header className={styles.masthead}>
        <div>
          <p className={styles.eyebrow} data-testid="unofficial-label">
            Unofficial Arknights: Endfield project
          </p>
          <h1 className={styles.title}>AIC Planner</h1>
          <p className={styles.summary}>
            Plan realistic site layouts, inspect diagnostics, and browse the bundled
            reference data without leaving the workbench.
          </p>
        </div>
        <aside className={styles.onboarding}>
          Seed data is bundled locally for the MVP. Start from a site preset, place a
          few machines, and use the diagnostics rail to understand what still needs
          wiring or configuration.
        </aside>
      </header>
      {toolbar}
      {workbench}
    </main>
  );
}
