# 01 — Pscale Block

**Category:** A. Foundation
**Products:** All (MAGI, Xstream, Onen)
**Status:** Implemented — the core data structure

## What

Nested JSON where semantic numbers are addresses. Digits 0-9 at each level, underscore (`_`) holds summary text. Self-describing — read pscale 0 first. Logarithmic compression, three-move access from anywhere.

A pscale block has exactly two fields: `decimal` (integer saying which nesting depth is pscale 0) and `tree` (the nested JSON). That is all.

## Why

Every other component in the xstream architecture sits on top of this. The BSP walker navigates it. History compaction compresses it. The seed bootstraps from it. The reflector distributes it. SAND coordinates through it. Pscale block is the single data structure beneath everything.

The format emerged from 25 years of Fulcrum framework research — a sequence of simplifications that removed every unnecessary element until only the keystone remained.

## Standalone Use

Any JSON-capable system can read and write pscale blocks. No library required — the structure is plain nested JSON with string keys.

1. Load a block's JSON
2. Read `tree._` (pscale 0) to understand what it is
3. Navigate deeper by following digit keys: `tree["1"]["3"]["2"]` reads pscale address 0.132
4. Write by placing content at unoccupied digit keys
5. When all 9 slots fill, compress into the parent underscore

## Key Files

| File | Description |
|------|-------------|
| `keystone.json` | The format specification — a pscale block that teaches the format by being one |
| `guidelines.json` | Authoring craft — how to write blocks that produce useful spindles |
| `design.json` | Systems design wisdom for LLM-inhabited semantic spaces |
| `examples/` | Example blocks (starstone, vision) showing the format in practice |

## Dependencies

None. This is the root.

## Composition

Every component 02-47 depends on this. Both composition JSONs terminate every spindle at Pscale Block (1).
