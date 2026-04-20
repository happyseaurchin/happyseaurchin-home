# 28 — Cook Block

**Category:** H. Shell Blocks
**Products:** MAGI, Onen
**Status:** Implemented — JSON block exists

## What

Faces inward (LLM thinking). Each spindle IS a tested procedure — the actual sequence of steps for a specific task. Accumulated competence persisting across instances.

The cook block evolves across LLM generations: new models read old recipes, strip the obvious (what's now built into the model's capabilities), and write superior algorithms. The cook block is a living record of operational knowledge that improves with each generation.

## Why

LLM instances are stateless — each one starts fresh. The cook block provides accumulated operational knowledge without requiring the LLM to rediscover procedures. It's the difference between a new chef who has to figure out every recipe and one who has a tested cookbook.

In Onen: NPC agents use cook blocks for role-specific procedures ("how to be a barkeeper").

## Standalone Use

Build a cook block for any LLM agent:
1. When the agent successfully completes a novel procedure, write it as a spindle
2. Each spindle is a step-by-step recipe, tested and verified
3. When the agent encounters a similar task, BSP navigates to the relevant recipe
4. Periodically, review recipes — strip what's now obvious, refine what's not

## Key Files

| File | Description |
|------|-------------|
| `cook.json` | The cook block from hermitcrab (~27KB) |

## Dependencies

- Component 01 (Pscale Block) — the cook block IS a pscale block
- Component 02 (BSP Walker) — navigates to relevant recipes
