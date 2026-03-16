import type { Diagnostic } from "../../domain/diagnostics/types";
import type { PlannerState } from "./plannerStore";

export function selectSelectedNode(state: PlannerState) {
  const nodeId = state.selection.selectedNodeId;
  return nodeId && state.plan ? state.plan.nodes[nodeId] ?? null : null;
}

export function selectSelectedDiagnostic(state: PlannerState): Diagnostic | null {
  const diagnosticId = state.selection.selectedDiagnosticId;
  return state.diagnostics.find((diagnostic) => diagnostic.id === diagnosticId) ?? null;
}

export function selectDiagnosticsForSelection(state: PlannerState) {
  const selectedNode = selectSelectedNode(state);

  if (!selectedNode) {
    return [];
  }

  return state.diagnostics.filter((diagnostic) =>
    diagnostic.subjectRefs.some(
      (subject) => subject.kind === "node" && subject.nodeId === selectedNode.id
    ) ||
    diagnostic.subjectRefs.some(
      (subject) => subject.kind === "port" && subject.nodeId === selectedNode.id
    )
  );
}

function resolveNodeFromDiagnostic(state: PlannerState) {
  const diagnostic = selectSelectedDiagnostic(state);

  if (!diagnostic || !state.plan) {
    return null;
  }

  const nodeSubject = diagnostic.subjectRefs.find((subject) => subject.kind === "node");
  if (nodeSubject?.kind === "node") {
    return state.plan.nodes[nodeSubject.nodeId] ?? null;
  }

  const portSubject = diagnostic.subjectRefs.find((subject) => subject.kind === "port");
  if (portSubject?.kind === "port") {
    return state.plan.nodes[portSubject.nodeId] ?? null;
  }

  return null;
}

export function selectReferenceContext(state: PlannerState) {
  const node = selectSelectedNode(state) ?? resolveNodeFromDiagnostic(state);

  if (!node) {
    return null;
  }

  const placeable = state.dataset.placeableItems[node.catalogId];
  if (!placeable) {
    return null;
  }

  const recipeId = placeable.recipeIds?.[0];

  return {
    nodeId: node.id,
    placeable,
    recipe: recipeId ? state.dataset.recipes[recipeId] ?? null : null,
    mode: node.modeId ? state.dataset.machineModes[node.modeId] ?? null : null
  };
}
