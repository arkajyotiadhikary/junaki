import assert from 'node:assert/strict';
import {
  normalizeLayer,
  normalizeDifficulty,
  topicOrder,
  deriveItem,
  flatten,
  dedupe,
} from './import-algofrog';

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

// --- layer / difficulty normalization ---------------------------------------

test('normalizeLayer collapses messy spellings', () => {
  assert.equal(normalizeLayer('Found'), 'Foundation');
  assert.equal(normalizeLayer('Foundation'), 'Foundation');
  assert.equal(normalizeLayer('Combo'), 'Combination');
  assert.equal(normalizeLayer('Combination'), 'Combination');
  assert.equal(normalizeLayer('⚠️ Trap'), 'Trap');
  assert.equal(normalizeLayer('Hard/Insight'), 'Hard');
  assert.equal(normalizeLayer('Variants'), 'Variants');
});

test('normalizeDifficulty maps Med/null → Medium', () => {
  assert.equal(normalizeDifficulty('Med'), 'Medium');
  assert.equal(normalizeDifficulty('Medium'), 'Medium');
  assert.equal(normalizeDifficulty(null), 'Medium');
  assert.equal(normalizeDifficulty('Easy'), 'Easy');
  assert.equal(normalizeDifficulty('Hard'), 'Hard');
});

test('topicOrder pushes blank display_number to the end', () => {
  assert.equal(topicOrder({ display_number: '07' }, 0), 7);
  assert.ok(topicOrder({ display_number: '' }, 3) >= 900);
});

// --- deriveItem per source ---------------------------------------------------

const TP = { nav_label: 'Two Pointer', display_number: '01' };

test('deriveItem: LeetCode row', () => {
  const { item, key, lcNumber } = deriveItem(
    { title: 'Two Sum II', lc_url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/', lc_number: '167', layer: 'Foundation', difficulty: 'Med', key_insight: 'lo/hi' },
    TP,
  );
  assert.equal(item.source, 'leetcode');
  assert.equal(item.slug, 'two-sum-ii-input-array-is-sorted');
  assert.equal(item.phase, 1);
  assert.equal(item.note, 'lo/hi');
  assert.equal(lcNumber, '167');
  assert.equal(key, 'leetcode:167');
});

test('deriveItem: Codeforces row → cf slug, Hard layer → P5', () => {
  const { item } = deriveItem(
    { title: 'CF 295A', lc_url: 'https://codeforces.com/problemset/problem/295/A', layer: 'Hard', difficulty: 'Hard' },
    { nav_label: 'Prefix Sums', display_number: '07' },
  );
  assert.equal(item.source, 'codeforces');
  assert.equal(item.slug, 'cf-295a');
  assert.equal(item.phase, 5); // Hard-layer override
});

test('deriveItem: URL-less custom row → custom slug, no url', () => {
  const { item } = deriveItem(
    { title: 'Minimum Sum Subarray', lc_url: null, layer: 'Variants' },
    { nav_label: "Kadane's Algorithm", display_number: '05' },
  );
  assert.equal(item.source, 'custom');
  assert.equal(item.slug, 'custom-minimum-sum-subarray');
  assert.equal(item.url, undefined);
  assert.equal(item.phase, 4); // Kadane → DP phase
});

test('deriveItem: advanced topic → P5 regardless of layer', () => {
  const { item } = deriveItem(
    { title: 'Range Sum', lc_url: 'https://leetcode.com/problems/range-sum/', lc_number: '1', layer: 'Foundation' },
    { nav_label: 'Segment Tree', display_number: '39' },
  );
  assert.equal(item.phase, 5);
});

// --- flatten + dedupe --------------------------------------------------------

test('flatten orders by topic then order_num; dedupe keeps first', () => {
  const topics = [
    {
      nav_label: 'HashMap',
      display_number: '02',
      problems: [
        { title: 'Two Sum', lc_url: 'https://leetcode.com/problems/two-sum/', lc_number: '1', order_num: 2 },
        { title: 'Contains Duplicate', lc_url: 'https://leetcode.com/problems/contains-duplicate/', lc_number: '217', order_num: 1 },
      ],
    },
    {
      nav_label: 'Two Pointer',
      display_number: '01',
      problems: [
        // duplicate of Two Sum (same lc_number) under an earlier topic
        { title: 'Two Sum', lc_url: 'https://leetcode.com/problems/two-sum/', lc_number: '1', order_num: 1 },
      ],
    },
  ];
  const flat = flatten(topics);
  // Two Pointer (01) comes before HashMap (02); within HashMap order_num 1 before 2
  assert.deepEqual(flat.map((d) => d.item.title), ['Two Sum', 'Contains Duplicate', 'Two Sum']);
  const { unique, collapsed } = dedupe(flat);
  assert.equal(unique.length, 2);
  assert.equal(collapsed.length, 1);
  // first occurrence (Two Pointer topic) wins → pattern is Two Pointer
  assert.equal(unique.find((d) => d.item.title === 'Two Sum')!.item.pattern, 'Two Pointer');
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
