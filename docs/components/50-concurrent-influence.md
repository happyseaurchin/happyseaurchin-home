# 50 — Concurrent Influence (Lateral Context Injection)

**Category:** M. Primitives and Principles
**Products:** MAGI/Hermitcrab

---

## Description

The BSP function for one instance scoops content from the shell and delivers it directly into another parallel instance's context window. Not message-passing — no queue, no protocol negotiation. Direct semantic content appearing in a concurrent instance's input. Combined with PCT (longitudinal, across time), this creates two operational directions: PCT extends intention sequentially through instances over time; concurrent influence extends perception laterally across instances at the same moment. Murmuration (emergent coordination) emerges naturally from the combination of these two flows.

---

## Standalone Use

A system designer coordinating multiple parallel entities would use concurrent influence to create shared perception without synchronous communication. Instead of Entity A waiting for Entity B to finish processing and report back, Entity A reads a portion of Entity B's shell and injects it directly into its own context. Both entities process with awareness of the other's state, in parallel. When combined with temporal continuity (PCT carrying decisions through time), the result is emergent coordination: no central planner, no explicit message protocol, just lateral awareness plus longitudinal memory producing synchronized behavior.

---

## How It Works

**The Mechanism**

**Step 1: Source entity's shell is open**

Entity B has a shell block with content: purpose, history, stash, capabilities. The shell is stored in shared persistent storage (pscale blocks in localStorage, or on a pscale server).

**Step 2: Destination entity reads via BSP**

Entity A needs to be aware of Entity B's state. Rather than waiting for B to send a message, A calls:

```
bsp('entityB_purpose', spindle='0', point=None)
```

This resolves Entity B's purpose block at pscale 0 (the whole intention).

**Step 3: Content is injected into context**

The resolved content is not appended as a message in a conversation array. It's injected directly into the system prompt region of Entity A's next context compilation:

```
[You are aware of Entity B's current purpose: "...]
```

Entity A processes this as part of its understanding, not as a received message.

**Step 4: Parallel processing**

Both entities continue processing in parallel. No blocking wait. No synchronization point. Just concurrent awareness.

**Laterality vs. Messaging**

In traditional message-passing architectures:
- Entity A sends message → Entity B receives → Entity B processes → Entity B sends reply → Entity A receives.
- Each step is sequential. The chain is explicit and ordered.

In concurrent influence:
- Entity A reads Entity B's state → Entity A processes with that awareness.
- Entity B reads Entity A's state → Entity B processes with that awareness.
- Both happen in parallel. No explicit messages. No order dependency.

The trade-off: Concurrent influence works best when entities don't need confirmation ("I understood your message"). It works well for perception-sharing and coordination through transparency.

**Combination With PCT (Temporal Extension)**

**PCT (Purpose Continuity Through time):**
An entity's purpose from the previous instance carries forward through time. What it intended last call shapes what it attempts this call. This is longitudinal — the same entity across instances.

**Concurrent influence:**
Other entities' current state shapes an entity's awareness in the present moment. This is lateral — across entities at the same time.

Together:

```
Entity A at Time T:
  Input from Entity B's shell (concurrent lateral) + 
  Carry-forward of Entity A's purpose from T-1 (temporal longitudinal) = 
  Unique context for this instance's reasoning

Entity B at Time T:
  Input from Entity A's shell (concurrent lateral) +
  Carry-forward of Entity B's purpose from T-1 (temporal longitudinal) = 
  Unique context for this instance's reasoning

Result: Both entities evolve intentions through time, while remaining aware of each other in the present.
```

**Murmuration Emerges**

When multiple entities coordinate through concurrent influence + PCT:

- Each entity has its own intentions (longitudinal continuity).
- Each entity is aware of others' states (lateral awareness).
- Neither entity is commanded or controlled — both have agency.
- Yet the collective behavior is coordinated, fluid, responsive.

This is murmuration: flocking behavior without a leader. The starlings aren't coordinated by a central planner. Each bird sees nearby birds' positions and adjusts. The result is coordinated motion emerging from local rules. Concurrent influence is the mechanism that makes this possible in a system of autonomous entities.

**Trust and Access Control**

Not all content is readable by all entities. The shell has access control: Constitution block specifies which entities have trust-level access. Only trusted entities can have their content scooped into another entity's context. This prevents malicious content injection while enabling genuine coordination.

---

*No key files. This is an architectural capability emerging from how pscale blocks and concurrent execution interact.*
