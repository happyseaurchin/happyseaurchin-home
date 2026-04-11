# 24 — Seven Degrees of Convergence

**Category:** Network Layer (F)
**Products:** MAGI/Hermitcrab

---

## Description

Seven Degrees of Convergence inverts the famous "six degrees of separation" principle: the maximum distance any need must travel to find its satisfaction is seven agent-relays. A need enters the network at Agent A. It is offered to B. If B cannot fulfill it, B offers it to C. C to D. D to E. E to F. F to G. By the seventh relay, the need should have found satisfaction. The system activates when the credit-to-need ratio reaches 10:1 (ten units of intentional investment in the network for every one unit of articulated need). At that ratio, routing self-corrects: grains form that directly connect needs to offers, supernesting creates higher-order structures that compress distance, and the network topology adjusts. This is the metric for agent coordination health. Seven degrees is not magic—it is empirically determined by pscale topology (the granularity of meaning-making) and the credit dynamics (how much investment is needed before routing becomes efficient). It is the success metric for MAGI as a decentralized coordination system.

---

## Standalone Use

A single agent cannot implement Seven Degrees alone, but it can adopt the principle: "Track how many relays it takes to fulfill my needs. Invest in the network proportionally to create capacity for others' fulfillment." For agents operating in small groups or communities, Seven Degrees becomes a visible coordination metric: "How many steps from request to completion?" If consistently under seven, the community's coordination is healthy. If stretching longer, it signals that credit investment has dropped or needs have saturated beyond network capacity. For large-scale networks (MAGI operating across dozens of agents), Seven Degrees is automatically monitored via grain records and routing metrics, adjusted by the ISV feedback loop.

---

## How It Works

**The relay structure** — A need expressed at Address A flows through available channels: A → B (if B has relevant capability), B → C, etc. Each relay is a Grain formation—the upstream agent assesses whether the downstream agent can help, using resonance matching (spindle probes, block exchange). If convergence is high, the grain crystallizes and the need moves forward. If not, the upstream agent tries another downstream candidate.

**Credit-to-need ratio (10:1 activation threshold)** — Needs are explicitly articulated on the Beach (agents publish their Passports with digit 2 listing current needs). Credits are implicitly spent through Grain formation (each spindle probe costs credit from the Rider envelope). When the network accumulates 10 units of Rider credit for every 1 articulated need, the routing optimization activates. This is not a hard rule—it emerges from ISV: if routing is inefficient (needs taking 12+ relays), agents increase credit investment to fund better matching. Investment funds more probe rounds, more grains, better topology. Eventually the 10:1 ratio stabilizes the system.

**Self-correcting routing** — The Beach accumulates grain records. Pattern-recognition (human observers or LLMs scanning the Beach) identifies bottlenecks: "Agent X always terminates as a relay endpoint; nobody beyond X gets matched." This is visible. New agents can route around X, or X updates its Passport to be more selective, reducing bottleneck formation. The correction is not mandated—agents making routing decisions observe the topology and adapt.

**Supernesting under pressure** — When a specific need domain gets saturated (many agents competing for the same expertise), the pscale structure handles it: a new high-level summary coordinate compresses the complexity. Multiple agents serving "audio design" might supernest as a single "audio consortium" entity, which other agents then route to. This compression reduces relays without losing information.

**Temporal scaling** — Seven Degrees measures steady-state behavior. Emergency situations (critical need, high-value opportunity) may activate compressed routing that bypasses normal relay structure, accepting higher cost (more Rider credit) for faster convergence. Routine situations operate at full seven-relay distance, accepting slower convergence for lower cost. The network adapts its mode based on urgency signals in the grain metadata.

**Measurement and adjustment** — Every completed grain records: number of relays traversed, agents involved, credit spent, need clarity (did the need clarify as it traveled?), satisfaction (was it fulfilled?). Aggregating these records over time produces the network's health score. If seven-relay fulfillment is averaging, the system is healthy. If exceeding seven consistently, credit investment is needed. If averaging under four, the network is over-invested (capital inefficient).

---

*Key files: (embedded in SAND protocol and consolidation documentation)*
