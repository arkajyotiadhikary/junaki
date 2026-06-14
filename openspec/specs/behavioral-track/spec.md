# behavioral-track

## Purpose

Establish a Behavioral interview practice track that integrates with the existing spaced-repetition practice loop, providing a STAR(L) story template, track documentation with a Leadership Principle / theme coverage matrix, a tagged question bank, scaffolding and matrix-generation commands, and metadata registration so behavioral story drills flow through the same scheduler and stats as coding problems.

## Requirements

### Requirement: Story template
The system SHALL provide a reusable story template at `behavioral/stories/_template.md` that enforces the STAR(L) format with a condensed spoken version.

#### Scenario: Template frontmatter
- **WHEN** a contributor opens `behavioral/stories/_template.md`
- **THEN** it contains YAML frontmatter with `title`, `principles: []`, `themes: []`, `strength` (1–5), and `lastDrilled`

#### Scenario: STAR(L) body sections
- **WHEN** the reader reads the template body
- **THEN** it contains sections in order: Situation, Task, Action, Result, Learning
- **AND** each section includes a target-length note of 2–3 sentences

#### Scenario: 60-second spoken version
- **WHEN** the reader reaches the end of the template
- **THEN** it includes a "60-second spoken version" section for rehearsing the condensed verbal answer

### Requirement: Track documentation and coverage matrix
The system SHALL provide `behavioral/README.md` that explains STAR(L) and contains a coverage matrix.

#### Scenario: STAR(L) explained
- **WHEN** a reader opens `behavioral/README.md`
- **THEN** it explains each letter of STAR(L): Situation, Task, Action, Result, Learning
- **AND** it shows the logging command `npm run practice -- behavioral/stories/<slug>.md --rating=<fail|hard|good|easy>`

#### Scenario: Coverage matrix columns
- **WHEN** a reader views the coverage matrix
- **THEN** its columns include Amazon's 16 Leadership Principles and the 6 themes: conflict, failure, deadline, ambiguity, influence without authority, deep technical dive
- **AND** it documents the goal that every column is covered by at least 2 stories

### Requirement: Question bank
The system SHALL provide `behavioral/questions.md` with high-frequency behavioral questions tagged by Leadership Principle.

#### Scenario: Questions grouped and tagged
- **WHEN** a reader opens `behavioral/questions.md`
- **THEN** it contains at least 30 questions grouped by theme
- **AND** each question is tagged with the Leadership Principles it probes

### Requirement: Story scaffolding command
The system SHALL provide `scripts/new-story.ts`, runnable as `npm run story -- <slug> "<Title>"`, that copies the template into a new story file with frontmatter filled.

#### Scenario: Scaffold a new story
- **WHEN** a user runs `npm run story -- disagreed-mgr "Disagreed with my manager on X"`
- **THEN** the system creates `behavioral/stories/disagreed-mgr.md` from the template
- **AND** the frontmatter `title` is set to the given title

#### Scenario: Refuse to overwrite
- **WHEN** a user runs the command with a slug whose file already exists
- **THEN** the system does not overwrite it and reports that the file already exists

#### Scenario: Missing arguments
- **WHEN** a user runs the command without a slug or title
- **THEN** the system prints usage and exits non-zero

### Requirement: Coverage matrix generation
The system SHALL provide `scripts/story-matrix.ts`, runnable as `npm run story:matrix`, that rebuilds the README coverage matrix from story frontmatter.

#### Scenario: Matrix generated from frontmatter
- **WHEN** a user runs `npm run story:matrix`
- **THEN** the system reads `principles[]` and `themes[]` from every `behavioral/stories/*.md` except `_template.md`
- **AND** it rewrites the matrix region of `behavioral/README.md` between the `<!-- MATRIX:START -->` and `<!-- MATRIX:END -->` markers

#### Scenario: Under-covered columns flagged
- **WHEN** the generated matrix has a column covered by fewer than 2 stories
- **THEN** the output flags that column as under-covered

### Requirement: Practice-loop integration
The system SHALL register scaffolded story files in `data/problems-meta.json` so logged drills flow through the existing scheduler and stats without warnings.

#### Scenario: Metadata registered at scaffold time
- **WHEN** `npm run story -- <slug> "<Title>"` creates a story file
- **THEN** an entry keyed by `behavioral/stories/<slug>.md` is added to `data/problems-meta.json` with `category: "Behavioral"` and the given title

#### Scenario: Story logged like any other problem
- **WHEN** a user runs `npm run practice -- behavioral/stories/<slug>.md --rating=good`
- **THEN** the existing logger records the entry and advances the spaced-repetition schedule for that file with no missing-metadata warning
