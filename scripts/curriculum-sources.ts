/**
 * Shared types and helpers for the multi-platform curriculum.
 *
 * Every problem the repo knows about — whether hand-written in curriculum.json,
 * extracted from a platform list, or imported from AlgoFrog — uses the single
 * `SourceItem` shape below. `source` records the platform you actually solve the
 * problem on, not the list it arrived through.
 */

export type Platform =
  | 'leetcode'
  | 'geeksforgeeks'
  | 'hackerrank'
  | 'interviewbit'
  | 'codeforces'
  | 'custom';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface SourceItem {
  slug: string;
  url?: string;
  title: string;
  pattern: string;
  difficulty?: Difficulty;
  phase: number;
  kind: 'problem';
  source: Platform;
  /** AlgoFrog sub-tier (Foundation/Variants/...). Used by the merge layer filter. */
  layer?: string;
  /** AlgoFrog `key_insight`. Paid content — lives only in gitignored files. */
  note?: string;
}

/** Strip everything but lowercase alphanumerics. Matches today.ts's normalizer. */
export function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Kebab-case a human title into a slug, matching LeetCode's own convention:
 * lowercase, DELETE punctuation (do not turn it into a separator), then collapse
 * whitespace to single hyphens. This reproduces real LeetCode slugs, e.g.
 * "Pow(x, n)" → "powx-n", "Sqrt(x)" → "sqrtx",
 * "Best Time to Buy and Sell Stock II" → "best-time-to-buy-and-sell-stock-ii".
 */
export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** A LeetCode problem URL from its slug. */
export function leetcodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

// --- phase mapping -----------------------------------------------------------

/**
 * AlgoFrog topics that are advanced enough to belong in Phase 5 regardless of
 * their layer. Matched by normalized substring against the topic's nav_label.
 */
export const ADVANCED_TOPIC_KEYS: string[] = [
  'sieveoferatosthenes',
  'fenwick',
  'segmenttree',
  'kmp',
  'lisonlogn',
  'advancedgraphs',
  'partitiondp',
  'gametheory',
  'digitdp',
  'dags',
  'combinatorial',
  'datastructureoptimizeddp',
  'profile',
];

/** True when a topic name is one of the advanced AlgoFrog topics → Phase 5. */
export function isAdvancedTopic(topic: string): boolean {
  const n = normalizeSlug(topic);
  return ADVANCED_TOPIC_KEYS.some((k) => n.includes(k));
}

/**
 * Map a topic name to one of the 6 curriculum phases using keyword rules. This
 * generalizes across every list (LeetCode/GFG/HackerRank/InterviewBit/AlgoFrog)
 * so we never hand-maintain a per-list table.
 *
 * Order matters: graph/backtracking is checked before "tree" so that "Recursion
 * & Backtracking" lands in P3, and tree/heap/trie before "binary search" so that
 * "Binary Search Tree" → P2 while plain "Binary Search" → P1.
 */
export function phaseForTopic(topic: string): number {
  const n = normalizeSlug(topic);

  if (n.includes('graph') || n.includes('backtrack')) return 3; // Graphs & Backtracking
  if (
    n.includes('tree') || // includes binary-search-TREE before we test "search"
    n.includes('trie') ||
    n.includes('heap') ||
    n.includes('bst')
  ) {
    return 2; // Trees & Heaps
  }
  if (
    n.includes('dynamicprogramming') ||
    n.includes('dp') ||
    n.includes('kadane') ||
    n.includes('greedy') ||
    n.includes('interval') ||
    n.includes('knapsack')
  ) {
    return 4; // DP, Greedy, Intervals
  }
  return 1; // Foundations: arrays, strings, two pointers, hashing, stack, etc.
}

/**
 * Final phase for an imported problem, applying the two overrides from the
 * design: advanced AlgoFrog topics and any "Hard" layer → Phase 5.
 */
export function phaseFor(topic: string, layer?: string): number {
  if (isAdvancedTopic(topic)) return 5;
  if (layer && normalizeSlug(layer).includes('hard')) return 5;
  return phaseForTopic(topic);
}
