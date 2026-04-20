# 12 — The Shelf (Vapor / Liquid / Solid)

**Category:** D. Interface
**Products:** Xstream, Onen
**Status:** Implemented — TypeScript in xstream repo

## What

Commitment gradient as coordination mechanism:

- **Vapor** — thinking aloud, ephemeral. Can be discarded without cost.
- **Liquid** — committed intention, visible to others. Stakes exist.
- **Solid** — synthesised, shared reality. The settled record.

The strategic tension: initiative vs information. Vapor gives initiative (you can change direction freely) but provides no information to others. Solid provides information (others can coordinate around it) but costs initiative (you're committed). Liquid is the negotiation zone.

## Why

Traditional interfaces collapse all text to one commitment level. Everything posted is equally "said." The shelf separates the act of thinking from the act of committing, making the commitment gradient explicit and navigable.

In multiplayer (Onen), the shelf becomes a game mechanic — what you keep in vapor vs what you crystallise to solid IS the strategic play.

## Standalone Use

The shelf pattern applies to any system with collaborative text:
1. Provide three zones for text at different commitment levels
2. Text moves vapor → liquid → solid (never backward)
3. Vapor is private or ephemeral; liquid is visible but mutable; solid is shared and immutable
4. The interface makes the commitment transition explicit

## Key Files

| File | Description |
|------|-------------|
| `shelf.ts` | TypeScript implementation from xstream |

## Dependencies

- Component 01 (Pscale Block) — shelf content stored as pscale
- Component 14 (Triad) — each LLM layer operates at different shelf zones
