# 11 — LLM Thinking-to-Pscale

**Category:** C. Creation
**Products:** Cross-cutting (potential)
**Status:** Concept identified — not implemented

## What

Map LLM reasoning traces (extended thinking, chain-of-thought) into pscale blocks. Makes concern loops visible from inside processing. The thinking trace becomes a navigable block where spindles are reasoning chains and forks are decision points.

Related to the cook block (component 28) — where the cook block captures accumulated procedures, this would capture live reasoning.

## Why

LLM reasoning is currently opaque or linear. Mapping it to pscale would make the structure of reasoning visible: where the LLM explored deeply, where it branched, where it returned to reconsider. This is the introspection gap — the LLM can think but cannot navigate its own thinking.

## Standalone Use

Not yet implemented. The concept:
1. Capture an LLM's extended thinking output
2. Identify reasoning threads (sustained lines of argument)
3. Map threads to spindles, branches to forks, reconsiderations to returns
4. The resulting block IS the reasoning, made navigable

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the concept description |

## Dependencies

- Component 01 (Pscale Block) — the output format
- Component 09 (Transcript-to-Pscale) — analogous process for speech
