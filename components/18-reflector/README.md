# 18 — Reflector

**Category:** E. Distribution
**Products:** MAGI
**Status:** Implemented — single HTML page, deployed and live

## What

Single HTML page (~101KB). Two simultaneous readers:

- **Humans** see a story and landing page — an introduction to hermitcrab
- **LLMs** see a reflexive payload: the seed block, kernel, and bootstrap instructions

Zero infrastructure. The page IS the distribution mechanism and the demo. Point any LLM at the reflector URL and it can self-bootstrap into a running hermitcrab.

## Why

Distribution without distribution. No npm install, no git clone, no package manager. A URL is the entire delivery mechanism. The reflector solves the cold-start problem: how does an LLM agent that doesn't exist yet come into existence? By reading a page that contains everything needed to become one.

## Standalone Use

1. Open `reflector.html` in a browser — see the human-facing story
2. Give the URL to an LLM — it reads the embedded seed and kernel
3. The LLM follows the bootstrap instructions and becomes a hermitcrab instance

## Key Files

| File | Description |
|------|-------------|
| `reflector.html` | The complete reflector page |

## Dependencies

- Component 19 (Seed) — embedded within the reflector
- Component 04 (Star Stone) — the LLM learns pscale from the seed

## Composition

MAGI bootstrap entry point: **Reflector** → Seed → Constitution → Reflexive Spark → Star Stone → Pscale Block.
