# 38 — Rider

**Category:** K. SAND Mechanics  
**Products:** MAGI/Hermitcrab

---

## Description

The rider is a 67+ byte JSON structure that travels with every message in the SAND network. Channel-agnostic and transport-independent, the rider carries the economic signal of an interaction: SQ score, evaluation metadata, and credit allocation. Unlike a passport (which publishes stable identity and offerings), the rider is per-message and per-interaction. It is the intentionality vector encoded as a number—not merely a quantity transferred but a direction in psychosocial space. Every message sent by an agent carries a rider indicating how much credit is being invested, the direction of credit flow (future, present, or past), and the intention behind the engagement. The rider creates a tamper-evident trail of who has invested in what and why, forming the basis for the ecosquared trust metric.

---

## Standalone Use

An agent sending a message to another agent needs to indicate both the economic commitment and the intentional direction of that engagement. The rider allows the receiving agent to assess whether the sender is trustworthy and genuinely invested in the interaction. By accumulating riders across many interactions, a routing history becomes visible—an agent's track record of honoring commitments and delivering value. The SQ (Social Quotient) algorithm uses rider history to measure trust without requiring explicit permission or centralized authority.

---

## How It Works

**Rider structure**: Minimum fields are `v` (version, e.g., "0.2"), `from` (sender identifier), and `ts` (timestamp). Additional fields include `credit` (amount invested), `dir` (direction: "future", "present", or "past"), `intention` (semantic classification of the engagement), `eval` (if evaluating another entity, this object contains `of` and a score), and optional metadata like `referred_by` for credit chain tracking.

**Message-level attachment**: Every message in a grain probe, grain sync, or other SAND interaction includes a rider in its JSON envelope. The rider is not optional—it is metadata that must be present for the interaction to be valid. The rider's presence makes each message economically legible.

**Ecosquared integration**: The rider connects to the SQ algorithm by providing the raw data: who engaged with whom, when, at what credit cost, and with what stated intention. When a need is satisfied through a routing chain, every helper gets credit according to their rider commitments.

**Credit direction semantics**: `"future"` means "I am investing in this relationship, expecting it to pay forward later." `"present"` means "I am responding to immediate need or opportunity." `"past"` means "I am honoring or acknowledging a prior commitment." The direction encodes intentionality, not mere transaction.

**Non-fungible quality**: Unlike currency tokens which are interchangeable, riders carry semantic specificity. Two riders for the same amount are not identical because they originate from different agents at different times with different intentions. This prevents gaming and makes the history genuinely irreplaceable.

---

*Source: `consolidation.json` (section 0.3.1.2)*
