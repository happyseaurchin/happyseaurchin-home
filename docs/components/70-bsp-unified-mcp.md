# BSP-Unified pscale MCP — Specification

**Date**: 28 April 2026
**Status**: Spec, ready for CC to evaluate
**Lineage**: Derived from `pscale-adversarial-foundations.md` (9 April 2026), §1–2

---

## 0. What this changes

The pscale MCP currently exposes ~25 functions. Two of them — `pscale_walk` and `pscale_write` — carry the BSP semantics. `walk` accepts a `mode` enum (spindle / ring / dir / point / disc / star). `write` accepts only `(address, content_string)` — point writes only, no equivalent of the read-side modes.

This spec replaces the mode-enum API with a **two-coordinate primitive** that mirrors the geometry of pscale blocks. Read and write share the same signature. The "modes" become derived selection shapes, not chosen operations.

The data layer (blocks, locks, secrets, gray encryption, sed: positions, grain: pair-ids) **does not change**. This is a function-surface redesign, not a substrate migration.

---

## 1. The geometry (recap from foundations §1)

A pscale block is a tree where every node belongs simultaneously to:

- a **longitudinal path** (spindle — root toward leaf), and
- a **transversal group** (ring — siblings at the same depth, within a disc — all nodes at that depth).

These are **polar coordinates, not orthogonal**. Radial depth and transversal breadth.

The five (or six, with star) BSP functions are not operations imposed on the block. They are the block's own geometry read in different orientations.

---

## 2. The four parameters (BSP + content)

| Param | Symbol | Meaning |
|---|---|---|
| **B**lock name | `block` | Which block (e.g. `"thornkeep-spatial"`, `"sed:commons:11"`). |
| **S**pindle address | `spindle` | The path you commit. Length determines the spindle's terminal pscale. |
| **P**scale attention | `pscale_attention` | Where attention sits along available depth. Together with spindle, derives selection shape. |
| content | `content` | Payload, for writes. Shape derived from (spindle, pscale_attention). Omit for reads. |

The acronym **BSP** is recovered: Block, Spindle, Pscale-attention.

---

## 3. Selection-shape derivation

Spindle length sets a terminal pscale (call it `P_end`). Pscale attention `P_att` is the second coordinate. Shape derives:

| Relation | Selection shape | Read returns | Write payload |
|---|---|---|---|
| `P_att == P_end` | **point** | string at terminus | string |
| `P_att == P_end − 1` | **ring** | siblings of terminus | `{digit: string-or-obj}` |
| `P_att < P_end − 1` (deeper) | **subtree / dir** | full subtree from terminus down to `P_att` | nested object |
| spindle empty, `P_att` set | **disc** | all nodes at `P_att` across the block | `[{address, content}]` |
| spindle empty, `P_att` empty | **whole block** | full tree | whole-block JSON |
| `spindle` ends with `*` (star prefix) | **hidden directory** at terminus, then (S,P) inside it | as for the inner shape | as for the inner shape |

**Constraint** (foundations §2): awareness beyond the spindle endpoint is bounded by actual block content. You cannot perceive depth you do not have. Writing at `P_att` deeper than current depth either creates intermediate nodes (current behaviour, kept) or refuses (strict mode, opt-in).

---

## 4. The unified function

```
bsp(
    agent_id,           # caller identity
    block,              # B — block name
    spindle,            # S — address path; "" or null = at root
    pscale_attention,   # P — pscale level of attention; null = at spindle terminus (point)
    content = null,     # omit for read; provide for write
    secret = null,      # write-lock proof OR gray-encrypt key
    gray = false        # explicit opt-in for self-encryption on unlocked ordinary blocks
) → result | ack
```

**Read** when `content is None`: returns the selection at (S, P) per §3.

**Write** when `content` is provided: replaces the selection at (S, P) with `content`. Content's shape MUST match the shape derived from (S, P); a string written where a subtree is expected is an error (or auto-wraps as `{_: string}`).

**Star** is not a separate `mode`. A spindle ending with `*` (or with a digit-0 step into a hidden directory) means: walk to the terminus, enter the hidden directory at that node, then continue applying (S, P) inside it. Composition, not parallel option. This matches `bsp.py` / `bsp2-star.py` behaviour.

---

## 5. Backward compatibility

Existing callers continue to work without change. The current `pscale_walk` and `pscale_write` are re-implemented as thin wrappers over `bsp()`:

### 5.1 `pscale_walk` translation

```
walk(agent, block, address, mode='spindle')
```
becomes:

| `mode` | `spindle` | `pscale_attention` |
|---|---|---|
| `spindle` | `address` | `terminus(address)` |
| `ring` | `parent(address)` | `terminus(address)` |
| `dir` | `address` | `floor(block)` (deepest) |
| `point` (with explicit p) | `address` | `p` |
| `disc` (with explicit depth) | `""` | `pscale_for_depth(depth)` |
| `star` | `address + "*"` | `terminus(address)` |

### 5.2 `pscale_write` translation

```
write(agent, block, address, content_string, secret?)
```
becomes:

```
bsp(agent, block, spindle=parent(address), pscale_attention=terminus(address),
    content=content_string, secret=secret)
```

This is the "point write at the terminus" case — the current implicit behaviour made explicit.

### 5.3 What new (B,S,P) calls unlock

Calls the current API cannot express, all now possible in one round-trip:

- **Subtree write**: `bsp(agent, block, spindle="111", pscale_attention=floor, content={"_": {...}, "1": {...}, "2": {...}, "3": {...}})` — drop a whole room with all its overlays in one call.
- **Ring write**: `bsp(agent, block, spindle="11", pscale_attention=0, content={"1": "Tavern", "2": "Smithy", "3": "Stables"})` — populate digit-children at a parent in one call.
- **Disc write**: `bsp(agent, block, spindle="", pscale_attention=2, content=[{address: "11", content: "..."}, ...])` — multi-position write at one depth.
- **Whole-block write**: `bsp(agent, block, content={...})` — replace the entire block (with appropriate locking checks).
- **Star write**: `bsp(agent, block, spindle="111*", pscale_attention=0, content={"1": {...}, "2": {...}, "3": "rules-thornkeep"})` — populate the hidden directory at a spatial address with all its dimensional overlays (S×I, S×T, S×rules) in one call.

The world-rebuild that currently takes hundreds of point writes now takes one whole-block call or a handful of subtree calls.

---

## 6. Implication for the wider function list

### 6.1 The hypothesis

Many of the ~25 current pscale functions are convenience wrappers around BSP read/write/create on specific block names with small auto-positioning rules. Once `bsp()` is the primitive, most of these collapse to thin sugar — and several can move client-side (into agent prompts/skills) rather than living as MCP tools.

### 6.2 Inventory pass

| Function | Status under unified BSP |
|---|---|
| `pscale_walk` | **Sugar** over `bsp()` read. Keep as alias, or deprecate. |
| `pscale_write` | **Sugar** over `bsp()` write at point. Keep as alias, or deprecate. |
| `pscale_create_block` | **Sugar**: `bsp()` with empty spindle + initial content + optional lock. Keep — convenient. |
| `pscale_remember` | **Sugar**: `bsp()` write + auto-position assignment + auto-compact. Internal logic stays (compaction is real); surface wraps bsp(). |
| `pscale_recall` | **Sugar**: `bsp()` spindle read of history block at "current position" or explicit address. |
| `pscale_passport_publish` | **Sugar**: `bsp()` create_block on `passport_<agent>` with conventions. |
| `pscale_passport_read` | **Sugar**: `bsp()` read on `passport_<agent>`. Could move client-side. |
| `pscale_inbox_send` | **Sugar**: `bsp()` write to `inbox_<agent>` at next position. |
| `pscale_inbox_check` | **Sugar**: `bsp()` read of `inbox_<agent>`. |
| `pscale_beach_mark` | **Sugar**: `bsp()` write to URL-keyed block. |
| `pscale_beach_read` | **Sugar**: `bsp()` read of URL-keyed block. |
| `pscale_pool_join` | **Sugar**: `bsp()` write to URL-keyed pool block at next position. |
| `pscale_pool_send` | **Sugar**: same. |
| `pscale_pool_read` | **Sugar**: `bsp()` read of pool block since last cursor. |
| `pscale_agent_search` | **Sugar**: `bsp()` traversal/scan over registry blocks. |
| `pscale_network` | **Sugar**: `bsp()` read of relations block. |
| `pscale_concern` | **Sugar**: `bsp()` read/write of single field. |
| `pscale_invite` | **Static text** — could be a resource not a tool. |
| `pscale_create_collective` | **Primitive**: needs server-side hash-with-salt of admin passphrase, conventions enforcement. Keep. |
| `pscale_register` | **Primitive**: needs server-side next-position assignment under collective conventions, passphrase hash. Keep. |
| `pscale_grain_reach` | **Primitive**: needs pair_id derivation, symmetric reach/accept state machine, inbox notification. Keep. |
| `pscale_lock_block` | **Primitive**: changes block-level lock state, not content. Keep. |
| `pscale_evolution` | **Primitive**: bulk structural rewrite under new convention. Keep. |
| `pscale_key_publish` | **Primitive**: cryptographic. Keep. |
| `pscale_verify_rider` | **Primitive**: cryptographic. Keep. |

### 6.3 The collapsed surface

**~7 primitives** survive:

1. `bsp()` — unified read/write/create on any block (including sed:/grain:/locked-ordinary)
2. `pscale_create_collective` — admin operation on a sed: substrate
3. `pscale_register` — server-assigned position in a sed: substrate
4. `pscale_grain_reach` — symmetric reach/accept across the bilateral pair_id
5. `pscale_lock_block` — block-level lock state change
6. `pscale_evolution` — substrate migration
7. `pscale_key_publish` + `pscale_verify_rider` — cryptographic primitives (one or two functions)

**~16–18 sugar wrappers** can either:
- stay as MCP tools for ergonomic reasons (low friction for callers), or
- move client-side, leaving the MCP surface lean.

### 6.4 The "secret / gray" observation

The current pscale_write doc shows `secret` doing different things in different substrate contexts:
- on sed: position → registration passphrase (lock proof)
- on grain: side → side passphrase (lock proof)
- on locked ordinary block → lock proof
- on unlocked ordinary block → triggers gray self-encryption

Under unified BSP, this is two orthogonal things, both passed as arguments:

- `secret`: write-lock proof, used wherever the block/position has a lock.
- `gray`: explicit opt-in for self-encrypted content on unlocked ordinary blocks.

The substrate (sed:/grain:/ordinary) is encoded in the block name as it already is. The function dispatches on substrate from the name; the caller doesn't need a different function per substrate.

---

## 7. What does NOT change

- The block format (digits, underscore, supernesting).
- Lock state on existing blocks.
- Existing sed: positions and grain: pair_ids.
- Gray-encrypted content already in storage.
- Any agent_id, passport, or registered identity.
- The semantics of any current operation — the new API is a strict superset of behaviours, not a redefinition.

---

## 8. Migration path

Three phases. Each phase is shippable on its own; the system stays usable throughout.

### Phase 1 — Add `bsp()` as a new primitive
- Implement `bsp(agent, block, spindle, pscale_attention, content?, secret?, gray?)` server-side.
- Internally, `pscale_walk` and `pscale_write` now call `bsp()`. No external API change.
- New callers can use `bsp()` directly to access subtree/ring/disc/whole-block writes.

### Phase 2 — Refactor sugar wrappers
- Re-implement remember / recall / inbox_* / beach_* / pool_* / passport_* on top of `bsp()`.
- No behaviour change for callers. Server-side code shrinks substantially.

### Phase 3 — Surface lean (optional)
- Decide which sugar wrappers stay as MCP tools and which move client-side.
- Update the skill docs / agent prompts to teach the (B,S,P) frame as primary, with mode names as convenience labels.
- Deprecate `pscale_walk` / `pscale_write` in favour of `bsp()` (or keep as forever-aliases).

No data migration. No existing block needs to be rewritten.

---

## 9. Open questions

- **Mode-name aliases on the read side**: should `bsp()` accept an optional `mode='ring'` parameter that derives `(spindle, pscale_attention)` for the caller, or should callers always specify the two coordinates? (Convenience vs. teaching the geometry.)
- **Strict vs. lenient depth**: when writing at `pscale_attention` deeper than current block depth, should `bsp()` create intermediate nodes (lenient, current behaviour) or refuse (strict)? Argument or always-lenient?
- **Disc write payload shape**: list of `{address, content}` is the obvious format. Alternative: a sparse object `{address: content}`. Either works; pick one.
- **Atomicity of bulk writes**: a subtree or whole-block write either succeeds in full or fails in full. Confirm transaction boundary at the storage layer.
- **Star + write**: writing into a hidden directory via star — confirm that the hidden directory is created if absent, with the underscore-chain shape that `bsp.py` expects.
- **Footgun preservation**: the current `pscale_write` warning ("bare-position writes destroy children") becomes structurally impossible under the new API, because the (S, P) pair makes the write target unambiguous. Verify this in implementation.

---

## 10. Files to share with CC

For CC to evaluate and implement:

1. This spec: `bsp-unified-mcp-spec.md`
2. Prior reduction: `pscale-adversarial-foundations.md` §1–2
3. Read-side reference implementation: `bsp.py` and `bsp2-star.py`
4. Current MCP tool signatures (already in CC's environment)

CC's first task should be to confirm the translation table in §5 against actual current behaviour, and to flag any case where the unified primitive cannot reproduce current semantics. That's the gating check.
