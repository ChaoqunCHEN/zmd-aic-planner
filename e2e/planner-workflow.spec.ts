import { expect, test } from "@playwright/test";
import { gotoReadyApp } from "./fixtures/testApp";

test("places, selects, moves, rotates, and deletes a node on the grid", async ({
  page,
  context
}) => {
  await gotoReadyApp(page, context);

  await page.getByTestId("catalog-item:machine.basic-smelter").click();
  await page.getByTestId("grid-cell:2:4").hover();
  await expect(page.getByTestId("placement-ghost")).toHaveAttribute("data-state", "valid");
  await page.getByTestId("grid-cell:2:4").click();

  const node = page.getByTestId(/plan-node:node-/);
  await expect(node).toBeVisible();
  await node.click();
  await page.getByTestId("grid-cell:7:5").click();
  await node.press("r");
  await node.press("Delete");
  await expect(node).toHaveCount(0);
});
