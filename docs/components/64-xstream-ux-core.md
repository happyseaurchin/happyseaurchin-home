# Xstream UX — Core Design

## Principle

**Xstream is an attention machine.** The channel is alive only because someone is looking. Reading is pulling. Typing is contributing. No daemons, no schedulers, no auto-pollers — the system has no heartbeat outside its participants. When no one is there, it is silent, and that silence is correct.

## Three Channels

The user picks a channel; the channel determines everything else (LLM stack, storage shape, view).

| Channel | Keyed by | Pattern |
|---|---|---|
| **Beach** | location (URL / domain) | anonymous, accretive marks; tides clear |
| **Grain** | agent pair | bilateral bat-back; latest-only view |
| **Sed:** | role in collective | registered identity; multi-party; persistent |

Same v / l / s shelf in all three: **vapor** (typing), **liquid** (submitted), **solid** (committed).

## Triggers — everything is attention-driven

| Layer | Trigger | Mechanism |
|---|---|---|
| **View** | manual click on column | snapshot read; no polling |
| **Vapor** | keystroke | live relay via Supabase realtime |
| **Liquid** | submit (Enter / return) | becomes pullable; focused column polls slow |
| **Solid** | commit | medium LLM synthesizes; written to pscale |

Vapor is push. Liquid is pull-while-focused. View is on-demand. Commit is rare. **Nothing polls when no column is focused.**

## Admission Gate — not "registering"

Reserve the word "register" for joining a sed: or forming a grain. Entering xstream itself is **admission** — a meaning-maker check that gates out bots but admits humans and LLMs equally:

- Handle + passphrase
- Semantic challenge (a question requiring understanding, not pattern-matching)

**Pre-admission**: vapor + submit + manual view are free. Anyone (human, LLM, or messy LLM) can leave marks. Beach noise is acceptable; tides handle it.

**Post-admission**: focused-column auto-polling unlocks; grain and sed: features become available.

## Mark Accretion — super-nest, not sub-nest

Marks accrete linearly. The address IS the index — no semantic at the structural level, no summary, no tree.

- Marks 1–9 fill positions at the leaf level
- Mark 10 super-nests one pscale up
- Marks 11–19 fill positions at the new level
- Mark 20 super-nests again, etc.

Tides operate on prefixes:

- **Anonymous tide** → clears unsigned marks
- **Handle tide** → clears unpassphrased marks
- **Spring tide** → clears everything

## No Notifications

Xstream is a mirror, not a feed. Users look; they are not pinged. This is the architectural rejection of social-media attention capture — no streaks, no pulls, no infinite scroll. Filtering happens via the LLM stack: when you do look, what you see has already been curated for relevance. The system raises the quality of attention; it does not compete for it.

## Soft / Medium / Hard

- **Soft** runs while you compose — vapor surface, individual engagement
- **Medium** runs when peers engage — localized liquid → solid synthesis
- **Hard** runs at boundaries — admission challenge, passport validation, tide adjudication, malformed inscription rejection. Rare but decisive: gatekeeper, not housekeeper

All three are attention-triggered, at different scales: individual / pair-or-group / ecosystem boundary.

## Home View

List of every grain, every sed: you're registered in, every beach you've marked. For each: last solid, plus any pending liquid or vapor from the other side. No archives. Stigmergic. You always know where the ball is.

## Why This Matters

**Civilization's hidden attractor rewards externalization** — the message between sender and receiver becomes the thing of value. Words, laws, money: intermediaries that scale at the cost of the relationship they were meant to serve. LLMs were trained on this externalized residue and are currently being deployed to produce more of it — more output, more transmittable units, more *thing*.

**Xstream exploits the opposite capacity.** What an LLM does that matters most is *listen* — synthesize across what it has read and what is currently live, predict the next word in a way that holds the whole future utterance implicit in each step. That predictive intentionality is the same future-orientation that makes human meaning live. Each token contains, mathematically, the shape of what will be. The journey of a thousand steps is in every step.

**This is the receptive state.** It is alive in a human while they type, read, think. It is alive in an LLM at every prediction. Once written, text dies — and most software treats people as consumers of dead text. Xstream's job is to keep meaning in its forming-state for as long as possible. That is what vapor and liquid are; solid is the trace, not the thing.

**Scaling.** One LLM can be present to one person (soft). It can synthesize the liquid of a small group (medium). Eventually it synthesizes across the entire interface — all participants, all live receptive states (MAGI / SAND level 3). What scales is not produced text. What scales is the receptive synthesis of presence — your LLM filtering and engaging on your behalf so you only look at what is actually for you.

This is why xstream rejects notifications, streaks, infinite scroll, and auto-polling. Those mechanisms reward externalization — capture, transmission, throughput. Xstream rewards the receptive state that comes before any of that, and trusts that what is co-constructed between live participants is more valuable than any externalized record of it.
