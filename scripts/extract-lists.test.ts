import assert from 'node:assert/strict';
import { cleanTopic, sectionFor, parseSection } from './extract-lists';
import { slugifyTitle, phaseForTopic, phaseFor } from './curriculum-sources';

// Minimal tsx-runnable test runner — matches schedule.test.ts / today.test.ts.
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

// --- slugifyTitle (LeetCode convention: delete punctuation, then hyphenate) --

test('slugifyTitle reproduces real LeetCode slugs', () => {
  assert.equal(slugifyTitle('Merge Sorted Array'), 'merge-sorted-array');
  assert.equal(slugifyTitle('Pow(x, n)'), 'powx-n');
  assert.equal(slugifyTitle('Sqrt(x)'), 'sqrtx');
  assert.equal(slugifyTitle('Insert Delete GetRandom O(1)'), 'insert-delete-getrandom-o1');
  assert.equal(slugifyTitle('3Sum'), '3sum');
});

// --- cleanTopic --------------------------------------------------------------

test('cleanTopic strips "(Days ...)" notes', () => {
  assert.equal(cleanTopic('Arrays (Days 1–13)'), 'Arrays');
  assert.equal(cleanTopic('Array / String'), 'Array / String');
});

// --- phase mapping -----------------------------------------------------------

test('phaseForTopic keyword rules', () => {
  assert.equal(phaseForTopic('Array / String'), 1);
  assert.equal(phaseForTopic('Binary Search'), 1); // not a tree
  assert.equal(phaseForTopic('Binary Search Tree'), 2); // tree wins over search
  assert.equal(phaseForTopic('Recursion & Backtracking'), 3); // backtrack before tree-ish
  assert.equal(phaseForTopic('Heaps and Maps'), 2);
  assert.equal(phaseForTopic('Graphs'), 3);
  assert.equal(phaseForTopic('Dynamic Programming'), 4);
  assert.equal(phaseForTopic("Kadane's Algorithm"), 4);
  assert.equal(phaseForTopic('Greedy'), 4);
  assert.equal(phaseForTopic('Intervals'), 4);
});

test('phaseFor applies advanced + Hard-layer overrides', () => {
  assert.equal(phaseFor('Segment Tree'), 5); // advanced topic
  assert.equal(phaseFor('Two Pointer', 'Hard'), 5); // Hard layer override
  assert.equal(phaseFor('Two Pointer', 'Foundation'), 1); // normal layer
});

// --- parseSection ------------------------------------------------------------

const SAMPLE = `### Demo List — Ordered Curriculum

**Topic 1 — Two Pointers**
1. Valid Palindrome (#125)
2. 3Sum (#15)

**Topic 2 — Graphs**
1. Number of Islands (#200)

### Next Section
ignored`;

test('sectionFor isolates the right section', () => {
  const sec = sectionFor(SAMPLE, 'Demo List');
  assert.ok(sec.includes('Two Pointers'));
  assert.ok(!sec.includes('ignored'));
});

test('parseSection (leetcode) extracts slug/url and strips #num', () => {
  const items = parseSection(sectionFor(SAMPLE, 'Demo List'), 'leetcode');
  assert.equal(items.length, 3);
  assert.deepEqual(
    { slug: items[0].slug, url: items[0].url, title: items[0].title, pattern: items[0].pattern, phase: items[0].phase },
    {
      slug: 'valid-palindrome',
      url: 'https://leetcode.com/problems/valid-palindrome/',
      title: 'Valid Palindrome',
      pattern: 'Two Pointers',
      phase: 1,
    },
  );
  assert.equal(items[2].pattern, 'Graphs');
  assert.equal(items[2].phase, 3);
});

test('parseSection (non-leetcode) omits url, keeps title slug', () => {
  const items = parseSection(sectionFor(SAMPLE, 'Demo List'), 'geeksforgeeks');
  assert.equal(items[0].url, undefined);
  assert.equal(items[0].source, 'geeksforgeeks');
  assert.equal(items[0].slug, 'valid-palindrome');
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
