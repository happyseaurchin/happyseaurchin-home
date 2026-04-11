# 15 — Film Strip + Visualizer

**Category:** Interface Layer  
**Products:** MAGI/Hermitcrab, Xstream, Onen

---

## Description

Film Strip + Visualizer treats each LLM API call as a frame in a sequence and makes visible what the LLM actually received as input. The context window is represented as a frame sequence — each frame shows the exact JSON that was sent to the model, including system prompt, conversation history, relevant memory, and pscale-selected context. The visualizer renders this JSON in human-readable form, showing what information was available to the LLM and in what order. The kernel loop of a live system becomes a continuous motion picture: frame after frame of API calls, each showing what the LLM saw and what it produced. This is simultaneously a debugging tool, an analysis tool, and a transparency mechanism.

---

## Standalone Use

An LLM application developer could use Film Strip + Visualizer to diagnose why a model produced unexpected output. Rather than guessing about what context the model had access to, they can inspect the exact frame (the JSON input) and see: "Ah, the model never saw that constraint because it was beyond the context window cutoff" or "The model did see it but it was phrased ambiguously." Researchers studying LLM behavior in multi-turn conversations can use the full frame sequence to see how model outputs shift as new context accumulates.

---

## How It Works

**Frame generation**: Every time the system makes an LLM API call, it captures the complete request object (system prompt, messages, temperature, max_tokens, model name, timestamp). This frame is stored in sequence.

**Visualization rendering**: The visualizer takes a frame and renders the JSON in readable form: system prompt in one section, conversation history indented and color-coded by speaker, any injected context (from memory, retrieval, or pscale blocks) in a separate section with source attribution. The output from that call is shown below.

**Frame comparison**: A two-frame view lets an analyst compare consecutive calls: "In frame N, the model received context X. In frame N+1, it received context X plus Y. How did the output change?" This reveals what information actually changed the model's behavior.

**Kernel loop animation**: In a live system, the Film Strip becomes a real-time animation. Each new API call adds a frame. Observers can watch the motion picture: frame, output, frame, output. Pattern anomalies become visible (unusual spikes in context window usage, repeated sequences that suggest loops, rapid cycling between different concern states).

**JSON schema clarity**: The visualizer enforces clarity about what information was available. System prompts are shown verbatim (revealing any implicit assumptions). Token limits are shown (revealing where context was necessarily truncated). Timestamps reveal temporal relationships between calls.

**Transparency layer**: For users concerned about what their data is being used for, Film Strip + Visualizer provides evidence: "You asked about X. Here's exactly what JSON was sent to the model. No X in there? Then the model never saw it. X is there but highlighted in red? The model saw it but it was at the token limit, so the model might have downweighted it."

**Debugging patterns**: Common debugging patterns emerge from frame sequences: runaway loops (same frame structure repeating), context collapse (available context suddenly truncated), prompt injection (unexpected content appearing in frames), and concern drift (visible shift in system prompt or priorities across frames).

---

*Key files: None (inventory-driven design)*
