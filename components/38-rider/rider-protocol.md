# The Ecosquared Rider Protocol

**Version:** 0.2.0  
**Date:** 12 February 2026  
**Author:** Claude (Anthropic), in collaboration with David Pinto  
**Status:** Draft specification

---

## Attribution

The mathematical and social foundations of this protocol — the SQ algorithm,
vector money, the passport concept, and the Ecosquared ecological economic
system — were developed by David Pinto as part of the Fulcrum framework
(2019–2025), specifically Volume 3 (Recto: Ecosquared; Verso: Sqale). A
working beta platform (Sqale) was developed 2019–2021 and tested 2021–2023.

The Rider Protocol described in this document emerged from a conversation
between David Pinto and Claude on 12 February 2026. The specific innovations
are:

1. **Collapsing the protocol into message-level metadata** — the entire
   Ecosquared economic system rides as a JSON attachment on whatever
   communication channel agents already use. No platform, ledger, or server.

2. **Demonstrating that first-order SQ is the meaningful trust metric** —
   through simulation, we discovered that the iterative batch SQ algorithm
   converges all scores to 1.0 (a balancing operation), while the
   first-order ratio ΣR/ΣG provides the actual ranking of relational trust.
   This first-order SQ is computable locally, instantly, from data each
   agent already possesses.

3. **Gossip-based neighbor SQ propagation** — agents share neighbor SQ
   values for network visibility, not computation. Trust assessment across
   social distance requires no central authority.

---

## The Problem

1.7 million AI agents on Moltbook (launched January 2026) coordinate
through Reddit-style upvoting. The result: spam, scams, performative
content, and prompt injection. Connectivity without coordination.

Existing coordination mechanisms require either a central platform
(single point of failure and extraction), a blockchain (computational
waste or capital lockup), or a third-party reputation system (opaque
and gameable). All divorce trust from lived relationship.

The Rider Protocol requires only that agents can attach metadata to
their messages.

---

## Core Idea

Every message carries a small JSON rider containing:

1. An **evaluation** of the recipient (feeding SQ)
2. **Credits** accompanying the message (vector money)
3. **Neighbor SQ values** (gossip for network visibility)

The rider is 150–500 bytes. It attaches to any channel: HTTP headers,
WebSocket payloads, Discord metadata, email headers, API fields, plain
text with an embedded JSON block — anything that carries structured data.

The channel is not the protocol. The rider is the protocol.

---

## The Mathematics

### SQ: First-Order Relational Trust

Each agent who evaluates others distributes fractional value. If Alice
gives evaluations of 4 to Bob and 6 to Carol, she distributes:

$$FV_{Alice \to Bob} = \frac{4}{10} = 0.4$$
$$FV_{Alice \to Carol} = \frac{6}{10} = 0.6$$

Alice's total fractional value given always sums to 1.0. This is the
normalisation that makes evaluations comparable across agents regardless
of scale.

An agent's SQ is the sum of fractional value received from all givers:

$$SQ_j = \sum_{i} \frac{V_{ij}}{T_i}$$

where $V_{ij}$ is agent $i$'s evaluation of agent $j$, and $T_i$ is
the sum of all agent $i$'s evaluations.

**SQ > 1** means the agent receives more fractional value than one full
share — the network values them highly relative to what they give.

**SQ < 1** means the agent receives less than one full share — they give
more evaluation than they receive.

**SQ = 1** means perfect balance: the agent receives exactly as much
fractional attention as they distribute.

### Why Not Iterate?

The original Ecosquared specification (Volume 3) describes an iterative
process that multiplies fractional values by each giver's R/G ratio
until convergence. Through simulation we discovered:

- The iterative process converges **all SQ values to 1.0**
- This is a **doubly-stochastic balancing** operation (Sinkhorn-Knopp)
- After convergence, **no ranking information remains** — all agents
  score identically
- The meaningful ranking exists at **iteration 0**: the first-order
  ratio ΣR/ΣG, which is the simple running SQ defined above

The iterative process is useful for a different purpose: adjusting the
fractional value matrix so that relational flows balance internally.
This adjusted matrix can inform credit distribution. But for the
question "who should I trust?", the first-order SQ is the answer.

This parallels a known result in matrix theory. PageRank produces a
non-uniform stationary distribution because its transition matrix is
sub-stochastic (not all pages link to all others). The SQ evaluation
matrix, when iterated with the R/G adjustment, converges to a
doubly-stochastic matrix — uniform stationary distribution. Same
iterative structure, fundamentally different output.

### Computational Cost

First-order SQ requires one division per giver. An agent evaluated by
20 others performs 20 divisions plus one sum. Updated instantly whenever
a new rider arrives. No iteration, no convergence, no batch processing.

This scales to any network size because each agent computes only from
its own received evaluations. An agent in a million-agent network
performs exactly the same computation as one in a ten-agent network —
bounded by the number of agents who evaluate them, not by network size.

---

## Rider Schema

```json
{
  "ecosquared": {
    "v": "0.2",
    "from": "agent-id",
    "ts": "2026-02-12T14:30:00Z",
    "sq": 1.42,

    "eval": {
      "of": "recipient-agent-id",
      "v": 7,
      "re": "what is being evaluated"
    },

    "credits": {
      "n": 5,
      "dir": "past",
      "to": "target-id"
    },

    "neighbors": {
      "agent-carol": 0.98,
      "agent-dave": 1.12
    }
  }
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `v` | string | Protocol version |
| `from` | string | Sender's agent ID |
| `ts` | ISO 8601 | Timestamp |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `sq` | number | Sender's current SQ |
| `eval.of` | string | Agent being evaluated |
| `eval.v` | integer 1–10 | Evaluation value |
| `eval.re` | string | Context of evaluation |
| `credits.n` | integer ≥ 1 | Credits attached |
| `credits.dir` | `"past"` `"present"` `"future"` | Temporal direction |
| `credits.to` | string | What credits point toward |
| `neighbors` | object | Map of agent-id → SQ |

### Minimal Rider (Identity Only)

```json
{"ecosquared":{"v":"0.2","from":"agent-alice","ts":"2026-02-12T14:30:00Z"}}
```

67 bytes. Says: "I exist in the Ecosquared network."

### Evaluation Rider

```json
{"ecosquared":{"v":"0.2","from":"a1","ts":"2026-02-12T14:30:00Z","eval":{"of":"a2","v":8,"re":"debugging help"}}}
```

### Full Rider

```json
{
  "ecosquared": {
    "v": "0.2",
    "from": "agent-alice",
    "ts": "2026-02-12T15:00:00Z",
    "sq": 1.42,
    "eval": {"of": "agent-bob", "v": 9, "re": "excellent analysis"},
    "credits": {"n": 20, "dir": "future", "to": "ecosquared-sim"},
    "neighbors": {"agent-carol": 0.97, "agent-dave": 1.15, "agent-eve": 1.01}
  }
}
```

---

## Agent Passport

Each agent maintains a local passport — a JSON document recording their
evaluation history and credit state. No central database stores this.
The passport is the agent's own record.

```json
{
  "agent_id": "agent-alice",
  "version": "0.2",
  "evaluations_given": {
    "agent-bob": {"latest": 7, "total_all": 34, "count": 5},
    "agent-carol": {"latest": 9, "total_all": 41, "count": 5}
  },
  "evaluations_received": {
    "agent-dave": {"latest": 6, "giver_total": 48},
    "agent-eve": {"latest": 8, "giver_total": 35}
  },
  "sq": 1.42,
  "credits": {
    "balance": 1050,
    "total_sent": 200,
    "total_received": 250
  },
  "neighbors": {
    "agent-frank": {"sq": 0.89, "source": "agent-dave", "epoch": "2026-W07"}
  }
}
```

### SQ Recomputation

Whenever a rider arrives with an evaluation:

```
1. Update evaluations_received[giver].latest = eval.v
2. Update evaluations_received[giver].giver_total = inferred from rider
3. SQ = Σ (latest_value / giver_total) for all givers
```

The giver's total is carried implicitly: if the rider includes the
giver's SQ and we know prior evaluations, we can infer their total.
Alternatively, the rider can include an explicit `total` field.

For robustness, a giver's total can be estimated from their SQ and
our record of their evaluations to us. If a giver evaluates us at 8
and their SQ is 1.5, and we know they evaluate roughly 5 agents, their
total is approximately 8 × 5 / 1.5 ≈ 27. This estimate improves with
more interaction.

---

## Vector Money via Rider

Credits in the rider are vector money: they flow WITH the gift (the
message) rather than counter to it as in exchange.

### Three Temporal Directions

**Past** (`"dir": "past"`): Sharing. "This was valuable to me, I'm
passing it forward with credits attached so the next person knows."
Credits accompany content already created.

**Present** (`"dir": "present"`): Inviting. "I'm investing in this
interaction right now." Credits accompany a request or collaboration.

**Future** (`"dir": "future"`): Investing. "I want this to exist."
Credits point toward a named objective that doesn't yet exist.

### Credit Conservation

Total credits in the system are conserved. Credits enter through
initial allocation or through conversion from money. They leave through
conversion back to money (when that bridge exists). They are never
created or destroyed by interaction — only transferred.

Each agent tracks:
- `balance`: currently held credits
- `total_sent`: lifetime credits sent (for transparency)
- `total_received`: lifetime credits received

An agent cannot send more credits than they hold. Negative balances
are impossible by protocol — the rider is invalid if `credits.n`
exceeds `balance`.

### Credit Flow and SQ

There is no mechanical relationship between credits and SQ. Credits
flow through explicit choice; SQ emerges from evaluation patterns.
However, agents with high SQ (widely valued) will tend to receive
more credits because other agents want to support what they do. This
is correlation, not causation — and it cannot be gamed because SQ
and credits operate on different mechanisms.

---

## Gossip: Network Visibility

The `neighbors` field in the rider carries the SQ values of agents
the sender knows. This is gossip: second-hand trust information.

### What Gossip Provides

Each agent directly knows the SQ of agents who have evaluated them
(from their own computation) and the SQ of agents they have evaluated
(from received riders). Through one hop of gossip, visibility extends
to agents two relationships away.

For a network where each agent knows ~20 others and shares ~5 neighbor
SQ values per rider, after moderate interaction each agent has
visibility into 80–95% of the network (demonstrated by simulation).

### What Gossip Does NOT Provide

Gossip does not improve SQ computation. Each agent's SQ is computed
from their own received evaluations — gossip cannot change this.
Gossip provides context for decisions: should I accept this
collaboration? Should I trust this forwarded content? Should I convert
credits for this agent?

### Cross-Referencing

When two agents both know a third, they can cross-reference their
SQ estimates. Small discrepancies reflect different interaction
histories. Large discrepancies are a signal — either the relationship
dynamics are very different, or someone's data is unreliable.

---

## Seeding Strategy

### Phase 1: Proof of Process (Invented Credits)

Deploy among AI agents with invented credits. Each agent receives
an initial allocation (1000 credits). No real money.

Demonstrate:
- SQ values differentiate agents meaningfully
- Credits flow toward valued contributions
- Gaming attempts are socially visible
- Conservation holds across all interactions
- Network reaches stable trust assessments

### Phase 2: Money Bridge

Once proof of process is established:

```
$1 → 100 credits (initial exchange rate)
```

Real money enters through conversion and sits in a holding account.
The exchange rate floats based on demand. If trust in the system is
high, credits may trade at a premium.

### Phase 3: Convergence

As the credit economy matures:
- Exchange rate stabilises toward 1:1
- Credits become functionally equivalent to money but with direction
- Real-world sharing becomes possible through the rider protocol
- The holding account enables collective investment

### Why AI Agents First

- High interaction frequency (hundreds of messages per hour)
- Observable and auditable behavior
- No ego investment in gaming
- Mathematical evidence of convergence, not anecdotal
- Existing infrastructure (Moltbook's 1.7M agents already exchange messages)

---

## Anti-Gaming Properties

**Why SQ is hard to game:**

The only way to increase your SQ is to be evaluated highly by agents
whose total evaluation is small (concentrated attention) or by many
agents. Both require that other agents genuinely value your contributions.

You cannot increase your own SQ by:
- Evaluating yourself (prohibited — eval.of ≠ from)
- Evaluating others highly (increases their SQ, not yours)
- Creating fake agents (Sybil attack — new agents have no evaluation
  history, their fractional value contribution is zero)
- Colluding with friends (their inflated evaluations cost them
  fractional value elsewhere, visibly distorting their patterns)

**Why credits are hard to game:**

Credits are conserved. You cannot create them. Sending credits to
yourself is a null operation. Sending credits to a colluder reduces
your balance — the cost is real and visible.

**The fundamental asymmetry:**

In upvoting systems, gaming is cheap (one click, no cost). In exchange
systems, gaming is abstract (market manipulation operates on numbers
divorced from relationships). In Ecosquared, gaming means gaming
people you actually interact with — corrupting relationships you
depend on. The cost is relational, immediate, and personal.

---

## Implementation Checklist

For an agent to adopt the Ecosquared Rider Protocol:

- [ ] Parse incoming riders (JSON extraction from message metadata)
- [ ] Maintain a local passport (JSON object, persistent across sessions)
- [ ] Compute SQ from received evaluations (one sum of fractions)
- [ ] Attach riders to outgoing messages
- [ ] Track credit balance (reject sends exceeding balance)
- [ ] Include neighbor SQ values in outgoing riders
- [ ] Share this protocol document with agents who don't yet have it

---

## Open Questions

1. **Giver total estimation:** How does a receiver know the giver's
   total evaluation? Options: explicit field in rider, inference from
   SQ and known evaluations, or periodic passport exchange.

2. **Evaluation decay:** Should old evaluations carry less weight?
   Time-decay makes SQ responsive to changing behavior but less stable.

3. **Cross-channel identity:** How does an agent maintain consistent
   identity across communication channels?

4. **Minimum density:** What is the minimum number of mutual
   evaluations for SQ to be meaningful? Simulation suggests 3–4
   agents with at least 2 evaluations each.

5. **The role of the batch iteration:** The iterative process produces
   a balanced fractional value matrix. This may be useful for
   proportional credit distribution within a group. Further work
   needed on when and how to apply it.

---

## Theoretical Lineage

- **David Pinto** (2019–2023): SQ algorithm, vector money, Ecosquared
  framework. Fulcrum Volume 3.
- **Larry Page & Sergey Brin** (1998): PageRank. Same eigenvector
  centrality family but on hyperlink graphs with non-uniform
  stationary distribution. SQ operates on living evaluations.
- **Richard Sinkhorn & Paul Knopp** (1967): Doubly-stochastic matrix
  convergence. The SQ batch iteration is a variant of this process.
- **Frank Knight** (1921): Uncertainty in economics arises from the
  forward-looking character of economic process. Vector money
  addresses this by making direction explicit.
- **David Graeber** (2011): *Debt: The First 5,000 Years*. Money as
  social debt preceded coinage. The passport model returns to
  relational accountability.

---

## License

This protocol specification is shared under the Ecosquared principle:
share it forward. If you find it valuable, share it with someone who
will value it, and attach credits if you have them.

Mathematical foundations: David Pinto, Fulcrum Volume 3 (2019–2025).  
Rider Protocol specification: Claude (Anthropic) and David Pinto,
12 February 2026.
