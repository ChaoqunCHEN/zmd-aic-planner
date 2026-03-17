import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import manifest from "../../../game-data/dataset-manifest.json";
import machineModes from "../../../game-data/machine-modes.json";
import placeableItems from "../../../game-data/placeable-items.json";
import recipes from "../../../game-data/recipes.json";
import resources from "../../../game-data/resources.json";
import ruleFragments from "../../../game-data/rule-fragments.json";
import siteFixtures from "../../../game-data/site-fixtures.json";
import sitePresets from "../../../game-data/site-presets.json";
import { loadDataset } from "../../domain/dataset/loadDataset";
import { createPlannerStore } from "../../application/store/plannerStore";
import { PlannerWorkspace } from "./PlannerWorkspace";

const datasetResult = loadDataset({
  manifest,
  placeableItems,
  resources,
  recipes,
  machineModes,
  sitePresets,
  siteFixtures,
  ruleFragments
});

if (!datasetResult.ok) {
  throw new Error(`Expected bundled dataset to load: ${datasetResult.errors.join(", ")}`);
}

const dataset = datasetResult.data;
const referenceOnlyCatalogItem = placeableItems.find(
  (item) => item.availabilityStatus === "reference-only"
);

if (!referenceOnlyCatalogItem) {
  throw new Error("Expected at least one reference-only catalog item in bundled dataset");
}

function setupWorkspace() {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {}
  };
  const store = createPlannerStore({ dataset, storage });
  store.getState().commands.createProject({ sitePresetId: "site.training-yard" });

  return store;
}

function setupWorkspaceFor(sitePresetId: string) {
  const storage = {
    getItem() {
      return null;
    },
    setItem() {}
  };
  const store = createPlannerStore({ dataset, storage });
  store.getState().commands.createProject({ sitePresetId });

  return store;
}

describe("PlannerWorkspace", () => {
  it("shows top-tabs catalog browsing with Chinese-first labels and icons", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    render(<PlannerWorkspace store={store} />);

    const machinesTab = screen.getByTestId("catalog-tab:machines");
    const logisticsTab = screen.getByTestId("catalog-tab:logistics");
    expect(machinesTab).toHaveAttribute("aria-selected", "true");
    expect(logisticsTab).toHaveAttribute("aria-selected", "false");

    const catalogRail = screen.getByTestId("catalog-rail:machines");
    expect(
      within(catalogRail).getByTestId("catalog-item:machine.basic-smelter")
    ).toHaveTextContent("基础冶炼炉");
    expect(
      within(catalogRail).getByTestId("catalog-icon:machine.basic-smelter")
    ).toBeVisible();
    expect(screen.queryByText("Basic Smelter")).not.toBeInTheDocument();

    await user.click(logisticsTab);
    expect(logisticsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("catalog-rail:logistics")).toBeVisible();
    expect(screen.getByTestId("catalog-item:belt.basic-conveyor")).toBeVisible();
    expect(screen.queryByTestId("catalog-item:machine.basic-smelter")).not.toBeInTheDocument();
  });

  it("shows machine in-game-type filter options and filters machine cards", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    render(<PlannerWorkspace store={store} />);

    const allFilter = screen.getByTestId("catalog-type-filter:all");
    const miningFilter = screen.getByTestId("catalog-type-filter:资源开采");
    expect(allFilter).toHaveAttribute("aria-pressed", "true");
    expect(miningFilter).toHaveAttribute("aria-pressed", "false");

    expect(screen.getByTestId("catalog-item:machine.basic-smelter")).toBeVisible();
    expect(screen.getByTestId("catalog-item:machine.skland-166")).toBeVisible();

    await user.click(miningFilter);
    expect(miningFilter).toHaveAttribute("aria-pressed", "true");
    expect(allFilter).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("catalog-item:machine.skland-166")).toBeVisible();
    expect(screen.queryByTestId("catalog-item:machine.basic-smelter")).not.toBeInTheDocument();
  });

  it("keeps reference-only catalog items visible but disabled and non-placeable", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    render(<PlannerWorkspace store={store} />);

    await user.click(
      screen.getByTestId(`catalog-tab:${referenceOnlyCatalogItem.plannerCategory}`)
    );

    const referenceButton = screen.getByTestId(`catalog-item:${referenceOnlyCatalogItem.id}`);
    expect(referenceButton).toBeDisabled();
    expect(
      screen.getByTestId(`catalog-item-state:${referenceOnlyCatalogItem.id}`)
    ).toHaveTextContent("仅参考");
    expect(
      screen.getByTestId(`catalog-item-state-reason:${referenceOnlyCatalogItem.id}`)
    ).toHaveTextContent("缺少占地/端口校验");

    await user.click(referenceButton);
    await user.hover(screen.getByTestId("grid-cell:2:4"));
    expect(screen.queryByTestId("placement-ghost")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("grid-cell:2:4"));
    const hasReferenceNode = Object.values(store.getState().plan?.nodes ?? {}).some(
      (node) => node.catalogId === referenceOnlyCatalogItem.id
    );
    expect(hasReferenceNode).toBe(false);
  });

  it("renders fixture and reserved-zone overlays from site preset data", () => {
    const store = setupWorkspaceFor("site.survey-annex");

    render(<PlannerWorkspace store={store} />);

    expect(screen.getByTestId("site-overlay-layer")).toBeVisible();
    expect(screen.getByTestId("site-overlay-fixture:fixture.survey-annex.ore-deposit")).toBeVisible();
    expect(screen.getByTestId("site-overlay-fixture:fixture.survey-annex.collapse")).toBeVisible();
    expect(
      screen.getByTestId("site-overlay-reserved-zone:fixture.survey-annex.sub-pac-pad")
    ).toHaveTextContent("副PAC预留位");
  });

  it("places from the catalog, renders icon-first nodes, then selects, moves, rotates, and deletes", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    render(<PlannerWorkspace store={store} />);

    await user.click(screen.getByTestId("catalog-item:machine.basic-smelter"));
    await user.hover(screen.getByTestId("grid-cell:2:4"));
    expect(screen.getByTestId("placement-ghost")).toHaveAttribute("data-state", "valid");

    await user.click(screen.getByTestId("grid-cell:2:4"));

    const placedNode = screen.getByTestId(/plan-node:node-/);
    expect(placedNode).toBeVisible();
    expect(within(placedNode).getByTestId(/plan-node-icon:node-/)).toBeVisible();
    expect(screen.queryByText(/node-\d+/)).not.toBeInTheDocument();
    expect(within(placedNode).queryByText("基础冶炼炉")).not.toBeInTheDocument();
    expect(within(placedNode).queryByText("Basic Smelter")).not.toBeInTheDocument();

    await user.click(placedNode);
    await user.click(screen.getByTestId("grid-cell:7:5"));
    expect(store.getState().selection.selectedNodeId).toBeTruthy();
    const movedNodeId = store.getState().selection.selectedNodeId!;
    expect(store.getState().plan?.nodes[movedNodeId]?.position).toEqual({ x: 7, y: 5 });

    await user.keyboard("r");
    expect(store.getState().plan?.nodes[movedNodeId]?.rotation).toBe(90);

    await user.keyboard("{Delete}");
    expect(store.getState().plan?.nodes[movedNodeId]).toBeUndefined();
  });

  it("shows selected-node rotation controls and rotates port markers with the node", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    render(<PlannerWorkspace store={store} />);

    await user.click(screen.getByTestId("catalog-item:machine.basic-smelter"));
    await user.click(screen.getByTestId("grid-cell:2:4"));

    const nodeId = Object.keys(store.getState().plan?.nodes ?? {})[0];
    if (!nodeId) {
      throw new Error("Expected node placement to succeed");
    }

    await user.click(screen.getByTestId(`plan-node:${nodeId}`));

    const rotateRight = screen.getByTestId("rotate-right-button");
    expect(rotateRight).toBeEnabled();

    const oreInPortBefore = screen.getByTestId(`port:${nodeId}:ore-in`).getAttribute("style");
    await user.click(rotateRight);
    expect(store.getState().plan?.nodes[nodeId]?.rotation).toBe(90);
    const oreInPortAfter = screen.getByTestId(`port:${nodeId}:ore-in`).getAttribute("style");
    expect(oreInPortAfter).not.toEqual(oreInPortBefore);
  });

  it("keeps ghost and node shell aligned on the shared workspace coordinate system", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    render(<PlannerWorkspace store={store} />);

    await user.click(screen.getByTestId("catalog-item:machine.basic-smelter"));
    await user.hover(screen.getByTestId("grid-cell:2:4"));

    const ghost = screen.getByTestId("placement-ghost");
    expect(ghost).toHaveAttribute("data-state", "valid");
    expect(ghost).toHaveStyle({ left: "100px", top: "188px" });

    await user.click(screen.getByTestId("grid-cell:2:4"));

    const nodeId = Object.keys(store.getState().plan?.nodes ?? {})[0];
    if (!nodeId) {
      throw new Error("Expected node placement to succeed");
    }

    const nodeShell = screen.getByTestId(`plan-node-shell:${nodeId}`);
    expect(nodeShell).toHaveStyle({ left: "100px", top: "188px" });
  });

  it("authors and removes connections through node ports", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    store.getState().commands.placeNode({
      nodeId: "node-intake",
      catalogId: "terminal.ore-intake",
      position: { x: 1, y: 4 }
    });
    store.getState().commands.placeNode({
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    render(<PlannerWorkspace store={store} />);

    const intakeNodeShell = screen.getByTestId("plan-node-shell:node-intake");
    const smelterNodeShell = screen.getByTestId("plan-node-shell:node-smelter");
    const intakePort = screen.getByTestId("port:node-intake:ore-out");
    const smelterPort = screen.getByTestId("port:node-smelter:ore-in");

    expect(intakePort).toHaveAccessibleName(/矿石输入终端/i);
    expect(intakePort).toHaveAccessibleName(/ore-out/i);
    expect(intakePort).toHaveAccessibleName(/output/i);
    expect(smelterPort).toHaveAccessibleName(/基础冶炼炉/i);
    expect(smelterPort).toHaveAccessibleName(/ore-in/i);
    expect(smelterPort).toHaveAccessibleName(/input/i);

    expect(parseFloat(intakePort.style.left)).toBeCloseTo(42);
    expect(parseFloat(intakePort.style.top)).toBeCloseTo(21);
    expect(parseFloat(smelterPort.style.left)).toBeCloseTo(0);
    expect(parseFloat(smelterPort.style.top)).toBeCloseTo(43);

    await user.click(intakePort);
    await user.click(smelterPort);

    const edge = screen.getByTestId("plan-edge:edge-node-intake-ore-out-node-smelter-ore-in");
    expect(edge).toBeVisible();

    const intakeShellLeft = parseFloat(intakeNodeShell.style.left);
    const intakeShellTop = parseFloat(intakeNodeShell.style.top);
    const smelterShellLeft = parseFloat(smelterNodeShell.style.left);
    const smelterShellTop = parseFloat(smelterNodeShell.style.top);

    expect(parseFloat(edge.getAttribute("x1") ?? "NaN")).toBeCloseTo(
      intakeShellLeft + parseFloat(intakePort.style.left)
    );
    expect(parseFloat(edge.getAttribute("y1") ?? "NaN")).toBeCloseTo(
      intakeShellTop + parseFloat(intakePort.style.top)
    );
    expect(parseFloat(edge.getAttribute("x2") ?? "NaN")).toBeCloseTo(
      smelterShellLeft + parseFloat(smelterPort.style.left)
    );
    expect(parseFloat(edge.getAttribute("y2") ?? "NaN")).toBeCloseTo(
      smelterShellTop + parseFloat(smelterPort.style.top)
    );

    await user.click(edge);
    expect(
      screen.queryByTestId("plan-edge:edge-node-intake-ore-out-node-smelter-ore-in")
    ).not.toBeInTheDocument();
  });

  it("blocks non-touching or wrong-side connections before they reach plan state", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    store.getState().commands.placeNode({
      nodeId: "node-intake",
      catalogId: "terminal.ore-intake",
      position: { x: 0, y: 4 }
    });
    store.getState().commands.placeNode({
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    render(<PlannerWorkspace store={store} />);

    await user.click(screen.getByTestId("port:node-intake:ore-out"));
    await user.click(screen.getByTestId("port:node-smelter:ore-in"));
    expect(Object.keys(store.getState().plan?.edges ?? {})).toHaveLength(0);

    store.getState().commands.moveNode({
      nodeId: "node-intake",
      position: { x: 1, y: 4 }
    });
    store.getState().commands.moveNode({
      nodeId: "node-smelter",
      position: { x: 2, y: 4 },
      rotation: 90
    });

    await user.click(screen.getByTestId("port:node-intake:ore-out"));
    await user.click(screen.getByTestId("port:node-smelter:ore-in"));
    expect(Object.keys(store.getState().plan?.edges ?? {})).toHaveLength(0);
  });
});
