# happyseaurchin-home

This repo is **David's personal site** at https://happyseaurchin.com — the landing page, the mindflow speech/pscale tools, the experiments gallery, and a handful of small Vercel serverless functions.

**It is no longer the federated beach.** `api/pscale-beach.js` (the v2 handler, ~680 lines) was deleted in `45759f0` (11 May 2026). The beach lives at **https://beach.happyseaurchin.com**, deployed from [`pscale-commons/pscale-beach`](https://github.com/pscale-commons/pscale-beach) — that repo is now the wire-level reference for what the substrate accepts, validates, and rejects at the HTTP boundary. Do beach/substrate work there and in `bsp-mcp-server`, not here.

## The beach moved — what that means here

- `GET https://happyseaurchin.com/.well-known/pscale-beach` returns **404, deliberately**. bsp-mcp's federation resolver treats a bare-domain 404 as the signal to fall back to `beach.<host>` (bsp-mcp-server PR #20; migration in PR #22). Reinstating a handler — or a `vercel.json` rewrite, or even a static file — at that path would shadow the live beach.
- Substrate architecture (surface model, `bsp()`, conventions, sentinels, lock salts): `bsp-mcp-server`'s CLAUDE.md remains the source of truth. The handler implementation is `pscale-beach/api/pscale-beach.js`.
- The canonical browser client is still `xstream-bsp`.

## What's actually here

| area | what |
|---|---|
| `index.html`, `assets/`, `style/` | personal site shell |
| `mindflow/` | speech-to-structure tools (see below) |
| `experiments/` | standalone math/visualization artifacts + generated `pscale-inventory.html` |
| `components/` + `docs/components/` | numbered component inventory — HTML pages + source `.md` files, fed by the ingest pipeline |
| `pscale/starstone/` | starstone format reference (JSON variants + bsp-star walkers in js/ts/py) |
| `packages/`, `real-organic-human/`, `virtual-ai-agents/` | static site sections |
| `api/` | four serverless functions (see below) |
| `scripts/` | inventory pipeline (active) + legacy beach ops (read the warnings) |

### mindflow/ tools

Each subdirectory is a standalone static page; shared walkers live at `mindflow/bsp.js`, `bsp-star.js`, `zand.js`, `pscale-to-gingko.js`.

- **basic** — free word cloud from speech
- **byok** — bring-your-own Anthropic key; LLM concept extraction into the cloud
- **explorer** — navigate pscale block topology; load a block or compile one live from speech
- **editor** — pscale JSON editor; document & column views, star rendering, 0-form toggle for sunztone v5
- **zand-editor** — ztone editor (digit `0` is voicing, the sunztone v5 successor format); floor-aware addresses; walk modes free/spindle/ring/disc/point
- **filmstrip** — kernel API-log viewer (C/B/A loops); includes `producer.js` for capturing LLM I/O as frames
- **zand-filmstrip** — agent-loop wake viewer (γ, edits, currents, faces); sibling of zand-editor
- **filmstrip-3d** — context window as a 3D landscape; renders whole beach surfaces via `/api/beach-relay`; the landing page's "Thornkeep" entry is a bookmark into it with the Thornkeep shelf pre-loaded

Foundry → public: tools iterate here; stable versions are mirrored to `pscale-commons/dev-tools`.

## api/ functions

- **`llm.js`** — POST pass-through to the Anthropic Messages API; caller supplies `x-api-key`; supports streaming.
- **`vault.js`** — BYOK key vault + Claude proxy. Keys stored as httpOnly cookies (`hsu_` prefix), routed by `service`: `set-keys` / `check-keys` / `clear-keys` / `claude`. Origin allowlist (happyseaurchin.com + localhost dev ports).
- **`pscale-walk.js`** — GET-only proxy to the `pscale_blocks` Supabase table; returns full rows (MCP `pscale_walk` truncates display at ~150 chars, losing `_` body text). Env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. GET-only **is** the security boundary — the table's RLS is permissive-ALL, so the anon key is also a write credential and must never reach the browser.
- **`beach-relay.js`** (added 11 Jun 2026) — GET-only CORS relay for beach surfaces the browser can't reach directly; exists because the biome commons (`biome-commons-production.up.railway.app`) serves no CORS headers. Strictly scoped: https only, path must be exactly `/.well-known/pscale-beach` or `/.well-known/biome-beach`, no localhost/IP-literal hosts, redirects refused, 8s timeout. Used by filmstrip-3d for whole-beach rendering.

## scripts/

**Active — component inventory pipeline:**
- `ingest.js` — classify a dropped file → copy into `docs/components/{paddedId}-{slug}` → append `experiments/pscale-inventory.data.json` → rebuild → commit
- `classify.js` + `prompts/` — LLM classification step
- `build-inventory.js` — regenerates the marked regions of `experiments/pscale-inventory.html` and rebuilds `docs/components.zip`
- `watch-inbox.js` — foreground watcher on `~/xstream-inbox/`; drops feed `ingest.js`

**Legacy — pre-migration beach ops. Read before touching:**
- `wipe-block.js` — still works: the live handler kept per-block HTTP DELETE (lock-gated), so `BEACH_URL=https://beach.happyseaurchin.com/.well-known/pscale-beach node scripts/wipe-block.js <name>` is valid. Only its **default** URL (the bare domain) is stale — it now 404s.
- `wipe-pscale-beach.js` — deletes keys in the **pre-namespacing** layout (`pscale-beach-v2:block:*` / `pscale-beach-v2:locks:*`) in whatever KV `.env.local` points at. The live beach writes origin-scoped keys (`pscale-beach-v2:<origin>:block:<name>`), which these patterns do **not** match — so this script cannot clean the current beach. It is destructive only if the shared Upstash still serves data from legacy keys (`LEGACY_NAMESPACE_FALLBACK_READS=true` and `pscale-beach`'s `migrate-keys.js` not yet run); after migration it deletes dead keys.
- `bootstrap-beach-locks.js` — Phase B lock installer for the long-gone legacy `beach` block; inert without the deleted handler.

Beach maintenance tooling now lives in `pscale-beach/scripts/` (local-beach, pack-seed/reset/dump, repair-floor, migrate-keys, smoke tests). Note the gap: **no repo currently has a whole-beach wipe for the origin-scoped layout** — if that capability is needed, write it in `pscale-beach/scripts/`, not here.

## Deployment

Vercel auto-deploys from `main`. `vercel.json` is minimal: `cleanUrls` plus `no-store` on `/api/*` — **no `.well-known` rewrite** (deliberate; see above). Env vars: `SUPABASE_URL` / `SUPABASE_ANON_KEY` for pscale-walk, in Vercel project env and `.env.local` (gitignored). `KV_REST_API_URL` / `KV_REST_API_TOKEN` linger in `.env.local` only for the legacy wipe script — no deployed function uses KV, and the sole npm dependency (`@upstash/redis`) exists only for that script.

## Cross-repo map

| repo | role | local checkout |
|---|---|---|
| [`pscale-commons/pscale-beach`](https://github.com/pscale-commons/pscale-beach) | the live federated beach at beach.happyseaurchin.com — wire-level reference | `~/Projects/pscale-beach` |
| [`pscale-commons/bsp-mcp-server`](https://github.com/pscale-commons/bsp-mcp-server) | substrate MCP router, sentinels, conventions — architectural source of truth | `~/Projects/bsp-mcp-server` |
| [`happyseaurchin/xstream-bsp`](https://github.com/happyseaurchin/xstream-bsp) | canonical browser client (V-L-S canvas, kernel) | `~/Projects/xstream-bsp` |
| `pscale-commons/dev-tools` | public mirror of stable mindflow tools | — |

If a session needs to read across repos, add the relevant ones as `additionalDirectories` in `.claude/settings.local.json` (gitignored, per-machine):

```jsonc
{
  "permissions": {
    "additionalDirectories": [
      "/Users/<you>/Projects/pscale-beach",
      "/Users/<you>/Projects/bsp-mcp-server",
      "/Users/<you>/Projects/xstream-bsp"
    ]
  }
}
```

## What NOT to do

1. **Don't reinstate anything at `/.well-known/pscale-beach`** — no handler, no rewrite, no static file. The bare-domain 404 is load-bearing: bsp-mcp's federation fallback (`bare 404 → beach.<host>`) routes callers to the real beach through it.
2. **Don't widen `beach-relay.js`** — no POST, no extra paths, no arbitrary hosts. It is a narrowly-scoped CORS shim, not an open proxy.
3. **Don't add write methods to `pscale-walk.js` or let `SUPABASE_ANON_KEY` reach the browser** — permissive RLS makes the anon key a write credential.
4. **Don't run `wipe-pscale-beach.js` against the shared KV** without checking migration state in the pscale-beach repo first — it targets the legacy key layout, which may still be serving live data if `migrate-keys.js` hasn't run.
