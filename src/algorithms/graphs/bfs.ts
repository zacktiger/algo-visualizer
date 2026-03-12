/**
 * Breadth-First Search (BFS) algorithm generator.
 *
 * Explores a graph level-by-level starting from the given source node,
 * using a queue.
 *
 * @module algorithms/graphs/bfs
 */

import {
  type Step,
  type AlgorithmMeta,
  type Edge,
  StepType,
  AlgorithmCategory,
} from "../types";

/**
 * Build an adjacency list from an edge array.
 *
 * @param edges - Array of directed / undirected edges.
 * @returns A map from node ID → list of neighbour IDs.
 */
function buildAdjacencyList(edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const { from, to } of edges) {
    if (!adj.has(from)) adj.set(from, []);
    if (!adj.has(to)) adj.set(to, []);
    adj.get(from)!.push(to);
    adj.get(to)!.push(from); // undirected
  }
  return adj;
}

/**
 * Generator that yields one {@link Step} for every meaningful operation
 * during a BFS traversal.
 *
 * @param nodeIds  - Ordered array of node ID strings.
 * @param edges    - Edges of the graph.
 * @param startId  - ID of the source node.
 * @yields A {@link Step} for every push, pop, visit, mark, or done event.
 */
export function* bfs(
  nodeIds: string[],
  edges: Edge[],
  startId: string,
): Generator<Step> {
  const adj = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const queue: string[] = [];

  // Enqueue start
  queue.push(startId);
  visited.add(startId);

  yield {
    type: StepType.PUSH,
    payload: { node: startId },
    highlightedLines: [2],
    description: `Enqueuing node ${startId}`,
  };

  while (queue.length > 0) {
    const node = queue.shift()!;

    yield {
      type: StepType.POP,
      payload: { node },
      highlightedLines: [4],
      description: `Dequeuing node ${node}`,
    };

    yield {
      type: StepType.VISIT,
      payload: { node },
      highlightedLines: [5],
      description: `Visiting node ${node}`,
    };

    const neighbours = adj.get(node) ?? [];
    for (const neighbour of neighbours) {
      if (!visited.has(neighbour)) {
        visited.add(neighbour);
        queue.push(neighbour);

        yield {
          type: StepType.PUSH,
          payload: { node: neighbour },
          highlightedLines: [7],
          description: `Enqueuing node ${neighbour}`,
        };
      }
    }

    yield {
      type: StepType.MARK,
      payload: { node, state: "visited" },
      highlightedLines: [5],
      description: `Node ${node} fully explored`,
    };
  }

  // Mark any unreachable nodes
  for (const id of nodeIds) {
    if (!visited.has(id)) {
      yield {
        type: StepType.MARK,
        payload: { node: id, state: "unreachable" },
        highlightedLines: [],
        description: `Node ${id} is unreachable from ${startId}`,
      };
    }
  }

  yield {
    type: StepType.DONE,
    payload: {},
    highlightedLines: [],
    description: "BFS complete!",
  };
}

/** Static metadata for BFS. */
export const bfsMeta: AlgorithmMeta = {
  id: "bfs",
  name: "Breadth-First Search",
  category: AlgorithmCategory.GRAPH,
  timeComplexity: "O(V + E)",
  spaceComplexity: "O(V)",
  codeLines: [
    "function bfs(graph, start):",
    "  queue = [start]",
    "  visited = {start}",
    "  while queue is not empty:",
    "    node = queue.dequeue()",
    "    process(node)",
    "    for neighbor in graph[node]:",
    "      if neighbor not in visited:",
    "        visited.add(neighbor)",
    "        queue.enqueue(neighbor)",
  ],
};
