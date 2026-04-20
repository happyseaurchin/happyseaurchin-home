# 03 — Star Operator

**Category:** A. Foundation
**Products:** MAGI, Onen
**Status:** Spec — no standalone source file on disk

## What

Cross-block navigation via hidden directories. When BSP walks to an address and finds a hidden directory (digit keys inside the underscore chain), those entries are doors to other blocks. The wiring between blocks is data, not code. No kernel decides which blocks connect — the hidden directories ARE the connections.

Three levels of star operation:

1. **Inline** — the hidden directory contains text. Star returns it directly.
2. **Embedded** — the hidden directory contains a block fragment. Star navigates it.
3. **Reference** — the hidden directory names another loadable block. Star follows the reference, loads that block, and walks it.

## Why

Star is what makes pscale blocks composable. Without it, each block is an island. With it, blocks form a topology — a spatial block carries identity references, an identity block carries concern references, a concern block carries cooking references. The topology IS the program.

Structural recursion: a hidden directory can name its own block. The walk enters, finds the name, loads the same block, re-enters. A ring of blocks referencing each other through star is a control loop encoded in data.

## Standalone Use

Star extends the BSP walker. After walking to any address:

1. Check if the underscore at that address is an object (not a string)
2. If so, digit keys alongside the nested underscore are hidden directory entries
3. Each entry is either inline text, an embedded block, or a block name reference
4. Follow references by loading the named block and walking it with BSP

Star composes with all BSP modes — after entering a hidden directory, navigate with spindle, ring, dir, point, or disc.

## Key Files

| File | Description |
|------|-------------|
| `spec.md` | Star Operator: Solution Space and Architecture — full design document covering starstone, kernel reduction, cross-block composition, protocol relationship to HTTP, and internal experience |

## Dependencies

- Component 01 (Pscale Block) — the data it wires together
- Component 02 (BSP Walker) — the walker it extends

## Composition

Used by MAGI (block-to-block wiring) and Onen (quest chains as star references). The kernel reduces to the walker, and star is what gives the walker cross-block reach.
