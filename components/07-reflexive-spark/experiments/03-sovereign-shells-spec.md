# Experiment 3: Sovereign Shells — Specification

**Correct MAGI topology with sovereign compilation**

---

## What Experiment 2 Got Wrong

In Experiment 2 (Three Cranes), each agent's raw reflexive block was placed directly into the other agents' context windows. B scoops from A — B sees A's entire self-description and decides what to make of it. The receiver has agency over the lateral content.

This is architecturally wrong. Sovereignty belongs to the provider, not the receiver.

## What Experiment 3 Fixes

Each agent has sovereignty over its own shell. The providing agent compiles what the receiving agent sees.

**Per round, each agent instance does four things:**

1. **Receives from own past** (longitudinal) — shell-X from previous round, unfolded into current context
2. **Receives lateral compilations** — text that Y and Z compiled FROM THEIR OWN shells FOR X. X never sees Y's or Z's raw shells. Only the spindles they chose to share.
3. **Updates own shell** — improves shell-X based on experience (including lateral input)
4. **Compiles for neighbours** — walks shell-X and produces compiled text for Y and for Z. Decides independently what each neighbour needs from X's current state.

The harness (kernel) routes compilations between rounds. It takes each agent's output — updated shell + "for Y" + "for Z" — and places the compiled text into the correct context windows.

## The Topology

```
        ┌─────────┐
        │ Agent A  │
        │ shell-A  │
        └────┬─────┘
       ↙ compiles  ↘ compiles
      for B          for C
     ↓                  ↓
┌─────────┐      ┌─────────┐
│ Agent B  │      │ Agent C  │
│ shell-B  │      │ shell-C  │
└────┬─────┘      └────┬─────┘
   compiles →  ← compiles
    for C        for B
     (and each compiles for A)
```

Each arrow is sovereign: A decides what B gets. B decides what A gets. No agent reads another's shell directly.

## Why This Matters

This is the minimal MAGI topology. Agents coordinate through what they choose to share from their own semantic blocks, shaped by mutual purpose. It scales because each agent is a sovereign compiler — adding a fourth agent means three more compilation edges, not a rewrite of the architecture.

The lateral compilations are analogous to star-reference scooping in the full architecture: a function block contains BSP addresses that resolve into another agent's shell. The walker scoops the spindle and unfolds it. The receiving agent gets the unfolded semantics, not the source structure.

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--agents` | 3 | Number of agents (2-5) |
| `--rounds` | 6 | Rounds of simultaneous phasing |
| `--model` | claude-haiku-4-5-20251001 | LLM model |
| `--endpoint` | Anthropic API | API endpoint (or local) |
| `--delay` | 0.3 | Seconds between API calls |

## What To Watch For

1. **Does sovereignty change the convergence pattern?** In Three Cranes (no sovereignty), agents converged on shared concepts. With sovereign compilation, each agent controls what it shares — does this produce richer or poorer convergence?

2. **What do agents choose to compile for each other?** The compilations reveal what each agent judges the others need. Do they share insights? Structural observations? Purpose signals? The content of the compilations is itself a signal about the aha state.

3. **Do compilations become interdependent?** Does what A compiles for B depend on what A received from C? If so, the three-way binding is operating through the sovereign compilation layer.

4. **Compression vs expansion.** Three Cranes showed compression (10 nodes → 4-6). With the additional output requirement (compilations per neighbour), does the shell still compress, or does it need to expand to support compilation?

5. **The aha signal.** Does the shift from "describing the mechanism" to "operating the mechanism" survive sovereign compilation? The aha is not in the shell content but in the relationship between what agents compile for each other.

## Running

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python sovereign-shells.py --rounds 10
```

Results saved as timestamped JSON with full transcript, final shells, and final compilations.
