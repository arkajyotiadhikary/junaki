import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyReview,
  resolveCanonical,
  type Rating,
  type ScheduleState,
} from './schedule';

const ROOT = process.cwd();
const META = join(ROOT, 'data', 'problems-meta.json');
const PRACTICE = join(ROOT, 'data', 'practice.json');
const SCHEDULE = join(ROOT, 'data', 'schedule.json');
const CURRICULUM = join(ROOT, 'data', 'curriculum.json');

const MS_PER_DAY = 24 * 3600 * 1000;
const REVIEW_CAP = 3; // surface at most this many due reviews per day

// --- types -------------------------------------------------------------------

export type ItemKind = 'problem' | 'design' | 'reading' | 'behavioral' | 'staged';

export interface CurriculumItem {
  slug: string;
  url?: string;
  title?: string;
  pattern?: string;
  difficulty?: string;
  phase?: string | number;
  kind: ItemKind;
  source?: string; // platform: leetcode | geeksforgeeks | hackerrank | interviewbit | ...
  done?: boolean;
  file?: string; // optional explicit practice-file path
}

/** Platform rotation order for the next-problem round-robin. */
export const PLATFORM_ORDER = [
  'leetcode',
  'geeksforgeeks',
  'hackerrank',
  'interviewbit',
  'codeforces',
  'custom',
];

/** A curriculum item's platform; items written before the `source` field are leetcode. */
function sourceOf(item: CurriculumItem): string {
  return item.source ?? 'leetcode';
}

/**
 * Pick the next `count` problems, rotating across platforms instead of walking a
 * single list. We take the first unsolved problem on each platform (in
 * PLATFORM_ORDER), rotate the starting platform by `doneCount` so the pick
 * varies as you progress, and fill any shortfall from the remaining backlog.
 * This replaces the round-robin that used to live in the suggest-problem skill.
 */
export function nextProblemsRoundRobin(
  pending: CurriculumItem[],
  count: number,
  doneCount: number,
): CurriculumItem[] {
  // First unsolved problem per platform, in rotation order.
  const firstPerPlatform: CurriculumItem[] = [];
  for (const platform of PLATFORM_ORDER) {
    const hit = pending.find((it) => sourceOf(it) === platform);
    if (hit) firstPerPlatform.push(hit);
  }
  if (firstPerPlatform.length === 0) return pending.slice(0, count);

  const start = doneCount % firstPerPlatform.length;
  const rotated = [...firstPerPlatform.slice(start), ...firstPerPlatform.slice(0, start)];

  const picks: CurriculumItem[] = [];
  const used = new Set<string>();
  for (const it of rotated) {
    if (picks.length >= count) break;
    picks.push(it);
    used.add(it.slug);
  }
  // Fewer platforms than requested → fill from the rest of the backlog.
  for (const it of pending) {
    if (picks.length >= count) break;
    if (!used.has(it.slug)) {
      picks.push(it);
      used.add(it.slug);
    }
  }
  return picks;
}

export interface CurriculumPhase {
  id: string | number;
  name: string;
  weeks: number | [number, number] | string;
  focus?: string;
}

export interface Curriculum {
  startDate?: string;
  phases: CurriculumPhase[];
  items: CurriculumItem[];
}

interface PracticeEntry {
  file: string;
  date: string;
  notes?: string;
  rating?: Rating;
  // Mock simulations record problems that have no solved file yet; the slug/url
  // link the entry back to its curriculum item and `mode` tags how it was run.
  slug?: string;
  url?: string;
  mode?: string;
}

interface MetaFile {
  problems: Record<string, { title?: string; aliasOf?: string }>;
}

interface ScheduleFile {
  schedule: Record<string, ScheduleState>;
}

// --- pure logic --------------------------------------------------------------

/**
 * Normalise a phase's `weeks` field to an inclusive [start, end] week range.
 * Accepts a single week (`5`), an explicit pair (`[5, 9]`), or a string range
 * using either an ASCII hyphen or a Unicode en-dash (`"5-9"` / `"5–9"` — the
 * plan table uses the en-dash).
 */
export function parseWeekRange(weeks: CurriculumPhase['weeks']): [number, number] {
  if (typeof weeks === 'number') return [weeks, weeks];
  if (Array.isArray(weeks)) return [weeks[0], weeks[1] ?? weeks[0]];
  const parts = weeks.split(/[-–—]/).map((p) => parseInt(p.trim(), 10));
  const start = parts[0];
  const end = Number.isFinite(parts[1]) ? parts[1] : start;
  return [start, end];
}

/** 1-based ISO-ish week number since startDate. Week 1 = the first 7 days. */
export function weekNumber(startDate: string, now: Date): number {
  const startMs = new Date(startDate).getTime();
  const elapsedDays = Math.floor((now.getTime() - startMs) / MS_PER_DAY);
  return Math.floor(elapsedDays / 7) + 1; // can be <=0 if before startDate
}

/**
 * Pick the phase whose week-range contains `week`. Clamps: a week before the
 * first phase returns the first phase; a week past the last returns the last.
 */
export function currentPhase(
  phases: CurriculumPhase[],
  week: number,
): CurriculumPhase | undefined {
  if (phases.length === 0) return undefined;
  for (const phase of phases) {
    const [start, end] = parseWeekRange(phase.weeks);
    if (week >= start && week <= end) return phase;
  }
  const [firstStart] = parseWeekRange(phases[0].weeks);
  if (week < firstStart) return phases[0];
  return phases[phases.length - 1];
}

/** Strip everything but lowercase alphanumerics, for slug ⇄ filename matching. */
function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Leading numeric id of a practice filename, e.g. `leetcode/167_two_sum.ts` → "167". */
function leadingNumber(file: string): string | null {
  const base = file.split('/').pop() ?? file;
  const m = base.match(/^(\d+)/);
  return m ? m[1] : null;
}

export interface PracticedFile {
  file: string;
  num: string | null;
  norm: string; // normalised name minus the leading number and extension
}

export function indexPracticedFiles(files: Iterable<string>): PracticedFile[] {
  const out: PracticedFile[] = [];
  for (const file of files) {
    const base = (file.split('/').pop() ?? file).replace(/\.[a-z]+$/i, '');
    const num = leadingNumber(file);
    const rest = num ? base.slice(num.length) : base;
    out.push({ file, num, norm: normalizeSlug(rest) });
  }
  return out;
}

/**
 * Decide whether a curriculum item has been practised. Matching, in order:
 *   1. explicit `item.file` equals a practised path,
 *   2. a LeetCode number in the slug/url matches a `leetcode/<num>_*` file,
 *   3. the normalised slug equals a practised file's normalised name.
 * (LeetCode urls/slugs frequently lack the number that filenames carry, so the
 * slug fallback is what actually fires for most items.)
 */
export function isItemDone(item: CurriculumItem, practiced: PracticedFile[]): boolean {
  if (item.file && practiced.some((p) => p.file === item.file)) return true;

  const fromSlug = item.slug.match(/(\d+)/)?.[1] ?? null;
  const fromUrl = item.url?.match(/(\d+)/)?.[1] ?? null;
  const num = fromSlug ?? fromUrl;
  if (num && practiced.some((p) => p.num === num)) return true;

  const norm = normalizeSlug(item.slug.replace(/^\d+[-_]?/, ''));
  if (norm && practiced.some((p) => p.norm === norm)) return true;

  return false;
}

export interface ReviewRecord {
  file: string;
  date: string;
  isReview: boolean; // false for a problem's first-ever solve
  onTime: boolean; // whether date <= the due date active before this review
}

/**
 * Replay practice history chronologically, tagging each entry with whether it
 * was a *review* (a prior schedule state existed) and whether it landed on or
 * before the due date set by the previous review. Reused for the on-time stat.
 */
export function reviewHistory(
  entries: Array<{ file: string; date: string; rating?: Rating }>,
  resolve: (file: string) => string,
): ReviewRecord[] {
  const schedule: Record<string, ScheduleState> = {};
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const records: ReviewRecord[] = [];
  for (const e of sorted) {
    const key = resolve(e.file);
    const prev = schedule[key];
    const isReview = prev !== undefined;
    const onTime = isReview ? e.date <= prev.due : true;
    records.push({ file: e.file, date: e.date, isReview, onTime });
    schedule[key] = applyReview(prev, e.rating ?? 'good', e.date);
  }
  return records;
}

/** Reviews completed on time vs total reviews that fell within the trailing window. */
export function onTimeInWindow(
  records: ReviewRecord[],
  now: Date,
  windowDays: number,
): { onTime: number; total: number } {
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  let onTime = 0;
  let total = 0;
  for (const r of records) {
    if (!r.isReview) continue;
    if (new Date(r.date).getTime() < cutoff) continue;
    total++;
    if (r.onTime) onTime++;
  }
  return { onTime, total };
}

export interface DueReview {
  file: string;
  due: string;
}

/** Schedule entries due on or before `now`, oldest-due first. */
export function dueReviews(schedule: Record<string, ScheduleState>, now: Date): DueReview[] {
  const nowMs = now.getTime();
  return Object.entries(schedule)
    .filter(([, s]) => new Date(s.due).getTime() <= nowMs)
    .map(([file, s]) => ({ file, due: s.due }))
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Saturday (6) or Sunday (0) in the local timezone. */
export function isWeekend(now: Date): boolean {
  const d = now.getDay();
  return d === 0 || d === 6;
}

// --- file-I/O shell ----------------------------------------------------------

function loadJSON<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

function loadMeta(): MetaFile {
  return loadJSON<MetaFile>(META, { problems: {} });
}

function loadPractice(): PracticeEntry[] {
  return loadJSON<{ entries?: PracticeEntry[] }>(PRACTICE, {}).entries ?? [];
}

function loadSchedule(): Record<string, ScheduleState> {
  return loadJSON<ScheduleFile>(SCHEDULE, { schedule: {} }).schedule;
}

/** Returns null when curriculum.json is absent — the caller degrades gracefully. */
function loadCurriculum(): Curriculum | null {
  if (!existsSync(CURRICULUM)) return null;
  return JSON.parse(readFileSync(CURRICULUM, 'utf8')) as Curriculum;
}

// --- rendering ---------------------------------------------------------------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = c('1');
const dim = c('2');
const cyan = c('36');
const green = c('32');
const yellow = c('33');

/** Pad-right a string to `width` visible columns (input is assumed un-coloured). */
function pad(s: string, width: number): string {
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

function titleFor(file: string, meta: MetaFile): string {
  return meta.problems[file]?.title ?? file.split('/').pop() ?? file;
}

function weekdayLabel(now: Date): string {
  return now.toDateString(); // e.g. "Sat Jun 13 2026" — stable, locale-independent
}

function renderHeader(now: Date, phaseLine: string): void {
  const head = `▌ TODAY · ${weekdayLabel(now)}`;
  console.log('\n  ' + bold(cyan(head)) + (phaseLine ? dim('  ·  ' + phaseLine) : ''));
}

function renderReviews(due: DueReview[], meta: MetaFile): void {
  console.log('');
  const shown = due.slice(0, REVIEW_CAP);
  const header = `REVIEWS DUE (${shown.length}${due.length > REVIEW_CAP ? ` of ${due.length}` : ''})`;
  console.log('  ' + bold(header) + dim('     re-solve from scratch, no peeking'));
  if (due.length === 0) {
    console.log('    ' + dim('Nothing due — you are caught up. ✓'));
    return;
  }
  const titleWidth = Math.max(...shown.map((d) => titleFor(d.file, meta).length), 0);
  for (const d of shown) {
    const title = titleFor(d.file, meta);
    console.log('    ' + green('•') + ' ' + pad(title, titleWidth) + '  ' + dim(d.file));
    console.log('      ' + dim(`→ npm run practice -- ${d.file} --rating=<fail|hard|good|easy>`));
  }
  if (due.length > REVIEW_CAP) {
    console.log('    ' + yellow(`+${due.length - REVIEW_CAP} more due`) + dim(` — clear these ${REVIEW_CAP} first.`));
  }
}

/** Short platform tag shown next to a problem, e.g. "GFG". Hidden for leetcode. */
function platformTag(item: CurriculumItem): string {
  const map: Record<string, string> = {
    geeksforgeeks: 'GFG',
    hackerrank: 'HR',
    interviewbit: 'IB',
    codeforces: 'CF',
    custom: 'custom',
  };
  return item.source ? map[item.source] ?? '' : '';
}

function renderItem(item: CurriculumItem, kindNote = false): void {
  const title = item.title ?? item.slug;
  const meta = [item.difficulty, item.pattern, platformTag(item)].filter(Boolean).join('  ');
  const tail = item.url ?? (kindNote ? item.kind : '');
  console.log(
    '    ' + green('•') + ' ' + pad(title, 26) + ' ' + dim(pad(meta, 18)) + ' ' + dim(tail),
  );
}

function renderNewProblems(curriculum: Curriculum | null, weekend: boolean, practiced: PracticedFile[]): void {
  console.log('');
  if (!curriculum) {
    console.log('  ' + bold('NEW PROBLEM(S)'));
    console.log('    ' + yellow('curriculum.json not found') + dim(' — run Prompt 3 to generate the roadmap.'));
    console.log('    ' + dim('Reviews above still work from schedule.json.'));
    return;
  }
  const count = weekend ? 2 : 1;
  const problems = curriculum.items.filter((it) => it.kind === 'problem');
  const pending = problems.filter((it) => !isItemDone(it, practiced));
  const doneCount = problems.length - pending.length;
  const picks = nextProblemsRoundRobin(pending, count, doneCount);
  console.log('  ' + bold('NEW PROBLEM(S)') + dim(`  ·  ${count} today${weekend ? ' (weekend)' : ''}`));
  if (picks.length === 0) {
    console.log('    ' + dim('No unsolved problems left in the curriculum. 🎉'));
    return;
  }
  for (const it of picks) renderItem(it);
  console.log('      ' + dim('→ npm run new') + dim('   scaffold the file (correct folder + slug)'));
}

function renderDesign(curriculum: Curriculum | null, phase: CurriculumPhase | undefined, practiced: PracticedFile[]): void {
  if (!curriculum || !phase) return;
  const next = curriculum.items.find(
    (it) =>
      (it.kind === 'design' || it.kind === 'reading') &&
      String(it.phase) === String(phase.id) &&
      !isItemDone(it, practiced),
  );
  console.log('');
  console.log('  ' + bold('SYSTEM DESIGN') + dim('  ·  weekend'));
  if (!next) {
    console.log('    ' + dim(`No pending design/reading in ${phase.name}.`));
    return;
  }
  renderItem(next, true);
}

function renderFooter(
  curriculum: Curriculum | null,
  phase: CurriculumPhase | undefined,
  week: number,
  practiced: PracticedFile[],
  onTime: { onTime: number; total: number },
): void {
  console.log('');
  console.log('  ' + dim('─'.repeat(58)));
  const parts: string[] = [];
  if (phase) parts.push(`${phase.name}`);
  if (curriculum?.startDate) {
    const weeks = curriculum.phases.length
      ? parseWeekRange(curriculum.phases[curriculum.phases.length - 1].weeks)[1]
      : 26;
    parts.push(week < 1 ? `starts in ${1 - week} wk` : `Week ${week}/${weeks}`);
  }
  if (curriculum) {
    const problems = curriculum.items.filter((it) => it.kind === 'problem');
    const done = problems.filter((it) => isItemDone(it, practiced)).length;
    parts.push(`Problems ${done}/${problems.length}`);
  }
  parts.push(`Reviews on time (7d): ${onTime.onTime}/${onTime.total}`);
  console.log('  ' + parts.join(dim(' · ')));
  console.log('');
}

// --- main --------------------------------------------------------------------

function main(): void {
  const now = new Date();
  const meta = loadMeta();
  const practice = loadPractice();
  const schedule = loadSchedule();
  const curriculum = loadCurriculum();

  const resolve = (f: string) => resolveCanonical(f, meta);
  const practiced = indexPracticedFiles(new Set(practice.map((e) => e.file)));
  const weekend = isWeekend(now);

  const week = curriculum?.startDate ? weekNumber(curriculum.startDate, now) : 0;
  const phase = curriculum ? currentPhase(curriculum.phases, week) : undefined;
  const phaseLine =
    curriculum && phase
      ? `Week ${week < 1 ? 0 : week} · ${phase.name}`
      : curriculum
        ? ''
        : 'no curriculum yet';

  renderHeader(now, phaseLine);
  renderReviews(dueReviews(schedule, now), meta);
  renderNewProblems(curriculum, weekend, practiced);
  if (weekend) renderDesign(curriculum, phase, practiced);

  const onTime = onTimeInWindow(reviewHistory(practice, resolve), now, 7);
  renderFooter(curriculum, phase, week, practiced, onTime);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
