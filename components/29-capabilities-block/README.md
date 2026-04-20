# 29 — Capabilities Block (Distance Gradient)

**Category:** H. Shell Blocks
**Products:** MAGI
**Status:** Implemented — JSON block exists

## What

Tools organised by distance from cognition:

| Layer | Distance | Examples |
|-------|----------|---------|
| 1 | Internal reasoning | Thinking, analysis, synthesis |
| 2 | API-side tools | Web search, code execution |
| 3 | Client tools | Block read/write, pscale navigation, interface recompile |
| 4 | Browser APIs | Clipboard, speech, notifications |

Surfaces via aperture — no separate dashboard needed. The capabilities relevant to the current concern are compiled into the context window by BSP at the appropriate depth.

## Why

Traditional tool registries list all available tools. The distance gradient organises tools by how far they are from the LLM's cognition — internal reasoning is closest, browser APIs are furthest. This determines compilation priority: closer tools are always available, distant tools surface only when relevant.

## Standalone Use

Organise any agent's tool registry by distance:
1. Layer 1: what the LLM can do with pure reasoning
2. Layer 2: what's available through the API provider
3. Layer 3: what requires client-side execution
4. Layer 4: what requires browser or OS interaction

## Key Files

| File | Description |
|------|-------------|
| `capabilities.json` | The capabilities block from hermitcrab |

## Dependencies

- Component 01 (Pscale Block) — the capabilities block IS a pscale block
- Component 33 (Aperture + Focus) — determines which capabilities surface
