## ADDED Requirements

### Requirement: Review KPIs
The dashboard SHALL show a KPI for reviews due today and a KPI for the on-time review rate over the last 30 days.

"Reviews due today" SHALL be the count of `data/schedule.json` entries whose `due` timestamp is on or before the end of the current day. The on-time review rate SHALL be computed by replaying practice history: among repeat reviews completed in the last 30 days (reviews of a file that already had a prior scheduled `due`), the fraction completed on or before that prior `due`. First-ever solves SHALL NOT count toward the rate. The computation SHALL reuse `reviewHistory` and `onTimeInWindow` from `scripts/today.ts`.

#### Scenario: Reviews are due
- **WHEN** three schedule entries have a `due` on or before today and the rest are in the future
- **THEN** the "reviews due today" KPI shows 3

#### Scenario: On-time rate with enough samples
- **WHEN** at least 5 repeat reviews were completed in the last 30 days and 4 of them landed on or before their due date
- **THEN** the on-time review rate KPI shows 80%

#### Scenario: Thin review sample
- **WHEN** fewer than 5 repeat reviews were completed in the last 30 days
- **THEN** the on-time review rate is reported as `n/a`

### Requirement: Curriculum KPIs
The dashboard SHALL show the current curriculum phase and week, and curriculum progress as done / total items.

The current week SHALL be derived from `data/curriculum.json` `startDate` using `weekNumber` from `scripts/today.ts`, and the phase using `currentPhase`. A week before `startDate` SHALL display as week 0 and clamp to the first phase. Total items SHALL be the count of all items in `curriculum.json` (every kind). An item SHALL count as done when `isItemDone` (from `scripts/today.ts`) matches it against practised files.

#### Scenario: Before the curriculum start date
- **WHEN** today is earlier than `startDate`
- **THEN** the phase/week KPI shows week 0 and the first phase name

#### Scenario: Curriculum progress count
- **WHEN** the roadmap has 160 items and 12 of them match practised files
- **THEN** the curriculum progress KPI shows 12/160

### Requirement: Track sections
The dashboard SHALL show a TRACKS section reporting system design exercises completed, behavioral stories drilled, and mock sessions by type.

System design completed SHALL be the count of files under `systemdesign/` excluding `_template.md` and `README.md`. Behavioral stories drilled SHALL be the count of files under `behavioral/stories/` excluding `_template.md`. Mock sessions SHALL be grouped by the `mode` field on `data/practice.json` entries into `mock-oa`, `mock-staged`, and `mock-ai`, with a count per type.

#### Scenario: Counting designs and stories
- **WHEN** `systemdesign/` contains `tinyurl.md`, `_template.md`, and `README.md`, and `behavioral/stories/` contains `disagreed-mgr.md` and `_template.md`
- **THEN** the TRACKS section shows 1 design completed and 1 story drilled

#### Scenario: Mock breakdown with no mocks yet
- **WHEN** no practice entry has a `mode` field
- **THEN** the TRACKS section shows OA 0, Staged 0, AI 0 without error

### Requirement: Curriculum timeline bar
The dashboard SHALL render a 26-week roadmap bar showing all curriculum phases with a "you are here" marker at the current week.

Each phase SHALL occupy a width proportional to its week range (parsed with `parseWeekRange` from `scripts/today.ts`). The marker SHALL sit at the horizontal position of the current week. When the current week is 0 (before start), the marker SHALL sit at the left edge.

#### Scenario: Marker placement mid-plan
- **WHEN** the current week is 11 of a 26-week plan
- **THEN** the "you are here" marker sits at roughly 11/26 across the timeline bar, within the Phase 3 segment

### Requirement: Weighted MAANG readiness meter
The dashboard SHALL compute a MAANG readiness score from six weighted axes: coverage 25%, volume 20%, retention-health 20%, hard-ratio 15%, mock-readiness 10%, and design-readiness 10%.

Retention-health SHALL be the on-time review rate over the last 30 days. Mock-readiness SHALL be the count of mock sessions in the last 30 days divided by a target of 4, capped at 1. Design-readiness SHALL be the count of completed system designs divided by a target of 18, capped at 1. Coverage, volume, and hard-ratio SHALL retain their existing definitions. The `consistency` axis SHALL be removed and `solveDaysLast14()` SHALL be deleted.

When retention-health has too few samples to report (`n/a`), it SHALL be excluded from the weighted sum and the remaining five weights SHALL be rescaled to sum to 1.

#### Scenario: Full weighted score
- **WHEN** all six axes have reportable values
- **THEN** the score is the sum of each axis value times its weight, and the six weights total 100%

#### Scenario: Retention excluded when thin
- **WHEN** retention-health is `n/a`
- **THEN** it is dropped from the sum and the remaining weights (coverage 25, volume 20, hard 15, mock 10, design 10) are each divided by 0.80 so they re-sum to 100%

### Requirement: Readiness caps
The meter SHALL apply caps that limit the score, recording a cap only when it actively reduced the score.

The existing caps SHALL be kept: 0 Hard problems caps the score at 30%, and fewer than 50 total problems caps it at 25%. A new cap SHALL apply: 0 completed system designs after curriculum week 8 caps the score at 50%.

#### Scenario: Design cap before week 8
- **WHEN** there are 0 completed system designs and the current curriculum week is 3
- **THEN** the design cap does not apply

#### Scenario: Design cap after week 8
- **WHEN** there are 0 completed system designs and the current curriculum week is 10
- **THEN** the score is capped at 50% and the cap is listed as applied

### Requirement: Preserve existing dashboard and workflow
The upgrade SHALL preserve the existing visual style, the dependency-free build, and the pre-commit regeneration flow.

The generator SHALL remain dependency-free TypeScript run via `tsx scripts/generate-svg.ts` (`npm run stats`). Existing colors, the `bar()` and `text()` helpers, and the portal / difficulty / category / pattern sections SHALL be retained. The pre-commit hook that regenerates and stages `stats.svg` SHALL continue to work, and `stats.svg` SHALL render as valid SVG.

#### Scenario: Regeneration still works
- **WHEN** `npm run stats` is run
- **THEN** a valid `stats.svg` is written with no added npm dependencies and the pre-commit hook stages it on commit
