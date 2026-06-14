## 1. Template content

- [x] 1.1 Create `systemdesign/_template.md` with YAML frontmatter (`problem`, `difficulty`, `date`, `source`, `timeboxMinutes: 45`)
- [x] 1.2 Add Step 1 section (use cases, constraints, back-of-envelope estimates) with a prompts checklist: users, scale numbers, read/write ratio, storage estimate, QPS estimate
- [x] 1.3 Add Step 2 (high-level design, ASCII/Excalidraw-link placeholder), Step 3 (core components: data model + API sketch), and Step 4 (scale it: LB, caching, sharding, replication, queues + "justify each addition" note)
- [x] 1.4 Add Self-review section: what I missed vs reference + 1–5 confidence score

## 2. Scaffolding command

- [x] 2.1 Create `scripts/new-design.ts`: parse `<slug>` and `"<Title>"` args; print usage and exit non-zero if missing
- [x] 2.2 Refuse to overwrite an existing `systemdesign/<slug>.md` (report and exit non-zero)
- [x] 2.3 Copy `_template.md` into `systemdesign/<slug>.md`, filling frontmatter `problem` (title) and `date` (today, ISO date)
- [x] 2.4 Register an entry keyed `systemdesign/<slug>.md` in `data/problems-meta.json` with `category: "System Design"` and the title; idempotent (skip if key exists); preserve 2-space + trailing-newline formatting
- [x] 2.5 Add `"design": "tsx scripts/new-design.ts"` to `package.json` scripts

## 3. Documentation

- [x] 3.1 Create `systemdesign/README.md`: weekly cadence (45-min blank-template timebox, then ~30-min reference comparison), links to donnemartin/system-design-primer solved exercises + ashishps1/awesome-system-design-resources, and the `npm run practice -- systemdesign/<slug>.md --rating=<fail|hard|good|easy>` logging command

## 4. Verification

- [x] 4.1 Run `npm run design -- tinyurl "TinyURL / URL Shortener"`; confirm `systemdesign/tinyurl.md` is created with filled frontmatter and a `problems-meta.json` entry appears
- [x] 4.2 Re-run the same command; confirm it refuses to overwrite and does not duplicate the metadata entry
- [x] 4.3 Run `npm run practice -- systemdesign/tinyurl.md --rating=good`; confirm it logs with no missing-metadata warning and `schedule.json` updates
- [x] 4.4 Run `npm test` to confirm existing scheduler/today assertions still pass
