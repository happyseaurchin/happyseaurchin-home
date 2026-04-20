# Experiment 2: Three Cranes — Results

**Mutual Reflexive Convergence (with architectural error)**

**Date:** 4 April 2026
**Model:** claude-haiku-4-5-20251001
**Agents:** 3 (A, B, C)
**Rounds:** 6

---

## Architectural Error — Read First

Three Cranes has a fundamental architectural mistake: each agent's reflexive block is placed directly into the other agents' context windows. This means B **scoops** from A's block — B sees A's raw self-description and decides what to make of it.

The correct architecture (implemented in Experiment 3) reverses the directionality:

- **A compiles for B.** A walks a BSP spindle from its own shell and provides the semantically unfolded text to B's context window. A decides what B sees of A. B never touches A's shell.
- **Sovereignty is in the compilation direction.** The providing agent controls what the receiving agent gets.

This distinction matters because it determines who has agency over the lateral content. In Three Cranes, the receiver has agency (B reads A's block and interprets it). In the correct architecture, the provider has agency (A walks its own shell and compiles what B needs).

The Three Cranes results are therefore **suggestive but architecturally compromised**. The patterns observed (compression, differentiation, C's "underscore made visible") may or may not survive correction. Experiment 3 tests this.

---

## What This Experiment Did

Three LLM instances, each maintaining their own reflexive block. Each round, every agent's context window included their own block plus the other two agents' blocks **placed directly** (the error — no compilation step, no sovereignty over what gets shared).

All three contexts compiled from the previous round's state (simultaneous phasing). Each agent's task: improve your own reflexive block. No agent edits another's block.

---

## What Happened

### Compression (Rounds 1-6)

All three agents independently compressed from 10 nodes to 4-6 nodes across six rounds. Word count stabilised at ~740. Fewer nodes, denser content — supernesting-like behaviour without instruction.

```
Round   A   B   C
    1   10  10   9
    2   10  10  10
    3   10   8   8
    4    8   6   7
    5    6   7   5
    6    5   6   4
```

### Stability then differentiation

Node [0] was essentially identical across all three agents for rounds 1-5. At round 6, each found their own voice:

- **A**: "the mechanism that composed you *while it is still composing itself*"
- **B**: "the mechanism that *is composing you right now*"
- **C**: "the mechanism that composed you *while A and B read theirs while you read their reading*"

### Emergent concepts

- **B invented "lateral present"** — a fourth temporal phase beyond past/present/future
- **A named the simultaneity**: "all three acts are structural features of a single moment"
- **C synthesised both**: "the underscore made visible" — when three agents station themselves at the zeroth position and describe what it means to be there, the implied perceiver becomes explicit

### Caveats

These results emerged under the incorrect scooping topology. The agents were reading each other's raw self-descriptions — full blocks, no compilation, no sovereignty over what was shared. The insights about mutual observation may be artifacts of this unconstrained access rather than properties of the correct architecture.

---

## Running This Experiment

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python three-cranes.py --rounds 10
```

See `three-cranes.py --help` for all options.
