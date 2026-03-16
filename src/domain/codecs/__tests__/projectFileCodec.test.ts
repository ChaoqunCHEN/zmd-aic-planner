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
import {
  decodeProjectFile,
  encodeProjectFile,
  PROJECT_FILE_FORMAT_VERSION
} from "../projectFileCodec";
import {
  decodeBrowserStorage,
  encodeBrowserStorage
} from "../browserStorageCodec";

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

function buildProjectPlan() {
  const basePlan = createPlan(dataset, {
    sitePresetId: "site.training-yard",
    projectName: "Codec fixture"
  });
  const smelter = placeNode(basePlan, dataset, {
    nodeId: "node-smelter",
    catalogId: "machine.basic-smelter",
    position: { x: 2, y: 4 }
  });

  expect(smelter.ok).toBe(true);
  if (!smelter.ok) {
    throw new Error("Expected smelter placement to succeed");
  }

  return {
    ...smelter.plan,
    siteConfig: {
      ...smelter.plan.siteConfig,
      externalInputCaps: {
        "resource.iron-ore": 120
      }
    },
    nodes: {
      ...smelter.plan.nodes,
      "node-smelter": {
        ...smelter.plan.nodes["node-smelter"],
        modeId: "mode.basic-smelter.efficient"
      }
    },
    edges: {
      "edge-placeholder": {
        id: "edge-placeholder",
        sourceNodeId: "node-smelter",
        sourcePortId: "ingot-out",
        targetNodeId: "node-smelter",
        targetPortId: "ore-in"
      }
    }
  };
}

describe("project file codec", () => {
  it("round-trips project files without losing nodes, edges, or modes", () => {
    const plan = buildProjectPlan();
    const encoded = encodeProjectFile(plan);
    const decoded = decodeProjectFile(encoded, dataset);

    expect(decoded.errors).toEqual([]);
    expect(decoded.plan).toMatchObject({
      datasetVersion: plan.datasetVersion,
      siteConfig: {
        sitePresetId: plan.siteConfig.sitePresetId,
        externalInputCaps: plan.siteConfig.externalInputCaps
      },
      nodes: {
        "node-smelter": {
          modeId: "mode.basic-smelter.efficient",
          position: { x: 2, y: 4 }
        }
      },
      edges: {
        "edge-placeholder": {
          sourcePortId: "ingot-out",
          targetPortId: "ore-in"
        }
      }
    });
  });

  it("returns dataset mismatch warnings on import", () => {
    const plan = buildProjectPlan();
    const encoded = encodeProjectFile({
      ...plan,
      datasetVersion: "older-dataset"
    });
    const decoded = decodeProjectFile(encoded, dataset);

    expect(decoded.warnings.map((warning) => warning.code)).toContain(
      "project.dataset-version-mismatch"
    );
  });

  it("tolerates unknown optional fields during import", () => {
    const plan = buildProjectPlan();
    const encoded = encodeProjectFile(plan);
    const parsed = JSON.parse(encoded) as Record<string, unknown>;
    parsed.extraField = { future: true };
    parsed.payload = {
      ...(parsed.payload as Record<string, unknown>),
      futureNodeDecorations: [{ nodeId: "node-smelter", color: "blue" }]
    };

    const decoded = decodeProjectFile(JSON.stringify(parsed), dataset);

    expect(decoded.errors).toEqual([]);
    expect(decoded.plan?.nodes["node-smelter"]?.modeId).toBe("mode.basic-smelter.efficient");
  });

  it("shares the same canonical payload between project files and browser storage", () => {
    const plan = buildProjectPlan();
    const projectFile = JSON.parse(encodeProjectFile(plan)) as {
      formatVersion: string;
      payload: unknown;
    };
    const browserStorage = JSON.parse(encodeBrowserStorage(plan)) as {
      formatVersion: string;
      payload: unknown;
    };

    expect(projectFile.formatVersion).toBe(PROJECT_FILE_FORMAT_VERSION);
    expect(browserStorage.formatVersion).toBe(PROJECT_FILE_FORMAT_VERSION);
    expect(browserStorage.payload).toEqual(projectFile.payload);
    expect(decodeBrowserStorage(JSON.stringify(browserStorage), dataset).errors).toEqual([]);
  });
});
