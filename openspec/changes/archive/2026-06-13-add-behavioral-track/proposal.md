## Why

The repo has a coding loop (`practice` → `schedule` → `today`) and now a system design track, but **no behavioral track** — even though Amazon weights its 16 Leadership Principles heavily (a bar raiser can veto an offer on behavioral signal alone) and Meta runs a dedicated behavioral round on its core values. As a working developer my stories come from real work, but there is no structured way to bank them, ensure every Leadership Principle and common theme is covered, or fold story drilling into the same spaced-repetition loop as coding problems.

## What Changes

- Add a `behavioral/` content directory with a story template (`stories/_template.md`) enforcing the STAR(L) format (Situation, Task, Action, Result, Learning) with per-section target-length notes and a "60-second spoken version".
- Add `behavioral/README.md` explaining STAR(L) and containing a **generated** coverage matrix: rows = stories, columns = Amazon's 16 Leadership Principles + 6 common themes (conflict, failure, deadline, ambiguity, influence without authority, deep technical dive), with a ≥2-stories-per-column goal.
- Add `behavioral/questions.md` with 30 high-frequency behavioral questions grouped by theme, each tagged with the Leadership Principles it probes.
- Add `scripts/new-story.ts` (`npm run story -- <slug> "<Title>"`) to scaffold a dated story file from the template and register it in `data/problems-meta.json`.
- Add `scripts/story-matrix.ts` (`npm run story:matrix`) to rebuild the README coverage matrix from each story's `principles[]`/`themes[]` frontmatter and flag any column covered by fewer than 2 stories.
- Drilling a story is logged via the **existing** `npm run practice -- behavioral/stories/<slug>.md --rating=<fail|hard|good|easy>` loop — no changes to the logger or scheduler.

## Capabilities

### New Capabilities
- `behavioral-track`: A markdown-based behavioral-interview practice track with a STAR(L) story template, a 30-question bank tagged by Leadership Principle, a scaffolding CLI, a generated coverage matrix, and integration into the existing practice/schedule/stats loop so story drills become first-class spaced-repetition items.

### Modified Capabilities
<!-- No existing spec-level requirements change. The practice logger and scheduler already accept arbitrary file paths + ratings; this change only adds a new file kind and a metadata category, which are additive. -->

## Impact

- **New files:** `behavioral/README.md`, `behavioral/questions.md`, `behavioral/stories/_template.md`, `scripts/new-story.ts`, `scripts/story-matrix.ts`.
- **Modified:** `package.json` (add `"story"` and `"story:matrix"` scripts), `data/problems-meta.json` (new `category: "Behavioral"` entries appear when a story is scaffolded).
- **Reused unchanged:** `scripts/log-practice.ts`, `scripts/schedule.ts`, `scripts/today.ts`, `scripts/generate-svg.ts` — stories use the same `--rating=` loop and interval ladder.
- **Constraints:** dependency-free, strict TS, `tsx` runner, match existing minimal repo conventions. No web UI, no DB.
