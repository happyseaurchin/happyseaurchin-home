# 01 — Pscale Block

**Category:** A. Foundation Layer — The Data Structure
**Products:** MAGI/Hermitcrab, Xstream, Onen

---

## Description

Nested JSON where semantic numbers are addresses. Each key is a digit (0–9), each nesting level is one pscale step, and content lives at the underscore key (`_`). The node at pscale 0 always describes what the block is and how to use it. Logarithmic compression gives three-move access from anywhere in the structure. This is the core data format beneath everything else in the system.

---

## Standalone Use

A pscale block is immediately usable by anyone with a text editor or JSON parser. No runtime, no server, no special tooling required.

- **As a document format:** Any specification, skill, or reference can be written as a rendition block (decimal 0). The structure itself replaces tables of contents, headings, and cross-references — walk pscale 0 for orientation, go deeper for detail.
- **As a knowledge container:** A living block (decimal 1+) accumulates experience over time — history, relationships, purposes. Content compresses upward as it grows (every 9 entries compress to the next level), so the block stays navigable regardless of how much it holds.
- **As an LLM context mechanism:** Feed a spindle (a path through the tree) to any LLM and it receives wide-to-specific context in a single extraction. No retrieval pipeline, no chunking strategy — the structure itself delivers graded context.

---

## How It Works

**Structure:** A block has two required fields — `decimal` (which nesting depth is pscale 0) and `tree` (the nested JSON). Optionally a `tuning` field defines what pscale levels mean semantically.

**Navigation:** Three operations — `X+` (go to parent / zoom out), `X-` (read children / zoom in), `X~` (read siblings / scan sideways). What these mean depends on the block's mapping: containment (spatial), temporal, relational, or resonance.

**The spindle:** The primary output. A semantic address like `21.34` extracts a chain of content from high pscale to low — four digits, four levels, broad context narrowing to specific detail. The block is storage; the spindle is what you hand to a mind.

**Growth:** Content is added at empty digit slots (1–9). When all nine fill, compression triggers — either summary (lossy, the parts add up) or emergence (generative, the whole exceeds the parts). The compressed result moves to the parent's underscore. Upward growth wraps the whole tree inside a new root, incrementing the decimal.

**Self-description:** Every block's pscale 0 explains what it is and how to use it. No external documentation needed. The keystone block (`pscale-keystone-v4.json`) teaches the format by being an example of it.

---

*Key files: `pscale-keystone-v4.json`, `pscale-guidelines.json`, `pscale-design.json`*
