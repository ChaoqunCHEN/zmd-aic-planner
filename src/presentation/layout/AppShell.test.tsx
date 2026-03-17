import { render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DiagnosticsPanel } from "../diagnostics/DiagnosticsPanel";
import { SelectionInspector } from "../inspector/SelectionInspector";
import { AppShell } from "./AppShell";
import { WorkbenchLayout } from "./WorkbenchLayout";
import { ProjectToolbar } from "../project/ProjectToolbar";
import { ReferencePane } from "../reference/ReferencePane";

describe("workbench shell components", () => {
  it("renders the split-pane layout with persistent regions", () => {
    render(
      <AppShell
        toolbar={
          <ProjectToolbar
            onExport={() => {}}
            onImport={() => {}}
            onNewProject={() => {}}
            projectName="Test Project"
          />
        }
        workbench={
          <WorkbenchLayout
            workspace={<section data-testid="planner-workspace">Workspace</section>}
            inspector={
              <SelectionInspector diagnostics={[]} referenceContext={null} selectedNode={null} />
            }
            diagnostics={
              <DiagnosticsPanel
                diagnostics={[]}
                onSelectDiagnostic={() => {}}
                selectedDiagnosticId={null}
              />
            }
            referencePane={
              <ReferencePane
                entries={[]}
                focusSummary={null}
                focusTitle={null}
                onQueryChange={() => {}}
                query=""
              />
            }
          />
        }
      />
    );

    expect(screen.getByTestId("app-shell")).toBeVisible();
    expect(screen.getByTestId("project-toolbar")).toBeVisible();
    expect(screen.getByTestId("planner-workspace")).toBeVisible();
    expect(screen.getByTestId("selection-inspector")).toBeVisible();
    expect(screen.getByTestId("diagnostics-panel")).toBeVisible();
    expect(screen.getByTestId("reference-pane")).toBeVisible();
  });

  it("fires project toolbar actions", async () => {
    const user = userEvent.setup();
    const onNewProject = vi.fn();
    const onExport = vi.fn();
    const onImport = vi.fn();

    render(
      <ProjectToolbar
        onExport={onExport}
        onImport={onImport}
        onNewProject={onNewProject}
        projectName="Toolbar Project"
      />
    );

    await user.click(screen.getByTestId("new-project-button"));
    await user.click(screen.getByTestId("export-project-button"));
    await user.click(screen.getByTestId("import-project-button"));

    expect(onNewProject).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it("renders diagnostics and lets the user select one", async () => {
    const user = userEvent.setup();
    const onSelectDiagnostic = vi.fn();

    render(
      <DiagnosticsPanel
        diagnostics={[
          {
            id: "diag-1",
            code: "connection.disconnected-input",
            severity: "warning",
            message: "Input port is disconnected.",
            subjectRefs: [{ kind: "port", nodeId: "node-1", portId: "ore-in" }]
          }
        ]}
        onSelectDiagnostic={onSelectDiagnostic}
        selectedDiagnosticId={null}
      />
    );

    await user.click(screen.getByTestId("diagnostic-item:connection.disconnected-input"));
    expect(onSelectDiagnostic).toHaveBeenCalledWith("diag-1");
  });

  it("filters encyclopedia entries through the search input", async () => {
    const user = userEvent.setup();

    function ReferenceHarness() {
      const [query, setQuery] = useState("");

      return (
        <ReferencePane
          entries={[
            {
              id: "machine",
              iconLabel: "基",
              kindLabel: "机器",
              name: "基础冶炼炉",
              searchText: "基础冶炼炉 basic smelter machine",
              secondaryName: "Basic Smelter"
            },
            {
              id: "resource",
              iconLabel: "铁",
              kindLabel: "资源",
              name: "铁矿石",
              searchText: "铁矿石 iron ore resource",
              secondaryName: "Iron Ore"
            }
          ]}
          focusSummary={null}
          focusTitle={null}
          onQueryChange={setQuery}
          query={query}
        />
      );
    }

    render(<ReferenceHarness />);

    await user.type(screen.getByTestId("reference-search-input"), "Smelter");
    expect(screen.getByText("基础冶炼炉")).toBeVisible();
  });

  it("updates the inspector context when a node is selected", () => {
    render(
      <SelectionInspector
        diagnostics={[
          {
            id: "diag-1",
            code: "connection.disconnected-input",
            severity: "warning",
            message: "Input port is disconnected.",
            subjectRefs: [{ kind: "port", nodeId: "node-smelter", portId: "ore-in" }]
          }
        ]}
        referenceContext={{
          placeable: {
            id: "machine.basic-smelter",
            kind: "placeable",
            name: "Basic Smelter",
            nameZhHans: "基础冶炼炉",
            source: { sourceConfidence: "verified", sourceSystem: "curated" },
            worldCategory: "placeable",
            plannerCategory: "machines",
            availabilityStatus: "validated",
            placementKind: "area",
            placeableClass: "area",
            subtype: "machine",
            footprint: { width: 2, height: 2 },
            ports: [
              {
                id: "ore-in",
                flow: "input",
                resourceIds: ["resource.iron-ore"],
                side: "west",
                offset: 0.5,
                mediumKind: "item",
                maxLinks: 1
              },
              {
                id: "ingot-out",
                flow: "output",
                resourceIds: ["resource.iron-ingot"],
                side: "east",
                offset: 0.5,
                mediumKind: "item",
                maxLinks: 1
              }
            ],
            recipeIds: ["recipe.smelt-iron"],
            supportedModeIds: ["mode.basic-smelter.standard"],
            defaultModeId: "mode.basic-smelter.standard"
          },
          recipe: {
            id: "recipe.smelt-iron",
            kind: "recipe",
            name: "Smelt Iron Ore",
            nameZhHans: "冶炼铁矿石",
            source: { sourceConfidence: "verified", sourceSystem: "curated" },
            referenceKind: "recipe",
            machineId: "machine.basic-smelter",
            durationSeconds: 4,
            inputs: [{ amount: 1, resourceId: "resource.iron-ore" }],
            outputs: [{ amount: 1, resourceId: "resource.iron-ingot" }]
          },
          mode: {
            id: "mode.basic-smelter.standard",
            kind: "machine-mode",
            name: "Standard Output",
            nameZhHans: "标准产出",
            source: { sourceConfidence: "verified", sourceSystem: "curated" },
            referenceKind: "machine-mode",
            machineId: "machine.basic-smelter",
            throughputMultiplier: 1,
            powerMultiplier: 1
          }
        }}
        selectedNode={{
          id: "node-smelter",
          catalogId: "machine.basic-smelter",
          kind: "machine",
          position: { x: 2, y: 4 },
          footprint: { width: 2, height: 2 },
          rotation: 0,
          modeId: "mode.basic-smelter.standard",
          settings: {}
        }}
      />
    );

    expect(screen.getByText("基础冶炼炉")).toBeVisible();
    expect(screen.getByText(/标准产出/)).toBeVisible();
    expect(screen.getByText(/冶炼铁矿石/)).toBeVisible();
    expect(screen.getByTestId("selection-inspector-port-list")).toHaveTextContent("东侧 输出");
  });
});
