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
import { runAnalysis } from "../runAnalysis";

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

function buildStarterGraph() {
  const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
  const oreTerminal = placeNode(basePlan, dataset, {
    nodeId: "node-ore-in",
    catalogId: "terminal.ore-intake",
    position: { x: 0, y: 4 }
  });
  expect(oreTerminal.ok).toBe(true);
  if (!oreTerminal.ok) {
    throw new Error("Expected ore terminal placement to succeed");
  }

  const smelter = placeNode(oreTerminal.plan, dataset, {
    nodeId: "node-smelter",
    catalogId: "machine.basic-smelter",
    position: { x: 2, y: 4 }
  });
  expect(smelter.ok).toBe(true);
  if (!smelter.ok) {
    throw new Error("Expected smelter placement to succeed");
  }

  const outputTerminal = placeNode(smelter.plan, dataset, {
    nodeId: "node-ingot-out",
    catalogId: "terminal.ingot-output",
    position: { x: 5, y: 4 }
  });
  expect(outputTerminal.ok).toBe(true);
  if (!outputTerminal.ok) {
    throw new Error("Expected output terminal placement to succeed");
  }

  return {
    ...outputTerminal.plan,
    edges: {
      "edge-ore": {
        id: "edge-ore",
        sourceNodeId: "node-ore-in",
        sourcePortId: "ore-out",
        targetNodeId: "node-smelter",
        targetPortId: "ore-in"
      },
      "edge-ingot": {
        id: "edge-ingot",
        sourceNodeId: "node-smelter",
        sourcePortId: "ingot-out",
        targetNodeId: "node-ingot-out",
        targetPortId: "ingot-in"
      }
    }
  };
}

describe("runAnalysis", () => {
  it("propagates steady-state throughput across a known valid graph", () => {
    const plan = buildStarterGraph();
    const result = runAnalysis(plan, dataset);

    expect(result.nodeRates["node-smelter"]).toBeCloseTo(15, 5);
    expect(result.edgeRates["edge-ore"]).toBeCloseTo(15, 5);
    expect(result.edgeRates["edge-ingot"]).toBeCloseTo(15, 5);
    expect(result.bottlenecks).toEqual([]);
  });

  it("detects an external-input bottleneck and limits downstream throughput", () => {
    const plan = {
      ...buildStarterGraph(),
      siteConfig: {
        ...buildStarterGraph().siteConfig,
        externalInputCaps: {
          "resource.iron-ore": 10
        }
      }
    };

    const result = runAnalysis(plan, dataset);

    expect(result.nodeRates["node-smelter"]).toBeCloseTo(10, 5);
    expect(result.edgeRates["edge-ore"]).toBeCloseTo(10, 5);
    expect(result.bottlenecks.some((bottleneck) => bottleneck.code === "bottleneck.external-cap")).toBe(
      true
    );
  });
});
