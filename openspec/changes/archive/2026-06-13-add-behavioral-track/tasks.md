## 1. Story template

- [x] 1.1 Create `behavioral/stories/_template.md` with YAML frontmatter (`title`, `principles: []`, `themes: []`, `strength` 1–5, `lastDrilled`)
- [x] 1.2 Add STAR(L) body sections in order (Situation, Task, Action, Result, Learning), each with a 2–3 sentence target-length note
- [x] 1.3 Add a "60-second spoken version" section for the condensed verbal answer

## 2. Documentation and question bank

- [x] 2.1 Create `behavioral/README.md`: explain STAR(L), document the 16 Amazon Leadership Principles + 6 themes (conflict, failure, deadline, ambiguity, influence without authority, deep technical dive), the ≥2-stories-per-column goal, the `<!-- MATRIX:START -->`/`<!-- MATRIX:END -->` markers, and the `npm run practice -- behavioral/stories/<slug>.md --rating=<fail|hard|good|easy>` logging command
- [x] 2.2 Seed the README with 12 archetype story rows pre-mapped so coverage is ≥2 per column
- [x] 2.3 Create `behavioral/questions.md` with 30 questions grouped by theme, each tagged with the Leadership Principles it probes

## 3. Scaffolding command

- [x] 3.1 Create `scripts/new-story.ts`: parse `<slug>` and `"<Title>"`; print usage and exit non-zero if missing
- [x] 3.2 Refuse to overwrite an existing `behavioral/stories/<slug>.md` (report and exit non-zero)
- [x] 3.3 Copy `_template.md` into `behavioral/stories/<slug>.md`, filling frontmatter `title`
- [x] 3.4 Register an entry keyed `behavioral/stories/<slug>.md` in `data/problems-meta.json` with `category: "Behavioral"` and the title; idempotent; preserve 2-space + trailing-newline formatting
- [x] 3.5 Add `"story": "tsx scripts/new-story.ts"` to `package.json` scripts

## 4. Coverage matrix generator

- [x] 4.1 Create `scripts/story-matrix.ts`: read `principles[]`/`themes[]` frontmatter from every `behavioral/stories/*.md` except `_template.md`
- [x] 4.2 Rebuild the matrix between the README markers (abbreviated column headers + legend), and flag any column with fewer than 2 covering stories
- [x] 4.3 Error clearly if the README markers are absent (do not corrupt the file)
- [x] 4.4 Add `"story:matrix": "tsx scripts/story-matrix.ts"` to `package.json` scripts

## 5. Verification

- [x] 5.1 Run `npm run story -- disagreed-mgr "Disagreed with my manager on retry strategy"`; confirm the file is created with filled frontmatter and a `problems-meta.json` entry with `category: "Behavioral"` appears
- [x] 5.2 Re-run the same command; confirm it refuses to overwrite and does not duplicate the metadata entry
- [x] 5.3 Run `npm run story:matrix`; confirm the README matrix region is rebuilt and under-covered columns are flagged
- [x] 5.4 Run `npm run practice -- behavioral/stories/disagreed-mgr.md --rating=good`; confirm it logs with no missing-metadata warning and `schedule.json` updates
- [x] 5.5 Run `npm run stats` and `npm test`; confirm stats still render without error (the `Behavioral` category is intentionally absent — stats only scans coding portals) and existing scheduler/today assertions still pass
