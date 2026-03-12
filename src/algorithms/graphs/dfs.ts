/**
 * Depth-First Search (DFS) algorithm generator.
 *
 * Explores a graph by going as deep as possible before backtracking,
 * using an explicit stack.
 *
 * @module algorithms/graphs/dfs
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
 * during a DFS traversal.
 *
 * @param nodeIds  - Ordered array of node ID strings.
 * @param edges    - Edges of the graph.
 * @param startId  - ID of the source node.
 * @yields A {@link Step} for every push, pop, visit, mark, or done event.
 */
export function* dfs(
  nodeIds: string[],
  edges: Edge[],
  startId: string,
): Generator<Step> {
  const adj = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const stack: string[] = [];

  // Push start
  stack.push(startId);

  yield {
    type: StepType.PUSH,
    payload: { node: startId },
    highlightedLines: [2],
    description: `Pushing node ${startId} onto stack`,
  };

  while (stack.length > 0) {
    const node = stack.pop()!;

    yield {
      type: StepType.POP,
      payload: { node },
      highlightedLines: [4],
      description: `Popping node ${node}`,
    };

    if (visited.has(node)) continue;
    visited.add(node);

    yield {
      type: StepType.VISIT,
      payload: { node },
      highlightedLines: [5],
      description: `Visiting node ${node}`,
    };

    const neighbours = adj.get(node) ?? [];
    // Push neighbours in reverse so that the first neighbour is visited first
    for (let i = neighbours.length - 1; i >= 0; i--) {
      const neighbour = neighbours[i];
      if (!visited.has(neighbour)) {
        stack.push(neighbour);

        yield {
          type: StepType.PUSH,
          payload: { node: neighbour },
          highlightedLines: [7],
          description: `Pushing node ${neighbour} onto stack`,
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
    description: "DFS complete!",
  };
}

/** Static metadata for DFS. */
export const dfsMeta: AlgorithmMeta = {
  id: "dfs",
  name: "Depth-First Search",
  category: AlgorithmCategory.GRAPH,
  timeComplexity: "O(V + E)",
  spaceComplexity: "O(V)",
  codeLines: [
    "function dfs(graph, start):",
    "  stack = [start]",
    "  visited = {}",
    "  while stack is not empty:",
    "    node = stack.pop()",
    "    if node in visited: continue",
    "    visited.add(node)",
    "    for neighbor in graph[node]:",
    "      if neighbor not in visited:",
    "        stack.push(neighbor)",
  ],
};
