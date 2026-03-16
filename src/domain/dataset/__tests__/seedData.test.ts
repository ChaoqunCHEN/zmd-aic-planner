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

const datasetResult = loadDataset({
  manifest,
  machineModes,
  placeableItems,
  recipes,
  resources,
  ruleFragments,
  siteFixtures,
  sitePresets
});

if (!datasetResult.ok) {
  throw new Error(`Expected bundled dataset to load: ${datasetResult.errors.join(", ")}`);
}

const dataset = datasetResult.data;

describe("bundled seed data", () => {
  it("ships at least two curated site presets with matching rule coverage", () => {
    const sitePresetIds = Object.keys(dataset.sitePresets);

    expect(sitePresetIds).toEqual(
      expect.arrayContaining(["site.training-yard", "site.survey-annex"])
    );
    expect(
      Object.values(dataset.ruleFragments)
        .filter((fragment) => fragment.ruleType === "external-input-cap")
        .flatMap((fragment) => fragment.sitePresetIds)
    ).toEqual(expect.arrayContaining(sitePresetIds));
  });

  it("contains the complete starter production line, alternative mode path, and invalid-link coverage", () => {
    const smelter = dataset.placeableItems["machine.basic-smelter"];
    const oreTerminal = dataset.placeableItems["terminal.ore-intake"];
    const outputTerminal = dataset.placeableItems["terminal.ingot-output"];
    const recipe = dataset.recipes["recipe.smelt-iron"];

    expect(smelter.supportedModeIds?.length).toBeGreaterThan(1);
    expect(recipe.inputs[0]?.resourceId).toBe("resource.iron-ore");
    expect(recipe.outputs[0]?.resourceId).toBe("resource.iron-ingot");
    expect(oreTerminal.ports[0]?.resourceIds).toContain("resource.iron-ore");
    expect(outputTerminal.ports[0]?.resourceIds).toContain("resource.iron-ingot");
    expect(
      oreTerminal.ports[0]?.resourceIds.some((resourceId) =>
        outputTerminal.ports[0]?.resourceIds.includes(resourceId)
      )
    ).toBe(false);
  });

  it("includes both deposit and obstacle fixtures for site-metadata browsing", () => {
    expect(
      Object.values(dataset.siteFixtures).map((fixture) => fixture.fixtureCategory)
    ).toEqual(expect.arrayContaining(["resource-deposit", "obstacle"]));
  });
});
