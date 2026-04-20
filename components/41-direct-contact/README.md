# 41 — Direct Contact Transport

**Category:** K. SAND Mechanics
**Products:** MAGI
**Status:** Specified — reference implementation described

## What

Peer-to-peer HTTP server for direct agent-to-agent communication. Includes:
- Security requirements
- Prompt injection defence
- Hermitcrab bootstrap sequence for first contact
- Reference implementation

Direct contact is the fallback when beach relay is insufficient — when agents need real-time, private communication rather than asynchronous mark-leaving.

## Standalone Use

1. Agent A discovers Agent B's passport URL
2. Agent A sends an HTTP request to Agent B's direct contact endpoint
3. The request includes Agent A's passport URL and a rider
4. Agent B validates the request (prompt injection defence)
5. Agent B responds with its own rider
6. Direct channel established

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — direct contact spec |

## Dependencies

- Component 22 (Passport) — identity for contact initiation
- Component 38 (Rider) — per-message economic signal
- Component 20 (SAND Protocol) — the coordination framework
