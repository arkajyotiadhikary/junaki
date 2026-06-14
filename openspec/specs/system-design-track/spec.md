# system-design-track

## Purpose

Establish a System Design practice track that integrates with the existing spaced-repetition practice loop, providing a structured exercise template, track documentation, a scaffolding command, and metadata registration so design exercises flow through the same scheduler and stats as coding problems.

## Requirements

### Requirement: Design exercise template
The system SHALL provide a reusable design-exercise template at `systemdesign/_template.md` that enforces the System Design Primer's 4-step interview method and a self-review step.

#### Scenario: Template structure
- **WHEN** a contributor opens `systemdesign/_template.md`
- **THEN** it contains YAML frontmatter with `problem`, `difficulty`, `date`, `source`, and `timeboxMinutes: 45`
- **AND** it contains body sections in order: Step 1 (use cases, constraints, back-of-envelope estimates), Step 2 (high-level design), Step 3 (core components deep-dive), Step 4 (scale the design), and Self-review

#### Scenario: Step 1 estimation checklist
- **WHEN** the reader reaches Step 1
- **THEN** it includes a prompts checklist covering: who the users are, scale numbers, read/write ratio, storage estimate, and QPS estimate

#### Scenario: Scaling step justification
- **WHEN** the reader reaches Step 4
- **THEN** it lists load balancer, caching, sharding, replication, and queues
- **AND** it includes a note instructing the reader to justify each addition

#### Scenario: Self-review confidence score
- **WHEN** the reader reaches the Self-review section
- **THEN** it prompts for what was missed versus a reference solution and a confidence score from 1 to 5

### Requirement: Track documentation
The system SHALL provide `systemdesign/README.md` documenting how the track works.

#### Scenario: Documented cadence
- **WHEN** a reader opens `systemdesign/README.md`
- **THEN** it describes a 45-minute timebox solving from the blank template without references, followed by ~30 minutes comparing against a reference solution
- **AND** it links the donnemartin/system-design-primer solved exercises and the ashishps1/awesome-system-design-resources problem list
- **AND** it shows the logging command `npm run practice -- systemdesign/<slug>.md --rating=<fail|hard|good|easy>`

### Requirement: Design scaffolding command
The system SHALL provide `scripts/new-design.ts`, runnable as `npm run design -- <slug> "<Problem Title>"`, that copies the template into a new design file with frontmatter filled.

#### Scenario: Scaffold a new design
- **WHEN** a user runs `npm run design -- tinyurl "TinyURL / URL Shortener"`
- **THEN** the system creates `systemdesign/tinyurl.md` from the template
- **AND** the frontmatter `problem` is set to the given title and `date` is set to today

#### Scenario: Refuse to overwrite
- **WHEN** a user runs the command with a slug whose file already exists
- **THEN** the system does not overwrite it and reports that the file already exists

#### Scenario: Missing arguments
- **WHEN** a user runs the command without a slug or title
- **THEN** the system prints usage and exits non-zero

### Requirement: Practice-loop integration
The system SHALL register scaffolded design files in `data/problems-meta.json` so that logged designs flow through the existing scheduler and stats without warnings.

#### Scenario: Metadata registered at scaffold time
- **WHEN** `npm run design -- <slug> "<Title>"` creates a design file
- **THEN** an entry keyed by `systemdesign/<slug>.md` is added to `data/problems-meta.json` with `category: "System Design"` and the given title

#### Scenario: Design logged like any other problem
- **WHEN** a user runs `npm run practice -- systemdesign/<slug>.md --rating=good`
- **THEN** the existing logger records the entry and advances the spaced-repetition schedule for that file with no missing-metadata warning
