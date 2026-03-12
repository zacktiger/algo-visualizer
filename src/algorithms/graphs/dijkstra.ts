/**
 * Dijkstra's Shortest Path algorithm generator.
 *
 * Computes shortest paths from a source node using a simple priority-queue
 * simulation (linear scan). Yields steps at every queue operation and edge
 * relaxation.
 *
 * @module algorithms/graphs/dijkstra
 */

import {
  type Step,
  type AlgorithmMeta,
  type Edge,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Build a weighted adjacency list from an edge array.
 *
 * @param edges - Array of weighted edges.
 * @returns A map from node ID → list of `{ to, weight }`.
 */
function buildWeightedAdj(
  edges: Edge[],
): Map<string, Array<{ to: string; weight: number }>> {
  const adj = new Map<string, Array<{ to: string; weight: number }>>();

  for (const { from, to, weight } of edges) {
    const w = weight ?? 1;
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from)!.push({ to, weight: w });
    adj.get(to)!.push({ to: from, weight: w }); // undirected
  }

  return adj;
}

/**
 * Extract the node with the smallest tentative distance from the
 * unvisited set (simple linear scan — no heap needed for visualisation).
 */
function extractMin(
  dist: Map<string, number>,
  unvisited: Set<string>,
): string | undefined {
  let minNode: string | undefined;
  let minDist = Infinity;

  for (const node of unvisited) {
    const d = dist.get(node) ?? Infinity;
    if (d < minDist) {
      minDist = d;
      minNode = node;
    }
  }

  return minNode;
}

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during Dijkstra's algorithm.
 *
 * @param nodeIds  - Ordered array of node ID strings.
 * @param edges    - Weighted edges of the graph.
 * @param startId  - ID of the source node.
 * @yields A {@link Step} for every push, pop, relax, mark, or done event.
 */
export function* dijkstra(
  nodeIds: string[],
  edges: Edge[],
  startId: string,
): Generator<Step> {
  const adj = buildWeightedAdj(edges);
  const dist = new Map<string, number>();
  const unvisited = new Set<string>();

  // Initialise distances
  for (const id of nodeIds) {
    dist.set(id, id === startId ? 0 : Infinity);
    unvisited.add(id);
  }

  yield {
    type: StepType.PUSH,
    payload: { node: startId, distance: 0 },
    highlightedLines: [2],
    description: `Adding node ${startId} (dist 0) to priority queue`,
  };

  while (unvisited.size > 0) {
    const current = extractMin(dist, unvisited);
    if (current === undefined || dist.get(current)! === Infinity) break;

    unvisited.delete(current);

    yield {
      type: StepType.POP,
      payload: { node: current, distance: dist.get(current)! },
      highlightedLines: [4],
      description: `Processing node ${current} (shortest dist ${dist.get(current)!})`,
    };

    const neighbours = adj.get(current) ?? [];
    for (const { to, weight } of neighbours) {
      if (!unvisited.has(to)) continue;

      const oldDist = dist.get(to)!;
      const newDist = dist.get(current)! + weight;

      if (newDist < oldDist) {
        dist.set(to, newDist);

        yield {
          type: StepType.RELAX,
          payload: { from: current, to, oldDist, newDist },
          highlightedLines: [6],
          description: `Relaxing edge ${current}→${to}: dist updated ${oldDist === Infinity ? "∞" : oldDist}→${newDist}`,
        };

        yield {
          type: StepType.PUSH,
          payload: { node: to, distance: newDist },
          highlightedLines: [7],
          description: `Adding node ${to} (dist ${newDist}) to priority queue`,
        };
      }
    }

    yield {
      type: StepType.MARK,
      payload: { node: current, state: "settled" },
      highlightedLines: [8],
      description: `Node ${current} settled with distance ${dist.get(current)!}`,
    };
  }

  yield {
    type: StepType.DONE,
    payload: {},
    highlightedLines: [],
    description: "Dijkstra complete!",
  };
}

/** Static metadata for Dijkstra's algorithm. */
export const dijkstraMeta: AlgorithmMeta = {
  id: "dijkstra",
  name: "Dijkstra's Algorithm",
  category: AlgorithmCategory.GRAPH,
  timeComplexity: "O(V² + E)",
  spaceComplexity: "O(V)",
  codeLines: [
    "function dijkstra(graph, start):",
    "  dist = {v: ∞ for v in V}",
    "  dist[start] = 0",
    "  while unvisited is not empty:",
    "    u = vertex with min dist",
    "    for each neighbor v of u:",
    "      if dist[u] + w(u,v) < dist[v]:",
    "        dist[v] = dist[u] + w(u,v)",
    "    mark u as settled",
  ],
};
