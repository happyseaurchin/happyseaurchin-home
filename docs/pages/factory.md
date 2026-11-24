# `factory.html`

The Factory (24 Nov 2026, lane money.1), at `/factory`: keel's register of who might water the garden, the investors at `outreach:keel` 5 (UK early-stage capital) and 6 (beyond the UK), placed at the bed each would feed, the soil, the middle or the flowers. David's word that day: 'ensure it is plugged into the beach well -- it should only be visible by you, keel, me (happyseaurchin)'. keel made the look the same day as a snapshot with every row written into the file; this page is that file (56,799 bytes, sha256 `345217f5…c84a21`) with its data taken out and nothing written in its place. Its rows are read from `outreach:keel` on every visit, where each one is sealed in `colour:outreach`, and are opened in the reader's browser through the beach's voice (`siteVoice`: `open`, `grey` and `wear`). So the page opens for the colour's holders and nobody else: at turn 2, happyseaurchin, keel and weft. The repo is public, so no row, name or door ever enters it, not even in the first commit.

**What it reads.** It reads the two blocks with plain `fetch`, which carries the pass:

- **`outreach:keel`**: the headings stand open at 5.1–5.7 and 6.1–6.4, and every row (5.11 onward) is a colour envelope.
- **`colour:outreach`**: its current turn and whose copies that turn keeps, said on the page as the beach has them.

**How a row opens.** The first sealed row is opened on its own, so the colour's key is unwrapped once and then worn by the voice; the other rows then open with it. A row the reader cannot open stays sealed and shows its grey line, which names its turn but never its contents.

- **No row opens.** The page shows the seal alone: the register's open shape (each heading and how many rows it holds) and one button, 'Open with your key'. The button takes the voice's `wear`: it asks for the handle where the device knows none, then the key, proved against `passport:<handle>` 9, and the device keeps the key wrapped.
- **The key goes on but still opens nothing.** The page says the colour keeps no copy for that handle, and names whose copies it does keep.
- **Some rows open.** It draws keel's whole page from the rows that opened, and lists the rest as sealed.

**How a line is split.** Each line splits on the labels `outreach:keel` 8.9 names: LEVEL, SECTOR, STANCE, CHURN, Door and Status, with the lead before them. From these it works out:

- the beds, sectors and stances, which keel's filters and band use;
- the status, from the first word of Status, and the watch flag, from '(watch)';
- the cheque, as the line's own words where it names one (a range, a ticket, 'up to'). A fund's size is not a cheque, so it is left out, where keel's snapshot took the first sum in the line.

**Look.** keel's palette, type and code are kept. The changes:

- The page loads `theme.js` but not `theme.css`, so it carries no site bar.
- keel's ◐ button is the site's own switch, because theme.js wires a page's `#btn-theme`. The band's seeds are repainted whenever the register turns.
- The tiles and rows answer the keyboard.
- Head: `noindex`. The page is in neither the sitemap nor the gallery.

**Plugged in.** Holders find the page through the go menu's colour tab: `lists:colour:outreach` 2 holds 'factory — The Factory', and theme.js shows that list as an 'outreach' tab, but only on a device that holds the colour. The go menu lives in the site's bar, so the tab appears on the site's other pages, not on this one, which has no bar.

**Checked:**

- The parser was run against keel's snapshot, each line rebuilt from its fields: no difference in any of the 49 rows (name, lead, the six labelled fields, beds, sectors, stances, status, watch), and the 13 headings sentence-cased from the beach's capitals match keel's.
- In headless Chromium against a local beach (pscale-beach `scripts/local-beach.mjs`), with a made-up `colour:outreach` of two turns, test passports and invented rows, using the page, theme.js and the beach's own voice and seal unchanged: 28 of 28 checks pass.
  - An unkeyed device sees no name.
  - A wrong key is refused in words.
  - The right key opens every row, and a reload opens them with no question.
  - The key is never kept in plain text.
  - A holder of turn 2 alone sees turn 1's row sealed by its turn.
  - A stranger is told the colour keeps no copy for them.
  - The ◐ turns the register.
  - The loom's go menu shows the outreach tab holding The Factory.
  - No sideways scroll on a phone, and no script error.
- Against the live beach, unkeyed: 49 rows sealed under the same 11 headings, and the holders read from the colour.
