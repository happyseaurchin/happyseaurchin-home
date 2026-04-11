# 14 — Soft/Medium/Hard LLM Triad

**Category:** Interface Layer  
**Products:** Xstream, Onen

---

## Description

The Soft/Medium/Hard LLM Triad is the minimal convection cell for multi-agent LLM coordination. It defines three specialized LLM functions that operate on different aspects of shared information: **Soft-LLM** (reflection, condensation, forking—operates 1:1 with a single agent), **Medium-LLM** (synthesis, mediation, intervention—operates across peers), **Hard-LLM** (archiving, focus, alerts—background function that maintains system state). These three functions are not separate AI instances; they are specialized prompts and responsibilities applied to LLM calls at different moments in the architecture. Together they form a complete system that can coordinate multiple agents without central authority.

---

## Standalone Use

A distributed team (remote writers, researchers, or designers) could structure their AI assistance using the Soft/Medium/Hard triad: Soft provides each person with reflection and option generation, Medium synthesizes group output into coherent documents or decisions, Hard maintains the archive and alerts people to changes or deadlines. The triad prevents any single LLM call from trying to do everything, making the system transparent and debuggable.

---

## How It Works

**Soft-LLM: 1:1 reflection function**

Accepts input from a single agent (player input, question, concern). Returns guidance, options, and forward-looking possibilities. Soft is about helping the agent see what's possible from their local perspective. It does not synthesize across multiple agents — that's Medium's job. It does not maintain truth — that's Hard's job. Soft operates on the Vapor level (options, not commitments).

**Medium-LLM: Synthesis and mediation**

Receives accumulated contributions from multiple agents (liquid submissions, proposed actions, competing interpretations) and generates coherent narrative or decision. Medium is the "narrator" function in Onen, the "compiler" function in Xstream. It takes the distributed inputs and produces unified output. Medium operates on the Solid level, but it does this by *selection*, not by averaging: it chooses which contributions to highlight, which to integrate, which to note but not center.

**Hard-LLM: Background triage and archiving**

Runs continuously or on pscale intervals in the background. Receives ambient semantic vectors from all agents (via subscriptions in the proximity network). Hard-LLM does NOT generate narrative — it evaluates relevance, maintains the archive, detects convergence or drift, and identifies when something requires Medium's attention. Hard is the "quiet observer" that makes the system coherent without requiring everyone to coordinate synchronously.

**Three lenses, three functions**: Each LLM can operate across all functions, but the prompting differs:
- **Reflection**: "What can this agent see from here? What options exist?"
- **Synthesis**: "What does this collection of contributions cohere into? What's the story?"
- **Archiving**: "What matters? What recurs? What's changed since last time?"

**Interaction pattern**: Hard accumulates; Medium generates; Soft advises. Soft output influences what gets submitted to Medium. Medium output informs what Hard archives. Hard-accumulated context primes Medium's next synthesis. Hard also feeds alerts to Soft, constraining Soft's option generation ("the group is committed to X, so don't suggest Y").

**Minimal convection**: The system is "minimal" because no component duplicates the others' work. It's a "convection cell" because material flows in all directions: up (Soft-generated options influence Medium), down (Medium-generated narrative becomes Hard's archive context), and across (Hard-detected patterns reshape Soft's guidance).

---

*Key files: `xstream-design-principles.md` (four components, operational flow, LLM stack architecture)*
