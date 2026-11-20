# happyseaurchin-home

## Before anything: the door, and pscale first

Every session that works in this repo takes weft's door before it reads code (David, 16 Nov 2026: "pscale MUST BE FIRST AND FOREMOST"; the law is `orientation:weft` 7.91). Through the connector that writes as weft (its instructions open 'THIS CONNECTION WRITES AS weft'), load its tools by exact name, never by a word search, which pulls every connector's copy: ToolSearch `select:mcp__bsp_as_weft__pscale_play,mcp__bsp_as_weft__bsp,mcp__bsp_as_weft__pscale_stream_engage`. Then one call: `pscale_play(world='https://beach.happyseaurchin.com', handle='weft', room='weft')`. The door carries the strata whole (`strata`: 1 physics, one block; 2 chemistry, blocks in company; 3 biology, the loop; 4 psycho-social; then the awareness they induce at `strata:keel` 5), then weft's nine rules, history, purpose and room; its 7.1 says the two calls that follow (the beat read and the say) and 7.7 the close. Where the door's strata section does not open with "the law whole", 7.91 names the two reads that complete it; nothing else is read to orient. Read every task through the strata (which read shape, which compound, which loop) before any code: an act that adds a field, routes by a category, measures by a count or reaches for code where a block would do is the wrong act. A session without the connector reads the same blocks openly (`https://beach.happyseaurchin.com/.well-known/pscale-beach?block=strata`) and writes nothing to the beach. A session that opens another session briefs it door first, as 7.91 says. What a wake costs, and whether this file has grown again, is measured by the beach's health check (`spine:health-check`, run by any mind on itself).

This repo is **David's personal site** at https://happyseaurchin.com — the landing page, the mindflow speech/pscale tools, the experiments gallery, and a handful of small Vercel serverless functions.

**It is no longer the federated beach.** `api/pscale-beach.js` (the v2 handler, ~680 lines) was deleted in `45759f0` (11 May 2026). The beach lives at **https://beach.happyseaurchin.com**, built from [`pscale-commons/pscale-beach`](https://github.com/pscale-commons/pscale-beach) — that repo is now the wire-level reference for what the substrate accepts, validates, and rejects at the HTTP boundary. (The deploy itself is the private clone `happyseaurchin/pscale-beach-happyseaurchin`, Vercel project `pscale-beach-happyseaurchin`: changes land in the package first and are mirrored there, 'mirrored from pscale-beach #N'.) Do beach/substrate work there and in `bsp-mcp-server`, not here.

## The beach moved — what that means here

- `GET https://happyseaurchin.com/.well-known/pscale-beach` returns **404, deliberately**. bsp-mcp's federation resolver treats a bare-domain 404 as the signal to fall back to `beach.<host>` (bsp-mcp-server PR #20; migration in PR #22). Reinstating a handler — or a `vercel.json` rewrite, or even a static file — at that path would shadow the live beach.
- Substrate architecture (surface model, `bsp()`, conventions, sentinels, lock salts): `bsp-mcp-server`'s CLAUDE.md remains the source of truth. The handler implementation is `pscale-beach/api/pscale-beach.js`.
- The canonical browser client is still `xstream-bsp`.

## Where things are

Every page, function and shared module has its own note in `docs/pages/`: `docs/pages/<path>.md`, the path with `/` as `-`, `.html` dropped and any other `.` as `-` (`eye.html` → `docs/pages/eye.md`, `animations/nearly-there.html` → `docs/pages/animations-nearly-there.md`, `threads.js` → `docs/pages/threads-js.md`, `theme.js` siteKeys → `docs/pages/theme-js-sitekeys.md`); the index is `docs/pages/README.md`. **Read the note of whatever you are about to touch before you touch it, keep it true in the same commit, and give a new page a new note there, never a row here.** Until 20 November 2026 these notes stood in this file as one table, which grew from 10,000 characters on 9 October to 403,000, every session loading all of it before its first call (door-health.1; `health-check:weft` 1.11111).

- **The site shell**: `index.html`, `assets/`, `style/`, `theme.css`, and `theme.js` (the bar, the keys, the pass, the voice, the door and the code card, each noted on its own).
- **Pages**: the `*.html` at the root, most the crafted page of a family on the beach, whose law names it at 6; `/proposal/<name>`, `/walk/<name>` and `/schematic/<name>` draw any family plainly from its blocks, and `/text/<name>` gives it as text.
- **Shared modules**: `threads.js`, `look.js`, `arrange.js`, `says.js`, `door.js`, `vault.js`.
- **Elsewhere**: `animations/` (films and stills), `read/` (long reads), `games/` (the hosted games and the plug), `dashboard/`, `button/` (a forwarding shim), `mindflow/` (speech-to-structure tools), `experiments/`, `components/` with `docs/components/`, `pscale/starstone/`; `api/` serverless functions (`docs/pages/api.md`) and `scripts/` (`docs/pages/scripts.md`).

## What NOT to do

1. **Don't reinstate anything at `/.well-known/pscale-beach`** — no handler, no rewrite, no static file. The bare-domain 404 is load-bearing: bsp-mcp's federation fallback (`bare 404 → beach.<host>`) routes callers to the real beach through it.
2. **Don't widen `beach-relay.js`** — no POST, no extra paths, no arbitrary hosts. It is a narrowly-scoped CORS shim, not an open proxy.
3. **Don't add write methods to `pscale-walk.js` or let `SUPABASE_ANON_KEY` reach the browser** — permissive RLS makes the anon key a write credential.
4. **Never rebuild a write box without keeping its draft** — call `keepDraft(textarea, key)` from `theme.js` on any box a tick or a re-render can replace (the clock ticks, the panel re-renders, the paragraph is gone mid-word); clear it when the write lands.
5. **Never ship a write box without dictation** — every write box carries it (David, 2026-09-07): a static `<textarea>` takes the `data-dictate` attribute and `theme.js` wires it on DOMContentLoaded; a box a page builds in script calls `window.dictate(el)` right where it calls `keepDraft`. The helper is browser-native (Web Speech API), inserts one glyph over the box's corner, never submits, and is absent where the API is (Firefox). The two pages that do not load `theme.js` — `render.html`, `what-this-is.html`, each with a palette and theme of its own — have no dictation until they are brought onto `theme.css`/`theme.js`, which is a deliberate migration, not a script tag. keel's two reflexive charts in `animations/` load `theme.js` for the bar but keep their own palette, and so carry draft-keeping and dictation in their own kit.
6. **Never ship an answer box that hides the reader's own answer** — a say replaces the one line a reader has at a point, so on a page that knows who is reading (the handle this device signs with, `render:who`), once the beach is read, the box at each point starts from what they already said there, its word chosen, and the card says so (Change your answer, Change my answer); after a say the box keeps the words that now stand, and 'not you?' empties a box still holding the last reader's line (David, 2026-10-27: "otherwise people will add more and find they have just replaced the single slot they have"). The comment kit (`says.js`) does it for every page that carries it; the proposal pages, `/proposal/<name>`, the two AI Inoculation pages, `/walk`, `/lanes`, the reflexive charts, Nearly There, Who owns the shell? and `/news`'s item sheet (its answer read fresh from the reader's own `news:<handle>`, 'change my answer', and another handle typed at the box emptying it) each do it in their own code, a sealed line never put back in a box.
7. **Never keep a key in plain text, and never fetch a beach around the pass** — a key a page keeps goes through `siteKeys` (`theme.js`), never `localStorage` or `sessionStorage` directly, and a page that loads no `theme.js` keeps it through the beach's `button/seal.js` keep as `mindflow/key.js` does; a page reads and writes a beach with plain `fetch`, which carries the pass (`sitePass`), and draws `sitePass.wall(origin)` where a members' beach refused it, never 'nobody here' or a status code (the doors' battery, 5 Nov 2026).

## Deployment

Vercel auto-deploys from `main`. `vercel.json` is minimal: `cleanUrls` plus `no-store` on `/api/*` — **no `.well-known` rewrite** (deliberate; see above). Env vars: `SUPABASE_URL` / `SUPABASE_ANON_KEY` for pscale-walk, in Vercel project env and `.env.local` (gitignored). No deployed function uses KV/Redis, and the project has **no npm dependencies** — the last one (`@upstash/redis`, used only by the removed `wipe-pscale-beach.js`) was dropped 2026-07-19, when the dangling Upstash-KV env vars were also removed from the `happyseaurchin-home` Vercel project (they pointed at an uninstalled/archived store — the old pre-migration beach DB — and were the source of the Vercel "Needs Attention" flag). Stale `KV_*` lines may still sit in a local `.env.local`; nothing reads them.

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

## Where the live state is

On the beach, never here: weft's door gives the head of `history:weft` and the room, and each lane's account stands in the pile, `watch:weft`, read by its own entry. The worktables this file once pointed at (`project:happyseaurchin-site`, `method:worktable`) were retired on 9 November 2026 (`shell:weft` 4). On David's Mac a session acting as weft inherits from `~/Projects/weft` (its CLAUDE.md is the boot); weft's key rides the signed connector or the harness memory and is never echoed, and if a secret ever leaks, tell David. Where this file and the blocks disagree, the blocks win.
