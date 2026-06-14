import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TEMPLATE = join(ROOT, 'behavioral', 'stories', '_template.md');
const META = join(ROOT, 'data', 'problems-meta.json');

function usage(): never {
  console.error('Usage: npm run story -- <slug> "<Story Title>"');
  console.error('Example: npm run story -- disagreed-mgr "Disagreed with my manager on retry strategy"');
  process.exit(1);
}

function main(): void {
  const args = process.argv.slice(2);
  const slug = args[0];
  const title = args.slice(1).join(' ').trim();
  if (!slug || !title) usage();

  const rel = `behavioral/stories/${slug}.md`;
  const dest = join(ROOT, rel);
  if (existsSync(dest)) {
    console.error(`File already exists: ${rel} (not overwriting).`);
    process.exit(1);
  }

  // Fill the template placeholders: the title (frontmatter + heading) and the
  // <slug> in the logging command hint.
  const filled = readFileSync(TEMPLATE, 'utf8')
    .replace(/<Story Title>/g, title)
    .replace(/<slug>/g, slug);
  writeFileSync(dest, filled);
  console.log(`Created ${rel}`);

  // Register metadata so the practice logger doesn't warn (idempotent).
  // Stats (generate-svg) only scans coding portals, so difficulty here is cosmetic.
  const meta = JSON.parse(readFileSync(META, 'utf8'));
  if (!meta.problems[rel]) {
    meta.problems[rel] = {
      title,
      difficulty: 'N/A',
      category: 'Behavioral',
      patterns: ['Behavioral'],
      companies: [],
    };
    writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');
    console.log(`Registered metadata: ${rel} [Behavioral]`);
  } else {
    console.log(`Metadata already present for ${rel}, left unchanged.`);
  }

  console.log(`\nNext: fill in STAR(L), then drill out loud and log with:`);
  console.log(`  npm run practice -- ${rel} --rating=<fail|hard|good|easy>`);
  console.log(`Then refresh the coverage matrix: npm run story:matrix`);
}

main();
