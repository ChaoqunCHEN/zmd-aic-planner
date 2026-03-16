import type { PlanNode } from "../../domain/plan/document";
import styles from "./ConnectionLayer.module.css";

type ConnectionLayerProps = {
  nodes: PlanNode[];
};

export function ConnectionLayer({ nodes }: ConnectionLayerProps) {
  return (
    <svg className={styles.layer} viewBox="0 0 100 100" preserveAspectRatio="none">
      {nodes.length === 0 ? null : <title>Connection overlay</title>}
    </svg>
  );
}
