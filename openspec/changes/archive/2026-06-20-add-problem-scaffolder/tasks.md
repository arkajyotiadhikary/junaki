## 1. Starter template

- [x] 1.1 Create a minimal coding-problem starter template (title/link header comment, exported stub function, `import.meta.url` self-run block) modeled on `leetcode/1_two_sum.example.ts`. Decided: kept **inline** in the script (a `leetcode/_template.ts` file would be picked up by `scanSolvedFiles` and miscounted as a solved problem).

## 2. Shared logic reuse

- [x] 2.1 Confirmed `nextProblemsRoundRobin`, `isItemDone`, and `indexPracticedFiles` are exported from `scripts/today.ts` and imported them into the new script (also reused `isWeekend`).
- [x] 2.2 Imported `slugifyTitle` from `scripts/curriculum-sources.ts` and `SOLUTION_ROOTS` from `scripts/solved-index.ts`.

## 3. Core script — `scripts/new-problem.ts`

- [x] 3.1 Added the script skeleton mirroring `new-design.ts`: `ROOT`, paths to `data/curriculum.json`, `data/practice.json`, `data/problems-meta.json`, a `usage()` helper, and an async `main()`.
- [x] 3.2 Implemented `fileSlug(raw)` whose `normalizeSlug` output matches the detector (unit-tested against the curriculum slug).
- [x] 3.3 Implemented path building: `<platform>/<slug>.ts`, optional `<number>_` prefix; `assertKnownPlatform` rejects unknown platforms (non-zero exit + valid list).
- [x] 3.4 Implemented bare mode: reads curriculum + practice, builds `practiced` via `indexPracticedFiles`, filters with `isItemDone`, picks via `nextProblemsRoundRobin` (1, or 2 on weekend). Single pick scaffolds directly using the item's verbatim slug and `item.source`.
- [x] 3.5 Implemented the chooser fallback: more than one pick (weekend) prints a numbered list and reads a selection from stdin; no unsolved problems → message + exit 0 without writing.
- [x] 3.6 Implemented free-form mode in `parseArgs`: all-digit second arg → LeetCode number prefix (slug from title); otherwise it's the slug.
- [x] 3.7 Writes the starter file from the inline template with title/link filled in; refuses to overwrite an existing file (non-zero exit, no metadata change) — guard copied from `new-design.ts`.
- [x] 3.8 Registers an idempotent `data/problems-meta.json` entry (title, difficulty, category, patterns, companies); leaves an existing entry unchanged.
- [x] 3.9 Prints the created path, an `/add-problem` enrichment reminder, and the `npm run practice -- <path> --rating=...` next step.

## 4. Wiring

- [x] 4.1 Added `"new": "tsx scripts/new-problem.ts"` to the `scripts` block in `package.json`.

## 5. Tests

- [x] 5.1 Added `scripts/new-problem.test.ts` covering slugify↔detector match, path building (with/without LC number, every platform), unknown-platform rejection, and arg parsing. (Overwrite refusal verified via a live CLI smoke test.)
- [x] 5.2 Added the test file to the `test` script in `package.json`; `npm test` passes.

## 6. Docs

- [x] 6.1 Documented `npm run new` in `README.md` — daily-loop mention plus two command-reference rows (bare and free-form).
