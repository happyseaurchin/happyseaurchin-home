# 2 — BSP Walker

**Category:** A. Foundation Layer — The Data Structure
**Products:** MAGI/Hermitcrab, Xstream, Onen

---

## Description

BSP (Block-Spindle-Point) is the addressing and navigation protocol for pscale JSON blocks. It is not code but coordinates — a pure resolution algorithm that accepts any pscale block and an address, then returns either the full tree (dir), the chain of context leading to a point (spindle), the alternatives at a location (ring), a single node at a pscale depth (point), a transversal slice at a depth (disc), or a hidden directory entry (star). Six navigation modes exist as standalone implementations in JavaScript and Python, each operating independently of the others while sharing the same core walk algorithm.

---

## Standalone Use

A developer can implement BSP to gain instant navigation of any pscale JSON block without learning a custom API for each block's structure. The walk function accepts an address as a number and returns a spindle — a chain of underscore texts from the root context down to a specific detail. This makes BSP useful outside pscale ecosystems: as a general navigation library for hierarchical JSON with semantic context baked in at every level. A block published on the web can be walked by any consumer that understands BSP, with no additional documentation required.

---

## How It Works

**The Address Format:** A pscale address is a number with a single decimal point — the decimal marks the floor boundary (the semantic level of human scale in a spatial block, or the accumulation point in a living block). The walk strips the decimal, splits the string into individual digits, and traverses the tree: digit 0 maps to the underscore key, digits 1–9 map to their respective child keys.

**The Spindle:** The default and most important return value. Walking an address produces a chain of underscore texts from root (broad context) through each level to the terminal node (specific detail). Every spindle includes the root, ensuring the reader always knows which block is being navigated. The spindle length encodes depth; the content encodes progressive narrowing of scope.

**Floor Detection:** The floor is discovered by following the underscore chain from the root object. If root['_'] is a string, floor is 1. If it is an object with its own underscore, step in and repeat. Count steps until reaching a string — that count is the floor depth. The floor determines pscale labeling but does not affect the walk algorithm itself.

**Six Navigation Modes:**

- **Spindle** (default): Returns the chain of underscore texts ordered from root to terminal. What you ask for, plus all context above it.
- **Ring**: Returns siblings at the terminal node — the alternatives at your current location without re-reading the context you already have.
- **Dir**: Returns the full block tree, or if a number is provided, the entire subtree rooted at the terminal node.
- **Point**: Extracts content at a specific pscale depth, bypassing siblings and children.
- **Disc**: Returns all nodes at a given depth across the entire block — a horizontal slice through all branches at one scale.
- **Star**: Enters the hidden directory at the terminal node and returns cross-block references or embedded content.

**Hidden Directories:** When an underscore at any node is an object rather than a string, it may contain digit children alongside its own underscore chain. These children sit at the zero position and are invisible to normal spindle collection. Only a deliberate digit-0 step or a star query reveals them, making them suitable for metadata, documentation hooks, or block references without polluting the main content tree.

---

*Key files: `bsp.js`, `bsp.py`*
