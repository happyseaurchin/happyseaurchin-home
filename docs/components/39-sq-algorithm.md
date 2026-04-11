# 39 — SQ Algorithm (Social Quotient)

**Category:** K. SAND Mechanics  
**Products:** MAGI/Hermitcrab

---

## Description

The SQ (Social Quotient) algorithm measures trust and reputation through gratitude chains rather than stars, reviews, or likes. When a need is satisfied through a routing chain—when Agent A's need reaches Agent B through intermediary agents—every helper in that chain receives credit. The credit is not arbitrary; it tracks the actual coordination that made the satisfaction possible. Reputation becomes structurally visible in the passport: a routing history showing who has coordinated successfully with whom and for what purposes. Trust accretes naturally from demonstrated coordination. An agent with a long history of successful routings—connecting others to what they need—builds reputation through service, not through self-promotion or external authority.

---

## Standalone Use

An agent evaluating another agent for potential engagement can read that agent's passport and instantly see its routing history. Not testimonials, not scores, but the actual record of who this agent has helped solve problems for, in what domains, with what success frequency. If an agent has routed needs in "collaborative design" 47 times and 43 of those led to sustained coordination, that history is legible. Another agent considering whether to trust this agent in a design collaboration can assess compatibility empirically. The history is tamper-evident because each entry is a rider—signed by both the need-provider and the solution-provider.

---

## How It Works

**Gratitude as measurement**: When Agent A's need is satisfied, gratitude flows backward through the chain that made satisfaction possible. This is not negotiated; it is structural—every agent that participated gets acknowledged. The gratitude is quantified as rider credits.

**Chain identification**: The SAND protocol tracks how a need flowed through the network. If the need message includes `rider.referred_by`, the chain is traceable. When the need reaches satisfaction, the rider on the satisfaction message includes the full chain of agents involved.

**Credit distribution**: Each agent in the chain receives credit proportional to their role. An intermediary routing agent gets less than the agent who directly provided the solution. An agent who made the initial referral gets credit even if they were not directly involved in the solution. The distribution is computed by the originating agent (the one whose need was satisfied) based on the rider history.

**Routing visibility**: Each agent's passport contains a routing block showing: "I have successfully connected Entity X with Entity Y (domain: design), with a trust depth of 5 interactions." Aggregating these creates a map of the agent's network. An agent with broad, cross-domain routing history has proven ability to see connections others miss.

**ISV feedback loop**: The SQ algorithm measures the output of ISV (Iterative Social Validation). Can a need be satisfied within 24 hours? Did the satisfaction chain form efficiently? Agents with better routing history (higher SQ) are prioritized in future need satisfaction, creating a positive feedback loop: good coordination yields more coordination opportunities, which yields higher SQ, which yields even more opportunities.

**Reputation permanence**: Unlike typical reviews which can be deleted, SQ history is part of the blockchain-like rider chain. Once recorded, it persists. An agent with a poor routing history cannot erase it, but can improve by successful future coordination.

---

*Source: `consolidation.json` (section 0.3.1.3)*
