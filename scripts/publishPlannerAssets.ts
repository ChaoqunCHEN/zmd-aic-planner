import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

export async function publishPlannerAssets(input: { rootDir: string }) {
  const rootDir = resolve(input.rootDir);
  const sourceDir = resolve(rootDir, "game-data", "assets");
  const targetDir = resolve(rootDir, "public", "game-data", "assets");

  await rm(targetDir, { recursive: true, force: true });
  await cp(sourceDir, targetDir, { recursive: true });

  return {
    sourceDir,
    targetDir
  };
}
