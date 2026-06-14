## Why

The repo has two conflicting "sources of truth" for what to practice. `data/curriculum.json` is LeetCode-only (122 LeetCode problems + reading links). But the `suggest-problem` skill privately holds four full ordered lists — LeetCode Top 150, GFG 160, HackerRank Interview Prep Kit, InterviewBit — and round-robins across them. Those GFG / HackerRank / InterviewBit problems never made it into the curriculum data, so stats, `today.ts`, and the curriculum can't see them. On top of that, a paid AlgoFrog export (1311 rows, ~688 new LeetCode problems plus Codeforces and custom drills) sits unused in `data/sources/`.

We want one curriculum that covers every platform a company might test on (LeetCode, GeeksforGeeks, HackerRank, InterviewBit, plus AlgoFrog's extras), driven by data files — and exactly one way to pick the next problem.

## What Changes

- **Extract the four hardcoded lists** out of `.claude/skills/suggest-problem/SKILL.md` into versioned data files under `data/sources/`: `leetcode-150.json` (150), `gfg-160.json` (160), `hackerrank-ipk.json` (69), `interviewbit.json` (203).
- **Add an AlgoFrog importer** (`scripts/import-algofrog.ts`, `npm run import:algofrog`) that flattens `data/sources/algofrog-export.json` into the standard item shape, tags each item with `source` (`leetcode` / `codeforces` / `custom`), de-duplicates, and writes a parallel `data/sources/algofrog-curriculum.json`. A `--merge` flag folds AlgoFrog's Foundation+Variants layers into the main curriculum.
- **Extend the curriculum item shape** with a `source` field. Existing items (no `source`) are treated as `leetcode`. Optional `note` carries AlgoFrog `key_insight` in the parallel file only.
- **Build one importer/merge step** that combines all five sources into `data/curriculum.json`, de-duplicating per platform and mapping topics onto the existing 6 phases (advanced topics and any "Hard" layer → Phase 5).
- **Move the LC → GFG → HR → IB round-robin** from the skill into `today.ts`, so "next problem" rotates across platforms from data.
- **BREAKING**: Remove the `suggest-problem` skill — but only after the four lists are extracted to data and verified, so no list is lost.
- **Keep paid content private**: `key_insight` notes stay in the gitignored parallel file and are dropped from the committed `curriculum.json` merge. Add the generated AlgoFrog file to `.gitignore`. Document refresh + re-run steps in `data/sources/README.md`.

## Capabilities

### New Capabilities
- `multi-platform-curriculum`: A data-driven curriculum assembled from multiple platform source files (LeetCode, GFG, HackerRank, InterviewBit, AlgoFrog). Defines the unified item shape with `source`, the per-platform de-duplication and "already solved" rules, the topic→phase mapping, the AlgoFrog import + merge behavior, and the single round-robin next-problem picker in `today.ts`. Replaces the `suggest-problem` skill as the one source of truth.

### Modified Capabilities
- `stats-dashboard`: Stats now count problems across all platforms and by `source`, not LeetCode-only. Per-source / per-platform progress becomes visible.

## Impact

- **New data**: `data/sources/{leetcode-150,gfg-160,hackerrank-ipk,interviewbit,algofrog-curriculum}.json`, `data/sources/README.md`.
- **Changed data**: `data/curriculum.json` gains `source` on every item and many new multi-platform items.
- **New code**: `scripts/import-algofrog.ts` (+ source extractors), `package.json` script `import:algofrog`.
- **Changed code**: `scripts/today.ts` (round-robin picker), `scripts/generate-svg.ts` (per-source stats).
- **Removed**: `.claude/skills/suggest-problem/` (gated on extraction + verification).
- **Config**: `.gitignore` adds `data/sources/algofrog-curriculum.json` (paid content).
- **De-dup keys**: LeetCode by number; GFG/HR/IB by (platform + title); "already solved" scans `leetcode/`, `geeksforgeeks/`, `hackerrank/`, `interviewbit/` solution folders.
