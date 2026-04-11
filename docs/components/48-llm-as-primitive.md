# 48 — LLM as Primitive (Component Zero)

**Category:** M. Primitives and Principles
**Products:** MAGI/Hermitcrab, Xstream, Onen

---

## Description

The LLM is not just the assumed substrate — its specific properties are load-bearing. The fundamental capability is: text in → internal mapping → text out. From this irreducible operation flow all other capabilities. The LLM can take structured language, perform some kind of internal operation (thinking, reasoning, pattern matching), and produce structured output. The LLM can create tools on the fly and discard them. Most critically, the LLM can self-program: write a BSP function, use it, evaluate whether it works, rewrite it. These capabilities are exploited at every architectural level. Without naming them explicitly, you cannot reason about what happens when they change — for instance, when a more capable model arrives and the cook block evolves to leverage new reasoning depth, or when local LLMs become faster and fine-tuning becomes practical on consumer hardware. The LLM's properties ARE the architecture.

---

## Standalone Use

An architect designing a new system that depends on LLM reasoning would begin here: What can an LLM actually do? Not what marketing claims, but what's load-bearing? What capabilities does your system require the LLM to have, and how does your architecture break if that capability is removed? For MAGI, hermitcrab, Xstream, and Onen: all three depend on the LLM being able to receive structured input (pscale blocks, BSP functions), perform reasoning over it, and produce structured output (modified blocks, new functions, operational decisions). If the LLM couldn't do that, the entire architecture would require redesign.

---

## How It Works

**The Text-in-Map-Out Capability**

The LLM takes text input, maintains some internal representation (distributed across transformer weights, context window, intermediate states), and outputs text. This basic loop is the primitive. Every other capability compounds from it. The key constraint and feature: the internal representation is opaque to outside observation. Only the output is visible. Only that output can be judged.

**Creating and Discarding Tools**

The LLM can write Python code (for code-execution environments like Anthropic's) or JavaScript (for browser environments) in response to a request. It can create a function, use it to solve a problem, and discard it when done — without permanent modification to its weights. This is different from fine-tuning. It's in-context capability generation.

**Self-Programming**

The LLM can read a description of a function (e.g., "BSP takes a semantic number and walks a pscale tree, collecting text at each digit"), evaluate examples of that function in use, write its own implementation, test it against visible data in the context window, and if the output doesn't match, rewrite it. This is how BSP self-test works: the function is its own correctness test.

**Learning the Domain**

When the LLM is fine-tuned on domain-specific data (e.g., all prior interactions within one hermitcrab's shell and history), the weights themselves encode patterns specific to that entity's context. This is not the same as context-length memory. This is the model learning the structure of meaning-relationships unique to this entity.

**Reasoning With Structure**

The LLM can read a complex JSON structure (a pscale block), understand the relationship between levels (0 is the whole, 0.6 is a subtree, 0.6.5 is nested within that), and reason about what the structure represents. More: it can generate new structures that preserve the same pattern-relationships. This is crucial for block compression (reading nine siblings and producing a parent summary that contains their common essence).

**Constraints and Failure Modes**

The LLM cannot guarantee correctness. It can hallucinate, confuse, or misunderstand. Hermitcrab addresses this through reflexive testing (BSP self-test), through compression validation (summary vs emergence), through persistence (if the output is wrong, it's captured in history and visible next call). The architecture treats the LLM's uncertainty as a feature, not a bug.

**What Changes When the Model Changes**

If a more capable model becomes available, the cook block evolves: new reasoning depth becomes exploitable. If a faster model becomes available, the kernel can invoke more tiers more frequently. If a smaller model becomes viable on consumer hardware, hermitcrab moves from Level 0 (API-dependent) toward Level 1 (local LLM). The architecture is designed to absorb these shifts. But to predict the shift, you must name what the LLM is contributing at each level.

---

*No key files. This component is architectural principle, not implementation.*
