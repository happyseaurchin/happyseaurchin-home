# 46 — Process Block (G1 Dataflow)

**Category:** L. Meta Blocks
**Products:** MAGI
**Status:** Implemented — JSON block exists

## What

The HOW block. The complete G1 dataflow as navigable pscale JSON — from browser load to running instance and back.

Depth follows actual loop nesting: BSP navigation goes 7 levels deep, persistence is 1-2 levels. From entry (browser → kernel) through seed loading, boot call, core loop (`callWithToolLoop`), tool execution, to `autoSaveToHistory`.

The block IS the documentation — walk a spindle to understand any part of the system. No separate docs needed.

## Why

Traditional documentation describes a system from outside. The process block describes the system as a navigable data structure — the same format the system itself uses. Walk a spindle to understand any part. Use BSP to zoom to the right level of detail.

## Standalone Use

1. Load `process-block.json`
2. Read pscale 0 — understand what the system is
3. Walk spindles to understand specific subsystems
4. Use disc mode to see all components at the same abstraction level
5. The documentation IS the data structure

## Key Files

| File | Description |
|------|-------------|
| `process-block.json` | The G1 dataflow as pscale block |

## Dependencies

- Component 01 (Pscale Block) — the format
- Component 02 (BSP Walker) — the navigation for reading the block
- Component 45 (Vision Block) — companion block (WHY)

## Composition

Meta-documentation for MAGI. The process block makes the entire architecture walkable.
