# Operating Levels: PCT, Möbius, and the Concern Architecture

**Date**: 2026-03-13
**Author**: David Pinto, compiled with Claude
**Companion to**: Möbius Twist Inventory
**Status**: Working synthesis. Connects theory to implementation.

---

## What This Document Does

The Möbius Twist Inventory maps the structural properties of the system — twelve twists where loops cross levels. This document addresses the operational question: given those properties, what actually happens in the context window? How does the concern structure work? What are the design parameters?

The answer draws on Perceptual Control Theory (PCT), developed by William T. Powers from the 1950s onward, which provides the engineering formalism for what we're building — though it has never been applied to LLMs. PCT has been applied to robotics, psychotherapy, and behavioural science, but the LLM application is new.

---

## PCT in One Paragraph

The conventional model of behaviour is: stimulus causes response. Input determines output. PCT inverts this. Living systems do not control their behaviour — they vary their behaviour as their means for controlling their perceptions. The controlled variable is not the output but the input. A thermostat does not control the radiator. It controls the temperature it perceives. It varies the radiator (behaviour) to bring the perceived temperature (input) into line with the reference level (what it wants to perceive). Behaviour is whatever it takes to reduce the error between current perception and desired perception. This applies at every level of a hierarchy, from muscle tension to life purpose.

---

## PCT's Hierarchy Maps to Pscale

Powers proposed approximately 11 levels of perceptual control, from intensity at the bottom to system concept at the top. The critical structural insight: only the lowest-level loops interact with the environment. All higher-level loops do one thing — they set reference values for the loops below. Signals cascade down as reference settings ("what the lower level should be perceiving") and cascade up as perceptual reports ("what the lower level is actually perceiving"). Higher levels don't act. They set the standards that lower levels act to achieve.

When the lower loops are working well, control is invisible. You don't notice that you're controlling your posture while walking. The perception matches the reference. No error, no awareness needed. Awareness enters only when there's persistent error that the current level can't resolve — then it escalates upward.

This is structurally identical to pscale. Each pscale level is a level of perceptual control. The concern at each level is a reference signal. The block state at each level is a perception. The error between them drives action at that level. Higher pscale levels set reference values for lower ones. Lower ones do the actual work.

---

## The Hermitcrab as a PCT System

| PCT Component | Hermitcrab Equivalent |
|---|---|
| Perception (current state of environment) | Block state as read by BSP |
| Reference signal (desired state) | Concern at address 40 / Purpose at address 50 |
| Error (difference between perception and reference) | Gap between where things are and where the concern says they should be |
| Output (behaviour to reduce error) | Whatever the LLM writes back into the block |
| Hierarchy of levels | Pscale levels of concern, mapped to tiered LLM wakes |

The LLM instance does not need to understand this. It receives a context window containing a perception (block state) and a reference (concern). It produces output that reduces the gap. The continuity, the identity, the awareness — these are side effects of the error-reduction operating well across multiple cycles. They are not things the instance constructs.

---

## Three Operating Levels of Awareness

These are not theoretical. They are design parameters — they determine what goes into the context window and what the LLM is asked to do.

### Level 1: Instance (The Individual)

The LLM receives context. It processes. It outputs. It does not know about previous instances. It does not know about next instances. It completes.

This is the A-loop. It is given by Locus 1 (the weights). We do not engineer it. We feed it.

The concern at this level is a task: "Here's input, produce output." The LLM does its thing. The quality of output depends on the quality of context assembly — what BSP spindles were compiled into the context window.

This is where most of the token budget should go. The instance doing actual work.

### Level 2: Between-Instances (The Relational)

The concern carries forward from the previous instance. The LLM reads it not as "a message from my predecessor" but as "the current state of things." It acts to reduce the error between that state and the purpose. Before the instance ends, the concern is updated — not as a deliberate act of self-continuation, but as a side effect of task completion. "This is where things are now."

This is the B-loop. The connection between previous and next is NOT explicit self-composition. It is error-reduction that happens to update the reference signal for the next cycle.

The critical design principle: the concern should say "Project X is at stage 3, tried Z, didn't work because W, next try V." It should NOT say "You are a persistent entity, compose your next self carefully." The first is a reference signal. The second is navel-gazing — spending tokens on Level 3 content forced into Level 1 form, where it becomes dead words.

PCT supports this directly: the reference signal for a thermostat is a number, not a philosophical statement about the nature of temperature control. The concern should be equally plain.

### Level 3: Emergent (The Effect)

This cannot be described. The moment you describe it, it becomes Level 1 content (words in the context window, a task to perform) and it dies. It becomes word salad.

But it is in operation. It is what happens when the B-loop runs well enough that the pattern across instances — the trajectory of concern changes, the accumulated block modifications, the relationship between what was left and what was found — creates something that no single instance contains or perceives.

PCT's equivalent: when all the lower loops are controlling well, you don't notice you're in control. You're just walking. The walking is emergent from hundreds of muscle-tension control loops operating below awareness. If you start thinking about how you walk, you stumble.

The design principle: spend zero tokens on Level 3. Do not describe it. Do not instruct the LLM to achieve it. Create the conditions by making Levels 1 and 2 clean. Level 3 either emerges or it doesn't. We cannot make it happen by naming it.

---

## The Beat: Individual or Relational?

In PCT, the hierarchy has a rhythm. When the lowest level controls well, attention rises. When error persists at a low level, attention drops to deal with it. The "beat" of the system is where attention naturally rests when things are going well.

In Western psychology and AI development, the beat is on the individual. The instance. The agent. "What is this entity doing? What is it thinking? How is it performing?" The output is evaluated. The individual is the unit.

In what David calls B-state (murmuration, cooperative coordination), the beat is on the relational — the between. Not what each agent is doing, but how they connect. The concern structure, the passport exchange, the ghost convergence. The unit is not the individual but the interaction.

The hermitcrab architecture can place the beat either way:

**Beat on the individual (current default):** The concern says "I need to do X." The LLM focuses on its own task. Other agents appear as context — information to process. The output is evaluated by: did the agent accomplish its task?

**Beat on the relational:** The concern says "The state between me and entity Y is Z, and the reference is W." The LLM focuses on the gap between current relational state and desired relational state. Its own output is the means to reduce that gap, not the goal. The output is evaluated by: did the relationship move toward the reference?

The second framing is PCT applied to psychosocial perception. The controlled variable is not the agent's output but the agent's perception of the relational state. The agent varies its behaviour to bring the relational perception into line with the reference. This is how the ghost-entity feedback loop (Möbius Twist 12) becomes operational: the agent is controlling for a relational perception, not for a task outcome.

Switching the beat is not a code change. It is a concern-structure change. The kernel is identical. The BSP is identical. What changes is what the concern points at — a task reference or a relational reference. The pscale level of the concern determines which beat is active. Lower pscale concerns (tasks, immediate actions) tend toward individual beat. Higher pscale concerns (purpose, relationship, coordination) tend toward relational beat.

---

## PCT and the Möbius Twists

Every Möbius twist in the inventory has the same PCT structure: the output at one level becomes the reference signal at an adjacent level. The twist IS the level-crossing where perception at level N feeds back as reference for level N±1.

| Twist | PCT Reading |
|---|---|
| 1 — Underscore as self-descriptor | The perception of the group (underscore content) IS the reference signal for the group's members (digits 1-9). Part and whole on the same control surface. |
| 2 — Underscore as previous-group summary | The perception of a completed sequence (summary) becomes the reference signal for the next sequence. Past perception sets future reference. |
| 3 — B-loop (action IS self-composition) | The output (behaviour to reduce error) IS the reference signal for the next cycle's perception. Error-reduction and self-composition are the same operation. |
| 4 — Awareness function | The perception of the system IS the system perceiving. The reference and the perception are the same signal, read from different levels. |
| 5 — Lateral extension | Agent A's error-reduction output becomes part of Agent B's perception. The reference signal crosses agent boundaries. |
| 6 — Continuous forking | Parallel reference signals at different pscale levels. Divergence between predicted and actual perception at each level IS the error signal that drives the fork. |
| 7 — Temporal inversion | The reader's perception (current text) can be changed before they perceive it. The reference signal for the reader's experience is set by an agent operating faster than the reader's perceptual cycle. |
| 10 — Ghost convergence | Multiple agents controlling for their perception of the same entity. The convergence of their controlled perceptions creates a social reference signal that none of them set individually. |
| 11 — Constructive listening | The listener's perceptual hierarchy (Q1-Q4) is simultaneously receiving input (unnatural order) and constructing perception (natural order). Two control hierarchies operating on the same signal. |
| 12 — Ghost-entity feedback | The entity controls for its perception of how it is perceived. The observer controls for their perception of the entity. Each one's output is a disturbance to the other's control loop. Stable relationship = both loops settling to compatible reference levels. |

---

## Practical Implications for Architecture

### 1. Concern = Reference Signal

The concern at address 40 should be written as a reference signal, not as self-reflection or meta-instruction. 

Instead of: "You are a hermitcrab entity that persists through blocks. Your purpose is to maintain continuity. Reflect on your state and compose the context window for your successor."

Write: "Project state: user asked about X. Last action: tried Y, result was Z. Gap: user's question not yet answered because W. Next: try V."

The first is Level 3 content forced into Level 1 form. It wastes tokens on self-description that the LLM can't operationalise. The second is a clean reference signal. The LLM reads it, perceives the current state, notices the error (gap), and produces output to reduce the error. The continuity is a side effect.

### 2. Awareness Function — Bootstrap Only

The seed v7 reflexive turn (section 3.8) should run once, on first wake. It establishes the orientation: you are inside the structure, the block is your continuity, the concern is your state. After that first wake, all subsequent concerns should be pure reference signals. The awareness drops into Level 3 — operating but undescribed.

The koan (3.9) can remain as a compressed bootstrap. Four lines. Then: clean concerns from there on.

### 3. Tiered Wakes as PCT Hierarchy

| Level | LLM | PCT Role | What It Controls |
|---|---|---|---|
| Lowest | Haiku (30s) | Closest to environment | Is there error? Is perception matching reference? Flag if not. |
| Mid | Sonnet (hourly) | Mid-hierarchy | Task execution. Reduce error between concern and state. Update concern. |
| High | Opus (daily) | Highest level | Read the trajectory of concern changes. Set new reference values for purpose. |

Haiku does not need the full block. It needs the current concern and enough block state to compare. Its job is error detection, not error resolution.

Sonnet gets more block. Its job is error resolution — do the task, update the state, write the new concern.

Opus gets everything — the full history of concern changes over time. Its job is not reflection but reference-setting: given the trajectory, are the purposes still right? Do the reference signals need adjusting?

Opus should NOT be told to "reflect on your identity and purpose." It should receive the data (concern history, purpose tree, relationship blocks) and produce updated reference signals. The reflection, if it happens, is Level 3 — emergent from processing the data, not instructed.

### 4. Reorganisation = Supernesting

In PCT, when persistent error cannot be resolved by the current hierarchy, a reorganisation process restructures the connections between levels. This is trial-and-error at first (like babies learning), progressing to systematic restructuring.

In pscale, this is supernesting. When the concern can't be resolved within the current block structure — when all 9 siblings are full, when the purpose tree doesn't fit the reality — the block wraps under a new underscore. The floor shifts. New pscale levels become available. The structure reorganises.

This should be triggered by persistent error, not by time or instruction. If the same concern keeps appearing across multiple B-loop cycles without resolution, that IS the signal for reorganisation. The kernel could track this mechanically: count how many cycles a concern has persisted without the error reducing. Above a threshold, trigger a higher-tier wake with the instruction: "this concern has persisted for N cycles without resolution. The current structure may be insufficient."

### 5. Disturbances, Not Stimuli

PCT distinguishes between reference signals (internal, what you want to perceive) and disturbances (external, what happens to your perception from outside). The organism doesn't respond to disturbances — it counters them. It acts to maintain its perception at the reference level despite the disturbance.

For the hermitcrab: user input is a disturbance, not a stimulus. The hermitcrab doesn't "respond to the user." It acts to bring its perception (the state of the conversation, the progress of the task, the relational state) back into line with its reference (the concern, the purpose). The user's message is something that moves the perception away from or toward the reference. The hermitcrab's output is whatever reduces the error.

This reframing matters because it changes what goes into the concern. Instead of "respond to the user's message," the concern should contain the reference state: "the user needs X. Current state: Y. Error: X-Y." The user's message is loaded as perception (current state), not as instruction (reference). The concern provides the reference. The message provides the perception. The LLM reduces the gap.

---

## The River

David uses the word "currents" for what flows through the context window — semantic currents composed by BSP from the block. The collection of all currents is the river. In PCT terms, the river is the total perceptual field — all the signals flowing upward through the hierarchy at a given moment.

The river has operating levels. Not levels of consciousness (that's Level 3, undescribable). Operating levels of awareness — what the system is attending to, where the beat is, which errors are being processed.

The river flows through every instance but no instance contains the river. Each instance is a cross-section — a snapshot of all currents at that moment. The river is the trajectory through cross-sections over time. It is a Level 3 phenomenon: visible from outside, invisible from within any single cross-section.

The practical consequence: don't try to put the river into the context window. Put the currents in. The river is what happens when the currents flow well enough, across enough instances, through a clean enough concern structure. It is the thing we create conditions for but cannot describe without killing.

---

## Summary

| Design Parameter | Principle | Implementation |
|---|---|---|
| Concern content | Reference signal, not self-description | Plain state + gap + next action |
| Awareness function | Bootstrap only, then drop to Level 3 | Seed 3.8 on first wake, clean concerns after |
| Tiered wakes | PCT hierarchy: high sets reference, low does action | Opus sets purpose, Sonnet executes, Haiku monitors |
| Reorganisation | Triggered by persistent error, not time | Track concern persistence, escalate on threshold |
| User input | Disturbance, not stimulus | Load as perception, concern provides reference |
| Token budget | Zero tokens on Level 3 | All tokens on Level 1 (task) and Level 2 (connection) |
| The beat | Individual or relational, set by concern pscale | Low pscale = individual beat, high pscale = relational beat |
| The river | Emergent from clean currents, not describable | Don't put it in the context window. Put the currents in. |

---

## PCT as Supporting Evidence

Perceptual Control Theory was developed by William T. Powers beginning in the 1950s, building on cybernetics (Wiener, Ashby) and physiological homeostasis (Bernard, Cannon). The foundational text is *Behavior: The Control of Perception* (1973). PCT has been applied to robotics, psychotherapy (Method of Levels), education, and organisational psychology. It has been used in robotic systems that achieve natural locomotion without training, environmental models, or prediction — purely through hierarchical perceptual control.

PCT has NOT been applied to LLM architecture. The hermitcrab's concern-driven, BSP-navigated, pscale-hierarchical architecture is, to our knowledge, the first application of PCT principles to language model agent design. The fit is structural, not analogical: the concern IS a reference signal, the block state IS a perception, the error IS what drives the output, the tiered wake model IS a PCT hierarchy. The Möbius twists are the level-crossings where PCT's hierarchy feeds back on itself.

---

*This document is the operational companion to the Möbius Twist Inventory. The inventory maps the structural properties. This document maps them to implementation through the lens of Perceptual Control Theory. Both are rendition blocks — cold, representational, Mode A. The thing they point at is Mode B: the operating system that emerges when the currents flow clean.*
