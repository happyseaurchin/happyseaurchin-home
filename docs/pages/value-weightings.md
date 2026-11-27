# `value-weightings.html`

Value Weightings (27 November 2026, lane tidy.2), at `/value-weightings`: the crafted page of the value-weightings proposal, which its law names at 6 (`/proposal/value-weightings` is its standard view, drawn from its blocks, and `/text/value-weightings` the family as text). The family is `spine:value-weightings`, `function:value-weightings` ('phase: proposal — after shore'), its scripts `files:value-weightings`, its room Shore's, `pool:shore`, and each answerer's mirror, `value-weightings:<handle>`. It proposes how Shore's money is shared with no credits: each sum waits in the pot of the scope its giver names, the time people spend with each thing (experience points, four layers) is weighed by the values of ecosquared, and a value is worked out only when someone asks to take money out.

David, the same day: 'So where are we with value-weightings -- is it in proposals, is there a snazzy page -- and ensure it is actually functional, not just waffle. It need to provide explanation/diagrams that are actually useful to help others (and perhaps me) to make appropriate decisions. I can't answer the first step even though it is waiting for me. So can you correct the structure while creating the snazzy page please?' The spine was restructured first, on the beach (the one of 25 November kept at `archive:spine:value-weightings:2026-11-27`). Its first step now asks the one question the build waits on, GO at 1.8. Its steps follow a pound in and out. Each choice carries its numbers and weft's recommendation: WITHIN or ACROSS at 1.118, CLAIM or WEIGHT at 1.1118, each word's meaning at the law's 2.

**Look.** A hydraulic calculator drawn on blueprint:
- money is water held in a glass tank for each scope;
- the weightings are the bores of the pipes from each tank to each person;
- nothing flows until someone opens their tap.

The rest of the look:
- **The band** stays in the blueprint's night (a grid over deep navy) in either theme; the paper turns with the reader's.
- **Type and colour.** Saira Stencil One for display, Barlow for text, IBM Plex Mono for sums. The five invented people each keep one colour, checked with the dataviz validator for colour-blind separation in both themes: mara blue, ana orange, ben teal, cai violet, dee amber.
- **The drawing, `#plantSvg`**, is built and moved by script from the model, so every number in it is the worked case's. Four tanks fill (IN lines appear on the tape beneath); pipes appear as wide as each person's share of each tank; a week on, the bores move with no money moving; mara opens her tap; her £1,657.07 runs out of every tank into her cup (the PAID line on the tape); and her pipes close, which is the recommended WEIGHT. It plays once when seen, with a replay.
- **Reduced motion, `?still` and `?share`** draw the end state still. `?share` is the 1200 by 630 still at `/animations/value-weightings.jpg`, shot headless (Chrome, `--virtual-time-budget`), with the corner pills hidden.

**The words.** The page carries its own copy of the spine and repaints it live:
- titles and bodies through `data-sp`, a family word (WITHIN, ACROSS, CLAIM, WEIGHT) kept in capitals in a title;
- each card's question, recommendation and whom it waits on through `data-dec` (`q`, `rec`, `who`), split by `decisionParts`, the words its buttons read taken off the end as `listed.js` reads them;
- the meaning of each family word from the law's 2, 'WORD (what it does)', as `proposal.html` reads it.

There is an 'In short' line above each step, a six-term glossary and four moves ('In plain words'), and the addresses behind the # switch.

**The model** is `VW`, the script at `files:value-weightings` 2.1 (`value-weightings-2.mjs`, sha256 bf4691ec…) written for the browser. It holds the worked case, the weightings both ways (`byLayer`, `lineShare`, `surfaceShare`, `potShares`) and a draw both ways (`draw` with 'claim' or 'weight'). WEIGHT is exact: at a draw every pot is first read into its things' layers, the drawer's part taken from each, and their weight in each layer scaled by what they left in, so nobody else's value moves at that moment. It reads and writes nothing.

**The instruments**, one a step, none writing:
- **Credits or weightings.** One £5 ticket at three moments (lands, a week on, mara takes hers out), as balances someone holds (solid) or readings worked out when asked (striped).
- **The till.** Pay £5, £20 or £100 into reef-run's makers, reef-run, anything or kelp beds 2027. Tanks fill, and a receipt shows the ledger's line and what the sum reads for each person now; a pledge moves the rate k.
- **The bores.** A thing's four layers, each split among its people. The law's share is on the left, the drawn share on the right. WITHIN or ACROSS, with sliders for ben's extra beats and dee's SQ, and each person's share and value at exit, set against WITHIN.
- **The tap.** The spine's four moments (1.1114), CLAIM or WEIGHT, all or half, as five gauges that go below the line, hatched, when a value falls below nothing. The verdict says whether everyone could be paid, or how much is short.
- **The rate.** Three objectives' median rating and pledges on sliders, the line through nothing as k, and the past things read in money.
- **The build.** The pieces in order, tap to open, and the check: this page's calculator against the spine's numbers at exit, to the penny.

In step 3, a fold, 'On the beach now', reads any family's four columns from `/api/xp` and shows how £10 for it would be shared now. SQ is counted as 1 there, and layers the law names nobody for go to the commons.

**The cards and the room.**
- **Three cards**, at 1.8 (GO, NOT YET, CHANGE), 1.118 (WITHIN, ACROSS, NOT YET) and 1.1118 (CLAIM, WEIGHT, NOT YET). Each says its word and line through `beachVoice.say` into `value-weightings:<handle>`.
- **Each card shows** the recommendation, marks the recommended word with a star, and shows every word's meaning.
- **The reader's own answer** starts the box (rule 6). Every box keeps its draft and takes dictation.
- **Answers are read** through `/api/mirrors?family=value-weightings`, with the beach's index read straight where that fails. Tallies stand on the tiles and step heads, and the shared reading from the bare fold.
- **The threads** are `[data-threads="value-weightings"]` (thread:149).
- **The room** is Shore's, its last five lines from `pool:shore`, with a line to answer through one's own Claude and one to fold the answers.

**The preview.** The same page with `window.__PREVIEW__` and `window.__SNAP__` inline (the spine, the law, the room's last lines, sword-fight's columns) stands as a claude.ai artifact. It reads nothing and cannot write: its cards say so.

**Checked**:
- headless and in the browser pane at 1280 light and 390 dark, with no sideways scroll and no script error;
- the band mid-run and still;
- every instrument against the spine, to the penny: the till's £5 and £100, the bores both ways, the tap's eight states CLAIM and WEIGHT, and the check;
- the family through `listed.js`'s check (it passes, three decisions).
