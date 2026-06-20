# problem-scaffolder

## Purpose

Provide a CLI command (`npm run new`) that creates a correctly-named, correctly-located starter solution file for a coding problem — either from today's curriculum pick or from explicit arguments — and registers its metadata, so the rest of the system (`today.ts`, the scheduler, stats) detects it without manual filename guesswork.

## Requirements

### Requirement: Scaffold today's suggested problem from the curriculum

When run with no arguments, the command SHALL create a starter solution file for the coding problem that `npm run today` would suggest, taking the slug verbatim from the matching `data/curriculum.json` item so that detection in `today.ts` matches the file to its curriculum entry.

#### Scenario: Single suggested problem

- **WHEN** the user runs `npm run new` with no arguments and the curriculum resolves to exactly one next unsolved problem
- **THEN** the command creates a starter file under that problem's platform folder using the curriculum item's slug
- **AND** the file's normalized slug matches the curriculum item's slug (so `today.ts` counts it as done once practiced)
- **AND** the command prints the created path and the `npm run practice -- <path> --rating=<fail|hard|good|easy>` next step

#### Scenario: Multiple or zero suggested problems

- **WHEN** the user runs `npm run new` with no arguments and the curriculum resolves to more than one next problem (e.g. weekend) or no next problem
- **THEN** the command SHALL present a numbered list of the next unsolved curriculum problems and let the user pick one
- **AND** if no unsolved problems remain, the command SHALL print a clear message and exit without creating a file

### Requirement: Scaffold an off-curriculum problem from arguments

The command SHALL accept explicit arguments `<platform> <slug-or-number> "<Title>"` to create a starter file for a problem that is not in the curriculum.

#### Scenario: LeetCode problem with a number

- **WHEN** the user runs `npm run new -- leetcode 704 "Binary Search"`
- **THEN** the command creates `leetcode/704_binary_search.ts` from the starter template with the title filled in

#### Scenario: Non-LeetCode platform

- **WHEN** the user runs `npm run new -- geeksforgeeks kadanes-algorithm "Kadane's Algorithm"`
- **THEN** the command creates `geeksforgeeks/kadanes_algorithm.ts` from the starter template

#### Scenario: Unknown platform rejected

- **WHEN** the user passes a platform that is not one of the known solution roots (`leetcode`, `geeksforgeeks`, `hackerrank`, `interviewbit`)
- **THEN** the command SHALL exit with a non-zero status and print the list of valid platforms

### Requirement: Produce correct, detection-compatible file paths

Every file the command creates SHALL live in a recognized solution-root folder and carry a normalized slug, so that `solved-index.ts` and `today.ts` can detect it. The leading numeric prefix SHALL be optional.

#### Scenario: Slug normalization

- **WHEN** a title or raw slug contains spaces, capitals, or punctuation (e.g. `"Valid Parentheses"`, `Kadane's Algorithm`)
- **THEN** the generated filename uses a lowercased, underscore-or-hyphen-separated slug containing only letters, digits, and separators

#### Scenario: LeetCode number is optional

- **WHEN** a LeetCode problem is scaffolded without a number
- **THEN** the file is named `leetcode/<slug>.ts` with no numeric prefix, and detection still matches via the normalized slug
- **AND** when a number is supplied, the file is named `leetcode/<number>_<slug>.ts`

### Requirement: Register metadata and never overwrite existing work

The command SHALL register an entry in `data/problems-meta.json` for the new file (idempotent — leaving an existing entry unchanged) and SHALL refuse to overwrite an existing solution file.

#### Scenario: Metadata registered for a new file

- **WHEN** the command creates a new solution file
- **THEN** it adds a `problems` entry keyed by the repo-relative path with at least `title`, `difficulty`, `category`, `patterns`, and `companies` fields
- **AND** if an entry for that path already exists, it leaves the entry unchanged

#### Scenario: Existing file is protected

- **WHEN** the target solution file already exists on disk
- **THEN** the command SHALL exit with a non-zero status and print that it will not overwrite, without modifying the file or the metadata
