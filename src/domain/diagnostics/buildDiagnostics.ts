import type { DatasetBundle } from "../types";
import type { Diagnostic } from "./types";
import type { PlanDocument } from "../plan/document";
import { runCapValidation } from "../validation/capValidation";
import { buildConnectionState } from "../validation/connectionValidation";
import { runDatasetValidation } from "../validation/datasetValidation";
import { runModeValidation } from "../validation/modeValidation";
import { runPlacementValidation } from "../validation/placementValidation";
import { runSiteValidation } from "../validation/siteValidation";

export function buildDiagnostics(plan: PlanDocument, dataset: DatasetBundle): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  diagnostics.push(...runDatasetValidation(plan, dataset));
  diagnostics.push(...runSiteValidation(plan, dataset));
  diagnostics.push(...runPlacementValidation(plan, dataset));

  const connectionState = buildConnectionState(plan, dataset);
  diagnostics.push(...connectionState.diagnostics);
  diagnostics.push(...runModeValidation(plan, dataset));
  diagnostics.push(...runCapValidation(plan, dataset, connectionState));

  return diagnostics;
}
