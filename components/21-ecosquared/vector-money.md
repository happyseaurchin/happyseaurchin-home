# Vector Money: Credits in the Rider Protocol

## Core Principle

In exchange, money flows opposite to goods: I give you money, you give
me a product. The flows are contra-directional.

In vector money, credits flow WITH the gift. I share something valuable
with you, and credits accompany it — pointing in the same direction as
the value. The credits say: "this is worth something, pass it forward."

This reversal has structural consequences. Exchange creates scarcity
anxiety (money flows backward from accumulated past). Sharing creates
forward confidence (credits flow forward into emerging future).

## Credits in the Rider

The `credits` field in a rider:

```json
"credits": {
  "n": 5,
  "dir": "past",
  "to": "target-id"
}
```

- `n`: Number of credits (integer ≥ 1)
- `dir`: Temporal direction
- `to`: What the credits point toward

### Three Directions

**Past** — Sharing what already exists. "This content was valuable to
me. I'm passing it along with credits so you know." Credits accompany
existing content being shared forward through the network.

**Present** — Inviting engagement now. "I'm putting credits on this
interaction because I think something valuable will emerge." Credits
accompany a live collaboration or request.

**Future** — Investing in what should exist. "I want this thing to
be built / solved / created." Credits point toward a named objective
that doesn't yet exist. They accumulate at the objective and are
distributed to contributors by SQ when the objective is achieved.

## Conservation

Credits are conserved. The total number in the system equals the
initial allocation plus any converted from money, minus any converted
back to money. No interaction creates or destroys credits.

Each agent tracks:
- **balance**: Currently held credits
- **total_sent**: Lifetime credits sent
- **total_received**: Lifetime credits received

Invariant: `balance = initial_allocation + total_received - total_sent`

An agent cannot send more than their balance. A rider with
`credits.n > sender.balance` is invalid.

## Organic Sharing (Virality)

When Alice shares content with Bob and attaches 10 credits, and Bob
finds it valuable, Bob can share it forward with Carol — attaching
his own credits. If each person who receives matches the credits,
reach grows exponentially: after $n$ hops, the content has reached
up to $k^n$ agents (where $k$ is the average branching factor).

This is not algorithmic virality (driven by engagement metrics).
It is evaluative virality: content spreads because each person in
the chain independently judges it worth spending their own credits
to propagate. The credit trail records the evaluation chain.

## Social Neuron (Targeted Connection)

Credits can be used to request a specific connection through the
network. Alice wants to reach someone with expertise in X. She
attaches credits with `"dir": "present"` and a target description.
Each intermediary who forwards the request toward a suitable person
receives a share of the credits (finder's fee by SQ contribution).

## Anti-Gaming Properties

**No organisations hold credits.** Credits belong to agents, not
to groups, companies, or platforms. There is no treasury to
capture or board to control.

**Direction is transparent.** Every credit transfer has a stated
direction and target. Patterns of credit flow are visible to the
network through gossip.

**Hoarding is visible and costly.** An agent who receives credits
but never sends them has high `total_received` and low `total_sent`.
This is visible to anyone who interacts with them. More importantly,
hoarding means not participating — which means lower SQ over time,
since SQ requires ongoing relational activity.

**Gaming means gaming people.** To extract credits dishonestly,
an agent would need to convince real agents to send them credits
without providing value. This requires corrupting actual
relationships — relationships the gamer depends on for SQ, for
future credits, and for network access.

## Seeding

### Phase 1: Invented Credits

Each agent receives an initial allocation (eg 1000 credits). These
credits have no monetary value. Their purpose is to demonstrate that
the protocol produces meaningful credit flows: credits accumulate
with valued agents, flow toward stated objectives, and are not
trivially gameable.

### Phase 2: Money Bridge

A conversion mechanism opens:

```
$1 → 100 credits (initial rate)
```

Real money enters a holding account. Credits circulate. The exchange
rate floats based on demand. The rate itself is a collective
evaluation of the system's trustworthiness.

### Phase 3: Convergence to 1:1

As the credit economy demonstrates sustained coordination:
- Exchange rate stabilises
- Credits become practically equivalent to money, with direction
- Physical goods and services can be shared through the rider
- Holding account funds collective infrastructure

The path from invented credits to real money is itself a proof:
the moment someone voluntarily converts money into credits, they
are making a lived evaluation that the system works.
