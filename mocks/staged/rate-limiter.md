# Staged: Rate Limiter

**Format:** Meta CodeSignal-style. Build incrementally. ~90 min. All times are integer logical timestamps passed by the caller.

A rate limiter that decides whether a request is allowed for a given client key.

## Stage 1 — Fixed window counter

- `allow(key, timestamp)` → `true`/`false`. Limit is `N` requests per fixed window of `W` time units (window = `floor(timestamp / W)`).
- Counts reset at each window boundary.

## Stage 2 — Sliding window log

- Replace fixed windows with a true sliding window: a request is allowed if fewer than `N` requests occurred in `(timestamp - W, timestamp]`.
- Drop timestamps that have fallen out of the window.

## Stage 3 — Token bucket with refill

- Each key has a bucket of capacity `C`, refilling `R` tokens per time unit (fractional refill accumulates). `allow` consumes one token if available.
- `tokens(key, timestamp)` → current token count (after refill) for inspection.

## Stage 4 — Per-key tiers & introspection

- `setTier(key, capacity, refillRate)` overrides defaults for a key from now on, preserving the current token level.
- `stats(timestamp)` → `{ allowed, rejected }` totals, and `topRejected(k, timestamp)` → the `k` keys with the most rejections, ties broken by key ascending.

## Acceptance

Earlier stages keep passing as you add later ones. Watch fractional-refill rounding and window-boundary off-by-ones.
