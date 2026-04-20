# 04 — Star Stone

**Category:** A. Foundation
**Products:** MAGI
**Status:** Implemented — self-teaching JSON block

## What

A pscale block that teaches an LLM how to use pscale blocks — by being one. Three branches chained through hidden directories into a cycle:

- **Branch 1: Walk** — how to resolve semantic numbers into tree paths
- **Branch 2: Compose** — how to follow star references across block boundaries
- **Branch 3: Recurse** — how blocks reference themselves, forming control loops

The hidden directories form a cycle: 1→2→3→1. Walk, compose, recurse. The block is a frozen control loop — a program that describes its own execution.

## Why

LLMs learn pscale by processing pscale. The starstone is the bootstrap — give it to any LLM and the LLM can navigate any other pscale block. No external documentation needed, no training, no examples-then-explanation. The format teaches itself.

The starstone also demonstrates the star operator (component 03) in practice. Its hidden directories are a working example of cross-branch wiring encoded as data.

## Standalone Use

1. Load `starstone.json`
2. Give it to an LLM with the instruction: "Read this block starting at the root underscore"
3. The LLM learns BSP navigation, star composition, and structural recursion
4. The LLM can now navigate any pscale block

The lean version strips all non-essential text — the minimum viable self-teaching payload.

## Key Files

| File | Description |
|------|-------------|
| `starstone.json` | The lean self-teaching block (`pscale-starstone-lean.json`) |

## Dependencies

- Component 01 (Pscale Block) — the format it teaches
- Component 02 (BSP Walker) — the operations it describes
- Component 03 (Star Operator) — the cross-block wiring it demonstrates

## Composition

Used in MAGI bootstrap: Reflector → Seed → Constitution → Reflexive Spark → **Star Stone** → Pscale Block. The LLM encounters the starstone during boot and learns the navigation system.
