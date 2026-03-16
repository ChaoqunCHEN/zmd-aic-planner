import type {
  LoadDatasetResult,
  PlaceableItem,
  RawDatasetFiles
} from "../types";

function validateUniqueIds(fileLabel: string, items: { id: string }[], errors: string[]) {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`${fileLabel}: duplicate id "${item.id}"`);
      continue;
    }

    seen.add(item.id);
  }
}

function validatePlaceableReferences(
  placeableItem: PlaceableItem,
  modeIds: Set<string>,
  recipeIds: Set<string>,
  errors: string[]
) {
  for (const modeId of placeableItem.supportedModeIds ?? []) {
    if (!modeIds.has(modeId)) {
      errors.push(
        `placeable-items.json: placeable "${placeableItem.id}" references unknown machine mode "${modeId}"`
      );
    }
  }

  if (placeableItem.defaultModeId && !modeIds.has(placeableItem.defaultModeId)) {
    errors.push(
      `placeable-items.json: placeable "${placeableItem.id}" references unknown default machine mode "${placeableItem.defaultModeId}"`
    );
  }

  for (const recipeId of placeableItem.recipeIds ?? []) {
    if (!recipeIds.has(recipeId)) {
      errors.push(
        `placeable-items.json: placeable "${placeableItem.id}" references unknown recipe "${recipeId}"`
      );
    }
  }
}

export function validateDataset(raw: RawDatasetFiles): string[] {
  const errors: string[] = [];

  validateUniqueIds("placeable-items.json", raw.placeableItems, errors);
  validateUniqueIds("resources.json", raw.resources, errors);
  validateUniqueIds("recipes.json", raw.recipes, errors);
  validateUniqueIds("machine-modes.json", raw.machineModes, errors);
  validateUniqueIds("site-presets.json", raw.sitePresets, errors);
  validateUniqueIds("site-fixtures.json", raw.siteFixtures, errors);
  validateUniqueIds("rule-fragments.json", raw.ruleFragments, errors);

  const resourceIds = new Set(raw.resources.map((item) => item.id));
  const modeIds = new Set(raw.machineModes.map((item) => item.id));
  const placeableIds = new Set(raw.placeableItems.map((item) => item.id));
  const recipeIds = new Set(raw.recipes.map((item) => item.id));
  const sitePresetIds = new Set(raw.sitePresets.map((item) => item.id));
  const siteFixtureIds = new Set(raw.siteFixtures.map((item) => item.id));

  for (const placeableItem of raw.placeableItems) {
    validatePlaceableReferences(placeableItem, modeIds, recipeIds, errors);

    for (const port of placeableItem.ports) {
      for (const resourceId of port.resourceIds) {
        if (!resourceIds.has(resourceId)) {
          errors.push(
            `placeable-items.json: port "${port.id}" on placeable "${placeableItem.id}" references unknown resource "${resourceId}"`
          );
        }
      }
    }
  }

  for (const recipe of raw.recipes) {
    if (!placeableIds.has(recipe.machineId)) {
      errors.push(
        `recipes.json: recipe "${recipe.id}" references unknown machine "${recipe.machineId}"`
      );
    }

    for (const input of recipe.inputs) {
      if (!resourceIds.has(input.resourceId)) {
        errors.push(
          `recipes.json: recipe "${recipe.id}" references unknown input resource "${input.resourceId}"`
        );
      }
    }

    for (const output of recipe.outputs) {
      if (!resourceIds.has(output.resourceId)) {
        errors.push(
          `recipes.json: recipe "${recipe.id}" references unknown output resource "${output.resourceId}"`
        );
      }
    }
  }

  for (const mode of raw.machineModes) {
    if (!placeableIds.has(mode.machineId)) {
      errors.push(
        `machine-modes.json: machine mode "${mode.id}" references unknown machine "${mode.machineId}"`
      );
    }
  }

  for (const sitePreset of raw.sitePresets) {
    for (const fixture of sitePreset.fixtures) {
      if (!siteFixtureIds.has(fixture.fixtureTypeId)) {
        errors.push(
          `site-presets.json: site preset "${sitePreset.id}" references unknown fixture type "${fixture.fixtureTypeId}"`
        );
      }
    }
  }

  for (const siteFixture of raw.siteFixtures) {
    if (siteFixture.resourceId && !resourceIds.has(siteFixture.resourceId)) {
      errors.push(
        `site-fixtures.json: fixture type "${siteFixture.id}" references unknown resource "${siteFixture.resourceId}"`
      );
    }
  }

  for (const rule of raw.ruleFragments) {
    if (!resourceIds.has(rule.resourceId)) {
      errors.push(
        `rule-fragments.json: rule "${rule.id}" references unknown resource "${rule.resourceId}"`
      );
    }

    for (const sitePresetId of rule.sitePresetIds) {
      if (!sitePresetIds.has(sitePresetId)) {
        errors.push(
          `rule-fragments.json: rule "${rule.id}" references unknown site preset "${sitePresetId}"`
        );
      }
    }
  }

  return errors;
}

export function errorResult(errors: string[]): LoadDatasetResult {
  return {
    ok: false,
    errors
  };
}
