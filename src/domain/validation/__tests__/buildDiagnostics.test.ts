import { describe, expect, it } from "vitest";
import manifest from "../../../../game-data/dataset-manifest.json";
import machineModes from "../../../../game-data/machine-modes.json";
import placeableItems from "../../../../game-data/placeable-items.json";
import recipes from "../../../../game-data/recipes.json";
import resources from "../../../../game-data/resources.json";
import ruleFragments from "../../../../game-data/rule-fragments.json";
import siteFixtures from "../../../../game-data/site-fixtures.json";
import sitePresets from "../../../../game-data/site-presets.json";
import { loadDataset } from "../../dataset/loadDataset";
import { buildDiagnostics } from "../../diagnostics/buildDiagnostics";
import { createPlan } from "../../plan/document";
import { placeNode } from "../../plan/operations";

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

function expectDiagnosticCodes(codes: string[], expected: string[]) {
  expect(codes).toEqual(expect.arrayContaining(expected));
}

describe("buildDiagnostics", () => {
  it("accepts a valid connection graph without connection or cap errors", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const oreTerminal = placeNode(basePlan, dataset, {
      nodeId: "node-ore-in",
      catalogId: "terminal.ore-intake",
      position: { x: 0, y: 4 }
    });
    expect(oreTerminal.ok).toBe(true);
    if (!oreTerminal.ok) {
      return;
    }

    const smelter = placeNode(oreTerminal.plan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const outputTerminal = placeNode(smelter.plan, dataset, {
      nodeId: "node-ingot-out",
      catalogId: "terminal.ingot-output",
      position: { x: 5, y: 4 }
    });
    expect(outputTerminal.ok).toBe(true);
    if (!outputTerminal.ok) {
      return;
    }

    const plan = {
      ...outputTerminal.plan,
      edges: {
        "edge-ore": {
          id: "edge-ore",
          sourceNodeId: "node-ore-in",
          sourcePortId: "ore-out",
          targetNodeId: "node-smelter",
          targetPortId: "ore-in"
        },
        "edge-ingot": {
          id: "edge-ingot",
          sourceNodeId: "node-smelter",
          sourcePortId: "ingot-out",
          targetNodeId: "node-ingot-out",
          targetPortId: "ingot-in"
        }
      }
    };

    const diagnostics = buildDiagnostics(plan, dataset);
    const codes = diagnostics.map((diagnostic) => diagnostic.code);

    expect(codes).not.toContain("connection.invalid-direction");
    expect(codes).not.toContain("connection.resource-mismatch");
    expect(codes).not.toContain("cap.external-input-exceeded");
  });

  it("emits invalid-link diagnostics for wrong flow direction and incompatible resources", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const smelter = placeNode(basePlan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const oreTerminal = placeNode(smelter.plan, dataset, {
      nodeId: "node-ore-in",
      catalogId: "terminal.ore-intake",
      position: { x: 0, y: 4 }
    });
    expect(oreTerminal.ok).toBe(true);
    if (!oreTerminal.ok) {
      return;
    }

    const wrongDirectionPlan = {
      ...oreTerminal.plan,
      edges: {
        "edge-invalid-direction": {
          id: "edge-invalid-direction",
          sourceNodeId: "node-ore-in",
          sourcePortId: "ore-out",
          targetNodeId: "node-ore-in",
          targetPortId: "ore-out"
        }
      }
    };

    const mismatchPlan = {
      ...oreTerminal.plan,
      edges: {
        "edge-resource-mismatch": {
          id: "edge-resource-mismatch",
          sourceNodeId: "node-smelter",
          sourcePortId: "ingot-out",
          targetNodeId: "node-smelter",
          targetPortId: "ore-in"
        }
      }
    };

    const wrongDirectionCodes = buildDiagnostics(wrongDirectionPlan, dataset).map(
      (diagnostic) => diagnostic.code
    );
    const mismatchCodes = buildDiagnostics(mismatchPlan, dataset).map(
      (diagnostic) => diagnostic.code
    );

    expectDiagnosticCodes(wrongDirectionCodes, [
      "connection.invalid-direction",
      "connection.blocked-output"
    ]);
    expectDiagnosticCodes(mismatchCodes, [
      "connection.resource-mismatch",
      "connection.blocked-output"
    ]);
  });

  it("reports disconnected inputs and outputs at port scope", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const smelter = placeNode(basePlan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const diagnostics = buildDiagnostics(smelter.plan, dataset);

    expectDiagnosticCodes(
      diagnostics.map((diagnostic) => diagnostic.code),
      ["connection.disconnected-input", "connection.disconnected-output"]
    );
    expect(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "connection.disconnected-input" &&
          diagnostic.subjectRefs.some(
            (subject) => subject.kind === "port" && subject.portId === "ore-in"
          )
      )
    ).toBe(true);
  });

  it("reports missing machine-mode requirements on nodes that support modes", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const smelter = placeNode(basePlan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const plan = {
      ...smelter.plan,
      nodes: {
        ...smelter.plan.nodes,
        "node-smelter": {
          ...smelter.plan.nodes["node-smelter"],
          modeId: undefined
        }
      }
    };

    const diagnostics = buildDiagnostics(plan, dataset);

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "mode.missing-selection"
    );
  });

  it("reports project-level external input cap violations", () => {
    const basePlan = createPlan(dataset, { sitePresetId: "site.training-yard" });
    const smelter = placeNode(basePlan, dataset, {
      nodeId: "node-smelter",
      catalogId: "machine.basic-smelter",
      position: { x: 2, y: 4 }
    });
    expect(smelter.ok).toBe(true);
    if (!smelter.ok) {
      return;
    }

    const plan = {
      ...smelter.plan,
      siteConfig: {
        ...smelter.plan.siteConfig,
        externalInputCaps: {
          "resource.iron-ore": 10
        }
      }
    };

    const diagnostics = buildDiagnostics(plan, dataset);
    const capDiagnostic = diagnostics.find(
      (diagnostic) => diagnostic.code === "cap.external-input-exceeded"
    );

    expect(capDiagnostic).toBeDefined();
    expect(capDiagnostic?.severity).toBe("warning");
    expect(capDiagnostic?.subjectRefs[0]?.kind).toBe("project");
  });
});
