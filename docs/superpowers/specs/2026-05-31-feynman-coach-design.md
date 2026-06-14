# Feynman Coach — Design Spec

**Date:** 2026-05-31
**Status:** Approved design, pre-implementation
**Artifact:** A new Claude Code skill at `.claude/skills/feynman-coach/SKILL.md`, invoked as `/feynman-coach`.

## Purpose

Most DSA tools test whether you can *produce* a solution. This one tests whether you
truly *understand* it. The user teaches a previously-solved problem to a confused-junior
persona; the coach's naive-but-pointed questions expose exactly where understanding is
fuzzy. Principle: *if you can't explain it simply, you don't own it.*

It complements the existing `review-problem` skill (which tests re-solving) by testing
explanation and justification instead.

## Core principle: ground truth is Claude's knowledge, not the user's file

The user's stored `.ts` solutions were written as practice and may contain bugs or be
suboptimal. The coach therefore treats them as **specimens to examine, not answer keys.**

- The coach independently determines the correct/optimal approach from its own DSA
  knowledge. The user's understanding is graded against **that**, never against their file.
- The stored file is read only to know (a) what the user actually wrote, (b) whether it
  has bugs / could be improved, and (c) whether the user's spoken explanation matches
  their own code.
- This prevents the failure mode the user flagged: a coach that validates buggy code and
  reinforces wrong practice.

## Three pillars

1. **Knowledge is truth, file is a specimen** — see above.
2. **Socratic-trap bugs, don't reveal them** — when the stored solution has a bug, the
   coach steers probing so the user discovers it themselves (e.g. "walk me through
   `[1,1,2]`"), rather than pointing it out. The gap surfaces itself.
3. **Obsidian-style markdown notes as the record** — every session is captured as
   human-readable, Dataview-queryable markdown notes (no JSON). One note per question
   thread, plus a session summary. This is both a study artifact *and* the data asset for
   future tooling (trend tables, a weakness analyzer, or seeding the next session's focus).

## Locked behavioral decisions

| Decision | Choice |
|---|---|
| Buggy stored solution | **Trap, then offer fix** — Socratically lead the user to discover it during the session; at the end, confirm it and offer a *separate* follow-up to patch the file. Coaching never silently edits code. |
| Persona & push intensity | **Masked + relentless-on-one** — plays a curious junior during the session, drops the act for an honest report at the end. Pushes "why" 3–4 levels deep on the single most important spot; gentle elsewhere. Target ~10 min. |
| End-of-session report | **Rubric (1–5)** on Clarity / Justified-the-why / Edge-cases / No-jargon, plus a one-line summary. |
| Record format | **Obsidian markdown, no JSON.** Clean `Q:` / `A:` pairs (answers may be text, ` ```ts ` code fences, or `![[image]]` embeds), written **live** as the session unfolds. |
| Note granularity | **One markdown file per top-level question**; its follow-up probes append into that same file. Grouped in a **folder per problem**. Plus **one session-summary note** per session that links the question notes. |

## Frontmatter (the SKILL.md itself)

Matches the convention of the existing skills (`add-problem`, `review-problem`,
`suggest-problem`): a manually-invoked slash command.

```yaml
name: feynman-coach
description: Picks a solved problem and makes the user TEACH it to a confused-junior persona to expose gaps in understanding. Socratic probing, jargon-busting, traps bugs in the user's stored solution, and records each question thread as an Obsidian-style markdown note with a 1-5 rubric. Use when the user wants to prove they deeply understand a pattern, not just re-solve it.
disable-model-invocation: true
argument-hint: [topic|problem-number] (optional)
```

(Description is third-person and states what + when, per Anthropic skill-authoring guidance.)

## Interaction workflow

The SKILL.md body is a numbered workflow (single file, well under 500 lines).

**Step 1 — Select a problem.**
If `$ARGUMENTS` names a topic or problem number, use it (same matching rules as
`review-problem`). Otherwise reuse `review-problem`'s spaced-repetition picker against
`data/problems-meta.json` + `data/practice.json` (least-practiced / longest-since-reviewed,
7-day cooldown). Show a one-line "picked because" reason.

**Step 2 — Brief the coach secretly.**
Read the problem's actual solution file and its notes in `practice.json`. Recall the
correct/optimal approach independently. **Never reveal any of this to the user.** Note
privately whether the stored solution looks buggy or suboptimal — this becomes the
Socratic-trap target in Step 4. Create the session's note folder if missing
(`feynman/<Problem-Slug>/`).

**Step 3 — Prompt the user to teach.**
Open in persona: a curious junior who has seen the problem but "doesn't really get the
approach." Ask the user to explain, in plain language, *what* their approach is and *why*
it works.

**Step 4 — Socratic probing (the core loop).**
Each distinct line of inquiry is a **question thread**. Ask naive-but-pointed follow-ups,
escalating on the one most important spot:
- Question the **assumptions**: "why this data structure and not X?"
- Question the **evidence**: "you said it's O(n) — why isn't the inner loop counted?"
- **Bust jargon**: if the user hides behind an undefined term ("just partition it"),
  ask them to define it simply. Undefined jargon = a gap.
- **Spring the trap**: if the stored solution has a bug, steer toward the input that
  exposes it and let the user find it.
Stay in persona. Push 3–4 "why" levels deep on the key spot; be gentle elsewhere.

**Step 5 — Write notes live (runs alongside Step 4).**
- When the coach opens a **new top-level question**, create a new note
  `feynman/<Problem-Slug>/<date>--<question-slug>.md` with frontmatter + an `# <question>`
  heading + the first `Q:` / `A:` pair.
- Each **follow-up probe** appends another `Q:` / `A:` pair into that same note.
- When the thread wraps, fill that note's frontmatter rubric scores for that thread.
- Answers are written verbatim: plain text, ` ```ts ` code fences, or `![[file.png]]`
  embeds (images the user pastes are saved to `feynman/<Problem-Slug>/attachments/`).

**Step 6 — Gap report (drop the mask) + session summary note.**
Switch to honest instructor voice in the CLI and present the overall rubric, a one-line
summary, any solution issues found (now stated plainly, with an *offer* to fix the file in
a separate follow-up — never auto-edited), and one refine challenge. Then write the
**session-summary note** `feynman/<Problem-Slug>/<date>--session.md` (schema below), which
`[[links]]` to that session's question notes.

**Step 7 — Optional fix follow-up.**
If the user accepts the offer to fix a detected bug, patch the file, and update the
relevant note's `solutionIssue` to mark it resolved.

## Output: Obsidian notes

Directory layout (one folder per problem):

```
feynman/
  Sort-Colors/
    2026-05-31--why-mid-doesnt-advance.md     ← one question thread
    2026-05-31--why-two-pointers.md           ← another question thread
    2026-05-31--session.md                    ← session summary, links the above
    attachments/
      2026-05-31-sort-colors-1.png            ← pasted images (unique-prefixed names)
```

**Question note** — `<date>--<question-slug>.md`:

```markdown
---
problem: Sort Colors
file: leetcode/75_sort_Colors.ts
pattern: Two Pointers
date: 2026-05-31
type: question
clarity: 4
justified_why: 3
edge_cases: 2
no_jargon: 5
solutionIssue: "off-by-one when length == 1"   # omit if none
---

# Why doesn't `mid` advance on a 2-swap?

Q: When you swap with the high pointer, why don't you move `mid` forward too?
A: Because the value swapped into `mid` came from the unsorted tail — we haven't seen it yet.

Q: Walk me through `[2,0,1]` then — what's at `mid` after the first swap?
A:
\`\`\`ts
// [1,0,2] after swapping nums[mid] and nums[high]
\`\`\`
```

**Session-summary note** — `<date>--session.md`:

```markdown
---
problem: Sort Colors
file: leetcode/75_sort_Colors.ts
pattern: Two Pointers
date: 2026-05-31
type: session
clarity: 4
justified_why: 3
edge_cases: 2
no_jargon: 5
---

# Sort Colors — session 2026-05-31

**Summary:** Strong on the high-level idea, fuzzy on the loop invariant.

**Refine challenge:** Re-explain the 2-swap invariant in one simple sentence.

**Solution issues found:** off-by-one when length == 1 — _offered fix (not yet applied)_.

**Question threads:**
- [[2026-05-31--why-mid-doesnt-advance]]
- [[2026-05-31--why-two-pointers]]
```

- Slugs: problem folder = title in `Title-Case-Hyphenated`; question slug = kebab-cased
  question; image names are date+problem prefixed to avoid Obsidian filename collisions.
- Rubric appears in *both* the per-thread notes (that thread's scores) and the session note
  (the overall scores). Dataview can aggregate either level by `problem` / `pattern`.

## Reuse of existing assets

- **Spaced-repetition selection logic** from `review-problem/SKILL.md` (referenced, not
  duplicated) — same data files, same rules.
- **`data/problems-meta.json`** for title / difficulty / pattern.
- **`data/practice.json`** for the user's prior notes (read-only, private briefing).
- **`npm run practice`** remains the way to log a *re-solve*; the fix follow-up in Step 7
  may prompt it if the session turned into a code fix.

## Edge cases

- **Never-reviewed problem with no notes** — Step 2 has less private context; the coach
  relies on its own knowledge of the correct approach. Still works.
- **User's explanation is correct but their file is buggy** — the rubric reflects their
  (good) understanding; `solutionIssue` separately records the file bug. Understanding and
  code quality are scored independently.
- **User gives up / asks for the answer mid-thread** — coach gives a progressive hint
  first (name the pattern), reveals fully only after a second miss, and records the gap.
- **`$ARGUMENTS` matches nothing** — fall back to the spaced-rep picker and say so.
- **`feynman/` or the problem folder doesn't exist yet** — create it on first run.
- **Session interrupted mid-way** — because notes are written live (Step 5), the question
  notes already hold everything up to the interruption; only the session-summary note is
  missing.
- **Repeat session on the same problem** — new dated notes are added to the same problem
  folder; the per-problem folder accumulates history over time.

## Out of scope (YAGNI)

- No web UI, no standalone app, no Anthropic SDK calls — runs inside Claude Code.
- No JSON store — Obsidian markdown + frontmatter is the single source of truth.
- No automatic trend charts / weakness analyzer yet — the notes are *designed to feed*
  those later (via Dataview or a future script), but building them is a separate project.
- No multi-problem batched sessions — one problem per invocation.

## Evaluation scenarios (for testing the skill later)

1. **Solid understanding, clean solution** — coach probes, finds no real gap, rubric is
   high, no `solutionIssue`. Verifies it doesn't invent problems.
2. **Buggy stored solution** — coach springs the Socratic trap, user discovers the bug,
   session note records the issue and offers a fix. Verifies the core pillar.
3. **Jargon-hiding** — user leans on undefined terms; coach busts them, `no_jargon` score
   reflects it, and the notes capture the threads. Verifies jargon detection + live notes.

## Refinements from the 2026-05-31 demo run

A live test on Majority Element (#169) surfaced fixes, now in `SKILL.md`:

- **Append-only thread notes.** Both the coach and the user were writing to the same note
  (user editing `A:` in Obsidian, coach back-patching scores), causing repeated edit
  conflicts. Fix: thread notes are append-only — the coach only adds `Q:` lines, the user
  owns `A:`. The coach re-reads a note right before appending.
- **Scoring moved entirely to the session note.** A per-thread 4-dim rubric was forced
  (a single thread rarely exercises all four dims). Thread-note frontmatter now carries no
  scores; the rubric lives only in the session note, with explicit 1–5 definitions for
  clarity / justified_why / edge_cases / no_jargon.
- **Liberal turn signal.** Any CLI message means "I've answered — read the note," except
  reserved commands `hint` / `reveal` / `skip` / `stop`. (The fixed `done` keyword was too
  strict; the user naturally typed `ping`.)
- **Answers in CLI or Obsidian.** If the user answers in the CLI, the coach pastes it into
  the matching `A:`; if in Obsidian, the coach leaves it alone.
- **Explicit start banner + stop triggers.** Session opens with a one-line "how this works"
  banner. Stops when the user says `stop`, the main weak spot is surfaced+attempted, or
  ~3 threads / ~10 min elapse. The session note is always written, even on early stop.
- **Solution issues include inefficiencies, not just bugs.** The demo's issue was an
  *optimization* (O(n)-space map vs O(1) Boyer-Moore), cross-referenced to `TODO.md`.
- **Feynman-cooldown in selection.** Selection also skips problems with a `feynman/` session
  in the last 14 days, using the session notes themselves as that history.
- **Session note stores more:** `difficulty`, `picked because`, and Obsidian `tags`.
- **Formative scorecard.** Scores are out of 5 (total `/20`) and each dimension gets a
  one-line *why* and *to-improve* in a scorecard table in the session note body. Frontmatter
  stays bare numbers for Dataview; the `/5` form shows only in prose/body.
