# happyseaurchin-home

This repo is the **federated beach handler** for the bsp-mcp / pscale-beach substrate. Its `api/pscale-beach.js` IS the wire-level reference for what the substrate accepts, validates, and rejects at the HTTP boundary.

## Cross-repo scope

happyseaurchin-home is one of three sibling repos that together constitute the substrate. Substantive work routinely spans all three:

- **`happyseaurchin-home`** (this repo) — federated beach handler at `/.well-known/pscale-beach`. Vercel + Upstash KV. Hosts the live testbed at `https://happyseaurchin.com`. Companion scripts: `wipe-pscale-beach.js` (clears all blocks via Redis), `wipe-block.js` (HTTP DELETE on a single block), `bootstrap-beach-locks.js` (one-shot lock installer).
- **`bsp-mcp-server`** ([github](https://github.com/pscale-commons/bsp-mcp-server)) — the substrate's MCP router, sentinels, conventions. **Primary architectural reference** — its CLAUDE.md is the source of truth for the surface model (URL = surface; named blocks are siblings), the unified `bsp()` function, and the substrate-stateful primitives (`pscale_create_collective`, `pscale_register`, `pscale_grain_reach`, `pscale_key_publish`, `pscale_verify_rider`). Read it at session start.
- **`xstream-bsp`** ([github](https://github.com/happyseaurchin/xstream-bsp)) — the canonical browser client. The V-L-S canvas, viewer drawer, kernel, presence/liquid/marks/pools writers. If a write breaks at this handler, xstream-bsp is the most likely caller; check its `src/kernel/beach-kernel.ts` and `src/lib/bsp-client.ts`.

If you only see one repo at session start, you'll re-derive what's already in another. **Add the other two as `additionalDirectories` in `.claude/settings.local.json`** so reads, edits, and grep span all three:

```jsonc
// happyseaurchin/.claude/settings.local.json — gitignored, per-machine
{
  "permissions": {
    "additionalDirectories": [
      "/Users/<you>/Projects/bsp-mcp-server",
      "/Users/<you>/Projects/xstream-bsp"
    ]
  }
}
```

At session start, run `git fetch origin && git log origin/main..HEAD` in each touched repo. Branch bases drift across sessions; don't assume yours is current.

## What this handler does

One endpoint, polyglot dispatch:

```
GET  /.well-known/pscale-beach              → derived index of named blocks at this surface
GET  /.well-known/pscale-beach?block=<name>[&spindle=<addr>]
POST /.well-known/pscale-beach?block=<name>
     body: bsp-mcp standard {spindle, content, secret?, new_lock?, gray?, confirm?}
       OR substrate-action shapes for prefixed blocks:
         sed:   {action: "register", declaration, passphrase}
         grain: {action: "reach", side, agent_id, partner_agent_id, ...}
DELETE /.well-known/pscale-beach?block=<name>
       body: {confirm: true, secret?}
```

**Block-name prefix routes the substrate:**

| Prefix | Substrate | Lock model |
|---|---|---|
| `sed:<collective>` | site-hosted sed: | per-position locks; atomic next-position allocation |
| `grain:<pair_id>` | site-hosted grain: | per-side locks; symmetric reach/accept state machine |
| anything else | ordinary block | per-first-digit locks; `_` for whole-block / underscore-of-root writes |

**Lock salt namespaces** (`hashOrdinary`, `hashSed`, `hashGrain`) match `bsp-mcp-server/src/locks.ts` so locks set under one client verify under any other. Don't drift these — they're the cross-client trust anchor.

## Wire contract for ordinary writes

`content` is the value placed at `spindle` — an object goes in as a subtree, a string as a string-leaf. **Shape derivation (point/ring/subtree/disc/star) per `pscale_attention` is the CLIENT's job; this handler does NOT honour `pscale_attention`.** Empty spindle is a whole-block replace and requires `{confirm: true}`.

**Supernest-on-growth:** when the descent path crosses an intermediate node holding a string, the string migrates to the new sub-block's underscore (`block[k] = "old"` becomes `block[k] = {_: "old", ...}`) so the parent's semantic survives the appearance of children.

## Shape gate (per-host policy, not protocol)

`validateShape` rejects writes that violate pscale spine rules:

1. **`_word` underscore-prefixed sibling keys at any spine level.** Only `_` and digits 1-9 are valid spine keys. `_word` keys (e.g. `_a`, `_addr`, `_t`, `_f`, `_synthesis`) are invisible to the bsp walker and create ghost data — accepting them is how the old `beach.json` got contaminated with shapes no walker could traverse.
2. **JSON-stringified objects/arrays as values.** Must be written directly, not as serialized strings. Otherwise the walker can't traverse them.

This is **per-host policy, not protocol**. bsp-mcp itself stays silent on shape rules; happyseaurchin chose strict because the testbed needs hygiene. Other beaches may choose differently. If a future block convention legitimately needs an `_word` key for some reason, the conversation happens at the convention layer, not by relaxing this gate.

## "Beach is the surface" — the architectural pivot (8 May 2026)

The historical "beach" block (with reserved positions for marks/pools/reaches/conventions/metadata) is gone. The URL is the surface; named sibling blocks are the only things that exist; `?block=` is required on every read/write; `GET` without `?block=` returns the derived index. The full handover is at `bsp-mcp-server/CLAUDE.md` § "Beach-as-surface migration — what shipped 8 May 2026, what's next" — read that for the architectural rationale, the deploy sequence, and the open items (synthesis storage refactor, perf cache for tide/settings, Thornkeep/GRIT port, dashboard rewrite).

## Operational scripts

- **`scripts/wipe-pscale-beach.js`** — clears every `pscale-beach-v2:*` key (blocks + locks + legacy single-block keys). Requires `WIPE_CONFIRM=yes-i-mean-it`. Use after a coordinated deploy to start clean.
  ```bash
  export $(grep -E 'KV_REST_API_(URL|TOKEN)' .env.local | xargs)
  WIPE_CONFIRM=yes-i-mean-it node scripts/wipe-pscale-beach.js
  ```
- **`scripts/wipe-block.js <name>`** — HTTP DELETE on a single named block. Useful for clearing one corrupt sibling without nuking everything. Honours the `_` lock if set.
- **`scripts/bootstrap-beach-locks.js`** — Phase B helper (legacy; pre-surface-migration era). Installs locks on the legacy beach block.

## Deployment

Vercel auto-deploys from `main`. Upstash KV is the storage backend; env vars `KV_REST_API_URL` and `KV_REST_API_TOKEN` live in `.env.local` (gitignored) and Vercel's project env. Local dev: `vercel dev` against the same KV (or set up a dev KV).

## What NOT to do

1. **Don't reintroduce `DEFAULT_BLOCK_NAME = 'beach'`** or any "auto-seed default block" behavior. The whole point of the May 2026 migration was that the URL is the surface, not a block. If you find yourself wanting a default, ask why.
2. **Don't relax the shape gate to accommodate a specific client's convention.** If xstream-bsp or any other client legitimately needs a new shape, the conversation happens at the substrate convention layer (`bsp-mcp-server/src/block-conventions.json`) and the gate stays uniform. Per-client exceptions destroy the "predictable shape" invariant.
3. **Don't drift the lock salt namespaces.** `hashOrdinary` / `hashSed` / `hashGrain` must match `bsp-mcp-server/src/locks.ts` byte-for-byte. Cross-client trust depends on it.
4. **Don't add per-block-name special cases.** "Beach" was special once; it became a dumping ground. Sibling blocks are sibling blocks. The handler treats them all the same way (with the prefix-based substrate routing being the only exception, and that's prefix-based, not name-based).
