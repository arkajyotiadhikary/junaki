import assert from 'node:assert/strict';
import { fileSlug, assertKnownPlatform, buildPath, parseArgs } from './new-problem';
import { normalizeSlug } from './curriculum-sources';

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

// --- fileSlug normalizes to the same key the detector uses ------------------

test('fileSlug lowercases and underscores spaces', () => {
  assert.equal(fileSlug('Valid Parentheses'), 'valid_parentheses');
});

test('fileSlug collapses punctuation runs and trims', () => {
  assert.equal(fileSlug('Pow(x, n)'), 'pow_x_n');
  assert.equal(fileSlug('--two--sum--'), 'two_sum');
});

test('fileSlug output matches curriculum slug under normalizeSlug', () => {
  // The whole point: a file built from the curriculum slug must detect as done.
  assert.equal(normalizeSlug(fileSlug('valid-parentheses')), normalizeSlug('valid-parentheses'));
  assert.equal(normalizeSlug(fileSlug('Two Sum')), normalizeSlug('two-sum'));
});

// --- buildPath -------------------------------------------------------------

test('buildPath without a number omits the prefix', () => {
  assert.equal(buildPath('leetcode', 'two_sum'), 'leetcode/two_sum.ts');
});

test('buildPath with a number adds the NNN_ prefix', () => {
  assert.equal(buildPath('leetcode', 'binary_search', '704'), 'leetcode/704_binary_search.ts');
});

test('buildPath works for every solution root', () => {
  assert.equal(buildPath('geeksforgeeks', 'kadane'), 'geeksforgeeks/kadane.ts');
  assert.equal(buildPath('hackerrank', 'jesse'), 'hackerrank/jesse.ts');
  assert.equal(buildPath('interviewbit', 'max_sum'), 'interviewbit/max_sum.ts');
});

// --- assertKnownPlatform ---------------------------------------------------

test('known platforms pass', () => {
  for (const p of ['leetcode', 'geeksforgeeks', 'hackerrank', 'interviewbit']) {
    assert.doesNotThrow(() => assertKnownPlatform(p));
  }
});

test('unknown platform is rejected with the valid list', () => {
  assert.throws(() => assertKnownPlatform('lc'), /Unknown platform "lc"/);
  assert.throws(() => assertKnownPlatform('codeforces'), /Valid platforms:/);
});

// --- parseArgs -------------------------------------------------------------

test('no args is bare mode', () => {
  assert.deepEqual(parseArgs([]), { mode: 'bare' });
});

test('numeric second arg is a LeetCode number; slug comes from the title', () => {
  assert.deepEqual(parseArgs(['leetcode', '704', 'Binary', 'Search']), {
    mode: 'freeform',
    platform: 'leetcode',
    num: '704',
    slug: 'binary_search',
    title: 'Binary Search',
  });
});

test('non-numeric second arg is the slug', () => {
  assert.deepEqual(parseArgs(['geeksforgeeks', 'kadanes-algorithm', "Kadane's", 'Algorithm']), {
    mode: 'freeform',
    platform: 'geeksforgeeks',
    slug: 'kadanes_algorithm',
    title: "Kadane's Algorithm",
  });
});

test('slug-only free-form falls back to the slug as the title', () => {
  assert.deepEqual(parseArgs(['leetcode', 'two-sum']), {
    mode: 'freeform',
    platform: 'leetcode',
    slug: 'two_sum',
    title: 'two-sum',
  });
});

test('a numbered problem with no title is rejected', () => {
  assert.throws(() => parseArgs(['leetcode', '704']), /needs a title/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
