import type { DatasetBundle } from "../types";
import type { Diagnostic } from "../diagnostics/types";
import { createDiagnosticId } from "../diagnostics/types";
import type { PlanDocument } from "../plan/document";
import type { ConnectionState } from "./connectionValidation";

function getModeMultiplier(dataset: DatasetBundle, modeId: string | undefined) {
  if (!modeId) {
    return 1;
  }

  return dataset.machineModes[modeId]?.throughputMultiplier ?? 1;
}

export function runCapValidation(
  plan: PlanDocument,
  dataset: DatasetBundle,
  connectionState: ConnectionState
): Diagnostic[] {
  const usageByResource = new Map<string, number>();
  const isExternalOutputTerminal = (nodeId: string) => {
    const node = plan.nodes[nodeId];
    const item = node ? dataset.placeableItems[node.catalogId] : null;

    return (
      item?.subtype === "terminal" &&
      item.ports.every((port) => port.flow === "output")
    );
  };

  for (const node of Object.values(plan.nodes)) {
    const item = dataset.placeableItems[node.catalogId];

    if (!item?.recipeIds?.length) {
      continue;
    }

    const recipe = dataset.recipes[item.recipeIds[0] ?? ""];
    if (!recipe) {
      continue;
    }

    const modeMultiplier = getModeMultiplier(dataset, node.modeId);

    for (const input of recipe.inputs) {
      const matchingPort = item.ports.find(
        (port) => port.flow === "input" && port.resourceIds.includes(input.resourceId)
      );

      if (!matchingPort) {
        continue;
      }

      const ratePerMinute = (input.amount / recipe.durationSeconds) * 60 * modeMultiplier;
      const inboundKey = `${node.id}:${matchingPort.id}`;
      const validInbound = (connectionState.inboundByPort.get(inboundKey) ?? []).filter((edge) =>
        connectionState.validEdgeIds.has(edge.id)
      );

      if (validInbound.length > 0) {
        if (validInbound.some((edge) => isExternalOutputTerminal(edge.sourceNodeId))) {
          usageByResource.set(
            input.resourceId,
            (usageByResource.get(input.resourceId) ?? 0) + ratePerMinute
          );
        }

        continue;
      }

      usageByResource.set(input.resourceId, (usageByResource.get(input.resourceId) ?? 0) + ratePerMinute);
    }
  }

  const diagnostics: Diagnostic[] = [];
  let index = 0;

  for (const [resourceId, cap] of Object.entries(plan.siteConfig.externalInputCaps)) {
    const usage = usageByResource.get(resourceId) ?? 0;
    if (usage <= cap) {
      continue;
    }

    const resourceName = dataset.resources[resourceId]?.name ?? resourceId;

    diagnostics.push({
      id: createDiagnosticId("cap.external-input-exceeded", index++),
      severity: "warning",
      code: "cap.external-input-exceeded",
      message: `Projected external input demand for ${resourceName} is ${usage.toFixed(
        2
      )}/min, above the configured cap of ${cap}/min.`,
      subjectRefs: [{ kind: "project" }],
      remediation: "Raise the cap, reduce demand, or add internal supply for this resource."
    });
  }

  return diagnostics;
}
