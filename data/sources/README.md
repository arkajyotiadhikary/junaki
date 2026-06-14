# Curriculum sources

This folder holds the raw problem lists that feed `data/curriculum.json`. Each
file is one *source* — a study list from a platform. An importer combines them
into the single curriculum that `today.ts` and the stats dashboard read.

## Unified item shape

Every problem, in every source file and in `curriculum.json`, uses this shape:

```jsonc
{
  "slug": "two-sum",                 // LeetCode-style kebab slug
  "url": "https://leetcode.com/...", // optional (omitted when no stable link)
  "title": "Two Sum",
  "pattern": "HashMap",              // the source topic name
  "difficulty": "Easy",              // optional: Easy | Medium | Hard
  "phase": 1,                         // 1..6 curriculum phase
  "kind": "problem",
  "source": "leetcode",              // platform you solve on (see below)
  "note": "..."                       // optional; AlgoFrog key_insight (paid — gitignored files only)
}
```

`source` is the platform you actually solve the problem on, **not** the list it
came from. Allowed values:

| `source`        | Platform        |
|-----------------|-----------------|
| `leetcode`      | LeetCode        |
| `geeksforgeeks` | GeeksforGeeks   |
| `hackerrank`    | HackerRank      |
| `interviewbit`  | InterviewBit    |
| `codeforces`    | Codeforces      |
| `custom`        | No online link (custom / USACO-style drills) |

Items in `curriculum.json` written before this system have no `source` field —
tooling treats those as `leetcode`.

## The four platform lists

These were extracted out of the old `suggest-problem` skill (which used to hold
them hard-coded) into versioned data. **That skill has since been retired** —
these files are now the source of truth, and `today.ts` is the single
next-problem picker.

| File                   | Source          | Problems |
|------------------------|-----------------|----------|
| `leetcode-150.json`    | LeetCode Top 150| 150      |
| `gfg-160.json`         | GeeksforGeeks   | 160      |
| `hackerrank-ipk.json`  | HackerRank IPK  | 69       |
| `interviewbit.json`    | InterviewBit    | 203      |

These files were produced by `scripts/extract-lists.ts` (`npm run extract:lists`)
while the skill still existed. The skill is now gone, so re-running the extractor
is a no-op unless you restore `.claude/skills/suggest-problem/` from git history.
Edit the JSON files directly to change a list.

## AlgoFrog (paid — kept private)

`algofrog-export.json` and the generated `algofrog-curriculum.json` are **paid
study material** and are gitignored (along with any stray root-level
`algofrog-export.json`). The `key_insight` text rides along as `note` only in
those ignored files — it is never written into the committed `curriculum.json`.

### 1. Refresh the export

Open AlgoFrog in Chrome while logged in, open DevTools → Console, then paste and
run the snippet in `extract-snippet.js` (open it, Select All, copy, paste, Enter).
It downloads `algofrog-export.json`. Move that file into this folder
(`data/sources/`), replacing the old one.

### 2. Re-run the importer

```bash
npm run import:algofrog          # writes data/sources/algofrog-curriculum.json (the parallel study file)
npm run import:algofrog -- --merge  # ALSO folds new problems into data/curriculum.json
```

- Without `--merge`: only the gitignored parallel file is (re)generated.
- With `--merge`: the four platform lists merge in full and AlgoFrog's
  **Foundation + Variants** layers fold into `curriculum.json`. Already-solved
  and already-listed problems are skipped, and `note` is stripped. Both are
  idempotent — re-running adds nothing new.

### 3. Sanity check privacy

```bash
git status   # algofrog-export.json and algofrog-curriculum.json must NOT appear
```
