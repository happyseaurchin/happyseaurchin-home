# 17 — Claude Artifact RPG Engine

**Category:** D. Interface
**Products:** Onen
**Status:** Prototype — world and rules blocks exist

## What

Multiplayer RPG inside Claude artifacts. Key mechanisms:

- `window.storage` (shared=true) as multiplayer bus
- Template-and-remix model — players remix artifacts to create characters and stories
- Three faces: player view, GM view, world view
- BSP navigation through world, character, session, and quest blocks
- Shelf (vapor/liquid/solid) as game mechanic
- Dice, passports, character sheets

Scale model: 10M players = 2M remixes, creator pays nothing (players use their own Claude API).

## Why

Onen is the testing ground where pscale meets play. RPG provides natural pressure for every component: the shelf becomes initiative vs information, ghosts become NPC relationships, institutional blocks become game rules, editing balance becomes character depth.

The artifact model means zero infrastructure cost — each player's Claude instance runs the engine locally, with coordination through SAND.

## Standalone Use

1. Load the world block (e.g., `thornkeep.json`) into a Claude artifact
2. Load the rules block (e.g., `nomad-rules.json`)
3. The artifact renders the game interface
4. Players interact through the shelf — vapor for planning, solid for actions
5. BSP navigates the world block for location, NPC, and quest data

## Key Files

| File | Description |
|------|-------------|
| `consolidation.md` | Full consolidation document — sandbox constraints, storage model, three faces, scaling architecture, three tiers of play, technical reference |
| `thornkeep.json` | Example world block (spatial layout of Thornkeep) |
| `nomad-rules.json` | Example rules block (game mechanics) |

## Dependencies

- Component 01 (Pscale Block) — world, character, session blocks
- Component 02 (BSP Walker) — navigates all game blocks
- Component 03 (Star Operator) — quest chains as star references
- Component 12 (Shelf) — commitment gradient as game mechanic
- Component 30 (Ghost Mechanics) — NPC-player relationships
