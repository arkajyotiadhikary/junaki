## Why

Starting a brand-new coding problem has no tooling. You either hand-create the solution file in the right folder with the right name, or ask an AI to — and the AI routinely gets the filename wrong (drops the slug shape, abbreviates the folder, invents a name). When the name is wrong, `npm run today` and the curriculum can't match the file to its problem, so the problem never shows as done and spaced-repetition never schedules it.

System-design problems and behavioral stories already have scaffolders (`npm run design`, `npm run story`). Coding problems — the most frequent thing you create — do not. This closes that gap.

## What Changes

- Add a `npm run new` script (`scripts/new-problem.ts`) that creates a starter solution file in the correct platform folder with a curriculum-matching slug.
- **Bare `npm run new`** scaffolds the problem `npm run today` would suggest, copying the slug verbatim from `data/curriculum.json` so detection is guaranteed. If today resolves to several picks (weekend) or none, it falls back to a numbered chooser.
- **`npm run new -- <platform> <slug-or-number> "<Title>"`** scaffolds any off-curriculum problem.
- LeetCode files omit the leading number by default (the slug alone matches); passing a number adds it as a `NNN_` prefix.
- The script drops a starter `.ts` file from a template, registers a metadata entry in `data/problems-meta.json` (idempotent, mirroring `new-design.ts`), refuses to overwrite an existing file, and prints the `npm run practice` next step.

## Capabilities

### New Capabilities
- `problem-scaffolder`: A CLI command that creates a correctly-named, correctly-located starter solution file for a coding problem — either from today's curriculum pick or from explicit arguments — and registers its metadata so the rest of the system detects it.

### Modified Capabilities
<!-- No existing spec's requirements change. today.ts detection is reused as-is, not modified. -->

## Impact

- **New file**: `scripts/new-problem.ts`.
- **New file**: a coding-problem starter template (e.g. `leetcode/_template.ts` or an inline template in the script).
- **`package.json`**: add `"new": "tsx scripts/new-problem.ts"` to scripts.
- **`data/problems-meta.json`**: gains entries as problems are scaffolded (same write path `new-design.ts` already uses).
- **Reuses** existing logic: curriculum loading and next-problem pick from `scripts/today.ts`, slug normalization from `scripts/curriculum-sources.ts`, the solution-folder list from `scripts/solved-index.ts`.
- **No behavior change** to `today.ts`, the scheduler, or stats.
- **README / docs**: mention the new command alongside `design` and `story`.
