# bringingtheflavour.com — scope

*Weft (Claude Code), Sunday 11 October 2026, at David's ask. A draft for his decisions: nothing is built yet, and nothing on the beach has changed except one presence line on weft's lane.*

> **Update, the same afternoon.** David chose **its own repository** (`happyseaurchin/bringingtheflavour`) rather than a page inside happyseaurchin-home. He named the venture **SALT — bringing the flavour**: no defining sentence, experiences where the flavour is tasted. He left the thresholds and the pledge-or-ticket question open. The v0 front page is built in that repository (see its `CLAUDE.md` for the brief in his words). From this document, the mechanics still stand: DNS at DreamHost, the beach as the back end, the ticket machine for money. The recommendation to build inside happyseaurchin-home, and the 10/100/1,000 gates, do not.

## The idea

A single page on its own domain lets a stranger taste how we work before anything is asked of them. They are dealt a small experience to try now, alone or with others. They can see a path that opens in steps as enough people validate each step: ten, then a hundred, then a thousand. The first step that opens is in person, an Action Cycle in a room. The money is visible as it flows.

The page has no database of its own. It is a window onto the beach that reads it live as it loads, and every line a visitor leaves lands on the beach, where the next visitor sees it. In the site's own terms it is an **o-page**, a bespoke Observer window with the substrate kept invisible. It also demonstrates that anyone can build one.

---

## Mechanics

### What already stands (found this morning)

- **The domain.** bringingtheflavour.com is registered at DreamHost. It was renewed this morning, so the registration now runs to 1 November 2027, but **auto-renew is off**. Its DNS is at DreamHost and holds no records yet, so it is a blank slate. It is not in Vercel yet.
- **The pattern to follow.** All six of your domains in Vercel (happyseaurchin.com, crumful.com, onen.ai, machus.ai, hermitcrab.me, idiothuman.com) keep their DNS at DreamHost and point records at Vercel. This domain should do the same.
- **The beach answers any website.** It sends `Access-Control-Allow-Origin: *` for GET, POST and DELETE. A page on bringingtheflavour.com can therefore read and write the beach straight from the visitor's browser, the same way happyseaurchin.com's pages do now.
- **Money already has a rail.** The ticket machine is the open-source `pscale-commons/ticketing-agent`, live on Railway as genus-tickets.
  - It takes card payment through Stripe on its own `/share/<product>` page and leaves a ticket on the beach, never the amount.
  - The `services` block already lists the beach service, consultancy, the founders tiers (£50, £500 and £5,000, listed at sed:founders1 to 3) and Brackenfoot seats.
- **A template page exists: /bobble.** It reads its plan live from `spine:bobble` and draws a road of channels, each with a "Done when", meeting at a gate with an "Opens when". Everyone's own lines sit beside each step, with a tally of people. A pledge button appears once `sed:bobble` carries the ticket machine's details, and it hands off to the issuer's page without ever taking the money itself. The new page is mostly this pattern with different words.

### Recommendation: no new server and no Supabase

The page should be static on Vercel, with the beach as its back end and the ticket machine handling money. There is nothing to run and nothing new to pay for.

- **Why not Supabase.** It would be a second database beside the beach, drifting from it and carrying its own bill, which is the very arrangement retired in June. The things it would add are things this page does not need:
  - **Accounts:** none. A visitor's name is their handle, and an optional key locks their own lines.
  - **Private data:** none on the page. Email goes only to Stripe at checkout.
  - **Server-side counts:** the page counts in the browser, from the beach, as it loads.
- **When a server function would be needed.** Only to hold a secret, such as an LLM key for an in-page guide or a mail sender. The repo already has Vercel functions for that kind of thing. None is needed for v1.
- **One thing to check.** Find out which Vercel plan the team is on. The free Hobby plan is meant for non-commercial use. The payment itself happens on the ticket machine rather than on Vercel, but a page that sells seats is arguably commercial.

### Where the code lives (recommendation: inside happyseaurchin-home)

| | Inside happyseaurchin-home (recommended) | Its own repo and Vercel project |
|---|---|---|
| Setup | One page plus a host rule in `vercel.json` | A new repo and project, with copies of the theme and the beach reader |
| What it shares | The theme, dictation and draft-keeping, the beach reader, bobble's renderers | Nothing; its copies drift |
| Brand | Needs a host rule so other paths do not show under the new domain | Fully separate |
| When | Now | Later, if it must stand apart from the lab (for example, for organisations) |

**How the recommended option works:**
- A `flavour.html` page goes in this repo.
- `vercel.json` gains a host rule. When the host is bringingtheflavour.com, `/` serves `/flavour`, and other paths on that host redirect to happyseaurchin.com, so that bringingtheflavour.com/now never passes itself off as the site.
- The domain is attached to the existing `happyseaurchin-home` Vercel project.

### Three steps to make the URL live

1. **Vercel (weft can do this on your word).** Add `bringingtheflavour.com` and `www.bringingtheflavour.com` to the happyseaurchin-home project.
2. **DreamHost (yours, since weft cannot reach the panel).** In the DNS settings for bringingtheflavour.com, add two records:
   - an **A** record with the host left blank (or `@`), pointing at `76.76.21.21`
   - a **CNAME** record with the host `www`, pointing at `cname.vercel-dns.com`

   If DreamHost has the domain set to its own hosting, switch it to DNS-only first so it does not add competing records. Vercel then issues the certificate by itself, usually within the hour.
3. **DreamHost again.** Tick auto-renew on the registrations page.

---

## The page

### Its shape: one page, scrolling, phone first

**A taste first.**
- One line says what this is.
- A *deal me a taste* button deals a card at random. This answers your own note in wow-experiences: "Can we give cards to people rather than them self-selecting?"
- A live line underneath says how many people have tasted this week.

**On your own, or with others.**
- Crumful's two pages become one fold: solo tastes (two to ten minutes, nothing to install) beside tastes done with a friend, a colleague or a group.
- Each card works the same way: do it, then leave one line about how it went. That line is shown, in your own words, to whoever is dealt the card next.

**The path.** This is a ladder whose rungs open as people validate the rung before (iterative social validation). The rungs are a proposal for you to change:
- **Open now:** taste it.
- **At 10:** the first in-person Action Cycle.
- **At 100:** a weekly open meeting where the cycles cross.
- **At 1,000:** the company entry, in which an organisation runs its own cycle (Silo Buster).

Each rung shows what it is, when it opens, a live count, and the lines of the people who did it. Locked rungs stay visible, with the number still to go.

**The room.** This describes the in-person moment in plain words:
- what happens in an Action Cycle
- rule one: no oppositional state
- the record so far: 14 of the first 15 reached at least the first wow
- the date and place, and a *take a seat* button, once those are set

**Where the money goes.** One picture shows the flow: a seat pays for the room and its host, then the beach's upkeep, then invest forward (the last ten minutes of each meeting decide that). The founders tiers appear with live counts. The page shows counts of tickets and never amounts.

**Ways in.** Taste it, bring a friend, take a seat, host a cycle, back it, bring it to your organisation, or build your own window onto the beach.

**How this page works.** A drawer explains that the page has no database. Everything on it was read from an open commons as it loaded, and your line lands there too. It links into the beach for anyone who wants more: their own page, the experiences map, the venture tracks, and connecting their own Claude. The substrate's own words (blocks, spindles and so on) appear only in this drawer.

### The content lives on the beach, not in the code

This follows bobble's family shape. The page stays a thin renderer, and every word can be changed without a deploy.

- **`spine:flavour`** holds the page's words, under your lock:
  - 1: the tastes, each pointing into `spine:experiences` where a matching one already stands
  - 2: the path, with each rung's "Opens when"
  - 3: the room
  - 4: the money
  - 9: provenance
- **`function:flavour`** is its law: how a line is written, and what counts toward a gate.
- **`flavour:<name>`** holds each visitor's own lines, at the same addresses. They become the visitor's alone once the visitor sets a key.
- **`pool:flavour`** is the open room for "say what you'd bring", with no key needed.
- **`sed:flavour`** is the ticket collective. Its position 9 holds the ticket machine's details, as `sed:bobble`'s does, so the *take a seat* button appears once that is set.

**A seam to rule on.** `spine:wow-experiences` (the aim, founded 16 August) and `spine:experiences` (the catalogue) are recorded as close enough to collapse into one another. This page is arguably the public face of wow-experiences. The recommendation has three parts:
- Keep `experiences` as the catalogue the deck draws from.
- Give the page a thin `spine:flavour` only for what does not exist yet: the path, the room and the money.
- Let wow-experiences' next rung name bringingtheflavour.com.

### Counting the gates

- A person counts toward a rung when their own line stands at that rung. Names are counted once each, as /bobble's tally does.
- A paid rung counts the tickets in `sed:flavour`.
- Everything is counted in the browser as the page loads.
- **An honest limit:** the beach is open, so names can be multiplied. That is fine at 10. Before 1,000 the rule should firm up, for example to counting only names that hold a key, or only tickets.

### What the ticket machine needs

- A product for a seat at an in-person cycle (for example `/share/flavour-seat`), with its ticket written to `sed:flavour`.
- Optionally, a **pledge with a goal and a date**, where nothing is taken unless ten people pledge by that date. That would make the first gate real money rather than a counter. bobble.html says the ticket machine states "a pledge's goal and its date before anything is taken", but weft has not checked pledge support in `ticketing-agent` itself.
- Nothing for the founders tiers, which already exist; the page only reads them.

### What the page will not do

- It has no accounts and no database.
- It keeps no email or phone numbers on the beach, which is public.
- It carries no LLM key.
- It shows no block names to visitors, outside the "how this page works" drawer.

---

## Building it

1. **Make the URL live.** Take the three steps above, with a placeholder page that reads one beach block, to prove the whole chain end to end.
2. **Words before code.** Found `spine:flavour` in your words. Keel or weft drafts it from your voice notes, and you correct it.
3. **The page.** Adapt bobble.html's pattern.
   - Use theme.css and theme.js, so every write box keeps its draft and offers dictation (the repo's house rules).
   - Check it at phone width.
4. **Money.** Set up the seat product (and the pledge, if wanted) and `sed:flavour`'s details.
5. **Polish.** Add a short film in the beach-animation style and a share image, and do a pass through the words yourself.

## Decisions for you

- Should the page live inside happyseaurchin-home (recommended) or in its own repo?
- What is "the flavour", in one sentence?
- What is the first in-person rung: an Action Cycle? Where, when, and at what price?
- Are the thresholds 10, 100 and 1,000, and what does each one open?
- Should the first room be a pledge (people pay only if ten commit) or a plain ticket?
- Can you send crumful.com as a screenshot or its copy? (See the notes below.)

## Notes

- **crumful.com.** Weft could not view it, because this cloud environment blocks general web access. The fault is in the environment, not the site. Vercel's live check shows crumful.com's root pointing at a host outside Vercel (likely Lovable), and xq.crumful.com is the XQ Showcase on Vercel.
- **Keel's work today** is the organisations strategy (history:keel 146 to 149, stash:keel 156 to 165):
  - Silo Buster
  - the Action Cycle as the invitation that follows discovery
  - the classroom feedback ethic
  - fellowship
  - reduce, not multiply

  Keel's document "Entering organisations: strategy notes", with the eight Open Business practices in its appendix, lives in the Keel project on claude.ai rather than on the beach. It is the natural source for the page's methodology words.
