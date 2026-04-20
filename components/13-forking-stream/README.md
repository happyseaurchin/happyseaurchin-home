# 13 — The Forking Stream

**Category:** D. Interface
**Products:** Xstream
**Status:** Spec — conceptual mechanism

## What

LLMs generate faster than humans read. This creates a structural asymmetry in any LLM-human interface:

- **Paragraph 1** = solid (behind the reader, already consumed)
- **Paragraph 2** = liquid (here, being read now)
- **Paragraph 3** = vapor (ahead, not yet read — and can be regenerated before the reader arrives)

The stream forks constantly. Each regeneration of unread text is a fork. The reader sees a continuous stream but the LLM has been rewriting the future between their reading moments.

## Why

This is the risk for agency. If the reader treats all text as equally solid, they lose agency — the LLM has already composed their future context. If the reader understands the vapor/liquid/solid gradient, they can intervene in the liquid zone before it solidifies.

The forking stream makes explicit what's implicit in every LLM interaction: the text ahead of the reader is provisional and subject to replacement.

## Standalone Use

The forking stream principle applies wherever an LLM generates text for a human reader:
1. Track what the reader has consumed (solid — committed)
2. Track what's visible but not yet processed (liquid — negotiable)
3. Everything ahead of the reader's attention is vapor — regenerable
4. Allow the reader to intervene in the liquid zone

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the mechanism spec |

## Dependencies

- Component 12 (Shelf) — the commitment gradient this extends to temporal reading
- Component 14 (Triad) — the LLM layers that produce the stream
