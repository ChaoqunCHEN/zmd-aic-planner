import { getRotatedFootprintSize } from "../../domain/plan/geometry";
import type { PlanNode } from "../../domain/plan/document";
import {
  GRID_CELL_GAP,
  GRID_CELL_SIZE
} from "./GridLayer";
import styles from "./NodeLayer.module.css";

type NodeLayerProps = {
  nodes: PlanNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

export function NodeLayer({ nodes, selectedNodeId, onSelectNode }: NodeLayerProps) {
  return (
    <div className={styles.layer}>
      {nodes.map((node) => {
        const footprint = getRotatedFootprintSize(node.footprint, node.rotation);
        const width = footprint.width * GRID_CELL_SIZE + (footprint.width - 1) * GRID_CELL_GAP;
        const height = footprint.height * GRID_CELL_SIZE + (footprint.height - 1) * GRID_CELL_GAP;

        return (
          <button
            key={node.id}
            className={`${styles.node} ${selectedNodeId === node.id ? styles.selected : ""}`}
            data-testid={`plan-node:${node.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelectNode(node.id);
            }}
            style={{
              left: node.position.x * (GRID_CELL_SIZE + GRID_CELL_GAP),
              top: node.position.y * (GRID_CELL_SIZE + GRID_CELL_GAP),
              width,
              height,
              transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined
            }}
            type="button"
          >
            {node.id}
          </button>
        );
      })}
    </div>
  );
}
