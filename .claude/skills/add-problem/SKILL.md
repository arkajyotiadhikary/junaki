---
name: add-problem
description: Verify and add a newly-solved DSA problem to data/problems-meta.json. Looks up official metadata (title, difficulty, topic tags) from the source platform and pulls LeetCode company frequencies from a public aggregator. Use after solving a new problem.
disable-model-invocation: true
argument-hint: <file-path> (e.g. leetcode/704_binary_search.ts)
---

Add metadata for a newly-solved problem to `data/problems-meta.json`. Skip the manual research grind.

## Step 0 — Resolve target file

`$ARGUMENTS` is the repo-relative path to the newly-added solution file (e.g. `leetcode/704_binary_search.ts`).

If empty: run `git status --short data/ leetcode/ geeksforgeeks/ hackerrank/ interviewbit/` to find new untracked `.ts` files. If multiple, ask which one. If one, use it.

If the file already has an entry in `data/problems-meta.json` under `problems`: warn, ask whether to refresh metadata or abort.

## Step 1 — Detect platform + identifier

From the path:
- `leetcode/<NNN>_<slug>.ts` → LeetCode, problem ID = `<NNN>`
- `geeksforgeeks/<topic>/<slug>.ts` → GFG, slug = filename
- `hackerrank/<slug>.ts` → HackerRank, slug = filename
- `interviewbit/<slug>.ts` → InterviewBit

Read the file's first ~20 lines. If a `// Problem link - <url>` comment exists, it's authoritative — use that URL.

## Step 2 — Fetch official metadata

### LeetCode
- WebSearch: `LeetCode <NNN> "<inferred title>" difficulty topics tags`
- Extract: official title (exact casing), difficulty, topic tags
- LC blocks WebFetch (403). Use search snippets — they typically include difficulty + tags.
- Cross-check: WebFetch `https://github.com/doocs/leetcode/blob/main/solution/<padded-range>/<NNN>...README_EN.md` for tags.

### GeeksforGeeks
- GFG is a JS-rendered SPA — WebFetch returns shell only. Skip direct fetch.
- WebSearch: `GeeksforGeeks "<problem name>" practice difficulty topic tags`
- Use the `https://www.geeksforgeeks.org/problems/<slug>/1` URL when available.
- If problem comment in source file references gfg-160 batch, official title comes from that URL slug.

### HackerRank
- WebFetch the `/challenges/<slug>/problem` page directly — usually returns difficulty + subdomain.

## Step 3 — Pull LeetCode company frequencies (LC only)

Run via Bash:

```bash
tmp=$(mktemp -d)
ID=<problem-id>
COMPANIES="amazon google microsoft meta apple bloomberg uber adobe netflix tiktok oracle goldman-sachs nvidia salesforce linkedin atlassian airbnb"
for co in $COMPANIES; do
  curl -sL "https://raw.githubusercontent.com/snehasishroy/leetcode-companywise-interview-questions/master/$co/all.csv" \
    -o "$tmp/$co.csv"
done
for co in $COMPANIES; do
  freq=$(awk -F',' -v id="$ID" 'NR>1 && $1==id{print $NF}' "$tmp/$co.csv" 2>/dev/null)
  if [ -n "$freq" ]; then echo "$co $freq"; fi
done
```

Selection rule: companies with frequency ≥ 50%. If more than 5 qualify, take top 5 by frequency. If fewer than 5 qualify but problem has any, include all.

Capitalize properly when writing to JSON: `meta` → `Meta`, `tiktok` → `TikTok`, `nvidia` → `NVIDIA`, `goldman-sachs` → `Goldman Sachs`, `linkedin` → `LinkedIn`, otherwise Title Case.

For GFG / HackerRank / InterviewBit: leave `companies: []`. The aggregator above is LC-only and GFG company tags are gated behind their JS-rendered SPA — don't guess.

## Step 4 — Determine `category` and `patterns`

- `category` = single primary topic. Heuristics: `Array`, `String`, `Sorting`, `Linked List`, `Tree`, `Graph`, `Dynamic Programming`. Pick the dominant one — usually matches the source folder for GFG.
- `patterns` = the official topic tags array from Step 2, verbatim. Don't invent tags. If source uses a famous algorithm name not in LC tags (e.g. "Boyer-Moore"), do NOT include it — stick to platform-official tags only.

If a new pattern appears that's not in the existing `corePatterns` array in `data/problems-meta.json`, add it there too.

## Step 5 — Write the entry

Read `data/problems-meta.json`. Use Edit to insert the new entry into `problems` (keep the file path key as `<platform>/<file>` matching $ARGUMENTS exactly).

Entry shape:
```json
"<file-path>": {
  "title": "<official title with exact casing>",
  "difficulty": "<Easy|Medium|Hard>",
  "category": "<primary topic>",
  "patterns": ["<official tag>", ...],
  "companies": ["<Company>", ...]
}
```

After write, validate JSON: `python3 -c "import json; json.load(open('data/problems-meta.json'))" && echo OK`

## Step 6 — Regenerate stats

```bash
npm run stats
```

Confirm the script prints the updated problem count.

## Step 7 — Report

Print a 5-line summary:
- Title + source link
- Difficulty / category
- Patterns chosen (and source — LC official, GFG search, etc.)
- Companies (and freq cutoff applied)
- Anything skipped or uncertain — be honest, don't paper over gaps

$ARGUMENTS
