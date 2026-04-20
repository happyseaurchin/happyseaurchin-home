# 15 — Film Strip + Visualizer

**Category:** D. Interface
**Products:** MAGI, Xstream
**Status:** Partial implementation — API endpoint exists

## What

Context window as frame sequence. Each LLM call is a still image — the JSON that was compiled into the context window at that moment. The kernel loop across calls is continuous motion. The film strip visualises the sequence of frames, showing what the LLM received at each step.

## Why

Debugging and analysis. When an LLM agent behaves unexpectedly, the question is always: "What did it see?" The film strip answers this by recording and displaying the exact context window composition for each call. You can scrub through frames to see how the context evolved.

Also useful for understanding how aperture (component 33) and BSP compilation produce different views of the same blocks over time.

## Standalone Use

1. Instrument the kernel's LLM call to log the compiled context as JSON
2. Each logged context is one frame
3. Display frames sequentially — scrub forward/backward through the call history
4. Diff adjacent frames to see what changed between calls

## Key Files

| File | Description |
|------|-------------|
| `filmstrip.ts` | API endpoint for film strip data (from xstream-play) |

## Dependencies

- Component 01 (Pscale Block) — the data being visualised
- Component 02 (BSP Walker) — the compilation producing each frame
- Component 33 (Aperture + Focus) — the aperture decisions visible in each frame
