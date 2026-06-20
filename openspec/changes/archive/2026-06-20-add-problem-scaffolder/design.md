## Context

The repo already has two scaffolder scripts that share one shape: `scripts/new-design.ts` and `scripts/new-story.ts`. Both take a slug + title, fill a `_template.md`, write the file, register an idempotent entry in `data/problems-meta.json`, and print the `npm run practice` next step. There is no equivalent for coding problems, which is the most common thing created.

Detection of "solved" is filename-driven and lives in two places, both reusable as-is:
- `scripts/today.ts` — `nextProblemsRoundRobin()` picks the next problem(s) across platforms; `isItemDone()` and `indexPracticedFiles()` decide what's already done. `loadCurriculum()`/`loadPractice()` are private file readers.
- `scripts/solved-index.ts` — `SOLUTION_ROOTS` lists the valid folders; `scanSolvedFiles()` recurses them.
- `scripts/curriculum-sources.ts` — exports `normalizeSlug()` (strip to lowercase alphanumerics) used by both detection paths.

Key finding from the explore step: curriculum items carry a text slug (`valid-parentheses`) and url, but **no LeetCode number**. So detection fires on the normalized slug, not the number. A scaffolder that copies the curriculum slug verbatim is therefore guaranteed to match.

## Goals / Non-Goals

**Goals:**
- One command, `npm run new`, that creates a correctly-named, correctly-placed starter file.
- Bare invocation uses today's curriculum pick with its exact slug — zero typing, guaranteed detection match.
- Explicit args handle off-curriculum problems.
- Reuse existing pick/detection logic rather than re-deriving it.
- Match the look and feel of `new-design.ts` / `new-story.ts` (same metadata write, same "next step" output, same overwrite guard).

**Non-Goals:**
- No metadata research (title casing, difficulty, company tags). That stays the job of the existing `add-problem` skill, run after solving.
- No change to `today.ts`, the scheduler, or stats output.
- No network calls.
- No deletion or renaming of files.

## Decisions

**Decision: One script with a dual mode (bare vs args), not two commands.**
Bare `npm run new` = curriculum-driven; `npm run new -- <platform> <slug-or-num> "<title>"` = free-form. Rationale: a single entry point is easier to remember and mirrors how the user actually works — most days they want today's pick, occasionally something off-list. Alternative considered: separate `new:today` and `new:custom` scripts — rejected as more surface area for the same behavior.

**Decision: Reuse the exported pure functions from `today.ts`; re-read the JSON in the new script.**
`nextProblemsRoundRobin`, `isItemDone`, and `indexPracticedFiles` are already exported and pure. `loadCurriculum`/`loadPractice` are private. The new script will read `data/curriculum.json` and `data/practice.json` itself (a few lines) and feed them to the exported functions. Rationale: avoids widening `today.ts`'s public surface and keeps the pick logic single-sourced. Alternative considered: export the loaders from `today.ts` — rejected as unnecessary coupling; the file reads are trivial.

**Decision: Slug comes verbatim from the curriculum item in bare mode.**
The filename slug is the curriculum item's `slug` field, run through the same `normalizeSlug` shape the detector uses. This is the core correctness guarantee. In free-form mode the user owns the slug, normalized the same way.

**Decision: LeetCode number optional, off by default.**
Bare mode produces `leetcode/<slug>.ts` (curriculum has no number to supply). Free-form mode: if the second arg is all digits it is treated as a number prefix (`leetcode/<num>_<slug>.ts` once a title/slug is known); otherwise it is the slug. Rationale: the slug already guarantees the match; the number is human nicety, not required.

**Decision: Starter template kept minimal and platform-agnostic.**
A single `.ts` template with a title/link header comment, an exported stub function, and a `import.meta.url` self-run block — modeled on `leetcode/1_two_sum.example.ts`. Rationale: one template covers all platforms; the existing example file shows the expected shape.

**Decision: Folder placement is flat per platform by default.**
`<platform>/<slug>.ts`. The `add-problem` skill mentions nested GFG folders (`geeksforgeeks/<topic>/<slug>.ts`), but `scanSolvedFiles` recurses and matches on slug regardless of nesting, so flat placement detects fine. A topic subfolder can be an optional later enhancement, not required for correctness.

## Risks / Trade-offs

- **Free-form slug still mistypeable** → In free-form mode the user can still type a slug that doesn't normalize-match a curriculum item. Mitigation: that path is for off-curriculum problems where there is no curriculum entry to match anyway; bare mode (the common path) removes the guesswork entirely.
- **Bare-mode pick must mirror `today` exactly** → If the two ever diverge, the scaffolded file could differ from what the user was told to do. Mitigation: reuse the same exported `nextProblemsRoundRobin`/`isItemDone` functions rather than copying the logic.
- **Metadata is a stub until enriched** → The registered entry has placeholder difficulty/category. Mitigation: this matches `new-design.ts`/`new-story.ts` behavior; the `add-problem` skill enriches it after solving. Print a reminder in the output.
- **Weekend bare mode is ambiguous** → `today` shows 2 picks on weekends. Mitigation: fall back to the numbered chooser when more than one pick resolves.

## Migration Plan

Additive only. New script + one `package.json` entry + one template file + README note. No data migration, no rollback concern — deleting the script and the package.json line fully reverts it.

## Open Questions

- Should free-form mode also accept a full LeetCode URL (e.g. paste the problem link) and derive platform + slug from it? Reasonable later enhancement; not required for the first version.
- Should the starter template differ per platform (e.g. a class stub for design-flavored problems)? Defaulting to one shared template for now.
