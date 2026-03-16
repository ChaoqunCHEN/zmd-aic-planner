import { expect, test } from "@playwright/test";
import { gotoReadyApp } from "./fixtures/testApp";

test("keeps the reference pane and inspector synchronized with selection and search", async ({
  page,
  context
}) => {
  await gotoReadyApp(page, context);

  await page.getByTestId("reference-search-input").fill("Survey Annex");
  await expect(page.getByText("Survey Annex", { exact: true })).toBeVisible();

  await page.getByTestId("reference-search-input").fill("Survey Annex Iron Ore Intake Cap");
  await expect(page.getByText("Survey Annex Iron Ore Intake Cap")).toBeVisible();

  await page.getByTestId("reference-search-input").fill("");
  await page.getByTestId("catalog-item:machine.basic-smelter").click();
  await page.getByTestId("grid-cell:2:4").click();

  const smelterNode = page.getByTestId(/plan-node:node-/).nth(0);
  await smelterNode.click();
  await expect(page.getByTestId("selection-inspector")).toContainText("Basic Smelter");
  await expect(page.getByTestId("reference-pane")).toContainText("Iron Ore -> Iron Ingot");

  await page.getByTestId("node-mode-select").selectOption("mode.basic-smelter.efficient");
  await expect(page.getByTestId("selection-inspector")).toContainText("Efficient Burn");
  await expect(page.getByTestId("reference-pane")).toContainText("Source confidence: probable");
  await expect(page.getByTestId("reference-pane")).toContainText(
    "Throughput multiplier: 0.75x"
  );

  await page.getByTestId("diagnostic-item:connection.disconnected-input").click();
  await expect(page.getByTestId("reference-pane")).toContainText("Basic Smelter");
});
