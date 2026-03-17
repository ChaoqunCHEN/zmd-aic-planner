import { useMemo, useState } from "react";
import { useStore } from "zustand";
import type { PlannerStore } from "../../application/store/plannerStore";
import { selectSelectedNode } from "../../application/store/selectors";
import type { PlaceableItem, PlannerCategory, PortDefinition } from "../../domain/types";
import { getRotatedFootprintSize } from "../../domain/plan/geometry";
import { connectPorts, moveNode, placeNode } from "../../domain/plan/operations";
import { ConnectionLayer } from "./ConnectionLayer";
import { cellKey, GridLayer } from "./GridLayer";
import { NodeLayer } from "./NodeLayer";
import { PlacementGhost } from "./PlacementGhost";
import styles from "./PlannerWorkspace.module.css";
import { usePlannerHotkeys } from "./usePlannerHotkeys";
import { getCanvasPixelSize, resolveIconSource } from "./workspaceLayout";

type PlannerWorkspaceProps = {
  store: PlannerStore;
};

function nextRotation(rotation: 0 | 90 | 180 | 270) {
  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  return rotations[(rotations.indexOf(rotation) + 1) % rotations.length] ?? 0;
}

function previousRotation(rotation: 0 | 90 | 180 | 270) {
  const rotations: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  return rotations[(rotations.indexOf(rotation) + rotations.length - 1) % rotations.length] ?? 0;
}

const PLANNER_CATEGORIES: PlannerCategory[] = [
  "machines",
  "logistics",
  "storage",
  "utilities"
];

const PLANNER_CATEGORY_LABELS: Record<PlannerCategory, string> = {
  machines: "机器",
  logistics: "物流",
  storage: "仓储",
  utilities: "设施"
};

export function PlannerWorkspace({ store }: PlannerWorkspaceProps) {
  const plannerState = useStore(store);
  const selectedNode = useMemo(() => selectSelectedNode(plannerState), [plannerState]);
  const plan = plannerState.plan;
  const dataset = plannerState.dataset;
  const [pendingCatalogId, setPendingCatalogId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<PlannerCategory, boolean>>({
    machines: true,
    logistics: true,
    storage: true,
    utilities: true
  });
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

  const catalogItemsByCategory = useMemo(() => {
    const grouped = {
      machines: [] as PlaceableItem[],
      logistics: [] as PlaceableItem[],
      storage: [] as PlaceableItem[],
      utilities: [] as PlaceableItem[]
    };

    for (const item of Object.values(dataset.placeableItems)) {
      grouped[item.plannerCategory].push(item);
    }

    for (const category of PLANNER_CATEGORIES) {
      grouped[category].sort((a, b) => {
        if (a.availabilityStatus !== b.availabilityStatus) {
          return a.availabilityStatus === "validated" ? -1 : 1;
        }

        return a.nameZhHans.localeCompare(b.nameZhHans, "zh-Hans");
      });
    }

    return grouped;
  }, [dataset.placeableItems]);

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

  const canvasSize = getCanvasPixelSize({
    width: sitePreset.width,
    height: sitePreset.height
  });

  return (
    <section className={styles.workspace} data-testid="planner-workspace">
      <div className={styles.controls}>
        <div className={styles.catalog}>
          {PLANNER_CATEGORIES.map((category) => {
            const isExpanded = expandedCategories[category];
            const items = catalogItemsByCategory[category];

            return (
              <section
                className={styles.catalogCategory}
                data-testid={`catalog-category:${category}`}
                key={category}
              >
                <button
                  aria-expanded={isExpanded}
                  className={styles.categoryToggle}
                  data-testid={`catalog-category-toggle:${category}`}
                  onClick={() =>
                    setExpandedCategories((current) => ({
                      ...current,
                      [category]: !current[category]
                    }))
                  }
                  type="button"
                >
                  <span>{PLANNER_CATEGORY_LABELS[category]}</span>
                </button>
                {isExpanded ? (
                  <div className={styles.catalogRail} data-testid={`catalog-rail:${category}`}>
                    {items.map((item) => {
                      const disabled = item.availabilityStatus !== "validated";
                      const iconSource = resolveIconSource(item.icon);

                      return (
                        <button
                          key={item.id}
                          className={styles.catalogButton}
                          data-active={pendingCatalogId === item.id}
                          data-disabled={disabled}
                          data-testid={`catalog-item:${item.id}`}
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) {
                              return;
                            }

                            setPendingCatalogId(item.id);
                            setPendingConnection(null);
                            plannerState.commands.selectNode(null);
                          }}
                          type="button"
                        >
                          <span className={styles.catalogIconWrap} data-testid={`catalog-icon:${item.id}`}>
                            {iconSource ? (
                              <img alt="" className={styles.catalogIcon} src={iconSource} />
                            ) : (
                              <span aria-hidden className={styles.catalogFallbackIcon}>
                                {item.nameZhHans.slice(0, 1)}
                              </span>
                            )}
                          </span>
                          <span className={styles.catalogLabel}>{item.nameZhHans}</span>
                          <span
                            className={styles.catalogItemState}
                            data-testid={`catalog-item-state:${item.id}`}
                          >
                            {disabled ? "仅参考" : "可放置"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
        <div className={styles.selectionActions}>
          <button
            className={styles.actionButton}
            data-testid="rotate-left-button"
            disabled={!selectedNode}
            onClick={() => {
              if (!selectedNode) {
                return;
              }

              plannerState.commands.moveNode({
                nodeId: selectedNode.id,
                position: selectedNode.position,
                rotation: previousRotation(selectedNode.rotation)
              });
            }}
            type="button"
          >
            Rotate Left
          </button>
          <button
            className={styles.actionButton}
            data-testid="rotate-right-button"
            disabled={!selectedNode}
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
            Rotate Right
          </button>
          <button
            className={styles.actionButton}
            data-testid="delete-node-button"
            disabled={!selectedNode}
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
        Click a validated catalog item to place it. Reference-only records remain visible
        for browsing. Select an existing node and click a new cell to move it. Click an
        output port, then a touching input port that faces it to author a connection.
        Press <strong>R</strong> for clockwise rotate or <strong>Delete</strong> to remove.
      </p>
      <div
        className={styles.canvas}
        style={{
          width: canvasSize.width,
          minHeight: canvasSize.height
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
          height={canvasSize.height}
          nodes={Object.values(plan.nodes)}
          onSelectEdge={(edgeId) => {
            plannerState.commands.disconnectEdge(edgeId);
            setPendingConnection(null);
          }}
          portDefinitionsByNodeId={portDefinitionsByNodeId}
          width={canvasSize.width}
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

            const connectionPreview = connectPorts(plan, dataset, {
              sourceNodeId: pendingConnection.nodeId,
              sourcePortId: pendingConnection.portId,
              targetNodeId: input.nodeId,
              targetPortId: input.portId
            });
            if (!connectionPreview.ok) {
              setPendingConnection(null);
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
          placeableItemsById={dataset.placeableItems}
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
