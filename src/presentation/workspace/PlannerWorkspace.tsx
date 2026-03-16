import { useMemo, useState } from "react";
import { useStore } from "zustand";
import type { PlannerStore } from "../../application/store/plannerStore";
import { selectSelectedNode } from "../../application/store/selectors";
import type { PortDefinition } from "../../domain/types";
import { getRotatedFootprintSize } from "../../domain/plan/geometry";
import { moveNode, placeNode } from "../../domain/plan/operations";
import { ConnectionLayer } from "./ConnectionLayer";
import {
  cellKey,
  GridLayer,
  GRID_CELL_GAP,
  GRID_CELL_SIZE,
  GRID_PADDING
} from "./GridLayer";
import { NodeLayer } from "./NodeLayer";
import { PlacementGhost } from "./PlacementGhost";
import styles from "./PlannerWorkspace.module.css";
import { usePlannerHotkeys } from "./usePlannerHotkeys";

type PlannerWorkspaceProps = {
  store: PlannerStore;
};

function nextRotation(rotation: 0 | 90 | 180 | 270) {
  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  return rotations[(rotations.indexOf(rotation) + 1) % rotations.length] ?? 0;
}

export function PlannerWorkspace({ store }: PlannerWorkspaceProps) {
  const plannerState = useStore(store);
  const selectedNode = useMemo(() => selectSelectedNode(plannerState), [plannerState]);
  const plan = plannerState.plan;
  const dataset = plannerState.dataset;
  const [pendingCatalogId, setPendingCatalogId] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{
    nodeId: string;
    portId: string;
  } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  const sitePreset = plan ? dataset.sitePresets[plan.siteConfig.sitePresetId] : null;
  const blockedCells = useMemo(() => {
    const cells = new Set<string>();

    if (!sitePreset) {
      return cells;
    }

    for (const zone of sitePreset.blockedZones) {
      for (let x = zone.x; x < zone.x + zone.width; x += 1) {
        for (let y = zone.y; y < zone.y + zone.height; y += 1) {
          cells.add(cellKey(x, y));
        }
      }
    }

    return cells;
  }, [sitePreset]);

  const catalogItems = Object.values(dataset.placeableItems);
  const portDefinitionsByNodeId = useMemo<Record<string, PortDefinition[]>>(
    () =>
      Object.fromEntries(
        Object.values(plan?.nodes ?? {}).map((node) => [
          node.id,
          dataset.placeableItems[node.catalogId]?.ports ?? []
        ])
      ),
    [dataset.placeableItems, plan?.nodes]
  );

  const ghostCandidate = useMemo(() => {
    if (!plan || !hoverCell || pendingConnection) {
      return null;
    }

    if (pendingCatalogId) {
      const preview = placeNode(plan, dataset, {
        nodeId: "__preview__",
        catalogId: pendingCatalogId,
        position: hoverCell
      });

      const item = dataset.placeableItems[pendingCatalogId];
      if (!item) {
        return null;
      }

      return {
        footprint: getRotatedFootprintSize(item.footprint, 0),
        position: hoverCell,
        valid: preview.ok
      };
    }

    if (selectedNode) {
      const preview = moveNode(plan, dataset, {
        nodeId: selectedNode.id,
        position: hoverCell
      });

      return {
        footprint: getRotatedFootprintSize(selectedNode.footprint, selectedNode.rotation),
        position: hoverCell,
        valid: preview.ok
      };
    }

    return null;
  }, [dataset, hoverCell, pendingCatalogId, pendingConnection, plan, selectedNode]);

  usePlannerHotkeys({
    canDelete: Boolean(selectedNode && plan),
    canRotate: Boolean(selectedNode && plan),
    onDelete: () => {
      if (selectedNode) {
        plannerState.commands.removeNode(selectedNode.id);
      }
    },
    onRotate: () => {
      if (!selectedNode) {
        return;
      }

      plannerState.commands.moveNode({
        nodeId: selectedNode.id,
        position: selectedNode.position,
        rotation: nextRotation(selectedNode.rotation)
      });
    }
  });

  if (!plan || !sitePreset) {
    return null;
  }

  const canvasWidth =
    sitePreset.width * GRID_CELL_SIZE + (sitePreset.width - 1) * GRID_CELL_GAP;
  const canvasHeight =
    sitePreset.height * GRID_CELL_SIZE + (sitePreset.height - 1) * GRID_CELL_GAP;

  return (
    <section className={styles.workspace} data-testid="planner-workspace">
      <div className={styles.controls}>
        <div className={styles.catalog}>
          {catalogItems.map((item) => (
            <button
              key={item.id}
              className={styles.catalogButton}
              data-active={pendingCatalogId === item.id}
              data-testid={`catalog-item:${item.id}`}
              onClick={() => {
                setPendingCatalogId(item.id);
                setPendingConnection(null);
                plannerState.commands.selectNode(null);
              }}
              type="button"
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className={styles.selectionActions}>
          <button
            className={styles.actionButton}
            onClick={() => {
              if (!selectedNode) {
                return;
              }

              plannerState.commands.moveNode({
                nodeId: selectedNode.id,
                position: selectedNode.position,
                rotation: nextRotation(selectedNode.rotation)
              });
            }}
            type="button"
          >
            Rotate
          </button>
          <button
            className={styles.actionButton}
            onClick={() => {
              if (selectedNode) {
                plannerState.commands.removeNode(selectedNode.id);
              }
            }}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>
      <p className={styles.hint}>
        Click a catalog item, then click the grid to place it. Select an existing node
        and click a new cell to move it. Click an output port, then an input port to
        author a connection. Press <strong>R</strong> to rotate or <strong>Delete</strong>{" "}
        to remove.
      </p>
      <div
        className={styles.canvas}
        style={{
          width: canvasWidth + GRID_PADDING * 2,
          minHeight: canvasHeight + GRID_PADDING * 2
        }}
      >
        <GridLayer
          blockedCells={blockedCells}
          height={sitePreset.height}
          onCellClick={(x, y) => {
            setPendingConnection(null);

            if (pendingCatalogId) {
              const result = placeNode(plan, dataset, {
                nodeId: `node-${Date.now()}`,
                catalogId: pendingCatalogId,
                position: { x, y }
              });

              if (result.ok) {
                plannerState.commands.placeNode({
                  nodeId: result.node.id,
                  catalogId: pendingCatalogId,
                  position: { x, y }
                });
                setPendingCatalogId(null);
              }
              return;
            }

            if (selectedNode) {
              plannerState.commands.moveNode({
                nodeId: selectedNode.id,
                position: { x, y }
              });
            }
          }}
          onCellHover={(x, y) => setHoverCell({ x, y })}
          onCellLeave={() => setHoverCell(null)}
          width={sitePreset.width}
        />
        <ConnectionLayer
          edges={Object.values(plan.edges)}
          height={canvasHeight}
          nodes={Object.values(plan.nodes)}
          onSelectEdge={(edgeId) => {
            plannerState.commands.disconnectEdge(edgeId);
            setPendingConnection(null);
          }}
          portDefinitionsByNodeId={portDefinitionsByNodeId}
          width={canvasWidth}
        />
        <NodeLayer
          nodes={Object.values(plan.nodes)}
          onSelectPort={(input) => {
            setPendingCatalogId(null);

            if (input.flow === "output") {
              setPendingConnection({
                nodeId: input.nodeId,
                portId: input.portId
              });
              return;
            }

            if (!pendingConnection) {
              return;
            }

            plannerState.commands.connectPorts({
              sourceNodeId: pendingConnection.nodeId,
              sourcePortId: pendingConnection.portId,
              targetNodeId: input.nodeId,
              targetPortId: input.portId
            });
            setPendingConnection(null);
          }}
          onSelectNode={(nodeId) => plannerState.commands.selectNode(nodeId)}
          pendingPortKey={
            pendingConnection ? `${pendingConnection.nodeId}:${pendingConnection.portId}` : null
          }
          portDefinitionsByNodeId={portDefinitionsByNodeId}
          selectedNodeId={plannerState.selection.selectedNodeId}
        />
        {ghostCandidate ? (
          <PlacementGhost
            footprint={ghostCandidate.footprint}
            position={ghostCandidate.position}
            valid={ghostCandidate.valid}
          />
        ) : null}
      </div>
    </section>
  );
}
