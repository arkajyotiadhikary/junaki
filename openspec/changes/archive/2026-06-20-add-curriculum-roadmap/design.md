## Context

The repo already ships a spaced-repetition scheduler (`scripts/schedule.ts`) and a daily driver (`scripts/today.ts`). `today.ts` is written to read `data/curriculum.json` for the "next new problem," but that file does not yet exist — so the daily plan currently can only surface reviews, not new work. This change supplies the curriculum data so the daily loop is complete.

Current learner state (2026-06-10): 43 solved (28 Easy / 15 Medium / 0 Hard), heavily skewed to Array/String; 8 core patterns have zero coverage. The plan (`docs/plans/2026-06-10-maang-prep-system-v2.md`, Prompt 3) prescribes a 26-week, 6-phase roadmap starting 2026-06-15, gap-weighted toward the missing patterns, with interleaved system-design and behavioral items.

Constraints: dependency-free, strict TS elsewhere in the repo, JSON-as-data philosophy ("remove all daily decisions"). This deliverable is data + a docs note — no runtime code is required, since `today.ts` already consumes the shape.

## Goals / Non-Goals

**Goals:**
- Produce a valid, parseable `data/curriculum.json` matching the shape `today.ts` already expects.
- Encode the 6-phase / 26-week structure with `startDate` 2026-06-15.
- 110–130 new problems, gap-weighted to the 8 missing patterns, ramping Easy→Medium→Hard, with real LeetCode URLs and correct difficulty.
- Interleave one design/reading item per week and behavioral items in phase 5.
- Exclude already-solved problems; keep all slugs unique.
- A short `docs/` note explaining phase logic and consumption.

**Non-Goals:**
- No changes to `today.ts`, `schedule.ts`, or the stats generator (those are later prompts P6/P7).
- No AlgoFrog import (separate change, Prompt 8) — this roadmap is sourced from the free NeetCode 150 / Striver A2Z lists.
- No automated curriculum generator script — the file is hand-authored for accuracy of URLs/difficulty.
- Not enforcing exact per-week item counts; "≈5/week" and "one design/week" are targets, not hard invariants.

## Decisions

- **Hand-authored JSON, not a generator.** The plan flags LeetCode URLs and list contents as ⚠ unverified; correctness of each URL/difficulty matters more than DRY. A generator would encode the same unverified assumptions with less review surface. Alternative (scrape NeetCode/Striver) rejected: adds fragility and a network dependency for a one-time artifact.
- **Item shape exactly matches `today.ts`'s reader.** Before authoring, confirm the field names `today.ts` destructures (`slug, url, title, pattern, difficulty, phase, kind`, and any `done`/`startDate` usage) and match them precisely so no code change is needed. This is the single highest-risk integration point.
- **`done` is derived, not stored.** Per the plan, an item is "done" when a `practice.json` entry exists for its file — `today.ts` owns that sync. The curriculum file does not hard-code `done` flags.
- **Pattern names align with `problems-meta.json` conventions** so stats/coverage can aggregate across solved + planned without a mapping table.
- **Ordering is the contract.** "Next new problem" = first uncompleted `problem` item in array order, so items are listed in intended study order within each phase (Easy→Medium→Hard per pattern).
- **Validation via a throwaway `tsx`/node check**, not a committed test. The spec scenarios (parse, unique slugs, phase coverage, volume band, gap-pattern presence) are checked once at authoring; no need to add a permanent test for a static data file.

## Risks / Trade-offs

- **[Wrong/stale LeetCode URLs or difficulties]** → Spot-check each URL resolves and difficulty matches at authoring; the plan explicitly warns these were unverified.
- **[Shape mismatch with `today.ts`]** → Read `today.ts` first and mirror its exact destructuring before writing any items; run `npm run today` after authoring to confirm it surfaces a new problem.
- **[Including an already-solved problem]** → Cross-check every slug against the plan's exclusion list and `problems-meta.json` keys.
- **[Volume drift outside 110–130]** → Count `problem` items before finalizing; adjust per-pattern depth to land in band.
- **[NeetCode/Striver list inaccuracy]** → Treat the lists as guidance; prioritize covering the 8 gap patterns and a correct difficulty ramp over matching any specific list verbatim.

## Migration Plan

Additive only — a new data file plus a docs note. No existing behavior changes. Rollback = delete `data/curriculum.json`; `today.ts` returns to surfacing reviews only. No data migration needed.

## Open Questions

- Should `reading` items carry a `url` to the specific Primer section, or just a section title? (Lean: include the anchor URL for one-click access.)
- Exact count and identity of the Phase-5 staged/implementation problems are deferred to the mock-mode change (P6); this curriculum only needs the standard problem/design/reading/behavioral items.
