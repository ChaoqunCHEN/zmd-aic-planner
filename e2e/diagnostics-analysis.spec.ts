import { expect, test } from "@playwright/test";
import { gotoReadyApp } from "./fixtures/testApp";

test("surfaces invalid placement, invalid connection diagnostics, mode changes, and cap warnings", async ({
  page,
  context
}) => {
  await gotoReadyApp(page, context);

  await page.getByTestId("catalog-item:machine.basic-smelter").click();
  await page.getByTestId("grid-cell:5:0").hover();
  await expect(page.getByTestId("placement-ghost")).toHaveAttribute("data-state", "invalid");
  await page.getByTestId("import-project-input").setInputFiles("e2e/fixtures/canonical-project.json");

  const smelterNode = page.getByTestId("plan-node:node-smelter");
  await smelterNode.click();
  await expect(page.getByTestId("selection-inspector")).toContainText(
    "Current throughput: 15.00/min"
  );

  await page.getByTestId("node-mode-select").selectOption("mode.basic-smelter.efficient");
  await expect(page.getByTestId("selection-inspector")).toContainText(
    "Current throughput: 11.25/min"
  );

  await page.getByTestId("port:node-intake:ore-out").click();
  await page.getByTestId("port:node-output:ingot-in").click();
  await expect(page.getByTestId("diagnostic-item:connection.resource-mismatch")).toBeVisible();

  await page.getByTestId("input-cap:resource.iron-ore").fill("10");
  await expect(page.getByTestId("diagnostic-item:cap.external-input-exceeded")).toBeVisible();
});
