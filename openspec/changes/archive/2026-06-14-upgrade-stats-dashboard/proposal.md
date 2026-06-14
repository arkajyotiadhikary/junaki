## Why

The `stats.svg` dashboard tracks problem-solving only. The repo now has three new data sources — spaced-repetition review state (`data/schedule.json`), a 26-week curriculum roadmap (`data/curriculum.json`), and mock-session tagging on practice entries — plus two new practice tracks (system design, behavioral). None of this is visible on the dashboard, and the "MAANG Meter" still scores readiness as if interviews were only about solving LeetCode. The dashboard should reflect the full prep plan: reviews, roadmap progress, design and behavioral practice, and mock readiness.

## What Changes

- **New KPI row** added below the existing one: reviews due today, on-time review rate (last 30 days), current curriculum phase + week, and curriculum progress (done / total items).
- **New TRACKS section**: system design exercises completed, behavioral stories drilled, and mock sessions broken down by type (OA / staged / AI).
- **New 26-week roadmap timeline bar** showing all six phases with a "you are here" marker at the current week.
- **MAANG Meter re-weighted** to: coverage 25%, volume 20%, retention-health 20% (on-time review rate), hard-ratio 15%, mock-readiness 10% (mocks in last 30 days, target 4), design-readiness 10% (designs done ÷ 18 target).
  - **BREAKING (metric definition)**: the `consistency` axis (was 15%, last-14-day activity) is removed; `solveDaysLast14()` is deleted. The `retention` axis changes meaning from "problems practised in last 30d" to "on-time review rate".
  - Existing caps kept (0 Hard → max 30%; <50 problems → max 25%). New cap added: 0 system designs after curriculum week 8 → max 50%.
  - When the on-time sample is too thin (fewer than 5 completed reviews in 30 days), retention-health shows `n/a` and its 20% is redistributed across the remaining axes.
- **Logic reuse, not reinvention**: import existing tested functions from `scripts/today.ts` and `scripts/schedule.ts` (`reviewHistory`, `onTimeInWindow`, `dueReviews`, `weekNumber`, `currentPhase`, `parseWeekRange`, `isItemDone`, `indexPracticedFiles`, `resolveCanonical`) instead of duplicating spaced-rep or curriculum math.
- **Minor fix**: the volume sub-bar label says `/500` but the code divides by `1500`; correct the label to match.

## Capabilities

### New Capabilities
- `stats-dashboard`: the generated `stats.svg` dashboard — its KPIs, track sections, curriculum timeline, and the weighted MAANG readiness meter, including how each value is computed from the repo's data files.

### Modified Capabilities
<!-- None. No existing spec covers the stats dashboard; this introduces the first one. -->

## Impact

- **Code**: `scripts/generate-svg.ts` (the only file changed for behavior). Reads two additional data files (`data/schedule.json`, `data/curriculum.json`) and two directories (`systemdesign/`, `behavioral/stories/`). Imports helpers from `scripts/today.ts` and `scripts/schedule.ts`.
- **Output**: `stats.svg` grows taller (~760 → ~1040 px) and gains rows; existing visual style, colors, and helpers (`bar()`, `text()`) are preserved.
- **Dependencies**: none added — stays dependency-free TypeScript run via `tsx`.
- **Workflow**: the pre-commit hook (`hooks/pre-commit`) that regenerates and stages `stats.svg` must keep working unchanged.
- **Data**: read-only consumption of existing data files; no data file format changes.
