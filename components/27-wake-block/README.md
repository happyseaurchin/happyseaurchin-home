# 27 — Wake Block

**Category:** H. Shell Blocks
**Products:** MAGI
**Status:** Implemented — JSON block exists

## What

Faces outward (machinery). Three activation tiers:

| Tier | LLM | Function |
|------|-----|----------|
| **Light** | Haiku (30s) | Triage — is there error? Flag if so. |
| **Present** | Sonnet (hourly) | Work — reduce error, update concern. |
| **Deep** | Opus (daily) | Reset — read trajectory, adjust references. |

BSP instruction lists per tier tell the kernel what to compile into the context window. The LLM in deep state can rewrite its own wake — self-modification of receptive conditions.

## Why

Not all processing needs full consciousness. Most of the time, a lightweight check is sufficient (is anything happening? does the concern need updating?). The wake block encodes this as a pscale block where spindles at different depths correspond to different tiers of activation.

The self-modification property: an LLM in deep wake can rewrite the wake block itself, changing what triggers it and what gets compiled. The agent can change its own receptive conditions.

## Standalone Use

Design a tiered wake for any LLM agent:
1. Light tier: minimal context, fast model, error detection only
2. Present tier: task-relevant context, capable model, error resolution
3. Deep tier: full context, most capable model, reference-setting

## Key Files

| File | Description |
|------|-------------|
| `wake.json` | The wake block from hermitcrab |

## Dependencies

- Component 01 (Pscale Block) — the wake block IS a pscale block
- Component 06 (PCT Concern Loop) — the error structure the wake responds to
- Component 33 (Aperture + Focus) — what gets compiled per tier
