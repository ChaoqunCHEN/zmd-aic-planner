import { afterEach, describe, expect, it, vi } from "vitest";
import manifest from "../../../game-data/dataset-manifest.json";
import machineModes from "../../../game-data/machine-modes.json";
import placeableItems from "../../../game-data/placeable-items.json";
import recipes from "../../../game-data/recipes.json";
import resources from "../../../game-data/resources.json";
import ruleFragments from "../../../game-data/rule-fragments.json";
import siteFixtures from "../../../game-data/site-fixtures.json";
import sitePresets from "../../../game-data/site-presets.json";
import { encodeProjectFile } from "../../domain/codecs/projectFileCodec";
import { loadDataset } from "../../domain/dataset/loadDataset";
import {
  selectDiagnosticsForSelection,
  selectReferenceContext
} from "../store/selectors";
import { createPlannerStore } from "../store/plannerStore";

const datasetResult = loadDataset({
  manifest,
  placeableItems,
  resources,
  recipes,
  machineModes,
  sitePresets,
  siteFixtures,
  ruleFragments
});

if (!datasetResult.ok) {
  throw new Error(`Expected bundled dataset to load: ${datasetResult.errors.join(", ")}`);
}

const dataset = datasetResult.data;

function createMemoryStorage() {
  const backing = new Map<string, string>();

  return {
    getItem(key: string) {
      return backing.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      backing.set(key, value);
    }
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("planner store", () => {
  it("orchestrates project creation, placement, diagnostics, and analysis through commands", () => {
    const store = createPlannerStore({ dataset, storage: createMemoryStorage() });

    store.getState().commands.createProject({
      sitePresetId: "site.training-yard",
      name: "App layer"
    });
    store.getState().commands.placeNode({
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    const state = store.getState();

    expect(state.plan?.nodes["node-smelter"]).toBeDefined();
    expect(state.status.lastCommand).toBe("placeNode");
    expect(state.analysis?.nodeRates["node-smelter"]).toBe(0);
    expect(state.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["connection.disconnected-input", "connection.disconnected-output"])
    );
  });

  it("supports undo and redo for plan mutations", () => {
    const store = createPlannerStore({ dataset, storage: createMemoryStorage() });

    store.getState().commands.createProject({ sitePresetId: "site.training-yard" });
    store.getState().commands.placeNode({
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    expect(store.getState().plan?.nodes["node-smelter"]).toBeDefined();

    store.getState().commands.undo();
    expect(store.getState().plan?.nodes["node-smelter"]).toBeUndefined();

    store.getState().commands.redo();
    expect(store.getState().plan?.nodes["node-smelter"]).toBeDefined();
  });

  it("debounces autosave writes", () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const store = createPlannerStore({
      dataset,
      storage,
      autosaveDelayMs: 100,
      storageKey: "planner.test"
    });

    store.getState().commands.createProject({ sitePresetId: "site.training-yard" });
    store.getState().commands.placeNode({
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });

    expect(storage.getItem("planner.test")).toBeNull();

    vi.advanceTimersByTime(99);
    expect(storage.getItem("planner.test")).toBeNull();

    vi.advanceTimersByTime(1);
    expect(storage.getItem("planner.test")).not.toBeNull();
    expect(store.getState().autosave.state).toBe("saved");
  });

  it("surfaces import warnings while restoring the project", () => {
    const storage = createMemoryStorage();
    const store = createPlannerStore({ dataset, storage });

    store.getState().commands.createProject({ sitePresetId: "site.training-yard" });
    const originalPlan = store.getState().plan;
    if (!originalPlan) {
      throw new Error("Expected plan to exist");
    }

    const payload = encodeProjectFile({
      ...originalPlan,
      datasetVersion: "older-dataset"
    });

    store.getState().commands.importProject(payload);

    expect(store.getState().importStatus.warnings.map((warning) => warning.code)).toContain(
      "project.dataset-version-mismatch"
    );
  });

  it("keeps selection, diagnostics, and reference context in sync", () => {
    const store = createPlannerStore({ dataset, storage: createMemoryStorage() });

    store.getState().commands.createProject({ sitePresetId: "site.training-yard" });
    store.getState().commands.placeNode({
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    store.getState().commands.selectNode("node-smelter");

    const nodeContext = selectReferenceContext(store.getState());
    expect(nodeContext?.placeable.id).toBe("machine.basic-smelter");
    expect(nodeContext?.recipe?.id).toBe("recipe.smelt-iron");
    expect(selectDiagnosticsForSelection(store.getState()).length).toBeGreaterThan(0);

    const diagnosticId =
      store
        .getState()
        .diagnostics.find((diagnostic) => diagnostic.code === "connection.disconnected-input")?.id ??
      null;

    store.getState().commands.selectDiagnostic(diagnosticId);

    const diagnosticContext = selectReferenceContext(store.getState());
    expect(diagnosticContext?.nodeId).toBe("node-smelter");
  });

  it("connects nodes, updates machine modes, applies external caps, and disconnects edges", () => {
    const store = createPlannerStore({ dataset, storage: createMemoryStorage() });
    const commands = store.getState().commands as unknown as {
      connectPorts: (input: {
        edgeId: string;
        sourceNodeId: string;
        sourcePortId: string;
        targetNodeId: string;
        targetPortId: string;
      }) => void;
      disconnectEdge: (edgeId: string) => void;
      setNodeMode: (input: { nodeId: string; modeId: string }) => void;
      setExternalInputCap: (input: { resourceId: string; cap: number | null }) => void;
    };

    store.getState().commands.createProject({ sitePresetId: "site.training-yard" });
    store.getState().commands.placeNode({
      nodeId: "node-intake",
      catalogId: "terminal.ore-intake",
      position: { x: 0, y: 4 }
    });
    store.getState().commands.placeNode({
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    store.getState().commands.placeNode({
      nodeId: "node-output",
      catalogId: "terminal.ingot-output",
      position: { x: 5, y: 4 }
    });

    commands.connectPorts({
      edgeId: "edge-ore-feed",
      sourceNodeId: "node-intake",
      sourcePortId: "ore-out",
      targetNodeId: "node-smelter",
      targetPortId: "ore-in"
    });
    commands.connectPorts({
      edgeId: "edge-ingot-feed",
      sourceNodeId: "node-smelter",
      sourcePortId: "ingot-out",
      targetNodeId: "node-output",
      targetPortId: "ingot-in"
    });

    expect(store.getState().plan?.edges["edge-ore-feed"]).toBeDefined();
    expect(store.getState().analysis?.nodeRates["node-smelter"]).toBe(15);

    commands.setNodeMode({
      nodeId: "node-smelter",
      modeId: "mode.basic-smelter.efficient"
    });
    expect(store.getState().analysis?.nodeRates["node-smelter"]).toBe(11.25);

    commands.setExternalInputCap({
      resourceId: "resource.iron-ore",
      cap: 10
    });
    expect(store.getState().plan?.siteConfig.externalInputCaps["resource.iron-ore"]).toBe(10);
    expect(store.getState().analysis?.bottlenecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "bottleneck.external-cap",
          nodeId: "node-smelter",
          resourceId: "resource.iron-ore"
        })
      ])
    );

    commands.disconnectEdge("edge-ingot-feed");
    expect(store.getState().plan?.edges["edge-ingot-feed"]).toBeUndefined();
    expect(store.getState().diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "connection.disconnected-output"
    );
  });

  it("restores an earlier recent project from persisted storage", () => {
    vi.useFakeTimers();
    let tick = 0;
    const storage = createMemoryStorage();
    const store = createPlannerStore({
      dataset,
      storage,
      autosaveDelayMs: 10,
      now: () => `2026-03-15T00:00:${String(tick++).padStart(2, "0")}.000Z`
    });
    const commands = store.getState().commands as unknown as {
      reopenRecentProject: (storageKey: string) => void;
    };

    store.getState().commands.createProject({
      sitePresetId: "site.training-yard",
      name: "Alpha Yard"
    });
    store.getState().commands.placeNode({
      nodeId: "node-alpha",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    vi.advanceTimersByTime(10);

    store.getState().commands.createProject({
      sitePresetId: "site.training-yard",
      name: "Beta Yard"
    });
    vi.advanceTimersByTime(10);

    const alphaProject = store
      .getState()
      .recentProjects.find((project) => project.name === "Alpha Yard");

    expect(alphaProject).toBeDefined();

    commands.reopenRecentProject(alphaProject!.storageKey);

    expect(store.getState().plan?.metadata.name).toBe("Alpha Yard");
    expect(store.getState().plan?.nodes["node-alpha"]).toBeDefined();
  });
});
