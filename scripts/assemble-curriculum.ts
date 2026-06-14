/**
 * Assemble the multi-platform curriculum. Takes the existing curriculum items
 * plus the platform source lists, drops anything already present or already
 * solved, and returns a merged item list that keeps phase boundaries.
 *
 * De-dup key = `<source>:<normalized-slug>`. Slug derivation is consistent per
 * platform, so the same problem from two lists collapses, while the "same"
 * problem on two different judges (LeetCode "Two Sum" vs InterviewBit "2 Sum")
 * stays separate — intentional, you may solve each on its own site.
 */
import { type SourceItem, type Platform, normalizeSlug } from './curriculum-sources';
import { type SolvedIndex, isSolved } from './solved-index';

/** Curriculum items may predate the `source` field (treated as leetcode). */
export interface CurriculumItemLike {
  slug: string;
  url?: string;
  title?: string;
  pattern?: string;
  difficulty?: string;
  phase?: string | number;
  kind: string;
  source?: Platform;
  layer?: string;
  note?: string;
}

/** Cross-source identity. Missing source counts as leetcode. */
export function keyOf(item: { slug: string; source?: Platform }): string {
  return `${item.source ?? 'leetcode'}:${normalizeSlug(item.slug)}`;
}

/** A group of candidate items from one source list. */
export interface SourceGroup {
  items: SourceItem[];
  /** AlgoFrog: only Foundation/Variants layers are eligible for the merge. */
  layerFilter?: boolean;
}

export interface AssembleResult {
  items: CurriculumItemLike[];
  added: number;
  skippedDuplicate: number;
  skippedSolved: number;
  skippedLayer: number;
}

const MERGE_LAYERS = new Set(['Foundation', 'Variants']);

/** Drop AlgoFrog-only / paid fields before an item enters the committed curriculum. */
function clean(item: SourceItem): CurriculumItemLike {
  const out: CurriculumItemLike = {
    slug: item.slug,
    title: item.title,
    pattern: item.pattern,
    phase: item.phase,
    kind: 'problem',
    source: item.source,
  };
  if (item.url) out.url = item.url;
  if (item.difficulty) out.difficulty = item.difficulty;
  return out; // note + layer deliberately omitted
}

function phaseNum(p: string | number | undefined): number {
  const n = typeof p === 'number' ? p : parseInt(String(p ?? ''), 10);
  return Number.isFinite(n) ? n : 99;
}

export function assemble(
  existing: CurriculumItemLike[],
  sources: SourceGroup[],
  solved: SolvedIndex,
): AssembleResult {
  const seen = new Set(existing.map(keyOf));
  const fresh: CurriculumItemLike[] = [];
  let added = 0;
  let skippedDuplicate = 0;
  let skippedSolved = 0;
  let skippedLayer = 0;

  for (const group of sources) {
    for (const item of group.items) {
      if (group.layerFilter && !MERGE_LAYERS.has(item.layer ?? '')) {
        skippedLayer++;
        continue;
      }
      const k = keyOf(item);
      if (seen.has(k)) {
        skippedDuplicate++;
        continue;
      }
      seen.add(k);
      const lcNumber = item.source === 'leetcode' ? item.url?.match(/(\d+)/)?.[1] ?? null : null;
      if (isSolved(solved, { lcNumber, title: item.title, slug: item.slug })) {
        skippedSolved++;
        continue;
      }
      fresh.push(clean(item));
      added++;
    }
  }

  // New items grouped by (phase, pattern) in discovery order.
  const freshSorted = fresh
    .map((it, i) => ({ it, i }))
    .sort(
      (a, b) =>
        phaseNum(a.it.phase) - phaseNum(b.it.phase) ||
        (a.it.pattern ?? '').localeCompare(b.it.pattern ?? '') ||
        a.i - b.i,
    )
    .map((x) => x.it);

  // Existing items stay first within each phase; new items append after them.
  const combined = [...existing, ...freshSorted];
  const items = combined
    .map((it, i) => ({ it, i }))
    .sort((a, b) => phaseNum(a.it.phase) - phaseNum(b.it.phase) || a.i - b.i)
    .map((x) => x.it);

  return { items, added, skippedDuplicate, skippedSolved, skippedLayer };
}
