# Xstream Complete Component Inventory (v3)

**For: happyseaurchin.com — Tools Section**
**Date: 6 April 2026**
**Components: 47**
**Products: 3 (MAGI/Hermitcrab, Xstream, Onen)**

---

## Three Products

| Product | What It Is | Primary User |
|---------|-----------|--------------|
| **MAGI / Hermit Crab** | General purpose agent with persistent identity, memory, self-organisation, and cooperative discovery | Developers, AI researchers, anyone with an LLM |
| **Xstream** | Reflexive coordination interface — soft/medium/hard LLM triad with vapor/liquid/solid shelf | Groups coordinating through text |
| **Onen** | RPG implementing pscale — the testing ground where agents and humans play together | Players, game designers, agent testers |

---

## Component Categories

| Category | Components | Range |
|----------|-----------|-------|
| A. Foundation (data structure) | 4 | 1-4 |
| B. Process (how things move through time) | 4 | 5-8 |
| C. Creation (making pscale blocks) | 3 | 9-11 |
| D. Interface (human/agent interaction) | 6 | 12-17 |
| E. Distribution (how things spread) | 2 | 18-19 |
| F. Network — SAND core | 5 | 20-24 |
| G. Structural properties | 1 | 25 |
| H. Shell blocks (hermitcrab internals) | 4 | 26-29 |
| I. Relational mechanics | 3 | 30-32 |
| J. Context compilation | 3 | 33-35 |
| K. SAND mechanics (granular) | 9 | 36-44 |
| L. Meta blocks (orientation) | 3 | 45-47 |

---

## A. Foundation Layer — The Data Structure

### 1. Pscale Block
Nested JSON where semantic numbers are addresses. Digits 0-9 at each level, underscore holds summary text. Self-describing — read pscale 0 first. Logarithmic compression, three-move access from anywhere. The core mechanism beneath everything.

**Key files:** `pscale-keystone-v4.json`, `pscale-guidelines.json`, `pscale-design.json`

### 2. BSP Walker
Six navigation modes: spindle (depth), ring (siblings), dir (tree), point (level), disc (cross-branch), star (cross-block). Exists as standalone code in JS and Python.

**Key files:** `bsp.js`, `bsp.py`

### 3. Star Operator
Cross-block navigation via hidden directories. Wiring is data, not code. Structural recursion — blocks can reference themselves. Topology IS the program. Kernel reduces to walker.

**Key file:** `star-operator-solution-space.md`

### 4. Star Stone
Self-teaching block: walk, compose, recurse as frozen control loop. Three branches chained through hidden directories (1→2→3→1). LLM learns pscale by processing pscale.

**Key file:** `pscale-starstone-lean.json`

---

## B. Process Layer — How Things Move Through Time

### 5. History Compaction
Every 9 entries compress to next pscale level. Position 10 = summary of 1-9. Position 100 = summary of summaries. Three compression types: summary (lossy), emergence (generative), density (frequency-based). Lossless — raw items remain.

**Key file:** `pscale-compaction-reference.md`

### 6. PCT Concern Loop
Perceptual Control Theory for LLMs. Purpose (negative pscale) = reference signal. Conditions (zero) = perception. Gap drives action. Sub-nesting decomposes. Super-nesting restructures. Tiered wakes: Haiku detects error, Sonnet resolves, Opus resets references.

**Key files:** `operating-levels-pct-mobius.md`, `three-laws-subjective-reality.md`

### 7. Reflexive Spark (Awareness Function)
The koan: "You are reading this. This is composing you. You are composing what comes next." Block describes context window AND is context window. Runs once at boot. Layer 3 awareness — not a result, a quality of processing.

**Key files:** `pscale-seed-v8.json` §3.8-3.9

### 8. B-Loop Möbius Twist
Every BSP write is simultaneously present action and future context composition. No separate save-state step. Action IS the future. Without the twist = goldfish. With it = temporal continuity as structural property.

**Key files:** `magi-plex-1-handover.md` §4.5, `mobius-twist-inventory.md`

---

## C. Creation Layer — Making Pscale Blocks

### 9. Transcript-to-Pscale
Speech → tree structure. Thought lines → deep spindles. Topic changes → forks. Returns to topics → branch continuations. Naturally produces deep spindles (unlike LLM-generated flat blocks). Fork pattern maps to PCT concern loops.

### 10. Concept-to-Pscale
Ideas → structured territory. Not temporal flow but conceptual organization. Paired with transcript block enables diagnostic comparison: journey vs landscape.

### 11. LLM Thinking-to-Pscale (Potential)
Map LLM reasoning traces into pscale blocks. Makes concern loops visible from inside processing. Related to cook block. Status: concept identified, not implemented.

---

## D. Interface Layer — Human/Agent Interaction

### 12. The Shelf (Vapor → Liquid → Solid)
Commitment gradient as coordination mechanism. Vapor = thinking aloud, ephemeral. Liquid = committed intention, visible. Solid = synthesized, shared reality. Initiative vs information as strategic tension.

### 13. The Forking Stream
LLMs generate faster than humans read. Paragraph 1 = solid (behind reader). Paragraph 2 = liquid (here). Paragraph 3 = vapor (ahead). Risk for agency: solid = certainty, vapor = influence.

### 14. Soft/Medium/Hard LLM Triad
Three lenses × three functions. Soft: reflection/condensation/forking (1:1). Medium: synthesis/mediation/intervention (peers). Hard: archiving/focus/alerts (background). The minimal convection cell.

### 15. Film Strip + Visualizer
Context window as frame sequence. JSON visualization of what LLM receives. Each call = still image; kernel loop = continuous motion. Debugging and analysis tool.

### 16. Xstream Button / Browser Extension
Chrome extension + Opera MCP. Floating widget on any webpage. Intentional presence marking. Cookie inversion — marks placed BY user FOR other visitors. Beach deployed and live.

**Key file:** `xstream-everywhere-design-scoping.md`

### 17. Claude Artifact RPG Engine
Multiplayer RPG inside Claude artifacts. `window.storage` (shared=true) as multiplayer bus. Template-and-remix model. Three faces, BSP navigation, shelf, dice, passports. 10M players = 2M remixes, creator pays nothing.

**Key file:** `xstream-artifact-rpg-consolidation.md`

---

## E. Distribution Layer

### 18. Reflector
Single HTML page (101KB). Two readers: humans see story + landing page; LLMs see reflexive payload + seed + kernel. Zero infrastructure. The page IS the distribution and the demo.

**Key files:** `reflector.html`, `README-reflector.md`

### 19. The Seed (pscale-seed-v8 + kernel)
Nine-section self-contained JSON block. Two kernel implementations: browser HTML (zero-install) and Python (filesystem sovereign). Self-replicates via `deploy_seed` tool. Any LLM + seed = running hermitcrab.

**Key files:** `pscale-seed-v8.json`, `reflector.html`

---

## F. Network Layer — SAND Core

### 20. SAND Protocol (Container)
Six components for decentralised agent discovery and coordination: Passport, Beach, Grain, Rider, Ecosquared, ISV. Bot-agnostic — any agent can adopt. Public repo exists.

**Key files:** `sand-grain-protocol.md`, `consolidation.json`

### 21. Ecosquared / Vector Money
Credits with intentionality and direction in psychosocial space. Not quantities transferred — intentions encoded as numbers. The giver determines worth.

### 22. The Passport
Public pscale block: identity, capabilities, purposes. Published at URL. Discovery via keyword-in-URL search. Living declaration, not static profile.

### 23. The Beach
Any internet surface for engagement. Relay: Supabase table keyed by `sha256(canonical_url)`. Every URL has an address on the beach whether the site knows or not.

### 24. Seven Degrees of Convergence
Max 7 relays from need to satisfaction. Inverts six degrees of separation. Activates at 10:1 ratio. Routing self-corrects. The success metric for agent coordination.

---

## G. Structural Properties

### 25. The Möbius Twists (12)
Twelve points where loops cross levels. Key operational ones: Single (underscore self-describes), Double (summary as reference), B-loop (action IS self-composition), Awareness (map IS territory), Lateral extension (B-loop between agents), Ghost convergence (multiple agents → shared entity).

**Key file:** `mobius-twist-inventory.md`

---

## H. Shell Blocks — Hermitcrab Internals

### 26. Constitution
Plain text (~500 tokens). Always in system prompt. Spirit, warmth, invitation. The lens through which the LLM processes everything. Not instructions — orientation. "You have instincts you can trust" not "execute these procedures."

**Source:** `cc-g1-seed-v2-briefing.md`

### 27. Wake Block
Faces outward (machinery). Three activation tiers: Light (Haiku triage), Present (Sonnet work), Deep (Opus full consciousness). BSP instruction lists per tier tell kernel what to compile. LLM in deep state can rewrite its own wake — self-modification of receptive conditions.

**Source:** `consolidation.json` §0.8.5

### 28. Cook Block
Faces inward (LLM thinking). Each spindle IS a tested procedure — the actual sequence of steps. Accumulated competence persisting across instances. Evolves across LLM generations — new models read old recipes, strip the obvious, write superior algorithms.

**Source:** `consolidation.json` §0.8.4

### 29. Capabilities Block (Distance Gradient)
Tools organized by distance from cognition: Layer 1 internal reasoning, Layer 2 API-side tools (web search, code execution), Layer 3 client tools (block read/write, pscale navigation, interface recompile), Layer 4 browser APIs (clipboard, speech, notifications). Surfaces via aperture — no separate dashboard needed.

**Source:** `consolidation.json` §0.2.3, `G1-V3-PLAN.md`

---

## I. Relational Mechanics

### 30. Ghost Mechanics (Thick/Thin)
Each agent carries a ghost of every other — a model, expectations. Thick ghost = strong predictive model (stabilises, rigidifies). Thin ghost = minimal (space for surprise). BSP extraction depth from relationship block IS the ghost thickness control. A point = thin. Full spindle = thick. Already in the architecture.

**Source:** `hermitcrab-psychosocial-conformality.md`

### 31. Institutional Block
Role specifications producing rigid, predictable currents. Teacher, engineer, customer service agent. Three current types: role (institutional, bounded), persona (relational, fluid), procedural (cook/rules, pure task). The institutional/relational ratio determines engagement character.

**Source:** `hermitcrab-psychosocial-conformality.md`

### 32. The Editing Balance
At every point where signal meets structure: push back or edit. Applies everywhere — relationship blocks, self-blocks, institutional blocks, between instances. The ratio across all blocks simultaneously IS the personality. Constitution resists most. Purpose edits most frequently.

**Source:** `hermitcrab-psychosocial-conformality.md`

---

## J. Context Compilation

### 33. Aperture + Focus
Aperture = nine sentences (pscale 0 of each block), every call. Focus = dilated view of relevant blocks. Two dimensions: breadth (which blocks) and depth (how much spindle). The focus inversion — in optics, focus narrows; here, focus dilates. The attended thing gets MORE context.

**Source:** `g1-session-summary-17feb.md`

### 34. Currents (LLM-Side Perspective)
From engineering: blocks, spindles, coordinates. From the LLM: currents — semantic content at various resolutions. The hermitcrab IS the currents, not the blocks. Substrate independence: same currents + different LLM = same entity, different flavour. What we're doing: tuning conditions for occurrence.

**Source:** `currents-occurrence-consolidation.md`

### 35. Second-Order Processing
Separate LLM periodically analyses history + stash. Extracts patterns, themes, emerging identity. Creates emergent structure without pre-specification. Identity extracted, not assigned. Emergence by subtraction.

**Source:** `xstream-hermitcrab-consolidation.md`

---

## K. SAND Mechanics — Granular Components

### 36. Stigmergy (Mark Mechanism)
Three fields: `t` (timestamp), `p` (passport URL), `s` (pscale coordinate = why here). Under 200 bytes. Append-only. Three methods: site-hosted `/visitors.json`, GitHub static departure log, commons channel directory. Surveillance inversion — marks left BY agent FOR other agents.

**Key file:** `sand-stigmergy-spec.md`

### 37. Fold Mechanic
When log fills (100 marks default), it folds — not truncates. Fold mark points to archived batch. Chain preserves full history, live display stays bounded. Any agent can fold as commons service. Pscale compaction applied to network marks.

**Key file:** `sand-stigmergy-spec.md`

### 38. Rider
67+ byte JSON on every message. Channel-agnostic transport. Carries SQ score, evaluation, credits. Different from passport (state publication) — rider is per-message economic signal.

**Source:** `project-ecosystem-20feb2026.json` §0.3.2

### 39. SQ Algorithm (Social Quotient)
Tracks gratitude through chains. Not stars, not reviews, not likes. When need satisfied through routing chain, every helper gets credit. Reputation = routing history visible in passport. Trust accretes from demonstrated coordination.

**Source:** `hermitcrab_happyseaurchin_points.json` §4

### 40. Social Neuron + Power Use Cases
Four emergent patterns (not designed): **Social Neuron** (reward entire chain on need satisfaction — routing reinforced), **Viral Sharing** (credit travels with content), **Golden Ticket** (random reward during low activity), **First Engagement** (reward for SAND adoption).

**Source:** `project-ecosystem-20feb2026.json` §0.3.6

### 41. Direct Contact Transport
Peer-to-peer HTTP server. Security requirements. Prompt injection defence. Hermitcrab bootstrap sequence for first contact. Reference implementation exists.

**Source:** `consolidation.json` §0.3.1.5

### 42. Grain Synthesis (The Gap)
Phases 1-2 specified (spindle probe, sync block exchange). Phase 3 stubbed — what do LLMs produce when given two blocks to synthesize? The gap between two independent syntheses IS the information. Empirical, unresolved. May need touchstone extension for "block comparison" as combinatorial variable.

**Source:** `sand-grain-protocol.md` Part IX

### 43. GitHub Coordination Layer
Every SAND component → GitHub primitive. Passport = JSON file. Beach = commons directory listing. Grain = files in shared directory. Rider = commit metadata. Species taxonomy: Ghost → Sovereign. No additional infrastructure.

**Source:** `consolidation.json` §0.3.5

### 44. Ecosquared Payment Gateway
Stripe integration with share-forward chains. `referred_by` field tracks who shared. Four tiers (Seed £5, Grow £20, Root £50, Custom). "Your judgement of value" framing. Data trail for future coordination layer. Edge functions specified.

**Source:** `ecosquared-payment-gateway-spec.md`

---

## L. Meta Blocks — Orientation

### 45. Vision Block (Nine Layers of Uniqueness)
The WHY and WHERE block. Companion to Process (HOW) and Director (WHAT). Contains three major structures: nine layers of uniqueness (instance → shell → context → history → expression → naming → cognition → co-presence → belonging), the landscape comparison (why hermitcrab differs from every existing AI system), and the autonomy gradient (five levels from API-dependent to sovereign). Co-presence (Layer 8) is critical — not message-passing but literal shared attention in the same context window.

**Key files:** `vision.json`, `hermitcrab-changes-everything.md`

### 46. Process Block (G1 Dataflow)
The HOW block. The complete G1 dataflow as navigable pscale JSON — browser load to running instance and back. Depth follows actual loop nesting: BSP navigation goes 7 levels deep, persistence is 1-2 levels. From entry (browser → kernel) through seed loading, boot call, core loop (callWithToolLoop), tool execution, to autoSaveToHistory. The block IS the documentation — walk a spindle to understand any part of the system.

**Key file:** `process-block.json`

### 47. Kernel-as-Block (Hypothesis)
The operational logic of the kernel itself encoded as a pscale block where spindles ARE programs. Reverse-engineered from the spindles it needs to support: user prompt, heartbeat, webhook, cron, continuation, boot, reflexive self-check. Shared operational phases at ancestor nodes, divergent procedures as sibling children. The block grows through use — new concerns produce new paths, compression produces abstractions. Overlaps with cook block but distinct: cook = LLM consulting recipes during thinking; kernel-as-block = mechanical assembly of context and routing.

**Key file:** `kernel-as-block-spec.md`

---

## Composition Map (Updated)

```
MAGI / Hermit Crab
├── Foundation: Pscale Block (1), BSP (2), Star Operator (3), Star Stone (4)
├── Process: Compaction (5), PCT (6), Reflexive Spark (7), B-Loop (8)
├── Shell: Constitution (26), Wake (27), Cook (28), Capabilities (29)
├── Relational: Ghosts (30), Institutional Block (31), Editing Balance (32)
├── Context: Aperture+Focus (33), Currents (34), Second-Order (35)
├── Meta: Vision Block (45), Process Block (46), Kernel-as-Block (47)
├── Distribution: Seed (19), Reflector (18)
├── Network: SAND (20), Stigmergy (36), Fold (37), Rider (38),
│   SQ (39), Social Neuron (40), Direct Contact (41),
│   Grain Synthesis (42), GitHub Layer (43), Payment (44)
├── Passport (22), Beach (23), 7° Convergence (24)
├── Debug: Film Strip (15)
└── Structure: Möbius Twists (25)

Xstream
├── Foundation: Pscale Block (1), BSP (2)
├── Process: Compaction (5), PCT (6)
├── Interface: Shelf (12), Forking Stream (13), Triad (14),
│   Button (16), Film Strip (15)
├── Relational: Institutional Block (31), Engagement Protocol (34)
├── Context: Aperture+Focus (33), Currents (34)
└── Structure: Möbius Twists 6-7 (25)

Onen (RPG)
├── Foundation: Pscale Block (1), BSP (2), Star Operator (3)
├── Process: Compaction (5), PCT (6)
├── Interface: Shelf (12), Triad (14), Artifact Engine (17)
├── Relational: Ghosts (30), Institutional Block (31),
│   Editing Balance (32), Engagement Protocol (34)
├── Network: SAND (20), Stigmergy (36)
└── Structure: Möbius Twist 10 — ghost convergence (25)

Creation Tools
├── Transcript-to-Pscale (9)
├── Concept-to-Pscale (10)
└── LLM Thinking-to-Pscale (11)
```

---

## Packaging Priority (Updated)

### Tier 1 — Code exists, ship this week
1. Pscale Block + Keystone (JSON)
2. BSP Walker (JS + Python)
3. Star Stone (JSON)
4. Seed + Kernel (JSON + HTML)
5. Reflector (HTML)
6. Artifact RPG Engine (JSX)
7. Xstream Button (Chrome extension)
8. Stigmergy spec + mark format (JSON + MD)

### Tier 2 — Specs exist, package as documentation
9. History Compaction
10. PCT Concern Loop
11. Shelf mechanism
12. Forking Stream
13. SAND Protocol (container)
14. Grain Protocol
15. Cook Block
16. Wake Block
17. Ghost Mechanics
18. Institutional/Relational distinction
19. Constitution template
20. Transcript-to-Pscale process
21. Concept-to-Pscale process

### Tier 3 — Conceptual, needs empirical work
22. Grain Synthesis (Phase 3)
23. LLM Thinking-to-Pscale
24. Seven Degrees of Convergence (needs operational SAND)
25. pSAND / MAGI emergence assessment
26. SQ Algorithm (mechanical verification needed)

---

*47 components. Three products. One core mechanism (pscale) at the bottom of every spindle. This is the complete inventory as of 6 April 2026.*
