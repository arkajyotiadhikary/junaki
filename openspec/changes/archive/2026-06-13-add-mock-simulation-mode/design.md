## Context

The repo follows a consistent shape: each script in `scripts/` splits **pure, exported, unit-tested logic** from a thin `main()` that does file I/O. `scripts/today.ts` already exports the primitives a mock selector needs — `isItemDone(item, practiced)`, the `CurriculumItem`/`Curriculum` types, and the phase helpers. `scripts/schedule.ts` owns the spaced-repetition ladder and exports `updateScheduleForReview(file, rating, date)` and `resolveCanonical(file, meta)`. `scripts/log-practice.ts` appends to `data/practice.json` and calls `updateScheduleForReview` on every solve.

Current ground truth (verified): the curriculum has 152 items, **zero** with `kind: "staged"`, and there is no `mocks/` directory. Practice entries today are `{ file, date, notes?, rating? }` with **no `mode` field anywhere**. `today.ts` filters strictly on `kind === "problem"` for both daily picks and the "Problems X/Y" footer count, and on `design`/`reading` for the design slot — so a new `kind: "staged"` is invisible to it.

This design is captured because the change is cross-cutting (new script + curriculum data + a `log-practice.ts` change + a shared schema tweak) and because four non-obvious decisions were settled during exploration.

## Goals / Non-Goals

**Goals:**

- A dependency-free `scripts/mock.ts` with seeded, reproducible, unit-tested selection logic.
- Reuse `isItemDone` and `updateScheduleForReview` rather than reimplementing matching or scheduling.
- Record timed attempts in the existing `data/practice.json` so they show up in history and (conditionally) in the spaced-repetition schedule.
- Keep `today.ts` and `generate-svg.ts` working untouched (additive schema only).

**Non-Goals:**

- No web UI, no real-time judging, and no fetching problem statements from LeetCode.
- No new runtime dependency; the timer and prompts use Node built-ins only.
- Not redesigning the spaced-repetition algorithm — only feeding it.
- Not changing how unaided solves are logged today, beyond the additive alias step.

## Decisions

### Decision 1 — Mock entries identify the problem by `slug` (+`url`, synthesized `file`)

A mock picks problems the user has **not** solved, so no real solution file exists yet. We extend `PracticeEntry` with optional `slug`, `url`, and `mode`, and synthesize `file` as `leetcode/<slug>`.

- **Why:** an explicit `slug` gives an unambiguous back-map to the curriculum item, which the 14-day recency filter needs. The fields are optional and additive, so every existing consumer (`today.ts`, `schedule.ts`, `generate-svg.ts`) keeps working unchanged.
- **Alternatives considered:** (a) synthesize only a `file` path and rely on `isItemDone`'s normalized-slug fallback — works for clean LeetCode slugs but is fuzzy for numbered ones and stores no first-class link; (b) store nothing extra — makes the recency filter guess. Rejected both for the explicit `slug`.

### Decision 2 — `mock-oa` and `mock-staged` feed the spaced-repetition schedule; `mock-ai` does not

Outcome maps to rating as solved→good, partial→hard, failed→fail. For oa/staged we call `updateScheduleForReview`; for ai-pair we only append to practice history.

- **Why:** a problem fumbled in a timed unaided mock should resurface, exactly like a normal solve. An AI-assisted attempt is not unaided retention, so advancing the real ladder from it would be misleading — and it is consistent with Decision 4 treating `mock-ai` as not-real practice.
- **Alternatives considered:** feed all three modes (simpler rule, but pollutes retention with assisted work); feed none (keeps Prompt 6 literal, but loses the resurfacing benefit for genuine timed attempts).

### Decision 3 — "Unaided" recency means only `mock-ai` is exempt from the 14-day block

Selection excludes any item practiced within the last 14 days **unless** that entry's `mode` is `mock-ai`. Normal solves, `mock-oa`, and `mock-staged` all block re-picking.

- **Why:** the intent is to avoid re-testing something just solved for real. An AI-assisted session is not a real test, so it should not lock a problem out of future mocks.
- **Alternatives considered:** "any practice within 14 days blocks" — simpler but ignores the word *unaided* and would wrongly retire problems only ever touched with AI help.

### Decision 4 — Alias reconciliation happens *backward*, inside `log-practice.ts`

At mock time the real numbered filename does not exist, so a forward alias is impossible. Instead, when a real numbered solve is later logged and it normalizes to the same problem as a prior mock-slug entry, `log-practice.ts` writes `aliasOf: <realFile>` into `data/problems-meta.json` for the synthesized mock key. `resolveCanonical` then funnels both entries to one key, and the next `schedule:backfill` merges the two ladders.

- **Why:** this is the only point in time where both the mock slug and the real file are known. It keeps a single retention ladder per problem. The matching reuses the same normalize-slug logic `isItemDone` already relies on.
- **Trade-off:** this expands scope beyond `scripts/mock.ts` (the original prompt's stated boundary) into `log-practice.ts`. Accepted deliberately for data integrity rather than smuggled in.
- **Alternatives considered:** (a) accept divergent ladders and just document it — simplest but leaves duplicate schedule keys forever; (b) skip feeding the schedule for slug-only picks — avoids orphans but discards Decision 2's benefit. Rejected in favor of the alias.

### Decision 5 — Seeded PRNG via a small `mulberry32`

Reproducibility (`--seed`) requires a seedable generator, which `Math.random` is not. A ~5-line `mulberry32` (with a string→int hash for non-numeric seeds) keeps selection pure and unit-testable, with no dependency.

### Decision 6 — Pure core / imperative shell split, mirroring sibling scripts

The countdown timer, terminal bell, stdin prompts, and SIGINT handling live in the untested shell. The selection, eligibility, recency, and outcome-to-rating logic are pure functions exported for `scripts/mock.test.ts`, using `node:assert/strict` exactly like `today.test.ts` and `schedule.test.ts`. `package.json`'s `test` script gains `&& tsx scripts/mock.test.ts`.

## Risks / Trade-offs

- **Ctrl-C must still log** → register a `SIGINT` handler that transitions to the outcome prompt instead of exiting; guard against double-fire if the timer already reached zero.
- **Synthesized `file` could collide with a real path** → use the `leetcode/<slug>` form (no numeric prefix, no `.ts`), which never collides with the numbered solution filenames the repo actually uses; the alias step later reconciles them.
- **Schema drift for unknown readers** → the new fields are optional; all current readers tolerate unknown keys. Verified against `today.ts`, `schedule.ts`, and `generate-svg.ts` consumers.
- **Selecting fewer problems than required** (e.g. OA needs a Medium but none are eligible) → the pure selector returns what it can and the shell reports "not enough eligible problems" and exits without starting a timer or writing data.
- **Adding staged items shifts curriculum data** → staged items use `kind: "staged"` and Phase 5, which `today.ts` ignores entirely, so daily picks and the progress count are unaffected. The 8-item seed only runs when no staged items already exist, so it is idempotent across re-runs.
