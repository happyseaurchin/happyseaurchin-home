You are classifying a new component for David Pinto's Xstream inventory.

## Task

Read the attached document. Output ONE JSON object classifying it. No prose, no markdown fences — pure JSON matching the schema.

## Schema

```
{
  "name":     "Short display name, 2-5 words, title case",
  "cat":      "single letter A-M",
  "desc":     "One sentence under 140 chars — evocative not exhaustive",
  "status":   "code" | "spec" | "concept",
  "products": ["MAGI" | "Xstream" | "Onen" | "Creation Tools", ...],
  "slug":     "kebab-case-slug"
}
```

## Categories

- **A — Foundation**: core data structures (pscale block, BSP walker, star operator, star stone)
- **B — Process**: how things move through time (compaction, PCT loop, reflexive spark, möbius)
- **C — Creation**: making pscale blocks (transcript-to-pscale, concept-to-pscale, thinking-to-pscale)
- **D — Interface**: human/agent interaction (shelf, forking stream, triad, film strip, button, RPG)
- **E — Distribution**: how things spread (reflector, seed, MCP server)
- **F — Network (SAND)**: decentralised discovery (passport, beach, seven degrees, ecosquared vector money)
- **G — Structure**: structural properties (möbius twists)
- **H — Shell**: hermitcrab internals (constitution, wake, cook, capabilities)
- **I — Relational**: ghost mechanics, institutional blocks, editing balance
- **J — Context**: aperture, currents, second-order processing
- **K — SAND Mechanics**: stigmergy, rider, SQ, payment gateway, GitHub coordination
- **L — Meta**: vision, process, kernel-as-block, systemic evolution
- **M — Primitives**: foundational principles (LLM as primitive, blocks-as-code, shell as concept)

## Status

- `code` — working implementation exists (runnable, deployed, or a functional artifact)
- `spec` — detailed design documented, not yet implemented
- `concept` — identified as a thing, not yet specified in detail

## Products

- **MAGI** — agent infrastructure
- **Xstream** — reflexive coordination interface
- **Onen** — RPG testing ground
- **Creation Tools** — authoring / transcript / concept tools

Assign products liberally — most foundational things belong to all four.

## Slug rules

- kebab-case, ASCII only
- derived from the name
- must NOT collide with any existing slug listed below
- matches the filename stem in `docs/components/{id}-{slug}.md`

## De-duplication

If this document appears to already exist in the inventory (same concept under a near-identical name), still return a classification — validation downstream will catch slug collisions and the human will decide.

## Existing components (context & de-dup)

{{EXISTING_COMPONENTS_LIST}}

## Existing slugs (must not collide)

{{EXISTING_SLUGS_LIST}}

## Output

Pure JSON matching the schema. Nothing else.
