# 05 — History Compaction

**Category:** B. Process
**Products:** All (MAGI, Xstream, Onen)
**Status:** Specified and implemented in hermitcrab

## What

Every 9 entries compress to the next pscale level. Position 10 = summary of 1-9. Position 100 = summary of summaries. Three compression types:

- **Summary** (lossy) — the parts add up. Seven daily entries become a weekly overview. Roughly reversible.
- **Emergence** (generative) — the whole exceeds the parts. Seven conversations reveal a friendship. Irreversible.
- **Density** (frequency-based) — what recurs gets promoted.

Raw items remain accessible — compaction is lossless at the leaf level. The compressed summaries provide navigable context at higher pscale levels.

## Why

LLM context windows are finite. Memory grows without bound. Compaction gives indefinite memory in bounded space — any entry is three moves away (epoch → period → session → entry). The same mechanism that structures pscale blocks structures time.

## Standalone Use

The compaction rule is mechanical:
1. Write entries at M:1 through M:9
2. M:10 = summary of M:1-9
3. M:11 through M:19, then M:20 = summary of M:11-19
4. M:100 = summary of M:10 through M:90
5. Reading M:5432 means: fifth epoch, fourth period, third session, second entry

Any system with sequential entries and a summarisation function can apply this.

## Key Files

| File | Description |
|------|-------------|
| `spec.md` | Memory compaction skill document from hermitcrab G0 |

## Dependencies

- Component 01 (Pscale Block) — the addressing system compaction uses

## Composition

Used by MAGI (indefinite memory), Xstream (session history compression), and Onen (narrative arc compression — nine sessions become an epoch).
