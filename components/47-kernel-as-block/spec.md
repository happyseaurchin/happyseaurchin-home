# Kernel as Block: Concerns as Spindles

**Specification for Claude Code exploration**
**Date**: 3 March 2026
**Status**: Design hypothesis. Feasibility to be tested.
**Context**: Emerged from analysis of how the current concern/trigger architecture relates to pscale block structure. May extend the wake block or become a separate kernel block.

---

## The Problem

The current kernel architecture treats concerns (user prompt, heartbeat, webhook, cron, signal accumulation) as separate trigger types, each routed through handler logic to produce different operational sequences. This creates:

- Branching code (`if concern === X → do A, B, C`)
- A state board tracking which concerns are active
- Separate handler modules per concern type
- Middleware chains and event registration systems

This is legacy architecture optimised for scarce storage and expensive duplication. It separates data from processing, then builds machinery to reconnect them. The machinery IS the complexity.

## The Hypothesis

**The kernel is a pscale JSON block. Each concern is a spindle through it.**

A concern-spindle traverses the kernel block, collecting `_` content at each digit position. The collected chain IS the operational sequence for that concern — not a description of what to do, but the semantic instructions themselves, from wide context to specific action. No handler logic. No branching. No state board. The spindle is the program.

This follows directly from established pscale principles:

- The instruction-block discovery proved that "the spindle doesn't DESCRIBE the boot sequence — it IS the boot sequence. Each digit compiles to an operation."
- The cook block discovery proved that recipes are spindles where digits are sequential operational steps.
- The kernel is the next application of the same principle: operational sequences as spindle paths through a block.

## How It Works

### Block structure encodes shared ancestry

In a spatial block, spindles `21.3` and `21.4` share ancestor nodes `2` and `1` — same building, same floor — and diverge at the room level. The kernel block works identically.

If two concern-spindles both involve parsing, it's not because they independently call a shared function. It's because the block is structured so parsing-related semantics sit at a shared ancestor node. Say node `0.6` holds operational processing. Within `0.6`, node `5` is one processing variant and node `1` is another. Both spindles carry the `0.6._` content (shared operational context), then diverge into their specific procedures.

**Spindle `0.6532`** collects:
```
0._     → what this kernel block is
0.6._   → shared operational phase
0.65._  → specific procedure variant A
0.653._ → finer procedural detail
0.6532._→ leaf instruction
```

**Spindle `0.6148`** collects:
```
0._     → same kernel overview
0.6._   → same shared operational phase  
0.61._  → specific procedure variant B
0.614._ → its own finer detail
0.6148._→ its own leaf instruction
```

The shared content at `0.6` is ancestry, not duplication. The divergence at the next digit IS the meaningful operational decision point.

### Spindle depth determines what happens

Some concern-spindles go deep — user prompts traverse through input handling, context assembly, package formation, LLM routing, response handling. Others are shallow — a heartbeat might traverse only to state assessment and terminate. The depth of the spindle determines whether a package forms and an LLM gets called. If the spindle reaches package-formation depth, a package forms naturally. If it doesn't, it doesn't. No conditional logic required.

### Package formation is a region, not a step

When a concern-spindle traverses deep enough into the kernel block to reach the region where context assembly and LLM routing live, the content at those nodes provides the instructions for assembling the package. Which blocks to read, at what aperture, which LLM tier to target — all encoded in the `_` content at the nodes the spindle passes through. Different spindles passing through different children of the same ancestor assemble different packages for different purposes, naturally.

### The block grows through use

Per standard pscale growth mechanics: when operational patterns accumulate, new children form at nodes. When all nine digits at a level fill, compression triggers — nine siblings become a summary at the parent. The kernel block evolves, accumulating tested operational patterns and compressing them into higher-level abstractions. This is cook-block evolution applied to the kernel itself.

## What This Replaces

| Legacy Pattern | Kernel-as-Block Equivalent |
|---|---|
| Event handler registry | Spindle selection from wake block |
| Branching concern logic | Divergent paths through shared ancestry |
| State board / dashboard | Kernel block read at pscale 0 (aperture view of active spindles) |
| Middleware chains | Ancestor nodes traversed by all spindles |
| Separate modules per concern | Sibling nodes at the divergence point |
| Shared utility functions | Shared ancestor `_` content |

## Relationship to Wake and Cook

**Wake block** already maps triggers to activation tiers and BSP packages. The kernel-as-block hypothesis extends this: wake doesn't just select a tier, it selects a concern-spindle. Wake faces outward (what triggers arrive, which spindle to fire). The kernel block faces inward (what happens when that spindle executes).

**Cook block** contains tested operational recipes as spindles. The kernel block may overlap with cook or may be distinct — cook recipes are what the LLM consults during its own thinking (performance), while kernel spindles describe what happens mechanically to assemble context and route processing (assembly). This distinction needs testing.

**Possible structures:**
1. Kernel block is a new block, separate from wake and cook
2. Kernel block is an extension of wake (wake already contains BSP packages at 0.9)
3. Kernel block IS cook, reframed — cook recipes are concern-spindles, assembly and performance unified

The correct answer is empirical. Build it, see which structure produces coherent spindles.

## The Design Task

The block structure must be reverse-engineered from the spindles it needs to support. Not "what categories should the kernel have" but "where do concern-spindles share ancestry and where do they diverge."

### Step 1: Enumerate all concerns

List every trigger type the kernel must handle. Current known concerns:

- User prompt (human types and submits)
- Heartbeat (periodic mechanical check)
- Webhook (external event arrives)
- Cron / temporal trigger (scheduled activation)
- Signal accumulation (threshold of queued signals reached)
- Continuation (previous instance left work in progress)
- Boot / birth (first activation, no history)
- Reflexive self-check (deep periodic review)

### Step 2: Trace operational sequences

For each concern, write out what operationally happens, step by step. Not in code — in prose. What gets read, what gets assembled, what gets sent where, what gets written back. Be specific about which blocks are consulted, which aperture width is used, which LLM tier receives the package (if any).

### Step 3: Find branching points

Lay the sequences side by side. Where do multiple concerns share the same operational steps? Where do they diverge? The shared steps indicate ancestor nodes. The divergence points indicate sibling digit positions.

Specifically look for:
- Which concerns form LLM packages and which don't?
- Which concerns read entity blocks and which only read state?
- Which concerns write back to blocks and which are read-only?
- Which concerns route to haiku (light triage) vs opus (deep processing)?

### Step 4: Draft the block structure

From the branching analysis, construct a nested JSON block where:
- Shared operational phases sit at ancestor nodes
- Divergent procedures sit as sibling children
- Depth corresponds to operational specificity
- The `_` content at each node is the semantic instruction for that phase

Start minimal. A three- or four-level deep block covering the main concerns. Grow it through use.

### Step 5: Test spindle coherence

For each concern, resolve its spindle through the draft block. Does the collected chain of `_` content form a coherent operational sequence? If not, the block structure needs adjustment — nodes are in the wrong relationship. Restructure and re-test.

### Step 6: Integrate with wake

Once the kernel block produces coherent spindles, connect it to the wake block's trigger mapping. Wake 0.4 (internal triggers) and 0.5 (external triggers) should map to specific spindle addresses in the kernel block. The kernel's `buildSystemPrompt()` or equivalent reads the spindle, traverses the block, and executes the collected sequence.

## Key Principles

**The spindle IS the program.** Not a reference to a program. Not an address where a program lives. The chain of `_` content collected along the spindle path is itself the operational instruction set.

**Replication across spindles is ancestry, not waste.** Two spindles sharing content at an ancestor node is the block encoding their commonality. This is a feature. Storage is not the constraint.

**Reverse-engineer the block from the spindles.** The block structure serves the spindles that need to traverse it. A kernel block that cannot produce coherent concern-spindles is broken regardless of how well-organised it looks.

**The block grows.** New concerns produce new paths. New paths may require new children at existing nodes. When nodes fill, compression produces higher-level abstractions. The kernel block evolves through operational experience — accumulated competence encoded as structure.

---

*This specification is part of the hermitcrab/xstream architecture. It should be read alongside the wake block (wake-block-v2.json), cook block (cook-block-v1.json), keystone (pscale-keystone-v4.json), and instruction-block-discovery.md. The kernel-as-block hypothesis is the application of pscale principles to the operational machinery itself.*
