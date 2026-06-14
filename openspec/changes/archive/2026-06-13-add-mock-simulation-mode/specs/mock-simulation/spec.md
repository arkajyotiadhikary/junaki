## ADDED Requirements

### Requirement: Mock simulation entrypoint

The system SHALL provide `npm run mock -- --type <oa|staged|ai-pair> [--seed <n>]` that runs one timed interview simulation of the requested type and records the outcome.

#### Scenario: Invalid or missing type

- **WHEN** the command is run with no `--type` or an unrecognized type
- **THEN** the system prints a usage message listing the three valid types and exits with a non-zero status, writing nothing to data files

#### Scenario: Seed makes selection reproducible

- **WHEN** the command is run twice with the same `--seed <n>` against the same data
- **THEN** both runs select exactly the same problem(s)

#### Scenario: Default selection is randomized

- **WHEN** the command is run without `--seed`
- **THEN** problem selection uses a non-fixed seed so repeated runs may differ

### Requirement: OA-type simulation

For `--type oa`, the system SHALL select 2 distinct not-yet-done curriculum problems — one of difficulty Easy or Medium, and one of difficulty Medium — run a 90-minute countdown, and log each problem's outcome with `mode: "mock-oa"`.

#### Scenario: Two distinct problems by difficulty

- **WHEN** an OA simulation selects problems
- **THEN** it returns exactly two distinct problems, the first Easy or Medium and the second Medium, both eligible (not done, not recently practiced unaided)

#### Scenario: Problems printed with URLs at start

- **WHEN** an OA simulation begins
- **THEN** the system prints both problem titles and their URLs before starting the timer

#### Scenario: Per-problem outcome logged

- **WHEN** the OA timer finishes or is interrupted and the user supplies an outcome (solved/partial/failed) and minutes for each problem
- **THEN** the system appends one practice entry per problem to `data/practice.json` with `mode: "mock-oa"`, the problem `slug`, `url`, a synthesized `file`, the elapsed minutes in `notes`, and a `rating` derived from the outcome

### Requirement: Staged-type simulation

For `--type staged`, the system SHALL select one curriculum item with `kind: "staged"`, run a 90-minute countdown, and log the outcome with `mode: "mock-staged"`.

#### Scenario: Selects a staged item and shows its spec

- **WHEN** a staged simulation starts
- **THEN** it selects one `kind: "staged"` curriculum item and prints the path to its multi-stage spec file under `mocks/staged/`

#### Scenario: Outcome logged

- **WHEN** the staged timer ends or is interrupted and the user supplies an outcome and minutes
- **THEN** the system appends a practice entry with `mode: "mock-staged"`

#### Scenario: Staged catalogue is seeded when absent

- **WHEN** the curriculum contains no `kind: "staged"` items
- **THEN** the catalogue provides 8 staged items (Phase 5) and a 4-stage spec file for each at `mocks/staged/<slug>.md`

### Requirement: AI-pair-type simulation

For `--type ai-pair`, the system SHALL select 1 unseen problem of difficulty Medium or Hard, run a 60-minute countdown, print the AI-enabled-round protocol reminder, and log the outcome with `mode: "mock-ai"`.

#### Scenario: Selects an unseen Medium or Hard

- **WHEN** an AI-pair simulation selects a problem
- **THEN** it returns one problem of difficulty Medium or Hard that has never appeared in practice history

#### Scenario: Protocol reminder printed

- **WHEN** an AI-pair simulation starts
- **THEN** the system prints that an AI assistant MAY be used and that the graded skills are problem decomposition, prompt quality, verifying and correcting AI output, and narrating tradeoffs

#### Scenario: Outcome logged without affecting retention

- **WHEN** the AI-pair timer ends or is interrupted and the user supplies an outcome and minutes
- **THEN** the system appends a practice entry with `mode: "mock-ai"` and does NOT update the spaced-repetition schedule

### Requirement: Countdown timer with audible warnings

Each simulation SHALL run a terminal countdown for its time limit (90 minutes for oa and staged, 60 minutes for ai-pair), updating the displayed remaining time at least once per minute and emitting a terminal bell at 30, 10, and 0 minutes remaining.

#### Scenario: Bell at thresholds

- **WHEN** the remaining time reaches 30, 10, and 0 minutes
- **THEN** the system emits a terminal bell character at each of those points

#### Scenario: Interrupt still records the session

- **WHEN** the user interrupts the countdown with Ctrl-C before time expires
- **THEN** the system does not abort silently but proceeds to the outcome prompt so the attempt can be logged

### Requirement: Eligibility and the unaided-recency rule

Problem selection SHALL exclude items already done (per the existing curriculum-completion matching) and items practiced *unaided* within the last 14 days. A practice entry counts as unaided unless its `mode` is `mock-ai`.

#### Scenario: Recently solved unaided is excluded

- **WHEN** an item was practiced within the last 14 days with no `mode` or with `mode` of `mock-oa` or `mock-staged`
- **THEN** that item is not eligible for selection

#### Scenario: Recent AI-assisted practice does not block

- **WHEN** an item's only practice within the last 14 days has `mode: "mock-ai"`
- **THEN** that item remains eligible for selection

#### Scenario: No eligible problems

- **WHEN** no curriculum problem satisfies the eligibility rules for the requested type
- **THEN** the system reports that none are available and exits without starting a timer or writing data

### Requirement: Outcome-to-rating mapping and schedule feed

The system SHALL map a session outcome to a spaced-repetition rating as solved→good, partial→hard, failed→fail. For `mock-oa` and `mock-staged` it SHALL update `data/schedule.json` using that rating; for `mock-ai` it SHALL NOT.

#### Scenario: Solved OA problem advances the schedule

- **WHEN** an OA problem outcome is "solved"
- **THEN** the schedule is updated for that problem with rating "good"

#### Scenario: Failed staged problem resets the schedule rung

- **WHEN** a staged problem outcome is "failed"
- **THEN** the schedule is updated for that problem with rating "fail"

### Requirement: Mock practice entries identify the problem by slug

Because a mock picks problems that are not yet solved (no real solution file exists), each mock practice entry SHALL carry the curriculum `slug` and `url`, and a synthesized `file` value, so the entry can be mapped back to its curriculum item.

#### Scenario: Entry carries slug and url

- **WHEN** any mock outcome is logged
- **THEN** the appended practice entry includes the curriculum `slug`, the `url`, and a synthesized `file` field

### Requirement: Alias reconciliation on later real solve

When a real numbered solution is later logged via `npm run practice` and it matches a prior mock entry's slug, the system SHALL register an `aliasOf` mapping in `data/problems-meta.json` from the synthesized mock `file` to the real file, so their spaced-repetition ladders merge on the next schedule rebuild.

#### Scenario: Real solve registers the alias

- **WHEN** a real numbered file is logged that normalizes to the same problem as an existing mock-slug practice entry
- **THEN** `data/problems-meta.json` gains an `aliasOf` entry pointing the mock-slug key to the real file

#### Scenario: No matching mock entry is a no-op

- **WHEN** a real file is logged that matches no prior mock-slug entry
- **THEN** no `aliasOf` is written and logging behaves exactly as before
