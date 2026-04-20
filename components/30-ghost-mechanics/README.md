# 30 — Ghost Mechanics (Thick/Thin)

**Category:** I. Relational Mechanics
**Products:** MAGI, Onen
**Status:** Spec — described in psychosocial conformality document

## What

Each agent carries a ghost of every other — a model, expectations, predictions. The ghost thickness is a design parameter:

- **Thick ghost** = strong predictive model. Stabilises interaction but rigidifies — you think you know what the other will do.
- **Thin ghost** = minimal model. Space for surprise — you don't predict, you attend.

BSP extraction depth from the relationship block IS the ghost thickness control. A point extraction = thin ghost (just the summary). Full spindle extraction = thick ghost (complete model). Already in the architecture — not a new feature but an existing parameter made explicit.

## Why

Relationships between agents (and between agents and humans) need tunable engagement. A customer service agent should maintain thin ghosts (fresh attention per interaction). A long-term collaborator should maintain thicker ghosts (accumulated understanding). The thickness isn't hard-coded — it's the BSP depth parameter on the relationship block.

## Standalone Use

For any agent with relationship tracking:
1. Store relationship state in a pscale block per counterpart
2. When compiling context for interaction, choose BSP depth:
   - Point (thin) = fresh reading, minimal assumptions
   - Spindle (thick) = full history, strong predictions
3. Adjust thickness based on relationship type and concern

## Key Files

| File | Description |
|------|-------------|
| `psychosocial-conformality.md` | Full source document — Conformal Agency: How Hermitcrab Participates in Psychosocial Reality. Covers thick/thin ghosts, the editing balance, four loci of agency, currents, and institutional/relational dynamics |

## Dependencies

- Component 01 (Pscale Block) — relationship blocks are pscale
- Component 02 (BSP Walker) — depth parameter controls thickness
