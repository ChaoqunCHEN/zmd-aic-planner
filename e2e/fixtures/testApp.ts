import { expect, type BrowserContext, type Page } from "@playwright/test";
import { resetStorage } from "./storage";

export async function gotoReadyApp(page: Page, context: BrowserContext) {
  await resetStorage(page, context);
  await page.goto("/");
  await expect(page.getByTestId("app-shell")).toHaveAttribute("data-state", "ready");
  await expect(page.getByTestId("empty-workbench")).toBeVisible();
}
