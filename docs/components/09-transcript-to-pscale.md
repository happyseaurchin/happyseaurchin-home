# 09 — Transcript-to-Pscale

**Category:** Creation Layer  
**Products:** MAGI/Hermitcrab, Xstream

---

## Description

Transcript-to-Pscale converts temporal speech sequences into hierarchical tree structures. Speech naturally contains layers of depth: thought lines become deep spindles, topic changes fork into branches, and returns to previous topics continue existing branches rather than creating duplicates. Unlike LLM-generated blocks which tend toward flatness, transcribed spoken thought naturally produces the deep spindle patterns that pscale is designed to capture. The fork pattern emerging from topic transitions maps directly to PCT concern loops — when a speaker shifts from one concern to another and later returns, the system recognizes this as branch continuation rather than a new thread.

---

## Standalone Use

A researcher or learner could use Transcript-to-Pscale to convert a recorded lecture, brainstorm session, or personal voice note into an explorable block structure. The resulting pscale block preserves the speaker's natural conceptual depth and thread coherence, making it easier to return to ideas months later. The block serves as searchable memory that respects how human thought actually works — not sequential, but recursive with returns.

---

## How It Works

**Temporal stream parsing**: The system accepts a transcript (or live stream) and segments it by turn, utterance, or configurable granularity.

**Semantic continuity tracking**: Each statement is embedded and compared against previously established thought threads (spindles) in the emerging block. High cosine similarity with an existing spindle suggests continuation; low similarity suggests a fork.

**Fork recognition**: When a new topic begins, a new branch node is created. This is not arbitrary — the fork point marks a genuine shift in the speaker's concern or focus.

**Return detection**: When the speaker revisits a topic they've touched before (often signaled by explicit callback: "like we said about X"), the system adds content to the existing branch rather than creating a duplicate. Returns become natural continuations.

**Depth allocation**: Thought lines that remain on a single spindle without branching accumulate vertically (depth), creating the characteristic deep spine. Recursive exploration of the same topic naturally produces pscale addresses like `1.2.3.4.5`.

**Concern mapping**: The fork events are tagged with their concern type (when detectable from language), making PCT integration possible: which concern transition triggered the fork, and when do returns signal resolution cycles.

---

*Key files: None (inventory-driven design)*
