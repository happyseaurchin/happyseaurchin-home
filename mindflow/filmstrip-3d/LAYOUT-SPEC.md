# filmstrip-3d layout spec — v3.3

Replaces v2's uniform tile size. The **cube** is now the global unit of
semantic weight; tile size varies per block with depth. A spindle of five
cubes in one block is visually equivalent to a spindle of five cubes in any
other block, regardless of either block's pscale depth.

Since v3.0 (fixed cube + scaling tile) we've added: a third input mode
(upload with download), a fourth (beach), matryoshka dive, an
events→filmstrip transformer, bookmarkable URL params, and an editor ↔
viewer write-back channel via localStorage.

## v3.3 (2026-06-11) — whole-beach surfaces + filmstrip-as-tool

1. **Beach mode reworked for the post-May-2026 surface model.** The old
   mode fetched the bare-domain beach (404 since the handler moved to
   beach.happyseaurchin.com) and overlaid `marks` from the pre-migration
   single-block shape. Beach mode now loads **the whole surface**: GET the
   index (`{blocks: [...]}`), then every named block via `?block=<name>`
   (8-way concurrent), one tile each. Presets `home`
   (beach.happyseaurchin.com, old world) and `biome`
   (biome-commons-production.up.railway.app, 0-form world).
2. **Biome 0-form spoken.** Genome-v4 blocks (digit `0` = a node's own
   semantic, no `_` anywhere) are detected mechanically (`_` anywhere →
   beach-world; else any `0` → 0-form) and converted to the renderer's
   internal `_` form on load — beach, upload, and frame-section paths.
3. **CORS relay.** Hosts that don't serve `Access-Control-Allow-Origin`
   (the biome commons) are reached via `/api/beach-relay` — a GET-only,
   path-allowlisted same-origin proxy. Direct fetch is tried first; a
   network-level failure flips a sticky per-session relay flag.
4. **Shelf-packed layout.** The uniform grid pitched every tile by the
   single deepest block, dwarfing shallow siblings on a whole beach. Tiles
   are now sorted by footprint and shelf-packed into square-ish rows; each
   row's pitch is its own tallest tile. Camera far plane, fog density, and
   floor scale follow the fitted distance.
5. **Filmstrip as a tool.** Frame arrays from upload or `?source=` enter
   frame mode with the scrubber armed (previously only the hardcoded
   example activated it). `?frame=N` deep-links a slice (1-based);
   `?play=1` starts the animation on load.
6. **ctx panel.** A `ctx` button on the scrubber opens the slice's raw
   context window (ts/concern/model + system/message/output) in the peek
   panel; while open it follows the scrubber, so playing the strip streams
   the context "thinking".
7. **Frame-parser brace salvage.** system+message are concatenated before
   sectioning, so the last `=== SECTION ===` body absorbs the message
   prose; JSON bodies are now salvaged up to their final closing brace.
8. **Beach labels default on; label size scales with the tile** (a beach
   is read by its names). Beach peek panel is view-only + download
   (`beach-<host>.json` snapshot of the fetched surface).
9. **Mobius wake frames.** A frame whose system/message are JSON strings
   (no `=== SECTION ===` headers) parses as a mobius wake: one tile per
   current in `system.self`, named from `system.index`; peer faces from
   `message.between` as `between:<peer>` tiles; touched = `parsed.writes`
   keys (kind write) + `gamma` addresses (kind gap). Scrubber concern
   falls back to `parsed.note`, then `ts`; the ctx panel pretty-prints
   JSON-string contexts.
10. **Multi-file upload.** The picker takes multiple files: all
    frame-shaped → one strip sorted by `ts` (e.g. an agent's `filmstrip/`
    directory); otherwise → one shell bundle, each file a sibling block
    named by its filename (e.g. an agent's `shell/` directory).

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

### Beach (whole surface)
Loads every named block at a beach surface: GET the index
(`{blocks: [...]}`), then each block via `?block=<name>`, 8-way
concurrent, one tile per block. Status line reports
`beach: <host> · N/M blocks [· relay]`.

- Default surface: `home` preset (beach.happyseaurchin.com). Override with
  `?beach=home|biome|<url>`; subset with `?blocks=a,b,c`.
- Biome 0-form blocks are converted to internal `_` form on load.
- CORS-less hosts are reached through `/api/beach-relay` (GET-only,
  path-allowlisted to the two well-known beach paths, https-only).
- Floor labels default on in this mode; peek panel is view-only with a
  `download` snapshot button.

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
| beach | download · close | view-only — writes happen via bsp/spark, not the viewer; download snapshots the fetched surface as `beach-<host>.json` |

The same panel doubles as the **ctx panel** (scrubber's `ctx` button): the
current slice's raw context window — ts/concern/model header, then system /
message / output sections. While open it follows the scrubber.

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
- Frame source is an **array** of frames (multi-frame filmstrip) — from the
  default source, an uploaded file, or `?source=<url>`, OR
- **events→film** has been triggered (see next §).

Single-frame sources show a disabled scrubber reading `(single-frame source)`
(the `ctx` button still works). `?frame=N` starts at slice N; `?play=1`
autostarts; playback stops at the last slice.

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
| `?source=<url>` | fetches arbitrary JSON (relative or CORS-reachable); a frame array becomes a scrubbable filmstrip, anything else an upload-mode shelf |
| `?beach=<preset\|url>` | loads a whole beach surface (presets: `home`, `biome`); implies `mode=beach` |
| `?blocks=a,b,c` | beach mode — only these named blocks |
| `?frame=N` | filmstrip — start at slice N (1-based) |
| `?play=1` | filmstrip — start animating on load |
| `?mode=frame\|editor\|upload\|beach` | sets initial input mode |

Tool-grade bookmarks this enables:
- whole biome commons: [`?beach=biome`](./?beach=biome)
- whole old-world beach: [`?beach=home`](./?beach=home)
- watch a kernel think: [`?source=data/demo-strip.json&play=1`](./?source=data/demo-strip.json&play=1)

Current snapshots live in `mindflow/filmstrip-3d/data/`:
- `thornkeep.json` — the four Thornkeep RPG blocks (world / rules /
  protocol / events). Bookmarkable as
  [filmstrip-3d/?shelf=thornkeep](./?shelf=thornkeep).
- `demo-strip.json` — a 4-frame demo filmstrip (a kernel growing a
  starstone) exercising the scrubber, touched sets, and the ctx panel.

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
- **Deep blocks read as near-empty plains** at whole-beach distance — a
  depth-5 tile is 243× its cube size (3^depth geometry). Zoom in, or
  subset with `?blocks=`.
- **Editor mode reads only `mindflow-editor:shelf`** — the biome editor's
  0-form shelf (localStorage key `zand-editor:shelf`) isn't merged in yet;
  write-back would need `_`→`0` denormalisation to avoid corrupting it.
- **The relay needs a serverless host.** On a static-only deploy
  (`python -m http.server`) CORS-less beaches like the biome commons
  can't load; beach.happyseaurchin.com still works (it serves CORS).
- **MCP response truncation**: the `pscale_walk` tool truncates display
  at ~150 chars, so snapshots generated via MCP have truncated `_`
  strings. Structural only — live beach mode doesn't have this problem.
