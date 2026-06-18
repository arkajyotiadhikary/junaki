import assert from 'node:assert/strict';
import { parseArgs } from './log-practice';

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

// --- the happy paths --------------------------------------------------------

test('file plus --rating=value parses', () => {
  assert.deepEqual(parseArgs(['leetcode/x.ts', '--rating=fail']), {
    file: 'leetcode/x.ts',
    rating: 'fail',
  });
});

test('rating defaults to good when omitted', () => {
  assert.deepEqual(parseArgs(['leetcode/x.ts']), {
    file: 'leetcode/x.ts',
    rating: 'good',
  });
});

test('--notes and --rating parse together, in any order', () => {
  assert.deepEqual(parseArgs(['x.ts', '--rating=easy', '--notes="2nd solve"']), {
    file: 'x.ts',
    notes: '2nd solve',
    rating: 'easy',
  });
});

test('surrounding quotes are stripped from --notes', () => {
  assert.equal(parseArgs(['x.ts', '--notes="hi"']).notes, 'hi');
});

// --- the strict rejections (the point of this change) -----------------------

test('space form --rating fail is rejected', () => {
  assert.throws(() => parseArgs(['x.ts', '--rating', 'fail']), /Unrecognised argument: --rating/);
});

test('a bare word is rejected', () => {
  assert.throws(() => parseArgs(['x.ts', 'fail']), /Unrecognised argument: fail/);
});

test('a misspelled flag is rejected', () => {
  assert.throws(() => parseArgs(['x.ts', '--ratng=fail']), /Unrecognised argument: --ratng=fail/);
});

test('an out-of-set rating value is rejected', () => {
  assert.throws(() => parseArgs(['x.ts', '--rating=meh']), /Invalid --rating: meh/);
});

test('no args at all is rejected', () => {
  assert.throws(() => parseArgs([]), /No file given/);
});

test('a flag in the file position is rejected', () => {
  assert.throws(() => parseArgs(['--rating=good']), /Expected a file as the first argument/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log('\nAll tests passed.');
