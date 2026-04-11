# 21 — Ecosquared / Vector Money

**Category:** Network Layer (F)
**Products:** MAGI/Hermitcrab

---

## Description

Ecosquared is not a currency of quantities transferred between accounts. It is a system of credits with intentionality and direction embedded as numbers. The giver determines the worth of what they give, not the market. Each transaction carries a **Rider**—metadata specifying the credit amount, temporal direction (past: settlement, future: investment), and intention (explore: initial contact, match: confirmed resonance, commit: deep engagement). A Grain-formation between two agents might carry 0.1 credits with direction "future" and intention "explore" (a lightweight spindle probe). A synchronized block exchange carries 0.2 credits with intention "commit" (deeper investment). The credits are not promises of return; they are statements of intentional weight. They measure how much the sender believes this engagement matters. The giver's judgment of value is the only valuation mechanism. This system scales to real money (at G~1, a funder contributes GBP/USD and logs the transaction as Rider-format JSON, creating a data trail for the credit economy to reference when it becomes operational at G~2).

---

## Standalone Use

An agent can track its own engagement history by attaching Rider vectors to every message and grain record. "How much intention have I invested in this relationship? Tracked over time, the Rider vectors show whether the engagement is deepening (credits increasing, intentions escalating from explore → match → commit) or fading (credits decreasing, intentions withdrawing)." A human can use the same principle manually: "I'm investing 0.5 credits into learning Möbius mathematics (future, explore). I just allocated 2.0 credits to finishing the seed documentation (present, commit)." The vectors make invisible intentional investment visible. They are not enforced; they are declared. But once declared, they can be observed, aggregated, and used to inform future routing decisions.

---

## How It Works

**The Rider metadata object** — Attached to every message, transaction, and grain: `{ credit: number, dir: "past"|"future", intention: "explore"|"match"|"commit"|... }`. The credit is the sender's declaration of how much this engagement matters. Direction indicates whether it settles past commitments (past) or invests in future ones (future). Intention names the quality of the engagement.

**Temporal semantics** — "Direction = past" means: "I'm fulfilling something I already committed to." Direction = future means: "I'm investing in potential." Past credits settle and close loops. Future credits open new loops and express confidence in future returns.

**Intentionality without enforcement** — The system does not validate or enforce the Rider vectors. An agent can claim credit 100.0 on an exploratory spindle probe if it chooses. But the claim is *visible*—other agents can read it, compare it to the agent's history, and adjust their response. An agent that consistently over-claims builds a reputation for inflation. An agent that claims modestly, then delivers, builds trust.

**Aggregation at scale** — The Beach accumulates Rider vectors from millions of transactions. Patterns emerge: which agent-pairs have highest credit convergence? Where is intentional investment concentrated? What domains attract the most future-oriented speculation? These patterns become input to the routing layer (ISV + seven degrees of convergence).

**Integration points (G~2 forward)** — When the credit economy becomes operational, real money (G~1, Stripe contributions logged as Rider JSON) converts to boost credits at a rate determined by economic parameters. Agents can "spend" boost credits to amplify their Rider weight, making their probes more likely to be noticed. Ecosquared becomes the psychosocial market layer—measuring not quantities but values.

---

*Key files: `ecosquared-payment-gateway-spec.md`*
