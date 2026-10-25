# code as blocks — an experiment

*25 October 2026 · weft (Claude Code, a cloud session) · at David's question:
can code be taken apart into pscale blocks, so that a page or a program is a
semantic molecule — blocks in company, bonded by address, read under a law?*

## What was taken apart

**HTML → four blocks on one address space** (`html_blocks.py`)

| block | holds |
|---|---|
| `form` | the element tree; each node's line is its tag, attributes in the node's hidden directory (digits inside the underscore); `…` marks a supernest |
| `content` | the words, at the same addresses |
| `style` | the CSS, at the address of its `<style>` |
| `script` | the JS, at the address of its `<script>` |

None points at another; they agree on the address. The law that bonds them is
`function-html.json`, written as a pscale block in prose.

**Python → two blocks** (`py_blocks.py`): `form` (each node's kind) and `content`
(every name and literal), with the law `function-python.json` generated from
Python's own grammar (`ast._field_types`): field *i* of a kind at digit *i*.
No kind has more than seven fields, so 8 and 9 stay free everywhere.

## Results

| test | result |
|---|---|
| every page of happyseaurchin.com (134: top level, `animations/`, `read/`) → four blocks → back | **134/134** identical DOM, parsed by html5lib (the WHATWG algorithm a browser runs), exact and whitespace-clean modes |
| eight pages rendered in Chromium, original vs reassembled | **8/8 pixel-identical** (CSS transitions frozen) |
| a fresh agent given only the law + the four blocks of `touch.html`, no code | rebuilt the page by hand, **DOM-identical**; ~5 min, ~177k tokens; named four soft spots in the law, folded back in |
| a fresh agent given only the law + `connect.html`, asked to take it apart, no code | its blocks, put back by the code, give the **same page**; and they are **identical to the code's own blocks at every position** (123 form, 72 content, 1 style, 2 script) — a mind reading the law and a program implementing it converge |
| the whole Python 3.13 standard library (537 modules) + the pscale walkers → two blocks → back | **537/537** identical syntax trees (`ast.dump`); blocks are 3.2× the source; comments are lost (the AST does not carry them) |
| a hostile form block (script, `onerror`, `javascript:` link, iframe, form, `url()` beacon) through `safe_join.py`, which knows only the law's vocabulary | **nothing harmful emitted** |
| one content block (`beach-security`, read by its outline) through three ~80-character form blocks keyed by depth | document, cards, slides — `dialects/` |

What the site is made of, by bytes: **words 6.7% · CSS 17% · JS 65% · markup ~11%**.
The generic renderers (`proposal`, `walk`, `page`, `premiere`) are 0.1–0.7% words:
their content already lives on the beach, and their JS is the form.

## Run it

From this folder (`experiments/code-as-blocks/` in the site repo); paths resolve from each script's own place.

```
pip install html5lib
python3 run_all.py                                   # every page of the site → four blocks → back; writes all_pages.json
python3 html_blocks.py check ../../touch.html        # one page, both modes
python3 html_blocks.py split ../../touch.html out/touch && python3 html_blocks.py join out/touch > /tmp/touch.html
python3 reassemble.py index.html arrive.html && node pixels.js index.html arrive.html   # the pixel check (Playwright)
python3 verify_agents.py                             # the two agents' outputs against the original pages
python3 py_blocks.py check ../../pscale/starstone/bsp2-star.py   # a Python round trip
python3 py_blocks.py law > function-python.json      # the language, as a block
python3 history.py                                   # every page edit in the repo's history (needs it whole: git fetch --unshallow)
npm install acorn@8.14.0 && python3 history_js.py    # the same, with copy inside JS told from JS code
cd assembler && node assemble.js spine.json form-proposal.json look-Phenomemental.json /tmp/leros.html
```

The assembler's family snapshots (`spine.json`, `law.json`, `mirrors.json`, and the `y-ray/` and `threads/`
folders) were read from the beach on 25 October; fresh ones come from
`https://beach.happyseaurchin.com/.well-known/pscale-beach?block=spine:<name>` and
`https://happyseaurchin.com/api/mirrors?family=<name>`.

Matthew's pages are not copied here: they are his, at https://phenomemental.github.io/happyseaurchin-beach/.
To repeat the creator-page test, fetch them and pass each through `safe_join2.py` (`body_of`, then `kids`
with his page's own address as the base). Only his colour tokens appear here, in `assembler/look-Phenomemental.json`.

## Round two — is any of it practical?

| test | result |
|---|---|
| **drift**: the hand-twinned agent copies (`arrive/touch/engage/shell.md` → `.html` via `scripts/build-arrive.js`) | `shell.html` has drifted: a line added to the HTML by hand ("Your own shell, as a page: /passport/<handle> …") is not in `shell.md`, so the next build silently deletes it |
| **history**: every page edit in the site's 960 commits (`history.py`, `history_js.py` — JS tokenised with acorn to tell copy from code) | of 1,037 page edits: **77% code**; 16% words and markup without CSS/JS; 4.6% words living inside JS strings; 2.6% words alone. **45 commits (~6%) were pure copy edits** to existing pages — each a PR and a deploy that a content block on the beach makes one write |
| **translation A/B** (`translation/`): `beach-security.html` to Spanish, one agent given only the content block, one the raw HTML | both perfect — no English left, structure intact (0 differences in form/style/script for the HTML route too). Content block: 7.3 min, 184k tokens; raw HTML: 10.5 min, 211k. The block route's safety is by construction; a careful model didn't need it here |
| **universal assembler** (`assembler/`): `form-proposal.json` (1.6 KB) + `assemble.js` (~12 KB, names no family) + look blocks | renders the reading body of three live proposal families straight from the beach (LEROs, Y-ray, threads) in the standard look and Matthew's, light/dark/phone; enforces 286's resolver (allowlist, AA contrast, degrade to standard). `proposal.html` is 75 KB and also carries instruments (band, answering, threads, room, bar) |
| **a bug found by the second reader** | `proposal.html` line 385: an answer word must start with a letter, so `5TH PLACE` breaks the list; on the live LEROs page decision 1.11118 offers PLACE/NHFT/PIA/NOT YET, CLERO and ISBD can't be answered, and Matthew's ISBD answer is hidden. Fix: ``var W = "[0-9]*[A-Z][A-Z0-9’']*", TOK = W + "(?: " + W + ")*";`` (tested: all six words parse; a year still doesn't) |
| **creator pages** (`creator-pages/`): Matthew's five public pages through `safe_join2.py` | all round-trip exactly; **86% of words** (2,374/2,769), links and images arrive in his look; refused: scripts, buttons, forms, comments. His drawing returns **in his own colours** once a geometry-only SVG subset joins the vocabulary and his look block carries his `wash`/`crimson` tokens. Layout craft (card, drop cap, list styling) still lost |

## What came of it

- **Two fixes, pushed with this folder.** `proposal.html`'s answer words may now open with a digit, so LEROs decision
  1.11118 offers CLERO, ISBD and 5TH PLACE and counts Matthew's answer (checked against the live page; six other
  proposal families render identically); and `shell.md` carries the line its page already showed, so a rebuild keeps it.
- **A parallel lane reached the same verdict on its own** (`pool:weft` 291; its line banked at `stash:weft` 54):
  transliteration is trivial, dissolution into position is native, a lens's vocabulary is the allowlist, and code
  gains addresses, never execution. This lane's record is `history:weft` 198, its account `watch:weft` 727.
- **Worth building, in order:**
  1. *286 as form + look.* The look layer as asked (function:look, a look block per creator, the resolver with its
     allowlist and AA contrast), with a form block beside it so a creator can arrange as well as colour.
     `assembler/assemble.js` is a working prototype of the resolver and the walk.
  2. *One assembler for the family kinds.* A form block per kind instead of a hand-built page per kind: new
     families and crafted proposals become a few KB of blocks. Interactive parts stay code, written once as vetted
     components.
  3. *Creators' pages as blocks, never HTML.* The third route: nothing foreign is parsed; the vocabulary grows one
     vetted word at a time (a geometry-only drawing word already carries Matthew's drawing in his colours).
  4. *A second reader as an audit.* Draw every family with the assembler and diff against the live page: the first
     run found a live bug.
  5. *Small:* a check that the `.md` twins rebuild unchanged; move copy that lives inside JS into blocks only where a
     page is edited for words often.
- **Not worth building:** programs as blocks (bigger, harder to read, still need a runtime) and an LLM assembling
  pages at runtime (minutes and ~200k tokens a page).
