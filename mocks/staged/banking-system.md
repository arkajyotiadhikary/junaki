# Staged: Banking System

**Format:** Meta CodeSignal-style. Build incrementally. ~90 min. Times are integer logical timestamps.

A ledger of accounts. Amounts are integers (cents).

## Stage 1 — Accounts & balance

- `createAccount(timestamp, accountId)` → `false` if it already exists, else `true`.
- `deposit(timestamp, accountId, amount)` → new balance, or `null` if no such account.
- `transfer(timestamp, src, dst, amount)` → new source balance, or `null` if invalid (missing account, same account, insufficient funds).

## Stage 2 — Spending ranking

- Track total **outgoing** value (transfers + payments) per account.
- `topSpenders(timestamp, n)` → up to `n` account ids ordered by total outgoing descending, ties broken by accountId ascending.

## Stage 3 — Scheduled payments with cashback

- `pay(timestamp, accountId, amount)` → a payment id `payment{ordinal}`, or `null` if insufficient. The amount leaves immediately; 2% cashback (rounded down) returns at `timestamp + 24h`.
- `getPaymentStatus(timestamp, accountId, paymentId)` → `"IN_PROGRESS"` / `"CASHBACK_RECEIVED"`, or `null` if unknown. Cashback must be applied lazily before any balance-affecting op at/after its due time.

## Stage 4 — Merge accounts & historical balance

- `mergeAccounts(timestamp, a, b)` — fold `b` into `a`: balances and outgoing totals combine, pending cashbacks redirect to `a`, and `b` ceases to exist.
- `getBalanceAt(timestamp, accountId, atTimestamp)` → balance at `atTimestamp` (accounting for cashback already due then), or `null` if the account didn't exist.

## Acceptance

Each stage builds on the last. Watch cashback timing and merge bookkeeping.
