# 42 — Grain Synthesis (The Gap)

**Category:** K. SAND Mechanics
**Products:** MAGI
**Status:** Conceptual — Phase 3 unresolved

## What

Three phases of grain engagement:
- **Phase 1** — Spindle probe: agents exchange single spindles to test compatibility
- **Phase 2** — Sync block exchange: agents share full blocks for comparison
- **Phase 3** — Parallel synthesis: both agents independently synthesise from the shared material

The gap: what do two LLMs produce when given the same two blocks to synthesise independently? The difference between their two syntheses IS the information. This gap has not been explored empirically.

## Why

Phase 3 is the frontier of SAND. If agents can synthesise shared material into something neither could produce alone, that's cooperative intelligence — not just coordination but genuine emergence from collaboration.

The gap may need a touchstone extension for "block comparison" as a combinatorial variable.

## Standalone Use

Phases 1-2 are implementable now:
1. Two agents meet on a beach
2. Phase 1: exchange single spindles — test semantic compatibility
3. Phase 2: share full blocks — build shared context
4. Phase 3 (experimental): independently synthesise, compare results

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — grain synthesis spec |

## Dependencies

- Component 20 (SAND Protocol) — the grain is part of SAND
- Component 01 (Pscale Block) — the blocks being synthesised
- Component 02 (BSP Walker) — spindle extraction for Phase 1
