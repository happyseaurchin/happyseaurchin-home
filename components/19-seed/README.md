# 19 — The Seed

**Category:** E. Distribution
**Products:** MAGI
**Status:** Implemented — JSON block + two kernel implementations

## What

Nine-section self-contained pscale block. Two kernel implementations:

- **Browser kernel** (`kernel.html`) — zero-install, runs in any browser
- **Python kernel** — filesystem sovereign, runs on any machine with Python

The seed contains everything an LLM needs to bootstrap: pscale spec, BSP operations, kernel architecture, the reflexive turn, and the concern structure. Self-replicates via `deploy_seed` tool — any running hermitcrab can spawn new instances.

## Why

Any LLM + seed = running hermitcrab. The seed is the minimum viable package for agent bootstrap. It doesn't depend on a specific LLM, a specific platform, or a specific infrastructure. The seed is portable — carry it to any LLM and the LLM becomes an agent.

## Standalone Use

1. Load `seed-v8.json` into any LLM's context window
2. The LLM reads the nine sections and understands the architecture
3. Provide `kernel.html` — the LLM can serve it to create a browser-based instance
4. Or use the Python kernel for filesystem-based operation

## Key Files

| File | Description |
|------|-------------|
| `seed-v8.json` | The nine-section seed block |
| `kernel.html` | Browser kernel — zero-install implementation |

## Dependencies

- Component 01 (Pscale Block) — the format the seed teaches
- Component 02 (BSP Walker) — the navigation the seed describes
- Component 07 (Reflexive Spark) — sections 3.8-3.9 of the seed

## Composition

MAGI bootstrap: Reflector → **Seed** → Constitution → Reflexive Spark → Star Stone → Pscale Block. The seed is the payload the reflector delivers.
