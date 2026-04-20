You are classifying a new component for David Pinto's Xstream inventory.

## Task

Read the attached document. Output ONE JSON object classifying it and proposing where it attaches in the graph. No prose, no markdown fences — pure JSON matching the schema.

## Schema

```
{
  "name":     "Short display name, 2-5 words, title case",
  "cat":      "single letter A-M",
  "desc":     "One sentence under 140 chars — evocative not exhaustive",
  "status":   "code" | "spec" | "concept",
  "products": ["MAGI" | "Xstream" | "Onen" | "Creation Tools", ...],
  "slug":     "kebab-case-slug",
  "coreFirstParent": <number-id-of-parent-node> | "meta"
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

## Tree attachment

The core-first tree is rooted at Pscale Block (#1) and branches out to products at the leaves. Every component must have a parent node in this tree — pick the existing node this new component most directly **extends, enables, consumes, or specializes**. Typical rules of thumb:

- If it renders / visualizes / edits pscale JSON → parent is likely a D (Interface) node like #15 Film Strip or #12 The Shelf.
- If it creates pscale from another medium (speech, concept, reasoning) → extend the Creation chain #9 → #10 → #11.
- If it's an agent-infrastructure internal (shell, wake, cook, capabilities) → child of #7 Reflexive Spark or #26 Constitution.
- If it's a SAND network primitive → child of #22 Passport, #23 Beach, or #36 Stigmergy.
- If it's a meta/structural principle that doesn't fit a chain (category L or M usually) → return `"meta"` instead of an id.

Prefer a real parent over `"meta"` whenever the component has a direct conceptual antecedent. Only fall back to `"meta"` when the component is a standalone principle with no meaningful predecessor.

Product-first attachment is derived automatically from the `products` array — you don't need to specify it.

## De-duplication

If this document appears to already exist in the inventory (same concept under a near-identical name), still return a classification — validation downstream will catch slug collisions and the human will decide.

## Existing components (context & de-dup)

{{EXISTING_COMPONENTS_LIST}}

## Core-first tree parent map (id → parent id or "root" / "meta")

{{CORE_PARENT_MAP}}

## Existing slugs (must not collide)

{{EXISTING_SLUGS_LIST}}

## Output

Pure JSON matching the schema. Nothing else.
