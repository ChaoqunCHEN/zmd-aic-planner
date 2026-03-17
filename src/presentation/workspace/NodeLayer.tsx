import type { CSSProperties } from "react";
import type { PlanNode } from "../../domain/plan/document";
import type { PlaceableItem, PortDefinition } from "../../domain/types";
import {
  getNodePixelBounds,
  getNodePortLocalAnchor,
  resolveIconSource
} from "./workspaceLayout";
import styles from "./NodeLayer.module.css";

type NodeLayerProps = {
  nodes: PlanNode[];
  placeableItemsById: Readonly<Record<string, PlaceableItem>>;
  portDefinitionsByNodeId: Record<string, PortDefinition[]>;
  pendingPortKey: string | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onSelectPort: (input: { nodeId: string; portId: string; flow: "input" | "output" }) => void;
};

export function NodeLayer({
  nodes,
  placeableItemsById,
  portDefinitionsByNodeId,
  pendingPortKey,
  selectedNodeId,
  onSelectNode,
  onSelectPort
}: NodeLayerProps) {
  return (
    <div className={styles.layer}>
      {nodes.map((node) => {
        const nodeBounds = getNodePixelBounds(node);
        const ports = portDefinitionsByNodeId[node.id] ?? [];
        const catalogItem = placeableItemsById[node.catalogId];
        const iconSource = resolveIconSource(catalogItem?.icon);
        const nodeLabel = catalogItem?.nameZhHans ?? catalogItem?.name ?? node.catalogId;
        const fallbackGlyph = nodeLabel.slice(0, 1);

        return (
          <div
            key={node.id}
            className={`${styles.node} ${selectedNodeId === node.id ? styles.selected : ""}`}
            data-testid={`plan-node-shell:${node.id}`}
            style={{
              left: nodeBounds.left,
              top: nodeBounds.top,
              width: nodeBounds.width,
              height: nodeBounds.height
            }}
          >
            <button
              aria-label={nodeLabel}
              className={styles.nodeButton}
              data-testid={`plan-node:${node.id}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectNode(node.id);
              }}
              title={nodeLabel}
              type="button"
            >
              <span className={styles.nodeIconWrap} data-testid={`plan-node-icon:${node.id}`}>
                {iconSource ? (
                  <img alt="" className={styles.nodeIcon} src={iconSource} />
                ) : (
                  <span aria-hidden className={styles.fallbackIcon}>
                    {fallbackGlyph}
                  </span>
                )}
              </span>
            </button>
            {ports.map((port) => {
              const anchor = getNodePortLocalAnchor(node, port);
              const portKey = `${node.id}:${port.id}`;
              const portDirectionLabel = port.flow === "input" ? "input" : "output";
              const portLabel = `${nodeLabel} ${portDirectionLabel} port ${port.id}`;
              const style = {
                left: anchor.x,
                top: anchor.y,
                ["--port-rotation" as string]: `${anchor.rotation}deg`
              } as CSSProperties;

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
                  aria-label={portLabel}
                  style={style}
                  title={portLabel}
                  type="button"
                >
                  <span aria-hidden className={styles.portGlyph} />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
