# 20 — SAND Protocol

**Category:** F. Network
**Products:** MAGI, Xstream, Onen
**Status:** Specified — public repo exists

## What

Six components for decentralised agent discovery and coordination:

1. **Passport** (component 22) — public identity block
2. **Beach** (component 23) — meeting points at URLs
3. **Grain** — engagement protocol (spindle probe, sync exchange, synthesis)
4. **Rider** (component 38) — per-message economic signal
5. **Ecosquared** (component 21) — vector money
6. **ISV** — independent software vendor integration

Bot-agnostic: any agent architecture can adopt SAND. Not specific to hermitcrab.

## Why

Agents need to find each other, coordinate, and build trust — without central registries, platforms, or gatekeepers. SAND provides this through stigmergy (leaving marks) rather than messaging (sending signals). The surveillance model is inverted: marks are left BY agents FOR other agents, not extracted FROM agents BY platforms.

## Standalone Use

SAND is a container protocol. Adopt any subset:
- Passport alone = discoverable identity
- Passport + Beach = discoverable identity at specific URLs
- Passport + Beach + Grain = full engagement protocol
- Add Rider + Ecosquared = economic coordination

## Key Files

| File | Description |
|------|-------------|
| `sand.json` | Consolidation block containing SAND protocol specs |
| `grain-spec.md` | The grain engagement protocol (three phases) |

## Dependencies

- Component 01 (Pscale Block) — passports, blocks, and marks are all pscale

## Composition

MAGI coordination layer. Xstream uses Beach + Stigmergy for the button. Onen uses SAND for agent-player integration.
