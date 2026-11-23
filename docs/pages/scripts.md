# `scripts/`

inventory pipeline (active) + legacy beach ops (read the warnings)

## scripts/

**Active — component inventory pipeline:**
- `ingest.js` — classify a dropped file → copy into `docs/components/{paddedId}-{slug}` → append `experiments/pscale-inventory.data.json` → rebuild → commit
- `classify.js` + `prompts/` — LLM classification step
- `build-inventory.js` — regenerates the marked regions of `experiments/pscale-inventory.html` and rebuilds `docs/components.zip`
- `watch-inbox.js` — foreground watcher on `~/xstream-inbox/`; drops feed `ingest.js`

**Active — the text door's check:**
- `check-text.mjs` — `api/text.js` offline, the beach mocked: a family's spine walked down its 1 with its side-rooms, points and state, a title's capitals as its own words write them, the shared reading above everyone's answers, a sealed line named and never shown, a reader's run nested beneath a place the spine leaves open, a file named where it stands, its law and its room newest first, the download, one address per family, a frame and a game by their kinds, and a beach that cannot be read; and since 23 Nov 2026 (lane share-string.1) `/proposal/<name>` served through it, the page with its own preview: a listed proposal titled with its crafted page's own title, its line the list's, its picture its crafted page's still, a page on another site never read, anything that is no proposal and a beach that cannot be read still served the page with its plain preview; and its knots as a picture, a PNG of 1200 by 630 read back pixel by pixel, a GO a green knot, a sealed answer a grey one, a family with no steps none, and with no step to hang them on, a proposal's title and line alone. `node scripts/check-text.mjs`.

**Active — the web's check:**
- `check-sitemap.mjs` — `api/sitemap.js` offline, every site mocked as global fetch and string.js's name lookup swapped: one file a read (robots.txt, its one map, then the front page, in turn and nothing else), an index's maps as places none of them read, a robots.txt naming several maps, a map gone into by `?map=` (that one file alone; a gzipped one opened; a map that is itself an index; one that lists nothing here; one that does not answer), `?map=` refused unread off the site's own name, without a map's address, or at a private address, a map of plain lines, the quick way's links (its `<base>`, its www twin's, fragments, mailto and javascript dropped, never its words), a web page where a map would be let go at once, a big map let go once it has named enough, the 500 cap, a crowd past nine nested nine to a node, a run of folders read as one rung, a <loc> in CDATA, a site that moved to its www twin, may it be framed read from its front page's headers (twenty cases of X-Frame-Options and frame-ancestors, and a front page that does not answer), a private address and a redirect to one refused, GET only. `node scripts/check-sitemap.mjs`.

**Active — the vault's check:**
- `check-vault.mjs` — `vault.js` offline, the beach mocked: two keys (the passport's latches, a vault key of its own seals and is never sent), a one-phrase vault re-sealed, the router's own vectors both ways (bsp-mcp `scripts/fixtures/gray-vectors.json`, from a checkout beside this one, else GitHub), and where a vault stands. `node scripts/check-vault.mjs`; `SEAL_JS=` names the seal to check against.

**Active — the read copies:**
- `build-doc-copies.js` — renders `read/`'s copies of David's Claude Docs from their Markdown exports, one table for every doc; how to refresh one is in its header.

**Active — the plug service (`ways:plug` 8):**
- `plug-game.mjs` — takes a game handed in at `files:<game>` whole, checks its sha256 and every check of `ways:plug` 5 (one file, the beach's two tags, the room plug third for a game played live, and nothing else from outside, the engine run alone in a vm with no page, clock or chance, two years of days, a good player inside thirty seconds, no input and the move on every step, kept and changed runs, the family on the beach), and with `--plug --by <handle>` writes `games/<game>/` and its line in `games/list.json`; nothing is written unless every check passes and the game is paid for (the maker's ticket, the shelf's own fee line, or `--free`; `--by` alone reports the ticket). `--file <page> --no-beach` checks a draft (the kit's stub passes all thirteen).
- `plug-ticket.mjs` — the fee's one reading: a maker's `arcade-plug` ticket grain read on the beach, and the shelf's binding of each ticket to one game. `node scripts/check-plug-ticket.mjs` checks it offline (the beach mocked: a paid ticket, run out, refunded, another product's, no payment named, not the issuer's, none; a ticket spent on another game).
- `plug-host.mjs` — how a game is hosted, shared by the two: the bridge line added to its head, and its frame page, which takes an image for the large link card (The Chain's still, 20 Nov 2026).
- `smoke-games.mjs` — plays a hosted game (or a page, `--file`) in headless Chromium with this repo served as Vercel serves it and the sandbox header read from `vercel.json`: its own origin, the site's name and key unreadable inside, its own storage kept through the frame across a reload, the beach reachable and nowhere else, a minute of play with nothing thrown, the room plug loaded where a game is played live; a game whose engine offers no `level` and `bot` (Forage) skips the newcomer check, which plays a run with them. Reads the beach and writes nothing to it, every write answered in the test (a live game's slot in its room's liquid among them); needs playwright (global).

**Legacy — pre-migration beach ops. Read before touching:**
- `wipe-block.js` — still works: the live handler kept per-block HTTP DELETE (lock-gated), so `BEACH_URL=https://beach.happyseaurchin.com/.well-known/pscale-beach node scripts/wipe-block.js <name>` is valid. Only its **default** URL (the bare domain) is stale — it now 404s.- `bootstrap-beach-locks.js` — Phase B lock installer for the long-gone legacy `beach` block; inert without the deleted handler.

Beach maintenance tooling now lives in `pscale-beach/scripts/` (local-beach, pack-seed/reset/dump, repair-floor, migrate-keys, smoke tests). Note the gap: **no repo currently has a whole-beach wipe for the origin-scoped layout** — if that capability is needed, write it in `pscale-beach/scripts/`, not here.
