import type { DatasetBundle } from "../types";
import type { Diagnostic } from "../diagnostics/types";
import { createDiagnosticId } from "../diagnostics/types";
import type { PlanDocument } from "../plan/document";

export function runSiteValidation(plan: PlanDocument, dataset: DatasetBundle): Diagnostic[] {
  if (dataset.sitePresets[plan.siteConfig.sitePresetId]) {
    return [];
  }

  return [
    {
      id: createDiagnosticId("site.unknown-preset", 0),
      severity: "error",
      code: "site.unknown-preset",
      message: `The project references an unknown site preset "${plan.siteConfig.sitePresetId}".`,
      subjectRefs: [{ kind: "site", sitePresetId: plan.siteConfig.sitePresetId }],
      remediation: "Choose a valid site preset or import the matching dataset."
    }
  ];
}
