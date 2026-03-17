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

  const oreBelt = placeNode(oreTerminal.plan, dataset, {
    nodeId: "node-ore-belt",
    catalogId: "belt.basic-conveyor",
    position: { x: 1, y: 4 }
  });
  expect(oreBelt.ok).toBe(true);
  if (!oreBelt.ok) {
    throw new Error("Expected ore belt placement to succeed");
  }

  const smelter = placeNode(oreBelt.plan, dataset, {
    nodeId: "node-smelter",
    catalogId: "machine.basic-smelter",
    position: { x: 2, y: 4 }
  });
  expect(smelter.ok).toBe(true);
  if (!smelter.ok) {
    throw new Error("Expected smelter placement to succeed");
  }

  const ingotBelt = placeNode(smelter.plan, dataset, {
    nodeId: "node-ingot-belt",
    catalogId: "belt.basic-conveyor",
    position: { x: 4, y: 4 }
  });
  expect(ingotBelt.ok).toBe(true);
  if (!ingotBelt.ok) {
    throw new Error("Expected ingot belt placement to succeed");
  }

  const outputTerminal = placeNode(ingotBelt.plan, dataset, {
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
      "edge-ore-a": {
        id: "edge-ore-a",
        sourceNodeId: "node-ore-in",
        sourcePortId: "ore-out",
        targetNodeId: "node-ore-belt",
        targetPortId: "belt-in"
      },
      "edge-ore-b": {
        id: "edge-ore-b",
        sourceNodeId: "node-ore-belt",
        sourcePortId: "belt-out",
        targetNodeId: "node-smelter",
        targetPortId: "ore-in"
      },
      "edge-ingot-a": {
        id: "edge-ingot-a",
        sourceNodeId: "node-smelter",
        sourcePortId: "ingot-out",
        targetNodeId: "node-ingot-belt",
        targetPortId: "belt-in"
      },
      "edge-ingot-b": {
        id: "edge-ingot-b",
        sourceNodeId: "node-ingot-belt",
        sourcePortId: "belt-out",
        targetNodeId: "node-ingot-out",
        targetPortId: "ingot-in"
      }
    }
  };
}

function buildSplitterBranchGraph(externalOreCap: number) {
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

  const oreBelt = placeNode(oreTerminal.plan, dataset, {
    nodeId: "node-ore-belt",
    catalogId: "belt.basic-conveyor",
    position: { x: 1, y: 4 }
  });
  expect(oreBelt.ok).toBe(true);
  if (!oreBelt.ok) {
    throw new Error("Expected ore belt placement to succeed");
  }

  const splitter = placeNode(oreBelt.plan, dataset, {
    nodeId: "node-splitter",
    catalogId: "logistics-building.compact-splitter",
    position: { x: 2, y: 4 }
  });
  expect(splitter.ok).toBe(true);
  if (!splitter.ok) {
    throw new Error("Expected splitter placement to succeed");
  }

  const smelterEast = placeNode(splitter.plan, dataset, {
    nodeId: "node-smelter-east",
    catalogId: "machine.basic-smelter",
    position: { x: 3, y: 4 }
  });
  expect(smelterEast.ok).toBe(true);
  if (!smelterEast.ok) {
    throw new Error("Expected east smelter placement to succeed");
  }

  const smelterNorth = placeNode(smelterEast.plan, dataset, {
    nodeId: "node-smelter-north",
    catalogId: "machine.basic-smelter",
    position: { x: 2, y: 2 },
    rotation: 270
  });
  expect(smelterNorth.ok).toBe(true);
  if (!smelterNorth.ok) {
    throw new Error("Expected north smelter placement to succeed");
  }

  return {
    ...smelterNorth.plan,
    siteConfig: {
      ...smelterNorth.plan.siteConfig,
      externalInputCaps: {
        ...smelterNorth.plan.siteConfig.externalInputCaps,
        "resource.iron-ore": externalOreCap
      }
    },
    edges: {
      "edge-ore-intake": {
        id: "edge-ore-intake",
        sourceNodeId: "node-ore-in",
        sourcePortId: "ore-out",
        targetNodeId: "node-ore-belt",
        targetPortId: "belt-in"
      },
      "edge-ore-splitter-in": {
        id: "edge-ore-splitter-in",
        sourceNodeId: "node-ore-belt",
        sourcePortId: "belt-out",
        targetNodeId: "node-splitter",
        targetPortId: "splitter-in"
      },
      "edge-ore-split-east": {
        id: "edge-ore-split-east",
        sourceNodeId: "node-splitter",
        sourcePortId: "splitter-out-b",
        targetNodeId: "node-smelter-east",
        targetPortId: "ore-in"
      },
      "edge-ore-split-north": {
        id: "edge-ore-split-north",
        sourceNodeId: "node-splitter",
        sourcePortId: "splitter-out-a",
        targetNodeId: "node-smelter-north",
        targetPortId: "ore-in"
      }
    }
  };
}

describe("runAnalysis", () => {
  it("propagates steady-state throughput across a known valid graph", () => {
    const plan = buildStarterGraph();
    const result = runAnalysis(plan, dataset);

    expect(result.nodeRates["node-smelter"]).toBeCloseTo(15, 5);
    expect(result.edgeRates["edge-ore-a"]).toBeCloseTo(
      plan.siteConfig.externalInputCaps["resource.iron-ore"],
      5
    );
    expect(result.edgeRates["edge-ore-b"]).toBeCloseTo(15, 5);
    expect(result.edgeRates["edge-ingot-a"]).toBeCloseTo(15, 5);
    expect(result.edgeRates["edge-ingot-b"]).toBeCloseTo(15, 5);
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
    expect(result.edgeRates["edge-ore-a"]).toBeCloseTo(10, 5);
    expect(result.edgeRates["edge-ore-b"]).toBeCloseTo(10, 5);
    expect(result.edgeRates["edge-ingot-a"]).toBeCloseTo(10, 5);
    expect(result.edgeRates["edge-ingot-b"]).toBeCloseTo(10, 5);
    expect(result.bottlenecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "bottleneck.external-cap",
          nodeId: "node-smelter",
          resourceId: "resource.iron-ore"
        })
      ])
    );
  });

  it("keeps uncapped adjacency-compliant logistics paths finite", () => {
    const base = buildStarterGraph();
    const plan = {
      ...base,
      siteConfig: {
        ...base.siteConfig,
        externalInputCaps: {}
      }
    };

    const result = runAnalysis(plan, dataset);

    expect(Number.isFinite(result.nodeRates["node-smelter"] ?? Number.NaN)).toBe(true);
    expect(Number.isFinite(result.edgeRates["edge-ore-a"] ?? Number.NaN)).toBe(true);
    expect(Number.isFinite(result.edgeRates["edge-ore-b"] ?? Number.NaN)).toBe(true);
    expect(result.nodeRates["node-smelter"]).toBeCloseTo(15, 5);
    expect(result.edgeRates["edge-ore-a"]).toBeCloseTo(15, 5);
    expect(result.edgeRates["edge-ore-b"]).toBeCloseTo(15, 5);
  });

  it("shares capped passthrough supply across splitter outputs without duplication", () => {
    const plan = buildSplitterBranchGraph(20);
    const result = runAnalysis(plan, dataset);

    expect(result.edgeRates["edge-ore-intake"]).toBeCloseTo(20, 5);
    expect(result.edgeRates["edge-ore-splitter-in"]).toBeCloseTo(20, 5);
    expect(result.edgeRates["edge-ore-split-east"]).toBeCloseTo(10, 5);
    expect(result.edgeRates["edge-ore-split-north"]).toBeCloseTo(10, 5);
    expect(
      (result.edgeRates["edge-ore-split-east"] ?? 0) +
        (result.edgeRates["edge-ore-split-north"] ?? 0)
    ).toBeCloseTo(result.edgeRates["edge-ore-splitter-in"] ?? 0, 5);
    expect(result.nodeRates["node-smelter-east"]).toBeCloseTo(10, 5);
    expect(result.nodeRates["node-smelter-north"]).toBeCloseTo(10, 5);
  });
});
