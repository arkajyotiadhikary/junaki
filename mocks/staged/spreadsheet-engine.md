# Staged: Spreadsheet Engine

**Format:** Meta CodeSignal-style. Build incrementally. ~90 min.

Cells are addressed like `A1`, `B2` (column letters + 1-based row).

## Stage 1 — Literal cells

- `setCell(ref, value)` — store an integer literal.
- `getValue(ref)` → the integer, or `0` for an empty cell.

## Stage 2 — Sum formulas

- A value may be a formula string like `"=A1+B2+5"` (only `+`, mixing cell refs and integer literals).
- `getValue(ref)` resolves the formula, recursively evaluating referenced cells. Empty referenced cells count as `0`.

## Stage 3 — Recalculation & cycle detection

- Changing a cell must be reflected by later `getValue` calls on dependents (recompute on read is fine).
- If a `setCell` would create a circular dependency, reject it (return an error / `false`) and leave the prior value intact.

## Stage 4 — Ranges & cell movement

- Support `SUM(A1:B3)` over a rectangular range.
- `copyCell(src, dst)` — copy a formula with **relative** ref adjustment (copying `=A1` from `B1` to `C1` yields `=B1`). Literals copy unchanged.

## Acceptance

All prior behavior keeps working. Traps: relative-ref math, cycle detection on update, range expansion.
