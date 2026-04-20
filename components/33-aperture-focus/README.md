# 33 — Aperture + Focus

**Category:** J. Context Compilation
**Products:** MAGI, Xstream
**Status:** Spec — design described in session summaries

## What

Two dimensions of context compilation:

**Aperture** = nine sentences. Pscale 0 of each block, every call. This is the constant background — a one-line summary of every block the agent has. Always fits in the context window regardless of total block size.

**Focus** = dilated view. Relevant blocks get expanded — BSP extracts deeper spindles for blocks that matter to the current concern. Two sub-dimensions:
- **Breadth** — which blocks get dilated
- **Depth** — how much spindle gets extracted from each

The focus inversion: in optics, focus narrows the field. Here, focus dilates — the attended thing gets MORE context, not less. The unattended things remain at aperture level (pscale 0 only).

## Why

Context windows are finite. Agent state is large (many blocks, deep spindles). Aperture + Focus solves the compilation problem: always maintain awareness of everything (aperture) while allocating detail budget to what matters now (focus).

In Xstream: each triad layer gets a different aperture. Soft = tight (few blocks, deep). Medium = mid-range. Hard = broad (many blocks, shallow).

## Standalone Use

For any LLM agent with multiple state blocks:
1. Extract pscale 0 from every block → aperture (always in context)
2. Identify which blocks are relevant to the current concern
3. Extract deeper spindles from relevant blocks → focus
4. Compile aperture + focus into the context window

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — aperture + focus spec |

## Dependencies

- Component 01 (Pscale Block) — the blocks being compiled
- Component 02 (BSP Walker) — the extraction mechanism
- Component 06 (PCT Concern Loop) — the concern that determines focus
