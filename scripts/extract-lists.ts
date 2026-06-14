/**
 * One-shot extractor: pulls the four ordered problem lists out of the
 * `suggest-problem` skill markdown into versioned data files under
 * `data/sources/`. The skill is currently the ONLY copy of the GFG / HackerRank
 * / InterviewBit lists, so this must run (and verify) before the skill is
 * deleted.
 *
 *   npm run extract:lists            # parse skill → write data/sources/*.json
 *   npm run extract:lists -- --verify  # re-parse and assert every problem landed
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type Platform,
  type SourceItem,
  slugifyTitle,
  leetcodeUrl,
  phaseForTopic,
} from './curriculum-sources';

const ROOT = process.cwd();
const SKILL = join(ROOT, '.claude', 'skills', 'suggest-problem', 'SKILL.md');
const SOURCES = join(ROOT, 'data', 'sources');

interface ListDef {
  /** substring that identifies this list's `###` section header */
  header: string;
  source: Platform;
  file: string;
  expected: number;
}

const LISTS: ListDef[] = [
  { header: 'LeetCode', source: 'leetcode', file: 'leetcode-150.json', expected: 150 },
  { header: 'GFG', source: 'geeksforgeeks', file: 'gfg-160.json', expected: 160 },
  { header: 'HackerRank', source: 'hackerrank', file: 'hackerrank-ipk.json', expected: 69 },
  { header: 'InterviewBit', source: 'interviewbit', file: 'interviewbit.json', expected: 203 },
];

// --- pure parsing ------------------------------------------------------------

/** Clean a topic header into a `pattern` label: drop "(Days 1–13)" style notes. */
export function cleanTopic(raw: string): string {
  return raw.replace(/\(Days[^)]*\)/i, '').replace(/\s+/g, ' ').trim();
}

/**
 * Split the skill markdown into its `###` sections and return the body text for
 * the section whose header contains `headerKey`.
 */
export function sectionFor(markdown: string, headerKey: string): string {
  const chunks = markdown.split(/^### /m);
  const hit = chunks.find((c) => c.split('\n')[0].includes(headerKey));
  return hit ?? '';
}

/**
 * Parse one list section into ordered items. Topic headers look like
 * `**Topic 1 — Array / String**`; problems are numbered lines `1. Title`. For
 * LeetCode a trailing `(#88)` is the problem number → real slug/url.
 */
export function parseSection(section: string, source: Platform): SourceItem[] {
  const items: SourceItem[] = [];
  let topic = '';
  for (const line of section.split('\n')) {
    const topicMatch = line.match(/^\*\*Topic\s+\d+\s*[—–-]\s*(.+?)\*\*/);
    if (topicMatch) {
      topic = cleanTopic(topicMatch[1]);
      continue;
    }
    const itemMatch = line.match(/^\s*\d+\.\s+(.*\S)\s*$/);
    if (!itemMatch || !topic) continue;

    // Strip a trailing "(#88)" problem number wherever it appears (LeetCode list
    // carries them; the others don't, so this is a harmless no-op there).
    const title = itemMatch[1].replace(/\s*\(#\d+\)\s*$/, '').trim();
    const slug = slugifyTitle(title);
    const url = source === 'leetcode' ? leetcodeUrl(slug) : undefined;

    items.push({
      slug,
      url,
      title,
      pattern: topic,
      phase: phaseForTopic(topic),
      kind: 'problem',
      source,
    });
  }
  return items;
}

// --- I/O shell ---------------------------------------------------------------

function writeList(def: ListDef, items: SourceItem[]): void {
  const out = {
    $schema: `Extracted from suggest-problem skill. ${def.source} ordered study list; consumed by the multi-platform curriculum importer.`,
    source: def.source,
    count: items.length,
    items,
  };
  writeFileSync(join(SOURCES, def.file), JSON.stringify(out, null, 2) + '\n', 'utf8');
}

function extractAll(markdown: string): { def: ListDef; items: SourceItem[] }[] {
  return LISTS.map((def) => ({
    def,
    items: parseSection(sectionFor(markdown, def.header), def.source),
  }));
}

function run(): void {
  if (!existsSync(SKILL)) {
    console.log(
      'suggest-problem skill not found — it was retired after extraction.\n' +
        'The four data/sources/*.json files are now the source of truth.\n' +
        'To re-extract, restore the skill from git history first.',
    );
    return;
  }
  const markdown = readFileSync(SKILL, 'utf8');
  const results = extractAll(markdown);
  for (const { def, items } of results) {
    writeList(def, items);
    const flag = items.length === def.expected ? '✓' : '⚠';
    console.log(`${flag} ${def.file.padEnd(20)} ${items.length}/${def.expected} problems → ${def.source}`);
  }
  console.log(`\nWrote ${results.length} list files to data/sources/`);
}

/**
 * Verification gate (task 1.6): re-parse the skill and confirm each written file
 * holds exactly the parsed problems. Exits non-zero on any mismatch so the
 * skill is never deleted with coverage missing.
 */
function verify(): void {
  if (!existsSync(SKILL)) {
    console.error('✗ suggest-problem skill not found — cannot verify extraction.');
    process.exit(1);
  }
  const markdown = readFileSync(SKILL, 'utf8');
  let ok = true;
  for (const def of LISTS) {
    const parsed = parseSection(sectionFor(markdown, def.header), def.source);
    const path = join(SOURCES, def.file);
    if (!existsSync(path)) {
      console.error(`✗ ${def.file} missing`);
      ok = false;
      continue;
    }
    const onDisk = JSON.parse(readFileSync(path, 'utf8')).items as SourceItem[];
    const parsedTitles = new Set(parsed.map((p) => p.title));
    const diskTitles = new Set(onDisk.map((p) => p.title));
    const missing = [...parsedTitles].filter((t) => !diskTitles.has(t));
    const countOk = parsed.length === def.expected && onDisk.length === parsed.length;
    if (countOk && missing.length === 0) {
      console.log(`✓ ${def.file.padEnd(20)} ${onDisk.length} problems verified`);
    } else {
      ok = false;
      console.error(`✗ ${def.file}: parsed ${parsed.length}, on-disk ${onDisk.length}, expected ${def.expected}, missing ${missing.length}`);
      for (const m of missing.slice(0, 5)) console.error(`    missing: ${m}`);
    }
  }
  if (!ok) {
    console.error('\nExtraction verification FAILED — do not delete the skill.');
    process.exit(1);
  }
  console.log('\nAll lists verified — safe to retire suggest-problem.');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  if (process.argv.includes('--verify')) verify();
  else run();
}
