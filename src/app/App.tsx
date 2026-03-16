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
import { InputCapEditor } from "../presentation/inspector/InputCapEditor";
import { SelectionInspector } from "../presentation/inspector/SelectionInspector";
import { ImportExportControls } from "../presentation/project/ImportExportControls";
import { NewProjectDialog } from "../presentation/project/NewProjectDialog";
import { ProjectToolbar } from "../presentation/project/ProjectToolbar";
import { RecentProjectsPanel } from "../presentation/project/RecentProjectsPanel";
import { ReferencePane, type ReferenceEntry } from "../presentation/reference/ReferencePane";
import { PlannerWorkspace } from "../presentation/workspace/PlannerWorkspace";

function createBrowserStorage() {
  try {
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      typeof window.localStorage.getItem === "function" &&
      typeof window.localStorage.setItem === "function"
    ) {
      return window.localStorage;
    }
  } catch {
    // Fall back to in-memory storage when the browser shim is unavailable.
  }

  return {
    getItem() {
      return null;
    },
    setItem() {}
  };
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
  const [newProjectOpen, setNewProjectOpen] = useState(false);

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
  const selectedPlaceable = selectedNode
    ? plannerState.dataset.placeableItems[selectedNode.catalogId] ?? null
    : null;
  const modeOptions = useMemo(
    () =>
      (selectedPlaceable?.supportedModeIds ?? [])
        .map((modeId) => plannerState.dataset.machineModes[modeId])
        .filter((mode): mode is NonNullable<typeof mode> => Boolean(mode)),
    [plannerState.dataset.machineModes, selectedPlaceable]
  );
  const inputCapRules = useMemo(() => {
    if (!plan) {
      return [];
    }

    return Object.values(plannerState.dataset.ruleFragments).filter(
      (rule) =>
        rule.ruleType === "external-input-cap" &&
        rule.sitePresetIds.includes(plan.siteConfig.sitePresetId)
    );
  }, [plan, plannerState.dataset.ruleFragments]);
  const referenceFacts = useMemo(() => {
    if (!referenceContext) {
      return [];
    }

    const facts: string[] = [];
    const activeConfidence =
      referenceContext.mode?.source.sourceConfidence ??
      referenceContext.recipe?.source.sourceConfidence ??
      referenceContext.placeable.source.sourceConfidence;

    if (referenceContext.mode) {
      facts.push(`Active mode: ${referenceContext.mode.name}`);
      facts.push(
        `Throughput multiplier: ${referenceContext.mode.throughputMultiplier.toFixed(2).replace(/\.00$/, "")}x`
      );
    }

    if (referenceContext.recipe) {
      const inputNames = referenceContext.recipe.inputs
        .map(
          (input) => plannerState.dataset.resources[input.resourceId]?.name ?? input.resourceId
        )
        .join(" + ");
      const outputNames = referenceContext.recipe.outputs
        .map(
          (output) => plannerState.dataset.resources[output.resourceId]?.name ?? output.resourceId
        )
        .join(" + ");

      facts.push(`${inputNames} -> ${outputNames}`);
    }

    facts.push(`Source confidence: ${activeConfidence}`);

    if (referenceContext.mode?.source.sourceNotes?.length) {
      facts.push(referenceContext.mode.source.sourceNotes[0]!);
    }

    return facts;
  }, [plannerState.dataset.resources, referenceContext]);
  const selectedNodeRate =
    selectedNode && plannerState.analysis
      ? plannerState.analysis.nodeRates[selectedNode.id] ?? 0
      : null;

  useEffect(() => {
    if (!store.getState().plan) {
      const state = store.getState();
      const mostRecent = state.recentProjects[0];

      if (mostRecent) {
        state.commands.reopenRecentProject(mostRecent.storageKey);
      }

      if (!store.getState().plan) {
        store.getState().commands.createProject({
          sitePresetId: "site.training-yard",
          name: "Training Yard Draft"
        });
      }
    }
  }, [store]);

  const referenceEntries: ReferenceEntry[] = [
    ...Object.values(plannerState.dataset.placeableItems).map((item) => ({
      id: item.id,
      kindLabel: "Placeable",
      name: item.name
    })),
    ...Object.values(plannerState.dataset.resources).map((item) => ({
      id: item.id,
      kindLabel: "Resource",
      name: item.name
    })),
    ...Object.values(plannerState.dataset.recipes).map((item) => ({
      id: item.id,
      kindLabel: "Recipe",
      name: item.name
    })),
    ...Object.values(plannerState.dataset.machineModes).map((item) => ({
      id: item.id,
      kindLabel: "Mode",
      name: item.name
    })),
    ...Object.values(plannerState.dataset.sitePresets).map((item) => ({
      id: item.id,
      kindLabel: "Site Preset",
      name: item.name
    })),
    ...Object.values(plannerState.dataset.ruleFragments).map((item) => ({
      id: item.id,
      kindLabel: "Site Rule",
      name: item.name
    })),
    ...Object.values(plannerState.dataset.siteFixtures).map((item) => ({
      id: item.id,
      kindLabel: "Site Fixture",
      name: item.name
    }))
  ];

  return (
    <>
      <AppShell
        toolbar={
          <ProjectToolbar
            actionSlot={
              <ImportExportControls
                errors={plannerState.importStatus.errors}
                onExport={() => {
                  const payload = commands.exportProject();

                  if (!payload || typeof document === "undefined") {
                    return;
                  }

                  const urlFactory =
                    typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
                      ? URL
                      : null;
                  if (!urlFactory) {
                    return;
                  }

                  const blob = new Blob([payload], { type: "application/json" });
                  const href = urlFactory.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = href;
                  anchor.download = `${(plan?.metadata.name ?? "aic-planner-project")
                    .toLowerCase()
                    .replace(/\s+/g, "-")}.json`;
                  anchor.click();
                  urlFactory.revokeObjectURL(href);
                }}
                onImport={(serialized) => commands.importProject(serialized)}
                warnings={plannerState.importStatus.warnings}
              />
            }
            onExport={() => {}}
            onImport={() => {}}
            onNewProject={() => setNewProjectOpen(true)}
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
              <div style={{ display: "grid", gap: "16px" }}>
                <SelectionInspector
                  diagnostics={selectionDiagnostics}
                  modeOptions={modeOptions}
                  nodeRate={selectedNodeRate}
                  onModeChange={(modeId) => {
                    if (selectedNode) {
                      commands.setNodeMode({
                        nodeId: selectedNode.id,
                        modeId
                      });
                    }
                  }}
                  referenceContext={referenceContext}
                  selectedNode={selectedNode}
                />
                <InputCapEditor
                  caps={plan?.siteConfig.externalInputCaps ?? {}}
                  onCapChange={(resourceId, cap) =>
                    commands.setExternalInputCap({
                      resourceId,
                      cap
                    })
                  }
                  rules={inputCapRules}
                />
                <RecentProjectsPanel
                  activeStorageKey={plannerState.autosave.storageKey}
                  onOpenProject={(storageKey) => commands.reopenRecentProject(storageKey)}
                  projects={plannerState.recentProjects}
                />
              </div>
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
              focusFacts={referenceFacts}
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
      <NewProjectDialog
        onClose={() => setNewProjectOpen(false)}
        onCreate={(input) => {
          commands.createProject(input);
          setNewProjectOpen(false);
        }}
        open={newProjectOpen}
        presets={Object.values(plannerState.dataset.sitePresets)}
      />
    </>
  );
}
