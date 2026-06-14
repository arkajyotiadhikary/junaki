/**
 * Load the demo so a fresh clone shows the tool working.
 *
 * Copies the shipped `data/*.example.json` files to their live names
 * (practice.json, schedule.json, problems-meta.json) so `npm run today` has
 * something to show. Existing live files are left alone — seed never clobbers
 * real practice data.
 *
 * Run:   npm run seed
 * Undo:  npm run reset   (clears the demo and gives you a clean slate)
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DATA = join(ROOT, 'data');

// example file -> live file
const SEEDS: Array<[string, string]> = [
  ['practice.example.json', 'practice.json'],
  ['schedule.example.json', 'schedule.json'],
  ['problems-meta.example.json', 'problems-meta.json'],
];

function main(): void {
  let copied = 0;
  let skipped = 0;

  for (const [example, live] of SEEDS) {
    const src = join(DATA, example);
    const dest = join(DATA, live);
    if (!existsSync(src)) {
      console.error(`  ! missing ${example} — skipping`);
      continue;
    }
    if (existsSync(dest)) {
      console.log(`  · data/${live} already exists — left as is`);
      skipped++;
      continue;
    }
    copyFileSync(src, dest);
    console.log(`  ✓ data/${live}  (from ${example})`);
    copied++;
  }

  console.log(`\nSeeded ${copied} file(s)${skipped ? `, skipped ${skipped}` : ''}.`);
  console.log('Now run:  npm run today');
  console.log('When ready for your own practice:  npm run reset');
}

main();

// (sync test — this comment was added in the public repo and pulled into personal)
