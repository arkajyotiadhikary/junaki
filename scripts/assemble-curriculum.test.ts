import assert from 'node:assert/strict';
import { keyOf, assemble, type CurriculumItemLike, type SourceGroup } from './assemble-curriculum';
import { buildSolvedIndex, type SolvedIndex } from './solved-index';
import type { SourceItem } from './curriculum-sources';

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

const EMPTY: SolvedIndex = { numbers: new Set(), norms: new Set() };

function lc(slug: string, phase = 1, pattern = 'Array'): SourceItem {
  return { slug, url: `https://leetcode.com/problems/${slug}/`, title: slug, pattern, difficulty: 'Easy', phase, kind: 'problem', source: 'leetcode' };
}

test('keyOf treats missing source as leetcode and normalizes slug', () => {
  assert.equal(keyOf({ slug: 'two-sum' }), 'leetcode:twosum');
  assert.equal(keyOf({ slug: 'two-sum', source: 'leetcode' }), 'leetcode:twosum');
  assert.equal(keyOf({ slug: '2-sum', source: 'interviewbit' }), 'interviewbit:2sum');
});

test('assemble skips items already in curriculum (by key)', () => {
  const existing: CurriculumItemLike[] = [{ slug: 'two-sum', kind: 'problem' }]; // no source → leetcode
  const groups: SourceGroup[] = [{ items: [lc('two-sum'), lc('three-sum')] }];
  const r = assemble(existing, groups, EMPTY);
  assert.equal(r.added, 1);
  assert.equal(r.skippedDuplicate, 1);
  assert.equal(r.items.length, 2);
});

test('assemble skips already-solved problems', () => {
  const solved = buildSolvedIndex(['leetcode/1_two_sum.ts']);
  const groups: SourceGroup[] = [{ items: [lc('two-sum')] }];
  const r = assemble([], groups, solved);
  assert.equal(r.added, 0);
  assert.equal(r.skippedSolved, 1);
});

test('layerFilter keeps only Foundation/Variants for AlgoFrog', () => {
  const af: SourceItem[] = [
    { ...lc('a'), source: 'leetcode', layer: 'Foundation' },
    { ...lc('b'), source: 'leetcode', layer: 'Hard' },
    { ...lc('c'), source: 'leetcode', layer: 'Variants' },
  ];
  const r = assemble([], [{ items: af, layerFilter: true }], EMPTY);
  assert.equal(r.added, 2);
  assert.equal(r.skippedLayer, 1);
});

test('clean strips note and layer (no paid content reaches curriculum)', () => {
  const af: SourceItem[] = [{ ...lc('a'), layer: 'Foundation', note: 'secret paid insight' }];
  const r = assemble([], [{ items: af, layerFilter: true }], EMPTY);
  const merged = r.items[0] as CurriculumItemLike;
  assert.equal(merged.note, undefined);
  assert.equal(merged.layer, undefined);
  assert.equal(merged.source, 'leetcode');
});

test('phase boundaries kept: existing first within phase, items sorted by phase', () => {
  const existing: CurriculumItemLike[] = [
    { slug: 'old-p1', kind: 'problem', phase: 1, source: 'leetcode' },
    { slug: 'old-p3', kind: 'problem', phase: 3, source: 'leetcode' },
  ];
  const groups: SourceGroup[] = [{ items: [lc('new-p1', 1), lc('new-p2', 2)] }];
  const r = assemble(existing, groups, EMPTY);
  assert.deepEqual(
    r.items.map((i) => `${i.phase}:${i.slug}`),
    ['1:old-p1', '1:new-p1', '2:new-p2', '3:old-p3'],
  );
});

test('idempotent: re-assembling the output adds nothing', () => {
  const groups: SourceGroup[] = [{ items: [lc('two-sum'), lc('three-sum')] }];
  const first = assemble([], groups, EMPTY);
  const second = assemble(first.items, groups, EMPTY);
  assert.equal(second.added, 0);
  assert.equal(second.items.length, first.items.length);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
