# 14 — Soft / Medium / Hard LLM Triad

**Category:** D. Interface
**Products:** Xstream, Onen
**Status:** Spec — architectural design

## What

Three LLM layers, each with three functions:

| Layer | Function 1 | Function 2 | Function 3 | Scope |
|-------|-----------|-----------|-----------|-------|
| **Soft** | Reflection | Condensation | Forking | 1:1 with user |
| **Medium** | Synthesis | Mediation | Intervention | Peers / group |
| **Hard** | Archiving | Focus | Alerts | Background |

The minimal convection cell: soft handles the personal, medium handles the social, hard handles the persistent. Together they create a circulation pattern — soft generates, medium synthesises, hard archives. The cycle repeats.

## Why

A single LLM handling all functions creates contradictions — it must simultaneously be reflective (slow, personal) and alerting (fast, impersonal). The triad separates these into distinct layers with distinct apertures, distinct concern levels, and distinct shelf zones.

Each layer gets a different view of the same pscale blocks (via aperture, component 33): soft sees tight/deep, medium sees mid-range, hard sees broad/shallow.

## Standalone Use

The triad pattern applies to any multi-LLM coordination system:
1. Assign distinct roles to distinct LLM instances
2. Give each instance a different aperture onto the same data
3. Soft = personal engagement, medium = group coordination, hard = background maintenance
4. Route user-facing interaction through soft, group synthesis through medium, persistence through hard

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the architectural spec |

## Dependencies

- Component 01 (Pscale Block) — shared data all three layers navigate
- Component 12 (Shelf) — the commitment gradient the triad operates across
- Component 33 (Aperture + Focus) — different apertures per layer
