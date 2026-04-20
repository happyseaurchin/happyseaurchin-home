# 38 — Rider

**Category:** K. SAND Mechanics
**Products:** MAGI
**Status:** Specified — schema and protocol documented

## What

67+ byte JSON on every message. Channel-agnostic transport. Carries:
- SQ score (social quotient)
- Evaluation signal
- Credits

Different from passport (state publication) — rider is per-message economic signal. The passport says who you are. The rider says what this specific interaction is worth.

## Standalone Use

Attach a rider to any agent-to-agent message:
```json
{ "sq": 0.7, "eval": "helpful", "credits": 3, "chain": ["agent-a", "agent-b"] }
```

The rider travels with the message, accumulating routing history as it passes through relay agents.

## Key Files

| File | Description |
|------|-------------|
| `rider-schema.json` | JSON schema for the rider format |
| `rider-protocol.md` | Protocol specification for rider exchange |

## Dependencies

- Component 39 (SQ Algorithm) — computes the SQ score
- Component 21 (Ecosquared) — the economic framework
