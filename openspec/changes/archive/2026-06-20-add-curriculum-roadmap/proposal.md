## Why

The `today` daily driver and the planned `mock` mode both need an ordered list of "what to learn next," but no such data exists — `today` currently has no source for the "next new problem." The repo has solved 43 problems (28 Easy / 15 Medium / **0 Hard**) and has **zero** problems in 8 core MAANG patterns (Recursion, Backtracking, Stack, Queue, Tree DFS/BFS, Graph DFS/BFS, Heap, Trie). A precomputed 26-week roadmap removes all daily planning: the system can answer "what do I do today?" by reading the first uncompleted entry.

## What Changes

- Add `data/curriculum.json`: a 26-week roadmap (`startDate` 2026-06-15) as pure data — `{ startDate, phases[], items[] }`.
  - `phases`: 6 phases with `{ id, name, weeks, focus }` matching the plan (P1 Stack/Queue/Recursion/Linked List/Binary Search → P6 review + company sets).
  - `items`: ordered list, each `{ slug, url, title, pattern, difficulty, phase, kind }` where `kind` ∈ `problem | design | reading | behavioral`.
- Curriculum content rules:
  - ~110–130 **new** problems (≈5/week), gap-weighted toward the 8 missing patterns, ramping Easy → Medium → Hard within each pattern.
  - Exclude the ~15 problems already solved (Two Sum I/II, 3Sum, Sort Colors, Climbing Stairs, etc.).
  - Interleave one `design`/`reading` item per week: weeks 1–8 = System Design Primer reading sections; week 9+ = the graded design ladder (10 Easy → ~6 Medium → 2–3 Hard).
  - Phase 5 adds one `behavioral` item per week.
  - Every problem item carries a real LeetCode URL and correct difficulty; all slugs unique.
- Add a short README note in `docs/` explaining the phase logic and how the file is consumed.

## Capabilities

### New Capabilities
- `curriculum-roadmap`: A precomputed, ordered 26-week study roadmap stored as data (`data/curriculum.json`), defining phases and a sequence of problem/design/reading/behavioral items that downstream tools (`today`, `mock`, stats) read to decide "what's next" without per-day planning.

### Modified Capabilities
<!-- None — no existing specs in openspec/specs/. today.ts already expects this file but has no spec. -->

## Impact

- **New data file:** `data/curriculum.json` (consumed by `scripts/today.ts`; future `scripts/mock.ts` and `scripts/generate-svg.ts`).
- **New docs:** a `docs/` note on phase logic.
- **No code changes required** by this change itself — it is a data + docs deliverable. `today.ts` already reads `data/curriculum.json`; this change supplies it.
- **No new dependencies.** Hand-authored JSON validated to parse with unique slugs.
- **External accuracy risk:** LeetCode URLs/difficulties and the NeetCode 150 / Striver A2Z / design-ladder lists are ⚠ unverified-at-research-time and must be double-checked at authoring.
