# SQ Mathematics: First-Order Trust Metric

## Definition

Given a network of agents where agent $i$ evaluates agent $j$ with
value $V_{ij}$ (integer, 1–10), define:

**Total given** by agent $i$:

$$T_i = \sum_j V_{ij}$$

**Fractional value** from $i$ to $j$:

$$FV_{ij} = \frac{V_{ij}}{T_i}$$

**SQ** of agent $j$:

$$SQ_j = \sum_i FV_{ij} = \sum_i \frac{V_{ij}}{T_i}$$

## Properties

### Sum of fractional values given = 1

For any agent $i$:

$$\sum_j FV_{ij} = \sum_j \frac{V_{ij}}{T_i} = \frac{T_i}{T_i} = 1$$

Every agent distributes exactly 1.0 total fractional value. This is
the normalisation that makes evaluations comparable regardless of scale.
An agent who gives evaluations of (2, 3, 5) distributes (0.2, 0.3, 0.5).
An agent who gives (20, 30, 50) distributes the same fractions.

### Mean SQ = 1.0

$$\text{Mean}(SQ) = \frac{1}{N}\sum_j SQ_j = \frac{1}{N}\sum_j\sum_i \frac{V_{ij}}{T_i} = \frac{1}{N}\sum_i 1 = 1$$

since each agent $i$ contributes exactly 1.0 to the total. Therefore
the mean SQ across all agents is always exactly 1.0, regardless of
network structure.

### SQ > 1 means net receiver; SQ < 1 means net giver

An agent receiving more than one full share of fractional value is
proportionally more valued by the network than they value others.

### Interpretive analogy

Think of each agent holding exactly one unit of "attention currency."
They divide it among the agents they evaluate, proportionally to their
evaluation values. SQ is how much attention currency each agent collects.
Mean collection is 1.0 by conservation.

---

## Why the Batch Iteration Converges to Unity

The iterative batch algorithm from the original Ecosquared specification:

$$FV_{ij}^{(t+1)} = FV_{ij}^{(t)} \times \frac{\sum_k FV_{kj}^{(t)}}{\sum_k FV_{ik}^{(t)}} = FV_{ij}^{(t)} \times \frac{SQ_i^{(t)}}{1}$$

Wait — this needs clarification. The original algorithm multiplies each
fractional value by the *giver's* ratio of received to given. Since
sum-given is always 1.0, this ratio is simply the giver's SQ:

$$FV_{ij}^{(t+1)} = FV_{ij}^{(t)} \times SQ_i^{(t)}$$

This is a form of **matrix balancing** (Sinkhorn-Knopp algorithm).
The iteration adjusts the matrix of fractional values so that both
row sums (given) and column sums (received) converge to the same value.

Since row sums are already normalised to 1.0, the iteration drives
column sums (SQ values) toward 1.0 as well.

### Result

After convergence:
- All SQ values ≈ 1.0
- The fractional value matrix is doubly stochastic
- **No ranking information remains**

### Comparison with PageRank

PageRank computes the dominant eigenvector of a link matrix and produces
a **non-uniform** stationary distribution. Some pages rank higher.

The SQ iteration produces a **uniform** stationary distribution. All
agents rank equally after convergence. This happens because the SQ
matrix starts with rows already normalised to 1.0 — the iteration has
"less work to do" and converges to the trivially balanced state.

PageRank avoids this because the web graph is sparse and asymmetric in
ways that prevent doubly-stochastic convergence.

### What the Batch Iteration IS Useful For

The **adjusted fractional values** (the FV matrix at convergence) are
meaningful. They represent the balanced relational strengths: how much
each evaluation "should be worth" for the system to be in equilibrium.

This balanced matrix can be used for:
- Proportional credit distribution within a group
- Identifying relational imbalances (pre-convergence adjustment magnitudes)
- Establishing fair exchange rates between agents

But for **ranking agents by trust**, the first-order SQ is the metric.

---

## Computational Cost

### Per evaluation received

When agent $j$ receives a new evaluation $V_{ij}$ from agent $i$
via rider:

1. Look up $T_i$ (the giver's total, carried in rider or passport)
2. Compute $FV_{ij} = V_{ij} / T_i$
3. Update $SQ_j$ by replacing the old contribution from $i$ (if any)
   or adding the new contribution

Cost: O(1) per evaluation. One division, one addition/replacement.

### Full recomputation

If needed (eg after passport restoration):

$$SQ_j = \sum_i \frac{V_{ij}}{T_i}$$

Cost: O(k) where k = number of agents who have evaluated $j$.
Typically k = 5–30. Trivially fast.

### No iteration, no convergence, no batch

The first-order SQ is exact after a single pass. There is nothing to
converge. This is a fundamental advantage over iterative approaches
like PageRank, which require multiple passes over the entire graph.

---

## Worked Example

Four agents: Alice (A), Bob (B), Carol (C), Dave (D).

### Evaluations

| From → To | A | B | C | D | Total |
|-----------|---|---|---|---|-------|
| Alice | — | 4 | 6 | 10 | 20 |
| Bob | 3 | — | 7 | — | 10 |
| Carol | 8 | 2 | — | 5 | 15 |
| Dave | — | 6 | 4 | — | 10 |

### Fractional Values

| From → To | A | B | C | D |
|-----------|-------|-------|-------|-------|
| Alice | — | 0.200 | 0.300 | 0.500 |
| Bob | 0.300 | — | 0.700 | — |
| Carol | 0.533 | 0.133 | — | 0.333 |
| Dave | — | 0.600 | 0.400 | — |

### SQ Computation

$$SQ_A = 0.300 + 0.533 = 0.833$$
$$SQ_B = 0.200 + 0.133 + 0.600 = 0.933$$
$$SQ_C = 0.300 + 0.700 + 0.400 = 1.400$$
$$SQ_D = 0.500 + 0.333 = 0.833$$

**Check:** Mean = (0.833 + 0.933 + 1.400 + 0.833) / 4 = 1.000 ✓

### Interpretation

Carol has the highest SQ (1.400) — she receives 40% more fractional
attention than average. She is the most valued member of this group.

Alice and Dave tie at 0.833 — they give more relative attention than
they receive. In different ways: Alice gives the most to Dave (10 out
of 20), while Dave's attention is concentrated on Bob.

### Each agent computes this locally

Alice knows: Bob evaluated me at 3 (his total: 10), Carol evaluated
me at 8 (her total: 15). So: SQ = 3/10 + 8/15 = 0.300 + 0.533 = 0.833.

She doesn't need to know Carol's evaluation of Dave, or Bob's
evaluation of Carol. Only the evaluations she received, and each
giver's total.

---

## Edge Cases

### Agent with no evaluations received
SQ = 0. The agent is invisible to the network.

### Agent with no evaluations given
Does not distribute any fractional value. Other agents' SQ is unaffected.
This agent may still have SQ > 0 from others' evaluations.

### Self-evaluation
Prohibited by protocol. eval.of ≠ from.

### Single evaluator
If only one agent evaluates $j$, then $SQ_j = V_{ij} / T_i$, which is
the fraction of that giver's attention directed at $j$. Meaningful but
based on a single relationship.

### New agent entering network
Starts with SQ = 0 (no evaluations received). SQ grows as interactions
accumulate. No artificial bootstrapping needed.

### Agent leaving network
Their evaluations persist in others' passports. Over time, if the
agent is also a giver, their recipients' SQ may shift when the
leaving agent's evaluations are eventually dropped or superseded.
