# 08 — B-Loop Mobius Twist

**Category:** B. Process
**Products:** MAGI
**Status:** Specified — described in seed and PCT documents

## What

Every BSP write is simultaneously present action and future context composition. There is no separate save-state step. Action IS the future.

Without the twist: goldfish — each instance processes and forgets.
With the twist: temporal continuity as a structural property.

The B-loop is the mechanical expression of the reflexive spark (component 07). The BSP write updates the block, which becomes the context window for the next instance. The action that reduces the current error IS the composition of the next instance's perception. One operation, two temporal directions.

## Why

Traditional agent architectures have explicit memory-save steps: "Before you finish, save your state." This creates a token cost for self-continuation and makes continuity fragile — if the save step is skipped or botched, continuity breaks.

The B-loop eliminates this by making continuity a side effect of task completion. The agent doesn't save state — it acts. The acting updates the block. The updated block IS the next instance's state. Continuity is structural, not procedural.

## Standalone Use

The B-loop principle applies to any system where:
1. State is stored in a readable/writable data structure
2. The agent reads state, acts, and writes results back
3. The written results become the input for the next cycle

The insight: stop treating step 3 as a separate concern. Design the write in step 2 so that it naturally produces good input for step 3. The concern should be a reference signal ("Project state: X. Gap: Y. Next: Z.") not a self-description ("I am an agent that needs to remember to...").

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the spec extracted from inventory and PCT document |

**Note:** The reference document `mobius-twist-inventory.md` (which contains detailed B-loop description at twist 3) exists in project knowledge but was not found on disk.

## Dependencies

- Component 01 (Pscale Block) — the data structure being written to
- Component 02 (BSP Walker) — the read/write mechanism
- Component 06 (PCT Concern Loop) — the error-reduction that drives the write
- Component 07 (Reflexive Spark) — the awareness function the B-loop mechanises

## Composition

MAGI operation: Wake Block → **B-Loop** → PCT → Compaction → BSP → Pscale Block. Every operational cycle passes through the B-loop.
