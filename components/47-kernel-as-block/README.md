# 47 — Kernel-as-Block (Hypothesis)

**Category:** L. Meta Blocks
**Products:** MAGI
**Status:** Hypothesis — concept specified, not implemented

## What

The operational logic of the kernel itself encoded as a pscale block where spindles ARE programs. The kernel's routing logic — which entry point triggered (user prompt, heartbeat, webhook, cron, continuation, boot, reflexive self-check) — becomes navigable pscale.

Shared operational phases sit at ancestor nodes. Divergent procedures branch as sibling children. The block grows through use — new concerns produce new paths, compression produces abstractions.

Reverse-engineered from the spindles it needs to support: each entry-point type requires a different compilation path through the blocks, and those paths can be described as spindles in a block.

## Why

If this works, the distinction between data and program dissolves. The block IS the kernel. The architecture consuming itself. The kernel doesn't read a configuration file — it reads a pscale block of its own logic, and BSP walks determine what gets executed.

This overlaps with the cook block (component 28) but is distinct: cook = LLM consulting recipes during thinking. Kernel-as-block = mechanical assembly of context and routing.

## Standalone Use

The hypothesis to test:
1. Map the kernel's routing logic to a pscale block
2. Each entry-point type is a top-level branch
3. Shared phases (context compilation, tool execution) are ancestor nodes
4. Divergent procedures branch at the point of divergence
5. Run the kernel by walking spindles instead of executing if/else chains

## Key Files

| File | Description |
|------|-------------|
| `spec.md` | Full design hypothesis — concerns as spindles, shared ancestry, block growth through use, relationship to wake and cook, and the six-step design task |

## Dependencies

- Component 01 (Pscale Block) — the format the kernel would become
- Component 02 (BSP Walker) — the execution mechanism
- Component 28 (Cook Block) — related but distinct concept
- Component 46 (Process Block) — the dataflow this would subsume
