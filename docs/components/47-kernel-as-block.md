# 47 — Kernel-as-Block (Hypothesis)

**Category:** L. Meta Blocks
**Products:** MAGI/Hermitcrab

---

## Description

The operational logic of the kernel itself, encoded as a pscale block where spindles ARE programs. Reverse-engineered from the spindles it needs to support: user prompt, heartbeat, webhook, cron, continuation, boot, reflexive self-check. Shared operational phases live at ancestor nodes; divergent procedures branch as sibling children. The block grows through use — new concerns produce new paths, compression produces abstractions. Distinct from cook block: cook = recipes the LLM consults during thinking; kernel-as-block = mechanical assembly of context and routing. This is still a design hypothesis awaiting implementation.

---

## Standalone Use

A systems architect implementing the kernel would use this block to replace branching conditional logic. Instead of `if concern === X → do A, B, C`, a concern-spindle traverses the block, collecting semantic instructions at each digit. The collected chain IS the operational sequence — no handler logic, no state board, no event middleware. Every concern (user prompt, heartbeat, webhook, cron) maps to a spindle address in the kernel block. The kernel's build machinery reads the spindle, walks the block, executes the collected sequence.

---

## How It Works

**The Core Principle**

The spindle IS the program. Not a reference to a program — the collected chain of `_` content along the spindle path is itself the operational instruction set. This follows directly from how cook block works: recipes are spindles where digits are sequential steps.

**Shared Ancestry, Divergent Paths**

Two spindles that both involve parsing share an ancestor node where parsing logic lives. If spindle `0.6532` and spindle `0.6148` both traverse `0.6._` (shared operational phase), they inherit that context. They diverge at the next digit (`5` vs `1`), which selects between specific procedure variants. The block structure encodes commonality through ancestry.

**Depth Determines Outcome**

Shallow spindles (e.g., heartbeat: check state, terminate) don't reach package-formation depth. Deep spindles (user prompt: assemble context, route to LLM, handle response) traverse all the way. The depth of the spindle determines whether an LLM gets called — no conditional required.

**Package Formation as Region**

When a spindle reaches deep enough into the kernel block, it passes through nodes where context assembly and LLM routing live. The `_` content at those nodes IS the instructions: which blocks to read, at what aperture, which tier to target. Different spindles passing through different children assemble different packages naturally.

**Concerns Supported**

- **User prompt:** Deepest path. Input handling → context assembly → package formation → LLM routing → response handling.
- **Heartbeat:** Shallow path. Check wake state → assess ongoing work → terminate (no LLM call).
- **Webhook:** Medium path. Validate signal → resolve handler → assemble minimal package → route to LLM or respond.
- **Cron / temporal:** Medium path. Check scheduled trigger → resolve trigger block → route to light tier or defer.
- **Continuation:** Deep path. Recover prior work-in-progress → continue thread → full loop.
- **Boot:** Deepest path. Initialize shell from seed → compile first context → boot call.
- **Signal accumulation:** Shallow to medium. Accumulate threshold → check signal type → route accordingly.
- **Reflexive self-check:** Deep path. Read all blocks at aperture → assess coherence → possibly trigger rewrite.

**The Design Task**

To build the kernel block:

1. Enumerate all concerns (list above).
2. Trace operational sequences for each — not in code, in prose. What gets read, assembled, routed.
3. Find branching points by laying sequences side by side. Where do they share steps? Where diverge?
4. Draft block structure: shared phases at ancestors, divergent procedures as siblings, depth = specificity.
5. Test spindle coherence: for each concern, resolve its spindle. Does the collected `_` chain form coherent instructions?
6. Integrate with wake block: wake maps triggers to spindle addresses in the kernel block.

**Relationship to Wake and Cook**

- **Wake block:** Faces outward. Maps arriving triggers to tiers and BSP packages. Extended version selects concern-spindles.
- **Cook block:** Contains recipes as spindles. Consulted by LLM during its own thinking (performance optimization).
- **Kernel block:** Faces inward. Describes what happens mechanically to assemble context and route processing (assembly).

Cook and kernel may overlap or be distinct — implementation will reveal which relationship is correct.

**Block Growth Through Use**

When operational patterns accumulate, new children form at nodes. When all 9 digits at a level fill, compression triggers: nine siblings compress to a summary at parent. The kernel block evolves, encoding tested patterns and compressing them into higher-level abstractions.

---

*Source: `kernel-as-block-spec.md`*
