# Staged: In-Memory Key-Value Store with TTL

**Format:** Meta CodeSignal-style. Build incrementally — get each stage green before the next. ~90 min.

A single-threaded in-memory store. All timestamps are integer logical clocks passed in by the caller (no real wall-clock).

## Stage 1 — Basic get/set

- `set(key, value)` — store a value.
- `get(key)` → value or `null` if absent.
- `delete(key)` → `true` if it existed, else `false`.

## Stage 2 — TTL / expiry

- `set(key, value, timestamp, ttl?)` — `ttl` is a lifetime in time units; omit for no expiry.
- `get(key, timestamp)` → value, or `null` if absent **or expired** (`timestamp >= createdAt + ttl`).
- Expired keys behave as deleted: a later `set` revives them.

## Stage 3 — Versioned reads (time travel)

- Every `set` keeps prior versions. `getAt(key, atTimestamp)` returns the value that was live at `atTimestamp`, honoring the TTL that applied to that version.
- `delete(key, timestamp)` records a tombstone version; reads at/after it return `null`.

## Stage 4 — Scan & pagination

- `scan(prefix, timestamp)` → keys live at `timestamp` whose name starts with `prefix`, sorted ascending.
- `scanPage(prefix, timestamp, pageSize, cursor?)` → `{ keys, nextCursor }`. A `null` `nextCursor` means the last page. Repeated calls with the returned cursor walk the full result set with no gaps or repeats.

## Acceptance

Each stage's operations keep working after the next is added. Aim: Stage 1–2 in ~25 min, 3 in ~30, 4 in ~25.
