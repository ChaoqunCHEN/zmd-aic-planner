import { describe, expect, it } from "vitest";
import manifest from "../../../../game-data/dataset-manifest.json";
import machineModes from "../../../../game-data/machine-modes.json";
import placeableItems from "../../../../game-data/placeable-items.json";
import recipes from "../../../../game-data/recipes.json";
import resources from "../../../../game-data/resources.json";
import ruleFragments from "../../../../game-data/rule-fragments.json";
import siteFixtures from "../../../../game-data/site-fixtures.json";
import sitePresets from "../../../../game-data/site-presets.json";
import { loadDataset } from "../loadDataset";
import { rawDatasetFilesSchema } from "../schemas";

const bundledDataset = {
  manifest,
  placeableItems,
  resources,
  recipes,
  machineModes,
  sitePresets,
  siteFixtures,
  ruleFragments
};

describe("dataset schemas", () => {
  it("parses the bundled MVP dataset files", () => {
    const parsed = rawDatasetFilesSchema.safeParse(bundledDataset);

    expect(parsed.success).toBe(true);
  });
});

describe("loadDataset", () => {
  it("normalizes the bundled dataset into immutable lookup tables", () => {
    const result = loadDataset(bundledDataset);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.data.version).toBe(manifest.version);
    expect(result.data.placeableItems["machine.basic-smelter"].name).toBe("Basic Smelter");
    expect(result.data.recipes["recipe.smelt-iron"].outputs[0]?.resourceId).toBe("resource.iron-ingot");
    expect(Object.isFrozen(result.data.placeableItems)).toBe(true);
    expect(Object.isFrozen(result.data.placeableItems["machine.basic-smelter"])).toBe(true);
  });

  it("reports human-readable reference errors", () => {
    const invalidDataset = structuredClone(bundledDataset);
    invalidDataset.recipes[0].inputs[0].resourceId = "resource.missing";

    const result = loadDataset(invalidDataset);

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.errors).toContain(
      'recipes.json: recipe "recipe.smelt-iron" references unknown input resource "resource.missing"'
    );
  });

  it("preserves source confidence on normalized records", () => {
    const result = loadDataset(bundledDataset);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.data.placeableItems["machine.basic-smelter"].source.sourceConfidence).toBe(
      "verified"
    );
    expect(result.data.machineModes["mode.basic-smelter.efficient"].source.sourceConfidence).toBe(
      "probable"
    );
  });
});
