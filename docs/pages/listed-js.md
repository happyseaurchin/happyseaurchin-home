# `listed.js`

the proposals on the beach read as one list (23 Nov 2026, lane arcade-credits.1, at David's word: "Go with the non-permission method; the listing on proposals page should go through the check and if it doesn't match, send message to pool of proposal"). Two kinds of block are read together: the keeper's list, `proposals`, under the shared project lock, and each maker's own, `proposed:<handle>`, a line `<name> — what it is · its page` at each digit under the maker's own key, which anyone keeps with nobody's permission (function:proposal 7 and 8). `beachListed.read(keeperBlock)` gives `{ keeper, makers }`: the keeper's lines as the list page has always parsed them, then every maker's line whose name is not already listed, the earliest list first (by its `born` stamp from `/api/mirrors?family=proposed`, the beach's index straight where that read fails), a proposal counted once where it is first listed. Each maker's line carries `by`, and `ok` with `fault`: its family is read (`spine:<name>`, `function:<name>`, and the room its law names) and checked by `beachListed.fault(name, spine, law, room)`.

**The check is the battery's own first faults**, ported case by case from `proposal_form.py` (pscale://proposal-test) and run in its order, so the page is never stricter than the battery (23 Nov 2026, thread:138.112, at David's word: "yes fix listed.js"):
- **The family.** A name of lower-case letters, digits and hyphens. The spine and the law standing. The spine's root not nested, with any title before ' — '. A first step at 1. The law's 1 'mode: document'.
- **The decisions**, read where the page reads them: each step's 8 down 1 (twelve steps at most), each side-room's 8, and the 8 of a room around the proposal at the root's 2 to 7 (function:proposal 3, 21 Nov 2026). A step's 8 that does not open DECIDE is a note, never a fault. A DECIDE line anywhere else is a fault (PLACED). Each decision then needs three things:
  - its last sentence before its words naming whom it waits on (WHO; any words, not 'Asked of' alone);
  - the words its maker wrote matching the words its buttons read: capitals and apostrophes, no digit, no gloss in brackets (WORDS);
  - any words closing its line keeping NOT YET (HOLD).
- **The room** its law names: the first `pool:<room>` any line of the law names, else `pool:<name>` (`beachListed.roomOf`). It must stand, and the law's 3 must name no other.
- **The phase.** Listed by its maker, a family is drawn as whatever kind its law names. A law's 7 that says something else is a fault.

The first fault found is given in words a maker can act on.

**Checked against the battery itself:**
- **Every family on the keeper's list**, read as if its maker alone had listed it: the page passed 34 before this and passes 57 now. It agrees with the battery on 63 of the 65. The two it passes and the battery fails are determinacy 4.8 and leros-phase-three 5.8: their decisions sit in a room at the root, which the law allows and the battery has yet to learn.
- **The record's rarer cases**, each tried on the battery's harbour-bell fixture (a digit in a word, the form's words without NOT YET, a gloss, 'DECIDE:', 'Phase:', the phase on another line, a room named elsewhere, a misplaced decision): all agree.

`beachListed.lineOf(name)` gives the first maker's line for a name, unchecked. A proposal's own page (`proposal.html`) uses it to count a maker's line as its listing where the keeper's list lacks the name. The module only reads. `/proposal` (the index and each person's sections) and `/corkboard` load it. A maker's proposal that passes joins the shelf after the keeper's lines, so it lands as the newest, marked '(listed by <handle>)', and on the board as a card newer than the reading until the board's next one. One that fails waits below the index's shelf with its fault. Makers' lists that take longer than three seconds are left for the next look, so neither page waits on them. weft's daily check (wake:weft 6.31) runs the whole battery over every maker's list and says what to mend in each failing proposal's own room, `pool:<name>`, once for each change of its faults. The battery's LISTED case reads the makers' lists too (bsp-mcp-server #639).

**Checked headless** with a maker's list stubbed (harbour-bell's fixture under four names):
- the two that pass showed on `/proposal` and the board, marked with their maker;
- the one with a stray decision waited with its fault;
- the maker-hosted crafted page got its button on the proposal's own page;
- the explainer its maker listed was drawn as an explainer, while one on no list was still refused;
- no write was sent, and nothing scrolled sideways at phone width.
