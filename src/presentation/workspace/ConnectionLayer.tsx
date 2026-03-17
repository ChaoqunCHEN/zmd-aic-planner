import type { PortDefinition } from "../../domain/types";
import type { PlanEdge, PlanNode } from "../../domain/plan/document";
import { getNodePortAnchor } from "./workspaceLayout";
import styles from "./ConnectionLayer.module.css";

type ConnectionLayerProps = {
  nodes: PlanNode[];
  edges: PlanEdge[];
  portDefinitionsByNodeId: Record<string, PortDefinition[]>;
  onSelectEdge: (edgeId: string) => void;
  width?: number;
  height?: number;
};

export function ConnectionLayer({
  nodes,
  edges,
  portDefinitionsByNodeId,
  onSelectEdge,
  width = 100,
  height = 100
}: ConnectionLayerProps) {
  const nodeMap = Object.fromEntries(nodes.map((node) => [node.id, node]));

  return (
    <svg
      className={styles.layer}
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      {nodes.length === 0 ? null : <title>Connection overlay</title>}
      {edges.map((edge) => {
        const sourceNode = nodeMap[edge.sourceNodeId];
        const targetNode = nodeMap[edge.targetNodeId];
        const sourcePorts = portDefinitionsByNodeId[edge.sourceNodeId] ?? [];
        const targetPorts = portDefinitionsByNodeId[edge.targetNodeId] ?? [];
        const sourcePortIndex = sourcePorts.findIndex((port) => port.id === edge.sourcePortId);
        const targetPortIndex = targetPorts.findIndex((port) => port.id === edge.targetPortId);
        const sourcePort = sourcePorts[sourcePortIndex];
        const targetPort = targetPorts[targetPortIndex];

        if (
          !sourceNode ||
          !targetNode ||
          !sourcePort ||
          !targetPort ||
          sourcePortIndex === -1 ||
          targetPortIndex === -1
        ) {
          return null;
        }

        const start = getNodePortAnchor(sourceNode, sourcePort);
        const end = getNodePortAnchor(targetNode, targetPort);

        return (
          <g key={edge.id}>
            <line className={styles.edge} x1={start.x} x2={end.x} y1={start.y} y2={end.y} />
            <line
              className={styles.hitArea}
              data-testid={`plan-edge:${edge.id}`}
              onClick={() => onSelectEdge(edge.id)}
              x1={start.x}
              x2={end.x}
              y1={start.y}
              y2={end.y}
            />
          </g>
        );
      })}
    </svg>
  );
}
