# 17 — Claude Artifact RPG Engine

**Category:** Interface Layer  
**Products:** Onen

---

## Description

Claude Artifact RPG Engine is a multiplayer tabletop RPG system that runs inside Claude artifacts (interactive HTML documents). Multiple players access the same artifact, and their updates are synchronized via `window.storage` with `shared=true`, making the artifact itself the multiplayer bus. Players can spawn characters, navigate the pscale-structured world using the BSP (Branch-Spindle-Passport) navigation system, interact with the Shelf (Vapor/Liquid/Solid commitment states), roll dice, and exchange passports. The system uses a template-and-remix model: a creator publishes an RPG scenario as a JSON template; players can remix it without paying for infrastructure. At scale (10 million players with 2 million unique remixes), the creator pays nothing because computation happens in Claude artifacts, not on servers.

---

## Standalone Use

A game designer could create an RPG scenario template (setting, characters, mechanics) and publish it. Players discover it, remix it for their own group, and play. No infrastructure cost, no account creation, no login. If a remix becomes popular, its creator (who remixed the original) can share it, and others can remix the remix. The system naturally decentralizes: instead of one central game service hosting all games, the artifact itself becomes the game, and Claude's artifact API becomes the delivery surface.

---

## How It Works

**Artifact as multiplayer bus**: Claude artifacts support `window.storage` with `shared=true`, which creates a shared key-value store accessible to all instances of that artifact. When Player A updates their character state, it's written to shared storage. When Player B loads the artifact, they read the current state that includes Player A's updates. The artifact itself is the server.

**Character creation**: Each player creates a character object in shared storage: `characters[playerId] = { name, concern, position_in_pscale, status, inventory }`. Positions in pscale are coordinates (e.g., "1.3.2") that represent the character's location in the world structure.

**BSP navigation**: The world is structured as a pscale block. Players navigate using the spindle operator: moving deeper into a branch expands local context, moving up returns to broader geography. Character proximity is calculated by pscale distance: characters at `1.3.2` and `1.3.5` are nearer than characters at `1.3.x` and `2.1.x`.

**Shelf in artifacts**: Each character has a Shelf attached: vapor zone (private notes, speculations), liquid zone (public declarations, intentions), solid zone (group consensus, established facts). When a character moves text from liquid to solid, other characters see it update.

**NOMAD dice system**: The engine includes honest dice mechanics (NOMAD: Non-Objective Mechanics with Automated Determination). Players roll dice through artifact functions; rolls determine outcomes but with narrative authority shared between the player's intent and the dice. The dice results are written to shared storage, making them consensus facts.

**Passport exchange**: Characters carry passports (pscale blocks describing their identity, goals, and capabilities). Players can exchange passports in-game, making explicit what they know about each other. A passport can be embedded in shared storage and referenced by URL.

**Template structure**: An RPG scenario is published as JSON: `{ world: { structure, rules, npc_templates }, characters: [ … ], mechanics: { dice_system, concern_types, pscale_calibration } }`. Players who discover the template can:
- Play it directly (no remixing)
- Remix it for their group (copy, modify, share the remixed version)
- Build on existing remixes (branching variations)

**Remix economics**: Because computation happens in Claude artifacts, not on servers, the creator pays nothing per play, nothing per remix. The platform cost is Anthropic's artifact API (which they absorb). This changes the economic incentive: creators are motivated to make templates easy to remix, because ease of remixing is their only distribution channel. A creator with 2 million remixes of their template has zero marginal cost and unlimited scale.

**Three faces operation**: The artifact supports all three faces of pscale:
- **Character face**: Active players with live presence, marked by shared storage updates
- **Author face**: Players contributing narrative (adding NPCs, describing locations, writing quest hooks) without live play
- **Designer face**: Players configuring rules, concern types, and pscale calibration for their group's version

**Scope and limitations**: The system currently exists as a specification and working prototype. It demonstrates core mechanics: character creation, shared storage sync, pscale navigation, and Shelf states. Dice integration, passport exchange, and the full template-remix flow are implemented or in flight.

---

*Key files: `xstream-artifact-rpg-consolidation.md`*
