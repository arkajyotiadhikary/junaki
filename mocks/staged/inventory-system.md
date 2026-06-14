# Staged: Warehouse Inventory System

**Format:** Meta CodeSignal-style. Build incrementally. ~90 min. Times are integer logical timestamps.

Tracks stock of items across the warehouse.

## Stage 1 — Stock levels

- `addStock(itemId, qty)` and `removeStock(itemId, qty)` → new quantity, or `null` if removal exceeds stock.
- `getStock(itemId)` → current quantity (`0` if unknown).

## Stage 2 — Reservations

- `reserve(timestamp, orderId, itemId, qty)` → `true` if enough **available** (on-hand minus reserved) stock, holding it for that order.
- `release(orderId)` frees an order's reservations. `available(itemId)` → on-hand minus reserved.

## Stage 3 — Reservation expiry & fulfillment

- Reservations expire `T` time units after creation; expired holds free their stock lazily before any availability check at/after expiry.
- `fulfill(timestamp, orderId)` → consume reserved stock permanently (decrement on-hand, clear the hold), or `null` if expired/unknown.

## Stage 4 — Reporting

- `lowStock(threshold)` → item ids with available stock `< threshold`, sorted ascending.
- `topReserved(timestamp, n)` → up to `n` items with the most currently-active reserved quantity, ties broken by itemId ascending.

## Acceptance

Each stage layers on the last. Traps: available vs on-hand, lazy expiry ordering, fulfillment vs release.
