## Context

The repo already has a working spaced-repetition coding loop: `log-practice.ts` appends to `data/practice.json` and calls `updateScheduleForReview`, which maintains `data/schedule.json`; `today.ts` surfaces due reviews and the next curriculum item; `generate-svg.ts` renders stats. `data/curriculum.json` already contains `kind: "design"|"reading"` items that *point at* a design track that does not exist yet. This change builds that track.

Key existing-code facts that constrain the design (from `scripts/log-practice.ts`):
- The logger **requires the target file to exist** (`existsSync` check) before logging.
- The logger **warns** when a file has no `data/problems-meta.json` entry, but still logs.
- The rating flag syntax is `--rating=<value>` (with `=`), not a space-separated `--rating <value>`.

## Goals / Non-Goals

**Goals:**
- A markdown design track that reuses the existing practice/schedule/stats loop with **zero changes** to those scripts.
- A one-command scaffold (`npm run design`) so creating a new exercise needs no manual file copying or metadata editing.
- Designs become first-class spaced-repetition items (re-doing a design from a blank page is retrieval practice).

**Non-Goals:**
- No web UI, no database, no diagram tooling — ASCII / Excalidraw links in markdown only.
- No new runtime dependencies; strict TS via `tsx`.
- Not modifying `log-practice.ts`, `schedule.ts`, `today.ts`, or `generate-svg.ts`. The track adapts to them, not the reverse.

## Decisions

**1. Register metadata at scaffold time, not log time.**
`new-design.ts` writes the `data/problems-meta.json` entry (`category: "System Design"`) when it creates the file. Alternative considered: modify `log-practice.ts` to auto-register. Rejected because it widens the blast radius into shared code and the logger explicitly warns-but-proceeds by design. Scaffolding-time registration means the missing-metadata warning never fires for designs, and the shared logger stays untouched.

**2. Slug-based filenames, title in frontmatter.**
`systemdesign/<slug>.md` keys everything (practice entries, schedule, metadata) off the slug, matching how `leetcode/...` files key the existing system. The human-readable title lives in frontmatter `problem` and in metadata `title`.

**3. Template enforces the verified 4-step Primer method.**
The body sections mirror the research-verified interview structure (use cases/constraints/estimates → high-level → components → scale), so practicing the template trains the actual interview shape. This is content, not logic — kept in `_template.md` so it can be edited without touching code.

**4. Idempotent, refuse-to-overwrite scaffold.**
If `systemdesign/<slug>.md` exists, the command refuses and exits non-zero, protecting in-progress work. Metadata registration is also idempotent (skip if the key already exists).

## Risks / Trade-offs

- **Metadata file format drift** → `new-design.ts` reads, mutates the `problems` object, and rewrites with the same 2-space + trailing-newline formatting the other scripts use, to keep diffs clean and avoid corrupting the file.
- **`_template.md` is itself a `.md` file under `systemdesign/`** → stats/track counts must exclude the underscore-prefixed template and `README.md`. The scaffold and any counting logic ignore files starting with `_` and `README.md`.
- **Rating-syntax mismatch in the source plan** → the plan's prose shows `--rating good`; the real logger uses `--rating=good`. The README and template document the **actual** `--rating=` syntax to avoid teaching a broken command.

## Migration Plan

Additive only. New files plus a `"design"` script in `package.json`. No data migration; existing `practice.json`/`schedule.json` are untouched until the first design is logged. Rollback = delete the new files and the `design` script line.

## Open Questions

- None blocking. Whether to backfill `problems-meta.json` for the `kind: "design"` items already in `curriculum.json` is deferred — those entries get registered naturally the first time each is scaffolded.
