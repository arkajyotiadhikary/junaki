import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import {
  nextProblemsRoundRobin,
  isItemDone,
  indexPracticedFiles,
  isWeekend,
  type CurriculumItem,
  type Curriculum,
} from './today';
import { slugifyTitle } from './curriculum-sources';
import { SOLUTION_ROOTS } from './solved-index';

const ROOT = process.cwd();
const CURRICULUM = join(ROOT, 'data', 'curriculum.json');
const PRACTICE = join(ROOT, 'data', 'practice.json');
const META = join(ROOT, 'data', 'problems-meta.json');

/** Folders the solution scanner actually reads — the only detection-safe roots. */
const VALID_PLATFORMS = SOLUTION_ROOTS;

// --- pure helpers (unit-tested in new-problem.test.ts) -----------------------

/**
 * Filename-safe slug: lowercase, every run of non-alphanumerics becomes a single
 * underscore, trimmed. Detection (`normalizeSlug`) strips separators entirely, so
 * `valid-parentheses`, `valid_parentheses`, and `Valid Parentheses` all match.
 * Underscores match the existing `leetcode/1_two_sum.ts` convention.
 */
export function fileSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** Reject any platform that isn't a scanned solution root. */
export function assertKnownPlatform(platform: string): void {
  if (!VALID_PLATFORMS.includes(platform)) {
    throw new Error(
      `Unknown platform "${platform}". Valid platforms: ${VALID_PLATFORMS.join(', ')}.`,
    );
  }
}

/** Repo-relative solution path, with an optional `<number>_` prefix. */
export function buildPath(platform: string, slug: string, num?: string): string {
  const prefix = num ? `${num}_` : '';
  return `${platform}/${prefix}${slug}.ts`;
}

export interface ParsedArgs {
  mode: 'bare' | 'freeform';
  platform?: string;
  slug?: string;
  num?: string;
  title?: string;
}

/**
 * No args → bare mode (scaffold today's curriculum pick). Otherwise free-form:
 * `<platform> <slug-or-number> "<Title>"`. A purely numeric second arg is a
 * LeetCode number (slug then comes from the title); anything else is the slug.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) return { mode: 'bare' };

  const platform = argv[0];
  const second = argv[1];
  const rest = argv.slice(2).join(' ').trim();

  if (!second) {
    throw new Error('Free-form usage needs a slug or number and a title.');
  }

  if (/^\d+$/.test(second)) {
    if (!rest) throw new Error('A numbered problem needs a title, e.g. 704 "Binary Search".');
    return { mode: 'freeform', platform, num: second, slug: fileSlug(slugifyTitle(rest)), title: rest };
  }

  const title = rest || second;
  return { mode: 'freeform', platform, slug: fileSlug(second), title };
}

// --- I/O shell ---------------------------------------------------------------

function usage(): never {
  console.error('Usage:');
  console.error('  npm run new                                  # scaffold today\'s curriculum pick');
  console.error('  npm run new -- <platform> <slug-or-num> "<Title>"   # off-curriculum problem');
  console.error('');
  console.error('Examples:');
  console.error('  npm run new -- leetcode 704 "Binary Search"');
  console.error('  npm run new -- geeksforgeeks kadanes-algorithm "Kadane\'s Algorithm"');
  console.error(`  platforms: ${VALID_PLATFORMS.join(', ')}`);
  process.exit(1);
}

function loadJSON<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

const STARTER_TEMPLATE = (title: string, link: string) => `// ${title} — ${link}
//
// TODO: solve it from scratch (timebox it). Then enrich metadata with the
// add-problem skill, and log with \`npm run practice\`.

/**
 * TODO: describe the approach and its time/space complexity.
 */
export function solve(): void {
  throw new Error('not implemented');
}

// quick sanity check when run directly: \`tsx ${'${this file}'}\`
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  // console.log(solve());
}
`;

interface MetaEntry {
  title: string;
  difficulty: string;
  category: string;
  patterns: string[];
  companies: string[];
}

/** Write the starter file (refusing to overwrite) and register idempotent metadata. */
function scaffold(rel: string, link: string, entry: MetaEntry): void {
  const dest = join(ROOT, rel);
  if (existsSync(dest)) {
    console.error(`File already exists: ${rel} (not overwriting).`);
    process.exit(1);
  }

  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, STARTER_TEMPLATE(entry.title, link));
  console.log(`Created ${rel}`);

  const meta = loadJSON<{ problems: Record<string, MetaEntry> }>(META, { problems: {} });
  if (!meta.problems[rel]) {
    meta.problems[rel] = entry;
    writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');
    console.log(`Registered metadata: ${rel} [${entry.category}]`);
  } else {
    console.log(`Metadata already present for ${rel}, left unchanged.`);
  }

  console.log(`\nNext: enrich metadata once solved →  /add-problem ${rel}`);
  console.log(`Then log it →  npm run practice -- ${rel} --rating=<fail|hard|good|easy>`);
}

/** Curriculum item → its platform (items written before `source` are leetcode). */
function platformOf(item: CurriculumItem): string {
  return item.source ?? 'leetcode';
}

/** Scaffold a single curriculum item, copying its slug verbatim. */
function scaffoldItem(item: CurriculumItem): void {
  const platform = platformOf(item);
  if (!VALID_PLATFORMS.includes(platform)) {
    console.error(
      `Heads up: "${platform}" is not a scanned solution root (${VALID_PLATFORMS.join(', ')}).`,
    );
    console.error('Creating the file anyway, but `npm run today` will not detect it as done yet.');
  }
  const rel = buildPath(platform, fileSlug(item.slug));
  scaffold(rel, item.url ?? platform, {
    title: item.title ?? item.slug,
    difficulty: item.difficulty ?? 'Medium',
    category: item.pattern ?? 'Unknown',
    patterns: item.pattern ? [item.pattern] : [],
    companies: [],
  });
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

/** Show the picks, read a 1-based selection, scaffold the chosen one. */
async function chooseAndScaffold(picks: CurriculumItem[]): Promise<void> {
  console.log('Next unsolved problems:');
  picks.forEach((it, i) => {
    const tag = it.source && it.source !== 'leetcode' ? ` [${it.source}]` : '';
    const meta = [it.difficulty, it.pattern].filter(Boolean).join(' · ');
    console.log(`  ${i + 1}. ${it.title ?? it.slug}${tag}  ${meta}`);
  });
  const answer = (await ask('Pick a number: ')).trim();
  const idx = Number.parseInt(answer, 10) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= picks.length) {
    console.error('No valid choice — nothing created.');
    process.exit(1);
  }
  scaffoldItem(picks[idx]);
}

async function bareMode(): Promise<void> {
  const curriculum = loadJSON<Curriculum | null>(CURRICULUM, null);
  if (!curriculum) {
    console.error('data/curriculum.json not found — generate the roadmap first, or use free-form args.');
    process.exit(1);
  }
  const practice = loadJSON<{ entries?: Array<{ file: string }> }>(PRACTICE, {}).entries ?? [];
  const practiced = indexPracticedFiles(new Set(practice.map((e) => e.file)));

  const problems = curriculum.items.filter((it) => it.kind === 'problem');
  const pending = problems.filter((it) => !isItemDone(it, practiced));
  if (pending.length === 0) {
    console.log('No unsolved problems left in the curriculum. 🎉');
    process.exit(0);
  }

  const count = isWeekend(new Date()) ? 2 : 1;
  const doneCount = problems.length - pending.length;
  const picks = nextProblemsRoundRobin(pending, count, doneCount);

  if (picks.length === 1) {
    scaffoldItem(picks[0]);
  } else {
    await chooseAndScaffold(picks);
  }
}

function freeformMode(args: ParsedArgs): void {
  assertKnownPlatform(args.platform!);
  const rel = buildPath(args.platform!, args.slug!, args.num);
  const link =
    args.platform === 'leetcode'
      ? `https://leetcode.com/problems/${slugifyTitle(args.title!)}/`
      : args.platform!;
  scaffold(rel, link, {
    title: args.title!,
    difficulty: 'Medium',
    category: 'Unknown',
    patterns: [],
    companies: [],
  });
}

async function main(): Promise<void> {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    usage();
  }
  if (parsed.mode === 'bare') {
    await bareMode();
  } else {
    try {
      freeformMode(parsed);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      usage();
    }
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
