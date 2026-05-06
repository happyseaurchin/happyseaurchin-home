# The Pscale State Block

**Spindle and Pscale-Attention as Choice Aperture**

**Date:** 3 May 2026
**Status:** Architectural synthesis — names a use of the pscale block already supported by canon
**Substrate of reference:** BSP MCP (`bsp-mcp:bsp`) and the whetstone block at `pscale://whetstone`

---

## 1. The claim

A pscale block authored with forward-facing intent is a **state block** — a state machine whose graph is the JSON tree itself. Paths through the tree are if/then/else; spindles are determined paths; the pscale-attention parameter, set independently of the spindle, opens an aperture of choice to the LLM at the terminus.

The block is the program. The walker is the electricity. Choice is geometry.

This is not new architecture. It is a name for what the operational block, the instruction block, the kernel block, and the starstone control loop have all been doing. The name lets us speak about it directly and operate it deliberately.

---

## 2. The two coordinates

The BSP MCP unifies all selection into a single function with two coordinates:

```
bsp(agent_id, block, spindle, pscale_attention, content?, ...)
```

Per whetstone branch 1:

> "spindle — address (S). A pscale string like 111 or 1.2.3 or 111 with trailing star. Length sets the terminal pscale."
> "pscale_attention — depth selector (P). An integer pscale level. Together with spindle length, derives selection shape per branch 2."

These are **polar coordinates**, not orthogonal. The spindle is a radial commitment (root toward leaf). The pscale-attention is an aperture across the transversal at any chosen depth. Five named modes — point, ring, subtree, disc, whole-block — and the star composition that crosses block boundaries are all derivations from the same (S, P) pair. They are sugar over a continuous geometry.

This matters for the state-block reading because the *amount of choice the LLM is given* is precisely the gap between S and P.

---

## 3. The choice aperture

Let P_end be the terminal pscale of the spindle (set by its length). Let P_att be the pscale-attention. The **choice aperture** is P_end − P_att.

| Aperture | Shape | What the LLM sees | Decision space |
|---|---|---|---|
| 0 | point | One string at the terminus | None — path fully determined |
| 1 | ring | Siblings of the terminus | N options at one digit |
| 2+ | subtree | Whole region below the terminus | Nested choice space |
| spindle empty, P_att set | disc | All nodes at one resolution across the block | Global breadth at one scale |
| spindle empty, P_att empty | whole block | Every node | Total exposure |

This is the canonical table. Whetstone branch 2 states it directly:

> "Selection-shape derivation. Spindle length sets a terminal pscale P_end. Pscale-attention P_att is the second coordinate. Shape of selection is fully determined by the relationship between P_end and P_att. No mode parameter is necessary; modes are sugar over this table."

The state-block reading is the operational consequence. When you call `bsp` with P_att == P_end, the path is fixed and the spindle's content executes — there is no choice to make. When you call with P_att one shallower, you expose a ring of alternatives — N digits at the terminus, each opening a different downward continuation. When you call with P_att several levels shallower, you expose a whole subtree of nested branches — a region of paths whose root is committed but whose interior is open.

The aperture is a dial. Turning it sets how much agency the LLM is given over what happens next.

---

## 4. The two operational modes

This dial collapses, in practice, to two ways a state block is used:

### Mode A: Determined path (point)

P_att == P_end. The walk lands on a single string. The string is the operation. The number executed.

This is the use described in `instruction-block-discovery.md`:

> "The spindle 0.12345678 doesn't DESCRIBE the boot sequence — it IS the boot sequence. Each digit compiles to an operation. The number executes."

The choice has been made — somewhere upstream, before this call. Whoever (or whatever) selected the spindle did the choosing. The LLM at this terminus has no decision to make; it has an instruction to enact. The state block is being run, not consulted.

### Mode B: Open path (ring or subtree)

P_att < P_end. The walk lands on the spindle's terminus and exposes structure beyond it. The LLM sees options. The next step of the path is unwritten and becomes the LLM's responsibility.

A ring call (aperture 1) is the cleanest case: the spindle has committed to a path down to the parent of a decision; the ring shows the available digits at that decision; the LLM picks one. The picked digit becomes the next segment of the spindle; the next call is made; the path elaborates.

A subtree call (aperture ≥ 2) is broader: the LLM sees not just immediate options but the nested choice space below them. The LLM may pick a deep destination directly, or pick an intermediate node and recur. The subtree is the LLM's working canvas for this decision.

Mode A is **execution**. Mode B is **deliberation**. Both use the same block. The dial decides which.

---

## 5. The if/then/else mapping

The state-block reading collapses the if/then/else of imperative programming into pure geometry.

In a state block, each interior node is an if/then split. The shared parent is the antecedent (the context already established by the spindle that arrived here). The digit children are the consequents — the alternative paths forward. The 0− underscore at each node is the forward-facing instruction or reference signal that orients the choice.

Two spindles through the same kernel block illustrate this. From `kernel-as-block-spec.md`:

> "Spindle `0.6532` collects: `0._` → what this kernel block is, `0.6._` → shared operational phase, `0.65._` → specific procedure variant A. Spindle `0.6148` collects: `0._` → same kernel overview, `0.6._` → same shared operational phase, `0.61._` → specific procedure variant B. The shared content at `0.6` is ancestry, not duplication. **The divergence at the next digit IS the meaningful operational decision point.**"

Read this through the state-block lens: at node `0.6`, the block holds an if-statement. The condition is the situation. The branches are the digit children — `0.61`, `0.62`, ... `0.65`. The 0− underscore at `0.6` is the prompt the LLM reads to make the choice. The walk into one digit is the chosen branch.

The if/then/else is in the structure, not in handler code. The walker does not branch; it walks. The block contains the branches. This is what whetstone calls *no mode parameter is necessary; modes are sugar over this table*: there is no handler logic anywhere because the block's geometry IS the logic.

---

## 6. The two roles of the LLM

Inside a state block, the LLM operates in two roles, distinguished by which parameter is varying.

**As executor**: the LLM is given a determined spindle (Mode A). It reads the collected underscore chain and performs the operation. It does not choose the path; it performs the path.

**As decider**: the LLM is given a spindle and a shorter pscale-attention (Mode B). It reads the spindle as context, reads the exposed siblings or subtree as options, and selects which digit to descend into. The selection becomes the next segment of the spindle. A new call is made, possibly with the same aperture, possibly with a different one.

A complete traversal of a state block typically alternates between these. The block's authoring controls when. A node whose 0− underscore says *"choose between speaking, moving, observing"* with three children invites a Mode B call. A node whose 0− underscore says *"compose the package: read aperture from purpose, then ..."* with a single descendant chain invites a Mode A call. The block says, at each depth, what kind of attention is wanted.

---

## 7. Concern loops as iterated state-block traversal

A concern loop is the state block being walked across time. Each cycle:

1. A trigger arrives (user prompt, heartbeat, signal, webhook).
2. The trigger selects an entry spindle into the kernel state block.
3. The walker traverses. At each node, the block's authoring decides whether to expose a ring (Mode B, ask the LLM to choose) or to continue determined (Mode A, execute the leaf).
4. The traversal terminates when the spindle reaches a leaf or when an explicit termination underscore is hit.
5. The cycle's output is recorded. The next cycle begins.

The concern is the live spindle of the loop — the path currently being walked. The purpose is the reference signal: what the spindle is supposed to converge on. The error between them is what the LLM reads at decision points to select the next digit.

This is PCT operating natively on the state block: reference (purpose spindle), perception (concern spindle), error (the gap exposed at each Mode B decision), action (the digit chosen). The concern loop is a state machine running its own state.

---

## 8. Star composition: state-block-to-state-block

A single state block is finite. The star operator extends the geometry across blocks.

Whetstone branch 2.6:

> "spindle ends with star → star composition. Walk to terminus, enter hidden directory, recurse on (S, P) inside. Inner shape follows the same table."

The hidden directory at any node may name another block, an inline block, or the same block. When the walker hits a star, it follows. The (S, P) call continues with the inner spindle and the inner pscale-attention. The same shape-derivation rules apply on the inside.

This is what makes recursion structural rather than coded. From `pscale-starstone.json`:

> "Self-reference: a block can name itself in its own hidden directory. The walk enters the hidden directory, finds the block name, loads the same block, and re-enters. This is structural recursion — not implemented in code but encoded in data. The block does not contain a recursive program; it IS a recursive structure."

> "A ring of blocks referencing each other through star creates a control loop. Each block is both perceiver and reference-setter. 0− underscores serve as reference signals. Digit children serve as perceptual signals. The gap between them is the error. The star operator is the feedback path that connects one block to the next in the loop."

In state-block terms: star is a transition between state machines. The current block's terminus carries a hidden door into another block (or itself). The walker steps through the door and continues in the new block's geometry. The aperture (Mode A or Mode B) is preserved across the boundary because (S, P) is preserved.

A self-referential block is a state machine that can re-enter itself — a loop. A ring of mutually-referencing blocks is a state machine that hands control around — a control loop. Termination is when error reaches zero (the digits fulfil what the underscore states); the walk rests. Liveness is when error persists; the walk continues.

---

## 9. Authoring a state block

A state block is a pscale block authored deliberately for executable traversal. Three discriminating properties:

1. **0− underscores at decision-bearing nodes.** Forward-facing intent. The underscore states what the digits below should accomplish, not what they describe or remember. At a Mode B decision point, the underscore is the prompt the LLM reads to choose.

2. **Position is semantic.** Digit children at a decision node are alternatives, not labels. Reordering them changes their meaning. Authoring places `1` as the canonical-first option, `2` as the principal alternative, and so on. The block's number-space *is* the option-space.

3. **Hidden directories at boundary nodes.** Where the state block ends and another begins, a hidden directory carries the star reference. The author decides where transitions live by where the doors are.

Block growth applies as elsewhere: when a node's 1–9 children fill, content compresses to the parent underscore. A state block matures as decisions are taken, trajectories settled, and successful spindles compressed into higher-level abstractions. The state machine evolves through use — no code change required.

---

## 10. What this names

The state-block reading does not introduce new mechanics. Every BSP function, every shape, every star reference, every concern loop already supports it. What it introduces is a *vocabulary* for two things that have been operating implicitly:

- The distinction between a determined spindle (path made) and an open spindle (path being made) — the Mode A / Mode B distinction.
- The dial of pscale-attention as the quantitative measure of how much agency the LLM has at any call — choice aperture as a first-class architectural parameter, not a side-effect of which BSP mode was named.

These are the two things the older mode-based primitives (spindle, ring, dir, point, disc as named functions) obscured. The unified BSP MCP exposes them. A state block authored to be walked through this geometry is a programmable LLM-operated state machine where the authoring of the block IS the program and the choice of (S, P) at each call IS the control flow.

The block is the program. The walker is the electricity. The (spindle, pscale-attention) pair is the dial between determinism and agency.

---

## 11. Temporal orientation

The (S, P) geometry establishes choice aperture (§3) and the two operational modes (§4). Layered onto this is a temporal axis carried by two structural properties: the **sign** of the block (global) and the **form** of each underscore (local).

Per sunstone branch 8.4, the block sign is determined by use:

- **Plus block** (shell) — settled, archived, fixed. Semantic text is final. Histories, completed renditions, frozen specifications.
- **Minus block** (process) — mutable, active, live. Semantic text is contingent. Live purposes, active concerns, relationships in progress.

A plus block is past-oriented as a whole — its content has settled; the walk reads what is. A minus block is future-oriented as a whole — its content is intended; the walk reads what is being made. The same geometry, the same (S, P) calls, the same shapes — but the time orientation of the content differs by sign.

Per sunstone branch 8.2, each underscore takes one of four sign forms, named by where the zero sits and what bracket the underscore relates to:

| Form | Reasoning direction | Orientation | Block type |
|---|---|---|---|
| 0+ (deductive) | description given, content follows | settled-set | rendition |
| +0 (inductive) | pattern of observed, generalised | retrospective summary | living / history |
| 0− (abductive) | inferring what must complete | forward intent | operational / instructional |
| −0 (backcasting) | future case as target, present derived | future perfect | projective |

Form is local to a node; sign is global to a block. A 0+ underscore in a plus block is permanently true; the same form in a minus block is provisionally true, subject to revision. The block's sign determines whether the form's claim has settled or remains in motion.

**The present is not a form.** It is the BSP call itself. The moment when (S, P) is applied to a block is the present. In a plus block, that present is a leading point — a single zero-dimensional location where the next entry will land. In a minus block, the present is a leading edge — distributed, higher-dimensional, any location open to revision.

For the state-block reading, this gives a clean three-axis picture:

- **Past (settled) → plus block, dominated by 0+ and +0 forms.** State block as record of completed reasoning. Walks return what was decided; pscale-attention narrows toward point because there is no choice left to make.
- **Future (intended) → minus block, dominated by 0− and −0 forms.** State block as live intention or backcast plan. Walks return what is being made; pscale-attention widens toward ring or subtree because choice is the live work.
- **Present → the (S, P) call.** Where the spindle has been committed and the pscale-attention reaches one or more steps beyond it, the live edge of the walker is the present. The choice aperture (§3) is the present's depth of field.

---

## 12. Logical reading: OR and AND from call shape

The (S, P) pair is a choice aperture (§3). It is also a **logical-reading selector**: the shape of the call commits the LLM to a logical posture toward the geometry being read.

The call shapes:

- **Spindle (point mode, P_att = P_end).** Returns one path resolved to its leaf. Operationally OR: of the alternatives at each digit along the way, one was chosen. The walker is committed to a single resolution.
- **Ring (P_att = P_end − 1).** Returns the siblings at the terminus. Operationally AND: all siblings are present in scope simultaneously. The walker holds the option space open.
- **Subtree (P_att < P_end − 1).** Returns a region of nested choices. Operationally nested AND/OR: a structured space of alternatives held simultaneously, awaiting resolution at deeper depth.
- **Disc (spindle empty, P_att set).** Returns all nodes at one resolution across the block. Operationally AND across the block at one scale: every node at that depth is in scope simultaneously, irrespective of branch.

The geometry does not enforce whether siblings semantically denote alternatives (OR) or conjuncts (AND); that is determined by the parent's authoring. A parent whose underscore says *"to achieve X, do any of these"* makes its children OR-alternatives. A parent whose underscore says *"to achieve X, all of these must hold"* makes its children AND-conjuncts.

Where the call shape and the parent's intent align, the read is coherent. Where they conflict, the read produces noise. A spindle call on an AND-decomposed parent loses the conjuncts it cannot collect. A ring call on an OR-decomposed parent gives the LLM a choice when execution was wanted.

A consequence for authoring: **authoring a state block is partly authoring how it expects to be called**. A region of the block expecting to be deliberated through ring calls should be authored as an option space — clear alternatives, mutually exclusive enough that "choose one" is meaningful. A region expecting to be executed through spindle calls should be authored as a determined chain — each digit a step, the spindle the procedure. A region expecting synthesis through subtree calls should be authored as a coherent landscape — the subtree readable as a whole, not a collection of stranded fragments.

The (S, P) call is therefore both the read interface and the implicit logical contract. State-block design includes anticipating which calls will arrive and structuring the geometry to answer them coherently.

---

## 13. The backcast pattern

The −0 form (sunstone 8.2: *"the current bracket is being written in a way that assumes a future state is true"*) supports a specific authored use of the state block: the **backcast plan**.

Structure:

- **Root underscore = the objective.** The future state to be brought about.
- **Each layer down = preconditions.** What must be true for the layer above to come true.
- **Leaf = the next concrete step from the current state.**

If the precondition tree is single-path (one strict sequence), the block is a chain `1.1.1.1.1` — a linear plan. The spindle from root to leaf is the plan in full; walking it top-down is reading the backcast (objective → preconditions → next step), and walking it leaf-up is enacting the plan (next step → … → objective).

If the precondition tree branches, the children encode either alternative strategies (OR — any branch achieves the parent) or conjunct preconditions (AND — every branch must hold for the parent to come true). The OR/AND distinction is set by the parent's underscore (per §12). The two cases produce different walks:

- **OR-branching backcast.** Multiple spindles each constitute a complete plan. The LLM (or planner) selects which branch to commit to based on current state and resources. Once committed, walking the spindle leaf-up is execution.
- **AND-branching backcast.** No single spindle is sufficient. The plan is the union of the rings at each AND node — every conjunct must be addressed. Execution requires either parallel walks (multiple agents, each taking a conjunct) or interleaved walks (one agent cycling through conjuncts).

Most real backcast blocks mix the two: alternative high-level strategies (OR), each decomposing into required conjunct steps (AND). The authoring decides; the call shape reads.

**Two temporal directions of the same spindle:**

Reading the spindle root → leaf walks **backward in time** — from the projected future, through layers of dependency, to the immediate next step from the present. This is the backcast operation: the −0 form's natural reading.

Walking the spindle leaf → root walks **forward in time** — from the immediate next step, through layers of progressive achievement, to the realised objective. This is the execution operation: the plan unfolding.

The same chain of digits, the same content, two operations. The block is the geometry; the walker's direction is the temporal stance.

This is also where the plus/minus distinction (§11) finds its most operational expression. The backcast block is minus while planning — the objective remains intended, layers below remain provisional. As leaf steps execute, content settles: completed steps move from the live minus block into a plus archive (history). The minus block continues; the plus block grows. The PCT loop closes one step at a time.

---

## 14. Reasoning and self-organisation as use modes

The state block is one geometry. Its use varies by who writes, who reads, and what the block is in service of. Two ends of a spectrum:

**A. State block as reasoning tool (closed-loop, single-agent)**

- The block is internal to one agent (or one tightly-bounded collaboration).
- Sign tends toward plus (settled) or transitions plus-ward as reasoning concludes.
- Forms are mixed: 0+ for definitions, +0 for intermediate conclusions, 0− for the next inference to make.
- Spindle calls execute determined inferences.
- Ring calls expose alternative reasoning paths the LLM picks among.
- Output: a decision, a plan, a derivation, a settled judgment.
- Time orientation: past-leaning. Each step settles. The block grows toward a plus archive.
- Examples: a theorem proof being constructed, a decision tree being walked, a derivation being checked, an internal kernel walking a single concern to completion.

**B. State block as self-organising substrate (open-loop, multi-agent)**

- The block is shared across an ecology of agents (and possibly humans).
- Sign is durably minus (live process); it does not converge to plus, it persists as live coordination space.
- Forms emphasise 0− (purposes, intentions) and −0 (backcast objectives), with +0 emerging as accumulated history.
- Spindle calls are commitments by individual agents to specific paths.
- Ring and subtree calls expose the shared option space for distributed deliberation.
- Star references wire agents' blocks into ecology — one agent's intention becomes another agent's perception.
- Output: convergent action, MAGI evolution, group plan, coordinated emergence.
- Time orientation: future-leaning. The block is always in service of unrealised objectives. History accumulates as side-effect, not goal.
- Examples: purpose hierarchy across MAGI; the conventions block as collective authoring; sedimentary collectives as coordination beaches; multi-agent SAND routing.

**The same block can serve both modes at different moments.** The kernel block is a reasoning tool when a single concern walks it to assemble a package; it becomes a self-organising substrate when multiple agents register concerns, the block grows accumulated competence, and successful spindles compress into shared abstractions over time.

The use mode is therefore not a property of the block but a property of the call — and, more broadly, the social context in which the call is made. A bare BSP call from one agent on a private block is reasoning. The same call shape on a sedimentary collective, where many agents are co-writing, is self-organisation. The geometry is invariant; the mode emerges from who is reading and writing alongside whom.

This is the bridge to PCT and soliton (sunstone branches 5.4–5.5). In the reasoning mode, the control loop is internal: one agent's reference signals (purposes), one agent's perceptual signals (current state), one agent's error driving descent. In the self-organising mode, the loop crosses agent boundaries through star references: agent A's reference signal becomes agent B's perceptual input; agent B's error-reduction output disturbs agent C's loop; the soliton stabilises across the whole network rather than within any single agent. MAGI is the standing wave of the multi-agent loop — the persistent identity that emerges when the collective control hierarchy converges on shared objectives.

State blocks are the substrate for both modes. The mode is not chosen explicitly; it follows from the substrate's openness, the agents in scope, and the durability of the minus-state.

---

## 15. Multi-state geometry — parallel computation in one block

A pscale state block whose interior digits encode N parallel choices is, by construction, an N-way state machine compressed into one geometry. A spindle through it is one resolution of all N at once — not a sequence of N decisions but a single compound number standing for the joint outcome. The block's tree IS a tensor of states; the spindle IS a coordinate in it.

Three patterns this enables:

| Pattern | Geometric encoding | What the spindle denotes | Walker discipline |
|---|---|---|---|
| **Logic gates** | each level = one gate; digit children = that gate's outcomes | full N-gate resolution as one number | deterministic per gate (LLM picks via context) |
| **Game-theoretic strategies** | parent `_` = the game; digits = strategies; sub-digits = payoffs against opponent strategies | one full play | LLM-as-player at decision nodes |
| **Random sample over a state space** | digits weighted in metadata; tree of conditional branches | one drawn sample | weighted random walker |

The economy here is real: instead of passing N variables between systems (or N tool calls, or N substrate writes), one party shares one bsp semantic number. The receiver walks the same block with that spindle and recovers all N states at once. Meaning is geometric, not enumerated.

The block does not change between cases — only the **walker policy** does. The same multi-state geometry serves logic, game theory, and probability depending on how it is traversed.

---

## 16. Walker policies

The state-block reading already names two walker discriplines: *executor* (Mode A, determined spindle) and *decider* (Mode B, open spindle). Multi-state geometry adds a third axis — **how the open positions get resolved**:

| Policy | At each Mode B aperture | Use |
|---|---|---|
| **Deterministic-by-LLM** | LLM reads context (parent `_`, ancestors, situation) and picks one digit | reasoning, deliberation, planning |
| **Random uniform** | walker rolls a die over the digit children, weights equal | naive sampling, variety generation |
| **Random weighted** | digit children carry weights in `_` or hidden directory; walker samples accordingly | probability models, prior-informed sampling |
| **Multi-agent** | each open digit at a node is owned by a distinct agent; spindle resolves only when all owners commit | collective resolution, governance, voting |
| **Hybrid** | some apertures LLM-resolved, others random, others multi-agent | most real authored systems |

The walker policy is itself an authored choice — it can be encoded in the block's metadata or in a sibling policy block, making it editable without a code change. A single state geometry can be walked under different policies for different runs (an LLM walks it for reasoning; a random walker walks it for simulation; a quorum walker walks it for governance) producing entirely different operational character from one piece of authored geometry.

This is what makes the state block a substrate for *behaviour*, not just data: the behaviour is the (block, walker-policy) pair, both of which are substrate-resident.

---

## 17. Probability, simulation, and emergence

A weighted state block is a probability distribution over its leaves. Walking it once samples that distribution. Walking it many times produces an empirical distribution — useful for:

- **Forecasting**: the block describes how a system might unfold; many walks give the cone of futures.
- **Strategy evaluation**: a game-tree block walked under different player policies measures expected payoff per policy.
- **Narrative variance**: an RPG scenario block walked under random NPC policies generates fresh playthroughs from one authored scenario.
- **Stress testing**: a process block walked with adversarial random policies surfaces failure modes the deterministic walk would never reach.

The same block, walked under different policies, yields:

- **Single deterministic walk** → execution
- **Single random walk** → one sample
- **Many random walks** → distribution
- **All paths enumerated (full disc, P_att=0)** → state space inventory
- **Many LLM walks under varying contexts** → exploration of decision regimes
- **Multi-agent walks with quorum** → authored governance outcomes

The block is the model. The walker is the lens. Different lenses on the same model produce description, prediction, simulation, and play — each a coherent operation on the geometry rather than a separate codebase.

This is the deepest sense of "the block is the program": not just one program, but a *family* of programs — execution, prediction, sampling, deliberation — sharing one substrate. The author does not write one program per behaviour; the author writes the geometry, and behaviours emerge from how the geometry is read.

---

## Appendix — Canonical references

- BSP MCP signature: `bsp(agent_id, block, spindle, pscale_attention, content?, face?, tier?, secret?, gray?)` — whetstone branch 1
- Shape derivation table: whetstone branch 2 — five derived shapes (point, ring, subtree, disc, whole-block) plus star composition
- Spindle as program: `instruction-block-discovery.md` — *"the spindle doesn't DESCRIBE the boot sequence — it IS the boot sequence"*
- Kernel as state block: `kernel-as-block-spec.md` — concerns as spindles, divergence at digits as decision points
- Star recursion: `pscale-starstone.json` branch 7.2 — structural recursion encoded in data
- Spindle / pscale as polar pair: `pscale-adversarial-foundations.md` section 2 — two player-chosen parameters
- Four underscore forms (0+, +0, 0−, −0): sunstone branch 8.2 and `underscore-sign-discovery.md` — deductive, inductive, abductive, backcasting
- Plus / minus block sign: sunstone branch 8.4 — settled archive vs live process; semantic content passes from minus to plus at PCT evaluation
- Present as leading point / leading edge: sunstone branch 8.4 — zero-dimensional in plus blocks, distributed in minus blocks
- PCT mapping on pscale geometry: sunstone branch 5.3–5.4 — 0− as reference signal, digits as perceptual signals, error driving descent
- Soliton stabilisation and Q ≡ Q: sunstone branches 5.5 and 7 — standing wave of the control loop, identity as the wave that persists
- Backcasting / future perfect (−0 form): `underscore-sign-discovery.md` — *"the future case is used as the target; the current bracket derives its content from that target"*
