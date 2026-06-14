## Why

The curriculum and spaced-repetition tooling drills problems one at a time, but real interviews are timed, multi-problem, and come in distinct formats (Amazon-style OAs, Meta CodeSignal staged rounds, Meta AI-enabled rounds). There is no way to rehearse under those conditions or to record how a timed attempt went. Phase 5 of the roadmap ("Hard & Mocks") explicitly calls for timed mixed sets, and we are entering it now.

## What Changes

- Add `scripts/mock.ts`, runnable as `npm run mock -- --type <oa|staged|ai-pair> [--seed <n>]`, that runs a timed interview simulation and records the outcome.
  - **oa** (Amazon-style): picks 2 not-yet-done curriculum problems (1 Easy/Medium + 1 Medium), 90-minute countdown, bell at 30/10/0 min, prompts per-problem outcome, logs with `mode: "mock-oa"`.
  - **staged** (Meta CodeSignal-style): picks one `kind: "staged"` curriculum item (a multi-stage implementation problem), 90-minute countdown, logs with `mode: "mock-staged"`.
  - **ai-pair** (Meta AI-enabled round): picks 1 unseen Medium/Hard problem, 60-minute countdown, prints the protocol reminder (AI allowed; graded on decomposition, prompt quality, verifying AI output, narrating tradeoffs), logs with `mode: "mock-ai"`.
- Selection logic is a pure, seeded, dependency-free module with its own assertion tests (`scripts/mock.test.ts`), matching the existing functional-core / tested-pure-functions convention.
- Add 8 staged problems to `data/curriculum.json` (`kind: "staged"`, Phase 5) plus a 4-stage spec for each at `mocks/staged/<slug>.md`. Only added if no staged items already exist.
- Extend the practice-entry shape with optional `slug`, `url`, and `mode` fields so timed picks (which have no solved file yet) can be recorded and mapped back to curriculum items.
- `mock-oa` and `mock-staged` outcomes feed the spaced-repetition schedule (solved→good, partial→hard, failed→fail); `mock-ai` does not (AI-assisted work is not treated as unaided retention).
- Extend `scripts/log-practice.ts` so that when a real numbered solve later matches a prior mock-slug entry, it registers an `aliasOf` in `data/problems-meta.json`, letting the two spaced-repetition ladders merge on the next `schedule:backfill`.

## Capabilities

### New Capabilities
- `mock-simulation`: timed interview-format practice (OA, staged, AI-pair) with seeded reproducible problem selection, a countdown timer, outcome logging into practice history, and conditional feeding of the spaced-repetition schedule.

### Modified Capabilities
<!-- No existing capability spec covers practice logging or the curriculum; the practice-entry and log-practice changes are implementation details captured in design.md, not a spec-level behavior change to an existing capability. -->

## Impact

- **New files**: `scripts/mock.ts`, `scripts/mock.test.ts`, `mocks/staged/<slug>.md` × 8.
- **Modified files**: `package.json` (add `mock` script; extend `test` to run `mock.test.ts`), `data/curriculum.json` (8 staged items), `scripts/log-practice.ts` (alias reconciliation), and the shared `PracticeEntry` shape (additive optional fields — `today.ts`, `schedule.ts`, `generate-svg.ts` ignore unknown fields, so no breaking change).
- **Data written at runtime**: appends to `data/practice.json`; updates `data/schedule.json` (oa/staged only); may write `aliasOf` into `data/problems-meta.json`.
- **Dependencies**: none added — stays dependency-free TypeScript run via `tsx`.
