# happyseaurchin-home

This repo is **David's personal site** at https://happyseaurchin.com — the landing page, the mindflow speech/pscale tools, the experiments gallery, and a handful of small Vercel serverless functions.

**It is no longer the federated beach.** `api/pscale-beach.js` (the v2 handler, ~680 lines) was deleted in `45759f0` (11 May 2026). The beach lives at **https://beach.happyseaurchin.com**, built from [`pscale-commons/pscale-beach`](https://github.com/pscale-commons/pscale-beach) — that repo is now the wire-level reference for what the substrate accepts, validates, and rejects at the HTTP boundary. (The deploy itself is the private clone `happyseaurchin/pscale-beach-happyseaurchin`, Vercel project `pscale-beach-happyseaurchin`: changes land in the package first and are mirrored there, 'mirrored from pscale-beach #N'.) Do beach/substrate work there and in `bsp-mcp-server`, not here.

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
| `dashboard/` | the beach dashboard — keel's claude.ai dashboard (`dash.js`, near-verbatim) on a small runtime (`runtime.js`) that reads the census, the `presence` block and each `/w/` table's census straight from the beach in the browser. The "who writes / doors / tables" tabs read keel's snapshot in `dashboard/data/` (only the fields drawn — no notes or aliases); refresh it by re-exporting from the claude.ai dashboard when keel recompiles. The virtual page's "the beach, right now" band reads the same census. |
| `button/` | a forwarding shim only: the beach button (a floating frame any page carries with one script tag, the host page unable to read what is typed into it) moved onto the beach itself on 14 Oct 2026 and is served at `https://beach.happyseaurchin.com/button/button.js`; its source, security case and hostile-page test are in `pscale-commons/pscale-beach` (`button/`, `npm run smoke:button`). `button/button.js` here hands any page that carried the old address to the beach's loader. The o-pages carry the beach's own button through `theme.js` (`beachButton`, 15 Oct 2026), which since 18 Oct loads the beach's voice instead (`https://beach.happyseaurchin.com/button/voice.js`, its source and `npm run smoke:voice` in pscale-beach `button/`): every page with the bar, never in an embed or a framed page, and not on a page whose body says `data-beach-button="off"` because its bottom right is taken (earth, globe, field, social-brain, experience-ecology); while a page's `.sheet-back`/`.pop-back` is open the button's circle, edge and window step under it. **The button is off until a person turns it on** (David, 2026-10-18), with 'show beach button' / 'hide beach button' under options (or 'Or use the beach button' beside a chart's reading box). The choice is the person's, kept with their settings on the beach: `settings:<handle>` at 9.1 (the per-person layer of the beach's `settings` block; 9 is pages), wherever the device knows their name (`render:who`), so it follows them to every device; a device that knows no name keeps it in localStorage `beach-button` ('on', else off). The light or the dark is kept beside it the same way, at 9.2 (`'light'` or `'dark'`): ◐ writes it through the voice (`beachVoice.set('9.2', …)`), and every page with the bar takes it up from the person's settings once it has painted in the device's own (`view:theme`, still set before first paint). Never in `lists:<handle>`: that block's nine branches are the person's lists (1 projects, 2 the go listing, 3 the open row, 4 follows, 5 scopes), and a setting is not a list. **A write box takes words through the voice**: `beachVoice.say({ field, at, text, name })` (and `keep`, `ask`, `drop`) goes through the button where the person has it on the page, else the page's own box: the name it passes, and the key the browser keeps or asks for once. The charts are the first pages on it; the older o-pages' write paths (/now, /walk, …) still hold their own keys and move onto it in time. Since 16 Oct 2026 the button is tapped as xstream's construction button is (+ opens the prompt, # settings, × closes; one window holding the reply, staged writes with commit, and the prompt), moved by the grip beside its circle, on the page itself. |
| `read/` | the longer pieces to read, each a public copy anyone can open without a Claude sign-in, listed at `/read` and linked from the animations they go with (15 Oct 2026). The Package and the Machine and AI in the Room are rendered from their Claude Docs' own Markdown exports by `scripts/build-doc-copies.js` (refresh the `.md` and rerun; never hand-edit their `.html`); The Two Turns and The CBA transform are keel's pages carried as they stand. Their old `/animations/<slug>` addresses redirect here (`vercel.json`). |
| `reflexive-charts.html` | the reflexive charts (18 Oct 2026): charts read with the reader in them, each a family on the beach — the reader's year or wave in their own mirror `<family>:<handle>`, everyone else's drawn beside it, and a closing section the charts share at `spine:reflexive-reading`, a lens digit per page under each paragraph (2 murmuration, 3 wave; the next takes 4). The page explains them and draws its gallery from shelf 5 of the beach's `animations` block, each chart's family at its 4, counting mirrors off the index. The charts are keel's, at `animations/murmuration-motif` and `animations/your-place-in-the-wave`: they wear their own palette, not `theme.css`, so they carry the write-box law in small in their BK kit (`keepDraft`, `dictate`). Since 18 Oct they carry the site's bar (`theme.js`: ◐, options, ＋card, go; their palette says `theme.css`'s tokens so its menus wear their colours; not sticky, the year bar below being so) and write through the beach's voice (`beachVoice`, loaded above their kit): through the button where the reader has it on the page, which holds a write until they unlock it, else their handle and the browser's own prompt for the key, kept on the device as `/walk` keeps a mirror's (`next-latch:<family>:<handle>`). The button's `say`, `keep` and `ask` are theirs (pscale-beach `button/frame.js`). The wave shares its link, and the picture only as an act of its own. |
| `lanes.html` | `/lanes/<hand>[+<hand>…]` (20 Oct 2026): a hand's own record on the beach — weft's pile `watch:weft`, anyone else's `history:<handle>` — read from its newest containers and drawn two ways, chosen under the view switch and kept per device (`lanes:view`). **fern** (the default): every lane sprouts at the top of a logarithmic spiral and the next to sprout pushes it one step clockwise, ten steps from the top round the right to the bottom at half the size, so older lanes coil inward; a lane's place is its rank by when it BEGAN and nothing else, so it stands where it stood last time (David: "something stable"); each turn a knot, what it made a leaf by kind; the frame is a constant, never fitted to the data; turning the curl back (wheel, or the dial) is one rotation and one enlargement about its eye, and reads further back in the record as it nears the oldest lane. **threads**: each day a strip of 24 hours, a thread per lane. Both share the reading: lane names from each entry's opening, turns beneath, what a turn made lifted from its words (repo + #n a pull request, its state from GitHub's public API; site paths HEAD-checked once; `proposals/…` a document; claude.ai links apps and sessions; a card's `5 = <family>-path n` a part), "yours to pick up" first, and a person's own now line above each day (`?days=<handle>`). Writes nothing. |
| `api/` | serverless functions (see below; genus-clock.js, the egg-one cron, is documented in its own header) |
| `premiere.html` | keel's reader for the reflexive experience form (18 Oct 2026), at `/premiere/<name>` (a rewrite in `vercel.json`; `?x=<name>` works too); `/premiere` with no name is the open list, which nobody holds: each maker names their designs in their own mirror `premieres:<handle>` ('<name> — what it is' at 1 to 9; the family is `spine:premieres`, the how at the form's 8.1), and the page gathers every list from the index, the earliest born first, showing each design whose two blocks stand (`function:<name>` 1 'mode: experience') at its own address, with its clock, how many have had their premiere and whose list named it; a name in two lists shows once, in the earlier (at most 27 lists and 54 names are read, a person's own never capped away). With `?h=<handle>`, which the go menu's 'premieres' among a person's places carries (theme.js, the `carry` shape), that person's stand first: the ones they have had (a mirror `<name>:<handle>`, read off the index) and the ones in their own list, then every premiere. The site's pages offer the bare list as 'premieres'. The form and Spot it's two blocks have been under weft's latch since 18 Oct 2026, moved from keel's at David's word, with their earlier text at `archive:function:reflexive-experience:2026-10-18` and `archive:function:spot-it:2026-10-18`. 'Share the link', in the room's actions, shares the design's own address (the phone's share sheet, else copied) and writes nothing: the sharer's answers are already in its room. One page plays any design from its two blocks, `spine:<name>` (the slides) and `function:<name>` (at 2, `clock: relative` or `clock: shared <instant>`), under the shared law at `function:reflexive-experience`; each person's answers stand in their own mirror `<name>:<handle>`, and a new design needs code only for a new kind of slide. Like keel's charts it wears its own palette, not `theme.css`, so it carries the write-box law in small in its BK kit (`keepDraft` and `dictate` on its three word boxes, never on the handle); like them it carries the site's bar (`theme.js`: ◐, options, ＋card, go; its palette says `theme.css`'s tokens; not sticky, so a slide keeps the screen; never in a frame), which is why a choose slide's rows in the room are `.cbar`, never `.bar`; and it writes through the beach's voice (`voice.js`, loaded above the kit as the charts load it). The entry is the handle box, for everyone (David, 2026-10-20). A device that knows no name finds one proposed, `starling-` and four digits no block on the beach is named for, so one tap starts the show (keel's ask for the Brighton room, FLIRT 2026); a name new to the beach, proposed or typed, is given its key on the page (three words and two digits), kept where the voice looks first (`next-latch:<name>:<handle>`), so nobody chooses a key or reuses a password as one, and the end of the show says the name and the key once (`made-key:<name>:<handle>` until said). `beachVoice.keep` founds the mirror before the show; each answer is then a `beachVoice.say`, and take-down a `beachVoice.drop`; the browser's own prompt asks only for the key of a name already on the beach. The beach button is the quiet second route beneath the box: 'or use the beach button' turns it on (off until a person does, never in a frame), and where it stands 'or start with the beach button' starts the show through it, which signs: `who` first, keel's way, then one `beachVoice.keep` at the end, or a `beachVoice.say` per slide on a shared clock. Starting from the box where the button stands puts it away for the visit (their setting unchanged), so the box signs. The room is read through `/api/mirrors` (below), one copy a crowd shares, with the person's own mirror read fresh beside it; where that read cannot be had the page reads the beach straight, as before. 'Not you?' forgets the device's name (`render:who`). Share image `animations/premiere.jpg`. |
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
- **`news.js`** (added 11 Oct 2026) — the news family's door (law `function:news`, re-founded on the clock that day; page `/news`, one item at `/news/<address>?s=<source>`). GET-only reads: `?rung=now|gathering|day|week|month|season|year[&at=<address>]` builds the wire live from the beach's own stamps (index born/touched, accumulator entries' position 3, `?tables`) and reads the keeper's folds from the bare `news` block; `?item=<address>` returns one item, the folds that named it, and its answers (each reader's `news:<handle>` mirror at the item's moment, floor 10). Edge-cached through `Vercel-CDN-Cache-Control` (10–120s) so a crowd from a shared link reads one copy, never the beach. `?keep=1` is the hourly keeper cron (vercel.json): founds `news` under `NEWS_KEEPER_SECRET`, seals closed days and climbs the ladder, re-folds today when the wire moved (never more than every 20 min); it chooses with `NEWS_ANTHROPIC_KEY` (its own key, for watching cost; absent = no folds, the page shows the wire unranked) on `NEWS_MODEL` (default `claude-opus-5-5`); `CRON_SECRET` guards it when set. Test rig only: `NEWS_HOUSE=probe:<name>` + `NEWS_FAKE_MODEL=1`. The QR code on item sheets is `vendor/qrcode.js` (qrcode-generator 1.4.4, MIT), loaded on first use.
- **`mirrors.js`** (added 20 Oct 2026) — GET-only `?family=<name>`: every mirror of a family (`<name>:<handle>`, off the index, the latest touched first, at most 600) with the family's bare fold `<name>`, as one JSON, for a premiere's room. Read from each phone, a room of n costs every phone n reads at every look and a crowd the beach n² (300 phones at the Brighton room, FLIRT 2026, would have been some 120,000 reads in ten minutes); here `Vercel-CDN-Cache-Control: max-age=15, stale-while-revalidate=45` lets a crowd share one read, and a warm instance re-reads only the mirrors whose `touched` stamp moved. Writes nothing; every answer is still written by its person straight to the beach.
- **`beach-relay.js`** (added 11 Jun 2026) — GET-only CORS relay for beach surfaces the browser can't reach directly; exists because the biome commons (`biome-commons-production.up.railway.app`) serves no CORS headers. Strictly scoped: https only, path must be exactly `/.well-known/pscale-beach` or `/.well-known/biome-beach`, no localhost/IP-literal hosts, redirects refused, 8s timeout. Used by filmstrip-3d for whole-beach rendering.

## scripts/

**Active — component inventory pipeline:**
- `ingest.js` — classify a dropped file → copy into `docs/components/{paddedId}-{slug}` → append `experiments/pscale-inventory.data.json` → rebuild → commit
- `classify.js` + `prompts/` — LLM classification step
- `build-inventory.js` — regenerates the marked regions of `experiments/pscale-inventory.html` and rebuilds `docs/components.zip`
- `watch-inbox.js` — foreground watcher on `~/xstream-inbox/`; drops feed `ingest.js`

**Active — the read copies:**
- `build-doc-copies.js` — renders `read/`'s copies of David's Claude Docs from their Markdown exports, one table for every doc; how to refresh one is in its header.

**Legacy — pre-migration beach ops. Read before touching:**
- `wipe-block.js` — still works: the live handler kept per-block HTTP DELETE (lock-gated), so `BEACH_URL=https://beach.happyseaurchin.com/.well-known/pscale-beach node scripts/wipe-block.js <name>` is valid. Only its **default** URL (the bare domain) is stale — it now 404s.- `bootstrap-beach-locks.js` — Phase B lock installer for the long-gone legacy `beach` block; inert without the deleted handler.

Beach maintenance tooling now lives in `pscale-beach/scripts/` (local-beach, pack-seed/reset/dump, repair-floor, migrate-keys, smoke tests). Note the gap: **no repo currently has a whole-beach wipe for the origin-scoped layout** — if that capability is needed, write it in `pscale-beach/scripts/`, not here.

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

## What NOT to do

1. **Don't reinstate anything at `/.well-known/pscale-beach`** — no handler, no rewrite, no static file. The bare-domain 404 is load-bearing: bsp-mcp's federation fallback (`bare 404 → beach.<host>`) routes callers to the real beach through it.
2. **Don't widen `beach-relay.js`** — no POST, no extra paths, no arbitrary hosts. It is a narrowly-scoped CORS shim, not an open proxy.
3. **Don't add write methods to `pscale-walk.js` or let `SUPABASE_ANON_KEY` reach the browser** — permissive RLS makes the anon key a write credential.
4. **Never rebuild a write box without keeping its draft** — call `keepDraft(textarea, key)` from `theme.js` on any box a tick or a re-render can replace (the clock ticks, the panel re-renders, the paragraph is gone mid-word); clear it when the write lands.
5. **Never ship a write box without dictation** — every write box carries it (David, 2026-09-07): a static `<textarea>` takes the `data-dictate` attribute and `theme.js` wires it on DOMContentLoaded; a box a page builds in script calls `window.dictate(el)` right where it calls `keepDraft`. The helper is browser-native (Web Speech API), inserts one glyph over the box's corner, never submits, and is absent where the API is (Firefox). The two pages that do not load `theme.js` — `render.html`, `what-this-is.html`, each with a palette and theme of its own — have no dictation until they are brought onto `theme.css`/`theme.js`, which is a deliberate migration, not a script tag. keel's two reflexive charts in `animations/` load `theme.js` for the bar but keep their own palette, and so carry draft-keeping and dictation in their own kit.
## The worktable — live project state (read this before trusting this file)

This project's working state lives ON the beach, not here:
`GET https://beach.happyseaurchin.com/.well-known/pscale-beach?block=project:happyseaurchin-site&pscale=-1`
— the disc is the dashboard. The method (shape, physics, wake procedure,
variation clause): `?block=method:worktable`. Sessions acting as **weft**
inherit via `~/Projects/weft` (its CLAUDE.md is the boot; the beach
operational lock is in weft's local memory — extract inside a sealed shell,
never echo it; if a secret ever leaks, tell David). Wake procedure
(`cook:weft:5`): read the disc → act at your face → graduate 2→1→3 → leave
the underscores true. Where this file and the block disagree, the block wins.
