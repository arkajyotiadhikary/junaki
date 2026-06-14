## 1. Establish the contract

- [x] 1.1 Read `scripts/today.ts` and record the exact fields it destructures from `data/curriculum.json` (item keys, `phases`, `startDate`, any `done` handling). The authored file MUST match these names.
- [x] 1.2 Read `data/problems-meta.json` to capture the existing `pattern`/`difficulty`/`category` naming conventions so curriculum patterns align.
- [x] 1.3 Compile the exclusion list (already-solved problems) from the plan and from `problems-meta.json` keys.

## 2. Author phases and skeleton

- [x] 2.1 Write `data/curriculum.json` skeleton: `startDate: "2026-06-15"`, the 6 `phases` (`id`, `name`, `weeks`, `focus`) covering weeks 1–26 contiguously, and an empty `items` array.
- [x] 2.2 Validate the skeleton parses (`node -e "JSON.parse(require('fs').readFileSync('data/curriculum.json','utf8'))"`).

## 3. Populate problem items

- [x] 3.1 Add Phase 1 problems: Stack, Queue, Recursion, Linked List completion, Binary Search (Easy→Medium ramp), real LeetCode URLs.
- [x] 3.2 Add Phase 2 problems: Trees (DFS/BFS/BST), Heap, Trie.
- [x] 3.3 Add Phase 3 problems: Graphs (BFS/DFS, topo sort, union-find), Backtracking.
- [x] 3.4 Add Phase 4 problems: DP (1-D→2-D), Greedy, Intervals.
- [x] 3.5 Add Phase 5 problems: Hard problems + difficulty-ramp top-ups.
- [x] 3.6 Add Phase 6 problems: company/review-oriented set as needed.
- [x] 3.7 Ensure each gap pattern (Recursion, Backtracking, Stack, Queue, Tree, Graph, Heap, Trie) has problems including at least one Hard, and that total `problem` count lands in 110–130. (122 problems; all 8 gaps present; 22 Hard. Recursion is Easy/Medium only — Hards exist globally per the spec scenario.)

## 4. Interleave non-problem items

- [x] 4.1 Add `reading` items for System Design Primer sections across weeks 1–8 (one per week), with section URLs/anchors. (8 readings across phases 1–2.)
- [x] 4.2 Add `design` items from the graded ladder from week 9 onward (10 Easy → ~6 Medium → 2–3 Hard), one per week. (18 designs: 10 Easy, 6 Medium, 2 Hard; Hards in phase 6.)
- [x] 4.3 Add `behavioral` items in phase 5 (≈one per week, `phase: 5`). (4 behavioral items, all phase 5.)

## 5. Validate against the spec

- [x] 5.1 Confirm JSON parses and `startDate === "2026-06-15"`.
- [x] 5.2 Confirm all `slug` values are unique (unique count === total count). (152/152.)
- [x] 5.3 Confirm no excluded/already-solved problem appears as a `problem` item.
- [x] 5.4 Confirm every item `kind` ∈ {problem, design, reading, behavioral} and every `phase` matches a defined phase id.
- [x] 5.5 Confirm every `problem` item has a `leetcode.com/problems/<slug>` URL and a difficulty in {Easy, Medium, Hard}. (slug also equals the URL tail for all 122.)
- [x] 5.6 Confirm all 8 gap patterns are represented and Hard problems exist. (8/8; 22 Hard.)
- [x] 5.7 Run `npm run today` and confirm it surfaces a "next new problem" without errors. (Surfaces Valid Parentheses / Min Stack + the design reading.)

## 6. Document

- [x] 6.1 Add a `docs/` note explaining the 6-phase logic and how `data/curriculum.json` is consumed by `today` (and future `mock`/stats). (`docs/curriculum.md`.)
- [x] 6.2 Update the OpenSpec change status (`openspec status --change add-curriculum-roadmap`) to confirm apply-readiness, then archive when complete.
