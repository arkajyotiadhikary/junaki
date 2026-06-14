import assert from 'node:assert/strict';
import {
  INTERVALS,
  nextIntervalIndex,
  computeDue,
  applyReview,
  buildScheduleFromHistory,
} from './schedule';

// Minimal tsx-runnable test runner — no framework, no deps.
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

const MAX = INTERVALS.length - 1;

// --- nextIntervalIndex: the ladder transition --------------------------------

test('new problem seeds at index 0 regardless of rating', () => {
  assert.equal(nextIntervalIndex(null, 'good'), 0);
  assert.equal(nextIntervalIndex(null, 'easy'), 0);
  assert.equal(nextIntervalIndex(null, 'hard'), 0);
  assert.equal(nextIntervalIndex(null, 'fail'), 0);
});

test("'good' advances one rung", () => {
  assert.equal(nextIntervalIndex(0, 'good'), 1);
  assert.equal(nextIntervalIndex(2, 'good'), 3);
});

test("'easy' advances two rungs", () => {
  assert.equal(nextIntervalIndex(0, 'easy'), 2);
  assert.equal(nextIntervalIndex(1, 'easy'), 3);
});

test("'hard' repeats the current rung", () => {
  assert.equal(nextIntervalIndex(0, 'hard'), 0);
  assert.equal(nextIntervalIndex(3, 'hard'), 3);
});

test("'fail' resets to index 0", () => {
  assert.equal(nextIntervalIndex(2, 'fail'), 0);
  assert.equal(nextIntervalIndex(MAX, 'fail'), 0);
});

test('index is capped at the last rung', () => {
  assert.equal(nextIntervalIndex(MAX, 'good'), MAX);
  assert.equal(nextIntervalIndex(MAX, 'easy'), MAX);
  assert.equal(nextIntervalIndex(MAX - 1, 'easy'), MAX); // 3 + 2 = 5 → clamped to 4
  assert.equal(nextIntervalIndex(MAX, 'hard'), MAX);
});

// --- computeDue --------------------------------------------------------------

test('computeDue adds the ladder interval in days', () => {
  assert.equal(computeDue('2026-01-01T00:00:00.000Z', 0), '2026-01-04T00:00:00.000Z'); // +3d
  assert.equal(computeDue('2026-01-01T00:00:00.000Z', MAX), '2026-03-02T00:00:00.000Z'); // +60d
});

// --- applyReview -------------------------------------------------------------

test('applyReview on a new problem → index 0, due in 3 days', () => {
  const s = applyReview(undefined, 'good', '2026-01-01T00:00:00.000Z');
  assert.equal(s.intervalIndex, 0);
  assert.equal(s.lastReview, '2026-01-01T00:00:00.000Z');
  assert.equal(s.due, '2026-01-04T00:00:00.000Z');
});

// --- buildScheduleFromHistory + aliasOf --------------------------------------

test('replaying history advances the ladder per session', () => {
  const id = (f: string) => f;
  const sched = buildScheduleFromHistory(
    [
      { file: 'a.ts', date: '2026-01-01T00:00:00.000Z' }, // new → 0
      { file: 'a.ts', date: '2026-01-05T00:00:00.000Z' }, // good → 1
      { file: 'a.ts', date: '2026-01-20T00:00:00.000Z' }, // good → 2
    ],
    id,
  );
  assert.equal(sched['a.ts'].intervalIndex, 2);
});

test('aliasOf: alias and canonical collapse to one schedule entry', () => {
  const resolve = (f: string) => (f === 'gfg/anagrams.ts' ? 'lc/242.ts' : f);
  const sched = buildScheduleFromHistory(
    [
      { file: 'lc/242.ts', date: '2026-01-01T00:00:00.000Z' }, // new → 0
      { file: 'gfg/anagrams.ts', date: '2026-01-05T00:00:00.000Z' }, // good → 1
    ],
    resolve,
  );
  assert.equal(Object.keys(sched).length, 1);
  assert.equal(sched['lc/242.ts'].intervalIndex, 1);
});

test('history is replayed in chronological order even if unsorted', () => {
  const id = (f: string) => f;
  const sched = buildScheduleFromHistory(
    [
      { file: 'a.ts', date: '2026-01-20T00:00:00.000Z' },
      { file: 'a.ts', date: '2026-01-01T00:00:00.000Z' },
      { file: 'a.ts', date: '2026-01-05T00:00:00.000Z' },
    ],
    id,
  );
  assert.equal(sched['a.ts'].intervalIndex, 2);
  assert.equal(sched['a.ts'].lastReview, '2026-01-20T00:00:00.000Z');
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
