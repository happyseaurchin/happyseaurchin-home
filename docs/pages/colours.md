# `colours.html`

what a reader's key opens (27 Nov 2026, lane go-menu.1), at `/colours`: every colour on the beach, lit where the key this device keeps opens a copy, grey where not; who holds each, who founded it, its turns, who left, and where its sealed lines are read. David's words: 'I wanted a page, so I could jump to a page and see what *I* am currently privy to', then 'Yes, build it'. It takes the place of the go menu's colour tabs, which theme.js no longer draws (`theme-js-colour-tabs.md`).

**What it reads.** Everything is read live with plain `fetch` (which carries the pass), and nothing is kept:

- **The beach's index.** Every block named `colour:<name>` is a colour, so there is no registry and no sweep.
- **Each colour block.** Its root line is its own words. Its turns stand at the root, each with a ring of copies, one per holder, each naming its holder, and the turn's public half. The turns are found as the beach's seal finds them (pscale-beach `button/seal.js` `turns`), so a colour past its ninth turn, its older turns supernested under the root's underscore, still reads in order.
- **`lists:colour:<name>` 2, where the index names one.** These are the places where the colour's sealed lines are read, one rung each down the chain: '<address> — <what of the colour is read there>', the lighthouse's shape. An address on this site or a full https:// one becomes a link, and the words up to the first colon are its text.
- **Which colours open for this reader** is asked of the beach's voice (`siteVoice().colours({ name })`), with the key this device keeps for them, wrapped. A device holding no key for the name asks nothing and opens nothing.

**Who is reading.** `?as=<handle>` reads as a test's throwaway handle, as `/loom?as=` does. Otherwise the reader is the name a key was just put on under, else the name this device signs with (`render:who`, the voice's `name`).

**A colour's card.** Each card is in one of four states:

- **opens for you** — the current turn's copy opens with this device's key. The card is lit in the colour's own hue.
- **yours · not open here yet** — the current turn keeps a copy for the reader, but this device has not opened it. The card is outlined in its hue.
- **yours until turn N** — the reader held an earlier turn and was left out of the turn named. The card is grey.
- **not yours** (or **held by others**, while the page knows no reader) — grey.

Every card gives:

- the colour's words, without the 'COLOUR — <name>:' they open with;
- who holds it now, the reader marked;
- who founded it and when: the name its founding line gives ('Founded … by <handle>'), taken only if that name held a turn, else 'its words do not say by whom', and the first turn's date;
- its key: the current turn and since when;
- who left, and at which turn;
- where it is read;
- its turns, folded: each turn's moment, its holders, and who joined or left.

Yours come first, lit before outlined, then the rest.

**The key.** 'Open with your key' puts the reader's key on through the voice's `wear`. Where the device knows no name it asks the handle first. The key is proved against the halves at `passport:<handle>` 9 and kept wrapped, as every key is, and the page reads which colours open again. 'not you?' asks for another handle and does the same. Nothing else is written. The voice publishes the halves at the passport's 9 only where none stand, as on every page that opens a colour.

**What stays open.** Which colours exist, who holds each and when each turned are open on the beach by design. Only the words sealed in a colour are private. So the page shows a stranger nothing they could not read on the beach, and lights a colour only where the reader's own key opens it.

**Look.** `theme.css` and the site's bar: `siteDoors({ handle: null, here: 'colours', site: true })`, as the loom does. Each card's hue is `--fam-h`, a steady number made from the colour's name, at theme.css's family lightness, so both registers read and no colour literal enters the page. Head: `noindex`.

**Plugged in.** 'colours' is in the catalogue a hand chooses its places from (theme.js `WORK`, shape `bare`), off until chosen (`DOORS_OFF`), as the corkboard and the Factory are. David's list, `lists:happyseaurchin` 2, names it fifteenth, after 'factory', written through his own connector at his word (27 Nov 2026, beach-log 155). The same day `lists:colour:admin` 2 came to name the loom's admin band, `lists:colour:outreach` 2 the Factory, and `lists:colour:builders` 2 none, each list's line saying why.

**Checked on 27 Nov 2026.**

- **Against a local beach.** This ran the real handler (pscale-beach `scripts/local-beach.mjs`) on a scratch folder. Throwaway passports were made and five colours were founded and turned through bsp-mcp's own keeper's door, as `smoke:colour` does. The page was served with the beach's own voice and seal from pscale-beach main, theme.js unchanged.
  - With no name known, it asks the handle, then the key. Three colours lit; the one the reader left showed 'yours until turn 2'; the one never theirs showed 'not yours'.
  - A holder whose key the device lacks (`?as=ann`) got outlined cards and the key a tap away.
  - A reload opened the colours with no question asked.
  - It reads in the dark register at 375px with no sideways scroll.
- **Against the live beach, with no key.** It drew all five colours with their holders, founders, turns and the one who left (happyseaurchin-factory, at outreach's turn 4), and the re-worded places.
- **The go menu.** On `/factory` it draws the site's tab and no colour tab.
