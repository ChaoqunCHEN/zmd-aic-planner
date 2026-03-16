import type { DatasetBundle } from "../types";
import type { Diagnostic } from "../diagnostics/types";
import { createDiagnosticId } from "../diagnostics/types";
import type { PlanDocument } from "../plan/document";

export function runModeValidation(plan: PlanDocument, dataset: DatasetBundle): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let index = 0;

  for (const node of Object.values(plan.nodes)) {
    const item = dataset.placeableItems[node.catalogId];

    if (!item || !item.supportedModeIds || item.supportedModeIds.length === 0) {
      continue;
    }

    if (!node.modeId) {
      diagnostics.push({
        id: createDiagnosticId("mode.missing-selection", index++),
        severity: "error",
        code: "mode.missing-selection",
        message: `Node "${node.id}" requires an operating mode selection.`,
        subjectRefs: [{ kind: "node", nodeId: node.id }],
        remediation: "Choose one of the supported machine modes for this node."
      });
      continue;
    }

    if (!item.supportedModeIds.includes(node.modeId)) {
      diagnostics.push({
        id: createDiagnosticId("mode.unsupported-selection", index++),
        severity: "error",
        code: "mode.unsupported-selection",
        message: `Node "${node.id}" uses a machine mode not supported by its catalog item.`,
        subjectRefs: [{ kind: "node", nodeId: node.id }],
        remediation: "Switch the node back to one of its supported modes."
      });
    }
  }

  return diagnostics;
}
