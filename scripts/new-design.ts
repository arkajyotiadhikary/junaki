import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TEMPLATE = join(ROOT, 'systemdesign', '_template.md');
const META = join(ROOT, 'data', 'problems-meta.json');

function usage(): never {
  console.error('Usage: npm run design -- <slug> "<Problem Title>"');
  console.error('Example: npm run design -- tinyurl "TinyURL / URL Shortener"');
  process.exit(1);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function main(): void {
  const args = process.argv.slice(2);
  const slug = args[0];
  const title = args.slice(1).join(' ').trim();
  if (!slug || !title) usage();

  const rel = `systemdesign/${slug}.md`;
  const dest = join(ROOT, rel);
  if (existsSync(dest)) {
    console.error(`File already exists: ${rel} (not overwriting).`);
    process.exit(1);
  }

  // Fill the template frontmatter placeholders.
  const filled = readFileSync(TEMPLATE, 'utf8')
    .replace(/<Problem Title>/g, title)
    .replace('<YYYY-MM-DD>', today());
  writeFileSync(dest, filled);
  console.log(`Created ${rel}`);

  // Register metadata so the practice logger doesn't warn (idempotent).
  const meta = JSON.parse(readFileSync(META, 'utf8'));
  if (!meta.problems[rel]) {
    meta.problems[rel] = {
      title,
      difficulty: 'Medium',
      category: 'System Design',
      patterns: ['System Design'],
      companies: [],
    };
    writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');
    console.log(`Registered metadata: ${rel} [System Design]`);
  } else {
    console.log(`Metadata already present for ${rel}, left unchanged.`);
  }

  console.log(`\nNext: solve it (45-min timebox), then log with:`);
  console.log(`  npm run practice -- ${rel} --rating=<fail|hard|good|easy>`);
}

main();
