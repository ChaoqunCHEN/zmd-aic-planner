import { describe, expect, it } from "vitest";
import manifest from "../../../../game-data/dataset-manifest.json";
import machineModes from "../../../../game-data/machine-modes.json";
import placeableItems from "../../../../game-data/placeable-items.json";
import recipes from "../../../../game-data/recipes.json";
import resources from "../../../../game-data/resources.json";
import ruleFragments from "../../../../game-data/rule-fragments.json";
import siteFixtures from "../../../../game-data/site-fixtures.json";
import sitePresets from "../../../../game-data/site-presets.json";
import { loadDataset } from "../../dataset/loadDataset";
import { createPlan } from "../document";
import { getNodeFootprintSize } from "../geometry";
import { connectPorts, moveNode, placeNode, removeNode } from "../operations";

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

describe("createPlan", () => {
  it("creates a layout-first plan document for a chosen site preset", () => {
    const plan = createPlan(dataset, {
      sitePresetId: "site.training-yard",
      projectName: "Starter layout"
    });

    expect(plan.siteConfig.sitePresetId).toBe("site.training-yard");
    expect(plan.metadata.name).toBe("Starter layout");
    expect(plan.datasetVersion).toBe(dataset.version);
    expect(plan.nodes).toEqual({});
    expect(plan.edges).toEqual({});
  });
});

describe("placeNode", () => {
  it("places a machine node using the catalog footprint and default mode", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const result = placeNode(plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.plan.nodes["node-smelter"]).toMatchObject({
      id: "node-smelter",
      catalogId: "machine.basic-smelter",
      kind: "machine",
      position: { x: 2, y: 4 },
      footprint: { width: 2, height: 2 },
      rotation: 0,
      modeId: "mode.basic-smelter.standard"
    });
  });

  it("rejects placements that overlap blocked zones", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.survey-annex" });
    const result = placeNode(plan, dataset, {
      nodeId: "node-blocked",
      catalogId: "machine.basic-smelter",
      position: { x: 6, y: 2 }
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.reason.code).toBe("blocked-zone");
  });

  it("rejects placements that collide with an existing footprint", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const first = placeNode(plan, dataset, {
      nodeId: "node-a",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const second = placeNode(first.plan, dataset, {
      nodeId: "node-b",
      catalogId: "terminal.ore-intake",
      position: { x: 3, y: 5 }
    });

    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }

    expect(second.reason.code).toBe("footprint-collision");
    expect(second.reason.conflictingNodeIds).toContain("node-a");
  });

  it("swaps rectangular footprint dimensions when rotated", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const result = placeNode(plan, dataset, {
      nodeId: "node-terminal",
      catalogId: "terminal.ingot-output",
      position: { x: 9, y: 6 },
      rotation: 90
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(getNodeFootprintSize(result.plan.nodes["node-terminal"])).toEqual({
      width: 1,
      height: 1
    });
    expect(result.plan.nodes["node-terminal"]?.rotation).toBe(90);
  });

  it("treats belts and pipes as explicit occupied nodes on the grid", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const belt = placeNode(plan, dataset, {
      nodeId: "node-belt",
      catalogId: "belt.basic-conveyor",
      position: { x: 1, y: 4 }
    });

    expect(belt.ok).toBe(true);
    if (!belt.ok) {
      return;
    }

    expect(belt.plan.nodes["node-belt"]?.kind).toBe("logistics");

    const pipeCollision = placeNode(belt.plan, dataset, {
      nodeId: "node-pipe",
      catalogId: "pipe.basic-pipe",
      position: { x: 1, y: 4 }
    });

    expect(pipeCollision.ok).toBe(false);
    if (pipeCollision.ok) {
      return;
    }

    expect(pipeCollision.reason.code).toBe("footprint-collision");
    expect(pipeCollision.reason.conflictingNodeIds).toContain("node-belt");
  });
});

describe("moveNode", () => {
  it("moves an existing node immutably when the destination is valid", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const placed = placeNode(plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    expect(placed.ok).toBe(true);
    if (!placed.ok) {
      return;
    }

    const moved = moveNode(placed.plan, dataset, {
      nodeId: "node-smelter",
      position: { x: 7, y: 5 }
    });

    expect(moved.ok).toBe(true);
    if (!moved.ok) {
      return;
    }

    expect(moved.plan.nodes["node-smelter"]?.position).toEqual({ x: 7, y: 5 });
    expect(placed.plan.nodes["node-smelter"]?.position).toEqual({ x: 2, y: 4 });
  });

  it("rejects moves that would push the node outside the site bounds", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const placed = placeNode(plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    expect(placed.ok).toBe(true);
    if (!placed.ok) {
      return;
    }

    const moved = moveNode(placed.plan, dataset, {
      nodeId: "node-smelter",
      position: { x: 11, y: 9 }
    });

    expect(moved.ok).toBe(false);
    if (moved.ok) {
      return;
    }

    expect(moved.reason.code).toBe("out-of-bounds");
  });
});

describe("connectPorts", () => {
  it("rejects direct links between non-touching nodes", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const intake = placeNode(plan, dataset, {
      nodeId: "node-intake",
      catalogId: "terminal.ore-intake",
      position: { x: 0, y: 4 }
    });
    expect(intake.ok).toBe(true);
    if (!intake.ok) {
      return;
    }

    const smelter = placeNode(intake.plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const connection = connectPorts(smelter.plan, dataset, {
      sourceNodeId: "node-intake",
      sourcePortId: "ore-out",
      targetNodeId: "node-smelter",
      targetPortId: "ore-in"
    });

    expect(connection.ok).toBe(false);
    if (connection.ok) {
      return;
    }

    expect(connection.reason.code).toBe("non-adjacent");
  });

  it("rejects adjacent links that do not use facing sides", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const intake = placeNode(plan, dataset, {
      nodeId: "node-intake",
      catalogId: "terminal.ore-intake",
      position: { x: 1, y: 4 }
    });
    expect(intake.ok).toBe(true);
    if (!intake.ok) {
      return;
    }

    const smelter = placeNode(intake.plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 },
      rotation: 90
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const connection = connectPorts(smelter.plan, dataset, {
      sourceNodeId: "node-intake",
      sourcePortId: "ore-out",
      targetNodeId: "node-smelter",
      targetPortId: "ore-in"
    });

    expect(connection.ok).toBe(false);
    if (connection.ok) {
      return;
    }

    expect(connection.reason.code).toBe("invalid-side");
  });
});

describe("removeNode", () => {
  it("removes a node from the plan", () => {
    const plan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const placed = placeNode(plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    expect(placed.ok).toBe(true);
    if (!placed.ok) {
      return;
    }

    const nextPlan = removeNode(placed.plan, "node-smelter");

    expect(nextPlan.nodes["node-smelter"]).toBeUndefined();
    expect(placed.plan.nodes["node-smelter"]).toBeDefined();
  });
});
