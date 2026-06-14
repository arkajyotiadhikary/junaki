## Context

The repo already has a working spaced-repetition loop: `log-practice.ts` appends to `data/practice.json` and calls `updateScheduleForReview`, which maintains `data/schedule.json`; `today.ts` surfaces due reviews; `generate-svg.ts` renders stats. `new-design.ts` is the precedent for a "track scaffold" command. This change adds a behavioral-story track that reuses the same loop.

Key existing-code facts that constrain the design (from `scripts/log-practice.ts` / `scripts/schedule.ts`):
- The logger **requires the target file to exist** (`existsSync` check) before logging.
- The logger **warns** when a file has no `data/problems-meta.json` entry, but still logs.
- The rating flag syntax is `--rating=<value>` (with `=`), and the only valid values are `fail | hard | good | easy` — these four drive the interval ladder. There is no numeric rating.

## Goals / Non-Goals

**Goals:**
- A markdown behavioral track that reuses the existing practice/schedule/stats loop with **zero changes** to those scripts.
- A one-command scaffold (`npm run story`) so creating a new story needs no manual file copying or metadata editing.
- A **generated** coverage matrix so the README never silently drifts and the ≥2-per-column goal is machine-checked.
- Stories become first-class spaced-repetition items (re-telling a story from frontmatter cues is retrieval practice).

**Non-Goals:**
- No web UI, no database. Markdown + small TS scripts only.
- No new runtime dependencies; strict TS via `tsx`.
- Not modifying `log-practice.ts`, `schedule.ts`, `today.ts`, or `generate-svg.ts`. The track adapts to them, not the reverse.

## Decisions

**1. Reuse the four-bucket `--rating=` logger as-is; keep `strength` separate.**
Drilling logs `npm run practice -- behavioral/stories/<slug>.md --rating=good`. The `strength: 1-5` field in story frontmatter is a **separate, hand-edited** self-assessment, NOT a logger argument. Alternative considered: extend `log-practice.ts` to accept a numeric `--rating=<1-5>` and map it onto the four buckets. Rejected — it widens the blast radius into shared, tested code for no real gain. The source plan's `--rating <r>` prose is corrected to the actual `--rating=<fail|hard|good|easy>` syntax everywhere it appears.

**2. Generate the coverage matrix from frontmatter, don't hand-maintain it.**
`scripts/story-matrix.ts` reads each `behavioral/stories/*.md` (excluding `_template.md`), parses `principles[]`/`themes[]` from frontmatter, and rewrites the matrix region of `behavioral/README.md` between `<!-- MATRIX:START -->` / `<!-- MATRIX:END -->` markers. Columns with fewer than 2 covering stories are flagged. Single source of truth = the story files; the README table is derived. The matrix uses abbreviated column headers (e.g. `CO`, `OW`) with a legend, because 16 LPs + 6 themes = 22 columns.

**3. Register metadata at scaffold time, not log time.**
`new-story.ts` writes the `data/problems-meta.json` entry (`category: "Behavioral"`) when it creates the file, mirroring `new-design.ts`. This means the logger's missing-metadata warning never fires for stories, and the shared logger stays untouched.

**4. `difficulty` for stories is cosmetic — stats never reads it.**
`generate-svg.ts` walks only the coding `PORTALS` (`leetcode`, `geeksforgeeks`, `hackerrank`, `interviewbit`) — it scans those *directories*, not the `problems-meta.json` keys. So `behavioral/` (like `systemdesign/`) is never read by stats. The metadata entry's only runtime purpose is to silence `log-practice.ts`'s missing-metadata warning and let the scheduler track the file. The `difficulty` field is therefore cosmetic; `new-story.ts` registers `difficulty: "N/A"` to be honest (behavioral stories have no difficulty), and nothing breaks because no consumer reads it.

**5. Slug-based filenames, title in frontmatter.**
`behavioral/stories/<slug>.md` keys everything (practice entries, schedule, metadata) off the slug, matching how `leetcode/...` and `systemdesign/...` files work. The human-readable title lives in frontmatter `title` and metadata `title`.

**6. `lastDrilled` is seeded, not script-maintained.**
The scaffold seeds `lastDrilled: never`. The real "last reviewed" source of truth is `practice.json` / `today.ts`; the frontmatter field is a human convenience and is not written by the logger (which never edits markdown).

**7. Coverage strategy: seed 12 archetype rows.**
The README ships with 12 suggested story archetypes (e.g. "owned an outage", "disagreed with manager", "shipped under deadline") pre-mapped so coverage is already ≥2 per column. The user swaps in real specifics. This turns the matrix into a coverage *plan*, not a blank grid.

## Risks / Trade-offs

- **Metadata file format drift** → `new-story.ts` reads, mutates the `problems` object, and rewrites with the same 2-space + trailing-newline formatting the other scripts use, to keep diffs clean.
- **Matrix markers missing/edited** → `story-matrix.ts` errors clearly if the `<!-- MATRIX:START/END -->` markers are absent rather than corrupting the README.
- **`_template.md` is a `.md` file under `stories/`** → the matrix generator and any counting logic exclude underscore-prefixed files.
- **22-column matrix width** → mitigated with abbreviated headers + a legend; the raw markdown stays readable in a monospace editor.

## Migration Plan

Additive only. New files plus two `package.json` scripts. No data migration; `practice.json`/`schedule.json` are untouched until the first story is logged. Rollback = delete the new files and the two script lines.

## Open Questions

- None blocking. Whether to wire the matrix generator into a git hook (auto-regenerate on commit) is deferred; for now it is a manual `npm run story:matrix`.
