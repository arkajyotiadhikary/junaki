## 1. Wire up shared logic and new data sources

- [x] 1.1 Import helpers into `scripts/generate-svg.ts` from `./today` (`reviewHistory`, `onTimeInWindow`, `dueReviews`, `weekNumber`, `currentPhase`, `parseWeekRange`, `isItemDone`, `indexPracticedFiles`, and the `Curriculum` / `CurriculumItem` types) and from `./schedule` (`resolveCanonical`, `ScheduleState`); export any of these that are not yet exported (without changing their behavior)
- [x] 1.2 Add loaders for `data/schedule.json` and `data/curriculum.json` that return safe empty defaults when the file is missing
- [x] 1.3 Generalize `walkDir` to accept a file extension (default `.ts` so the existing problem walk is unchanged) so it can also list `.md` files
- [x] 1.4 Confirm `npm run stats` still runs and writes `stats.svg` after the imports/loaders are added, before any rendering changes

## 2. Compute the new metrics

- [x] 2.1 Reviews due today: count `schedule.json` entries with `due` on or before end of today (reuse `dueReviews`)
- [x] 2.2 On-time review rate (30d): `onTimeInWindow(reviewHistory(practice, resolve), now, 30)`; return `n/a` when `total < 5`, otherwise the on-time fraction
- [x] 2.3 Curriculum phase + week from `startDate` via `weekNumber` + `currentPhase`; handle week 0 / before-start (clamp to first phase)
- [x] 2.4 Curriculum progress: count items where `isItemDone(item, practiced)` is true over all `items`; total = `items.length`
- [x] 2.5 Designs completed: count files under `systemdesign/` excluding `_template.md` and `README.md`
- [x] 2.6 Stories drilled: count files under `behavioral/stories/` excluding `_template.md`
- [x] 2.7 Mock sessions by type: group `practice.json` entries by `mode` into `mock-oa` / `mock-staged` / `mock-ai`, counting only those in the last 30 days for mock-readiness, and totals for the TRACKS line

## 3. Re-weight the MAANG meter

- [x] 3.1 Remove the `consistency` axis and delete `solveDaysLast14()` and its git call
- [x] 3.2 Add `mockReadiness` (mocks in last 30d ÷ 4, capped at 1) and `designReadiness` (designs done ÷ 18, capped at 1) to the meter inputs
- [x] 3.3 Set retention-health to the 30d on-time rate; apply weights coverage .25 / volume .20 / retention .20 / hard .15 / mock .10 / design .10
- [x] 3.4 When retention-health is `n/a`, drop it from the sum and divide the remaining five weights by 0.80 so they re-sum to 1
- [x] 3.5 Keep existing caps (0 Hard → 30%, <50 problems → 25%); add new cap (0 designs after curriculum week 8 → 50%), recording a cap only when it actually reduced the score

## 4. Render the new UI

- [x] 4.1 Grow `H` (~760 → ~1040) and re-flow the vertical cursor so existing sections still fit
- [x] 4.2 Add the second KPI row: reviews due today, on-time rate (or `n/a`), week + phase, curriculum done/total — reusing the existing KPI card style
- [x] 4.3 Add the TRACKS section line: designs N/18, stories N, mocks OA/Staged/AI
- [x] 4.4 Add the 26-week roadmap timeline bar: phase segments sized by `parseWeekRange`, with a "you are here" marker at the current week (left edge at week 0)
- [x] 4.5 Update the meter sub-bars: show retention-health (or `n/a`), add mock-readiness and design-readiness rows, remove the consistency row, and fix the volume label from `/500` to `/1500`

## 5. Verify

- [x] 5.1 Run `npm run stats` and confirm it exits 0 and prints the summary line
- [x] 5.2 Open `stats.svg` in a browser and confirm it renders with no clipping or overlap on current near-empty data (week 0, zero mocks, thin reviews)
- [x] 5.3 Run `npm test` to confirm `today.ts` / `schedule.ts` tests still pass (imports did not change their behavior)
- [x] 5.4 Make a test commit to confirm the pre-commit hook regenerates and stages `stats.svg`, then verify no new npm dependencies were added
