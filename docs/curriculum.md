# Curriculum roadmap (`data/curriculum.json`)

The 26-week MAANG-prep roadmap, stored as **data** so the daily loop needs zero planning.
"What do I do today?" is answered by reading the first uncompleted entry — nothing to decide.

Source plan: [`docs/plans/2026-06-10-maang-prep-system-v2.md`](plans/2026-06-10-maang-prep-system-v2.md) (Prompt 3).

## File shape

```jsonc
{
  "startDate": "2026-06-15",
  "phases": [ { "id": 1, "name": "...", "weeks": "1-4", "focus": "..." }, ... ],
  "items":  [ { "slug", "url", "title", "pattern", "difficulty", "phase", "kind" }, ... ]
}
```

- `kind` ∈ `problem | design | reading | behavioral`.
- `phase` is an integer matching a `phases[].id`.
- `weeks` is an inclusive range string (`"5-9"`; en-dash also accepted by the reader).
- **`done` is never stored here.** `today.ts` derives it by matching an item against
  `data/practice.json` (by LeetCode number or normalized slug), so logging a solve
  automatically advances the curriculum.

## The 6 phases

| Phase | Weeks | Coding focus | Design track |
|---|---|---|---|
| 1 · Foundations | 1–4 | Stack, Queue, Recursion, Linked List completion, Binary Search | Primer reading: scalability, CAP, DNS/CDN, load balancers |
| 2 · Trees & Heaps | 5–9 | Trees (DFS/BFS/BST), Heap, Trie | Primer reading: DB/sharding, caching, async/queues, REST-vs-RPC; first design (TinyURL) |
| 3 · Graphs & Backtracking | 10–14 | Graphs (BFS/DFS, topo sort, union-find), Backtracking | Easy design ladder (Pastebin, rate limiter, KV store, ID gen, crawler) |
| 4 · DP, Greedy, Intervals | 15–18 | DP 1-D → 2-D, Greedy, Intervals | Easy ladder cont. (notifications, consistent hashing, leaderboard, autocomplete) |
| 5 · Hard & Mocks | 19–22 | Hard problems + difficulty-ramp top-ups | Medium ladder (Twitter, WhatsApp, Instagram, YouTube) + 4 behavioral STAR batches |
| 6 · Review & Company Sets | 23–26 | Spaced-rep review + company-favorite set | Medium → Hard designs (Dropbox, Ticketmaster, Uber, Google Maps) |

## What's in the roadmap

- **122 problems** (~5/week), ramping Easy → Medium → Hard within each pattern.
  Difficulty mix: 16 Easy / 84 Medium / 22 Hard.
- Gap-weighted to the 8 patterns the repo had **zero** coverage in:
  Recursion, Backtracking, Stack, Queue, Tree DFS/BFS, Graph DFS/BFS, Heap, Trie.
- Already-solved problems are deliberately excluded (Two Sum I/II, 3Sum, Sort Colors,
  Climbing Stairs, Valid Palindrome, Linked List Cycle, etc.).
- **8 reading** items (System Design Primer sections, weeks 1–8) and **18 design**
  items (graded ladder: 10 Easy → 6 Medium → 2 Hard) — one design/reading per week.
- **4 behavioral** items in phase 5 (write 2 STAR stories each, mapped to Amazon LPs).

## How it's consumed

- **`npm run today`** (`scripts/today.ts`)
  - *Next new problem(s)* — first not-done `problem` item (1 weekday, 2 weekend).
  - *System design* (weekends) — first not-done `design`/`reading` item in the current phase.
  - Footer — current phase, week number since `startDate`, problems done / total.
- **Future** `scripts/mock.ts` (Prompt 6) draws problems from these items; the stats
  dashboard (Prompt 7) renders the phase timeline and progress from `phases` + `items`.

## Maintenance

- Keep `slug` equal to the LeetCode URL tail (`/problems/<slug>/`) for problems.
- Patterns reuse the vocabulary in `data/problems-meta.json` → `corePatterns`.
- LeetCode URLs/difficulties were authored from known canonical slugs; re-verify a URL
  if a problem looks renamed or removed before relying on it.
