import manifest from "../../game-data/dataset-manifest.json";
import machineModes from "../../game-data/machine-modes.json";
import placeableItems from "../../game-data/placeable-items.json";
import recipes from "../../game-data/recipes.json";
import resources from "../../game-data/resources.json";
import ruleFragments from "../../game-data/rule-fragments.json";
import siteFixtures from "../../game-data/site-fixtures.json";
import sitePresets from "../../game-data/site-presets.json";
import { loadDataset } from "../domain/dataset/loadDataset";

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
  throw new Error(`Failed to load bundled dataset: ${datasetResult.errors.join(", ")}`);
}

export const bundledDataset = datasetResult.data;
