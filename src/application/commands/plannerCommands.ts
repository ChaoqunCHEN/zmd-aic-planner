import { createPlan } from "../../domain/plan/document";
import {
  connectPorts,
  createEdgeId,
  disconnectEdge,
  moveNode,
  placeNode,
  removeNode,
  setExternalInputCap,
  setNodeMode
} from "../../domain/plan/operations";
import {
  createProjectStorageKey,
  exportProject,
  importProject,
  loadProjectFromStorage
} from "../project/projectIO";
import {
  persistPlan,
  recomputeDerivedState,
  type PlannerStore,
  type PlannerStoreServices,
  updatePlanState
} from "../store/plannerStore";

export type PlannerCommands = {
  createProject(input: { sitePresetId: string; name?: string }): void;
  placeNode(input: { nodeId: string; catalogId: string; position: { x: number; y: number }; rotation?: 0 | 90 | 180 | 270 }): void;
  moveNode(input: { nodeId: string; position: { x: number; y: number }; rotation?: 0 | 90 | 180 | 270 }): void;
  removeNode(nodeId: string): void;
  connectPorts(input: {
    edgeId?: string;
    sourceNodeId: string;
    sourcePortId: string;
    targetNodeId: string;
    targetPortId: string;
  }): void;
  disconnectEdge(edgeId: string): void;
  setNodeMode(input: { nodeId: string; modeId: string | undefined }): void;
  setExternalInputCap(input: { resourceId: string; cap: number | null }): void;
  selectNode(nodeId: string | null): void;
  selectDiagnostic(diagnosticId: string | null): void;
  undo(): void;
  redo(): void;
  importProject(serialized: string): void;
  exportProject(): string | null;
  reopenRecentProject(storageKey: string): void;
};

export function createPlannerCommands(
  store: PlannerStore,
  services: PlannerStoreServices
): PlannerCommands {
  return {
    createProject(input) {
      const state = store.getState();
      const plan = createPlan(state.dataset, {
        sitePresetId: input.sitePresetId,
        projectName: input.name,
        now: services.now()
      });
      const projectStorageKey = createProjectStorageKey(plan);

      const derived = recomputeDerivedState(plan, state.dataset);

      store.setState({
        ...state,
        plan,
        diagnostics: derived.diagnostics,
        analysis: derived.analysis,
        selection: {
          selectedNodeId: null,
          selectedDiagnosticId: null
        },
        history: {
          past: [],
          future: []
        },
        status: {
          lastCommand: "createProject",
          lastError: null
        },
        autosave: {
          ...state.autosave,
          state: "pending",
          storageKey: projectStorageKey
        },
        importStatus: {
          warnings: [],
          errors: []
        }
      });

      persistPlan(store, services, plan);
    },

    placeNode(input) {
      const state = store.getState();
      if (!state.plan) {
        return;
      }

      const result = placeNode(state.plan, state.dataset, input);

      if (!result.ok) {
        store.setState({
          ...state,
          status: {
            lastCommand: "placeNode",
            lastError: result.reason.message
          }
        });
        return;
      }

      updatePlanState(store, services, result.plan, "placeNode", input.nodeId);
    },

    moveNode(input) {
      const state = store.getState();
      if (!state.plan) {
        return;
      }

      const result = moveNode(state.plan, state.dataset, input);

      if (!result.ok) {
        store.setState({
          ...state,
          status: {
            lastCommand: "moveNode",
            lastError: result.reason.message
          }
        });
        return;
      }

      updatePlanState(store, services, result.plan, "moveNode", input.nodeId);
    },

    removeNode(nodeId) {
      const state = store.getState();
      if (!state.plan) {
        return;
      }

      const nextPlan = removeNode(state.plan, nodeId);
      updatePlanState(store, services, nextPlan, "removeNode", null);
    },

    connectPorts(input) {
      const state = store.getState();
      if (!state.plan) {
        return;
      }

      const result = connectPorts(state.plan, {
        ...input,
        edgeId: input.edgeId ?? createEdgeId(input)
      });

      if (!result.ok) {
        store.setState({
          ...state,
          status: {
            lastCommand: "connectPorts",
            lastError: result.reason.message
          }
        });
        return;
      }

      updatePlanState(store, services, result.plan, "connectPorts", state.selection.selectedNodeId);
    },

    disconnectEdge(edgeId) {
      const state = store.getState();
      if (!state.plan) {
        return;
      }

      const result = disconnectEdge(state.plan, edgeId);

      if (!result.ok) {
        store.setState({
          ...state,
          status: {
            lastCommand: "disconnectEdge",
            lastError: result.reason.message
          }
        });
        return;
      }

      updatePlanState(
        store,
        services,
        result.plan,
        "disconnectEdge",
        state.selection.selectedNodeId
      );
    },

    setNodeMode(input) {
      const state = store.getState();
      if (!state.plan) {
        return;
      }

      const result = setNodeMode(state.plan, input.nodeId, input.modeId);

      if (!result.ok) {
        store.setState({
          ...state,
          status: {
            lastCommand: "setNodeMode",
            lastError: result.reason.message
          }
        });
        return;
      }

      updatePlanState(store, services, result.plan, "setNodeMode", input.nodeId);
    },

    setExternalInputCap(input) {
      const state = store.getState();
      if (!state.plan) {
        return;
      }

      const result = setExternalInputCap(state.plan, input.resourceId, input.cap);

      if (!result.ok) {
        store.setState({
          ...state,
          status: {
            lastCommand: "setExternalInputCap",
            lastError: result.reason.message
          }
        });
        return;
      }

      updatePlanState(
        store,
        services,
        result.plan,
        "setExternalInputCap",
        state.selection.selectedNodeId
      );
    },

    selectNode(nodeId) {
      store.setState((state) => ({
        ...state,
        selection: {
          selectedNodeId: nodeId,
          selectedDiagnosticId: null
        }
      }));
    },

    selectDiagnostic(diagnosticId) {
      store.setState((state) => ({
        ...state,
        selection: {
          selectedNodeId: state.selection.selectedNodeId,
          selectedDiagnosticId: diagnosticId
        }
      }));
    },

    undo() {
      const state = store.getState();
      const previous = state.history.past[state.history.past.length - 1];

      if (!previous || !state.plan) {
        return;
      }

      const derived = recomputeDerivedState(previous, state.dataset);

      store.setState({
        ...state,
        plan: previous,
        diagnostics: derived.diagnostics,
        analysis: derived.analysis,
        history: {
          past: state.history.past.slice(0, -1),
          future: [state.plan, ...state.history.future]
        },
        selection: {
          selectedNodeId: null,
          selectedDiagnosticId: null
        },
        status: {
          lastCommand: "undo",
          lastError: null
        }
      });

      persistPlan(store, services, previous);
    },

    redo() {
      const state = store.getState();
      const next = state.history.future[0];

      if (!next || !state.plan) {
        return;
      }

      const derived = recomputeDerivedState(next, state.dataset);

      store.setState({
        ...state,
        plan: next,
        diagnostics: derived.diagnostics,
        analysis: derived.analysis,
        history: {
          past: [...state.history.past, state.plan],
          future: state.history.future.slice(1)
        },
        selection: {
          selectedNodeId: null,
          selectedDiagnosticId: null
        },
        status: {
          lastCommand: "redo",
          lastError: null
        }
      });

      persistPlan(store, services, next);
    },

    importProject(serialized) {
      const state = store.getState();
      const result = importProject(serialized, state.dataset);

      if (!result.plan) {
        store.setState({
          ...state,
          importStatus: {
            warnings: result.warnings,
            errors: result.errors
          },
          status: {
            lastCommand: "importProject",
            lastError: result.errors[0]?.message ?? null
          }
        });
        return;
      }

      const derived = recomputeDerivedState(result.plan, state.dataset);
      const projectStorageKey = createProjectStorageKey(result.plan);

      store.setState({
        ...state,
        plan: result.plan,
        diagnostics: derived.diagnostics,
        analysis: derived.analysis,
        selection: {
          selectedNodeId: null,
          selectedDiagnosticId: null
        },
        history: {
          past: state.plan ? [...state.history.past, state.plan] : state.history.past,
          future: []
        },
        importStatus: {
          warnings: result.warnings,
          errors: result.errors
        },
        autosave: {
          ...state.autosave,
          state: "pending",
          storageKey: projectStorageKey
        },
        status: {
          lastCommand: "importProject",
          lastError: null
        }
      });

      persistPlan(store, services, result.plan);
    },

    exportProject() {
      const state = store.getState();
      return state.plan ? exportProject(state.plan) : null;
    },

    reopenRecentProject(storageKey) {
      const state = store.getState();
      const result = loadProjectFromStorage(services.storage, storageKey, state.dataset);

      if (!result.plan) {
        store.setState({
          ...state,
          importStatus: {
            warnings: result.warnings,
            errors: result.errors
          },
          status: {
            lastCommand: "reopenRecentProject",
            lastError: result.errors[0]?.message ?? null
          }
        });
        return;
      }

      const derived = recomputeDerivedState(result.plan, state.dataset);
      store.setState({
        ...state,
        plan: result.plan,
        diagnostics: derived.diagnostics,
        analysis: derived.analysis,
        selection: {
          selectedNodeId: null,
          selectedDiagnosticId: null
        },
        history: {
          past: [],
          future: []
        },
        autosave: {
          ...state.autosave,
          state: "pending",
          storageKey
        },
        importStatus: {
          warnings: result.warnings,
          errors: result.errors
        },
        status: {
          lastCommand: "reopenRecentProject",
          lastError: null
        }
      });

      persistPlan(store, services, result.plan);
    }
  };
}
