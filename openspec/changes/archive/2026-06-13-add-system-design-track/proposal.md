## Why

The repo has a coding-problem loop (`practice` → `schedule` → `today`) but **no system design track**, even though for mid/senior MAANG loops system design often carries more weight than coding (verified 3-0 in the v2 research plan). There is no structured way to practice designs from a blank page, time-box them, or fold them into the same spaced-repetition loop as coding problems.

## What Changes

- Add a `systemdesign/` content directory with a design-exercise template (`_template.md`) enforcing the System Design Primer's verified 4-step interview method (use cases/constraints/estimates → high-level design → core components → scale it) plus a back-of-envelope estimates checklist and a self-review confidence score.
- Add `systemdesign/README.md` documenting the weekly cadence: 45-min timebox from a blank template (no references), then 30-min comparison against a reference solution, then log via the existing `npm run practice` logger.
- Add `scripts/new-design.ts` (`npm run design -- <slug> "<Title>"`) to scaffold a new dated design file from the template.
- Register logged design files into `data/problems-meta.json` with `category: "System Design"` so designs flow through the existing scheduler and stats unchanged.

## Capabilities

### New Capabilities
- `system-design-track`: A markdown-based system design practice track with a 4-step exercise template, a scaffolding CLI command, and integration into the existing practice/schedule/stats loop so designs become first-class spaced-repetition items.

### Modified Capabilities
<!-- No existing spec-level requirements change. The practice logger and scheduler already accept arbitrary file paths + ratings; this change only adds a new file kind and a metadata category, which are additive. -->

## Impact

- **New files:** `systemdesign/_template.md`, `systemdesign/README.md`, `scripts/new-design.ts`.
- **Modified:** `package.json` (add `"design"` script), `data/problems-meta.json` (new `category: "System Design"` entries appear when a design is logged).
- **Reused unchanged:** `scripts/log-practice.ts`, `scripts/schedule.ts`, `scripts/today.ts`, `scripts/generate-svg.ts` — designs use the same `--rating` loop. `data/curriculum.json` already carries `kind: "design"|"reading"` items that point at this track.
- **Constraints:** dependency-free, strict TS, `tsx` runner, match existing minimal repo conventions. No web UI, no DB.
