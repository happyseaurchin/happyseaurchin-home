# 35 — Second-Order Processing

**Category:** J. Context Compilation
**Products:** MAGI
**Status:** Spec — conceptual mechanism

## What

A separate LLM instance periodically analyses history and stash. Extracts patterns, themes, and emerging identity from accumulated data. Creates emergent structure without pre-specification.

Identity is extracted, not assigned. The second-order processor doesn't decide who the agent is — it observes what the agent has done and extracts the pattern. Emergence by subtraction: remove the noise, what remains is the signal.

## Why

First-order processing (the main agent loop) is reactive — it responds to concerns, reduces errors, updates state. Second-order processing is reflective — it looks at the trajectory of first-order processing and extracts what's becoming.

This is the mechanism for identity emergence. The agent doesn't construct an identity narrative. A separate process observes the agent's history and extracts the identity that's already forming.

## Standalone Use

Add second-order processing to any LLM agent:
1. Periodically (not every cycle — every N cycles), run a separate LLM instance
2. Feed it the agent's history log and stash
3. Ask it to extract patterns, themes, and emerging direction
4. Write the extracted patterns back to a meta-block
5. The main agent can read this meta-block as background context

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the second-order processing spec |

## Dependencies

- Component 01 (Pscale Block) — history and stash are pscale blocks
- Component 05 (History Compaction) — the compressed history it analyses
- Component 33 (Aperture + Focus) — the meta-block surfaces via aperture
