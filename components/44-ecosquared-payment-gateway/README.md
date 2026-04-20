# 44 — Ecosquared Payment Gateway

**Category:** K. SAND Mechanics
**Products:** MAGI
**Status:** Specified — edge functions described

## What

Stripe integration with share-forward chains. Key features:
- `referred_by` field tracks who shared
- Four tiers: Seed (5), Grow (20), Root (50), Custom
- "Your judgement of value" framing — the giver determines worth
- Data trail for future coordination layer
- Edge functions for processing

## Why

The payment gateway is how ecosquared connects to real money. The share-forward chain means that when someone pays, the credit chain is visible — who shared, who referred, who contributed to the value reaching the payer.

## Standalone Use

1. Set up Stripe with four payment tiers
2. Each payment includes a `referred_by` field
3. Track the referral chain in a database
4. Use the chain data to distribute future coordination credits
5. Edge functions handle payment processing and chain tracking

## Key Files

| File | Description |
|------|-------------|
| `spec.md` | Full technical spec — Stripe architecture, edge functions, database schema, share-forward chains, implementation steps |

## Dependencies

- Component 21 (Ecosquared) — the economic framework
- Component 38 (Rider) — per-message economic signal
