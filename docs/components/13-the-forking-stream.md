# 13 — The Forking Stream

**Category:** Interface Layer  
**Products:** Xstream

---

## Description

The Forking Stream addresses the fundamental asymmetry in LLM generation versus human reading: LLMs produce tokens much faster than humans can read them. The system divides output into three temporal layers: Paragraph 1 is Solid (behind the reader, complete), Paragraph 2 is Liquid (currently being read, present), Paragraph 3 is Vapor (ahead of the reader, being generated, not yet settled). This architecture creates a critical surface where human and LLM agency can collide. The Solid layer represents certainty and commitment. The Vapor layer represents influence and possibility. The risk is that by the time a reader finishes Solid and reads Liquid, Vapor may have already committed to a narrative direction the reader would have blocked.

---

## Standalone Use

Any real-time collaborative writing scenario could use the Forking Stream pattern: a journalist and an AI editor producing a story together, a researcher and a writing assistant developing a paper, a creative team and an LLM brainstorming a campaign. Instead of the LLM generating text and then the human editing, the Forking Stream makes the generation process itself visible and interactive. The reader can interrupt Vapor before it solidifies, preventing unwanted narrative commitments.

---

## How It Works

**Temporal window**: At any moment, the system maintains three sequential paragraphs of output. The LLM is actively generating Paragraph 3 (Vapor) while the reader is reading Paragraph 2 (Liquid). Paragraph 1 is already complete (Solid).

**Generation pacing**: The LLM continues generating Vapor at its natural speed, but that output is not yet committed to the narrative. If the reader takes an action (submitting a fork direction, a concern, or a constraint), the system can abandon Vapor and redirect the generation.

**Forking mechanics**: A fork is a reader action that says "not this direction." The LLM receives the fork signal, halts Vapor generation, and resets to the end of Liquid. A new Vapor is generated that respects the reader's fork constraint. This may result in a completely different Paragraph 3.

**Agency asymmetry**: Without the Forking Stream, the reader is always behind: by the time they read and understand Paragraph 2, Paragraph 3 is already written. The reader can only reject after-the-fact. The Forking Stream puts the reader in real-time conversation with the generation process. The LLM is not slowed (it continues generating); the reader is empowered (they can interrupt).

**Multiple forks**: If multiple readers are present (Xstream scenario), each can submit independent fork signals. The Hard-LLM component selects which fork to honor based on pscale relevance or explicit priority. Unselected forks may be recorded as branch possibilities.

**Vapor commitment cost**: The risk to the LLM is token waste: Vapor that gets discarded costs compute but produces no output. Systems using this pattern must balance empowerment (allowing frequent forks) against efficiency (not throwing away too much generation).

---

*Key files: None (inventory-driven design)*
