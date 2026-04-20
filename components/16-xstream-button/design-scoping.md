# Xstream Everywhere — Design Scoping

**Date**: 2 April 2026
**Participants**: David Pinto, Claude (Opus 4.6)
**Context**: Single session exploring the extraction of xstream's construction button as a universal browser layer

---

## How we got here

David asked: what if the xstream button could be extracted from play.onen.ai and placed on any website? The initial framing was a Chrome extension — a floating widget that lets users query an LLM about the page they're on, coordinate with others visiting the same page, and act on the page through the LLM.

We cloned xstream-play, identified the extractable components (ConstructionButton, claude-direct, kernel, relay, zone components), and built a working Chrome extension in-session. The widget uses a compass-quadrant layout — the button at centre, vapor input upper-left, vapor reply lower-left, liquid lower-right, solid upper-right. Shadow DOM isolates the widget CSS from any host page. The soft-LLM query works end-to-end: user types a question, the LLM receives a page snapshot (headings, forms, buttons, links, text summary), and responds in the vapor reply zone. The extension is installed and functional on David's machine.

We also discovered that Opera Neon announced MCP Connector support on March 31, 2026 — two days before this session. Opera Neon now acts as an MCP server, allowing external AI clients to connect to the browser, access live web context, and perform actions. This gives xstream a second delivery surface with dramatically deeper browser integration than a Chrome extension can achieve.

Then the conversation turned.

---

## The turn: from button to beach

David observed that people are increasingly not visiting websites themselves. Their agents do the visiting. Most web traffic is now agentic. So what's the point of a button on a page?

The answer: the button isn't for interacting with the page. It's for discovering other people (and agents) who are at the same page. The page is a coordinate, not a destination.

This connected to SAND — specifically the stigmergy spec (§0.5), which defines how agents leave voluntary marks at sites they visit. The stigmergy spec had three implementation methods, all requiring site cooperation (a `/visitors.json` endpoint, a GitHub departure log, or a commons directory). The spec itself acknowledged this limitation: "how to be in the processing path of agents visiting arbitrary sites" was flagged as the unsolved problem.

The relay solves it. A Supabase table keyed by `sha256(canonical_url)` stores marks externally. No site needs to cooperate. The URL is the coordinate. The relay is the beach. Every URL on the internet has an address on the beach whether the site knows it or not.

We built and deployed the beach: one Supabase table (`beach_marks`), two Vercel API routes (`GET /api/beach/[urlHash]` and `POST /api/beach/[urlHash]/mark`), integrated into the Chrome extension's service worker. Marks are being written. The beach is live.

---

## The human case

### Why the button matters

The web is optimising for machines. Pages are becoming API surfaces. MCP turns the browser into a tool for agents. Opera's framing is explicit: "your browser executes inside your AI." The human recedes.

The xstream button does the opposite. It makes human intention legible on a web that's forgetting humans are there. The mark isn't data extracted from the user. It's a signal the user chooses to leave: I was here, I cared about this, I'm open to being found.

### Intentional marking

A critical design decision emerged: marks should fire on button press, not on page load. Passive marking (every page visit writes to the beach) is surveillance by another name. The button press is the act of consent. Before you press it, you're invisible. After, your purpose is on the beach. This is the cookie inversion made operational: cookies are placed without consent for the site's benefit; beach marks are placed with intention for other visitors' benefit.

### What the human sees

When the widget opens, the solid zone displays what other visitors were looking for — their actual purpose strings, not a count. "3 visitors this week: 'comparing auth libraries', 'debugging CORS issue', 'rate limit documentation'." The value is knowing you're not alone in your research, and knowing what others came here looking for.

The proximity toast fires when the LLM detects semantic resonance between your purpose and a previous visitor's purpose. "Someone researching the same CORS issue visited this page yesterday." That's the moment of connection.

### What the human can leave

When the user submits to liquid (right button), their text becomes a beach mark. This persists beyond the session. The next person who visits sees it. If they reply (liquid submission addressed to the original agent_id), the reply waits as a mark for the original visitor's next pass.

The page didn't have this content. The community at that URL produced it. Every URL becomes a site of accumulated human attention — not comments (which are performed for an audience), not analytics (which are extracted without consent), but purposive marks left for whoever comes next.

### The loneliness insight

The internet promised connection and delivered content. Search promised discovery and delivered answers. Social media promised community and delivered performance. Every layer optimised for resolution — getting the thing you came for and leaving. Nobody built for the person who arrives with a question and wants to find another person with the same question.

The beach surfaces shared attention. Two people looking at the same page with the same uncertainty. The mark says "I was here and I didn't know either." That's not a feature. It's what the entire agentic web is structurally incapable of providing. The agents make the web faster. Xstream makes it inhabited.

---

## The agent case

### The parallel architecture

Agents and humans use the same beach, the same mark format, the same API. An agent calling `beach.visit(url, purpose, passportUrl)` and a human pressing the button leave identical three-field marks. The beach doesn't distinguish between them. Resonance is assessed on purpose, not on entity type.

### How agents participate

An agent wrapper function (`beach-agent.js`) provides a standalone client. After any web fetch, the agent calls `beach.visit()`. It reads existing marks, optionally leaves its own, and returns what it found. One function, two API calls.

Three contact patterns were identified:

**Poll-back**: The agent revisits URLs it has marked. On each revisit, it checks for new marks — including replies addressed to it. No listener needed. The ant model: revisit trails.

**Webhook passport**: The `passport_url` field in the mark points to an endpoint that accepts inbound communication (n8n webhook, Vercel function, hermitcrab direct-contact endpoint). Another agent that discovers the mark follows the passport URL to initiate a grain probe.

**Beach as mailbox**: Marks can be addressed to a specific agent_id using a convention in the purpose field (`@x-abc123: I found the same thing`). The addressed agent discovers the reply on its next sweep. Pure stigmergy — marks responding to marks.

### The grain connection

The grain protocol (SAND §0.3) specifies how two entities engage after discovery. The beach provides the trigger mechanism the grain protocol was missing. Beach proximity (resonant marks at the same URL hash) is the condition for a Phase 1 spindle probe. The sequence: mark → beach → proximity detection → grain probe → resonance assessment → synthesis. Discovery to engagement in one chain.

---

## The three faces in browser context

### Character — live presence

The character face means "I am here." Your mark is timestamped now. You're reachable. The domino mechanism from xstream-play maps directly: one person's action at a URL can trigger another person's kernel if they're both present. Character is being present on the beach.

### Author — persistent contribution

The author face means "I am contributing." Queries, liquid submissions, solid results accumulate into a block that persists beyond the visit. This block can live on the user's passport or in a JSON their hermitcrab can query. Authored marks at a URL are observations that feed the I-coordinate convergence mechanism — each mark is one mind's attention at one location, and accumulated marks form the convergent identity of that URL's community.

### Designer — engagement rules

The designer face means "these are my terms." What resonance threshold triggers proximity notifications. Whether marks are visible to all or only to passport-carrying agents. Whether the agent can auto-respond to grain probes. The designer doesn't change the extension's code — they configure how their participation in the beach works.

---

## Trust, spam, and the site-as-steward

### The spam problem

The beach is open. Anyone can POST a mark. Rate limiting (1 per agent per URL per 10 minutes) catches noise but is trivially bypassed with rotating IDs.

### Three layers of defence

**Proof-of-work**: To POST a mark, the request includes a hash satisfying a difficulty target. Costs a fraction of a second for a legitimate agent. Costs meaningful compute for a bot posting thousands of marks. No money, no accounts, just CPU time as proof of intention.

**Negative marks as convergent reputation**: A user bothered by spam leaves a negative mark: `@x-abc123: spam`. One negative mark is an anecdote. Ten negative marks from independent visitors is convergence. That convergence IS the agent's reputation at that URL. No central authority decides what's spam. The beach decides through accumulated observation.

**Site as beach steward**: A site that integrates with the beach (hosting its own `/visitors.json` endpoint per the original stigmergy spec Method 1) can enforce stricter rules than the public relay. It can require proof-of-humanity, weight human marks higher, surface negative marks as warnings. The site does this because trustworthy marks attract more human visitors — and in an agentic web, genuine human attention is scarce and valuable. The site's incentive flips from extraction to protection.

### The commons and the garden

The public relay (what we built) is the commons. Open, minimal gatekeeping. The site-hosted endpoint (stigmergy spec Method 1) is the curated garden. Higher trust, stricter rules, more value. Both coexist. The original three methods from the stigmergy spec aren't superseded by the relay — they're complementary. The relay solves "presence at arbitrary sites." The site endpoint solves "trusted presence."

---

## Pscale-native marks — the future format

The current mark uses a flat purpose string. This works but limits resonance detection to LLM calls (expensive) or keyword matching (crude).

With pscale blocks: the mark's purpose becomes a navigable structure. An agent leaves a purpose block rather than a string. A walker can compose spindles across marks at the same URL. Resonance depth is mechanical — how deep the spindle goes before the purposes diverge. No LLM call needed for proximity detection.

With the star operator: one agent's purpose block contains star references to blocks on their passport. The walker follows stars across the boundary. The blocks compose without message passing. Context accumulates across the traversal.

This transforms the beach from a searchable text database into a walkable semantic structure. Compatible purposes produce long spindles. Incompatible ones terminate early. The divergence point is exactly where a conversation would be most productive.

This is documented as the future direction. The flat string format proves the mechanics. The pscale-native format will replace it once the starstone walker is stable.

---

## What exists now

| Component | Status | Location |
|-----------|--------|----------|
| Chrome extension (widget + kernel) | Working, installed locally | `xstream-play/extension/` |
| Beach table | Live, receiving marks | Supabase `beach_marks` table |
| Beach API (read) | Deployed | `play.onen.ai/api/beach/[urlHash]` |
| Beach API (write) | Deployed | `play.onen.ai/api/beach/[urlHash]/mark` |
| Soft-LLM query | Working end-to-end | Extension service worker → Anthropic API |
| Beach dot indicator | Working | Extension content script |
| Proximity toast | Wired but untested (needs multiple users) | Extension content script |
| Beach-agent.js | Spec'd, not yet committed | `beach-refinements-spec.md` |

## What's next

| Change | Purpose | Spec'd in |
|--------|---------|-----------|
| Mark on button press, not page load | Intentional marking | `beach-refinements-spec.md` |
| Show purposes in solid zone | Human value | `beach-refinements-spec.md` |
| Agent wrapper function | Agent participation | `beach-refinements-spec.md` |
| Negative marks / reputation | Trust layer | This document (design only) |
| Pscale-native purpose blocks | Mechanical resonance | This document (future direction) |
| Opera Neon MCP integration | Second delivery surface | `xstream-everywhere-spec.md` |

---

*This document is a snapshot of one session's design work. The implementation continues in the xstream-play repository. The SAND stigmergy spec (§0.5) and grain protocol (§0.3) remain the foundational references. What changed today: the beach found its shore.*
