import type { DatasetBundle } from "../types";
import type { PlanDocument, PlanEdge, PlanNode } from "../plan/document";
import { buildConnectionState } from "../validation/connectionValidation";

export type AnalysisGraphNode = {
  node: PlanNode;
  item: DatasetBundle["placeableItems"][string];
  incomingEdges: PlanEdge[];
  outgoingEdges: PlanEdge[];
};

export type AnalysisGraph = {
  nodes: Record<string, AnalysisGraphNode>;
  edges: Record<string, PlanEdge>;
  topologicalOrder: string[];
};

export function buildGraph(plan: PlanDocument, dataset: DatasetBundle): AnalysisGraph {
  const connectionState = buildConnectionState(plan, dataset);
  const edges = Object.fromEntries(
    Object.values(plan.edges)
      .filter((edge) => connectionState.validEdgeIds.has(edge.id))
      .map((edge) => [edge.id, edge])
  );

  const nodes = Object.fromEntries(
    Object.values(plan.nodes)
      .filter((node) => dataset.placeableItems[node.catalogId])
      .map((node) => [
        node.id,
        {
          node,
          item: dataset.placeableItems[node.catalogId]!,
          incomingEdges: Object.values(edges).filter((edge) => edge.targetNodeId === node.id),
          outgoingEdges: Object.values(edges).filter((edge) => edge.sourceNodeId === node.id)
        }
      ])
  );

  const indegree = new Map<string, number>(
    Object.values(nodes).map((graphNode) => [graphNode.node.id, graphNode.incomingEdges.length])
  );
  const queue = Object.values(nodes)
    .filter((graphNode) => (indegree.get(graphNode.node.id) ?? 0) === 0)
    .map((graphNode) => graphNode.node.id);
  const topologicalOrder: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      break;
    }

    topologicalOrder.push(nodeId);

    for (const edge of nodes[nodeId]?.outgoingEdges ?? []) {
      const nextIndegree = (indegree.get(edge.targetNodeId) ?? 0) - 1;
      indegree.set(edge.targetNodeId, nextIndegree);

      if (nextIndegree === 0) {
        queue.push(edge.targetNodeId);
      }
    }
  }

  for (const nodeId of Object.keys(nodes)) {
    if (!topologicalOrder.includes(nodeId)) {
      topologicalOrder.push(nodeId);
    }
  }

  return {
    nodes,
    edges,
    topologicalOrder
  };
}
