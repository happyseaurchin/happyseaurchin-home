# 39 — SQ Algorithm (Social Quotient)

**Category:** K. SAND Mechanics
**Products:** MAGI
**Status:** Specified — mathematical foundations documented

## What

Tracks gratitude through chains. Not stars, not reviews, not likes. When a need is satisfied through a routing chain, every helper in the chain gets credit.

Reputation = routing history visible in passport. Trust accretes from demonstrated coordination, not from ratings or reviews.

## Why

Traditional reputation systems (stars, likes, reviews) are vulnerable to gaming and don't capture coordination quality. SQ tracks actual routing success: did the chain of agents successfully connect a need to its satisfaction? If yes, every node in the chain benefits.

## Standalone Use

1. Agent A has a need, broadcasts it
2. Agent B routes it to Agent C, who satisfies it
3. Agent A signals satisfaction (rider with positive eval)
4. Credit flows backward through the chain: C gets most, B gets routing credit
5. Both B and C accumulate SQ score visible in their passports

## Key Files

| File | Description |
|------|-------------|
| `sq-mathematics.md` | Mathematical foundations of the SQ algorithm |
| `trust-origin.md` | Trust origin and initial conditions |

## Dependencies

- Component 38 (Rider) — carries the SQ signal per-message
- Component 22 (Passport) — where SQ accumulates
