import assert from 'node:assert/strict';
import {
  parseWeekRange,
  weekNumber,
  currentPhase,
  isItemDone,
  reviewHistory,
  onTimeInWindow,
  dueReviews,
  isWeekend,
  type CurriculumPhase,
  type CurriculumItem,
} from './today';
import type { ScheduleState } from './schedule';

// Minimal tsx-runnable test runner — no framework, no deps (matches schedule.test.ts).
let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(e instanceof Error ? `    ${e.message}` : e);
  }
}

// indexPracticedFiles is internal; rebuild the minimal shape the matcher needs.
function practiced(files: string[]) {
  return files.map((file) => {
    const base = (file.split('/').pop() ?? file).replace(/\.[a-z]+$/i, '');
    const m = base.match(/^(\d+)/);
    const num = m ? m[1] : null;
    const rest = num ? base.slice(num.length) : base;
    return { file, num, norm: rest.toLowerCase().replace(/[^a-z0-9]/g, '') };
  });
}

// --- parseWeekRange ----------------------------------------------------------

test('parseWeekRange handles number, pair, hyphen, and en-dash', () => {
  assert.deepEqual(parseWeekRange(5), [5, 5]);
  assert.deepEqual(parseWeekRange([5, 9]), [5, 9]);
  assert.deepEqual(parseWeekRange('5-9'), [5, 9]);
  assert.deepEqual(parseWeekRange('5–9'), [5, 9]); // en-dash, as in the plan table
  assert.deepEqual(parseWeekRange('3'), [3, 3]);
});

// --- weekNumber --------------------------------------------------------------

test('weekNumber is 1-based; first 7 days are week 1', () => {
  const start = '2026-06-15T00:00:00.000Z';
  assert.equal(weekNumber(start, new Date('2026-06-15T12:00:00.000Z')), 1);
  assert.equal(weekNumber(start, new Date('2026-06-21T23:00:00.000Z')), 1);
  assert.equal(weekNumber(start, new Date('2026-06-22T00:00:00.000Z')), 2);
});

test('weekNumber is <= 0 before the start date', () => {
  const start = '2026-06-15T00:00:00.000Z';
  assert.ok(weekNumber(start, new Date('2026-06-11T00:00:00.000Z')) <= 0);
});

// --- currentPhase ------------------------------------------------------------

const PHASES: CurriculumPhase[] = [
  { id: 1, name: 'P1', weeks: '1-4' },
  { id: 2, name: 'P2', weeks: '5-9' },
  { id: 3, name: 'P3', weeks: '10-26' },
];

test('currentPhase finds the phase containing the week', () => {
  assert.equal(currentPhase(PHASES, 1)?.id, 1);
  assert.equal(currentPhase(PHASES, 4)?.id, 1);
  assert.equal(currentPhase(PHASES, 5)?.id, 2);
  assert.equal(currentPhase(PHASES, 12)?.id, 3);
});

test('currentPhase clamps before first and after last', () => {
  assert.equal(currentPhase(PHASES, 0)?.id, 1); // before start → first phase
  assert.equal(currentPhase(PHASES, -3)?.id, 1);
  assert.equal(currentPhase(PHASES, 99)?.id, 3); // past end → last phase
});

// --- isItemDone --------------------------------------------------------------

const files = practiced([
  'leetcode/167_two_sum_ii.ts',
  'geeksforgeeks/strings/string_rotation.ts',
]);

test('isItemDone matches by explicit file field', () => {
  const item: CurriculumItem = { slug: 'whatever', kind: 'problem', file: 'leetcode/167_two_sum_ii.ts' };
  assert.equal(isItemDone(item, files), true);
});

test('isItemDone matches by leading LeetCode number in slug', () => {
  const item: CurriculumItem = { slug: '167-two-sum-ii', kind: 'problem' };
  assert.equal(isItemDone(item, files), true);
});

test('isItemDone matches by normalised slug when no number present', () => {
  const item: CurriculumItem = { slug: 'two-sum-ii', kind: 'problem', url: 'https://leetcode.com/problems/two-sum-ii/' };
  assert.equal(isItemDone(item, files), true);
});

test('isItemDone matches a non-leetcode slug by name', () => {
  const item: CurriculumItem = { slug: 'string-rotation', kind: 'problem' };
  assert.equal(isItemDone(item, files), true);
});

test('isItemDone returns false for an unsolved problem', () => {
  const item: CurriculumItem = { slug: 'valid-parentheses', kind: 'problem' };
  assert.equal(isItemDone(item, files), false);
});

// --- reviewHistory + onTimeInWindow ------------------------------------------

const id = (f: string) => f;

test('reviewHistory marks first solve as not-a-review, later solves as reviews', () => {
  const recs = reviewHistory(
    [
      { file: 'a.ts', date: '2026-01-01T00:00:00.000Z' }, // first solve
      { file: 'a.ts', date: '2026-01-03T00:00:00.000Z' }, // due 2026-01-04 → on time
      { file: 'a.ts', date: '2026-01-20T00:00:00.000Z' }, // due 2026-01-10 → late
    ],
    id,
  );
  assert.equal(recs[0].isReview, false);
  assert.equal(recs[1].isReview, true);
  assert.equal(recs[1].onTime, true);
  assert.equal(recs[2].isReview, true);
  assert.equal(recs[2].onTime, false);
});

test('onTimeInWindow counts only reviews inside the trailing window', () => {
  const now = new Date('2026-01-25T00:00:00.000Z');
  const recs = reviewHistory(
    [
      { file: 'a.ts', date: '2026-01-01T00:00:00.000Z' }, // first solve, not a review
      { file: 'a.ts', date: '2026-01-03T00:00:00.000Z' }, // review, but outside 7d window
      { file: 'a.ts', date: '2026-01-20T00:00:00.000Z' }, // review, late, inside window
      { file: 'a.ts', date: '2026-01-21T00:00:00.000Z' }, // review, on time (due 2026-02-19), inside window
    ],
    id,
  );
  const stat = onTimeInWindow(recs, now, 7);
  assert.equal(stat.total, 2); // only the two inside the 7-day window
  assert.equal(stat.onTime, 1);
});

// --- dueReviews --------------------------------------------------------------

test('dueReviews returns due-or-overdue entries, oldest first', () => {
  const now = new Date('2026-06-11T00:00:00.000Z');
  const schedule: Record<string, ScheduleState> = {
    'a.ts': { lastReview: '', intervalIndex: 0, due: '2026-06-09T00:00:00.000Z' },
    'b.ts': { lastReview: '', intervalIndex: 0, due: '2026-06-01T00:00:00.000Z' },
    'c.ts': { lastReview: '', intervalIndex: 0, due: '2026-12-01T00:00:00.000Z' }, // not due
  };
  const due = dueReviews(schedule, now);
  assert.deepEqual(due.map((d) => d.file), ['b.ts', 'a.ts']);
});

// --- isWeekend ---------------------------------------------------------------

test('isWeekend is true for Sat/Sun in local time', () => {
  // 2026-06-13 is a Saturday, 2026-06-15 a Monday (local-time construction).
  assert.equal(isWeekend(new Date(2026, 5, 13, 12)), true);
  assert.equal(isWeekend(new Date(2026, 5, 14, 12)), true); // Sunday
  assert.equal(isWeekend(new Date(2026, 5, 15, 12)), false); // Monday
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');

// --- nextProblemsRoundRobin --------------------------------------------------

import { nextProblemsRoundRobin, type CurriculumItem as CI } from './today';

function prob(slug: string, source?: string): CI {
  return { slug, title: slug, kind: 'problem', source } as CI;
}

test('round-robin picks one per platform, rotating by doneCount', () => {
  const pending = [
    prob('lc-a', 'leetcode'),
    prob('lc-b', 'leetcode'),
    prob('gfg-a', 'geeksforgeeks'),
    prob('hr-a', 'hackerrank'),
  ];
  // doneCount 0 → start at leetcode; weekend count 2 → leetcode + gfg
  assert.deepEqual(nextProblemsRoundRobin(pending, 2, 0).map((p) => p.slug), ['lc-a', 'gfg-a']);
  // doneCount 1 → start at geeksforgeeks
  assert.deepEqual(nextProblemsRoundRobin(pending, 2, 1).map((p) => p.slug), ['gfg-a', 'hr-a']);
});

test('round-robin treats missing source as leetcode and fills shortfall', () => {
  const pending = [prob('old-1'), prob('old-2')]; // no source → leetcode
  // only one platform present, count 2 → fills second from same backlog
  assert.deepEqual(nextProblemsRoundRobin(pending, 2, 0).map((p) => p.slug), ['old-1', 'old-2']);
});

test('round-robin returns [] when nothing pending', () => {
  assert.deepEqual(nextProblemsRoundRobin([], 2, 0), []);
});
