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
  it("stores v1.1 reference-only metadata explicitly on crawled placeables", () => {
    const rawSklandPlaceable = placeableItems.find((item) => item.id === "machine.skland-10");
    expect(rawSklandPlaceable).toBeDefined();

    if (!rawSklandPlaceable) {
      return;
    }

    expect(Object.prototype.hasOwnProperty.call(rawSklandPlaceable, "availabilityStatus")).toBe(
      true
    );
    expect(rawSklandPlaceable.availabilityStatus).toBe("reference-only");
    expect(Object.prototype.hasOwnProperty.call(rawSklandPlaceable, "plannerCategory")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(rawSklandPlaceable, "placementKind")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(rawSklandPlaceable, "sourceCategoryLabel")).toBe(
      true
    );
    expect(
      Object.prototype.hasOwnProperty.call(rawSklandPlaceable, "sourceSubCategoryLabel")
    ).toBe(true);
  });

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

  it("keeps the starter site free of anonymous blocked strips", () => {
    const trainingYard = dataset.sitePresets["site.training-yard"];

    expect(trainingYard.blockedZones).toEqual([]);
    expect(trainingYard.fixtures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fixtureTypeId: "fixture.iron-deposit"
        })
      ])
    );
  });

  it("maps alternate-site blocked areas to named fixtures or reserved structures", () => {
    const surveyAnnex = dataset.sitePresets["site.survey-annex"];
    const fixtureTypeIds = surveyAnnex.fixtures.map((fixture) => fixture.fixtureTypeId);

    expect(fixtureTypeIds).toEqual(
      expect.arrayContaining(["fixture.collapsed-walkway", "fixture.sub-pac-pad"])
    );
  });

  it("contains a minimal validated interactive placeable set", () => {
    const validated = Object.values(dataset.placeableItems).filter(
      (item) => item.availabilityStatus === "validated"
    );
    const validatedIds = validated.map((item) => item.id);

    expect(validatedIds).toEqual(
      expect.arrayContaining([
        "machine.basic-smelter",
        "terminal.ore-intake",
        "terminal.ingot-output",
        "belt.basic-conveyor",
        "pipe.basic-pipe",
        "logistics-building.compact-splitter"
      ])
    );

    for (const item of validated) {
      expect(item.icon?.path).toBeTruthy();
    }
  });

  it("keeps crawled placeables visible as reference-only records", () => {
    expect(dataset.placeableItems["machine.skland-10"].availabilityStatus).toBe("reference-only");
    expect(dataset.placeableItems["machine.skland-10"].plannerCategory).toBe("logistics");
  });

  it("ships in-game type metadata and usage hints for crawled machine families", () => {
    const miner = dataset.placeableItems["machine.skland-166"];
    const logistics = dataset.placeableItems["machine.skland-164"];
    const storage = dataset.placeableItems["machine.skland-168"];

    expect(miner.inGameTypeLabel).toBe("资源开采");
    expect(miner.usageHints?.length).toBeGreaterThan(0);
    expect(logistics.inGameTypeLabel).toBe("物流设备");
    expect(logistics.plannerCategory).toBe("logistics");
    expect(storage.inGameTypeLabel).toBe("仓储存区");
    expect(storage.plannerCategory).toBe("storage");
  });

  it("ships planner category and source-category metadata for curated logistics pieces", () => {
    const belt = dataset.placeableItems["belt.basic-conveyor"];
    const pipe = dataset.placeableItems["pipe.basic-pipe"];
    const splitter = dataset.placeableItems["logistics-building.compact-splitter"];

    expect(belt.plannerCategory).toBe("logistics");
    expect(belt.sourceCategoryLabel).toBe("Conveyance");
    expect(belt.placementKind).toBe("linear");
    expect(belt.ports[0]).toMatchObject({
      side: "west",
      offset: 0.5,
      mediumKind: "item",
      maxLinks: 1
    });

    expect(pipe.subtype).toBe("pipe");
    expect(pipe.placementKind).toBe("linear");
    expect(pipe.ports[0]).toMatchObject({
      side: "west",
      offset: 0.5,
      mediumKind: "fluid",
      maxLinks: 1
    });

    expect(splitter.subtype).toBe("logistics-building");
    expect(splitter.plannerCategory).toBe("logistics");
    expect(splitter.sourceSubCategoryLabel).toBe("Flow Control");
  });
});
