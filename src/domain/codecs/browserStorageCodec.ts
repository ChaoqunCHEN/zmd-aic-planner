import { z } from "zod";
import type { DatasetBundle } from "../types";
import type { PlanDocument } from "../plan/document";
import {
  decodeProjectFile,
  PROJECT_FILE_FORMAT_VERSION,
  planDocumentPayloadSchema,
  type ImportResult
} from "./projectFileCodec";

const browserStorageSchema = z
  .object({
    formatVersion: z.string(),
    datasetVersion: z.string(),
    savedAt: z.string(),
    payload: planDocumentPayloadSchema
  })
  .passthrough();

export function encodeBrowserStorage(plan: PlanDocument, savedAt = new Date().toISOString()) {
  return JSON.stringify({
    formatVersion: PROJECT_FILE_FORMAT_VERSION,
    datasetVersion: plan.datasetVersion,
    savedAt,
    payload: plan
  });
}

export function decodeBrowserStorage(serialized: string, dataset: DatasetBundle): ImportResult {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(serialized);
  } catch {
    return {
      plan: null,
      warnings: [],
      errors: [
        {
          code: "storage.invalid-json",
          message: "Stored project data is not valid JSON."
        }
      ]
    };
  }

  const parsed = browserStorageSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return {
      plan: null,
      warnings: [],
      errors: parsed.error.issues.map((issue) => ({
        code: "storage.invalid-schema",
        message: `${issue.path.join(".") || "(root)"}: ${issue.message}`
      }))
    };
  }

  return decodeProjectFile(
    JSON.stringify({
      formatVersion: parsed.data.formatVersion,
      datasetVersion: parsed.data.datasetVersion,
      exportedAt: parsed.data.savedAt,
      payload: parsed.data.payload
    }),
    dataset
  );
}
