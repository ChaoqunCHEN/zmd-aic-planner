import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DownloadedAsset, SklandDetailRecord } from "./types";

export type AssetDownloadResult = {
  body: Buffer;
  mimeType: string;
};

export type AssetClient = {
  downloadAsset(url: string): Promise<AssetDownloadResult>;
};

const mimeExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

function extensionFromUrl(url: string) {
  const match = url.match(/\.(png|jpg|jpeg|webp)(?:$|\?)/i);
  if (!match) {
    return ".bin";
  }

  const ext = match[1]?.toLowerCase();
  return ext === "jpeg" ? ".jpg" : `.${ext}`;
}

function resolveAssetExtension(mimeType: string, sourceUrl: string) {
  return mimeExtensions[mimeType] ?? extensionFromUrl(sourceUrl);
}

async function hashFile(filePath: string) {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function writeAssetIfNeeded(input: {
  client: AssetClient;
  rootDir: string;
  assetDir: string;
  plannerId: string;
  kind: "icon" | "illustration";
  sourceUrl: string;
  resume: boolean;
}) {
  const extension = extensionFromUrl(input.sourceUrl);
  const filePath = join(input.assetDir, input.plannerId, `${input.kind}${extension}`);

  if (input.resume) {
    try {
      await stat(filePath);
      const sha256 = await hashFile(filePath);
      return {
        downloaded: false,
        asset: {
          kind: input.kind,
          path: filePath.replace(`${input.rootDir}/`, ""),
          sourceUrl: input.sourceUrl,
          mimeType: `image/${extension.replace(".", "")}`,
          sha256
        } satisfies DownloadedAsset
      };
    } catch {
      // Resume mode should quietly fall back to a fresh download when the asset is missing.
    }
  }

  const response = await input.client.downloadAsset(input.sourceUrl);
  const resolvedExtension = resolveAssetExtension(response.mimeType, input.sourceUrl);
  const resolvedPath = join(input.assetDir, input.plannerId, `${input.kind}${resolvedExtension}`);
  await mkdir(join(input.assetDir, input.plannerId), { recursive: true });
  await writeFile(resolvedPath, response.body);
  const sha256 = createHash("sha256").update(response.body).digest("hex");

  return {
    downloaded: true,
    asset: {
      kind: input.kind,
      path: resolvedPath.replace(`${input.rootDir}/`, ""),
      sourceUrl: input.sourceUrl,
      mimeType: response.mimeType,
      sha256
    } satisfies DownloadedAsset
  };
}

export async function mirrorDetailAssets(input: {
  client: AssetClient;
  rootDir: string;
  assetDir: string;
  plannerId: string;
  detail: SklandDetailRecord;
  resume: boolean;
}) {
  const assets: DownloadedAsset[] = [];
  let downloadedCount = 0;

  if (input.detail.iconUrl) {
    const result = await writeAssetIfNeeded({
      client: input.client,
      rootDir: input.rootDir,
      assetDir: input.assetDir,
      plannerId: input.plannerId,
      kind: "icon",
      sourceUrl: input.detail.iconUrl,
      resume: input.resume
    });
    assets.push(result.asset);
    downloadedCount += result.downloaded ? 1 : 0;
  }

  if (input.detail.illustrationUrl) {
    const result = await writeAssetIfNeeded({
      client: input.client,
      rootDir: input.rootDir,
      assetDir: input.assetDir,
      plannerId: input.plannerId,
      kind: "illustration",
      sourceUrl: input.detail.illustrationUrl,
      resume: input.resume
    });
    assets.push(result.asset);
    downloadedCount += result.downloaded ? 1 : 0;
  }

  return {
    assets,
    downloadedCount
  };
}
