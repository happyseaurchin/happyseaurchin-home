# 02 — BSP Walker

**Category:** A. Foundation
**Products:** All (MAGI, Xstream, Onen)
**Status:** Implemented — JS and Python

## What

Block · Spindle · Point. Six navigation modes for pscale blocks:

- **Spindle** — `bsp(block, 0.842)` — path chain from root to address, broad-to-specific
- **Ring** — `bsp(block, 0.842, 'ring')` — siblings at the terminal node
- **Dir** — `bsp(block, 0.842, 'dir')` — subtree from the terminal
- **Point** — `bsp(block, 0.842, -2)` — single node at a specific pscale level
- **Disc** — `bsp(block, null, -1, 'disc')` — all nodes at one depth across all branches
- **Star** — cross-block navigation via hidden directories (see component 03)

The JS version includes `anchor()` — scope BSP operations to a subtree where all addresses become relative.

## Why

Pscale blocks are the data. BSP is the electricity. Without the walker, blocks are inert JSON. With it, any semantic number resolves to a coherent chain of narrowing context — from what the block is about, through intermediate framing, to the specific detail.

The walker is what makes pscale blocks navigable by LLMs — a single function call returns exactly the context chain an LLM needs.

## Standalone Use

```javascript
import { bsp, anchor } from './bsp.js';

const block = JSON.parse(fs.readFileSync('any-block.json'));
const spindle = bsp(block, 0.132);    // chain of nodes root → 1 → 3 → 2
const ring = bsp(block, 0.1, 'ring'); // siblings of node 1
const scope = anchor(block, '6');     // sub-BSP rooted at digit 6
```

```python
from bsp import bsp, bsp_register

bsp_register(lambda name: json.load(open(f'{name}.json')))
result = bsp("wake", 0.842)     # spindle mode
result = bsp("wake", 0.842, 2)  # point mode
```

## Key Files

| File | Description |
|------|-------------|
| `bsp.js` | JavaScript implementation (ES module) — includes anchor, spread, read/write |
| `bsp.py` | Python implementation — lighter, block-loader registry pattern |
| `examples/` | Example walks with expected output |

## Dependencies

- Component 01 (Pscale Block) — the data it navigates

## Composition

Used by every product. The kernel reduces to the walker — all context compilation, block navigation, and aperture control route through BSP.
