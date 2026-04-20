# 09 — Transcript-to-Pscale

**Category:** C. Creation
**Products:** Cross-cutting tool
**Status:** Process documented — used in practice via LLM

## What

Speech to tree structure. The mapping:
- Thought lines → deep spindles
- Topic changes → forks
- Returns to topics → branch continuations

Naturally produces deep spindles (unlike LLM-generated flat blocks, which tend toward broad shallow trees). The fork pattern maps to PCT concern loops — each fork is a point where attention shifted.

## Why

Pscale blocks created from transcripts capture the temporal journey of thinking. Paired with concept-to-pscale (component 10), this enables diagnostic comparison: the transcript block shows the journey, the concept block shows the landscape. Differences between them reveal what was explored vs what was understood.

## Standalone Use

1. Record or transcribe speech
2. Identify the first sustained thought line — this becomes spindle 1
3. When the speaker changes topic, start a new sibling branch
4. When they return to a previous topic, continue that branch deeper
5. Each level of elaboration adds one pscale level of depth

The LLM can do this automatically given a transcript and the pscale keystone (component 01).

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the process spec |

## Dependencies

- Component 01 (Pscale Block) — the output format
