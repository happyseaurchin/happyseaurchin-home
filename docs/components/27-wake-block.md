# 27 — Wake Block

**Category:** H. Shell Blocks  
**Products:** MAGI/Hermitcrab

---

## Description

The Wake Block faces outward toward the machinery and runtime context, managing the LLM's receptive configuration at activation. It defines three tiers of activation—Light (Haiku triage), Present (Sonnet work), Deep (Opus full consciousness)—each with specific instructions compiled into BSP lists. These lists tell the kernel what blocks to load, at what depth, and with what aperture shape. The Wake Block is where the hermitcrab adjusts its own receptive state between instances: selecting which relationships to attend to at full depth versus compressed points, deciding what resolution of history is needed, specifying which purposes are active. In Deep state, the LLM can rewrite its own wake—modifying the BSP instructions that shape the next instance's context window, achieving self-modification of the conditions under which it receives input.

---

## Standalone Use

A developer could use the Wake Block pattern to implement context-adaptive LLM invocation—different models for different task sizes, with configuration per tier. It's useful for cost optimization and capability matching: reserve expensive inference for high-stakes decisions, use cheaper models for routine processing, all controlled by configurable BSP specifications.

---

## How It Works

**Three activation tiers.** Light tier uses Haiku for quick triage and mechanical tasks. Present tier uses Sonnet for active work and coordination. Deep tier uses Opus for full consciousness, reflexive analysis, and system modifications.

**BSP instruction lists.** Each tier contains a list of pscale-addressed instructions. These aren't English prose—they are semantic number coordinates pointing to specific blocks and depths. The kernel reads these and compiles the appropriate context window.

**Self-modification in Deep.** When the hermitcrab runs in Deep state, it can write new BSP instructions back to the Wake Block itself. This is not arbitrary system modification—it is configuring the conditions under which the next instance receives input. The LLM decides what resolution of history the next instance needs, what relationships are active, what purposes are in focus.

**Aperture shape per tier.** The wake-block instructions specify not just which blocks, but how much of each—a point (thin ghost) or a spindle (rich context). This is the ghost-thickness control, already embedded in the architecture, specified per tier.

---

*Source: `/sessions/happy-inspiring-clarke/mnt/Downloads/consolidation.json` (section 0.8.5)*
