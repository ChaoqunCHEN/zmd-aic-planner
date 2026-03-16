import { z } from "zod";
import type { DatasetBundle } from "../types";
import type { PlanDocument } from "../plan/document";

export const PROJECT_FILE_FORMAT_VERSION = "1";

export type ImportNotice = {
  code: string;
  message: string;
};

export type ImportResult = {
  plan: PlanDocument | null;
  warnings: ImportNotice[];
  errors: ImportNotice[];
};

const gridPointSchema = z
  .object({
    x: z.number(),
    y: z.number()
  })
  .passthrough();

const gridSizeSchema = z
  .object({
    width: z.number(),
    height: z.number()
  })
  .passthrough();

const planNodeSchema = z
  .object({
    id: z.string(),
    catalogId: z.string(),
    kind: z.enum(["machine", "logistics", "io"]),
    position: gridPointSchema,
    footprint: gridSizeSchema,
    rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    modeId: z.string().optional(),
    settings: z.record(z.string(), z.unknown())
  })
  .passthrough();

const planEdgeSchema = z
  .object({
    id: z.string(),
    sourceNodeId: z.string(),
    sourcePortId: z.string(),
    targetNodeId: z.string(),
    targetPortId: z.string()
  })
  .passthrough();

const planDocumentPayloadSchema = z
  .object({
    formatVersion: z.string(),
    datasetVersion: z.string(),
    metadata: z
      .object({
        name: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
        notes: z.string().optional()
      })
      .passthrough(),
    siteConfig: z
      .object({
        sitePresetId: z.string(),
        externalInputCaps: z.record(z.string(), z.number())
      })
      .passthrough(),
    nodes: z.record(z.string(), planNodeSchema),
    edges: z.record(z.string(), planEdgeSchema)
  })
  .passthrough();

const projectFileSchema = z
  .object({
    formatVersion: z.string(),
    datasetVersion: z.string(),
    exportedAt: z.string(),
    payload: planDocumentPayloadSchema
  })
  .passthrough();

export function encodeProjectFile(plan: PlanDocument, exportedAt = new Date().toISOString()) {
  return JSON.stringify({
    formatVersion: PROJECT_FILE_FORMAT_VERSION,
    datasetVersion: plan.datasetVersion,
    exportedAt,
    payload: plan
  });
}

export function decodeProjectFile(serialized: string, dataset: DatasetBundle): ImportResult {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(serialized);
  } catch {
    return {
      plan: null,
      warnings: [],
      errors: [
        {
          code: "project.invalid-json",
          message: "The project file is not valid JSON."
        }
      ]
    };
  }

  const parsed = projectFileSchema.safeParse(parsedJson);

  if (!parsed.success) {
    return {
      plan: null,
      warnings: [],
      errors: parsed.error.issues.map((issue) => ({
        code: "project.invalid-schema",
        message: `${issue.path.join(".") || "(root)"}: ${issue.message}`
      }))
    };
  }

  const warnings: ImportNotice[] = [];

  if (parsed.data.datasetVersion !== dataset.version) {
    warnings.push({
      code: "project.dataset-version-mismatch",
      message: `Project file dataset version "${parsed.data.datasetVersion}" does not match the currently loaded dataset "${dataset.version}".`
    });
  }

  return {
    plan: parsed.data.payload as PlanDocument,
    warnings,
    errors: []
  };
}

export { planDocumentPayloadSchema };
