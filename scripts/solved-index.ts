/**
 * "Already solved" detection. Scans the on-disk solution folders (some flat like
 * `leetcode/`, some nested like `geeksforgeeks/arrays/`) and builds two lookup
 * sets: LeetCode problem numbers (from filenames like `167_two_sum.ts`) and
 * normalized titles (for platforms whose files carry no number).
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeSlug } from './curriculum-sources';

export const SOLUTION_ROOTS = ['leetcode', 'geeksforgeeks', 'hackerrank', 'interviewbit'];

/** Recursively collect `.ts` solution files under a root (skips dotfiles). */
export function scanSolvedFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  for (const name of readdirSync(root)) {
    if (name.startsWith('.')) continue;
    const full = join(root, name);
    if (statSync(full).isDirectory()) out.push(...scanSolvedFiles(full));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

export interface SolvedIndex {
  /** LeetCode numbers, e.g. "167". */
  numbers: Set<string>;
  /** Normalized titles/filenames (number + extension stripped). */
  norms: Set<string>;
}

/** Leading integer of a filename, e.g. `leetcode/167_two_sum.ts` → "167". */
function leadingNumber(file: string): string | null {
  const base = file.split('/').pop() ?? file;
  return base.match(/^(\d+)/)?.[1] ?? null;
}

export function buildSolvedIndex(files: Iterable<string>): SolvedIndex {
  const numbers = new Set<string>();
  const norms = new Set<string>();
  for (const file of files) {
    const base = (file.split('/').pop() ?? file).replace(/\.[a-z]+$/i, '');
    const num = leadingNumber(file);
    if (num) numbers.add(num);
    const rest = num ? base.slice(num.length) : base;
    const norm = normalizeSlug(rest);
    if (norm) norms.add(norm);
  }
  return { numbers, norms };
}

/** Scan all solution roots (relative to `cwd`) into one index. */
export function loadSolvedIndex(cwd: string): SolvedIndex {
  const files = SOLUTION_ROOTS.flatMap((r) => scanSolvedFiles(join(cwd, r)));
  return buildSolvedIndex(files);
}

/** True when a LeetCode number OR a normalized title is already solved. */
export function isSolved(index: SolvedIndex, opts: { lcNumber?: string | null; title?: string; slug?: string }): boolean {
  if (opts.lcNumber && index.numbers.has(opts.lcNumber)) return true;
  for (const candidate of [opts.title, opts.slug]) {
    if (candidate && index.norms.has(normalizeSlug(candidate))) return true;
  }
  return false;
}
