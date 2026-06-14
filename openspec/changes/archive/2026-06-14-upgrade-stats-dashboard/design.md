## Context

`scripts/generate-svg.ts` (475 lines, dependency-free TypeScript, run via `npm run stats` and a pre-commit hook) renders `stats.svg`. Today it only knows about problem files and `data/practice.json`. Three newer data sources are unused by the dashboard:

- `data/schedule.json` — per-file spaced-rep state `{ lastReview, intervalIndex, due }`.
- `data/curriculum.json` — a 26-week roadmap with `startDate`, `phases`, and 160 ordered `items` of mixed `kind` (problem / design / reading / behavioral / staged).
- `data/practice.json` entries that may carry `rating` and `mode` (`mock-oa` / `mock-staged` / `mock-ai`).

Crucially, the spaced-rep and curriculum logic this upgrade needs **already exists and is tested** in `scripts/today.ts` and `scripts/schedule.ts`, and `today.ts` guards its CLI behind an `isMain` check so it is safe to import. The current real-world state: the curriculum `startDate` is `2026-06-15` (tomorrow relative to today), only 2 practice entries carry a rating, and no entry yet carries a `mode`. The design must render cleanly with this near-empty data.

## Goals / Non-Goals

**Goals:**
- Surface reviews, curriculum progress, tracks, a roadmap timeline, and a re-weighted readiness meter on `stats.svg`.
- Reuse tested logic from `today.ts` / `schedule.ts` rather than duplicating spaced-rep or curriculum math.
- Keep the build dependency-free and the pre-commit flow intact.
- Degrade gracefully on empty / thin data (week 0, zero mocks, thin review sample).

**Non-Goals:**
- No changes to data file formats or to `today.ts` / `schedule.ts` logic (import only; small new exports are acceptable but no behavior change).
- No new npm dependencies, no SVG-rendering library.
- No redesign of the existing portal / difficulty / category / pattern sections — they stay as-is.

## Decisions

### Decision 1: Import shared logic from `today.ts` and `schedule.ts`
Reuse `reviewHistory`, `onTimeInWindow`, `dueReviews`, `weekNumber`, `currentPhase`, `parseWeekRange`, `isItemDone`, `indexPracticedFiles` (today.ts) and `resolveCanonical`, `applyReview`, `ScheduleState` (schedule.ts).
- **Why**: this is the single biggest risk reducer. The on-time-rate replay is subtle (it depends on the due date that was active *before* each review) and already has tests. Re-implementing it in the stats script would risk divergence.
- **Alternative considered**: copy the math into `generate-svg.ts` to keep it self-contained. Rejected — duplicate spaced-rep logic would drift from `today.ts` and double the test surface.
- **Safety**: `today.ts` runs `main()` only under `const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]`, so importing it produces no side effects.

### Decision 2: On-time rate uses a 30-day window and an `n/a` threshold
Call `onTimeInWindow(reviewHistory(practice, resolve), now, 30)`. If `total < 5`, treat retention-health as `n/a`.
- **Why**: matches the prompt's "last 30d" wording and avoids a noisy 0% from one or two reviews. 5 is a small, honest floor.
- **Alternative considered**: treat thin data as 0% (rejected — unfairly tanks the meter for weeks) or as 100% (rejected — flatters readiness).

### Decision 3: `n/a` retention is dropped and weights are rescaled
When retention-health is `n/a`, remove its 0.20 from the weighted sum and divide each remaining weight (coverage .25, volume .20, hard .15, mock .10, design .10 = .80 total) by 0.80 so they re-sum to 1.
- **Why**: keeps the score on a 0–100% scale and stops a missing axis from silently counting as zero.
- **Alternative considered**: leave the 20% as dead weight (rejected — caps the achievable score at 80% for no reason early on).

### Decision 4: "Designs done" and "stories drilled" are file counts
Count files under `systemdesign/` excluding `_template.md` and `README.md`; count files under `behavioral/stories/` excluding `_template.md`. The existing `walkDir` helper can be generalized to take an extension (it currently hardcodes `.ts`).
- **Why**: the prompt defines these as "files under" those directories. Simple and matches how the tracks were built.
- **Alternative considered**: count curriculum items of `kind: design` that are done via `isItemDone` (rejected for the track counts — the prompt says files; but design-readiness target of 18 happens to match the 18 design items, which is a useful sanity check).

### Decision 5: Curriculum done/total counts all 160 items
Loop every `curriculum.items` entry through `isItemDone(item, practiced)`; total is `items.length`.
- **Why**: user chose "all 160 items" — truest to overall roadmap progress. `isItemDone` already handles problems by number/slug and other kinds by explicit `file`.

### Decision 6: Remove `consistency` entirely
Delete the consistency sub-bar and the `solveDaysLast14()` function and its git call.
- **Why**: the new six weights sum to 100 with no consistency slot; user chose to remove it. Bonus: one fewer `execSync` git call per render.

### Decision 7: Layout — add rows, grow height, keep style
Keep `W=900`; grow `H` from 760 to roughly 1040. Add a second KPI row (due-today / on-time / week+phase / curriculum), a TRACKS line, a 26-week timeline bar, and two new meter sub-bars (mock, design). Reuse `bar()`, `text()`, and the existing `COLORS`.
- **Timeline math**: each phase segment width = `(weekSpan / 26) * timelineWidth` using `parseWeekRange`; the "you are here" marker x = `(min(week,26) / 26) * timelineWidth`, clamped to the left edge at week 0.
- **Why**: matches the prompt's "keep the existing visual style"; additive layout is low-risk.

### Decision 8: Fix the volume label
Change the volume sub-bar label from `/500` to `/1500` to match the divisor in code.
- **Why**: pre-existing mismatch; cheap to fix while editing that row.

## Risks / Trade-offs

- **[Importing from `today.ts` triggers a hidden side effect]** → mitigated: verified the `isMain` guard exists; add a quick check that `npm run stats` output is unchanged in structure after wiring imports.
- **[Real data is near-empty today: week 0, no mocks, 2 ratings]** → the dashboard could look broken. Mitigation: explicitly handle week 0 (marker at left, clamp to phase 1), zero mocks (show "OA 0 · Staged 0 · AI 0"), and thin reviews (`n/a`). The acceptance check is "renders without error on current data", not "shows big numbers".
- **[SVG height grows and content overflows the viewBox]** → mitigation: open the rendered `stats.svg` in a browser and visually confirm no clipping before committing.
- **[`walkDir` generalization breaks the existing `.ts`-only problem walk]** → mitigation: keep the default extension `.ts` so existing callers are unaffected; pass `.md` only for the new track counts.
- **[Pre-commit hook regression]** → mitigation: the hook just runs `tsx scripts/generate-svg.ts` and stages the output; as long as the script still writes `stats.svg` and exits 0, the hook is unaffected. Verify with a test commit.

## Migration Plan

Single-file behavior change; no data migration. Steps:
1. Wire imports and new data loads; verify `npm run stats` still exits 0.
2. Add metrics, then rendering, incrementally — re-run `npm run stats` after each.
3. Open `stats.svg` in a browser to confirm layout and no clipping.
4. Make a test commit to confirm the pre-commit hook regenerates and stages cleanly.

Rollback: revert the single commit to `scripts/generate-svg.ts`; the dashboard returns to the prior layout. No data or dependency changes to undo.

## Open Questions

- None blocking. The three design choices that needed input (curriculum total = all 160 items, thin-sample = `n/a` + rescale, consistency = removed) are settled and reflected above.
