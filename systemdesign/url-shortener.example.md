---
problem: Design a URL Shortener (example)
difficulty: Medium
date: 2026-01-08
source: https://github.com/donnemartin/system-design-primer
timeboxMinutes: 45
---

# Design a URL Shortener (example)

> EXAMPLE FILE — delete me with `npm run reset` when you start your own practice.
> This shows what a finished 45-min exercise looks like. Yours will be rougher
> the first time — that's the point. Fill it from a blank page, then compare.

## Step 1 — Use cases, constraints, back-of-envelope estimates

**Prompts checklist (answer every line before designing):**

- [x] Who are the users? What are the core use cases (and explicit non-goals)?
- [x] Scale numbers — DAU / MAU, total users, growth?
- [x] Read/write ratio?
- [x] Storage estimate — bytes/object × objects → total (per year)?
- [x] QPS estimate — average and peak reads/writes per second?

**Use cases:**

- Shorten a long URL into a short code; resolve a short code back to the long URL.
- Non-goals: custom analytics dashboards, user accounts (v1).

**Constraints & assumptions:**

- 100M new links/day. Links readable for 5 years.
- Read-heavy: ~100 reads per write.

**Back-of-envelope estimates:**

- Writes: 100M/day ≈ 1,160 writes/sec. Reads: ~116k/sec peak.
- Storage: 100M/day × 365 × 5 × ~500 bytes ≈ ~90 TB over 5 years.

## Step 2 — High-level design

```
[ client ] -> [ load balancer ] -> [ app servers ] -> [ cache ] -> [ key-value store ]
                                                  \-> [ id generator ]
```

## Step 3 — Core components deep-dive

**Data model:**

```
links: short_code (PK) -> long_url, created_at
```

**API sketch:**

```
POST /shorten   { longUrl }      -> { shortCode }
GET  /{code}                     -> 301 redirect to long_url
```

**Component notes:**

- Short code = base62 of a globally unique 64-bit id (counter or snowflake).
- Cache hot codes (read-heavy) in front of the key-value store.

## Step 4 — Scale the design

- **Load balancer** — spread the 116k/sec read peak across app servers.
- **Caching** — most reads hit a small set of viral links; cache absorbs them.
- **Database sharding** — shard the key-value store by short_code hash.
- **Replication** — read replicas for redirects; redirects must stay fast.
- **Async / queues** — write click events to a queue for later analytics.

## Self-review

- **What I missed vs the reference:**
  - Forgot to discuss code collisions and the 301-vs-302 redirect trade-off.
- **What the reference did differently (and why):**
  - Used a pre-generated key pool to avoid id-generation hotspots.
- **Confidence score (1–5):** 3
