# Staged: URL Shortener

**Format:** Meta CodeSignal-style. Build incrementally. ~90 min. Times are integer logical timestamps.

An in-memory short-link service.

## Stage 1 — Shorten & resolve

- `shorten(longUrl)` → a short code. The same long URL may map to multiple codes (each call mints a new one); codes are unique.
- `resolve(code)` → the long URL or `null`.

## Stage 2 — Custom aliases & deletion

- `shortenCustom(longUrl, alias)` → `true`, or `false` if the alias is taken.
- `remove(code)` — invalidate a code; later `resolve` returns `null`.

## Stage 3 — Expiry & click stats

- `shorten(longUrl, timestamp, ttl?)` — codes optionally expire `ttl` units after creation. `resolve(code, timestamp)` returns `null` once expired.
- Every successful `resolve` is a click. `clicks(code)` → total successful resolves.

## Stage 4 — Analytics

- `topLinks(timestamp, n)` → up to `n` currently-live codes with the most clicks, ties broken by code ascending.
- `cleanup(timestamp)` → remove all expired codes and return how many were removed.

## Acceptance

Each stage builds on the last. Traps: per-call unique codes, expiry affecting both resolve and stats, live-only ranking.
