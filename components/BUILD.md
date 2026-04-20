# Build Guide — Xstream Component Architecture

**47 components. Three products. One core mechanism (pscale) at the root of every spindle.**

## How to Use the Composition Blocks

Two JSON files encode the full architecture as navigable pscale blocks:

| File | Question | Use |
|------|----------|-----|
| `composition-product-first.json` | "What does this product need?" | Assembly recipe — walk a product spindle, collect components |
| `composition-core-first.json` | "What should I build next?" | Build order — walk from root outward, dependencies resolved by depth |

Together: the product-first block is the shopping list. The core-first block is the cooking order.

## Pass 2 — Product Assembly

With all 47 components extracted, an LLM agent can now walk a product spindle and assemble a working product.

### Example: Assemble MAGI

> "Read composition-product-first.json. Walk the MAGI spindle (branch 1). For each component along the spindle, read its README and source files. Assemble a working MAGI starter kit."

The agent follows the spindle mechanically:
- Pscale Block (01) → keystone.json, guidelines.json
- BSP Walker (02) → bsp.js
- Star Stone (04) → starstone.json
- Reflexive Spark (07) → koan.md
- Seed (19) → seed-v8.json + kernel.html
- Reflector (18) → reflector.html

Output: a `products/magi/` directory with everything needed to run a hermitcrab.

### Example: Assemble Xstream

Walk branch 2 of the product-first composition. Collect: Shelf (12), Forking Stream (13), Triad (14), Button (16), and their dependencies.

### Example: Assemble Onen

Walk branch 3. Collect: Artifact RPG Engine (17), Shelf (12), Triad (14), Ghost Mechanics (30), and their dependencies.

## Component Status Summary

### Has code/JSON on disk (18 components)
01, 02, 04, 05, 06, 12, 15, 16, 18, 19, 20, 21, 23, 27, 28, 29, 38, 39, 45, 46

### Spec only — README describes the mechanism (21 components)
03, 07, 08, 09, 10, 11, 13, 14, 17, 22, 24, 25, 30, 31, 32, 33, 34, 35, 36, 37, 40, 41, 42, 43, 44, 47

All source documents have been integrated. No missing files.

## Directory Structure

```
components/
├── 01-pscale-block/        ← keystone.json, guidelines.json, design.json, examples/
├── 02-bsp-walker/           ← bsp.js, bsp.py
├── 03-star-operator/        ← spec.md (full solution space document)
├── 04-star-stone/           ← starstone.json
├── 05-history-compaction/   ← spec.md
├── 06-pct-concern-loop/     ← spec.md (full PCT document)
├── 07-reflexive-spark/      ← koan.md, reflexive-turn.json
├── 08-b-loop-mobius/        ← README only
├── 09-transcript-to-pscale/ ← README only
├── 10-concept-to-pscale/    ← README only
├── 11-llm-thinking-to-pscale/ ← README only (concept)
├── 12-shelf/                ← shelf.ts
├── 13-forking-stream/       ← README only
├── 14-soft-medium-hard-triad/ ← README only
├── 15-film-strip-visualizer/ ← filmstrip.ts
├── 16-xstream-button/       ← extension/ (Chrome extension) + design-scoping.md
├── 17-artifact-rpg-engine/  ← consolidation.md, thornkeep.json, nomad-rules.json
├── 18-reflector/            ← reflector.html
├── 19-seed/                 ← seed-v8.json, kernel.html
├── 20-sand-protocol/        ← sand.json, grain-spec.md
├── 21-ecosquared/           ← vector-money.md, rider-schema.json
├── 22-passport/             ← README only
├── 23-beach/                ← beach-agent.js
├── 24-seven-degrees/        ← README only
├── 25-mobius-twists/        ← inventory.md (full twelve-twist inventory)
├── 26-constitution/         ← seed-briefing.md (full constitution + architecture)
├── 27-wake-block/           ← wake.json
├── 28-cook-block/           ← cook.json
├── 29-capabilities-block/   ← capabilities.json
├── 30-ghost-mechanics/      ← psychosocial-conformality.md
├── 31-institutional-block/  ← psychosocial-conformality.md
├── 32-editing-balance/      ← psychosocial-conformality.md
├── 33-aperture-focus/       ← README only
├── 34-currents/             ← currents-window.md, currents-window.json
├── 35-second-order-processing/ ← README only
├── 36-stigmergy/            ← README only
├── 37-fold-mechanic/        ← README only
├── 38-rider/                ← rider-schema.json, rider-protocol.md
├── 39-sq-algorithm/         ← sq-mathematics.md, trust-origin.md
├── 40-social-neuron/        ← README only
├── 41-direct-contact/       ← README only
├── 42-grain-synthesis/      ← README only (Phase 3 unresolved)
├── 43-github-coordination/  ← README only
├── 44-ecosquared-payment-gateway/ ← spec.md (Stripe architecture + edge functions)
├── 45-vision-block/         ← vision.json
├── 46-process-block/        ← process-block.json
├── 47-kernel-as-block/      ← spec.md (full design hypothesis)
├── composition-product-first.json
├── composition-core-first.json
├── xstream-component-inventory.md
└── BUILD.md                 ← this file
```
