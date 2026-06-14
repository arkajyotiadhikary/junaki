---
name: review-problem
description: Pick a problem from my already-solved DSA problems and present it fresh for review practice. Uses spaced-repetition selection — prioritizes least-practiced and longest-since-last-reviewed problems. Use when I want to re-solve something I've done before to strengthen the pattern.
disable-model-invocation: true
argument-hint: [topic|problem-number] (optional: filter by topic or specific problem)
---

Pick a problem from my already-solved DSA problems for me to review and practice again from scratch.

## Step 1 — Load local data (NOT GitHub)

Read two files:
- `data/problems-meta.json` — the canonical list of every solved problem (under `problems` key, keyed by repo-relative file path).
- `data/practice.json` — review history (`entries` array of `{ file, date, notes }`).

Do NOT use WebFetch. Everything needed is local.

## Step 2 — Score every solved problem for review-priority

### Handle cross-platform duplicates first

Some problems exist on multiple platforms (e.g. GFG "Anagram" === LeetCode "Valid Anagram"). These are marked with an `aliasOf` field in `problems-meta.json` pointing to the canonical path.

- **Exclude any problem with `aliasOf` set from the candidate pool.** Only the canonical version is ever picked.
- When computing `practiceCount` / `lastPracticed` for a canonical problem, include practice entries logged against **either** the canonical path **or** any path that points to it via `aliasOf`. So a review of either file counts as a review of the same problem.

### Compute scores

For each problem path NOT marked `aliasOf`:
- `practiceCount` = number of entries in `practice.json` matching this path OR any aliased path pointing here.
- `lastPracticed` = most-recent `date` across those entries, or `null` if never reviewed.
- `daysSinceLast` = `null` if never reviewed, else `(now - lastPracticed) / 86400000` (whole days).

### Apply filter (if `$ARGUMENTS` is set)

- Topic filter (e.g. `strings`, `array`, `linked list`, `sorting`, `dp`): keep problems where `category` or any `patterns` entry matches case-insensitively. Also match the source folder (`geeksforgeeks/strings/...` for "strings").
- Specific problem (e.g. `88`, `anagram`, `two_sum`): if it matches a single problem, skip scoring and use that one directly. If multiple match, pick using the scoring below.

### Apply cooldown

**Exclude any problem with `daysSinceLast !== null && daysSinceLast < 7`.** Hard rule — don't show something practiced in the last week.

If the cooldown empties the candidate pool (e.g. user has reviewed everything in topic filter recently), relax to 3 days and warn: "Everything in this topic was practiced recently — relaxing cooldown to 3 days."

### Sort eligible candidates

1. **Never-reviewed problems first.** A problem with `practiceCount === 0` always outranks any reviewed problem. Among never-reviewed, randomize order.
2. Then **lowest `practiceCount` first**.
3. Then **largest `daysSinceLast` first** (oldest review wins).

### Pick

Take the top 3 candidates after sorting, then **pick one uniformly at random** from those 3. (Avoids always picking the same "most overdue" problem twice in a row.) If fewer than 3 eligible, pick from all of them.

## Step 3 — Present the problem as if I'm solving it fresh

Do NOT show my previous solution. Do NOT reveal the approach. Present it like a fresh interview question.

Briefly show the selection reasoning on one line BEFORE the problem — this helps me trust the picker:

> _Picked because: never reviewed_ (or: _last reviewed 23 days ago, 1 prior session_)

Then format:

---
**Problem:** [Full problem name]
**Source:** [LeetCode #XXX or GFG — with link]
**Difficulty:** [Easy / Medium / Hard]
**Topic:** [Category]

**Problem Statement:**
[Full clear description]

**Examples:**

Example 1:
Input: [input]
Output: [output]
Explanation: [brief]

Example 2:
Input: [input]
Output: [output]

**Constraints:**
[All constraints]
---

After presenting, say:
> Take your time. Type `hint` for a nudge, or share your solution when ready and I'll review it.

## Step 4 — Be ready to assist

**If I type `hint`:** Give a progressive hint. First hint = vague (just name the pattern: "think two pointers"). Only get more specific if I ask again.

**If I share a solution:** Keep the review LIGHT — correctness only. Do NOT write a thorough analysis.

- If the solution is correct: say so in 1–2 lines. No complexity breakdown, no edge-case walkthrough, no "insights" — unless I explicitly ask.
- If there's a bug: do NOT explain the full fix. Point at it as a **hint** — name the location (line/loop/condition) and nudge me toward the issue. Let me find and fix it myself. Only reveal the full fix if I ask or if I get it wrong twice.
- No mini-essays, no tables, no "Check-Your-Understanding" questions unless I ask.

Default mode is terse. Expand only on request.

## Step 5 — Log the review session

After the review wraps (correct solution accepted, or I explicitly say "done"), remind me once:
> Run `npm run practice -- <file-path> "<short note>"` to log this session.

Do not auto-run it — the note should be mine, not yours.

$ARGUMENTS
