## ADDED Requirements

### Requirement: Per-platform progress in stats

The stats output SHALL count problems across all platforms and break progress down by `source` (LeetCode, GeeksforGeeks, HackerRank, InterviewBit, Codeforces, custom), rather than counting LeetCode only. Totals SHALL reflect the assembled multi-platform curriculum.

#### Scenario: Source breakdown shown
- **WHEN** stats are generated for a curriculum containing multiple sources
- **THEN** the output shows solved/total counts grouped by `source`

#### Scenario: Items without source counted as LeetCode
- **WHEN** a curriculum item has no `source` field
- **THEN** it is counted under `leetcode` in the breakdown
