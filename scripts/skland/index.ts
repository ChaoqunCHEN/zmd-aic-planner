import { resolve } from "node:path";
import { bootstrapSklandSession } from "./bootstrapSession";
import { PlaywrightSklandClient } from "./client";
import { sklandCrawlerConfig } from "./config";
import { runSklandEquipmentCrawler } from "./pipeline";

type CliArgs = {
  rootDir: string;
  resume: boolean;
  smoke: boolean;
  typeMainId: string;
  typeSubId: string;
};

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = {
    rootDir: process.cwd(),
    resume: false,
    smoke: false,
    typeMainId: sklandCrawlerConfig.defaultTypeMainId,
    typeSubId: sklandCrawlerConfig.defaultTypeSubId
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--resume") {
      parsed.resume = true;
      continue;
    }

    if (value === "--smoke") {
      parsed.smoke = true;
      continue;
    }

    if (value === "--rootDir") {
      parsed.rootDir = resolve(argv[index + 1] ?? parsed.rootDir);
      index += 1;
      continue;
    }

    if (value.startsWith("--typeMainId=")) {
      parsed.typeMainId = value.split("=")[1] ?? parsed.typeMainId;
      continue;
    }

    if (value.startsWith("--typeSubId=")) {
      parsed.typeSubId = value.split("=")[1] ?? parsed.typeSubId;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const session = await bootstrapSklandSession({
    typeMainId: args.typeMainId,
    typeSubId: args.typeSubId
  });

  try {
    const client = new PlaywrightSklandClient({
      request: session.request,
      sessionContext: session.sessionContext
    });

    if (args.smoke) {
      const discoveries = await client.getItemList({
        typeMainId: args.typeMainId,
        typeSubId: args.typeSubId
      });
      const first = discoveries[0];
      if (!first) {
        throw new Error("Smoke crawl found no discovery records.");
      }

      const detail = await client.getItemInfo({
        sourceItemId: first.sourceItemId,
        typeMainId: first.typeMainId,
        typeSubId: first.typeSubId
      });

      process.stdout.write(
        `${JSON.stringify(
          {
            sourceItemId: first.sourceItemId,
            nameZhHans: detail.nameZhHans,
            iconUrl: detail.iconUrl,
            illustrationUrl: detail.illustrationUrl
          },
          null,
          2
        )}\n`
      );
      return;
    }

    const summary = await runSklandEquipmentCrawler({
      client,
      rootDir: args.rootDir,
      typeMainId: args.typeMainId,
      typeSubId: args.typeSubId,
      resume: args.resume,
      startedAt: new Date().toISOString()
    });

    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await session.dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
