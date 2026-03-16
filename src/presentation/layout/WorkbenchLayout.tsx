import type { ReactNode } from "react";
import styles from "./WorkbenchLayout.module.css";

type WorkbenchLayoutProps = {
  workspace: ReactNode;
  inspector: ReactNode;
  diagnostics: ReactNode;
  referencePane: ReactNode;
};

export function WorkbenchLayout({
  workspace,
  inspector,
  diagnostics,
  referencePane
}: WorkbenchLayoutProps) {
  return (
    <section className={styles.layout}>
      <div className={styles.workspaceColumn}>{workspace}</div>
      <div className={styles.sideColumn}>
        {inspector}
        {diagnostics}
      </div>
      <div className={styles.referenceColumn}>{referencePane}</div>
    </section>
  );
}
