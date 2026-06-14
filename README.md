# Junaki

> **Junaki** (জোনাকী) is the Assamese word for *firefly* — a small light that makes its own glow and shines a little every night. That's the idea here: you light your own way to a top engineering job through steady daily practice, one small spark at a time.

Junaki is a **self-running 6-month MAANG interview-prep system**. It answers one question every day — **"what do I do today?"** — so you never have to plan.

It runs four tracks — coding, system design, behavioral, and timed mocks — on a single spaced-repetition engine. You solve, you log how it went, and the schedule decides what comes back and when. No AI writes your solutions; you type every one, to enjoy the craft of coding again.

## Try the demo in 30 seconds

The repo ships with a few **example files** so you can see the tool working before you start your own practice.

```bash
git clone https://github.com/<your-username>/junaki.git
cd junaki
npm install        # installs tsx + typescript only — no runtime dependencies
npm run seed       # loads the demo data (example problem, design, story)
npm run today      # see today's plan, with demo reviews due
```

When you're ready to start your **own** journey, clear the demo:

```bash
npm run reset      # deletes every *.example.* file and empties the data files
```

`npm run reset` removes the starter content and gives you a clean slate. (Prefer to delete by hand? Remove every file ending in `.example.*` and empty `data/practice.json`, `data/schedule.json`, and `data/problems-meta.json`.) Run `npm run reset -- --dry` first to preview what it will change.

## Prerequisites

- **Node.js 20+** (tested on Node 24). The only dev tools are `tsx` and `typescript`, installed by `npm install`.
- Works on macOS / Linux. Windows works too, but the mock-mode timer is built for a Unix terminal.

Optional: `npm run setup` wires up a pre-commit hook that rebuilds `stats.svg` on each commit.

---

## The daily loop (this is the whole point)

Every day, run **one** command:

```bash
npm run today
```

It prints, in order:

1. **Reviews due** — up to 3 old problems to **re-solve from scratch, no peeking** (this is the spaced-repetition engine; re-solving beats re-reading).
2. **New problem(s)** — the next unsolved item from the curriculum (1 on weekdays, 2 on weekends).
3. **System design** — on weekends, the next design reading or exercise for this phase.
4. **Footer** — current phase, week number, total progress, and your on-time review rate.

Then you solve, and **log what you did** with a self-rating:

```bash
npm run practice -- leetcode/88_merge_sorted_array.ts --rating good
```

The rating drives when you'll see that problem again:

| Rating | What it means | Next review |
|---|---|---|
| `fail` | couldn't solve it | resets to 3 days |
| `hard` | solved but struggled | same interval again |
| `good` | solved fine (default) | move up one rung |
| `easy` | trivial | skip a rung |

The interval ladder is `3 → 7 → 14 → 30 → 60` days. `today` tells you what, `practice` records how it went, and the schedule updates itself.

---

## Full command reference

| Command | What it does |
|---|---|
| `npm run seed` | Load the demo data so a fresh clone shows the tool working. |
| `npm run reset` | Clear all `*.example.*` starter files and empty the data files for a clean start. |
| `npm run today` | **Start here daily.** Prints today's plan. |
| `npm run practice -- <file> --rating <fail\|hard\|good\|easy>` | Log a solved problem and update its review schedule. |
| `npm run stats` | Rebuild `stats.svg` (also runs automatically on commit if hooks are set up). |
| `npm run schedule:backfill` | Rebuild `schedule.json` from your whole practice history. |
| `npm run design -- <slug> "<Title>"` | Scaffold a new system-design exercise in `systemdesign/`. |
| `npm run story -- <slug> "<Title>"` | Scaffold a new behavioral STAR story in `behavioral/stories/`. |
| `npm run story:matrix` | Rebuild the behavioral coverage matrix and flag thin areas. |
| `npm run mock -- --type oa` | Amazon-style timed round: 2 problems, 90-min countdown. |
| `npm run mock -- --type staged` | Meta-style: one multi-stage implementation problem, 90 min. |
| `npm run mock -- --type ai-pair` | The Meta "AI-enabled" round: solve *with* an AI in 60 min. |
| `npm test` | Run all the tooling tests (self-contained — passes on a fresh clone). |

Add `--seed <n>` to a mock for a reproducible problem pick.

---

## The four tracks

- **Coding** — the curriculum (`data/curriculum.json`) is a 26-week, 6-phase roadmap. Phases: 1 Foundations → 2 Trees & Heaps → 3 Graphs & Backtracking → 4 DP/Greedy/Intervals → 5 Hard & Mocks → 6 Review & Company sets. It front-loads the patterns most people are weakest in (recursion, backtracking, stack, queue, trees, graphs, heap, trie).
- **System design** — weekly. Open a blank exercise, give yourself 45 minutes using the [System Design Primer's](https://github.com/donnemartin/system-design-primer) 4-step method, then compare to a reference. See `systemdesign/README.md`.
- **Behavioral** — STAR(L) stories mapped to Amazon's Leadership Principles and Meta's values. `npm run story:matrix` shows which principles still need a story. See `behavioral/README.md`.
- **Mocks** — timed simulations of the real online-assessment formats (Amazon HackerRank, Meta CodeSignal, and the Meta AI-paired round).

---

## How the repo is laid out

| Folder | What it holds |
|---|---|
| `scripts/` | All the tooling (TypeScript, run with `tsx`). |
| `data/` | The brain: `curriculum.json` (roadmap), plus your `practice.json`, `schedule.json`, `problems-meta.json` (created by `seed`/`practice`). |
| `data/sources/` | Neutral problem lists (slug, URL, difficulty) that feed the curriculum. |
| `systemdesign/` | A 4-step template + README. Your exercises live here. |
| `behavioral/` | STAR story template + a coverage matrix for behavioral rounds. |
| `mocks/staged/` | Multi-stage implementation problems (Meta CodeSignal style). |
| `leetcode/` etc. | Where your own solution files go, by source. |

Your solutions, your practice log, and your stats are **yours** — they are not part of this shared repo. Only the example files and the tool itself are tracked here.

---

## Make it your own (fork & keep it in sync)

Junaki is built to be forked. The recommended setup keeps the public tool and your private practice cleanly separated:

1. **Fork** this repo (or create your own private copy for your real practice).
2. **Add this repo as `upstream`** so you can pull new features:
   ```bash
   git remote add upstream https://github.com/<this-repo>/junaki.git
   ```
3. **Practice in your fork.** Your solutions and data files stay in your private repo.
4. **Pull tool updates** whenever you want the latest features:
   ```bash
   git pull upstream main
   ```

Because the public repo never tracks your live data files (it ships only the `*.example.*` versions), pulling updates won't touch your practice data. The one rule: **edit the tool in the public repo, keep your data in your private one.** That way `git pull upstream main` stays conflict-free.

---

## License

[MIT](LICENSE).
