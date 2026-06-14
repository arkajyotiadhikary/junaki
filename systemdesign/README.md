# System Design Track

System design often outweighs coding at mid/senior MAANG loops. This track makes designs
first-class spaced-repetition items: you re-do a design from a blank page (retrieval practice)
on the same `practice` → `schedule` → `today` loop as coding problems.

## Weekly cadence

1. **Scaffold** a new exercise:
   ```bash
   npm run design -- <slug> "<Problem Title>"
   # e.g. npm run design -- tinyurl "TinyURL / URL Shortener"
   ```
   This copies `_template.md` into `systemdesign/<slug>.md` and registers it in
   `data/problems-meta.json` (`category: "System Design"`).

2. **Solve it — 45-minute timebox, from the blank template, WITHOUT references.**
   Work through the 4 steps in order:
   1. Use cases, constraints, back-of-envelope estimates
   2. High-level design
   3. Core components deep-dive (data model + API)
   4. Scale it (LB, caching, sharding, replication, queues — justify each)

3. **Compare — ~30 minutes against a reference solution**, then fill in the **Self-review**
   section (what you missed, what differed, a 1–5 confidence score). Reference sources:
   - System Design Primer solved exercises: https://github.com/donnemartin/system-design-primer#system-design-interview-questions-with-solutions
   - Awesome System Design Resources problem list: https://github.com/ashishps1/awesome-system-design-resources

4. **Log** the session so it enters the spaced-repetition schedule:
   ```bash
   npm run practice -- systemdesign/<slug>.md --rating=<fail|hard|good|easy>
   ```
   `fail` resets the interval, `hard` repeats it, `good` advances one rung, `easy` advances two.
   The next due date shows up in `npm run today`.

## Notes

- `_template.md` is the source template — don't log it; copy it via `npm run design`.
- Problem source ladder (Easy → Medium → Hard) lives in `data/curriculum.json` as
  `kind: "design"` / `kind: "reading"` items.
