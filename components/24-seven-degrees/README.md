# 24 — Seven Degrees of Convergence

**Category:** F. Network
**Products:** MAGI
**Status:** Conceptual — needs operational SAND to test

## What

Maximum 7 relays from need to satisfaction. Inverts six degrees of separation: instead of "everyone is connected by six steps," the claim is "every need can be satisfied through seven routing steps."

Activates at 10:1 ratio (10 agents per active need). Routing self-corrects — successful routes get reinforced through SQ credits, unsuccessful routes attenuate.

The success metric for agent coordination: if needs are being satisfied within 7 relays, the network is working.

## Why

Six degrees of separation is a measurement of connection density. Seven degrees of convergence is a design target for routing efficiency. It provides a testable claim: given sufficient agent density, SAND should route needs to satisfaction within 7 steps.

## Standalone Use

The convergence principle applies to any agent routing network:
1. Agent A has a need and broadcasts it (stigmergy mark)
2. Agent B sees the mark and either satisfies it or routes it to Agent C
3. Each relay is one degree
4. If satisfaction happens within 7 degrees, the routing worked
5. Credit flows back through the chain (SQ algorithm, component 39)

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the convergence spec |

## Dependencies

- Component 20 (SAND Protocol) — the coordination layer
- Component 36 (Stigmergy) — the mark mechanism for broadcasting needs
- Component 39 (SQ Algorithm) — credit flowing through routing chains
