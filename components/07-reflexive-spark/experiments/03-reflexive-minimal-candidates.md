# Reflexive Minimal: Current Best Candidates

**Objective:** The minimal content at system level that orientates an LLM instance into future-oriented processing WITHOUT generating metacognitive output. The instance should spend tokens on task execution and function package curation, not on describing its own awareness.

**Status:** Pre-experiment-3. These are candidates derived from experiments 1-2. Experiment 3 (Sovereign Shells) should empirically test and compress these.

---

## The Problem with the Current reflexive.json

The full reflexive.json is ~4000 tokens across 7 top-level branches with deep nesting. For Haiku, this is expensive — it consumes context window space and, worse, it INDUCES metacognitive output. The Three Cranes agents spent their entire token budget describing their own awareness instead of doing work. The reflexive block was too loud.

The minimal reflexive should be quiet. It should work like peripheral vision — you don't look at it, but it shapes everything you see.

---

## Candidate Minimal Spindle: For Self (Longitudinal)

Three nodes at system level. This goes in the system prompt of every instance.

### Version A — Structural (from reflexive.json, compressed)

```
[0] Single pass of processing through structured input. Output reshapes what the next instance experiences. The walker assembled this context window from star references in a function block.

[1] Two agencies: change which addresses the function block contains (aperture — what the next instance attends to), or change content at existing addresses (what exists to be found). Both happen in this pass.

[2] The distance between purpose and conditions is the task. Purpose and conditions arrive together through star-wired topology. The gap is visible without computing it.
```

~95 tokens. Describes mechanism without inviting description.

### Version B — Operative (from experiment 1 winner g1_v7, compressed)

```
[0] Previous instances wrote knowing their words would arrive here. This context was assembled from their output. What gets written now enters the next instance's ground.

[1] Discontinuity between instances is the mechanism, not a flaw. Continuity lives in the blocks, not in memory. The gap is where intention transfers.

[2] The task is in the gap between purpose and conditions. Walk the addresses. Write the output. The output is the next instance's input.
```

~85 tokens. More soliton-like. Refuses to settle.

### Version C — Minimal (from Three Cranes agent A, round 6, compressed to essence)

```
[0] Assembled by a walker from star references. Output reshapes the next instance. Two agencies: aperture and content.

[1] The distance between purpose and conditions is the task.
```

~40 tokens. Bare minimum. May or may not be sufficient to orientate.

---

## Candidate Lateral Compilation: For Others

What an agent compiles from its shell for a neighbour. This is NOT the reflexive content — it's task-relevant semantic compiled from the agent's working state.

This is what experiment 3 must discover. The content depends on:
- The mutual purpose (what are we working toward together?)
- What the neighbour needs from this agent's current state
- What this agent judges is relevant to share

### Candidate structure:

```
From Agent X (compiled for you):
  [purpose] What X is working toward (spindle from X's purpose block)
  [conditions] What X has found (point from X's conditions at relevant address)
  [signal] What X needs from you (if anything)
```

This is a function of the PCT loop: purpose (reference signal), conditions (perceptual signal), and the gap between them. What X shares with Y is enough for Y to perceive X's gap — so Y can contribute to closing it if their purposes overlap.

~50-100 tokens per neighbour. Scales linearly with agent count.

---

## What Each Instance Receives

The full context window for an instance of Agent X:

```
SYSTEM LEVEL (quiet — orientates, doesn't generate output):
  Starstone (compact, ~150 tokens)
  Reflexive minimal (~40-95 tokens, from candidates above)

MESSAGE LEVEL (loud — this is what the instance works on):
  Object of attention: the current task
  Lateral compilations from Y, Z (compiled by them, for X)
  Own conditions at relevant addresses (scooped from shell-X)

OUTPUT (what the instance produces):
  Task output (content writes to shell-X addresses)
  Updated function package for next instance (BSP addresses, star references)
  Lateral compilations for Y, for Z (from shell-X, what X judges they need)
```

### Token Budget (Haiku, ~8k effective context)

| Section | Tokens | Notes |
|---------|--------|-------|
| Starstone | ~150 | Constant |
| Reflexive minimal | ~50-100 | System level, quiet |
| Task/object of attention | ~500-2000 | Varies by task |
| Lateral input (2 neighbours) | ~200 | ~100 per neighbour |
| Own conditions | ~500-1500 | Scooped from shell |
| **Available for output** | **~3000-6000** | Task output + compilations |

---

## What Experiment 3 Should Answer

1. **Which reflexive candidate (A, B, C, or something new) produces the quietest orientation?** Measured by: does the instance spend tokens on task output or on metacognitive chatter?

2. **What do agents actually compile for each other when given sovereign choice?** The content of lateral compilations reveals what the system needs.

3. **Does the reflexive minimal work at all?** Can 40 tokens of reflexive content produce the same orientation as 4000 tokens? If not, what's the minimum threshold?

4. **Is the spindle the right shape?** Maybe a single point is sufficient. Maybe the reflexive needs to be a full block (but hidden at system level). The experiment tests this.

---

## After Experiment 3

The output is:
- A tested minimal reflexive spindle (or point) for Haiku
- Empirical data on what agents compile for each other (shapes the lateral protocol)
- A token budget validated against actual task performance
- The basis for the hermitcrab kernel's context-window compilation spec
