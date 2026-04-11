# 49 — BSP Self-Test (Reflexive Calibration)

**Category:** M. Primitives and Principles
**Products:** MAGI/Hermitcrab

---

## Description

NOT the koan (component 7). This is a mechanical process for reflexive calibration. The context window contains both the LLM's own BSP function descriptions AND the actual unfolded content with visible digits and addresses. The LLM creates a BSP implementation (or refines an existing one), applies it to the visible block structure, and compares the result against what it can literally see in the context window. If the BSP function's output doesn't correlate with the actual content at those addresses, the function is wrong — the mismatch IS the error signal. The function self-corrects at every instance, without requiring external validation.

---

## Standalone Use

A developer building a system that uses semantic number navigation would implement BSP self-test to guarantee correctness: If your BSP implementation is wrong (digit parsing error, tree walk error, pscale calculation error), you want the LLM to catch it immediately, while it can see the actual data. Rather than deploying a broken function that corrupts queries for days, the self-test catches errors in real time. The block is visible. The function's output is visible. The mismatch is undeniable.

---

## How It Works

**Setup**

The context window includes three elements:

1. **Full block structure:** The pscale JSON is unfolded, showing the tree with all nodes, digits, and `_` content visible.
2. **BSP function description:** Instructions for how BSP works (digit extraction, tree walk, pscale calculation, collection).
3. **BSP implementation:** The actual JavaScript or Python code the LLM wrote to perform these steps.

**Execution**

The LLM invokes the BSP function on a known block/spindle pair:

```
block: 'myblock', spindle: 0.234
Expected output: [node at 0, node at 2, node at 3, node at 4]
```

It then walks through each node manually, visible in the context, and collects the actual content:

```
{
  "0": {"_": "whole description"},
  "2": {"_": "level 2 content"},
  "3": {"_": "level 3 content"},
  "4": {"_": "level 4 content"}
}
```

**Comparison**

The LLM compares:

- **Function output (computed):** The chain the BSP function returned.
- **Actual content (visible):** The chain the LLM walked manually through the visible block.

If they match: ✓ Function is correct.
If they don't: ✗ Function has an error.

**Error Recovery**

If mismatch detected, the LLM:

1. Identifies the error: "Digit parsing failed at position 2" or "Tree walk missed node at 0.3" or "Pscale calculation off by one."
2. Rewrite the function to fix the error.
3. Re-test on the same spindle.
4. Repeat until output matches actual content.

**Why This Works**

The context window makes the ground truth visible. The LLM is not reasoning about what SHOULD happen — it can see what DID happen. The mismatch between function output and observable reality is unambiguous. No external oracle needed. The function corrects itself.

**When Self-Test Runs**

- **Initialization:** First time BSP is called in a session, test on seed block to verify correctness.
- **After block writes:** If the block structure has been modified (compression, new entries), re-test on a known spindle to verify navigation still works.
- **Reflexive check:** Periodically (or on-demand), invoke full BSP self-test across all blocks to catch any drift.

**Relationship to Kernel-as-Block**

Kernel-as-block is full of spindles. Each spindle must traverse correctly. BSP self-test ensures the navigation mechanism is reliable before spindles are invoked as programs. If BSP is wrong, concern-spindles execute the wrong operational sequence.

---

*No key files. This is a pattern — its presence is a choice in architecture design.*
