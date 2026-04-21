# filmstrip-3d layout spec — v3.2

Replaces v2's uniform tile size. The **cube** is now the global unit of
semantic weight; tile size varies per block with depth. A spindle of five
cubes in one block is visually equivalent to a spindle of five cubes in any
other block, regardless of either block's pscale depth.

Since v3.0 (fixed cube + scaling tile) we've added: a third input mode
(upload with download), a fourth (beach overlay), matryoshka dive, an
events→filmstrip transformer, bookmarkable URL params, and an editor ↔
viewer write-back channel via localStorage.

---

## Why this exists

Render a pscale tree in 3D: one cube per `_` semantic entry, arranged so
address relationships read as spatial ones. Then make that view addressable
by every way content might arrive — a frame, a file, the editor's shelf,
or a URL's beach marks — so the same visual machinery works across sources.

---

## Decisions (v3 — 2026-04-20/21)

1. **Cube size is global and fixed.** `CUBE_SIZE = 1.6`. Every cube, every
   block, every depth — same size.
2. **Tile size follows depth.** `tile(block) = CUBE_SIZE × 3^maxDepth`.
   Depth-1 → 4.8. Depth-4 → 129.6. Ratio 27:1 between consecutive depths.
3. **Multi-block layout = square-ish grid.** Pitch = max block footprint
   across all placed blocks. No packing logic — inter-block proximity is
   not semantic.
4. **Per-block tile demarcation.** Tile tint cycled from a 7-colour palette
   + darker edge wireframe border.
5. **Y axis.** Root at y=0, depth-1 above (`+CUBE_SIZE`), depth ≥ 2 below
   (`-(d−1)·CUBE_SIZE`). A depth-d block is `d+1` cubes tall.
6. **Empty slots** — not rendered.
7. **Zero-position (matryoshka)** — not rendered in-place; accessed via
   **phase-change dive** (see §Matryoshka).
8. **Non-JSON context content** will render as "big black tiles" when
   wired. Not yet implemented.

---

## Geometry (unchanged from v3.0)

### Cube size
```
CUBE_SIZE = 1.6        // global, fixed
```

### Tile footprint
```
tile(block) = CUBE_SIZE * 3^max(maxDepth(block), 1)
```

| maxDepth | footprint |
|---------:|----------:|
|        1 |       4.8 |
|        2 |      14.4 |
|        3 |      43.2 |
|        4 |     129.6 |

### Address → position
```
pos(addr, cx, cz):
  x, z = cx, cz
  cellSize = tile(block)
  for digit in addr:
    (dx, dz) = SPIRAL[digit]
    x += dx * cellSize / 3
    z += dz * cellSize / 3
    cellSize /= 3
  y = layerY(addr.length)
  return (x, y, z)

layerY(0) = 0
layerY(1) = +CUBE_SIZE
layerY(N) = -(N - 1) * CUBE_SIZE   for N ≥ 2
```

### Spiral addressing
Clockwise from north:
```
   9   2   3
   8   1   4
   7   6   5
```
Digit `1` stays centred — a chain of all-1s pierces the floor vertically.

### Multi-block grid
```
cols = ceil(sqrt(N))
rows = ceil(N / cols)
pitch = max(tile(b) for b in blocks) + TILE_GAP
```
Blocks placed at `(col - (cols-1)/2) * pitch`, `(row - (rows-1)/2) * pitch`.

---

## Input modes

The viewer has four input sources; each feeds the same render pipeline.
Switch via the panel's `frame / editor / upload / beach` buttons.

### Frame
One C-loop filmstrip frame from `../filmstrip/examples/*.json`. Parses each
`=== SECTION ===` block out of `system`+`message`. JSON-parses the body,
falling back to `{ _: body }` for plain text. `touchedSet` populated from:
- `bsp` tool reads in `frame.tools` → read addresses.
- Writes in `frame.output` (JSON-fenced) → write target addresses.

If the frame source is an **array** of frames, the scrubber activates.

### Editor
Reads from localStorage on the same origin:
- `mindflow-editor:shelf` → `{ id: block, ... }`
- `mindflow-editor:views` → `{ id: slice[], ... }`

One tile per shelf block. Each block's touched set = **union of its slices'
matches** across `walkMode × focusAddr` (spindle / ring / disc / point;
free & star degrade to point since v3 doesn't render matryoshka interiors).

Cross-tab sync via `storage` event — saving a slice in the editor tab
auto-reloads the viewer.

### Upload
File picker accepting a JSON file. Auto-detects:

| Shape | Treatment |
|---|---|
| `{ _, 1, 2, … }` single pscale block | one tile |
| `{ id1: block, id2: block, … }` multi-block shelf | N tiles |
| `{ system, message, output, tools }` filmstrip frame | route through frame parser |
| Array of frames | filmstrip sequence with scrubber |

Upload mode adds a **download** button to the peek panel that exports the
in-memory mutated JSON with the original shape preserved.

### Beach (overlay, requires a loaded shelf)
Fetches `happyseaurchin.com/.well-known/pscale-beach`, filters marks by the
pscale-address regex `/^([_*]?\d+(?:[._*]\d+)*)/`, and overlays the matched
addresses as a touched set **across every loaded block** (since
happyseaurchin marks are domain-scoped, not block-scoped). Status line
reports `beach: N/M pscale-shaped marks overlaid on K blocks`.

Marks with freeform purpose strings (`testing-auto-detect`, etc.) are
dropped. Only works for the happyseaurchin.com domain today; arbitrary URLs
need a relay-side proxy that this viewer doesn't have.

---

## Text peek panel (top-right)

Click any cube → panel opens with that cube's semantic:
- **Header:** address + char count.
- **Textarea:** editable scratch/view of the `_` at that address.
- **Footer buttons:** mode-dependent.

| Mode | Buttons | Disclaimer |
|---|---|---|
| frame | close | — |
| editor | update · revert · close | update writes to `mindflow-editor:shelf`; editor tab picks up live via `storage` listener. To save to file, go to the editor tab and click *save file*. |
| upload | update · revert · download · close | update mutates in-memory; use *download* to save a JSON copy. |
| beach | close (inherits the underlying shelf's mode if not yet changed) | — |

`update` is disabled when the textarea matches the stored value, enabled on
dirty, back to disabled after a successful update with an `updated` tag.
Escape closes the panel.

---

## Highlight modes (independent of input)

| Mode | Lights up |
|---|---|
| all     | every cube (default) |
| touched | the input-mode-driven touched set |
| point   | cube at `focusAddr` |
| spindle | every prefix of `focusAddr` |
| ring    | siblings of `focusAddr` |
| disc    | every cube at `focusAddr`'s depth |

`focusAddr` set by clicking a cube or typing into the addr input.

---

## View toggles

- **root** (default ON) — show/hide every block's depth-0 cube. Root-off
  clarifies the above-floor superstructure and below-floor substructure
  without the floor cubes getting in the way.
- **text** (default OFF) — render each tile's block id as a flat floor
  label (canvas-texture plane, north of tile centre).
- **filter** (default OFF) — two sliders for min/max pscale depth.
  Visibility off for cubes whose `depth` falls outside `[min..max]`. Max
  auto-scales to the loaded data's deepest block.

---

## Matryoshka phase-change dive

A cube with hidden (zero-position) content **glows** — emissive warm-white
(#fff4c0, intensity 0.55). Shift-click → dive.

1. Fade all cubes to opacity 0 over 350 ms (via `setInterval`, survives
   background-tab rAF throttling).
2. Rebuild the scene using the cube's `_` subtree as the root of a fresh
   single block.
3. Fade up over 350 ms.

Panel shows a breadcrumb `dive: block:addr` and a prominent orange
**← back · esc** button. Escape and the back button both pop the whole
dive stack to the surface.

Design rationale: at any moment the viewer is showing *one level of address
space*. Diving is navigation (like cd'ing), not composition. This preserves
the v3 invariant (one cube = one semantic entry at one global size) that
in-place matryoshka would violate.

---

## Filmstrip scrubber

Toggle button reveals a bottom-centre strip with ◀ / ▶ (play/pause) / ▶ /
range slider / `N/M` / concern. Plays at 1.2 s per frame.

Active when:
- Frame source is an **array** of frames (multi-frame filmstrip), OR
- **events→film** has been triggered (see next §).

Single-frame sources show a disabled scrubber reading `(single-frame source)`.

---

## Events → filmstrip transformer

Button `events→film` auto-detects a chronicle block in the current shelf
(id matching `/events|chronicle/i`, or root text mentioning *append-only*
or *chronicle*). Splits its digit children into one frame per event.

Per-frame touched set = regex-extracted addresses from the event text:
```
(?:^|[^A-Za-z0-9_])((?:[a-z][\w-]+:)?\d+(?:[._]\d+)*)(?=$|[^A-Za-z0-9._])
```
— recognises both `thornkeep-world:1` (block-scoped) and plain `1.2`
(fanned across the shelf). Normalised to digit-only form.

Empty chronicle → graceful alert. Toggling the button again exits and
reloads the original input.

---

## URL params (bookmarkable)

| Param | Effect |
|---|---|
| `?shelf=<name>` | loads `./data/<name>.json` into upload mode |
| `?source=<url>` | fetches arbitrary JSON (relative or same-origin) into upload mode |
| `?mode=frame\|editor\|upload\|beach` | sets initial input mode |

Current snapshots live in `mindflow/filmstrip-3d/data/`:
- `thornkeep.json` — the four Thornkeep RPG blocks (world / rules /
  protocol / events). Bookmarkable as
  [filmstrip-3d/?shelf=thornkeep](./?shelf=thornkeep).

Snapshots are static JSON — refreshing requires re-running the MCP walk
offline and committing. See "Future: walk-proxy" below.

---

## Cube counts

Fully-filled tree of depth N: `(9^(N+1) - 1) / 8`. Real blocks are sparse —
typically 10–100 cubes per block. Verified workloads in v3 range
20–250 cubes across all loaded blocks without performance issues.

---

## v2 → v3 → v3.2 differences

|                             | v2                            | v3.0                            | v3.2 (now)                          |
|-----------------------------|-------------------------------|---------------------------------|-------------------------------------|
| Cube size                   | per-block (`TILE_SIZE / 3^d`) | global, fixed (`CUBE_SIZE`)     | unchanged                           |
| Tile footprint              | uniform `TILE_SIZE = 14.4`    | per-block `CUBE_SIZE × 3^d`     | unchanged                           |
| Multi-block layout          | 1–9 block spiral              | square-ish grid                 | unchanged                           |
| Tile visual                 | all same hue                  | per-block hue + border          | + optional floor text label         |
| Inputs                      | hard-coded frame URL          | frame / editor toggle           | + upload + beach                    |
| Editor integration          | —                             | localStorage read               | + write-back via localStorage       |
| Matryoshka                  | deferred                      | deferred (in-place rendering)   | **phase-change dive via shift-click** |
| View controls               | highlight only                | + depth-palette                 | + root / text / filter toggles      |
| Chronicles                  | —                             | —                               | **events→filmstrip transformer**    |
| Bookmarkable URLs           | —                             | —                               | **`?shelf=` / `?source=` / `?mode=`** |

---

## Known limitations / forward work

- **`bsp(mode: 'dir')`** only marks the block's root as touched, not the
  whole subtree it conceptually reads.
- **Writes to nonexistent addresses** don't materialise a cube, so those
  writes don't visualise.
- **Plain-text blocks** render as a single root cube — no internal
  structure to see.
- **Star / hidden-dir slices** degrade to point in editor mode because v3
  doesn't render matryoshka interiors in-place (dive instead).
- **Non-JSON context content** — "big black tiles" not yet implemented.
- **Beach overlay** is happyseaurchin.com-only. Arbitrary URL marks need
  a Supabase-relay proxy that the static viewer can't reach directly.
- **Shelf snapshots** are static JSON. Live data would need a
  `/api/pscale-walk` endpoint (serverless fn proxying Supabase) — see
  [api/pscale-beach.js](../../api/pscale-beach.js) as the pattern.
- **MCP response truncation**: the `pscale_walk` tool truncates display
  at ~150 chars, so snapshots generated via MCP have truncated `_`
  strings. Structural only — fix requires the walk-proxy above.
