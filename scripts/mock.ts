import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface, type Interface } from 'node:readline';
import {
  isItemDone,
  indexPracticedFiles,
  type Curriculum,
  type CurriculumItem,
  type PracticedFile,
} from './today';
import { updateScheduleForReview, type Rating } from './schedule';

const ROOT = process.cwd();
const CURRICULUM = join(ROOT, 'data', 'curriculum.json');
const PRACTICE = join(ROOT, 'data', 'practice.json');

const MS_PER_DAY = 24 * 3600 * 1000;
const UNAIDED_WINDOW_DAYS = 14;

// --- types -------------------------------------------------------------------

export type MockType = 'oa' | 'staged' | 'ai-pair';
export type MockMode = 'mock-oa' | 'mock-staged' | 'mock-ai';
export type Outcome = 'solved' | 'partial' | 'failed';

/** The slice of a practice entry the pure selection logic reads. */
export interface PracticeEntryLike {
  file: string;
  date: string;
  mode?: string;
}

export interface MockEntry {
  file: string;
  slug: string;
  url?: string;
  date: string;
  rating: Rating;
  mode: MockMode;
  notes: string;
}

interface TypeConfig {
  mode: MockMode;
  minutes: number;
}

const TYPE_CONFIG: Record<MockType, TypeConfig> = {
  oa: { mode: 'mock-oa', minutes: 90 },
  staged: { mode: 'mock-staged', minutes: 90 },
  'ai-pair': { mode: 'mock-ai', minutes: 60 },
};

// --- seeded RNG (dependency-free) --------------------------------------------

/** xfnv1a string hash → 32-bit int, so `--seed foo` is as usable as `--seed 7`. */
export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 PRNG: deterministic [0,1) stream from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the RNG. A numeric or string seed is reproducible; an absent seed falls
 * back to a non-fixed value so unseeded runs vary. The pure tests always pass a
 * seed, keeping the tested path deterministic.
 */
export function rngFromSeed(seed: string | number | undefined): () => number {
  const value =
    seed === undefined
      ? Math.floor(Math.random() * 0x7fffffff)
      : typeof seed === 'number'
        ? seed
        : hashSeed(seed);
  return mulberry32(value >>> 0);
}

/** Pick one element using the RNG. Caller guarantees a non-empty array. */
export function pickOne<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// --- eligibility -------------------------------------------------------------

/** True for any session that was not AI-assisted (covers real solves + oa/staged). */
export function isUnaided(entry: { mode?: string }): boolean {
  return entry.mode !== 'mock-ai';
}

/** Practice date is within the trailing window and not in the future. */
export function withinDays(dateISO: string, nowMs: number, days: number): boolean {
  const t = new Date(dateISO).getTime();
  return t <= nowMs && nowMs - t <= days * MS_PER_DAY;
}

/** Files practiced *unaided* within the window — these block re-picking. */
export function recentlyBlocked(
  entries: PracticeEntryLike[],
  nowMs: number,
  days: number,
): string[] {
  return entries.filter((e) => isUnaided(e) && withinDays(e.date, nowMs, days)).map((e) => e.file);
}

/** Files from genuine (non-mock) solves — these mark a curriculum item "done". */
export function solvedFiles(entries: PracticeEntryLike[]): string[] {
  return entries.filter((e) => !e.mode).map((e) => e.file);
}

/** Every file ever practiced — used by ai-pair's stricter "unseen" rule. */
export function seenFiles(entries: PracticeEntryLike[]): string[] {
  return entries.map((e) => e.file);
}

/**
 * Items matching `predicate` that are neither already accounted for (`practiced`
 * — "done" for oa/staged, "seen" for ai-pair) nor recently practiced unaided
 * (`blocked`). Both indices are matched with the shared `isItemDone`.
 */
export function eligible(
  items: CurriculumItem[],
  practiced: PracticedFile[],
  blocked: PracticedFile[],
  predicate: (it: CurriculumItem) => boolean,
): CurriculumItem[] {
  return items
    .filter(predicate)
    .filter((it) => !isItemDone(it, practiced) && !isItemDone(it, blocked));
}

const DIFF = (set: ReadonlySet<string>) => (it: CurriculumItem) =>
  it.kind === 'problem' && it.difficulty != null && set.has(it.difficulty);

export const isOaCandidate = DIFF(new Set(['Easy', 'Medium']));
export const isAiPairCandidate = DIFF(new Set(['Medium', 'Hard']));
export const isStaged = (it: CurriculumItem) => it.kind === 'staged';

// --- selectors ---------------------------------------------------------------

/** Two distinct problems: first Easy|Medium, second Medium. Null if impossible. */
export function pickOA(
  candidates: CurriculumItem[],
  rng: () => number,
): [CurriculumItem, CurriculumItem] | null {
  const mediums = candidates.filter((c) => c.difficulty === 'Medium');
  if (mediums.length === 0) return null;
  const second = pickOne(mediums, rng);
  const firstPool = candidates.filter(
    (c) => (c.difficulty === 'Easy' || c.difficulty === 'Medium') && c.slug !== second.slug,
  );
  if (firstPool.length === 0) return null;
  const first = pickOne(firstPool, rng);
  return [first, second];
}

/** One staged item, or null if none are eligible. */
export function pickStaged(candidates: CurriculumItem[], rng: () => number): CurriculumItem | null {
  return candidates.length === 0 ? null : pickOne(candidates, rng);
}

/** One Medium|Hard problem, or null if none are eligible. */
export function pickAiPair(candidates: CurriculumItem[], rng: () => number): CurriculumItem | null {
  return candidates.length === 0 ? null : pickOne(candidates, rng);
}

// --- outcome → entry ---------------------------------------------------------

export function outcomeToRating(outcome: Outcome): Rating {
  return outcome === 'solved' ? 'good' : outcome === 'partial' ? 'hard' : 'fail';
}

/** Synthesised practice-file key for an unsolved pick (no numeric prefix → never collides). */
export function synthFile(slug: string): string {
  return `leetcode/${slug}`;
}

/** Build the practice entry appended for one solved/attempted mock problem. */
export function toEntry(
  item: CurriculumItem,
  outcome: Outcome,
  minutes: number,
  mode: MockMode,
  nowISO: string,
): MockEntry {
  return {
    file: synthFile(item.slug),
    slug: item.slug,
    ...(item.url ? { url: item.url } : {}),
    date: nowISO,
    rating: outcomeToRating(outcome),
    mode,
    notes: `${mode} · ${outcome} · ${minutes}min`,
  };
}

// --- file-I/O shell ----------------------------------------------------------

function loadCurriculum(): Curriculum {
  if (!existsSync(CURRICULUM)) {
    console.error('data/curriculum.json not found — run the roadmap generator first.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(CURRICULUM, 'utf8')) as Curriculum;
}

function loadPractice(): PracticeEntryLike[] {
  if (!existsSync(PRACTICE)) return [];
  return (JSON.parse(readFileSync(PRACTICE, 'utf8')).entries ?? []) as PracticeEntryLike[];
}

function appendEntries(entries: MockEntry[]): void {
  const data = existsSync(PRACTICE)
    ? JSON.parse(readFileSync(PRACTICE, 'utf8'))
    : { entries: [] };
  data.entries.push(...entries);
  writeFileSync(PRACTICE, JSON.stringify(data, null, 2) + '\n');
}

function parseType(args: string[]): MockType | null {
  const i = args.indexOf('--type');
  const value = i >= 0 ? args[i + 1] : undefined;
  return value === 'oa' || value === 'staged' || value === 'ai-pair' ? value : null;
}

function parseSeed(args: string[]): string | undefined {
  const i = args.indexOf('--seed');
  return i >= 0 ? args[i + 1] : undefined;
}

function usage(): never {
  console.error('Usage: npm run mock -- --type <oa|staged|ai-pair> [--seed <n>]');
  console.error('  oa       2 problems (Easy/Medium + Medium), 90 min — Amazon-style OA');
  console.error('  staged   1 multi-stage problem, 90 min — Meta CodeSignal-style');
  console.error('  ai-pair  1 Medium/Hard, 60 min, AI allowed — Meta AI-enabled round');
  process.exit(1);
}

// --- terminal: countdown + prompts -------------------------------------------

const BELL = '\x07';

/** Live countdown; resolves on time-up OR Ctrl-C (so an early stop still logs). */
function runTimer(totalSec: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = totalSec;
    const bellAt = new Set([30 * 60, 10 * 60, 0]);
    let done = false;

    const draw = () => {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const clock = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      process.stdout.write(`\r  ⏱  ${clock} remaining   `);
    };

    const finish = (note?: string) => {
      if (done) return;
      done = true;
      clearInterval(iv);
      process.removeListener('SIGINT', onSig);
      if (note) process.stdout.write(`\n  ${note}\n`);
      else process.stdout.write('\n');
      resolve();
    };

    const onSig = () => finish('⏹  stopped early — let’s log how it went.');
    process.on('SIGINT', onSig);

    draw();
    const iv = setInterval(() => {
      remaining -= 1;
      if (bellAt.has(remaining)) process.stdout.write(BELL);
      draw();
      if (remaining <= 0) finish('⏰  time! — log how it went.');
    }, 1000);
  });
}

function ask(rl: Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

async function promptOutcome(
  rl: Interface,
  label: string,
): Promise<{ outcome: Outcome; minutes: number }> {
  const raw = (await ask(rl, `  ${label} — (s)olved / (p)artial / (f)ailed? `)).trim().toLowerCase();
  const outcome: Outcome = raw.startsWith('s') ? 'solved' : raw.startsWith('p') ? 'partial' : 'failed';
  const minsRaw = (await ask(rl, `  ${label} — minutes spent? `)).trim();
  const minutes = Math.max(0, Number.parseInt(minsRaw, 10) || 0);
  return { outcome, minutes };
}

function feedSchedule(entries: MockEntry[]): void {
  // mock-ai is AI-assisted, so it never advances the real retention ladder.
  for (const e of entries) {
    if (e.mode === 'mock-oa' || e.mode === 'mock-staged') {
      updateScheduleForReview(e.file, e.rating, e.date);
    }
  }
}

// --- main --------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const type = parseType(args);
  if (!type) usage();
  const seed = parseSeed(args);
  const { mode, minutes } = TYPE_CONFIG[type];

  const curriculum = loadCurriculum();
  const practice = loadPractice();
  const nowMs = Date.now();
  const rng = rngFromSeed(seed);

  const solvedIdx = indexPracticedFiles(new Set(solvedFiles(practice)));
  const seenIdx = indexPracticedFiles(new Set(seenFiles(practice)));
  const blockedIdx = indexPracticedFiles(
    new Set(recentlyBlocked(practice, nowMs, UNAIDED_WINDOW_DAYS)),
  );

  // Resolve the picks for this type.
  let picks: CurriculumItem[];
  if (type === 'oa') {
    const cands = eligible(curriculum.items, solvedIdx, blockedIdx, isOaCandidate);
    const pair = pickOA(cands, rng);
    if (!pair) {
      console.error('Not enough eligible problems for an OA (need 1 Easy/Medium + 1 Medium).');
      process.exit(1);
    }
    picks = pair;
  } else if (type === 'staged') {
    const cands = eligible(curriculum.items, [], blockedIdx, isStaged);
    const one = pickStaged(cands, rng);
    if (!one) {
      console.error('No eligible staged problems found in curriculum.json.');
      process.exit(1);
    }
    picks = [one];
  } else {
    const cands = eligible(curriculum.items, seenIdx, blockedIdx, isAiPairCandidate);
    const one = pickAiPair(cands, rng);
    if (!one) {
      console.error('No unseen Medium/Hard problems available for an AI-pair round.');
      process.exit(1);
    }
    picks = [one];
  }

  // Brief the candidate.
  const limitLabel = `${minutes} min`;
  console.log(`\n  ▌ MOCK · ${type.toUpperCase()} · ${limitLabel}${seed !== undefined ? `  (seed ${seed})` : ''}\n`);
  if (type === 'staged') {
    const it = picks[0];
    console.log(`  ${it.title ?? it.slug}  [${it.difficulty ?? '?'}]`);
    console.log(`  spec: mocks/staged/${it.slug}.md`);
    console.log('  4 stages, build incrementally. Run each stage’s checks before moving on.');
  } else {
    picks.forEach((it, i) => {
      console.log(`  ${i + 1}. ${it.title ?? it.slug}  [${it.difficulty ?? '?'}]`);
      if (it.url) console.log(`     ${it.url}`);
    });
  }
  if (type === 'ai-pair') {
    console.log('\n  AI-ENABLED ROUND — you MAY use an AI assistant.');
    console.log('  Graded skills: problem decomposition · prompt quality ·');
    console.log('  verifying & correcting AI output · narrating tradeoffs.');
  }
  console.log('');

  await runTimer(minutes * 60);

  // Collect outcomes and persist.
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const nowISO = new Date().toISOString();
  const entries: MockEntry[] = [];
  for (let i = 0; i < picks.length; i++) {
    const label = picks.length > 1 ? `Problem ${i + 1}` : picks[i].title ?? picks[i].slug;
    const { outcome, minutes: mins } = await promptOutcome(rl, label);
    entries.push(toEntry(picks[i], outcome, mins, mode, nowISO));
  }
  rl.close();

  appendEntries(entries);
  feedSchedule(entries);

  const fed = mode === 'mock-ai' ? ' (practice log only — AI rounds skip the review schedule)' : '';
  console.log(`\n  Logged ${entries.length} ${mode} entr${entries.length === 1 ? 'y' : 'ies'}.${fed}\n`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
