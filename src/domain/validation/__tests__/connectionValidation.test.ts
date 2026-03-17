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
import { createPlan } from "../../plan/document";
import { placeNode } from "../../plan/operations";
import { buildConnectionState } from "../connectionValidation";

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

describe("buildConnectionState", () => {
  it("accepts adjacency when rotated port sides touch and face each other", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const intake = placeNode(basePlan, dataset, {
      nodeId: "node-intake",
      catalogId: "terminal.ore-intake",
      position: { x: 2, y: 3 },
      rotation: 90
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

    const plan = {
      ...smelter.plan,
      edges: {
        "edge-rotated-touching": {
          id: "edge-rotated-touching",
          sourceNodeId: "node-intake",
          sourcePortId: "ore-out",
          targetNodeId: "node-smelter",
          targetPortId: "ore-in"
        }
      }
    };

    const state = buildConnectionState(plan, dataset);
    const codes = state.diagnostics.map((diagnostic) => diagnostic.code);

    expect(state.validEdgeIds.has("edge-rotated-touching")).toBe(true);
    expect(codes).not.toContain("connection.non-adjacent");
    expect(codes).not.toContain("connection.invalid-side");
  });

  it("rejects direct links between non-touching nodes", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const intake = placeNode(basePlan, dataset, {
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

    const plan = {
      ...smelter.plan,
      edges: {
        "edge-non-touching": {
          id: "edge-non-touching",
          sourceNodeId: "node-intake",
          sourcePortId: "ore-out",
          targetNodeId: "node-smelter",
          targetPortId: "ore-in"
        }
      }
    };

    const state = buildConnectionState(plan, dataset);

    expect(state.validEdgeIds.has("edge-non-touching")).toBe(false);
    expect(state.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "connection.non-adjacent"
    );
  });

  it("rejects links that use ports on non-touching sides even when nodes are adjacent", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const intake = placeNode(basePlan, dataset, {
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

    const plan = {
      ...smelter.plan,
      edges: {
        "edge-wrong-side": {
          id: "edge-wrong-side",
          sourceNodeId: "node-intake",
          sourcePortId: "ore-out",
          targetNodeId: "node-smelter",
          targetPortId: "ore-in"
        }
      }
    };

    const state = buildConnectionState(plan, dataset);

    expect(state.validEdgeIds.has("edge-wrong-side")).toBe(false);
    expect(state.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "connection.invalid-side"
    );
  });
});
