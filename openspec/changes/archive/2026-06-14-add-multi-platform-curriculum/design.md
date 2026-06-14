## Context

Today there are two disconnected pictures of "what to practice":

- `data/curriculum.json` — a hand-built 26-week roadmap, **LeetCode-only** (122 LeetCode problems + 26 GitHub reading links + a few design/behavioral items), 160 items across 6 phases. Item shape: `{ slug, url, title, pattern, difficulty, phase, kind }`.
- `.claude/skills/suggest-problem/SKILL.md` — privately holds **four full ordered lists** and round-robins across them:
  - LeetCode Top 150 — 150 problems, 23 topics
  - GFG 160 — 160 problems, 19 topics
  - HackerRank Interview Prep Kit — 69 problems, 14 topics
  - InterviewBit Programming — 203 problems, 16 topics

A paid **AlgoFrog** export sits unused at `data/sources/algofrog-export.json`: 43 topics, **1311 rows → ~804 unique LeetCode problems** (98 already in curriculum, 18 already solved → ~688 new), plus **30 Codeforces** and **138 custom/USACO** drills. AlgoFrog rows carry `key_insight` and `topic_content` — **paid study content** that must not be committed to git.

Solved work is genuinely multi-platform: `problems-meta.json` keys are file paths like `leetcode/167_two_sum_ii.ts`, `geeksforgeeks/...`, `hackerrank/...`, `interviewbit/...` (26 / 12 / 4 / 2 files).

Constraints: TypeScript, run with `tsx`, **strict mode, no new dependencies**. Output must be idempotent.

## Goals / Non-Goals

**Goals:**
- One data-driven curriculum spanning LeetCode, GFG, HackerRank, InterviewBit, and AlgoFrog (LC + Codeforces + custom).
- One way to pick the next problem (`today.ts` round-robin), replacing the `suggest-problem` skill.
- Idempotent importer: re-running never duplicates.
- Keep paid AlgoFrog text out of git.

**Non-Goals:**
- Re-pacing the 26-week schedule. The plan becomes a larger rotation pool; exact week-by-week pacing is out of scope.
- Cross-platform duplicate detection by problem meaning (e.g. LeetCode "Two Sum" vs InterviewBit "2 Sum" are kept as separate items — you may solve each on its own judge).
- Touching `add-problem` / `review-problem` skills (separate review, not part of this change).

## Decisions

### D1 — Unified item shape adds `source`
```jsonc
{ "slug", "url", "title", "pattern", "difficulty", "phase",
  "kind": "problem",
  "source": "leetcode" | "geeksforgeeks" | "hackerrank" | "interviewbit" | "codeforces" | "custom",
  "note?": "<algofrog key_insight — parallel file only>" }
```
`source` is the **platform you solve on**, not the list it came from. Items already in `curriculum.json` have no `source` → read as `leetcode` (backward compatible). *Alternative considered:* a separate `lists`/provenance array. Deferred — not needed for the picker or stats.

### D2 — One source file per platform
Each list becomes a versioned JSON file under `data/sources/`:
`leetcode-150.json`, `gfg-160.json`, `hackerrank-ipk.json`, `interviewbit.json`, `algofrog-curriculum.json` (generated). All share the unified item shape. The importer reads these and assembles `curriculum.json`. *Alternative:* keep lists in code — rejected, that is the current problem (two sources of truth).

### D3 — De-duplication keys differ by platform
- **LeetCode** items keyed by `lc_number` (fallback: slug).
- **GFG / HackerRank / InterviewBit** keyed by `(platform + normalized-title)` — these have no LeetCode number.
- **Codeforces** keyed by CF id from URL (`cf-295a`); **custom** keyed by `custom-<slug(title)>`.
- **"Already solved"** = scan the four solution folders. LeetCode matched by the leading integer in the filename; GFG/HR/IB matched by normalized title against the filename. Cross-platform repeats are NOT merged (see Non-Goals).
- **Within AlgoFrog** the same problem appears under several topics → **first occurrence wins** (earliest topic order, then `order_num`); later copies collapsed and reported.

### D4 — Topic → phase mapping with two overrides
Each list's topics map to one of the 6 existing phases. Rule order:
1. **Advanced AlgoFrog topic → Phase 5** (Segment Tree, Fenwick, KMP, Sieve, LIS n·log n, Advanced Graphs, Partition / Game Theory / Digit / DAGs / Combinatorial / DS-Optimized / Profile DP).
2. **Any "Hard" layer problem → Phase 5** (AlgoFrog only; layer names normalized: `Found`→Foundation, `Combo`→Combination, `⚠️ Trap`→Trap).
3. Otherwise the topic table:

```
P1 Foundations   Two Pointer, HashMap, Binary Search, Sliding Window,
                 Kadane, Prefix Sums, Monotonic Stack  (+ Array/String/Stack/
                 Queue/Linked List/Recursion topics from the other lists)
P2 Trees & Heaps Trees, Trie, Top K / Heap
P3 Graphs+Backtk Backtracking, Graph Fundamentals, BFS, DFS, Multi-Source BFS,
                 Bipartite, Topo Sort, Dijkstra, Floyd, Bellman, Union Find
P4 DP/Greedy/Int Greedy, Intervals, 1D DP, 2D Grid DP, Knapsack,
                 Strings&Subseq, State Machine DP, Interval DP, Tree DP
                 (+ Math / Bit Manipulation from other lists)
P5 Hard & Mocks  advanced topics + any Hard-layer problem
P6 Review        left empty (spaced-rep of solved work)
```
`pattern` is taken from the source topic name (AlgoFrog `nav_label`; the list's topic header for the others).

### D5 — `--merge` scope: Foundation + Variants only (AlgoFrog)
The four platform lists merge **in full** (they are already curated, mostly Easy/Medium). For **AlgoFrog**, `--merge` folds in only the `Foundation` and `Variants` layers (skips Combo / Hard / Trap), trimming ~688 new to ~250. The full set still lives in `algofrog-curriculum.json`. Within a phase, AlgoFrog problems slot into their pattern group in AlgoFrog order. *Result:* ~582 (four lists) + ~250 (AlgoFrog) ≈ **800+ curriculum items** — intentional, a rotation pool not a strict schedule.

### D6 — Difficulty normalization
`Med`/`Medium`→`Medium`, `Easy`→`Easy`, `Hard`→`Hard`, `null`→`Medium` (flagged in summary).

### D7 — Round-robin moves into `today.ts`
The `LC → GFG → HR → IB` rotation (plus AlgoFrog) becomes a data-driven picker in `today.ts`: walk each platform's items in curriculum order, find the first unsolved per platform, then rotate. This is the single picker after `suggest-problem` is removed.

### D8 — Paid content stays out of git
`key_insight`→`note` is kept ONLY in `data/sources/algofrog-curriculum.json`, which is **gitignored** (like the export). The `--merge` into the committed `curriculum.json` **drops `note`**. `topic_content` is never written to a tracked file.

## Risks / Trade-offs

- **Curriculum balloons to ~800 items** → 26-week pacing is no longer literal. *Mitigation:* phases stay as ordering buckets; `today.ts` rotation paces actual daily work; AlgoFrog trimmed to Foundation+Variants.
- **Deleting `suggest-problem` before extraction = permanent list loss** → *Mitigation:* deletion is the LAST task, gated on a verification step that confirms every problem from the skill exists in the data files.
- **Title-based de-dup for GFG/HR/IB is fuzzy** (punctuation, wording) → *Mitigation:* normalize aggressively (lowercase, strip non-alphanumerics); report near-misses in the summary instead of silently merging.
- **168 non-LeetCode AlgoFrog rows don't fit a LeetCode-slug repo** → *Mitigation:* tag `source`, give custom drills `custom-<slug>` placeholders; nothing silently dropped, all reported.
- **Accidental commit of paid content** → *Mitigation:* gitignore the generated file; merge strips `note`; verify with `git status` in the README workflow.

## Migration Plan

1. Extract the 4 lists from `suggest-problem` → `data/sources/*.json` (one file per platform).
2. Build the AlgoFrog importer → `data/sources/algofrog-curriculum.json`; add `--merge`.
3. Build the assembly step that merges all 5 sources into `data/curriculum.json` (adds `source`, de-dups, maps phases).
4. Update `today.ts` to round-robin from the data; update `generate-svg.ts` for per-source stats.
5. Add gitignore entry + `data/sources/README.md`.
6. **Verification gate**: confirm every problem from the skill exists in the data files and `today.ts` still suggests correctly.
7. **Only then** delete `.claude/skills/suggest-problem/`.

Rollback: the change is additive until step 7; reverting the commit restores the skill and the LeetCode-only curriculum.

## Open Questions

- Phase mapping for a few ambiguous topics (e.g. InterviewBit "Math", HackerRank "Warm-up", "Miscellaneous") — default to P1 unless a clearer pattern fits. To finalize during implementation.
- Should `today.ts` rotation be strict round-robin or weighted (e.g. favor LeetCode)? Default: strict, matching the old skill.
