import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RATINGS, type Rating, updateScheduleForReview } from './schedule';
import { isItemDone, indexPracticedFiles, type CurriculumItem } from './today';

const ROOT = process.cwd();
const PRACTICE = join(ROOT, 'data', 'practice.json');
const META = join(ROOT, 'data', 'problems-meta.json');

interface PracticeEntry {
  file: string;
  date: string;
  notes?: string;
  rating?: Rating;
  slug?: string;
  url?: string;
  mode?: string;
}

interface MetaProblem {
  aliasOf?: string;
  [key: string]: unknown;
}

/**
 * Find mock practice entries that refer to the same problem as a real solve just
 * logged, so their synthesised `leetcode/<slug>` schedule key can be aliased onto
 * the real file. Pure: returns the alias edits, writes nothing. A mock entry
 * matches when its slug resolves to the real file via the same name-matching
 * `isItemDone` uses, and no identical alias already exists.
 */
export function mockAliasUpdates(
  realFile: string,
  entries: Array<{ file: string; slug?: string; mode?: string }>,
  meta: { problems: Record<string, MetaProblem> },
): Array<{ mockKey: string; realFile: string }> {
  const realIdx = indexPracticedFiles([realFile]);
  const updates: Array<{ mockKey: string; realFile: string }> = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.mode || !e.slug) continue; // only mock entries carry a slug
    if (e.file === realFile || seen.has(e.file)) continue;
    const item: CurriculumItem = { slug: e.slug, kind: 'problem' };
    if (!isItemDone(item, realIdx)) continue; // slug does not match this file
    if (meta.problems?.[e.file]?.aliasOf === realFile) continue; // already linked
    seen.add(e.file);
    updates.push({ mockKey: e.file, realFile });
  }
  return updates;
}

export interface ParsedArgs {
  file: string;
  notes?: string;
  rating: Rating;
}

/**
 * Parse the CLI args for `npm run practice`. Strict by design: the first arg is
 * the file, and every later arg MUST be an exact `--flag=value` (`--notes=...`
 * or `--rating=...`). A bare word, the space form (`--rating good`), or an
 * unknown/misspelled flag throws instead of being silently ignored — so a
 * mistyped rating can never quietly fall back to the default. Pure: no file
 * I/O; returns the parsed shape or throws an Error the caller turns into usage.
 */
export function parseArgs(args: string[]): ParsedArgs {
  if (args.length === 0) {
    throw new Error('No file given.');
  }
  const file = args[0];
  if (file.startsWith('--')) {
    throw new Error(`Expected a file as the first argument, got a flag: ${file}`);
  }

  let notes: string | undefined;
  let rating: Rating = 'good';
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--notes=')) {
      notes = arg.slice('--notes='.length).replace(/^"|"$/g, '');
    } else if (arg.startsWith('--rating=')) {
      const value = arg.slice('--rating='.length);
      if (!(RATINGS as readonly string[]).includes(value)) {
        throw new Error(`Invalid --rating: ${value}. Expected one of: ${RATINGS.join(', ')}.`);
      }
      rating = value as Rating;
    } else {
      throw new Error(
        `Unrecognised argument: ${arg}. Flags must be in --flag=value form (e.g. --rating=good).`,
      );
    }
  }

  return { file, ...(notes ? { notes } : {}), rating };
}

function usage(): never {
  console.error('Usage: npm run practice -- <file> [--notes="..."] [--rating=<fail|hard|good|easy>]');
  console.error('Example: npm run practice -- leetcode/88_merge_sorted_array.ts --notes="2nd solve, 8min" --rating=easy');
  process.exit(1);
}

function main(): void {
  const args = process.argv.slice(2);

  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(args);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    usage();
  }
  const { file, notes, rating } = parsed;

  if (!existsSync(join(ROOT, file))) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  const meta = JSON.parse(readFileSync(META, 'utf8'));
  if (!meta.problems[file]) {
    console.warn(`Warning: ${file} has no entry in problems-meta.json. Add metadata for accurate stats.`);
  }

  const data = existsSync(PRACTICE)
    ? JSON.parse(readFileSync(PRACTICE, 'utf8'))
    : { entries: [] as PracticeEntry[] };

  const entry: PracticeEntry = {
    file,
    date: new Date().toISOString(),
    ...(notes ? { notes } : {}),
    rating,
  };
  data.entries.push(entry);
  writeFileSync(PRACTICE, JSON.stringify(data, null, 2) + '\n');
  console.log(`Logged practice: ${file} @ ${entry.date} [${rating}]${notes ? ` (${notes})` : ''}`);

  // Keep the spaced-repetition schedule in sync with every logged review.
  const state = updateScheduleForReview(file, rating, entry.date);
  console.log(`Next review due ${state.due.slice(0, 10)} (rung ${state.intervalIndex}).`);

  // If this real solve matches an earlier mock attempt (logged under a synthesised
  // `leetcode/<slug>` key), alias that key onto this file so their spaced-rep
  // ladders merge on the next `npm run schedule:backfill`.
  const updates = mockAliasUpdates(file, data.entries, meta);
  if (updates.length > 0) {
    for (const u of updates) {
      meta.problems[u.mockKey] = { ...(meta.problems[u.mockKey] ?? {}), aliasOf: u.realFile };
    }
    writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');
    console.log(`Linked ${updates.length} prior mock attempt(s) to ${file} via aliasOf.`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
