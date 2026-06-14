# multi-platform-curriculum

## Purpose

Unify problem sources from multiple platforms (LeetCode, GeeksforGeeks, HackerRank, InterviewBit, Codeforces, AlgoFrog, and custom drills) into a single multi-platform curriculum. Move hardcoded problem lists out of skills and into versioned data files, import and de-duplicate problems across sources and already-solved work, map them onto the existing phases, merge them into the main curriculum, and serve the next problem through one round-robin picker — while keeping paid content out of version control.

## Requirements

### Requirement: Unified multi-platform item shape

Every curriculum item SHALL carry a `source` field identifying the platform it is solved on, one of `leetcode`, `geeksforgeeks`, `hackerrank`, `interviewbit`, `codeforces`, or `custom`. Items that omit `source` SHALL be treated as `leetcode` for backward compatibility. The item shape SHALL otherwise remain `{ slug, url, title, pattern, difficulty, phase, kind }`, with an optional `note`.

#### Scenario: Existing LeetCode item without source
- **WHEN** an item in `curriculum.json` has no `source` field
- **THEN** all tooling treats it as `source: "leetcode"`

#### Scenario: Imported GFG item carries source
- **WHEN** a problem is imported from the GFG list
- **THEN** the resulting item has `source: "geeksforgeeks"`

### Requirement: Platform lists live in data, not in skills

The four ordered lists (LeetCode Top 150, GFG 160, HackerRank Interview Prep Kit, InterviewBit) SHALL exist as versioned files under `data/sources/` using the unified item shape. No problem list SHALL be hardcoded inside a skill file.

#### Scenario: Lists extracted to data files
- **WHEN** the extraction step runs
- **THEN** `data/sources/leetcode-150.json`, `gfg-160.json`, `hackerrank-ipk.json`, and `interviewbit.json` each contain every problem the `suggest-problem` skill listed, in the same topic order

### Requirement: AlgoFrog import

`scripts/import-algofrog.ts` (runnable as `npm run import:algofrog`) SHALL read `data/sources/algofrog-export.json`, flatten its topics+layers into the unified item shape preserving topic order then `order_num`, derive `slug`/`url` from the problem URL (LeetCode, Codeforces, or `custom-<slug>` placeholder when no URL), tag `source`, carry `key_insight` into `note`, and write `data/sources/algofrog-curriculum.json`. Re-running SHALL be idempotent.

#### Scenario: Flatten preserves order
- **WHEN** the importer runs
- **THEN** problems appear in topic display order, and within a topic in ascending `order_num`

#### Scenario: Non-LeetCode rows are tagged, not dropped
- **WHEN** a row is a Codeforces problem or a URL-less custom drill
- **THEN** it is written with `source: "codeforces"` or `source: "custom"` and a derived slug, and is reported in the summary

#### Scenario: Idempotent re-run
- **WHEN** the importer is run twice with no input change
- **THEN** the output file content is identical and no item is duplicated

### Requirement: De-duplication across sources and solved work

The assembly SHALL never add a duplicate. LeetCode items SHALL be keyed by LeetCode number (fallback slug); GFG/HR/IB items by normalized `(platform + title)`; Codeforces by CF id; custom by `custom-<slug>`. Within AlgoFrog, a problem appearing under multiple topics SHALL be kept once (first occurrence wins). Problems already present in the solution folders (`leetcode/`, `geeksforgeeks/`, `hackerrank/`, `interviewbit/`) SHALL be detected as already-solved. All skipped items SHALL be reported.

#### Scenario: Already-solved LeetCode problem
- **WHEN** an imported LeetCode problem's number matches the leading integer of a file in `leetcode/`
- **THEN** it is counted as already-solved and reported, not added as new

#### Scenario: AlgoFrog internal duplicate
- **WHEN** the same LeetCode problem appears under two AlgoFrog topics
- **THEN** only the first-occurring copy is kept and the second is reported as a collapsed duplicate

#### Scenario: Already in curriculum
- **WHEN** an imported problem's slug already exists in `curriculum.json`
- **THEN** it is skipped and reported

### Requirement: Topic-to-phase mapping

Imported problems SHALL be assigned to one of the 6 existing phases by their source topic. Advanced AlgoFrog topics and any problem in a "Hard" layer SHALL be assigned to Phase 5. All other topics SHALL map to Phases 1–4 by pattern. `null` difficulty SHALL normalize to `Medium`; `Med`/`Medium` to `Medium`.

#### Scenario: Hard layer override
- **WHEN** an AlgoFrog problem's normalized layer is "Hard"
- **THEN** its `phase` is 5 regardless of its topic's base phase

#### Scenario: Advanced topic override
- **WHEN** a problem belongs to an advanced topic (e.g. Segment Tree, Digit DP)
- **THEN** its `phase` is 5

#### Scenario: Standard topic mapping
- **WHEN** a problem belongs to a Trees or Trie topic
- **THEN** its `phase` is 2

### Requirement: Merge into the main curriculum

A `--merge` flag SHALL fold imported problems into `data/curriculum.json`, keeping existing phase boundaries and ordering AlgoFrog problems within their pattern group by AlgoFrog order. For AlgoFrog only, `--merge` SHALL include just the `Foundation` and `Variants` layers. The four platform lists SHALL merge in full. The merge SHALL be idempotent and SHALL NOT write `note` (paid content) into the committed file.

#### Scenario: AlgoFrog merge layer filter
- **WHEN** `--merge` runs on AlgoFrog data
- **THEN** only Foundation and Variants layer problems are added to `curriculum.json`; Combo/Hard/Trap are excluded

#### Scenario: Merge strips notes
- **WHEN** an AlgoFrog problem with a `key_insight` note is merged into `curriculum.json`
- **THEN** the merged item has no `note` field

#### Scenario: Re-merge adds nothing
- **WHEN** `--merge` runs twice
- **THEN** the second run adds zero items

### Requirement: Single round-robin next-problem picker

`scripts/today.ts` SHALL be the only mechanism that suggests the next problem. It SHALL walk each platform's items in curriculum order, find the first unsolved problem per platform, and rotate across platforms in `leetcode → geeksforgeeks → hackerrank → interviewbit` order. The `suggest-problem` skill SHALL be removed only after the lists are extracted to data and verified.

#### Scenario: Rotation across platforms
- **WHEN** the user asks for the next problem repeatedly
- **THEN** suggestions rotate across the platforms in order, each being the first unsolved problem on that platform

#### Scenario: Skill removed after verification
- **WHEN** the four lists are confirmed present in `data/sources/` with full coverage
- **THEN** `.claude/skills/suggest-problem/` is deleted and no functionality is lost

### Requirement: Paid content stays out of version control

AlgoFrog `key_insight` and `topic_content` SHALL never be written to a git-tracked file. `data/sources/algofrog-curriculum.json` (which contains `note`) and `data/sources/algofrog-export.json` SHALL be gitignored. `data/sources/README.md` SHALL document how to refresh the export and re-run the importer.

#### Scenario: Generated file is ignored
- **WHEN** the importer writes `data/sources/algofrog-curriculum.json`
- **THEN** `git status` does not list it as a tracked change

#### Scenario: Committed curriculum has no paid text
- **WHEN** the merge writes `curriculum.json`
- **THEN** no `note`/`key_insight` text appears in the committed file
