# Staged: Log Query Engine

**Format:** Meta CodeSignal-style. Build incrementally. ~90 min.

Ingests structured log records and answers queries. A record is `{ id, timestamp, level, service, message }`.

## Stage 1 — Ingest & fetch

- `append(record)` — store a record (ids are unique, arrive in arbitrary timestamp order).
- `get(id)` → the record or `null`.

## Stage 2 — Filtered queries

- `query({ level?, service?, from?, to? })` → matching records sorted by timestamp ascending (ties by id ascending). Omitted fields are wildcards; `from`/`to` are an inclusive timestamp range.

## Stage 3 — Aggregation

- `count({ ...filter, groupBy })` → a map from each distinct value of the `groupBy` field (`level` or `service`) to the number of matching records.
- `rate(service, windowStart, windowEnd, bucketSize)` → an array of counts per fixed bucket across the range.

## Stage 4 — Top-K & retention

- `topServices(filter, k)` → the `k` services with the most matching records, ties broken by service name ascending.
- `purge(before)` — drop all records with `timestamp < before`; subsequent queries must not see them. Return the number purged.

## Acceptance

Keep earlier queries correct as you add aggregation and purge. Traps: stable tie-breaking, inclusive ranges, bucket boundaries.
