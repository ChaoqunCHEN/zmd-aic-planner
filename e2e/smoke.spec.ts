import { expect, test } from "@playwright/test";
import { gotoReadyApp } from "./fixtures/testApp";

test("boots to the unofficial planner shell", async ({ page, context }) => {
  await gotoReadyApp(page, context);

  await expect(page.getByTestId("unofficial-label")).toContainText("Unofficial");
  await expect(page.getByText("AIC Planner")).toBeVisible();
});
