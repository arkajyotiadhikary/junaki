/**
 * Clear all demo / starter content and give yourself a clean slate.
 *
 * Two actions:
 *   1. Delete every file whose name contains ".example." (the shipped demo
 *      solution, design exercise, story, and data files).
 *   2. Reset the live data files (practice.json, schedule.json,
 *      problems-meta.json) to an empty-but-valid state.
 *
 * It never touches tool files (scripts, templates, curriculum, sources).
 *
 * Run:  npm run reset
 *
 * Pass --dry to preview without changing anything.
 */
import { readdirSync, statSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry');

// Folders we never descend into.
const SKIP_DIRS = new Set(['node_modules', '.git', '.obsidian', '.playwright-mcp']);

// Live data files reset to a known-empty shape (not deleted, so the tool stays runnable).
const EMPTY_DATA: Array<[string, string]> = [
  ['practice.json', '{\n  "entries": []\n}\n'],
  ['schedule.json', '{\n  "schedule": {}\n}\n'],
  [
    'problems-meta.json',
    '{\n  "$schema": "Per-problem metadata. Keys are repo-relative file paths.",\n  "corePatterns": ["Two Pointers", "Sliding Window", "Hash Table", "Sorting", "Binary Search", "Recursion", "Dynamic Programming", "Backtracking", "Greedy", "Stack", "Queue", "Linked List", "Tree DFS/BFS", "Graph DFS/BFS", "Heap", "Trie", "Bit Manipulation", "Math", "Prefix Sum", "Divide and Conquer", "Counting", "Simulation", "String Matching", "Matrix"],\n  "problems": {}\n}\n',
  ],
];

/** Recursively collect every file path whose name contains ".example.". */
function findExampleFiles(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      findExampleFiles(full, out);
    } else if (name.includes('.example.')) {
      out.push(full);
    }
  }
}

function main(): void {
  const examples: string[] = [];
  findExampleFiles(ROOT, examples);

  console.log(DRY ? 'DRY RUN — nothing will change.\n' : '');

  console.log(`Deleting ${examples.length} example file(s):`);
  for (const f of examples) {
    console.log(`  - ${f.slice(ROOT.length + 1)}`);
    if (!DRY) rmSync(f);
  }

  console.log(`\nResetting live data files to empty:`);
  for (const [name, empty] of EMPTY_DATA) {
    const path = join(ROOT, 'data', name);
    const action = existsSync(path) ? 'reset' : 'create';
    console.log(`  · data/${name} (${action})`);
    if (!DRY) writeFileSync(path, empty);
  }

  console.log(
    DRY
      ? '\nDry run complete. Re-run without --dry to apply.'
      : '\nClean slate ready. Run `npm run today` to start your own journey.',
  );
}

main();
