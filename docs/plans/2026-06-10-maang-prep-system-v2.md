# MAANG Prep System v2 — Research-Backed Redesign Plan

**Date:** 2026-06-10 · **Deadline:** ~2026-12-10 (6 months) · **Status:** ✅ Implemented — all 8 prompts shipped and verified by running the app (2026-06-14).

This document has three parts:

1. **What the research found** (deep-research run, 2026-06-10: 23 sources, 25 claims adversarially verified — 19 confirmed, 6 refuted)
2. **Gap analysis + target system design** (what to build on top of the existing repo)
3. **Standalone implementation prompts** — each one is self-contained and can be pasted into a fresh chat session with any model

> **Implementation status (verified 2026-06-14 by running each command):** All 8 prompts are built and working.
>
> | Prompt | Ships as | Command |
> |---|---|---|
> | 1 Scheduler | `scripts/schedule.ts`, ratings in `log-practice.ts` | `npm run schedule:backfill`, `npm run practice -- <file> --rating <r>` |
> | 2 Daily driver | `scripts/today.ts` | `npm run today` |
> | 3 Curriculum | `data/curriculum.json` (922 items, 6 phases), `docs/curriculum.md` | (data file) |
> | 4 System design | `systemdesign/`, `scripts/new-design.ts` | `npm run design -- <slug> "<Title>"` |
> | 5 Behavioral | `behavioral/`, `scripts/new-story.ts`, `story-matrix.ts` | `npm run story`, `npm run story:matrix` |
> | 6 Mock / OA | `scripts/mock.ts`, `mocks/staged/` (8 problems) | `npm run mock -- --type <oa\|staged\|ai-pair>` |
> | 7 Stats | `scripts/generate-svg.ts` | `npm run stats` |
> | 8 AlgoFrog import | `scripts/import-algofrog.ts`, `data/sources/` | `npm run import:algofrog` |
>
> See the repo `README.md` for setup, the full command list, and a daily walkthrough.

---

## Part 1 — What actually happens in MAANG interviews (verified, June 2026)

### 1.1 Interview formats are changing because of AI

- **Meta** rolled out an **"AI-enabled coding" round** (October 2025): a 60-minute CoderPad session where you work *with* an AI assistant (choice of GPT-5 / Claude / Gemini / Llama). It replaces one traditional coding round, currently at E5–E7 SWE and M2 EM loops, expanding in 2026. Meta's stated rationale: mirrors real dev work and makes LLM cheating pointless since AI is allowed. *(verified 3-0; sources: hellointerview.com/blog/meta-ai-enabled-coding, Business Today, 404 Media memo)*
- **Google** is **reintroducing in-person rounds** explicitly because of AI-assisted cheating in virtual interviews. Pichai on record: "at least one round of in-person interviews… just to make sure the fundamentals are there." *(verified 3-0; Business Standard, CNBC, Lex Fridman podcast June 2025)*
- **Implication for prep:** you must be able to solve problems **unassisted, on a whiteboard or proctored screen**, AND be fluent at **driving an AI assistant** (prompting, verifying its output, catching its bugs). Both modes need explicit practice.

### 1.2 Verified pipeline structures

- **Meta:** proctored 90-min CodeSignal OA (camera + mic on; ONE base problem in 4 progressive stages, ~LC-medium but **implementation-heavy**, e.g. in-memory KV store with TTL/versioning) → loop: 2 coding + 1 system design + 1 behavioral. *(verified 3-0)*
- **Amazon:** ~90-min HackerRank OA (2 coding problems, easy–medium, + work-style survey) → loop where **Leadership Principles behavioral questions are weighted heavily**; a **bar raiser** (senior outside the team) can unilaterally veto an offer. *(verified 3-0, high confidence — includes Amazon's own hiring page)*
- **Mid/senior levels:** system design + behavioral often carry **more** weight than coding; coding is a pass/fail gate, design/behavioral is the differentiator. *(verified 3-0)*

### 1.3 Refuted claims — do NOT build the system around these

These sounded plausible and **failed adversarial verification** (cited widely online; treat as noise):

- ✗ "5 mock interviews roughly doubles your pass rate / plateau after 5 onsites"
- ✗ "Google/Meta are centralized, Apple/Netflix/Amazon are team-based" dichotomy
- ✗ "Standard 7-step FAANG pipeline, 4 weeks–5 months, Apple/Netflix skip OAs"
- ✗ Industry-wide in-person trend (Deloitte/Amazon claims)

**Coverage gaps (nothing survived verification):** Netflix and Apple loop specifics; exact NeetCode Pro contents; problem-by-problem Striver-free-vs-TUF+-paid comparison; documented offer-holder 6-month schedules. Where the plan touches these, it is inference, marked ⚠.

### 1.4 The paid courses, decomposed

**TUF+ (takeuforward)**, verified against the live pricing page 2026-06-10: Pinnacle ₹9,999/yr list (₹6,499 promo), Sprint ₹5,899/yr (₹3,834 promo). Contents: DSA basics→advanced (1000+ problems), DBMS/CN/OS, OOPs, LLD, SQL, aptitude, newer HLD. **That content list is exactly the checklist a free stack must replicate:**

| Paid module | Free equivalent |
|---|---|
| DSA track | Striver's free A2Z sheet (~455 problems, free on takeuforward.org) ⚠, NeetCode 150 roadmap (free tier: list + video solutions) ⚠ |
| HLD / system design | **System Design Primer** (github.com/donnemartin/system-design-primer — 352k stars, actively maintained, verified 3-0) + **ashishps1/awesome-system-design-resources** graded ladder of 38 design problems: 10 Easy / 16 Medium / 12 Hard (verified 3-0) |
| Behavioral | Amazon's published Leadership Principles + STAR method (free) |
| OOPs/LLD/SQL/CS subjects | Free A2Z sections, GFG articles ⚠ — lower priority for SWE loops at product companies |

⚠ = stable, well-known facts but not verified by this research run.

### 1.5 The study method with the strongest evidence

- **Spaced (distributed) practice beats massed practice.** Cepeda et al. 2006 meta-analysis (839 assessments): *every* study with a retention interval over one month showed a benefit for spacing. *(verified 3-0 against the primary meta-analysis)*
- **Retrieval practice beats re-reading.** Re-solving a problem from scratch strengthens memory more than re-reading the editorial — ~a century of research, multiple meta-analyses. *(verified 3-0)*
- Honest caveat: the evidence base is verbal-recall tasks; extrapolation to coding is standard but unproven, and effects may be smaller for complex skills.
- **Implication:** the single highest-leverage feature for this repo is a **review scheduler** — the system should *tell you which old problem to re-solve from scratch today*, not just log what you did.

---

## Part 2 — Gap analysis and target system

### 2.1 Where the repo stands (2026-06-10)

- 43 problems: 28 Easy / 15 Medium / **0 Hard**; 60% Array, 26% String
- **8 of 24 core patterns have ZERO problems:** Recursion, Backtracking, Stack, Queue, Tree DFS/BFS, Graph DFS/BFS, Heap, Trie — these are the heart of MAANG coding rounds
- 44 practice sessions over 43 days; good logging (`npm run practice`), good stats SVG, approved Feynman coach spec, **but no scheduler**: nothing answers "what do I do today?"
- No system design track, no behavioral track, no timed/mock mode

### 2.2 Design principle: remove all daily decisions

The user's stated problem: *"make this system so easy that I feel no challenge to follow it."* Every day the system must answer one question — **"what do I do today?"** — with zero planning required from the user. One command prints the day's menu; everything else (curriculum order, review due-dates, weekly design topic) is precomputed data.

### 2.3 New components

#### A. Spaced-repetition review scheduler
- Extend `npm run practice` to accept a self-rating: `--rating fail|hard|good|easy`
- Fixed-ladder intervals (simpler than SM-2, equally supported by the evidence — the spacing effect is about *distribution*, not the exact algorithm): first solve → due in **3d**, then ladder **7d → 14d → 30d → 60d**. `fail` resets to 3d; `hard` repeats current interval; `good` advances one rung; `easy` skips a rung.
- Schedule state derived into `data/schedule.json` (per problem: `lastReview`, `intervalIndex`, `due`). Backfill from existing `practice.json` history on first run.

#### B. `npm run today` — the daily driver
Prints, in order:
1. **Due reviews** (cap at 3/day; oldest-due first) — re-solve from scratch, no peeking (retrieval practice)
2. **Next new problem(s)** from the curriculum (1 on weekdays, 2–3 weekend)
3. **This week's system design task** (weekends only)
4. Streak/phase progress one-liner

#### C. `data/curriculum.json` — the 6-month roadmap as data
Ordered list of problems (LeetCode slugs + pattern + difficulty + phase), so "next new problem" is just "first uncompleted entry." Backbone: NeetCode 150 ordering ⚠ merged with Striver A2Z topic order ⚠, gap-weighted toward the 8 missing patterns. Phases:

| Phase | Weeks | Coding focus | System design |
|---|---|---|---|
| 1 | 1–4 | Stack, Queue, Recursion, Linked List completion, Binary Search | Read Primer: fundamentals (scalability video, CAP, caching, LB) |
| 2 | 5–9 | **Trees** (DFS/BFS/BST), **Heap**, **Trie** | Primer: databases, sharding, queues; first Easy design (TinyURL) |
| 3 | 10–14 | **Graphs** (BFS/DFS, topo sort, union-find), **Backtracking** | Easy ladder: Pastebin, KV store, rate limiter… (10 Easy total) |
| 4 | 15–18 | **DP** (1-D → 2-D), Greedy, Intervals | Medium ladder starts: WhatsApp, Twitter, Instagram… |
| 5 | 19–22 | **Hard problems** + mixed timed sets + OA simulation (90-min multi-stage implementation problems, Meta-style) | Medium ladder cont.; write STAR stories (12 stories × Amazon LPs) |
| 6 | 23–26 | Review-only spaced rep + company-specific sets + AI-pair practice sessions | 2–3 Hard designs (Uber-class); weekly mocks (Pramp ⚠ / peer); behavioral drills |

Volume target: the original plan aimed at ~110–130 **new** problems over 26 weeks (≈5/week). **Update (2026-06-14):** Prompt 8 merged the full AlgoFrog source in, so `data/curriculum.json` now holds 884 problems (922 items total incl. readings/designs/behavioral/staged) — a large backlog to pull from, not a "must finish all" target. The daily driver still feeds you ~5/week; you work the front of the ordered list and stop when interview season hits. At ~12 h/week (working dev: ~1 h weekdays, 3–4 h weekend days) the *cadence* is sustainable; the refuted-claims list warns against copying internet "300 problems in 3 months" schedules.

#### D. System design track — `systemdesign/`
- One markdown file per design exercise, template enforcing the Primer's verified 4-step method: **(1) use cases/constraints/estimates → (2) high-level design → (3) core components → (4) scale it**. Include a back-of-envelope numbers section.
- Problem source: the verified 38-problem graded ladder (10 Easy → 16 Medium → 12 Hard) from ashishps1/awesome-system-design-resources. Target ~18 over 6 months.
- Tracked in `data/practice.json` with the same logger (`npm run practice -- systemdesign/tinyurl.md --rating good`), so designs enter the same spaced-rep loop (re-doing a design from a blank page is retrieval practice too).

#### E. Behavioral track — `behavioral/`
- `behavioral/stories/` — 12 STAR stories as markdown with frontmatter mapping each story to Amazon LPs + Meta values. Verified rationale: Amazon's bar raiser can veto on LPs alone.
- Authored in Phase 5, drilled in Phase 6 (the `today` command surfaces one story prompt per week in Phase 5+).

#### F. Mock / OA mode — `npm run mock`
- `--type oa`: picks 2 unseen curriculum problems, starts a 90-min countdown, logs completion + time (Amazon-style)
- `--type staged`: one implementation-heavy multi-stage problem (Meta CodeSignal-style; curate ~8 of these in curriculum data, e.g. "design an in-memory KV store with TTL," "LRU cache from scratch," "log aggregator")
- `--type ai-pair`: instructions to solve WITH an AI assistant in 60 min, practicing the Meta AI-enabled round — the skill being trained is prompting + verifying, not recall
- Logs to `practice.json` with `mode: "mock"` so stats can separate assisted/timed/unassisted signal

#### G. Stats & MAANG meter recalibration (`scripts/generate-svg.ts`)
- Add: due-review count, curriculum phase progress bar, system design count, behavioral story count
- Re-weight the MAANG meter: coverage of the 8 missing patterns and Hard-count matter most early; add a "retention health" dimension (% of due reviews completed on time)

#### H. Feynman coach integration
- Keep the existing spec unchanged; the `today` command suggests one Feynman session/week, picking the problem with the lowest rubric scores or a `fail`-rated review.

### 2.4 What NOT to build (scope guards)

- No web UI, no database, no auth — JSON + CLI is already working; don't gold-plate
- No CS-subjects track (DBMS/CN/OS) — relevant for India service-company screens, marginal for MAANG SWE loops; revisit only if targeting companies that ask it
- No LLD/OOPs track initially — add in Phase 5 only if target companies (Amazon India often does ask LLD ⚠) require it; keep the decision open in curriculum.json structure
- Don't buy TUF+/NeetCode Pro — the verified free stack covers the content; the paid value is sequencing + accountability, which this system replicates

---

## Part 3 — Standalone implementation prompts

Each prompt is self-contained — paste into a fresh session with any model. Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7. Prompts 4–7 are independent of each other.

---

**Prompt 1 — Spaced-repetition scheduler**

> In my DSA practice repo at `/Volumes/Elements/code/DSA` (TypeScript, run with `tsx`), I track practice sessions in `data/practice.json` (schema: `{ entries: [{ file: "leetcode/167_two_sum_ii.ts", date: "ISO-8601", notes?: string }] }`) via `scripts/log-practice.ts` (`npm run practice -- <file> [--notes="..."]`). Problem metadata lives in `data/problems-meta.json` (`problems` keyed by file path, with `title`, `difficulty`, `category`, `patterns`, `companies`, optional `aliasOf`).
>
> Build a spaced-repetition scheduler:
> 1. Extend `log-practice.ts` to accept `--rating fail|hard|good|easy` (optional; default `good`). Store `rating` on the entry.
> 2. New module `scripts/schedule.ts` maintaining `data/schedule.json`: per problem file → `{ lastReview, intervalIndex, due }`. Interval ladder in days: `[3, 7, 14, 30, 60]`. Rules: new problem starts at index 0 (due = solve date + 3d); `good` advances one rung; `easy` advances two; `hard` repeats the current rung; `fail` resets to index 0. Cap at the last rung (repeat 60d).
> 3. One-time backfill: derive initial schedule state from existing `practice.json` history (treat each historical session as `good`). Respect `aliasOf` (alias problems share schedule state with the canonical file).
> 4. Update schedule.json automatically whenever a session is logged.
> Keep it dependency-free (no npm installs), match the existing minimal code style, strict TS. Write a few `tsx`-runnable assertion tests for the interval logic.

---

**Prompt 2 — `npm run today` daily driver**

> In my DSA practice repo at `/Volumes/Elements/code/DSA` (TypeScript, `tsx`), I have: `data/practice.json` (session log), `data/problems-meta.json` (problem metadata), `data/schedule.json` (spaced-rep state: per file `{ lastReview, intervalIndex, due }`), and `data/curriculum.json` (ordered roadmap: `{ phases: [{ id, name, weeks }], items: [{ slug, url, title, pattern, difficulty, phase, kind: "problem"|"design"|"reading"|"behavioral", done?: boolean }] }`).
>
> Build `scripts/today.ts` (`npm run today`) that prints a terminal daily plan:
> 1. **Reviews due** — up to 3 problems with `due <= now`, oldest first, with title + file path + "re-solve from scratch, then log with `npm run practice -- <file> --rating <r>`". If >3 due, show count of remainder.
> 2. **New problem(s)** — first not-`done` curriculum item of kind `problem` (1 on Mon–Fri, 2 on Sat/Sun, by local date).
> 3. **System design** (Sat/Sun only) — first not-`done` item of kind `design` or `reading` in the current phase.
> 4. Footer: current phase, week number since a `startDate` in curriculum.json, problems done / total, and reviews completed on time in the last 7 days.
> A curriculum item becomes `done` when a practice.json entry exists for its file (a small sync step inside today.ts is fine). Clean aligned terminal output, no color libraries (raw ANSI ok). Dependency-free, strict TS.

---

**Prompt 3 — 6-month curriculum data file**

> In my DSA practice repo at `/Volumes/Elements/code/DSA` I need `data/curriculum.json`: a 26-week MAANG-prep roadmap for a working developer starting 2026-06-15, structured as `{ startDate, phases: [{ id, name, weeks, focus }], items: [...] }` where each item is `{ slug, url, title, pattern, difficulty, phase, kind: "problem"|"design"|"reading"|"behavioral" }`.
>
> Context: I've solved 43 problems (mostly Easy/Medium arrays, strings, two pointers, sliding window, hashing, binary search basics, Kadane, basic linked list). I have ZERO problems in: Recursion, Backtracking, Stack, Queue, Tree DFS/BFS, Graph DFS/BFS, Heap, Trie — and zero Hard problems. Don't re-include problems I've likely done (Two Sum I/II, 3Sum, Sort Colors, Rotate Array, Best Time to Buy and Sell Stock, Maximum Subarray, Valid Anagram, Minimum Size Subarray Sum, Container With Most Water, Majority Element, Climbing Stairs, Longest Substring Without Repeating Characters, Add Binary, Two Sum II, Valid Triangle Number).
>
> Phases (coding): 1 (wk 1–4) Stack/Queue/Recursion/finish Linked List/Binary Search on answers; 2 (wk 5–9) Trees + Heap + Trie; 3 (wk 10–14) Graphs + Backtracking; 4 (wk 15–18) DP 1-D→2-D + Greedy + Intervals; 5 (wk 19–22) Hard problems + 8 implementation-heavy staged problems (Meta-OA style, e.g. in-memory KV store with TTL, LRU cache, rate limiter, log aggregator); 6 (wk 23–26) review-only + company sets.
> Use the NeetCode 150 list and Striver A2Z sheet ordering as the problem source (free, well-known lists) — ~110–130 new problems total, ramping difficulty within each topic (1–2 Easy → Mediums → 1+ Hard per major pattern). Every item needs a real LeetCode URL and correct difficulty.
> Interleave `design`/`reading` items (one per week): weeks 1–8 = System Design Primer reading sections (github.com/donnemartin/system-design-primer: scalability lecture, vertical/horizontal scaling, CDN, load balancers, databases/sharding/replication, caching, async/queues, communication/REST-vs-RPC); weeks 9 onward = design problems from the ashishps1/awesome-system-design-resources graded ladder: all 10 Easy (TinyURL, Pastebin, rate limiter, KV store…), then ~6 Medium (WhatsApp, Twitter, Instagram, notification system…), then 2–3 Hard (Uber, Google Maps class) in weeks 23–26. Phase 5 adds one `behavioral` item per week (write 2 STAR stories each).
> Validate the JSON parses and slugs are unique. Output only the data file + a short README note in `docs/` explaining the phase logic.

---

**Prompt 4 — System design track scaffolding**

> In my interview-prep repo at `/Volumes/Elements/code/DSA` (TypeScript CLI tooling, markdown content), create a system design practice track:
> 1. `systemdesign/_template.md` — a design-exercise template with frontmatter (`problem`, `difficulty`, `date`, `source`, `timeboxMinutes: 45`) and body sections following the System Design Primer's 4-step interview method: **Step 1: Use cases, constraints, back-of-envelope estimates** (with a prompts checklist: who are the users, scale numbers, read/write ratio, storage estimate, QPS estimate); **Step 2: High-level design** (ASCII or Excalidraw-link diagram); **Step 3: Core components deep-dive** (data model, API sketch); **Step 4: Scale the design** (load balancer, caching, sharding, replication, queues — with a "justify each addition" note); plus **Self-review** (what I missed vs a reference solution, 1–5 confidence score).
> 2. `systemdesign/README.md` — how the track works: weekly cadence, 45-min timebox from blank template WITHOUT looking at references, then 30 min comparing against a reference solution (link the donnemartin/system-design-primer solved-exercises and the ashishps1/awesome-system-design-resources problem list), then log via `npm run practice -- systemdesign/<slug>.md --rating <fail|hard|good|easy>`.
> 3. `scripts/new-design.ts` (`npm run design -- <slug> "<Problem Title>"`) — copies the template into `systemdesign/<slug>.md` with frontmatter filled.
> Also register design files in `data/problems-meta.json` style metadata if a `systemdesign/` entry is logged (category "System Design"). Keep everything dependency-free, match existing repo conventions (strict TS, tsx runner).

---

**Prompt 5 — Behavioral / STAR story bank**

> In my interview-prep repo at `/Volumes/Elements/code/DSA`, create a behavioral interview track. Context: Amazon weights Leadership Principles heavily (a bar raiser can veto an offer on behavioral signal alone) and Meta has a dedicated behavioral round on its core values; I'm a working developer, so my stories come from real work.
> 1. `behavioral/README.md` — explains the STAR(L) format (Situation, Task, Action, Result, Learning), and contains a coverage matrix: rows = my 12 stories, columns = the 16 Amazon Leadership Principles plus common themes (conflict, failure, deadline, ambiguity, influence without authority, deep technical dive). Goal: every column covered by ≥2 stories.
> 2. `behavioral/stories/_template.md` — frontmatter (`title`, `principles: []`, `themes: []`, `strength: 1-5`, `lastDrilled`) + STAR(L) body sections, each with a 2–3 sentence target length note and a "60-second spoken version" section.
> 3. `behavioral/questions.md` — 30 high-frequency behavioral questions grouped by theme (tell me about a time you: disagreed with your manager, missed a deadline, took ownership beyond your role, simplified something complex, received hard feedback, made a decision with incomplete data, etc.), each tagged with the LPs it probes.
> 4. `scripts/new-story.ts` (`npm run story -- <slug> "<Title>"`) — scaffolds a story file from the template.
> Drilling a story should be loggable via the existing logger: `npm run practice -- behavioral/stories/<slug>.md --rating <r>` (the repo logs to `data/practice.json`). Keep dependency-free TS, match repo conventions.

---

**Prompt 6 — Mock & OA simulation mode**

> In my DSA repo at `/Volumes/Elements/code/DSA` (TypeScript, tsx, data in `data/practice.json`, `data/problems-meta.json`, `data/curriculum.json` with ordered items `{ slug, url, title, pattern, difficulty, phase, kind }`), build `scripts/mock.ts` (`npm run mock -- --type <oa|staged|ai-pair>`):
> 1. `--type oa` (Amazon-style): pick 2 random not-yet-done curriculum problems (1 Easy/Medium + 1 Medium), print them with URLs, start a 90-minute countdown timer in the terminal (update every minute, ring bell at 30/10/0 min). On finish (or Ctrl-C), prompt for per-problem outcome (solved/partial/failed + minutes) and append entries to `data/practice.json` with `mode: "mock-oa"`.
> 2. `--type staged` (Meta CodeSignal-style): pick one item tagged `kind: "staged"` from curriculum (implementation-heavy multi-stage problems like "in-memory KV store with TTL — stage 1 get/set, stage 2 TTL, stage 3 versioned reads, stage 4 scan/pagination"). 90-min timer, same logging with `mode: "mock-staged"`. If no staged items exist in curriculum.json, also add 8 such items (each with a 4-stage spec written into a `mocks/staged/<slug>.md` file you create).
> 3. `--type ai-pair` (Meta AI-enabled round practice): pick 1 unseen Medium/Hard, 60-min timer, and print a protocol reminder: you MAY use an AI assistant, the graded skills are problem decomposition, prompt quality, verifying/correcting AI output, and narrating tradeoffs; log with `mode: "mock-ai"`.
> Rules: never pick problems already practiced unassisted in the last 14 days; respect a `--seed` flag for reproducibility; dependency-free strict TS; small assertion tests for the selection logic.

---

**Prompt 7 — Stats dashboard upgrade**

> In my DSA repo at `/Volumes/Elements/code/DSA`, `scripts/generate-svg.ts` (475 lines, dependency-free TS, runs via `npm run stats`, auto-runs in a pre-commit hook) renders `stats.svg` with KPIs, portal/difficulty distributions, top patterns, and a weighted "MAANG Meter" (coverage 25% / volume 30% / retention 15% / hard-ratio 15% / consistency 15%, with caps: 0 Hard → max 30%, <50 problems → max 25%). New data files now exist: `data/schedule.json` (spaced-rep: per file `{ lastReview, intervalIndex, due }`), `data/curriculum.json` (26-week roadmap with `phases` and ordered `items`, `startDate`), and practice entries may carry `rating` and `mode` ("mock-oa"|"mock-staged"|"mock-ai").
> Upgrade the dashboard:
> 1. New KPI row: reviews due today, on-time review rate (last 30d: reviews completed on/before due date ÷ reviews that came due), current curriculum phase + week, curriculum progress (done/total items).
> 2. Track sections: system design exercises completed (files under `systemdesign/`), behavioral stories drilled (files under `behavioral/stories/`), mock sessions by type.
> 3. Re-weight MAANG Meter: coverage 25%, volume 20%, retention-health 20% (on-time review rate), hard-ratio 15%, mock-readiness 10% (mocks in last 30d, target 4), design-readiness 10% (designs done ÷ 18 target). Keep the existing caps logic but add: 0 system designs after week 8 of curriculum → cap 50%.
> 4. Show a 26-week phase timeline bar with "you are here."
> Keep the existing visual style and the pre-commit flow working; don't add dependencies; verify the SVG renders by opening it.

---

---

**Prompt 8 — Integrate the AlgoFrog list as a curriculum source**

> In my DSA prep repo at `/Volumes/Elements/code/DSA` (TypeScript, tsx, dependency-free), I have an export from AlgoFrog (a paid DSA guide I subscribe to) at `data/sources/algofrog-export.json`. It's an array of topic objects from a Supabase `topics` table, each shaped like: `{ id, display_number, nav_label, title, tier_code, tier_label, topic_content: { why_it_matters, core_idea, pattern_triggers, coverage_problems, red_flags }, problems: [{ id, order_num, layer, lc_number, lc_url, title, difficulty, is_premium, sub_variant, key_insight }] }`. The `problems` array within each topic is ordered by `order_num`; `layer` groups problems into sub-tiers within a topic.
>
> Build `scripts/import-algofrog.ts` (`npm run import:algofrog`) that:
> 1. Reads `data/sources/algofrog-export.json` and flattens it into the same item shape used by `data/curriculum.json` (`{ slug, url, title, pattern, difficulty, phase, kind: "problem" }`), deriving `slug` from `lc_url`/`lc_number`, `pattern` from the topic's `nav_label`/`tier_label`, and preserving AlgoFrog's topic+layer+order_num ordering. Carry `key_insight` into an optional `note` field.
> 2. De-duplicates against problems I've already solved (cross-reference `data/problems-meta.json` keys and `lc_number`) and against existing `curriculum.json` items — never add a duplicate, and report what was skipped.
> 3. Writes the result to `data/sources/algofrog-curriculum.json` (a parallel curriculum file) AND supports a `--merge` flag that interleaves AlgoFrog problems into the main `data/curriculum.json`, respecting my existing phase structure (map AlgoFrog topics/tiers onto my 6 phases by pattern: e.g. its Stack/Queue topics → phase 1, Trees → phase 2, Graphs → phase 3, DP → phase 4). When merging, prefer AlgoFrog's ordering *within* a pattern but keep my phase boundaries.
> 4. Prints a summary: total problems imported, new vs already-solved, distribution by difficulty and pattern, and any LeetCode URLs it couldn't parse.
> Make it idempotent (re-running doesn't duplicate). Strict TS, no new dependencies. Add a `data/sources/README.md` documenting how to refresh the export (the browser-console snippet) and re-run the importer. Treat the AlgoFrog content (`key_insight`, `topic_content`) as personal study material — keep it in `data/sources/` and add that path to `.gitignore` if I don't already track it, since it's paid content.

---

## Appendix — Source quality notes for the implementing model

- Verified-3-0 claims above cite: hellointerview.com (ex-Meta staff engineer), Business Standard/CNBC (Pichai statements), amazon.jobs (primary), takeuforward.org/plus (live-fetched 2026-06-10, promo prices are time-sensitive), donnemartin/system-design-primer (GitHub API: 352k stars, last push 2026-03-20), ashishps1/awesome-system-design-resources (raw README), Cepeda et al. 2006 + Weinstein et al. 2018 (peer-reviewed learning science).
- ⚠-marked items (NeetCode 150 contents, Striver A2Z free sheet, Pramp, Amazon-India LLD) are well-known but were NOT verified by the research run — the implementing model should double-check URLs/lists at implementation time.
- Do not reuse the refuted claims in §1.3 anywhere in the system (e.g., don't bake "5 mocks doubles your odds" into the mock-readiness metric copy).
