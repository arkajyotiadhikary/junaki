/**
 * AlgoFrog importer. Flattens the paid AlgoFrog export into the unified item
 * shape, tags each problem with its platform (`leetcode` / `codeforces` /
 * `custom`), de-duplicates AlgoFrog's internal repeats, and writes the parallel
 * study file `data/sources/algofrog-curriculum.json`.
 *
 *   npm run import:algofrog          # write the parallel curriculum file
 *
 * The parallel file carries `note` (AlgoFrog key_insight) and is GITIGNORED —
 * it is paid content. The `--merge` into the committed curriculum.json (which
 * strips `note`) is implemented separately.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type SourceItem,
  type Platform,
  type Difficulty,
  slugifyTitle,
  phaseFor,
} from './curriculum-sources';
import { loadSolvedIndex, isSolved } from './solved-index';
import { assemble, type CurriculumItemLike, type SourceGroup } from './assemble-curriculum';

const ROOT = process.cwd();
const SOURCES = join(ROOT, 'data', 'sources');
const EXPORT = join(SOURCES, 'algofrog-export.json');
const OUT = join(SOURCES, 'algofrog-curriculum.json');
const CURRICULUM = join(ROOT, 'data', 'curriculum.json');

/** The four extracted platform lists, merged in full (no layer filter). */
const LIST_FILES = ['leetcode-150.json', 'gfg-160.json', 'hackerrank-ipk.json', 'interviewbit.json'];

// --- raw export types --------------------------------------------------------

interface RawProblem {
  layer?: string;
  title?: string;
  lc_url?: string | null;
  lc_number?: string | number | null;
  order_num?: number;
  difficulty?: string | null;
  is_premium?: boolean;
  key_insight?: string | null;
}
interface RawTopic {
  display_number?: string;
  nav_label?: string;
  title?: string;
  problems?: RawProblem[];
}

// --- pure transforms ---------------------------------------------------------

/** Collapse AlgoFrog's messy layer spellings to canonical names. */
export function normalizeLayer(layer?: string): string {
  const n = (layer ?? '').toLowerCase();
  if (n.includes('hard')) return 'Hard'; // "Hard", "Hard/Insight"
  if (n.includes('trap')) return 'Trap'; // "Trap", "⚠️ Trap"
  if (n.includes('combo') || n.includes('combination')) return 'Combination';
  if (n.includes('variant')) return 'Variants';
  if (n.includes('found')) return 'Foundation'; // "Foundation", "Found"
  return layer ?? 'Foundation';
}

/** Normalize difficulty; null/blank → Medium (flagged in the summary). */
export function normalizeDifficulty(diff?: string | null): Difficulty {
  const n = (diff ?? '').toLowerCase();
  if (n.startsWith('e')) return 'Easy';
  if (n.startsWith('h')) return 'Hard';
  return 'Medium'; // "Med", "Medium", null
}

/** Stable topic ordering: display_number first, blank-numbered topics last. */
export function topicOrder(topic: RawTopic, index: number): number {
  const n = parseInt(topic.display_number ?? '', 10);
  return Number.isFinite(n) ? n : 900 + index;
}

export interface Derived {
  item: SourceItem;
  key: string; // de-dup key
  lcNumber: string | null;
}

/** Derive slug/url/source/key for one problem. */
export function deriveItem(p: RawProblem, topic: RawTopic): Derived {
  const title = (p.title ?? '').trim();
  const url = p.lc_url ?? undefined;
  const layer = normalizeLayer(p.layer);
  const pattern = topic.nav_label ?? topic.title ?? 'AlgoFrog';
  const phase = phaseFor(pattern, layer);
  const difficulty = normalizeDifficulty(p.difficulty);
  const note = p.key_insight?.trim() || undefined;

  let source: Platform;
  let slug: string;
  let lcNumber: string | null = null;
  let finalUrl: string | undefined;

  const lcMatch = url?.match(/leetcode\.com\/problems\/([^/?#]+)/);
  const cfMatch = url?.match(/codeforces\.com\/.*?(\d+)\/?([A-Za-z]\d?)?/);

  if (lcMatch) {
    source = 'leetcode';
    slug = lcMatch[1];
    finalUrl = url;
    lcNumber = p.lc_number != null ? String(p.lc_number) : null;
  } else if (cfMatch) {
    source = 'codeforces';
    slug = `cf-${cfMatch[1]}${(cfMatch[2] ?? '').toLowerCase()}`;
    finalUrl = url;
  } else {
    source = 'custom';
    slug = `custom-${slugifyTitle(title) || 'unknown'}`;
  }

  const item: SourceItem = {
    slug,
    url: finalUrl,
    title,
    pattern,
    difficulty,
    phase,
    kind: 'problem',
    source,
    layer,
    note,
  };
  const key = `${source}:${lcNumber ?? slug}`;
  return { item, key, lcNumber };
}

/** Flatten the export into ordered Derived entries (topic order, then order_num). */
export function flatten(topics: RawTopic[]): Derived[] {
  const ordered = topics
    .map((t, i) => ({ t, order: topicOrder(t, i) }))
    .sort((a, b) => a.order - b.order);
  const out: Derived[] = [];
  for (const { t } of ordered) {
    const probs = [...(t.problems ?? [])].sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
    for (const p of probs) out.push(deriveItem(p, t));
  }
  return out;
}

export interface DedupeResult {
  unique: Derived[];
  collapsed: Derived[]; // duplicates dropped (first occurrence kept)
}

/** First occurrence of each key wins; later copies collapsed. */
export function dedupe(entries: Derived[]): DedupeResult {
  const seen = new Set<string>();
  const unique: Derived[] = [];
  const collapsed: Derived[] = [];
  for (const e of entries) {
    if (seen.has(e.key)) collapsed.push(e);
    else {
      seen.add(e.key);
      unique.push(e);
    }
  }
  return { unique, collapsed };
}

// --- summary -----------------------------------------------------------------

function tally<T>(items: T[], keyOf: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = keyOf(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

// --- I/O shell ---------------------------------------------------------------

function run(): void {
  if (!existsSync(EXPORT)) {
    console.error(`✗ ${EXPORT} not found. Export AlgoFrog first (see data/sources/README.md).`);
    process.exit(1);
  }
  const topics = JSON.parse(readFileSync(EXPORT, 'utf8')) as RawTopic[];
  const flat = flatten(topics);
  const { unique, collapsed } = dedupe(flat);

  const solved = loadSolvedIndex(ROOT);
  const curriculumSlugs = existsSync(CURRICULUM)
    ? new Set((JSON.parse(readFileSync(CURRICULUM, 'utf8')).items as SourceItem[]).map((i) => i.slug))
    : new Set<string>();

  let alreadySolved = 0;
  let inCurriculum = 0;
  let fresh = 0;
  for (const d of unique) {
    if (isSolved(solved, { lcNumber: d.lcNumber, title: d.item.title, slug: d.item.slug })) alreadySolved++;
    else if (curriculumSlugs.has(d.item.slug)) inCurriculum++;
    else fresh++;
  }

  const items = unique.map((d) => d.item);
  const out = {
    $schema:
      'AlgoFrog import — paid study material (key_insight in note). GITIGNORED. Generated by scripts/import-algofrog.ts; do not edit by hand.',
    generatedFrom: 'data/sources/algofrog-export.json',
    count: items.length,
    items,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

  // --- summary ---
  const noUrl = unique.filter((d) => d.item.source === 'custom').length;
  console.log(`\nAlgoFrog import → data/sources/algofrog-curriculum.json`);
  console.log(`  rows in export:        ${flat.length}`);
  console.log(`  unique problems:       ${unique.length}  (collapsed ${collapsed.length} internal duplicates)`);
  console.log(`  new:                   ${fresh}`);
  console.log(`  already solved:        ${alreadySolved}`);
  console.log(`  already in curriculum: ${inCurriculum}`);
  console.log(`  by source:    ${JSON.stringify(tally(items, (i) => i.source))}`);
  console.log(`  by difficulty:${JSON.stringify(tally(items, (i) => i.difficulty ?? '?'))}`);
  console.log(`  by phase:     ${JSON.stringify(tally(items, (i) => String(i.phase)))}`);
  console.log(`  custom (no LeetCode/Codeforces URL): ${noUrl} — review titles manually.`);

  if (process.argv.includes('--merge')) mergeIntoCurriculum(items);
}

/**
 * Fold all five sources into the committed curriculum.json. The four platform
 * lists merge in full; AlgoFrog contributes only its Foundation/Variants layers.
 * `note` (paid content) is stripped on the way in. Idempotent.
 */
function mergeIntoCurriculum(algofrogItems: SourceItem[]): void {
  if (!existsSync(CURRICULUM)) {
    console.error(`\n✗ ${CURRICULUM} not found — cannot --merge.`);
    process.exit(1);
  }
  const curriculum = JSON.parse(readFileSync(CURRICULUM, 'utf8')) as {
    items: CurriculumItemLike[];
    [k: string]: unknown;
  };

  const groups: SourceGroup[] = [];
  for (const file of LIST_FILES) {
    const path = join(SOURCES, file);
    if (!existsSync(path)) {
      console.error(`\n✗ ${file} missing — run "npm run extract:lists" first.`);
      process.exit(1);
    }
    groups.push({ items: JSON.parse(readFileSync(path, 'utf8')).items });
  }
  groups.push({ items: algofrogItems, layerFilter: true }); // AlgoFrog last; F+V only

  const solved = loadSolvedIndex(ROOT);
  const before = curriculum.items.length;
  const result = assemble(curriculum.items, groups, solved);

  writeFileSync(
    CURRICULUM,
    JSON.stringify({ ...curriculum, items: result.items }, null, 2) + '\n',
    'utf8',
  );

  console.log(`\nMerged into data/curriculum.json`);
  console.log(`  items: ${before} → ${result.items.length}  (+${result.added})`);
  console.log(`  skipped: ${result.skippedDuplicate} duplicate · ${result.skippedSolved} solved · ${result.skippedLayer} non-Foundation/Variants (AlgoFrog)`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) run();
