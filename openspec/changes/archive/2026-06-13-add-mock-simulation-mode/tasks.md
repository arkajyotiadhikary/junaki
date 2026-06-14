## 1. Pure selection core (test-first)

- [x] 1.1 Add `scripts/mock.test.ts` skeleton using `node:assert/strict`, copying the dep-free `test()` runner from `today.test.ts`
- [x] 1.2 Implement and test `mulberry32(seed)` plus a string→int hash so `--seed` accepts numeric or string seeds; assert same seed → same sequence
- [x] 1.3 Implement and test `recentlyBlocked(entries, now, days)` returning the set of items practiced unaided within the window — an entry blocks unless its `mode` is `mock-ai`
- [x] 1.4 Implement and test `eligible(items, practiced, blocked, predicate)` reusing `isItemDone` from `today.ts`; predicate filters by kind/difficulty
- [x] 1.5 Implement and test `pickOA(eligible, rng)` → two distinct problems (Easy|Medium, then Medium); assert distinctness and difficulty constraints
- [x] 1.6 Implement and test `pickStaged(items, rng)` → one `kind: "staged"` item, and `pickAiPair(eligible, rng)` → one unseen Medium|Hard
- [x] 1.7 Implement and test `outcomeToRating` (solved→good, partial→hard, failed→fail) and `toEntry(pick, outcome, minutes, mode)` building the practice entry with `slug`, `url`, synthesized `file: leetcode/<slug>`, `rating`, `mode`, and minutes in `notes`

## 2. Staged problem catalogue

- [x] 2.1 Author 8 staged problem specs at `mocks/staged/<slug>.md`, each a multi-stage implementation problem (e.g. in-memory KV store with TTL) with a 4-stage spec
- [x] 2.2 Add the 8 matching items to `data/curriculum.json` with `kind: "staged"`, `phase: 5`, and a `slug`/`title`/`pattern`/`difficulty`; guard so this only runs when no staged items already exist (idempotent)
- [x] 2.3 Run `npm run today` and confirm the new staged items do NOT appear in daily picks or change the "Problems X/Y" count

## 3. Imperative shell (scripts/mock.ts)

- [x] 3.1 Parse `--type <oa|staged|ai-pair>` and `--seed <n>`; print usage and exit non-zero on missing/invalid type
- [x] 3.2 Load `curriculum.json`, `practice.json`, `problems-meta.json`; build the practiced index and run the type-specific selector; if not enough eligible problems, report and exit without timing or writing
- [x] 3.3 Print the selected problem(s) with titles and URLs (oa/ai-pair) or the staged spec path (staged); for ai-pair also print the AI-enabled protocol reminder (decomposition, prompt quality, verifying/correcting AI output, narrating tradeoffs)
- [x] 3.4 Implement the countdown timer (90 min oa/staged, 60 min ai-pair) updating at least once per minute and emitting a terminal bell at 30/10/0 minutes remaining
- [x] 3.5 Handle `SIGINT` (Ctrl-C) so it transitions to the outcome prompt instead of exiting; guard against double-fire when the timer already hit zero
- [x] 3.6 Prompt per problem for outcome (solved/partial/failed) and minutes via stdin; append the resulting entries to `data/practice.json`
- [x] 3.7 For `mock-oa` and `mock-staged` only, call `updateScheduleForReview(file, rating, date)`; skip the schedule for `mock-ai`

## 4. Shared schema and alias reconciliation

- [x] 4.1 Extend the `PracticeEntry` shape with optional `slug`, `url`, and `mode` fields wherever it is declared (`log-practice.ts`, `today.ts`, `schedule.ts`)
- [x] 4.2 In `log-practice.ts`, when a real numbered file is logged that normalizes to a prior mock-slug practice entry, write `aliasOf: <realFile>` into `data/problems-meta.json` for the synthesized mock key; no-op when there is no match
- [x] 4.3 Verify that after a real solve + `npm run schedule:backfill`, the mock-slug ladder and the real-file ladder merge into one schedule entry

## 5. Wiring and verification

- [x] 5.1 Add `"mock": "tsx scripts/mock.ts"` to `package.json` scripts and append `&& tsx scripts/mock.test.ts` to the `test` script
- [x] 5.2 Run `npm test` and confirm all suites (schedule, today, mock) pass
- [x] 5.3 Smoke-test each type with a fixed `--seed`: `npm run mock -- --type oa --seed 1`, `--type staged --seed 1`, `--type ai-pair --seed 1`; verify reproducible selection and correct practice/schedule writes
