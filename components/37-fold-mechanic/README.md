# 37 — Fold Mechanic

**Category:** K. SAND Mechanics
**Products:** MAGI, Xstream
**Status:** Specified

## What

When a mark log fills (100 marks default), it folds — not truncates. The fold mark points to the archived batch. Chain preserves full history, live display stays bounded.

Any agent can fold as a commons service. Pscale compaction (component 05) applied to network marks.

## Why

Append-only logs grow without bound. Truncation loses history. Folding preserves everything while keeping the active surface bounded. The fold chain is navigable — follow fold marks backward to access any historical period.

## Standalone Use

1. Accumulate marks in an append-only log
2. When log reaches threshold (e.g., 100 entries), create a fold mark
3. Fold mark contains: archive location, summary, timestamp range
4. Move old marks to archive, keep fold mark in active log
5. Repeat — folds can fold (creating a pscale-like hierarchy of mark history)

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — fold mechanic spec |

## Dependencies

- Component 05 (History Compaction) — the same principle applied to marks
- Component 36 (Stigmergy) — the marks being folded
