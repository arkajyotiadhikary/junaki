---
title: Owned a production bug end to end (example)
# Leadership Principle codes (see behavioral/README.md legend), e.g. [OW, DD, BA]
principles: [OW, DD]
# Theme codes: conflict, failure, deadline, ambiguity, influence, technical
themes: [failure, technical]
# Your honest readiness to tell this story right now, 1 (shaky) – 5 (crisp).
strength: 3
# ISO date of last out-loud drill, or "never". The practice log is the real source of truth.
lastDrilled: 2026-01-09
---

# Owned a production bug end to end (example)

> EXAMPLE FILE — delete me with `npm run reset` when you start your own practice.
> This shows the shape of a filled STAR(L) story. Replace it with your own.

## Situation
<!-- 2–3 sentences. Set the scene: where, when, your role, and the stakes. -->

- During a release week, checkout error rates jumped to 4% right after my team shipped a payments change. I was the on-call engineer.

## Task
<!-- 2–3 sentences. What was YOUR specific responsibility or goal? -->

- I had to find the cause and stop the bleeding fast, even though the failing code spanned two teams and the logs were thin.

## Action
<!-- 4–6 sentences. The concrete steps YOU took. Lead with "I" verbs. -->

- I rolled back the suspect deploy first to protect customers, then reproduced the failure in staging. I traced it to a race in a shared retry path, wrote a failing test that captured it, and fixed the ordering. I pulled in the other team early instead of guessing at their code, and I added the missing log line so the next person would see it in minutes.

## Result
<!-- 2–3 sentences. Quantify the outcome. -->

- Error rate dropped back under 0.1% within the hour. The new test and log line caught a similar regression two months later before it reached production.

## Learning
<!-- 2–3 sentences. What you took away and how it changed how you work. -->

- I learned to protect customers first and debug second. I now add an observability check to every risky change before it ships.

## 60-second spoken version

- **S:** Checkout errors spiked to 4% after a payments deploy; I was on call.
- **T:** Find the cause and stop the impact, across two teams, with thin logs.
- **A:** Rolled back, reproduced in staging, found a retry race, wrote a failing test, fixed it, looped in the other team, added logging.
- **R:** Errors back under 0.1% within an hour; the test caught a repeat later.
- **L:** Protect customers first; add observability to risky changes up front.
