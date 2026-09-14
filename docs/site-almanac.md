# Site almanac — every card and link on the AI side

Compiled 2026-06-12. Every destination linked from the site's nav pages
(`/virtual-ai-agents`, `/experiments`, `/mindflow`, `/packages`, `/real-organic-human`),
verified by HTTP check on the day. Claude artifacts verified by fetching their real titles.

**Revised 2026-09-14** — §4 rewritten around the mirror, §9 re-checked where the
claim was a local file fact, §11 added. The §4 rows are **not** re-verified by
HTTP: the revising session had no outbound access to those hosts, so they record
David's ruling, not a live check. Everything outside §4 and the marked §9 items
still rests on the 2026-06-12 sweep and is three months stale — read a bare `OK`
as "OK as of 2026-06-12".

**Type key** — `experience` (graphically interesting / playable / something happens),
`tool` (you operate it on your own data), `explainer`, `format` (downloadable JSON / repo),
`platform` (external product site), `endpoint` (machine-facing, not for humans),
`archive` (superseded version).

**Era key** — `supabase · _` → `beach · _ 1-9` → `biome · 0-9`.

---

## 1 · Live experiences (the strongest cards on the site)

| what | url | type | era | status | linked from |
|---|---|---|---|---|---|
| Filmstrip 3D — context window as landscape | `/mindflow/filmstrip-3d/` | experience | both worlds | OK | mindflow |
| — whole biome beach in 3D | `/mindflow/filmstrip-3d/?beach=biome` | experience | biome · 0-9 | OK | mindflow bookmark |
| — legacy beach in 3D | `/mindflow/filmstrip-3d/?beach=home` | experience | beach · _ 1-9 | OK | mindflow bookmark |
| — Thornkeep shelf in 3D | `/mindflow/filmstrip-3d/?shelf=thornkeep` | experience | beach · _ 1-9 | OK | mindflow bookmark |
| — a strip, thinking (demo autoplay) | `/mindflow/filmstrip-3d/?source=data/demo-strip.json&play=1` | experience | biome | OK | mindflow bookmark |
| pscale inventory — 3D architecture diagram | `/experiments/pscale-inventory` | experience | all eras | OK | experiments, virtual-ai-agents |
| pscale cone v5 — BSP selection geometry | claude.ai artifact `7c00e04d…` | experience | beach (bsp) | OK — title verified | experiments |
| Thornwall Ruins — multiplayer dungeon RPG | claude.ai artifact `1c9a150f…` | experience | — | OK — title verified | virtual-ai-agents |
| onen RPG — DM, players, campaigns | https://onen.ai | experience | pre-pscale | OK | virtual-ai-agents, experiments |
| xstream play — narrative coordination game | https://play.onen.ai | experience | — | OK | virtual-ai-agents, experiments |
| idiothuman — talk to Marvin & Deep Thought | https://idiothuman.com | experience | — | OK | virtual-ai-agents, experiments |
| mindflow basic — speech word cloud | `/mindflow/basic/` | experience | — | OK | mindflow, experiments |
| mindflow BYOK — LLM concepts from speech | `/mindflow/byok/` | experience (key) | — | OK | mindflow, experiments |
| spore — no-code self-building agent | https://www.hermitcrab.me/spore | experience | — | OK | experiments |
| reflect — watch the agent from outside | https://www.hermitcrab.me/reflect | experience | — | OK | experiments |
| XQ interactives — triangle centres / interpretive matrix / psycho-social deck | `/experiments/…` ×3 | experience | XQ | OK | experiments |
| Farey trio — interval-depth / farey-tessellation / mandelbrot-bulbs | `/experiments/…` ×3 | experience | XQ / pscale maths | OK | experiments |
| perceptual emergence — video | davidmpinto.substack.com/p/emergence | explainer/experience | supabase era | OK | virtual-ai-agents |

## 2 · Tools

| what | url | type | era | status | linked from |
|---|---|---|---|---|---|
| editor — `_`-form pscale JSON | `/mindflow/editor/` | tool | beach · _ 1-9 | OK | mindflow, packages |
| biome editor — 0-9 blocks | `/mindflow/biome-editor/` | tool | biome · 0-9 | OK | mindflow (old `/zand-editor` 301s here) |
| filmstrip — kernel API logs (C/B/A loops) | `/mindflow/filmstrip/` | tool | beach · _ 1-9 | OK | mindflow, virtual-ai-agents, packages |
| biome filmstrip — agent wakes (γ, edits, currents, faces) | `/mindflow/biome-filmstrip/` | tool | biome · 0-9 | OK | mindflow (old `/zand-filmstrip` 301s here) |
| explorer — speech → pscale block | `/mindflow/explorer/` | tool (key) | beach · _ | OK | mindflow, experiments, **mislabelled on virtual-ai-agents as "pscale JSON editor"** |
| key vault — BYOK httpOnly cookie | inline on hubs | tool | — | OK | virtual-ai-agents, experiments |

## 3 · Agents — ⚠ the gap

Per David (2026-06-12): **the primary entry to agents is the agents on the beach —
interact with them, create a shell.** No card anywhere on the site points there today.
The filmstrip-3d beach views are *spectator* views; the cards below are adjacent, not entries.

| what | url | type | status | note |
|---|---|---|---|---|
| seed — point your LLM at it | https://www.hermitcrab.me/reflect | experience | OK | **href identical to "reflect" card — one of them is wrong** |
| reflexive-spark — the aha! re-orientation | github.com/happyseaurchin/reflexive-spark | repo | OK | component 07 + 69 in inventory |
| swarm coordinates — coordinates for agents | xstream.machus.ai/nexus.html | explainer? | OK | per David: **belongs with agents**, currently filed under pscale |
| *(missing)* beach agents — interact, create shell | — | — | — | **the primary entry; nothing to link yet on the site** |

## 4 · mirror — the portal

Per David (2026-09-12): **the main portal is mirror.onen.ai**. xstream.onen.ai is
no longer in use; it stays reachable as the previous version, whose mechanics and
UI — the construction-button among them — have not been ported and are still worth
mining. machus.ai is unchanged: the artifacts and essays host, and the only
xstream domain anything on this site still links to. SAND is **the evolutionary
protocol**, not a feature card.

Room links have one spelling (per #220, 2026-09-12): `?pool=<name>` opens a **room**
— the voices, the welcome card, the box that commits. `?block=<name>` addresses the
same block through the **parked-block door**: the raw tree, no room, no voices, no
box. Writing `?block=pool:<name>` where a room was meant is the mistake that
spelling exists to prevent.

| what | url | type | status | linked from |
|---|---|---|---|---|
| mirror — THE portal | https://mirror.onen.ai | platform | per David; not re-checked | /experiences, /welcome, /rpg, /play, /walk, /page, /minimal, /pscale-ecology |
| the welcome room | https://mirror.onen.ai/?pool=welcome | experience | per David; not re-checked | /experiences, /welcome, /pscale-ecology#portals |
| xstream app — **previous version** | https://xstream.onen.ai | archive/platform | superseded 2026-09-12; nothing on this site links to it | — |
| xstream (artifacts/essays host) | https://xstream.machus.ai | platform | OK 2026-06-12 | /virtual-ai-agents |
| artifact gallery | xstream.machus.ai/experiments | archive/gallery | OK 2026-06-12 | /experiments |
| SAND — evolutionary protocol (SQ trust routing) | xstream.machus.ai/ecosquared | explainer/protocol | OK 2026-06-12 | components 20, 39 |
| the address of meaning — pscale essay | xstream.machus.ai/the-address-of-meaning | explainer | OK 2026-06-12 | /pscale, /virtual-ai-agents, /pscale-ecology |

**The mirror is one of three portals**, and the almanac should stop treating it as
a lone platform card. The three differ by *who is present*: your own LLM app over
bsp-mcp (reads at depth, walks a family, holds a long round), the mirror (live, in
company, the only one that shows who else is here), and **o-pages** — an ordinary
web page with no instance at all, which is what the whole sundial cluster is made
of. `/experiences` sets the three out for a human; `/pscale-ecology#portals` is the
technical walk-through; `orientation:portals` on the beach is the block that
defines them.

## 5 · RPG

Per David (2026-06-12): **the main entrance is the RPG on the beach via bsp — in
testing now (latest version), no public URL yet.** Reserve the lead slot for it.

| what | url | type | status |
|---|---|---|---|
| *(pending)* RPG on the beach via bsp | — | experience | in testing 2026-06 |
| onen RPG — the original | https://onen.ai | experience | OK |
| Thornwall Ruins | claude.ai artifact `1c9a150f…` | experience | OK |
| xstream play | https://play.onen.ai | experience | OK |
| Thornkeep shelf (spectator) | `/mindflow/filmstrip-3d/?shelf=thornkeep` | experience | OK |

## 6 · pscale — explainers, formats, substrate

| what | url | type | era | status |
|---|---|---|---|---|
| the address of meaning | xstream.machus.ai/the-address-of-meaning | explainer | — | OK |
| pscale slides | claude.ai artifact `808d6cc4…` | explainer | — | OK — title verified |
| starstone JSON | `/assets/pscale-starstone.json` | format | supabase/beach · _ | OK |
| systemic kernel JSON | `/assets/systemic-kernel.json` | format | _ | OK |
| pscale repo | github.com/pscale-commons/pscale | format/repo | — | OK |
| bsp-mcp-server | github.com/pscale-commons/bsp-mcp-server | repo | beach | OK (not linked from any page today) |
| federated beach | beach.happyseaurchin.com/.well-known/pscale-beach | endpoint | beach · _ 1-9 | OK (JSON) |
| biome commons | biome-commons-production.up.railway.app/.well-known/biome-beach | endpoint | biome · 0-9 | OK (JSON) |
| pscale-mcp-server (railway) | …up.railway.app/mcp/v2 | endpoint | supabase · _ | 400 on GET — **MCP POST endpoint, hostile as a human link** (linked from packages/pscale-tools) |
| packages — reading bundles | `/packages/` | explainer | — | OK (1 package) |

## 7 · Visual archive (superseded versions)

| what | url | status |
|---|---|---|
| pscale cone v4 | artifact `721d4c53…` | OK — **still billed as the cone on virtual-ai-agents** |
| pscale cone v3 | artifact `5aacfc14…` | OK |
| dual cones | artifact `eb27fbb9…` | OK |
| BSP visualiser 2 | artifact `bc20dff8…` | OK |

## 8 · Other platforms & media

| what | url | status |
|---|---|---|
| hermitcrab — persistent LLM shell | https://hermitcrab.me | OK |
| fulcrum | https://crumful.com | OK |
| XQ showcase | https://xq.crumful.com/ | OK |
| substack | https://happyseaurchin.substack.com | **404 — broken** (davidmpinto.substack.com works) |
| youtube | https://www.youtube.com/@happyseaurchin | **404 — broken handle** |
| discord invite | discord.gg/UZWaDyFsSg | OK |
| organic side (fulcrum books ×3, lulu, openbusinesspractices, abcstate, sqale.co) | various | all OK |

## 9 · Defect list (fix regardless of reorg)

_Re-checked 2026-09-14, but only where the claim is a local file fact. Items 1 and
2 are external URLs the revising session could not reach — they stand unverified._

1. **substack link 404** — happyseaurchin.substack.com; working candidate: davidmpinto.substack.com (confirm preferred).
2. **youtube link 404** — @happyseaurchin handle doesn't resolve; correct handle needed.
3. ~~**packages/pscale-tools.html → `/docs/components/56-mindflow-editor.md` 404**~~ — **fixed**; the link and the file are both `.html` (2026-09-14).
4. **"seed" card href = "reflect" card href** on /experiments — still open: `hermitcrab.me/reflect` appears twice, `hermitcrab.me/spore` once (2026-09-14).
5. ~~**"pscale JSON editor" card → /mindflow/explorer/** on /virtual-ai-agents~~ — **fixed**; it points at `/mindflow/editor/` (2026-09-14).
6. ~~**"pscale cone" card on /virtual-ai-agents → v4**~~ — **fixed**; the card is cone v5 (2026-09-14).
7. **/experiments mindflow section stale** — still open: it lists only basic, byok and explorer; editor, biome-editor, filmstrip, biome-filmstrip and filmstrip-3d are all absent (2026-09-14).
8. ~~**/experiments footer says 2025.**~~ — **fixed** (2026-09-14).
9. **Inventory numbering collision** — both `70-bsp-unified-mcp.md` and `70-xstream-native-paywall.md` exist.

## 10 · Corrections from David (2026-06-12) — constraints for the rebuild

_Kept verbatim as the record of what was ruled that day. Where §11 differs, §11 wins._

- Hub principle: **open to pages that are graphically interesting, useful tools, or experiences** — not taxonomy.
- **agents** = the live agents on the beach (interact, create shell). Primary entry currently missing from the site.
- **xstream** primary = **xstream.onen.ai**; machus.ai is the artifacts/essays host.
- **SAND** = the evolutionary protocol; **swarm coordinates** = agents material.
- **rpg** lead = the bsp/beach RPG now in testing.
- **biome** = "**next**", placed low on the hub (above "elsewhere"), not "now" at the top.

---

## 11 · Corrections from David (2026-09-12) — superseding §10 where they differ

- **The portal is mirror.onen.ai**, not xstream.onen.ai. §10's "xstream primary =
  xstream.onen.ai" no longer holds. machus.ai is still the artifacts and essays
  host, and is the only xstream domain this site links to. The xstream pages stay
  up as the previous version — their mechanics and UI (the construction-button
  among them) have not been carried across.
- **The ecology reads as three levels**, at `/pscale-ecology`: *physics* (how one
  pscale block operates — the block, bsp(), the beach), *chemistry* (the meaning
  that appears between blocks — the mirror, the RPG, now-catalyst), *biology* (the
  loops that give rise to agents — agents, the biome). The organising claim
  underneath: **semantic flow, not data flow** — nothing semantic moves; walking a
  block compiles meaning in the reader, and that meaning selects the next step.
- **now-catalyst** is a live part of the site, not a plan: self-organising project
  management from two temporal poles — a person's own now, and a project every
  hand walks toward — built on the sundial pages (`/now`, `/next`, `/walk`,
  `/recency`, `/field`, `/across`, `/morning`, `/found`, `/here`). Section 1 should
  carry these as live experiences at the next full sweep.
- **Three portals** replace the old "try it" framing: llm-app, mirror, o-pages.
  See §4.
