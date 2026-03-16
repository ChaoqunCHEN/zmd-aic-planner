import { useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { bundledDataset } from "./bundledDataset";
import { createPlannerStore } from "../application/store/plannerStore";
import {
  selectDiagnosticsForSelection,
  selectReferenceContext,
  selectSelectedNode
} from "../application/store/selectors";
import { AppShell } from "../presentation/layout/AppShell";
import { WorkbenchLayout } from "../presentation/layout/WorkbenchLayout";
import { DiagnosticsPanel } from "../presentation/diagnostics/DiagnosticsPanel";
import { SelectionInspector } from "../presentation/inspector/SelectionInspector";
import { ProjectToolbar } from "../presentation/project/ProjectToolbar";
import { ReferencePane, type ReferenceEntry } from "../presentation/reference/ReferencePane";
import { PlannerWorkspace } from "../presentation/workspace/PlannerWorkspace";

function createBrowserStorage() {
  if (typeof window === "undefined") {
    return {
      getItem() {
        return null;
      },
      setItem() {}
    };
  }

  return window.localStorage;
}

export function App() {
  const [store] = useState(() =>
    createPlannerStore({
      dataset: bundledDataset,
      storage: createBrowserStorage(),
      autosaveDelayMs: 400
    })
  );
  const plannerState = useStore(store);
  const [referenceQuery, setReferenceQuery] = useState("");

  const plan = plannerState.plan;
  const diagnostics = plannerState.diagnostics;
  const selection = plannerState.selection;
  const commands = plannerState.commands;
  const selectedNode = useMemo(() => selectSelectedNode(plannerState), [plannerState]);
  const selectionDiagnostics = useMemo(
    () => selectDiagnosticsForSelection(plannerState),
    [plannerState]
  );
  const referenceContext = useMemo(() => selectReferenceContext(plannerState), [plannerState]);

  useEffect(() => {
    if (!store.getState().plan) {
      store.getState().commands.createProject({
        sitePresetId: "site.training-yard",
        name: "Training Yard Draft"
      });
    }
  }, [store]);

  const referenceEntries: ReferenceEntry[] = [
    ...Object.values(bundledDataset.placeableItems).map((item) => ({
      id: item.id,
      kindLabel: "Placeable",
      name: item.name
    })),
    ...Object.values(bundledDataset.resources).map((item) => ({
      id: item.id,
      kindLabel: "Resource",
      name: item.name
    })),
    ...Object.values(bundledDataset.recipes).map((item) => ({
      id: item.id,
      kindLabel: "Recipe",
      name: item.name
    })),
    ...Object.values(bundledDataset.machineModes).map((item) => ({
      id: item.id,
      kindLabel: "Mode",
      name: item.name
    }))
  ];

  return (
    <AppShell
      toolbar={
        <ProjectToolbar
          onExport={() => {
            commands.exportProject();
          }}
          onImport={() => {}}
          onNewProject={() =>
            commands.createProject({
              sitePresetId: "site.training-yard",
              name: "Training Yard Draft"
            })
          }
          projectName={plan?.metadata.name ?? "Loading project"}
        />
      }
      workbench={
        <WorkbenchLayout
          workspace={
            <section className="workbench-frame" data-testid="empty-workbench">
              <PlannerWorkspace store={store} />
            </section>
          }
          inspector={
            <SelectionInspector
              diagnostics={selectionDiagnostics}
              referenceContext={referenceContext}
              selectedNode={selectedNode}
            />
          }
          diagnostics={
            <DiagnosticsPanel
              diagnostics={diagnostics}
              onSelectDiagnostic={(diagnosticId) => commands.selectDiagnostic(diagnosticId)}
              selectedDiagnosticId={selection.selectedDiagnosticId}
            />
          }
          referencePane={
            <ReferencePane
              entries={referenceEntries}
              focusSummary={
                referenceContext?.placeable.description ?? referenceContext?.recipe?.description ?? null
              }
              focusTitle={referenceContext?.placeable.name ?? null}
              onQueryChange={setReferenceQuery}
              query={referenceQuery}
            />
          }
        />
      }
    />
  );
}
