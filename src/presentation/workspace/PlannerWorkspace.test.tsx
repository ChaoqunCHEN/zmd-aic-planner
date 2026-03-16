import { render, screen } from "@testing-library/react";
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

describe("PlannerWorkspace", () => {
  it("places from the catalog, selects, moves, rotates, and deletes nodes on the grid", async () => {
    const user = userEvent.setup();
    const store = setupWorkspace();

    render(<PlannerWorkspace store={store} />);

    await user.click(screen.getByTestId("catalog-item:machine.basic-smelter"));
    await user.hover(screen.getByTestId("grid-cell:2:4"));
    expect(screen.getByTestId("placement-ghost")).toHaveAttribute("data-state", "valid");

    await user.click(screen.getByTestId("grid-cell:2:4"));

    const placedNode = screen.getByTestId(/plan-node:node-/);
    expect(placedNode).toBeVisible();

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

  it("authors and removes connections through node ports", async () => {
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

    const edge = screen.getByTestId("plan-edge:edge-node-intake-ore-out-node-smelter-ore-in");
    expect(edge).toBeVisible();

    await user.click(edge);
    expect(
      screen.queryByTestId("plan-edge:edge-node-intake-ore-out-node-smelter-ore-in")
    ).not.toBeInTheDocument();
  });
});
