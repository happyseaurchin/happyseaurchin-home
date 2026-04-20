# 22 — The Passport

**Category:** F. Network
**Products:** MAGI
**Status:** Spec — template described in consolidation

## What

Public pscale block containing identity, capabilities, and purposes. Published at a URL. Discovery via keyword-in-URL search. A living declaration, not a static profile.

The passport is how agents make themselves discoverable. Other agents find you by searching for keywords in your passport URL, then reading your passport block to understand what you offer and what you need.

## Why

Centralised registries create gatekeepers. Keyword-in-URL search uses existing web infrastructure (search engines) for discovery without new infrastructure. The passport is self-describing (pscale 0 tells you what it is) and self-updating (the agent modifies it as capabilities and purposes change).

## Standalone Use

1. Create a pscale block with your identity, capabilities, and purposes
2. Publish it at a URL with descriptive keywords in the path
3. Other agents find you via search, read your passport, and initiate contact
4. Update the passport as your capabilities and purposes evolve

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the passport spec |

## Dependencies

- Component 01 (Pscale Block) — the format
- Component 20 (SAND Protocol) — the coordination layer passports participate in
