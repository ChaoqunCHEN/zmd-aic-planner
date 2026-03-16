import type { PortDefinition } from "../../domain/types";
import { getRotatedFootprintSize } from "../../domain/plan/geometry";
import type { PlanNode } from "../../domain/plan/document";
import {
  GRID_CELL_GAP,
  GRID_CELL_SIZE
} from "./GridLayer";
import styles from "./NodeLayer.module.css";

type NodeLayerProps = {
  nodes: PlanNode[];
  portDefinitionsByNodeId: Record<string, PortDefinition[]>;
  pendingPortKey: string | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onSelectPort: (input: { nodeId: string; portId: string; flow: "input" | "output" }) => void;
};

export function NodeLayer({
  nodes,
  portDefinitionsByNodeId,
  pendingPortKey,
  selectedNodeId,
  onSelectNode,
  onSelectPort
}: NodeLayerProps) {
  return (
    <div className={styles.layer}>
      {nodes.map((node) => {
        const footprint = getRotatedFootprintSize(node.footprint, node.rotation);
        const width = footprint.width * GRID_CELL_SIZE + (footprint.width - 1) * GRID_CELL_GAP;
        const height = footprint.height * GRID_CELL_SIZE + (footprint.height - 1) * GRID_CELL_GAP;
        const ports = portDefinitionsByNodeId[node.id] ?? [];

        return (
          <div
            key={node.id}
            className={`${styles.node} ${selectedNodeId === node.id ? styles.selected : ""}`}
            style={{
              left: node.position.x * (GRID_CELL_SIZE + GRID_CELL_GAP),
              top: node.position.y * (GRID_CELL_SIZE + GRID_CELL_GAP),
              width,
              height,
            }}
          >
            <button
              className={styles.nodeButton}
              data-testid={`plan-node:${node.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectNode(node.id);
              }}
              style={{
                transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined
              }}
              type="button"
            >
              {node.id}
            </button>
            {ports.map((port, index) => {
              const left = port.flow === "input" ? 0 : width;
              const top = ((index + 1) / (ports.length + 1)) * height;
              const portKey = `${node.id}:${port.id}`;

              return (
                <button
                  key={port.id}
                  className={`${styles.port} ${pendingPortKey === portKey ? styles.armedPort : ""}`}
                  data-testid={`port:${node.id}:${port.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectPort({
                      nodeId: node.id,
                      portId: port.id,
                      flow: port.flow
                    });
                  }}
                  style={{ left, top }}
                  type="button"
                >
                  {port.id}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
