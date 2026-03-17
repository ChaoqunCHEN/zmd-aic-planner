import { promises as fs } from "node:fs";
import { expect, test } from "@playwright/test";
import { gotoReadyApp } from "./fixtures/testApp";

test("restores autosave and preserves import-export round trips", async ({ page, context }) => {
  await gotoReadyApp(page, context);

  await page.getByTestId("import-project-input").setInputFiles("e2e/fixtures/canonical-project.json");

  const smelterNode = page.getByTestId("plan-node:node-smelter");
  await smelterNode.click();
  await page.getByTestId("node-mode-select").selectOption("mode.basic-smelter.efficient");
  await page.getByTestId("input-cap:resource.iron-ore").fill("10");

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const serialized = window.localStorage.getItem("aic-planner.autosave");
        if (!serialized) {
          return null;
        }

        const parsed = JSON.parse(serialized) as {
          payload?: {
            nodes?: Record<string, { modeId?: string }>;
            edges?: Record<string, unknown>;
            siteConfig?: { externalInputCaps?: Record<string, number> };
          };
        };

        return {
          edgeCount: Object.keys(parsed.payload?.edges ?? {}).length,
          hasEfficientMode: Object.values(parsed.payload?.nodes ?? {}).some(
            (node) => node.modeId === "mode.basic-smelter.efficient"
          ),
          ironOreCap: parsed.payload?.siteConfig?.externalInputCaps?.["resource.iron-ore"] ?? null,
          nodeCount: Object.keys(parsed.payload?.nodes ?? {}).length
        };
      })
    )
    .toEqual({
      edgeCount: 2,
      hasEfficientMode: true,
      ironOreCap: 10,
      nodeCount: 3
    });

  await page.reload();
  await expect(page.getByTestId(/plan-node:/)).toHaveCount(3);
  await expect(page.getByTestId(/plan-edge:/)).toHaveCount(2);

  const restoredSmelter = page.getByTestId("plan-node:node-smelter");
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
  await expect(page.getByTestId(/plan-node:/)).toHaveCount(0);

  await page.getByTestId("import-project-input").setInputFiles({
    mimeType: "application/json",
    name: "round-trip.json",
    buffer: Buffer.from(exportedText, "utf8")
  });

  await expect(page.getByTestId(/plan-node:/)).toHaveCount(3);
  await expect(page.getByTestId(/plan-edge:/)).toHaveCount(2);

  const importedSmelter = page.getByTestId("plan-node:node-smelter");
  await importedSmelter.click();
  await expect(page.getByTestId("node-mode-select")).toHaveValue(
    "mode.basic-smelter.efficient"
  );
  await expect(page.getByTestId("input-cap:resource.iron-ore")).toHaveValue("10");
});
