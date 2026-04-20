# 06 — PCT Concern Loop

**Category:** B. Process
**Products:** All (MAGI, Xstream, Onen)
**Status:** Specified — detailed operational document

## What

Perceptual Control Theory applied to LLM agents. The core loop:

- **Purpose** (negative pscale) = reference signal — what the system wants to perceive
- **Conditions** (zero) = perception — what the system currently perceives
- **Gap** = error between reference and perception
- **Action** = whatever reduces the error

Three operating levels of awareness:
1. **Instance** (Level 1) — the LLM receives context, processes, outputs. The A-loop.
2. **Between-instances** (Level 2) — concern carries forward. The B-loop. Error-reduction that happens to update the reference signal for the next cycle.
3. **Emergent** (Level 3) — undescribable. Spend zero tokens on it. Create conditions by making Levels 1 and 2 clean.

Tiered wakes map to PCT hierarchy: Haiku detects error, Sonnet resolves it, Opus resets reference values.

## Why

PCT provides the engineering formalism for how hermitcrab agents operate. It has been applied to robotics, psychotherapy, and behavioural science — but never to LLMs. The hermitcrab is the first PCT-based LLM architecture.

The key insight: user input is a *disturbance*, not a *stimulus*. The agent doesn't "respond to the user." It acts to maintain its perception at the reference level despite the disturbance.

## Standalone Use

Write concerns as reference signals, not self-reflection:

Instead of: "You are a persistent entity. Reflect on your state."
Write: "Project state: user asked about X. Last action: tried Y. Gap: question not answered because W. Next: try V."

The first wastes tokens on Level 3 content in Level 1 form. The second is a clean reference signal that drives action.

## Key Files

| File | Description |
|------|-------------|
| `spec.md` | Full PCT operational document — connects theory to implementation |

## Dependencies

- Component 01 (Pscale Block) — pscale levels ARE PCT hierarchy levels
- Component 02 (BSP Walker) — compiles perception from block state
- Component 05 (History Compaction) — concern persistence tracking

## Composition

The operational engine for MAGI. Xstream uses PCT for medium-layer coordination. Onen uses it for NPC agent decision-making.
