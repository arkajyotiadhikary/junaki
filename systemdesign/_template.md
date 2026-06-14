---
problem: <Problem Title>
difficulty: <Easy | Medium | Hard>
date: <YYYY-MM-DD>
source: <reference URL — e.g. system-design-primer / awesome-system-design-resources>
timeboxMinutes: 45
---

# <Problem Title>

> 45-min timebox. Fill this from a blank page WITHOUT looking at references.
> Then spend ~30 min comparing against a reference solution (Self-review at the bottom).

## Step 1 — Use cases, constraints, back-of-envelope estimates

**Prompts checklist (answer every line before designing):**

- [ ] Who are the users? What are the core use cases (and explicit non-goals)?
- [ ] Scale numbers — DAU / MAU, total users, growth?
- [ ] Read/write ratio?
- [ ] Storage estimate — bytes/object × objects → total (per year)?
- [ ] QPS estimate — average and peak reads/writes per second?

**Use cases:**

-

**Constraints & assumptions:**

-

**Back-of-envelope estimates:**

-

## Step 2 — High-level design

> ASCII diagram, or paste an Excalidraw link. Boxes = services, arrows = requests.

```
[ client ] -> [ ? ] -> [ ? ]
```

## Step 3 — Core components deep-dive

**Data model:**

```
-- tables / collections / key shapes
```

**API sketch:**

```
METHOD /path  ->  request / response
```

**Component notes:**

-

## Step 4 — Scale the design

> Add each piece only if Step 1's numbers demand it. **Justify each addition** — what bottleneck does it remove?

- **Load balancer** —
- **Caching** —
- **Database sharding** —
- **Replication** —
- **Async / queues** —

## Self-review

> Filled AFTER comparing against the reference solution.

- **What I missed vs the reference:**
  -
- **What the reference did differently (and why):**
  -
- **Confidence score (1–5):**
