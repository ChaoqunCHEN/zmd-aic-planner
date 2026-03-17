import { publishPlannerAssets } from "./publishPlannerAssets";

async function main() {
  await publishPlannerAssets({
    rootDir: process.cwd()
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
