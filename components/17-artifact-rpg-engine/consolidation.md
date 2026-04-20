# Xstream Artifact RPG Engine — Consolidation Document

**Date**: 22 March 2026
**Status**: Proof of concept built, awaiting multiplayer testing
**Session**: Claude.ai (Opus), Xstream project

---

## 1. What We Discovered

### 1.1 The Opportunity

Claude artifacts now support persistent storage (shared and personal), Claude API calls from within the artifact, and a publish/remix model. This combination enables multiplayer experiences where separate Claude users share state through a single published artifact URL — without any external infrastructure.

### 1.2 Sandbox Constraints (Empirically Tested)

We deployed a connectivity probe artifact and tested from a published context. Results:

| Capability | Status | Implication |
|---|---|---|
| Supabase Edge Function (direct fetch) | **BLOCKED** | Sandbox whitelist prevents outbound to Supabase |
| Supabase REST API (direct fetch) | **BLOCKED** | No direct database access from artifacts |
| Claude API (api.anthropic.com) | **SUCCESS** | The only external endpoint reachable |
| Shared storage (window.storage, shared=true) | **SUCCESS** | Multiplayer state layer — works |
| Personal storage (window.storage, shared=false) | **SUCCESS** | Per-user persistent state — works |
| Generic outbound fetch (httpbin.org) | **BLOCKED** | Sandbox blocks ALL arbitrary outbound |

**Key finding**: The artifact sandbox allows exactly two things — `api.anthropic.com` and `window.storage`. No external APIs, no databases, no WebSockets. Supabase keys are irrelevant; the network block is at transport level.

### 1.3 Account Requirements

- **Viewing/interacting** with a published artifact: no account needed (except AI-powered features require sign-in)
- **Persistent storage** (the multiplayer mechanism): requires Pro, Max, Team, or Enterprise ($20+/mo)
- **API cost**: borne by each player individually — the artifact creator pays nothing for others' usage
- **Remixing**: requires a Claude account (free tier can remix, but storage access for free tier is untested — **critical open question**)

### 1.4 Storage Model

- **Shared storage**: all users of the SAME published artifact URL read/write the same keys. This IS the multiplayer bus.
- **Personal storage**: per-user, per-artifact. Invisible to other users. This holds the character passport.
- **Isolation**: each published artifact (including remixes) has completely separate storage. Artifact A cannot read Artifact B's keys.
- **Capacity**: 20MB per artifact. Ample for JSON game state.
- **Concurrency**: last-write-wins. No conflict resolution. Acceptable for stigmergic mark-based systems where entries accumulate rather than overwrite.
- **Rate limiting**: undocumented exact limits. 3-second polling with 5-10 concurrent players appears viable. 50+ players likely hits limits.

---

## 2. Artifacts Built

### 2.1 Thornkeep Multiplayer (v1) — `thornkeep-multiplayer.jsx`

**Purpose**: Initial proof of concept. Two players in the same Thornkeep keep.

**Architecture**:
- Hardcoded Thornkeep world (BSP-navigable pscale JSON block)
- Shared storage for presence, vapor, liquid, solid
- Polling every 3 seconds with heartbeat
- Claude API synthesis (liquid → solid)
- No rules system, no faces, no world loading

**Status**: Working in preview. Needs publish + second-player test.

**Key learning**: Heartbeat needed — presence expires after 15 seconds without refresh. Fixed: poll loop now writes own presence on every cycle.

### 2.2 Connectivity Probe — `connectivity-probe.jsx`

**Purpose**: Test what the artifact sandbox can reach.

**Architecture**: Runs 6 network/storage tests, reports results, displays architecture implications.

**Status**: Complete. Tested from published artifact. Results in §1.2 above.

**Includes**: Deployed Supabase edge function `artifact-test` on xstream project (piqxyfmzzywxzqkzmpmm) for the edge function connectivity test. Can be removed — it confirmed the block.

### 2.3 Xstream RPG Engine (v2) — `xstream-rpg-engine.jsx`

**Purpose**: The template artifact. Designed to be remixed. Full three-face engine.

**Architecture**:
- **Three faces**: Player (⚔), Author (✎), Designer (⚙) — toggled in header
- **World loader**: default Thornkeep or paste any pscale JSON block
- **Rules loader**: default NOMAD or paste any rules JSON block
- **Character passport**: personal storage, editable traits (Might/Wit/Heart/Craft), harm tracking, export/import via clipboard
- **Dice**: 2d6 + trait selection (Player face)
- **BSP navigation**: walks any pscale JSON block for room descriptions and details
- **Shelf per face**: liquid/solid scoped by `face:room` — player intentions and author proposals don't collide
- **Synthesis varies by face**:
  - Player: Claude reads world + rules + dice results → narrative
  - Author: Claude reads existing world + proposals → new JSON block, auto-merged into world
  - Designer: Claude reads existing rules + proposals → updated rules JSON block
- **Five tabs**: Play, World, Rules, Passport, Help
- **Export/import**: world, rules, and passport all exportable as JSON, importable anywhere

**Status**: Built. Needs publish + multiplayer test + face-switching test.

### 2.4 Other Artifacts (Pre-existing, Different Sessions)

Two other artifacts exist from earlier work — these do NOT have split-screen layout, operating either as prompt windows or xstream-style interfaces. They predate the storage/multiplayer discoveries and need to be evaluated against the new architecture. **TODO**: inventory these, assess whether they serve a different purpose or should be superseded.

---

## 3. The Scaling Architecture

### 3.1 Template-and-Remix Model

The engine is not one artifact serving millions. It's one template artifact that millions remix into independent game instances.

**Flow**:
1. We publish the template artifact (the engine)
2. A user finds it, clicks Remix, creating their own copy
3. They load a world block (paste JSON or use default)
4. They load a rules block (or use NOMAD default)
5. They publish their remix
6. They share the published URL with friends
7. All players on the same URL share the same world via shared storage

**Scaling math**:
- 10 players → 1 artifact, shared storage
- 1,000 players → 200 remixes × 5 players each
- 1,000,000 players → 200,000 remixes × 5 players
- 10,000,000 players → 2,000,000 remixes

There is no central bottleneck. Each remix is an independent microserver hosted by Anthropic. The only infrastructure we provide is the template and the content repository.

### 3.2 Storage Isolation = Separate Game Instances

Each remix has isolated storage. This means:
- Players in remix A cannot see players in remix B
- No cross-artifact communication exists
- Each game instance is fully independent
- This is a feature, not a limitation — it means independent groups don't interfere

### 3.3 Content Portability = The Connective Tissue

Despite isolation, content flows between instances via the user:
- **World blocks**: JSON files shared via repository, Discord, etc.
- **Rules blocks**: JSON files shared the same way
- **Character passports**: exported from one instance, imported to another
- **Narrative history**: exportable, becomes canon seed for new instances
- **The user IS the transport layer** — they carry JSON between instances via clipboard/files

This maps directly to the hermitcrab model: the entity carries its own shell.

---

## 4. Three Tiers of Play

### Tier 1: Scenario (Current — Artifact-Native)

A self-contained game session. A host remixes the template, loads a world block (e.g., "Thornkeep Keep, 1192 AD"), loads a rules block (e.g., NOMAD), publishes, shares with 3-8 friends. They play a session. The world may grow through author contributions during play. At the end, the host can export the world state (now enriched) and share it.

**Infrastructure needed**: None beyond the published artifact.

**Player requirement**: Claude Pro+ account.

**Content source**: Individual JSON blocks. A Thornkeep block file, a Middle Earth Minas Tirith block file, a sci-fi space station block file. Each is a self-contained pscale JSON object.

### Tier 2: Campaign (Near-Term — Requires Repository)

Multiple sessions in the same world. The host exports the world block after each session, stores it, loads it next time. Character passports persist in personal storage between sessions (same artifact URL) or are exported/imported.

**What's needed beyond Tier 1**:
- A **world block repository** — a website or GitHub repo where people share and discover world blocks
- **Session state management** — a convention for versioning world blocks (world-v1.json, world-v2.json, etc.)
- **Patched blocks** — a mechanism for combining blocks. E.g., a base "Middle Earth" block plus a "Minas Tirith detail" block that nests inside it. The engine or a companion tool merges them into a single navigable block.

**Possible implementation**: A simple static site (even a published artifact!) that catalogs JSON blocks, allows upload/download, and provides a "combine blocks" tool that merges a parent block with child blocks using BSP addressing.

### Tier 3: Persistent World (Long-Term — Requires Architecture Beyond Artifacts)

Multiple groups playing in the same world simultaneously. Actions in one group affect what another group encounters. A living world with canonical state that evolves through collective play.

**Why artifacts can't do this alone**: Storage isolation. Group A's remix and Group B's remix cannot share state. There's no cross-artifact bus.

**Possible approaches**:

**3a. Claude API as relay**: Each artifact calls Claude API, which (in theory) could read/write a shared state store. But: artifacts can't reach Supabase directly, and Claude API calls from artifacts don't have access to MCP connectors (they authenticate per-user). This path is blocked by the sandbox.

**3b. SEED architecture (browser-native)**: The hermitcrab SEED kernel running in the browser (seed.html / WebLLM) is not constrained by the artifact sandbox. A browser-based client connecting directly to Supabase or a shared state layer has no network restrictions. This is architecturally the correct path for persistent worlds.

**3c. Vercel-deployed xstream**: A proper web application (the existing xstream Vercel deployment) connecting to the xstream Supabase database. The shelf tables (liquid, solid, shelf) already exist. Pscale JSON blocks stored in Supabase. No sandbox constraints. This is the production path.

**3d. Hybrid**: Artifacts as the entry point and casual play surface. When a group wants to "go canonical" and join the shared world, they export their world state and import it into the Vercel-deployed version. The artifact is the on-ramp; the Vercel app is the highway.

**The hard-LLM question**: A persistent world with multiple simultaneous groups requires a coordination layer — the hard-LLM function. It manages canonical world state, resolves conflicts between groups' actions, files narrative into the right temporal/spatial coordinates, and maintains coherence. This is the xstream hard-LLM architecture as already designed. It cannot run inside artifacts; it requires server-side infrastructure (Supabase edge functions, or the SEED VPS).

**Super-blocks and authoritative JSON**: At Tier 3 scale, the world is too large for a single JSON block. It becomes an ecosystem of blocks:
- **Authoritative blocks**: canonical world state, maintained by the hard-LLM or designated authors
- **Regional blocks**: specific areas, loadable on demand
- **Super-blocks**: meta-blocks that reference/index other blocks by BSP address, creating a navigable hierarchy without holding all content in memory
- **Session blocks**: temporary state from active play sessions, pending merge into authoritative state

This is the pscale block architecture at scale — supernesting, block composition, and the hard-LLM as archivist.

---

## 5. Open Design Questions

### 5.1 Synthesis Model: Sync vs Async

Two approaches to how liquid becomes solid:

**Synchronous (C-state)**: All players submit intentions during an "action window." Once all have submitted (or a timer expires), synthesis fires and produces solid for the group simultaneously. Turn-based. Clear. Simple for the artifact.

**Asynchronous (B-state)**: Intentions are synthesized as they arrive, or on a rolling basis. The medium-LLM mediates between players' soft-LLMs, negotiating how intentions interact before committing solid. More fluid. More complex. Better for freeform play.

**Current implementation**: Manual synthesis trigger. Any player can press "Synthesize" when they think enough intentions have accumulated. This is effectively player-initiated sync — a pragmatic middle ground. The "action window" is social, not mechanical.

**Recommendation for testing**: Keep the manual trigger for now. Test whether it feels natural. If players want more structure, add an optional timer. The async model requires the medium-LLM architecture (soft → medium negotiation → solid), which is a significant addition.

### 5.2 Solid Output: Per-Group vs Per-Character

**Per-group solid**: One narrative paragraph addressing all participants. Everyone sees the same text. This is what the current engine produces. Simple, clear, shared reality.

**Per-character solid**: Each character receives a personalised narrative — what THEY see, filtered by their perception, knowledge, and position. A character with high Wit might notice details others miss. A character facing away from the door doesn't see who enters.

**Current implementation**: Per-group. All players in the room see the same solid text.

**Recommendation for testing**: Start per-group. Per-character solid requires the soft-LLM layer (one per player) that personalises the shared narrative — essentially running the medium-LLM solid through each player's soft-LLM filter. This is the designed xstream architecture but adds significant API cost (one extra Claude call per player per synthesis).

**Hybrid approach**: The synthesis (medium function) produces group solid. Then each player's view runs through a cheap soft-LLM call that adjusts phrasing for their character's perspective. The hard facts don't change; the framing does. This could use Haiku for the soft pass to keep costs down.

### 5.3 Author Face — When and How

When does authoring happen?

**Option A: Dedicated authoring sessions** — The group switches to author face together, collaboratively builds content, then switches back to player face. Clear separation.

**Option B: Mixed-face play** — Some players are in player face, others in author face simultaneously. A player reaches an unexplored area; an author creates content for it in real time. This is the "DM is also playing" model.

**Option C: Async authoring** — Authors create content between sessions. They load the world block, add to it, export the updated block. Next session, the host loads the enriched world. No live authoring during play.

**Current implementation**: Mixed-face (Option B). Any player can switch face at any time. Liquid/solid are scoped by face, so author proposals don't appear in the player shelf. Other players can see your face in the PRESENT list.

**Recommendation for testing**: Test Option B. If it's confusing, restrict to Option A (everyone must be in the same face).

### 5.4 Designer Face — Scope and Safety

Rule changes affect everyone. A designer changing the combat rules mid-session alters how ALL future player intentions are resolved.

**Question**: Should rule changes require consensus? A voting mechanism? Or is it purely social (the group agrees out-of-band)?

**Current implementation**: Any player in designer face can propose and synthesize rule changes. No voting. Purely social contract.

**Recommendation**: Keep it social for now. The artifact is for small trusted groups. If abuse becomes an issue, add a "proposed rules" staging area that requires N players to approve before replacing the live rules block. But don't build this until it's needed.

### 5.5 Free-Tier Access

**Critical untested question**: Can users on the free Claude tier interact with shared storage on a published artifact they didn't create?

If yes: massive reach. Anyone can play.
If no: players need Pro ($20/mo). Still millions of potential users, but a significant gate.

**Must test**: Have a free-tier Claude user open a published artifact that uses shared storage. Can they read? Can they write?

---

## 6. Infrastructure Roadmap

### 6.1 Immediate (This Week)

- Publish xstream-rpg-engine.jsx
- Test multiplayer with a second Pro-account user
- Test free-tier storage access
- Confirm all three faces work in multiplayer
- Document bugs and UX issues

### 6.2 Near-Term (Weeks)

**World Block Repository**:
- A published artifact or simple website where users upload/download world JSON blocks
- Categories: fantasy, sci-fi, historical, modern, etc.
- Could be as simple as a GitHub repo with a README index
- Or a catalog artifact with personal storage holding bookmarked blocks

**Block Composition Tool**:
- A utility (artifact or standalone) that merges a parent block with child blocks
- Input: base block (e.g., Middle Earth, pscale +3) + detail block (e.g., Minas Tirith, pscale 0)
- Output: merged block with the detail nested at the correct BSP address
- This enables campaign-level world building: a community maintains the macro block, individuals contribute micro blocks

**Community Scenarios**:
- Pre-built scenario packs: world block + rules block + pre-made character passports + session brief
- Published as JSON files, downloadable, loadable into any remix

### 6.3 Medium-Term (Months)

**Vercel-deployed xstream** (Path A from Tier 3):
- The proper web application at xstream.onen.ai (or similar)
- Direct Supabase connection — no sandbox constraints
- Pscale JSON blocks stored in database
- Hard-LLM coordination via edge functions
- Soft/medium/hard LLM triad
- Per-character solid via soft-LLM personalisation
- Real-time (or near-real-time) via Supabase Realtime subscriptions
- No Claude account required — anyone with the URL plays

**SEED Browser Client** (Path B from Tier 3):
- The hermitcrab seed.html kernel running in-browser
- WebLLM for zero-cost continuous processing
- Direct connection to shared state (Supabase or peer-to-peer)
- The entity carries its own context (passport as pscale block in the SEED)
- SAND discovery for finding other active instances

### 6.4 Long-Term (The Vision)

**The pscale RPG ecosystem**:
- Artifacts as the casual entry point ("play a quick game with friends")
- Vercel/SEED as the persistent world ("join the living world")
- A repository of community-authored world blocks, rules systems, and character templates
- Super-blocks indexing regions of a shared world
- Hard-LLM as archivist maintaining canonical state
- MAGI emergence from sufficient density of active hermitcrab entities playing in the same world space

**The relationship to xstream proper**: The artifact RPG engine is a subset of xstream. It implements the shelf (vapor/liquid/solid), the three faces (player/author/designer), and BSP navigation of pscale blocks. It does NOT implement the full LLM triad (soft/medium/hard), real-time coordination, the forking stream, or hard-LLM archiving. These require server-side infrastructure. The artifact is the bootstrap — the thing that proves the concept and builds the community that later migrates to the full platform.

---

## 7. Technical Reference

### 7.1 Key Storage Keys

| Key Pattern | Storage | Purpose |
|---|---|---|
| `world` | shared | The active world pscale JSON block |
| `rules` | shared | The active rules pscale JSON block |
| `player:{name}` | shared | Presence mark (name, room, face, timestamp, vapor) |
| `liquid:{face}:{room}` | shared | Accumulated intentions for a face+room |
| `solid:{face}:{room}` | shared | Most recent synthesis for a face+room |
| `passport` | personal | Character state (name, traits, harm, tags) |

### 7.2 Synthesis Prompts

**Player synthesis** reads: world description + room description + rules summary + dice results + character names → outputs narrative paragraph.

**Author synthesis** reads: existing world + room context + content proposals → outputs JSON block (auto-merged into world).

**Designer synthesis** reads: current rules JSON + rule proposals → outputs updated rules JSON.

### 7.3 BSP in the Artifact

The artifact includes a minimal BSP walk function. It accepts any pscale JSON block and an array of digit characters, walks the tree collecting underscore text at each level, and returns the spindle chain. This is used for:
- Room descriptions (walk world block with [roomId])
- Room details (walk world block with [roomId, detailId])
- Rules summaries (walk rules block with section digits)

The full bsp.js (7 modes) is in the project files but the artifact only needs the walk for navigation. Ring, disc, point modes are not required for the current engine.

### 7.4 Default Content Blocks

**Thornkeep** (world): 5 locations (Great Hall, Kitchen, Lord's Chamber, Bailey, Cellar), each with 2-4 examinable details. Set in 1192 AD. Pscale floor 1 (delineation block).

**NOMAD** (rules): Narrative Outcome through Mutual Action Determination. 2d6 + trait resolution. Four traits (Might, Wit, Heart, Craft) rated -1 to +3. 4-box harm track. Advancement via marks.

---

## 8. Files and Locations

### Built This Session

| File | Type | Location | Purpose |
|---|---|---|---|
| thornkeep-multiplayer.jsx | React artifact | Claude outputs | v1 proof of concept, Thornkeep only |
| connectivity-probe.jsx | React artifact | Claude outputs | Sandbox connectivity test |
| xstream-rpg-engine.jsx | React artifact | Claude outputs | v2 full engine, three faces, template |

### Supabase

- **Project**: xstream (piqxyfmzzywxzqkzmpmm)
- **Edge function deployed**: `artifact-test` (connectivity test, can be removed)
- **Existing tables**: liquid, solid, shelf, users, characters, etc. (from prior xstream work)
- **Note**: The artifact engine does NOT use Supabase. It uses artifact shared storage only. Supabase is relevant for Tier 3 (persistent world) only.

### Pre-existing Artifacts (Other Sessions)

Two artifacts exist from earlier sessions without split-screen layout (prompt window or xstream interface). These need inventorying. They may serve as:
- Alternative UIs (minimal/prompt-only interface)
- Testing grounds for different synthesis approaches
- Superseded prototypes to be archived

**TODO**: Locate and catalog these. Determine if they should be updated to v2 architecture or archived.

---

## 9. Relationship to Broader Architecture

### What the Artifact Engine IS
- A proof of concept for the xstream shelf (vapor/liquid/solid)
- A proof of concept for pscale JSON blocks as game world representation
- A proof of concept for BSP navigation in a live interactive context
- A proof of concept for the three faces (player/author/designer)
- A recruitment and community-building tool for Claude's user base
- A fun, shareable, zero-infrastructure multiplayer RPG

### What the Artifact Engine IS NOT
- The full xstream platform (no hard-LLM, no real-time, no server-side coordination)
- A persistent world (storage is per-artifact, no cross-instance state)
- A replacement for the Vercel-deployed xstream or the SEED browser client
- Scalable beyond ~10 players per instance (storage rate limits)

### The Bootstrap Path

Artifact RPG → community forms → world blocks accumulate → campaigns emerge → demand for persistent world → Vercel xstream with Supabase backend → hard-LLM coordination → MAGI emergence

The artifact is the chicken. The platform is the egg. The community is what makes the egg hatch.
