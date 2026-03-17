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
import { buildGraph } from "../buildGraph";

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

describe("buildGraph", () => {
  it("includes only adjacency-valid edges in analysis traversal", () => {
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

    const belt = placeNode(intake.plan, dataset, {
      nodeId: "node-belt",
      catalogId: "belt.basic-conveyor",
      position: { x: 1, y: 4 }
    });
    expect(belt.ok).toBe(true);
    if (!belt.ok) {
      return;
    }

    const smelter = placeNode(belt.plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const graph = buildGraph(
      {
        ...smelter.plan,
        edges: {
          "edge-valid": {
            id: "edge-valid",
            sourceNodeId: "node-intake",
            sourcePortId: "ore-out",
            targetNodeId: "node-belt",
            targetPortId: "belt-in"
          },
          "edge-non-adjacent": {
            id: "edge-non-adjacent",
            sourceNodeId: "node-intake",
            sourcePortId: "ore-out",
            targetNodeId: "node-smelter",
            targetPortId: "ore-in"
          }
        }
      },
      dataset
    );

    expect(Object.keys(graph.edges)).toEqual(["edge-valid"]);
    expect(graph.nodes["node-intake"]?.outgoingEdges.map((edge) => edge.id)).toEqual([
      "edge-valid"
    ]);
    expect(graph.nodes["node-smelter"]?.incomingEdges).toEqual([]);
  });
});
