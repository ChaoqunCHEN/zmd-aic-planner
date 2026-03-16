import type { DatasetBundle } from "../../domain/types";
import type { PlanDocument } from "../../domain/plan/document";
import {
  decodeBrowserStorage,
  encodeBrowserStorage
} from "../../domain/codecs/browserStorageCodec";
import {
  decodeProjectFile,
  encodeProjectFile,
  type ImportResult
} from "../../domain/codecs/projectFileCodec";
import type { StorageLike } from "../autosave/autosaveController";

export type RecentProjectRecord = {
  storageKey: string;
  name: string;
  updatedAt: string;
};

export const RECENT_PROJECTS_STORAGE_KEY = "aic-planner.recent-projects";

export function createProjectStorageKey(plan: Pick<PlanDocument, "metadata">) {
  return `aic-planner.project:${encodeURIComponent(plan.metadata.createdAt)}`;
}

export function exportProject(plan: PlanDocument) {
  return encodeProjectFile(plan);
}

export function importProject(serialized: string, dataset: DatasetBundle): ImportResult {
  return decodeProjectFile(serialized, dataset);
}

export function saveProjectToStorage(
  storage: StorageLike,
  storageKey: string,
  plan: PlanDocument
) {
  storage.setItem(storageKey, encodeBrowserStorage(plan));
}

export function loadProjectFromStorage(
  storage: StorageLike,
  storageKey: string,
  dataset: DatasetBundle
): ImportResult {
  const serialized = storage.getItem(storageKey);

  if (!serialized) {
    return {
      plan: null,
      warnings: [],
      errors: [
        {
          code: "storage.missing-project",
          message: `No stored project found for key "${storageKey}".`
        }
      ]
    };
  }

  return decodeBrowserStorage(serialized, dataset);
}

export function saveRecentProjects(
  storage: StorageLike,
  storageKey: string,
  projects: RecentProjectRecord[]
) {
  storage.setItem(storageKey, JSON.stringify(projects));
}

export function loadRecentProjects(
  storage: StorageLike,
  storageKey: string
): RecentProjectRecord[] {
  const serialized = storage.getItem(storageKey);

  if (!serialized) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is RecentProjectRecord => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as RecentProjectRecord).storageKey === "string" &&
        typeof (entry as RecentProjectRecord).name === "string" &&
        typeof (entry as RecentProjectRecord).updatedAt === "string"
      );
    });
  } catch {
    return [];
  }
}
