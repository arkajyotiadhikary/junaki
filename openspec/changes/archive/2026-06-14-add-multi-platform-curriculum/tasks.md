## 1. Extract platform lists to data (do this FIRST — the skill is the only copy)

- [x] 1.1 Add a `source` field convention: define the unified item shape `{ slug, url, title, pattern, difficulty, phase, kind, source, note? }` and document allowed `source` values in `data/sources/README.md`.
- [x] 1.2 Extract LeetCode Top 150 from `.claude/skills/suggest-problem/SKILL.md` into `data/sources/leetcode-150.json` (150 problems, 23 topics), `source: "leetcode"`, slug/url from LeetCode number, `pattern` = topic header, phase by mapping (design D4).
- [x] 1.3 Extract GFG 160 into `data/sources/gfg-160.json` (160 problems, 19 topics), `source: "geeksforgeeks"`, slug from normalized title, `pattern` = topic header.
- [x] 1.4 Extract HackerRank Interview Prep Kit into `data/sources/hackerrank-ipk.json` (69 problems, 14 topics), `source: "hackerrank"`.
- [x] 1.5 Extract InterviewBit Programming into `data/sources/interviewbit.json` (203 problems, 16 topics), `source: "interviewbit"`.
- [x] 1.6 Write a one-shot verification check confirming each data file's problem count and titles match the skill's lists (582 total). This gate must pass before task 7.

## 2. AlgoFrog importer

- [x] 2.1 Create `scripts/import-algofrog.ts` and add `"import:algofrog": "tsx scripts/import-algofrog.ts"` to `package.json`.
- [x] 2.2 Read `data/sources/algofrog-export.json`; flatten topics → problems preserving topic display order then `order_num`; normalize layer names (`Found`→Foundation, `Combo`→Combination, `⚠️ Trap`→Trap) and difficulty (`Med`/`Medium`→Medium, `null`→Medium).
- [x] 2.3 Derive slug/url/source per row: LeetCode (`/problems/<slug>/`, `source: leetcode`), Codeforces (`cf-<id>`, `source: codeforces`), URL-less custom (`custom-<slug(title)>`, `source: custom`). Carry `key_insight` into `note`.
- [x] 2.4 Collapse AlgoFrog-internal duplicates (same problem in multiple topics) — first occurrence wins; collect collapsed ones for the report.
- [x] 2.5 Apply topic→phase mapping with overrides: advanced topics → P5, any Hard-layer problem → P5 (design D4).
- [x] 2.6 Write `data/sources/algofrog-curriculum.json` (all unique items, includes `note`). Ensure idempotent output (stable sort, no timestamps).

## 3. De-duplication + already-solved detection

- [x] 3.1 Build a "solved" index by scanning `leetcode/`, `geeksforgeeks/`, `hackerrank/`, `interviewbit/` folders — LeetCode by leading filename integer, others by normalized title.
- [x] 3.2 Build a "in curriculum" index from `data/curriculum.json` slugs.
- [x] 3.3 In the importer/assembly, skip items already solved or already in curriculum; never add a duplicate. (Enforced in `assemble-curriculum.ts`.)

## 4. Assemble the multi-platform curriculum + --merge

- [x] 4.1 Build the assembly step that reads all five source files and produces the combined item set with `source`, de-duplicated per platform (design D3). (`scripts/assemble-curriculum.ts`.)
- [x] 4.2 Implement `--merge`: fold imported problems into `data/curriculum.json`, keep phase boundaries, order AlgoFrog within its pattern group by AlgoFrog order. AlgoFrog merge includes only Foundation+Variants layers; the four platform lists merge in full. (160 → 922 items.)
- [x] 4.3 Strip `note` when writing to `curriculum.json` (paid content must not be committed). Make `--merge` idempotent (re-run adds zero items). (Verified: re-run byte-identical, 0 note/layer leaks.)
- [x] 4.4 Print the summary: total imported, new vs already-solved vs already-in-curriculum, distribution by difficulty / pattern / source, collapsed duplicates, and any rows whose URL could not be parsed.

## 5. Single picker in today.ts

- [x] 5.1 Update `scripts/today.ts` to walk each platform's curriculum items, find the first unsolved per platform, and rotate `leetcode → geeksforgeeks → hackerrank → interviewbit` (design D7). (`nextProblemsRoundRobin`, advances by solved count.)
- [x] 5.2 Confirm `today.ts` output matches what `suggest-problem` would have suggested for the same solved state. (Live output rotates LeetCode → GFG with platform tags; round-robin unit-tested.)

## 6. Stats + privacy + docs

- [x] 6.1 Update `scripts/generate-svg.ts` to count across all sources and show a per-`source` breakdown (treat missing `source` as leetcode). (New "CURRICULUM BY SOURCE" panel.)
- [x] 6.2 Add `data/sources/algofrog-curriculum.json` to `.gitignore`; confirm `git status` does not list it. (Also added a defensive ignore for a stray root-level `algofrog-export.json` copy.)
- [x] 6.3 Write `data/sources/README.md`: the browser-console export snippet, how to re-run `npm run import:algofrog`, and a note that AlgoFrog content is paid/private.

## 7. Retire suggest-problem (LAST — gated on task 1.6)

- [x] 7.1 Confirm task 1.6 verification passes and `today.ts` works end to end. (Gate passed before deletion.)
- [x] 7.2 Delete `.claude/skills/suggest-problem/`.
- [x] 7.3 Search the repo for references to `suggest-problem` and remove/redirect them (docs, settings, other skills). (README updated; extractor degrades gracefully; remaining mention is a historical design-doc example.)

## 8. Tests

- [x] 8.1 Add `scripts/import-algofrog.test.ts` covering: slug derivation per source, layer/difficulty normalization, internal de-dup, phase overrides, idempotent re-run, and `note` stripping on merge. (Plus `extract-lists.test.ts` and `assemble-curriculum.test.ts`.)
- [x] 8.2 Add a today.ts round-robin test (first-unsolved-per-platform rotation). Wire both into the `npm test` chain.
