## ADDED Requirements

### Requirement: Curriculum file structure
The system SHALL provide a `data/curriculum.json` file that parses as JSON and conforms to the shape `{ startDate: string, phases: Phase[], items: Item[] }`, where `Phase` is `{ id, name, weeks, focus }` and `Item` is `{ slug, url, title, pattern, difficulty, phase, kind }`.

#### Scenario: File parses
- **WHEN** `data/curriculum.json` is read with `JSON.parse`
- **THEN** parsing succeeds and the result has a string `startDate`, a non-empty `phases` array, and a non-empty `items` array

#### Scenario: startDate is the planned start
- **WHEN** the `startDate` field is inspected
- **THEN** it equals `2026-06-15`

### Requirement: Phase definitions
The curriculum SHALL define exactly 6 phases with `id` values `1` through `6`, each carrying a `name`, a `weeks` range, and a `focus` string, collectively spanning weeks 1–26.

#### Scenario: Six phases covering 26 weeks
- **WHEN** the `phases` array is inspected
- **THEN** there are 6 phases with ids 1..6, and their `weeks` ranges are contiguous and cover weeks 1 through 26 with no gaps or overlaps

#### Scenario: Phase focus matches the plan
- **WHEN** phase 1 and phase 2 are inspected
- **THEN** phase 1 focus covers Stack/Queue/Recursion/Linked List/Binary Search and phase 2 focus covers Trees/Heap/Trie

### Requirement: Item field validity
Every item SHALL have a non-empty `slug`, a `kind` in `{ problem, design, reading, behavioral }`, a `phase` matching an existing phase id, and a `difficulty` in `{ Easy, Medium, Hard }` for `problem` and `design` items.

#### Scenario: Valid kind and phase
- **WHEN** any item is inspected
- **THEN** its `kind` is one of `problem | design | reading | behavioral` and its `phase` is an integer present in the `phases` array

#### Scenario: Problem items have a real LeetCode URL
- **WHEN** any item with `kind: "problem"` is inspected
- **THEN** its `url` is a `https://leetcode.com/problems/<slug>/...` URL and its `difficulty` is one of `Easy | Medium | Hard`

### Requirement: Unique slugs
All item `slug` values SHALL be unique across the curriculum so downstream tools can key on slug without collision.

#### Scenario: No duplicate slugs
- **WHEN** the set of all item `slug` values is compared to the list of all item `slug` values
- **THEN** the count of unique slugs equals the total item count

### Requirement: Excludes already-solved problems
The curriculum SHALL NOT include problems the user has already solved, per the exclusion list in the plan (Two Sum I/II, 3Sum, Sort Colors, Rotate Array, Best Time to Buy and Sell Stock, Maximum Subarray, Valid Anagram, Minimum Size Subarray Sum, Container With Most Water, Majority Element, Climbing Stairs, Longest Substring Without Repeating Characters, Add Binary, Valid Triangle Number).

#### Scenario: Solved problems absent
- **WHEN** the item slugs are checked against the excluded-problem list
- **THEN** none of the excluded problems appear as `problem` items

### Requirement: Pattern coverage and volume
The curriculum SHALL contain between 110 and 130 `problem` items, and SHALL include problem items for each of the 8 previously-uncovered patterns: Recursion, Backtracking, Stack, Queue, Tree (DFS/BFS), Graph (DFS/BFS), Heap, and Trie.

#### Scenario: Volume target met
- **WHEN** the `problem`-kind items are counted
- **THEN** the count is between 110 and 130 inclusive

#### Scenario: All gap patterns represented
- **WHEN** the `pattern` field of `problem` items is aggregated
- **THEN** at least one problem exists for each of the 8 gap patterns

#### Scenario: At least one Hard per major pattern
- **WHEN** problem difficulties are grouped by pattern for the gap patterns
- **THEN** the curriculum contains Hard problems (the prior state had zero Hard)

### Requirement: Weekly system-design and reading interleave
The curriculum SHALL include `reading` items for System Design Primer sections across weeks 1–8 and `design` items from the graded ladder from week 9 onward, with roughly one design/reading item per week.

#### Scenario: Early reading items
- **WHEN** `reading`-kind items are inspected
- **THEN** they reference System Design Primer sections and are assigned to phases covering weeks 1–8

#### Scenario: Later design ladder
- **WHEN** `design`-kind items are inspected
- **THEN** they begin from week 9 onward and ramp Easy → Medium → Hard (e.g. TinyURL/Pastebin/rate-limiter Easy first, Uber-class Hard last)

### Requirement: Phase 5 behavioral items
The curriculum SHALL include `behavioral`-kind items within phase 5, approximately one per week.

#### Scenario: Behavioral items in phase 5
- **WHEN** `behavioral`-kind items are inspected
- **THEN** each has `phase: 5`

### Requirement: Documentation of phase logic
The change SHALL provide a short note under `docs/` explaining the phase structure and how `data/curriculum.json` is consumed.

#### Scenario: Docs note exists
- **WHEN** the `docs/` directory is inspected after the change
- **THEN** a markdown note describing the curriculum phases and consumption by `today`/`mock`/stats is present
