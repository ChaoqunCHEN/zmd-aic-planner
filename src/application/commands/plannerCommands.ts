import { createPlan } from "../../domain/plan/document";
import { moveNode, placeNode, removeNode } from "../../domain/plan/operations";
import { exportProject, importProject } from "../project/projectIO";
import {
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
  selectNode(nodeId: string | null): void;
  selectDiagnostic(diagnosticId: string | null): void;
  undo(): void;
  redo(): void;
  importProject(serialized: string): void;
  exportProject(): string | null;
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
        importStatus: {
          warnings: [],
          errors: []
        }
      });

      services.autosaveController.schedule(JSON.stringify(plan));
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

      services.autosaveController.schedule(JSON.stringify(previous));
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

      services.autosaveController.schedule(JSON.stringify(next));
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
        status: {
          lastCommand: "importProject",
          lastError: null
        }
      });

      services.autosaveController.schedule(JSON.stringify(result.plan));
    },

    exportProject() {
      const state = store.getState();
      return state.plan ? exportProject(state.plan) : null;
    }
  };
}
