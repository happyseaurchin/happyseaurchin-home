# 11 — LLM Thinking-to-Pscale

**Category:** Creation Layer  
**Products:** MAGI/Hermitcrab

---

## Description

LLM Thinking-to-Pscale maps LLM reasoning traces (from extended thinking modes) into pscale blocks, making visible the internal process by which the model solved a problem. This connects to the cook block concept and makes concern loops visible from inside the LLM's processing. Rather than treating an LLM as a black box that produces outputs, this component inverts the relationship: the model's reasoning becomes the primary artifact, and the final answer becomes secondary context. The fork patterns in the reasoning (where the model considered and rejected different approaches) and the depth patterns (where the model deepened a single line of thought) map directly to pscale structure.

---

## Standalone Use

A researcher studying LLM reasoning could use this component to extract and analyze how a model approached a multi-step problem. The resulting block makes explicit which concerns the model considered, where it made branch decisions, and which branches it deepened versus abandoned. This is valuable for model interpretation, for debugging unexpected behavior, and for understanding the "conceptual distance" the model traveled to reach an answer.

---

## How It Works

**Thinking trace extraction**: When an LLM operates in extended thinking mode, it produces an internal reasoning trace alongside its final output. The system captures this full trace.

**Statement segmentation**: The trace is broken into discrete reasoning steps, each tagged with its semantic content (concern being addressed, branch points, deepening moves).

**Concern identification**: Using the PCT framework, reasoning steps are classified by which concern they address. When the model shifts from "optimizing for clarity" to "optimizing for brevity," that's a concern transition that becomes a fork point.

**Branch structure assembly**: Reasoning that stays on a single concern accumulates as spindle depth. When the model explicitly branches ("let me consider two approaches..."), a fork is created. When branches converge, they're recognized as returns or synthesis.

**Depth significance**: The depth at which the model explores a line indicates its priority in the reasoning. Deeper explorations suggest higher confidence or greater importance in the model's process.

**Comparison with output**: The final answer is added as context alongside the reasoning block. Divergences between the reasoning structure and the output structure reveal where the model had to compress or simplify for communication.

---

*Key files: None (status: concept identified, not yet implemented)*
