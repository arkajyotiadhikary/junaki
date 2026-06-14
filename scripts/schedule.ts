import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const META = join(ROOT, 'data', 'problems-meta.json');
const PRACTICE = join(ROOT, 'data', 'practice.json');
const SCHEDULE = join(ROOT, 'data', 'schedule.json');

// Spaced-repetition interval ladder, in days. Index into this with intervalIndex.
export const INTERVALS = [3, 7, 14, 30, 60] as const;
const MAX_INDEX = INTERVALS.length - 1;

export const RATINGS = ['fail', 'hard', 'good', 'easy'] as const;
export type Rating = (typeof RATINGS)[number];

export interface ScheduleState {
  lastReview: string; // ISO-8601 timestamp of the most recent review
  intervalIndex: number; // position on the INTERVALS ladder
  due: string; // ISO-8601 timestamp when the next review is due
}

export interface ScheduleFile {
  schedule: Record<string, ScheduleState>;
}

interface PracticeEntry {
  file: string;
  date: string;
  notes?: string;
  rating?: Rating;
  slug?: string;
  url?: string;
  mode?: string;
}

interface MetaFile {
  problems: Record<string, { aliasOf?: string }>;
}

/**
 * Advance the interval ladder for one review.
 *
 * Contract (see scripts/schedule.test.ts for the exact cases):
 *   - prevIndex === null  → a brand-new problem, seeded at index 0 (due in 3 days),
 *                           regardless of the rating on this first solve.
 *   - 'good'              → advance one rung.
 *   - 'easy'              → advance two rungs.
 *   - 'hard'              → repeat the current rung.
 *   - 'fail'              → reset to index 0.
 *   - The result is always clamped to [0, MAX_INDEX] (repeat the last 60-day rung).
 *
 * @param prevIndex the current ladder index, or null if this problem is new
 * @param rating    how the review went
 * @returns the next ladder index, clamped to [0, MAX_INDEX]
 */
export function nextIntervalIndex(prevIndex: number | null, rating: Rating): number {
  if (prevIndex === null) return 0; // new problem: seed at index 0, ignore first-solve rating
  let next: number;
  switch (rating) {
    case 'good': next = prevIndex + 1; break;
    case 'easy': next = prevIndex + 2; break;
    case 'hard': next = prevIndex; break;
    case 'fail': next = 0; break;
  }
  return Math.min(Math.max(next, 0), MAX_INDEX);
}

/** Compute the next due timestamp = reviewDate + INTERVALS[index] days. */
export function computeDue(reviewDate: string, index: number): string {
  const clamped = Math.min(Math.max(index, 0), MAX_INDEX);
  const days = INTERVALS[clamped];
  const t = new Date(reviewDate).getTime();
  return new Date(t + days * 24 * 3600 * 1000).toISOString();
}

/** Apply one review to a problem's prior state (or undefined if new) and return the new state. */
export function applyReview(
  prev: ScheduleState | undefined,
  rating: Rating,
  date: string,
): ScheduleState {
  const index = nextIntervalIndex(prev ? prev.intervalIndex : null, rating);
  return { lastReview: date, intervalIndex: index, due: computeDue(date, index) };
}

/**
 * Rebuild the full schedule map by replaying practice history in chronological order.
 * `resolve` maps a file path to its canonical key so aliases share one schedule entry.
 * Entries without a stored rating are treated as 'good' (historical sessions predate ratings).
 */
export function buildScheduleFromHistory(
  entries: Array<{ file: string; date: string; rating?: Rating }>,
  resolve: (file: string) => string,
): Record<string, ScheduleState> {
  const schedule: Record<string, ScheduleState> = {};
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const key = resolve(e.file);
    schedule[key] = applyReview(schedule[key], e.rating ?? 'good', e.date);
  }
  return schedule;
}

// --- file-I/O shell ---------------------------------------------------------

function loadMeta(): MetaFile {
  return existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : { problems: {} };
}

function loadPractice(): PracticeEntry[] {
  if (!existsSync(PRACTICE)) return [];
  return JSON.parse(readFileSync(PRACTICE, 'utf8')).entries ?? [];
}

function loadSchedule(): ScheduleFile {
  if (!existsSync(SCHEDULE)) return { schedule: {} };
  return JSON.parse(readFileSync(SCHEDULE, 'utf8'));
}

function writeSchedule(data: ScheduleFile): void {
  // Stable key order so diffs stay small.
  const ordered: Record<string, ScheduleState> = {};
  for (const key of Object.keys(data.schedule).sort()) ordered[key] = data.schedule[key];
  writeFileSync(SCHEDULE, JSON.stringify({ schedule: ordered }, null, 2) + '\n');
}

/** Resolve a file to its canonical schedule key, following aliasOf. */
export function resolveCanonical(file: string, meta: MetaFile): string {
  return meta.problems?.[file]?.aliasOf ?? file;
}

/** Update schedule.json for a single logged review. Called automatically by log-practice. */
export function updateScheduleForReview(file: string, rating: Rating, date: string): ScheduleState {
  const meta = loadMeta();
  const data = loadSchedule();
  const key = resolveCanonical(file, meta);
  const state = applyReview(data.schedule[key], rating, date);
  data.schedule[key] = state;
  writeSchedule(data);
  return state;
}

/** One-time backfill: derive schedule state from existing practice history. */
function backfill(): void {
  const meta = loadMeta();
  const entries = loadPractice();
  const schedule = buildScheduleFromHistory(entries, (f) => resolveCanonical(f, meta));
  writeSchedule({ schedule });
  const count = Object.keys(schedule).length;
  console.log(`Backfilled schedule.json from ${entries.length} sessions → ${count} problems.`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) backfill();
