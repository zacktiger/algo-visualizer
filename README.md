# AlgoViz

Interactive algorithm visualizer built with React, TypeScript, Vite, Tailwind CSS, Framer Motion, and Zustand. It lets you run classic array, graph, and dynamic programming algorithms step by step, inspect pseudocode line highlights, and compare two algorithms on the same input.

## Features

- Step-by-step playback for algorithm execution
- Timeline controls for play, pause, seek, speed changes, and manual stepping
- Live stats for comparisons, swaps, and memory operations
- Code panel with highlighted lines for the current step
- State panel with step descriptions and payload details
- Compare mode to run two algorithms side by side on identical input
- Input editors for arrays, graphs, and DP-specific parameters
- Dedicated renderers for arrays, graphs, and DP tables

## Supported Algorithms

### Arrays

- Bubble Sort
- Quick Sort
- Merge Sort
- Binary Search

### Graphs

- Breadth-First Search (BFS)
- Depth-First Search (DFS)
- Dijkstra's Algorithm

### Dynamic Programming

- Longest Common Subsequence (LCS)
- 0/1 Knapsack
- Longest Increasing Subsequence (LIS)

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Zustand

## Project Structure

```text
src/
  algorithms/     Algorithm generators and metadata
  components/     UI controls, panels, timeline, compare mode
  engine/         Playback engine and global store
  renderers/      Array, graph, and DP renderers
  utils/          Algorithm execution helpers
  constants/      Shared colors and UI constants
```

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm

### Installation

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

Open the local Vite URL shown in the terminal, usually `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How It Works

Each algorithm is implemented as a generator that emits a sequence of discrete `Step` objects. A step contains:

- the operation type, such as `COMPARE`, `SWAP`, `VISIT`, or `SET_CELL`
- payload data used by the renderer
- source-code line numbers to highlight
- a human-readable description for the UI

The app runs the selected algorithm once, stores all emitted steps, and replays them through a small playback engine. This makes scrubbing, comparing runs, and recalculating stats straightforward.

## Input Modes

- Array algorithms accept comma-separated numeric input and support randomized arrays.
- Graph algorithms use an interactive SVG canvas where you can add nodes, connect edges, and assign weights.
- DP algorithms use custom forms based on the selected problem, such as two strings for LCS or `weight:value` pairs for Knapsack.

## Why This Project

This project is designed for learning, demos, and interview prep. Instead of only showing a final answer, it exposes the sequence of decisions an algorithm makes and how those decisions affect the data structure over time.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Future Improvements

- More graph algorithms such as Prim's, Kruskal's, and topological sort
- More advanced DP problems and path reconstruction views
- Preset datasets and shareable URLs
- Test coverage for generators and renderer edge cases

## License

Add a license before publishing publicly on GitHub. MIT is a common default if you want permissive reuse.
