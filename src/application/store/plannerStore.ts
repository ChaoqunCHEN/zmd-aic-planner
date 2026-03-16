import { createStore, type StoreApi } from "zustand/vanilla";
import { runAnalysis, type AnalysisResult } from "../../domain/analysis/runAnalysis";
import { buildDiagnostics } from "../../domain/diagnostics/buildDiagnostics";
import type { Diagnostic } from "../../domain/diagnostics/types";
import { type PlanDocument } from "../../domain/plan/document";
import type { DatasetBundle } from "../../domain/types";
import {
  createAutosaveController,
  type AutosaveController,
  type StorageLike
} from "../autosave/autosaveController";
import { createPlannerCommands, type PlannerCommands } from "../commands/plannerCommands";
import { saveProjectToStorage } from "../project/projectIO";

export type RecentProject = {
  storageKey: string;
  name: string;
  updatedAt: string;
};

export type SelectionState = {
  selectedNodeId: string | null;
  selectedDiagnosticId: string | null;
};

export type CommandStatus = {
  lastCommand: string | null;
  lastError: string | null;
};

export type AutosaveStatus = {
  state: "idle" | "pending" | "saved";
  storageKey: string;
  lastSavedAt: string | null;
};

export type ImportStatus = {
  warnings: { code: string; message: string }[];
  errors: { code: string; message: string }[];
};

export type PlannerState = {
  dataset: DatasetBundle;
  plan: PlanDocument | null;
  diagnostics: Diagnostic[];
  analysis: AnalysisResult | null;
  selection: SelectionState;
  recentProjects: RecentProject[];
  history: {
    past: PlanDocument[];
    future: PlanDocument[];
  };
  status: CommandStatus;
  autosave: AutosaveStatus;
  importStatus: ImportStatus;
  commands: PlannerCommands;
};

export type PlannerStore = StoreApi<PlannerState>;

export type PlannerStoreOptions = {
  dataset: DatasetBundle;
  storage?: StorageLike;
  autosaveDelayMs?: number;
  storageKey?: string;
  now?: () => string;
};

export type PlannerStoreServices = {
  autosaveController: AutosaveController;
  now: () => string;
  storageKey: string;
};

export function recomputeDerivedState(plan: PlanDocument | null, dataset: DatasetBundle) {
  const diagnostics = plan ? buildDiagnostics(plan, dataset) : [];
  const analysis = plan ? runAnalysis(plan, dataset) : null;

  return {
    diagnostics,
    analysis
  };
}

function buildRecentProjects(
  current: RecentProject[],
  storageKey: string,
  name: string,
  updatedAt: string
) {
  const next = [
    { storageKey, name, updatedAt },
    ...current.filter((project) => project.storageKey !== storageKey)
  ];

  return next.slice(0, 10);
}

export function persistPlan(
  store: PlannerStore,
  services: PlannerStoreServices,
  plan: PlanDocument
) {
  store.setState((state) => ({
    autosave: {
      ...state.autosave,
      state: "pending"
    },
    recentProjects: buildRecentProjects(
      state.recentProjects,
      services.storageKey,
      plan.metadata.name,
      plan.metadata.updatedAt
    )
  }));

  services.autosaveController.schedule(plan.metadata.updatedAt);
}

export function createPlannerStore(options: PlannerStoreOptions): PlannerStore {
  const storageKey = options.storageKey ?? "aic-planner.autosave";
  const now = options.now ?? (() => new Date().toISOString());
  const storage =
    options.storage ??
    ({
      getItem() {
        return null;
      },
      setItem() {}
    } satisfies StorageLike);

  const storeRef: { current: PlannerStore | null } = { current: null };

  const autosaveController = createAutosaveController({
    delayMs: options.autosaveDelayMs ?? 250,
    save(marker) {
      const store = storeRef.current;
      if (!store) {
        return;
      }

      const state = store.getState();

      if (!state.plan) {
        return;
      }

      void marker;
      saveProjectToStorage(storage, storageKey, state.plan);
      store.setState((current) => ({
        autosave: {
          ...current.autosave,
          state: "saved",
          lastSavedAt: now()
        }
      }));
    }
  });

  const services: PlannerStoreServices = {
    autosaveController,
    now,
    storageKey
  };

  const store = createStore<PlannerState>(() => {
    const initialCommands = {} as PlannerCommands;

    return {
      dataset: options.dataset,
      plan: null,
      diagnostics: [],
      analysis: null,
      selection: {
        selectedNodeId: null,
        selectedDiagnosticId: null
      },
      recentProjects: [],
      history: {
        past: [],
        future: []
      },
      status: {
        lastCommand: null,
        lastError: null
      },
      autosave: {
        state: "idle",
        storageKey,
        lastSavedAt: null
      },
      importStatus: {
        warnings: [],
        errors: []
      },
      commands: initialCommands
    };
  });

  const commands = createPlannerCommands(store, services);
  store.setState((state) => ({
    ...state,
    commands
  }));
  storeRef.current = store;

  return store;
}

export function updatePlanState(
  store: PlannerStore,
  services: PlannerStoreServices,
  nextPlan: PlanDocument,
  commandName: string,
  selectedNodeId: string | null = null
) {
  const state = store.getState();
  const derived = recomputeDerivedState(nextPlan, state.dataset);

  store.setState({
    ...state,
    plan: nextPlan,
    diagnostics: derived.diagnostics,
    analysis: derived.analysis,
    selection: {
      selectedNodeId,
      selectedDiagnosticId: null
    },
    history: {
      past: state.plan ? [...state.history.past, state.plan] : state.history.past,
      future: []
    },
    status: {
      lastCommand: commandName,
      lastError: null
    },
    importStatus: {
      warnings: state.importStatus.warnings,
      errors: []
    }
  });

  persistPlan(store, services, nextPlan);
}
