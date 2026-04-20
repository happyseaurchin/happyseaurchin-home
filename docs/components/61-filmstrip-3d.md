# filmstrip-3d layout spec — v3 (fixed cube, scaling tile)

Replaces v2's uniform tile size. The **cube** is now the global unit of
semantic weight; tile size varies per block with depth. A spindle of five
cubes in one block is visually equivalent to a spindle of five cubes in any
other block, regardless of either block's pscale depth.

---

## Why this exists

Rendering a pscale tree in 3D: one cube per `_` semantic entry, arranged so
address relationships read as spatial ones. The view lets you see, compare,
and highlight "slices" of semantic content across multiple blocks at once.

Inputs:
- **Frame mode** — one C-loop filmstrip frame. Each `=== SECTION ===` block in
  `system`+`message` becomes its own tile; BSP tool reads and output writes
  mark cubes as "touched" (highlighted).
- **Editor mode** — the mindflow editor's shelf + saved slices from
  localStorage. Every block in the file gets a tile; saved slices (spindle /
  ring / disc / point on a focus address) visualise as the union of their
  highlights.

---

## Decisions (v3 — 2026-04-20)

1. **Cube size is global and fixed.** `CUBE_SIZE = 1.6`. Every cube, every
   block, every depth — same size.
2. **Tile size follows depth.** Each block's tile on the floor is
   `CUBE_SIZE × 3^maxDepth` on a side. Depth-1 block → 4.8. Depth-4 → 129.6.
   Ratio 27:1 between consecutive depths.
3. **Multi-block layout = square-ish grid.** Pitch = max block footprint
   across all placed blocks. Inter-block proximity carries no semantic
   meaning, so a uniform grid is fine. No packing logic.
4. **Per-block tile demarcation.** Each tile takes a distinct hue from a
   7-colour palette (cycling if more than 7 blocks), with a darker
   edge-wireframe border. Without this, different-sized tiles are hard to
   parse as separate blocks.
5. **Y axis (unchanged from v2).** Root at y=0, depth-1 above floor,
   depth ≥ 2 descends below the floor. A depth-d block is d+1 cubes tall.
6. **Empty slots** — not rendered (unchanged from v2).
7. **Zero-position (matryoshka)** — still deferred. Digit children only.
8. **Forward-ref: non-JSON context content** — will render as "big black
   tiles" (raw message content added to the window that isn't a structured
   pscale block). Not yet implemented.

---

## Geometry

### Cube size
```
CUBE_SIZE = 1.6           // global, fixed
```

### Tile (root-cell) footprint per block
```
tile(block) = CUBE_SIZE * 3^max(maxDepth(block), 1)
```

| maxDepth | footprint | example |
|---------:|----------:|---------|
|        1 |       4.8 | tiny/leaf-heavy block |
|        2 |      14.4 | starstone-lean |
|        3 |      43.2 | — |
|        4 |     129.6 | full starstone |

### Address → position
Given address (string of digits, `''` = root) and tile center `(cx, cz)`:

```
function pos(addr, cx, cz):
  x, z = cx, cz
  cellSize = tile(block)                // = CUBE_SIZE * 3^maxDepth
  for digit in addr:
    (dx, dz) = SPIRAL[digit]
    x += dx * cellSize / 3
    z += dz * cellSize / 3
    cellSize /= 3                       // parent cell subdivides 3:1 per digit
  y = layerY(addr.length)
  return (x, y, z)
```

### Y mapping
```
layerY(0) = 0                           // root on the floor
layerY(1) = +CUBE_SIZE                  // depth-1 above floor
layerY(N) = -(N - 1) * CUBE_SIZE        // depth ≥ 2 below floor
```

So depth 2 is at `-CUBE_SIZE`, depth 3 at `-2 * CUBE_SIZE`, etc. Vertical
span of a depth-d block = `d + 1` cubes tall.

### Spiral addressing (unchanged from v2)
Clockwise from north:
```
   9   2   3
   8   1   4
   7   6   5
```
Digit `1` is center — a chain of all-1s is a perfectly vertical column at
the tile center, piercing the floor.

---

## Multi-block floor layout

```
cols = ceil(sqrt(N))
rows = ceil(N / cols)
pitch = max(tile(b) for b in blocks) + TILE_GAP
originX = -(cols - 1) / 2 * pitch
originZ = -(rows - 1) / 2 * pitch
block i at (row = i // cols, col = i % cols)
```

Shallow blocks sit in mostly-empty cells when the grid is sized to a deeper
block. That's the tradeoff for zero-pack-logic layout, and it matches the
design intent (inter-block proximity is not meaningful).

---

## Visual distinction between tiles

Because tile sizes now vary, adjacent tiles are clearly different sizes —
but without colour they can still read as one wash of beige. Each tile gets:
- a hue cycled from `TILE_HUES` (7 muted colours)
- a thin darker edge wireframe (border)

Future: small block-id label on the floor next to each tile.

---

## Input modes

### Frame mode
Loads a single C-loop frame from `../filmstrip/examples/*.json`. Parses each
`=== SECTION ===` block out of `system`+`message`. Tries `JSON.parse(body)`;
falls back to wrapping plain text as `{ _: body }` (a single-cube block).

Touched set (highlight input for the `touched` mode):
- Every **`bsp` tool read** → marks the read address as touched.
- Every **output write** (`writes` in the output JSON) → marks the write
  target as touched.

### Editor mode
Reads from localStorage:
- `mindflow-editor:shelf` → `{ [id]: block, ... }`
- `mindflow-editor:views` → `{ [id]: slice[] }`

Each block in the shelf becomes a tile. For every saved slice on that block,
highlight every node whose address matches the slice's walk mode:

| Walk mode | Matches |
|-----------|---------|
| spindle   | every prefix of `focus` (root → focus) |
| ring      | siblings of `focus` (same parent) |
| disc      | every node at `focus`'s depth |
| point     | the one node at `focus` |
| free      | degrades to point |
| star      | degrades to point (v3 doesn't render hidden dirs) |

A block's touched set = **union of all its slices' matches**. Each slice is
a facet of the composed context window; the visualiser shows the aggregate.

Cross-tab sync: a `storage` event listener auto-reloads the visualiser when
the editor saves slices in another tab (and the visualiser is in editor
mode).

---

## Highlight modes (visualiser panel)

Independent of input mode:

| Mode    | What lights up                                 |
|---------|------------------------------------------------|
| all     | every cube                                     |
| touched | the input-mode-driven touched set (the "focus" cubes) |
| point   | the one cube at `focusAddr`                    |
| spindle | every prefix of `focusAddr`                    |
| ring    | siblings of `focusAddr`                        |
| disc    | every cube at the same depth as `focusAddr`    |

`focusAddr` is set by clicking a cube or typing into the addr input. In
editor mode, the `touched` highlight *is* the composed-from-slices set.

---

## Cube counts

For a fully-filled tree of depth `N`: `(9^(N+1) - 1) / 8`. Real blocks are
sparse — typically 10–100 cubes per block. Editor mode has rendered
2 blocks × ~50 cubes = ~100 total without performance issues.

---

## Differences from v2

|                            | v2                            | v3                              |
|----------------------------|-------------------------------|---------------------------------|
| Cube size                  | per-block (`TILE_SIZE / 3^d`) | **global, fixed** (`CUBE_SIZE`) |
| Tile footprint             | uniform `TILE_SIZE = 14.4`    | **per-block** `CUBE_SIZE × 3^d` |
| Multi-block layout         | 1–9 block spiral              | **square-ish grid**             |
| Tile visual                | all same hue                  | **per-block hue + border**      |
| Inputs                     | hard-coded frame URL          | **frame / editor toggle**       |
| Editor integration         | —                             | **localStorage shelf + slices** |
| Zero-position (matryoshka) | deferred                      | deferred                        |

---

## Known limitations

- **`bsp(mode: 'dir')`** only marks the block's root as touched, not the
  whole subtree it conceptually reads.
- **Writes to nonexistent addresses** (e.g. `conditions:1-5` when
  `conditions` has no such branch) don't materialise a cube, so those
  writes don't visualise.
- **Plain-text blocks** (sections the frame parser can't JSON-parse)
  render as a single root cube — no internal structure to see.
- **Star / hidden-dir slices** degrade to point in editor mode because v3
  doesn't render matryoshka interiors.
- **Non-JSON context content** — the forward-referenced "big black tiles"
  aren't implemented yet.
