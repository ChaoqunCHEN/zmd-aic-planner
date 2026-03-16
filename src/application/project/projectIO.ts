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
