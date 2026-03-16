import { promises as fs } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { gotoReadyApp } from "./fixtures/testApp";

async function placeItem(testId: string, cellTestId: string, page: Page) {
  await page.getByTestId(testId).click();
  await page.getByTestId(cellTestId).click();
}

test("restores autosave and preserves import-export round trips", async ({ page, context }) => {
  await gotoReadyApp(page, context);

  await placeItem("catalog-item:terminal.ore-intake", "grid-cell:0:4", page);
  await placeItem("catalog-item:machine.basic-smelter", "grid-cell:2:4", page);
  await placeItem("catalog-item:terminal.ingot-output", "grid-cell:5:4", page);

  await page.getByTestId(/port:.*:ore-out/).click();
  await page.getByTestId(/port:.*:ore-in/).click();
  await page.getByTestId(/port:.*:ingot-out/).click();
  await page.getByTestId(/port:.*:ingot-in/).click();

  const smelterNode = page.getByTestId(/plan-node:node-/).nth(1);
  await smelterNode.click();
  await page.getByTestId("node-mode-select").selectOption("mode.basic-smelter.efficient");
  await page.getByTestId("input-cap:resource.iron-ore").fill("10");

  await expect
    .poll(async () =>
      page.evaluate(() => window.localStorage.getItem("aic-planner.autosave"))
    )
    .not.toBeNull();

  await page.reload();
  await expect(page.getByTestId(/plan-node:node-/)).toHaveCount(3);
  await expect(page.getByTestId(/plan-edge:edge-/)).toHaveCount(2);

  const restoredSmelter = page.getByTestId(/plan-node:node-/).nth(1);
  await restoredSmelter.click();
  await expect(page.getByTestId("node-mode-select")).toHaveValue(
    "mode.basic-smelter.efficient"
  );
  await expect(page.getByTestId("input-cap:resource.iron-ore")).toHaveValue("10");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-project-button").click()
  ]);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const exportedText = await fs.readFile(downloadPath!, "utf8");
  const exportedJson = JSON.parse(exportedText) as {
    payload: {
      edges: Record<string, unknown>;
      nodes: Record<string, { modeId?: string }>;
      siteConfig: { externalInputCaps: Record<string, number> };
    };
  };

  expect(Object.keys(exportedJson.payload.nodes)).toHaveLength(3);
  expect(Object.keys(exportedJson.payload.edges)).toHaveLength(2);
  expect(
    Object.values(exportedJson.payload.nodes).some(
      (node) => node.modeId === "mode.basic-smelter.efficient"
    )
  ).toBe(true);
  expect(exportedJson.payload.siteConfig.externalInputCaps["resource.iron-ore"]).toBe(10);

  await page.getByTestId("new-project-button").click();
  await page.getByTestId("site-preset-select").selectOption("site.survey-annex");
  await page.getByTestId("create-project-submit").click();
  await expect(page.getByTestId(/plan-node:node-/)).toHaveCount(0);

  await page.getByTestId("import-project-input").setInputFiles({
    mimeType: "application/json",
    name: "round-trip.json",
    buffer: Buffer.from(exportedText, "utf8")
  });

  await expect(page.getByTestId(/plan-node:node-/)).toHaveCount(3);
  await expect(page.getByTestId(/plan-edge:edge-/)).toHaveCount(2);

  const importedSmelter = page.getByTestId(/plan-node:node-/).nth(1);
  await importedSmelter.click();
  await expect(page.getByTestId("node-mode-select")).toHaveValue(
    "mode.basic-smelter.efficient"
  );
  await expect(page.getByTestId("input-cap:resource.iron-ore")).toHaveValue("10");
});
