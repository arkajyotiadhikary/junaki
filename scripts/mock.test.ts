import assert from 'node:assert/strict';
import {
  hashSeed,
  mulberry32,
  rngFromSeed,
  isUnaided,
  withinDays,
  recentlyBlocked,
  solvedFiles,
  seenFiles,
  eligible,
  isOaCandidate,
  isAiPairCandidate,
  isStaged,
  pickOA,
  pickStaged,
  pickAiPair,
  outcomeToRating,
  synthFile,
  toEntry,
  type PracticeEntryLike,
} from './mock';
import { mockAliasUpdates } from './log-practice';
import { indexPracticedFiles, type CurriculumItem } from './today';

// Minimal tsx-runnable test runner — no framework, no deps (matches today.test.ts).
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

// --- seeded RNG --------------------------------------------------------------

test('mulberry32 is deterministic for a given seed', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  assert.ok(seqA.every((x) => x >= 0 && x < 1));
});

test('different seeds give different streams', () => {
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('hashSeed maps strings to a stable 32-bit int', () => {
  assert.equal(hashSeed('foo'), hashSeed('foo'));
  assert.notEqual(hashSeed('foo'), hashSeed('bar'));
  assert.ok(hashSeed('foo') >= 0 && hashSeed('foo') <= 0xffffffff);
});

test('rngFromSeed reproduces for numeric and string seeds', () => {
  assert.equal(rngFromSeed(7)(), rngFromSeed(7)());
  assert.equal(rngFromSeed('abc')(), rngFromSeed('abc')());
});

// --- recency / eligibility helpers -------------------------------------------

test('isUnaided is true unless mode is mock-ai', () => {
  assert.equal(isUnaided({}), true);
  assert.equal(isUnaided({ mode: 'mock-oa' }), true);
  assert.equal(isUnaided({ mode: 'mock-staged' }), true);
  assert.equal(isUnaided({ mode: 'mock-ai' }), false);
});

test('withinDays respects the window and ignores future dates', () => {
  const now = new Date('2026-06-13T00:00:00.000Z').getTime();
  assert.equal(withinDays('2026-06-10T00:00:00.000Z', now, 14), true);
  assert.equal(withinDays('2026-05-01T00:00:00.000Z', now, 14), false);
  assert.equal(withinDays('2026-07-01T00:00:00.000Z', now, 14), false); // future
});

const NOW = new Date('2026-06-13T00:00:00.000Z').getTime();
const ENTRIES: PracticeEntryLike[] = [
  { file: 'leetcode/1_two_sum.ts', date: '2026-06-10T00:00:00.000Z' }, // real solve, recent
  { file: 'leetcode/min-stack', date: '2026-06-11T00:00:00.000Z', mode: 'mock-oa' }, // recent unaided
  { file: 'leetcode/car-fleet', date: '2026-06-11T00:00:00.000Z', mode: 'mock-ai' }, // recent, AI
  { file: 'leetcode/3_longest.ts', date: '2026-01-01T00:00:00.000Z' }, // old real solve
];

test('recentlyBlocked includes recent unaided, excludes mock-ai and old', () => {
  const blocked = recentlyBlocked(ENTRIES, NOW, 14);
  assert.ok(blocked.includes('leetcode/1_two_sum.ts'));
  assert.ok(blocked.includes('leetcode/min-stack'));
  assert.ok(!blocked.includes('leetcode/car-fleet')); // mock-ai is exempt
  assert.ok(!blocked.includes('leetcode/3_longest.ts')); // outside window
});

test('solvedFiles counts only non-mock entries; seenFiles counts all', () => {
  assert.deepEqual(solvedFiles(ENTRIES).sort(), ['leetcode/1_two_sum.ts', 'leetcode/3_longest.ts']);
  assert.equal(seenFiles(ENTRIES).length, 4);
});

// --- eligible ----------------------------------------------------------------

const ITEMS: CurriculumItem[] = [
  { slug: 'two-sum', title: 'Two Sum', difficulty: 'Easy', kind: 'problem' },
  { slug: 'min-stack', title: 'Min Stack', difficulty: 'Medium', kind: 'problem' },
  { slug: 'car-fleet', title: 'Car Fleet', difficulty: 'Medium', kind: 'problem' },
  { slug: 'merge-k-lists', title: 'Merge k Lists', difficulty: 'Hard', kind: 'problem' },
  { slug: 'valid-parentheses', title: 'Valid Parens', difficulty: 'Easy', kind: 'problem' },
  { slug: 'kv-store-ttl', title: 'KV Store', difficulty: 'Medium', kind: 'staged' },
];

test('eligible drops done items and recently-blocked items', () => {
  const solvedIdx = indexPracticedFiles(new Set(solvedFiles(ENTRIES)));
  const blockedIdx = indexPracticedFiles(new Set(recentlyBlocked(ENTRIES, NOW, 14)));
  const out = eligible(ITEMS, solvedIdx, blockedIdx, isOaCandidate);
  const slugs = out.map((i) => i.slug);
  // two-sum: done (real solve #1). min-stack: blocked (recent mock-oa). Both gone.
  assert.ok(!slugs.includes('two-sum'));
  assert.ok(!slugs.includes('min-stack'));
  // car-fleet only AI-paired → still eligible. valid-parentheses untouched.
  assert.ok(slugs.includes('car-fleet'));
  assert.ok(slugs.includes('valid-parentheses'));
  // Hard and staged are excluded by the OA predicate.
  assert.ok(!slugs.includes('merge-k-lists'));
  assert.ok(!slugs.includes('kv-store-ttl'));
});

test('ai-pair predicate keeps Medium/Hard; staged predicate keeps staged', () => {
  assert.equal(isAiPairCandidate(ITEMS[0]), false); // Easy
  assert.equal(isAiPairCandidate(ITEMS[3]), true); // Hard
  assert.equal(isStaged(ITEMS[5]), true);
  assert.equal(isStaged(ITEMS[0]), false);
});

// --- selectors ---------------------------------------------------------------

test('pickOA returns [Easy|Medium, Medium], distinct, reproducible by seed', () => {
  const cands = ITEMS.filter(isOaCandidate);
  const a = pickOA(cands, rngFromSeed(1));
  const b = pickOA(cands, rngFromSeed(1));
  assert.deepEqual(a, b); // same seed → same picks
  assert.ok(a);
  if (a) {
    assert.notEqual(a[0].slug, a[1].slug); // distinct
    assert.equal(a[1].difficulty, 'Medium'); // second must be Medium
    assert.ok(a[0].difficulty === 'Easy' || a[0].difficulty === 'Medium');
  }
});

test('pickOA returns null when no Medium is available', () => {
  const onlyEasy: CurriculumItem[] = [{ slug: 'e', difficulty: 'Easy', kind: 'problem' }];
  assert.equal(pickOA(onlyEasy, rngFromSeed(1)), null);
});

test('pickStaged / pickAiPair pick one or return null when empty', () => {
  const staged = ITEMS.filter(isStaged);
  assert.equal(pickStaged(staged, rngFromSeed(2))?.slug, 'kv-store-ttl');
  assert.equal(pickStaged([], rngFromSeed(2)), null);
  const hardMed = ITEMS.filter(isAiPairCandidate);
  assert.ok(hardMed.some((i) => i.slug === pickAiPair(hardMed, rngFromSeed(2))?.slug));
  assert.equal(pickAiPair([], rngFromSeed(2)), null);
});

// --- outcome → entry ---------------------------------------------------------

test('outcomeToRating maps solved/partial/failed → good/hard/fail', () => {
  assert.equal(outcomeToRating('solved'), 'good');
  assert.equal(outcomeToRating('partial'), 'hard');
  assert.equal(outcomeToRating('failed'), 'fail');
});

test('toEntry builds a slug-keyed entry with synthesized file and mode', () => {
  const item: CurriculumItem = {
    slug: 'daily-temperatures',
    url: 'https://leetcode.com/problems/daily-temperatures/',
    difficulty: 'Medium',
    kind: 'problem',
  };
  const e = toEntry(item, 'partial', 25, 'mock-oa', '2026-06-13T10:00:00.000Z');
  assert.equal(e.file, 'leetcode/daily-temperatures');
  assert.equal(synthFile('daily-temperatures'), 'leetcode/daily-temperatures');
  assert.equal(e.slug, 'daily-temperatures');
  assert.equal(e.url, item.url);
  assert.equal(e.rating, 'hard');
  assert.equal(e.mode, 'mock-oa');
  assert.match(e.notes, /partial/);
});

// --- alias reconciliation (log-practice) -------------------------------------

test('mockAliasUpdates links a real solve to a prior mock-slug entry', () => {
  const entries = [
    { file: 'leetcode/daily-temperatures', slug: 'daily-temperatures', mode: 'mock-oa' },
    { file: 'leetcode/739_daily_temperatures.ts' }, // the real solve just logged
  ];
  const meta = { problems: {} as Record<string, { aliasOf?: string }> };
  const updates = mockAliasUpdates('leetcode/739_daily_temperatures.ts', entries, meta);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].mockKey, 'leetcode/daily-temperatures');
  assert.equal(updates[0].realFile, 'leetcode/739_daily_temperatures.ts');
});

test('mockAliasUpdates is a no-op when nothing matches or alias exists', () => {
  const entries = [{ file: 'leetcode/min-stack', slug: 'min-stack', mode: 'mock-oa' }];
  assert.equal(mockAliasUpdates('leetcode/15_3sum.ts', entries, { problems: {} }).length, 0);
  const already = { problems: { 'leetcode/min-stack': { aliasOf: 'leetcode/155_min_stack.ts' } } };
  assert.equal(mockAliasUpdates('leetcode/155_min_stack.ts', entries, already).length, 0);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
