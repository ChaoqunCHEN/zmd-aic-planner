import type { DatasetBundle, PortDefinition } from "../types";
import type { Diagnostic } from "../diagnostics/types";
import { createDiagnosticId } from "../diagnostics/types";
import type { PlanDocument, PlanEdge } from "../plan/document";

export type ConnectionState = {
  diagnostics: Diagnostic[];
  validEdgeIds: Set<string>;
  inboundByPort: Map<string, PlanEdge[]>;
  outboundByPort: Map<string, PlanEdge[]>;
};

function portKey(nodeId: string, portId: string) {
  return `${nodeId}:${portId}`;
}

function getPortDefinition(
  dataset: DatasetBundle,
  plan: PlanDocument,
  nodeId: string,
  portId: string
): PortDefinition | null {
  const node = plan.nodes[nodeId];

  if (!node) {
    return null;
  }

  const item = dataset.placeableItems[node.catalogId];
  return item?.ports.find((port) => port.id === portId) ?? null;
}

export function buildConnectionState(plan: PlanDocument, dataset: DatasetBundle): ConnectionState {
  const diagnostics: Diagnostic[] = [];
  const validEdgeIds = new Set<string>();
  const inboundByPort = new Map<string, PlanEdge[]>();
  const outboundByPort = new Map<string, PlanEdge[]>();

  let index = 0;

  for (const edge of Object.values(plan.edges)) {
    const sourcePort = getPortDefinition(dataset, plan, edge.sourceNodeId, edge.sourcePortId);
    const targetPort = getPortDefinition(dataset, plan, edge.targetNodeId, edge.targetPortId);

    const sourceKey = portKey(edge.sourceNodeId, edge.sourcePortId);
    const targetKey = portKey(edge.targetNodeId, edge.targetPortId);

    outboundByPort.set(sourceKey, [...(outboundByPort.get(sourceKey) ?? []), edge]);
    inboundByPort.set(targetKey, [...(inboundByPort.get(targetKey) ?? []), edge]);

    if (!sourcePort || !targetPort) {
      diagnostics.push({
        id: createDiagnosticId("connection.port-missing", index++),
        severity: "error",
        code: "connection.port-missing",
        message: `Edge "${edge.id}" references a port that no longer exists.`,
        subjectRefs: [{ kind: "edge", edgeId: edge.id }],
        remediation: "Reconnect the edge to valid ports."
      });
      continue;
    }

    if (sourcePort.flow !== "output" || targetPort.flow !== "input") {
      diagnostics.push({
        id: createDiagnosticId("connection.invalid-direction", index++),
        severity: "error",
        code: "connection.invalid-direction",
        message: `Edge "${edge.id}" must connect an output port to an input port.`,
        subjectRefs: [
          { kind: "edge", edgeId: edge.id },
          { kind: "port", nodeId: edge.sourceNodeId, portId: edge.sourcePortId },
          { kind: "port", nodeId: edge.targetNodeId, portId: edge.targetPortId }
        ],
        remediation: "Start the link from an output and end it on a compatible input."
      });
      continue;
    }

    const compatible = sourcePort.resourceIds.some((resourceId) =>
      targetPort.resourceIds.includes(resourceId)
    );

    if (!compatible) {
      diagnostics.push({
        id: createDiagnosticId("connection.resource-mismatch", index++),
        severity: "error",
        code: "connection.resource-mismatch",
        message: `Edge "${edge.id}" links ports that do not share a compatible resource.`,
        subjectRefs: [
          { kind: "edge", edgeId: edge.id },
          { kind: "port", nodeId: edge.sourceNodeId, portId: edge.sourcePortId },
          { kind: "port", nodeId: edge.targetNodeId, portId: edge.targetPortId }
        ],
        remediation: "Reconnect the edge between ports that support the same resource."
      });
      continue;
    }

    validEdgeIds.add(edge.id);
  }

  for (const node of Object.values(plan.nodes)) {
    const item = dataset.placeableItems[node.catalogId];
    if (!item) {
      continue;
    }

    for (const port of item.ports) {
      const key = portKey(node.id, port.id);
      const inbound = (inboundByPort.get(key) ?? []).filter((edge) => validEdgeIds.has(edge.id));
      const outbound = (outboundByPort.get(key) ?? []).filter((edge) => validEdgeIds.has(edge.id));
      const allOutbound = outboundByPort.get(key) ?? [];

      if (port.flow === "input" && inbound.length === 0) {
        diagnostics.push({
          id: createDiagnosticId("connection.disconnected-input", index++),
          severity: "warning",
          code: "connection.disconnected-input",
          message: `Input port "${port.id}" on node "${node.id}" is not receiving anything.`,
          subjectRefs: [{ kind: "port", nodeId: node.id, portId: port.id }],
          remediation: "Connect a compatible upstream output to this input."
        });
      }

      if (port.flow === "output" && outbound.length === 0) {
        diagnostics.push({
          id: createDiagnosticId("connection.disconnected-output", index++),
          severity: "warning",
          code: "connection.disconnected-output",
          message: `Output port "${port.id}" on node "${node.id}" is not connected downstream.`,
          subjectRefs: [{ kind: "port", nodeId: node.id, portId: port.id }],
          remediation: "Connect this output to a compatible downstream input."
        });
      }

      if (port.flow === "output" && allOutbound.length > 0 && outbound.length === 0) {
        diagnostics.push({
          id: createDiagnosticId("connection.blocked-output", index++),
          severity: "warning",
          code: "connection.blocked-output",
          message: `Output port "${port.id}" on node "${node.id}" is linked only through blocked or invalid connections.`,
          subjectRefs: [{ kind: "port", nodeId: node.id, portId: port.id }],
          remediation: "Reconnect the output through a valid, compatible downstream path."
        });
      }
    }
  }

  return {
    diagnostics,
    validEdgeIds,
    inboundByPort,
    outboundByPort
  };
}

export function runConnectionValidation(plan: PlanDocument, dataset: DatasetBundle): Diagnostic[] {
  return buildConnectionState(plan, dataset).diagnostics;
}
