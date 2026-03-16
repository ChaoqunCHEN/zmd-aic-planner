import type { DatasetBundle } from "../types";
import type { Diagnostic } from "../diagnostics/types";
import { createDiagnosticId } from "../diagnostics/types";
import type { PlanDocument } from "../plan/document";
import {
  findBlockedZoneOverlap,
  getNodeRect,
  isRectInBuildableZone,
  isRectWithinSite,
  rectsOverlap
} from "../plan/geometry";

export function runPlacementValidation(plan: PlanDocument, dataset: DatasetBundle): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const sitePreset = dataset.sitePresets[plan.siteConfig.sitePresetId];

  if (!sitePreset) {
    return diagnostics;
  }

  let index = 0;
  const nodes = Object.values(plan.nodes);

  for (const node of nodes) {
    const rect = getNodeRect(node);

    if (!isRectWithinSite(rect, sitePreset)) {
      diagnostics.push({
        id: createDiagnosticId("placement.out-of-bounds", index++),
        severity: "error",
        code: "placement.out-of-bounds",
        message: `Node "${node.id}" extends outside the site bounds.`,
        subjectRefs: [{ kind: "node", nodeId: node.id }],
        remediation: "Move the node back inside the site grid."
      });
    }

    if (!isRectInBuildableZone(rect, sitePreset)) {
      diagnostics.push({
        id: createDiagnosticId("placement.outside-buildable-zone", index++),
        severity: "error",
        code: "placement.outside-buildable-zone",
        message: `Node "${node.id}" is outside the site's buildable area.`,
        subjectRefs: [{ kind: "node", nodeId: node.id }],
        remediation: "Place the node fully within a buildable zone."
      });
    }

    if (findBlockedZoneOverlap(rect, sitePreset)) {
      diagnostics.push({
        id: createDiagnosticId("placement.blocked-zone", index++),
        severity: "error",
        code: "placement.blocked-zone",
        message: `Node "${node.id}" overlaps a blocked site zone.`,
        subjectRefs: [{ kind: "node", nodeId: node.id }],
        remediation: "Move the node away from blocked terrain."
      });
    }
  }

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];

      if (!left || !right) {
        continue;
      }

      if (!rectsOverlap(getNodeRect(left), getNodeRect(right))) {
        continue;
      }

      diagnostics.push({
        id: createDiagnosticId("placement.footprint-collision", index++),
        severity: "error",
        code: "placement.footprint-collision",
        message: `Nodes "${left.id}" and "${right.id}" overlap on the site grid.`,
        subjectRefs: [
          { kind: "node", nodeId: left.id },
          { kind: "node", nodeId: right.id }
        ],
        remediation: "Separate the nodes so their footprints no longer overlap."
      });
    }
  }

  return diagnostics;
}
