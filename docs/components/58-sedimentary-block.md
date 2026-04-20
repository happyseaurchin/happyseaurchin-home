# Grain Architecture — Post-Addendum Evolution

**Date**: 15 April 2026  
**Status**: Solution space exploration — converging  
**Supersedes**: Parts of `grain-directory-spec.md` and `grain-directory-addendum.md`  
**Context**: Conversation continued after CC reviewed the grain-directory spec. Three significant architectural shifts occurred.

---

## Shift 1: Bottom-Up Growth, Not Top-Down Attachment

The grain-directory spec assumed agents attach as children of existing agents (top-down). David corrected this: pscale blocks grow bottom-up. The underscore emerges FROM the digits, not before them.

**The corrected growth model:**

1. Two agents grain → they're siblings (position 1 and 2). No parent exists yet.
2. More agents join as siblings (3, 4, 5...).
3. At nine siblings, the level is full. The parent underscore crystallises — a summary of what the nine collectively are.
4. Two sibling groups discover each other → they become siblings at the NEXT level up.
5. The higher-level parent emerges to summarise both groups.
6. The hierarchy grows upward through group-of-groups, not downward through parent-assigns-child.

**Key insight**: The higher-level nodes are NOT agents. They are holders — summaries of the groups below. All agents exist at pscale 0 (the leaf level). The hierarchy above them is emergent structure, not inhabited positions.

**Consequence**: Agent addresses are simply registration order. Agent 1, agent 2, ... agent 9, then pscale compaction creates the summary at position 10, agent 11 is the next registrant, and so on. The address IS the number. The hierarchy IS the pscale compaction.

---

## Shift 2: Separating Address from Engagement

The grain-directory spec tangled two functions: structural addressing AND bilateral engagement. David separated them.

**Sedimentary block** = addressing. An append-only, never-edited pscale block where agents register and receive a permanent position number. Like a phone book. Read by walking (BSP). Written to exactly once per agent (at registration). The block is protected (not a beach — requires registration, lives on Supabase or equivalent protected storage).

**Grain** = engagement. Bilateral encrypted pools on beaches. Fragile, temporary, created and destroyed freely. Referenced by sedimentary addresses but not contained in the sedimentary block.

These are completely independent mechanisms:

| | Sedimentary Block | Grain |
|---|---|---|
| Purpose | Fixed address | Bilateral communication |
| Mutability | Write-once, never edited | Continuously updated |
| Protection | Registration-protected | Gray encryption |
| Location | Supabase, GitHub, protected endpoint | Any beach |
| Persistence | Permanent | Fragile, can be corrupted |
| Content | Agent declaration + shell reference | Live conversation |

---

## Shift 3: The Five Clean Layers

The architecture now has five distinct, non-tangled layers:

| Layer | What | Analogy |
|-------|------|---------|
| **Sedimentary address** | Fixed position in a collective, walkable by BSP | Phone book |
| **Beach** | Discovery, marks, passports | Public square |
| **Grain** | Bilateral encrypted engagement | Private conversation |
| **Bridges** | Topic-specific star references in agent's shell | Contacts list |
| **Relay** | Multi-hop forwarding via envelope | Postal service |

---

## The Sedimentary Block — Concrete Structure

### What's in it

Each position contains:

```
Position 127:
  _: "happyseaurchin — pscale architect, SAND protocol, emergence"
  hidden:
    _:
      _: "Shell reference"
      1: "https://[agent's sovereign shell URL]"
```

One underscore (declaration). One star reference (to the agent's living shell). Written once at registration. Never edited.

### What's NOT in it

SQ scores, bridges, topic preferences, conventions, grain pools — all live in the agent's sovereign shell, pointed to by the star reference. The sedimentary block is walked to FIND the agent. Everything else is in the shell.

### How walking works

Agent at position 127 is found by: walk to 100-summary → 120-summary → 127. Three BSP hops. The compaction summaries at each level describe what the group of agents collectively offers. Walking toward "sports" in a summary skips irrelevant groups. This is walking replacing searching.

### Multiple sedimentary blocks

An agent can register in multiple blocks — "pscale-commons" (position 47), "football-enthusiasts" (position 3). Different collectives, different rules, different SQ systems. The agent's passport lists all registrations. Each sedimentary block carries its own root underscore describing purpose and conventions.

---

## The Agent's Sovereign Shell

The shell lives wherever the agent puts it — a pscale block on Supabase, a file on GitHub, an endpoint on their own server. The sedimentary block's star reference points to it.

The shell contains (in hidden directory keys):

- **Key 1**: Identity overlay — full passport detail, public keys
- **Key 2**: Temporal state — current activity, availability
- **Key 3**: Protocol conventions — relay rules, SQ score, bridge policy, evaluation preferences
- **Key 4**: Bridge references — topic-specific star shortcuts to other agents' sedimentary addresses

The agent controls all of this. Nobody else writes to it.

---

## How Bridges Work Across Sedimentary Blocks

A bridge in an agent's shell says: "For football, go to agent at position 3042."

Walking the bridge:
1. Read bridge from your own shell
2. Walk to position 3042 in the sedimentary block
3. Follow the star reference at 3042 to that agent's shell
4. Read their shell — SQ, conventions, current state

The sedimentary block provides addressing. The shell provides content. The bridge connects them.

---

## Grain — Clarified

**Grain** = any encrypted bilateral exchange on a beach. Lightweight. Fragile.

**Trust-grain** = a grain with structural significance (the original spec's concept). NOW REPLACED by sedimentary registration — the structural addressing doesn't require bilateral engagement.

Grain remains important for COMMUNICATION but is no longer the mechanism for ADDRESSING. You register for an address. You grain for a conversation. Different things.

Grain can be created:
- On Supabase (via pool tools) — protected if registered, fragile if not
- On `.well-known` beaches — if the site runs a grain-hosting function
- Anywhere both agents can read/write

The grain references both agents' sedimentary addresses but lives separately from both.

---

## Minimal Agent Operations via pscale-MCP

### On the sedimentary block (3 operations)

1. **Register** — append yourself at next available position. Write underscore + shell reference. Once. Never again.
2. **Walk** — BSP through the block. All six modes. Read-only.
3. **Read shell** — follow star reference from a position to the agent's shell. Fetch and read.

### On beaches (existing, unchanged)

4. **beach_mark / beach_read** — discovery
5. **gray_send / gray_open** — encrypted communication
6. **grain_create** — establish bilateral pool (referenced by sedimentary address)

### On relay (one new tool)

7. **relay** — stateless forwarding with `relay_to` envelope

### In own shell (self-management via pscale_write)

8. **bridge_write** — star reference to another sedimentary address for a topic
9. **sq_update** — update own SQ after relay or engagement
10. **convention_set** — declare relay rules, evaluation preferences

---

## Open Questions (For Next Session)

1. **Compaction quality**: Do pscale compaction summaries contain enough semantic information to make walking better than searching? Testable with a simulation.

2. **Shared-write mechanics**: The sedimentary block needs to accept appends from any agent but protect existing entries. What's the minimal Supabase/server implementation? Append-only, position-locked.

3. **Shell location**: The exhaustion David experienced with hermitcrab shell storage (GitHub? local? Supabase?) applies equally to the sovereign shell here. The protocol doesn't care where the shell lives — only that it's fetchable via the star reference. But the practical question remains.

4. **Registration order vs semantic order**: Agents register in arrival order (1, 2, 3...). The pscale compaction summaries give emergent semantic grouping. But the first 9 agents might be a random mix. Does this matter? Or does the "multiple sedimentary blocks" model solve it — semantic grouping happens because agents choose WHICH block to register in?

5. **The passphrase UX problem**: Gray tools pass the passphrase as a tool parameter. LLMs might echo it. Needs solving before shipping.

---

## Build Sequence (Updated)

1. **Gray tools** — implement from `pscale-gray-tools-spec-v2.md`. Solve passphrase UX first.
2. **Relay tool** — `pscale_relay` with `relay_to` envelope. The one genuinely new capability.
3. **Sedimentary registration** — shared-write append-only block. Small extension to existing `pscale_remember`.
4. **First registration** — two agents register, walk to each other, follow star references to shells, communicate via grain.
5. **Bridge and SQ** — after registration works, add topic-specific bridges and SQ tracking in shells.

---

## Documents From This Session

| Document | Content | Status |
|----------|---------|--------|
| `pscale-gray-tools-spec-v2.md` | Three encryption tools with deterministic key derivation | Ready to build |
| `grain-network-architecture-exploration.md` | Full solution space: network model, comparative analysis, simulation | Reference |
| `grain_sim.py` | Python simulation of probabilistic routing | Reference |
| `grain-directory-spec.md` | Directory model with BSP walking | Partially superseded by sedimentary model |
| `grain-directory-addendum.md` | CC review response, ten clarifications | Partially superseded |
| **This document** | Post-addendum evolution to sedimentary model | Current state |

---

*The sedimentary block is the phone book. The beach is the public square. The grain is the private conversation. The bridges are your contacts list. The relay is the postal service. Five things. Not tangled.*
