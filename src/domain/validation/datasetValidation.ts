import type { DatasetBundle } from "../types";
import type { Diagnostic } from "../diagnostics/types";
import { createDiagnosticId } from "../diagnostics/types";
import type { PlanDocument } from "../plan/document";

export function runDatasetValidation(plan: PlanDocument, dataset: DatasetBundle): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  let index = 0;

  for (const node of Object.values(plan.nodes)) {
    const catalogItem = dataset.placeableItems[node.catalogId];

    if (!catalogItem) {
      diagnostics.push({
        id: createDiagnosticId("dataset.unknown-catalog-item", index++),
        severity: "error",
        code: "dataset.unknown-catalog-item",
        message: `Node "${node.id}" references an unknown catalog item.`,
        subjectRefs: [{ kind: "node", nodeId: node.id }],
        remediation: "Replace or remove the node, or load the matching dataset version."
      });
      continue;
    }

    if (node.modeId && !dataset.machineModes[node.modeId]) {
      diagnostics.push({
        id: createDiagnosticId("dataset.unknown-machine-mode", index++),
        severity: "error",
        code: "dataset.unknown-machine-mode",
        message: `Node "${node.id}" references an unknown machine mode.`,
        subjectRefs: [{ kind: "node", nodeId: node.id }],
        remediation: "Select a supported mode for this node."
      });
    }
  }

  for (const edge of Object.values(plan.edges)) {
    if (!plan.nodes[edge.sourceNodeId] || !plan.nodes[edge.targetNodeId]) {
      diagnostics.push({
        id: createDiagnosticId("dataset.edge-node-missing", index++),
        severity: "error",
        code: "dataset.edge-node-missing",
        message: `Edge "${edge.id}" references a missing node.`,
        subjectRefs: [{ kind: "edge", edgeId: edge.id }],
        remediation: "Reconnect the edge to nodes that exist in the current project."
      });
    }
  }

  return diagnostics;
}
