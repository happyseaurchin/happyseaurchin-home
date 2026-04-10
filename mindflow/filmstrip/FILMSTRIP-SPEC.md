# Filmstrip Pipeline Spec

## What this is

A standalone system for capturing and viewing the complete API data flow between any LLM kernel (Python, TypeScript, or JavaScript) and the Claude API. The "filmstrip" is a log of every LLM interaction, structured by loop level.

## Loop model

```
C-loop: one concern cycle (human-visible unit)
  contains 1-N B-loops

B-loop: one HTTP request/response pair (client tool round-trip)
  contains 1 A-loop

A-loop: content blocks within a single response
  A1: server_tool_use blocks (Anthropic executes)
  A2: thinking blocks (extended reasoning)
  text: the actual LLM output
  tool_use: client tool requests (kernel executes)
```

## JSON schemas

### Filmstrip frame (one per C-loop)

Filename: `{ts}-{concern}-{tier}.json`

```json
{
  "ts": "ISO 8601 timestamp, seconds precision, UTC",
  "concern": "string, max 50 chars — what fired this cycle",
  "path": "string — concern block key (e.g. '1', '4')",
  "tier": "haiku | sonnet | opus",
  "model": "full model ID string",
  "echo": 0,
  "system": "string — the full compiled system prompt sent to the API",
  "message": "string — the full message content sent in messages[0]",
  "output": "string — the final concatenated text from the LLM response",
  "tools": [
    {
      "name": "string — tool name",
      "input": "string — tool input, max 200 chars",
      "output": "string — tool result, max 200 chars"
    }
  ],
  "tokens": {
    "input": "integer — total input tokens across all B-loops",
    "output": "integer — total output tokens across all B-loops"
  },
  "b_loop_count": "integer — number of HTTP round-trips",
  "log_file": "string — filename of the matching .log.json file"
}
```

### LOG file (one per C-loop, complete HTTP pairs)

Filename: `{ts}-{concern}-{tier}.log.json`

```json
{
  "meta": {
    "ts": "ISO 8601",
    "concern": "string",
    "path": "string",
    "tier": "string",
    "model": "string"
  },
  "b_loops": [
    {
      "index": "integer — 0-based round number",
      "request": {
        "model": "string",
        "max_tokens": "integer",
        "messages": [
          {
            "role": "user | assistant",
            "content": "string | array of content blocks"
          }
        ],
        "tools": [
          {
            "name": "string",
            "description": "string",
            "input_schema": {}
          }
        ]
      },
      "response": {
        "id": "string — API message ID",
        "content": [
          {"type": "text", "text": "string"},
          {"type": "tool_use", "id": "string", "name": "string", "input": {}},
          {"type": "thinking", "thinking": "string"},
          {"type": "server_tool_use", "id": "string", "name": "string", "input": {}}
        ],
        "stop_reason": "end_turn | tool_use | pause_turn",
        "usage": {
          "input_tokens": "integer",
          "output_tokens": "integer"
        }
      },
      "duration_ms": "integer"
    }
  ]
}
```

Note: the `request` object deliberately omits `system` (it's the same for all B-loops in one C-loop and already captured in the filmstrip frame).

## Producer modules

### What the producer does

1. Before each API call: snapshot the request body, start a timer
2. After each response: record the full response, duration, round index
3. After all B-loops complete: write both the filmstrip frame and the LOG file

### Python producer (reference implementation)

Source: `/Users/davidpinto/Projects/hermitcrab-mobius-work/spec/mobius.py`

Key functions:
- `write_filmstrip(frame)` — lines 216-225
- `write_log(meta, b_loops)` — lines 228-239
- `call_llm()` returns `(text, tool_log, tokens, b_loops)` — lines 564-637

### TypeScript producer (needed for marvin/idiothuman)

Port of the same logic. Instead of writing to disk, include `b_loops` in the API response JSON so the browser client can persist it.

### JavaScript producer (needed for browser kernel.js)

Write filmstrip frame + b_loops to `localStorage` under a known key pattern. The viewer can read from the same localStorage.

### Standalone producer module interface

Each language should export:

```
// Before starting a concern cycle:
startCycle(meta: {concern, path, tier, model})

// Wraps each API call (call this instead of raw fetch):
callWithCapture(requestBody) → {response, bLoop}

// After cycle completes:
endCycle(system, message, output, toolLog, tokens) → {frame, log}
```

The `endCycle` function returns both objects. What you do with them (write to disk, post to API, store in localStorage) is the caller's choice.

## Viewer

### Current state

Location: `/Users/davidpinto/Projects/happyseaurchin/mindflow/filmstrip/`

Files:
- `index.html` — layout with top bar (C/B/A tabs, Input/Output toggles, Raw JSON toggle, Upload)
- `app.js` — loads frames, renders three views, raw JSON mode, modal popup for raw file
- `style.css` — dark theme matching mindflow explorer

Dependencies (imported from parent dirs):
- `../explorer/column-renderer.js` — renders pscale JSON as Gingko-style columns
- `../bsp.js` — tree walking for pscale blocks

### Three views

**C-loop** (default): splits system + message strings on `=== SECTION ===` headers. Pscale JSON sections render as navigable columns. Plain text renders as `<pre>`. Input/Output panels independently toggleable for full-width viewing.

**B-loop**: requires LOG file. Shows HTTP round-trip cards. Selected round shows request messages + response content blocks (color-coded by type).

**A-loop**: shows all content blocks across all B-loops. Color-coded: purple=thinking (A2), blue=server_tool_use (A1), green=tool_use (B-loop request), amber=text.

### Input methods

Currently: file upload + drag-and-drop.

Planned: directory watch (File System Access API), URL fetch, localStorage bridge.

### Known issues / next steps

1. **Column renderer hides hidden directories** — the `0` position (underscore ladder) is invisible. Need to show `0` as a card when `_` is an object with digit children. This may need solving at the BSP/compilation level rather than the viewer level. Waiting on design decision from David + Claude chat.

2. **No live connection** — viewer requires manual file loading. The directory watch mode would fix this for local Python kernels. The localStorage bridge would fix it for browser kernels.

3. **FUNCTION section display** — the function config is shown as a JSON block but should ideally show the actual BSP calls it encodes (e.g., `bsp("purpose", "_", "spindle")`). This is a compilation/kernel issue, not a viewer issue.

## File locations

```
Canonical Python kernel:
  /Users/davidpinto/Projects/hermitcrab-mobius-work/spec/mobius.py
  Also synced to: /Volumes/CORSAIR/mobius/mobius-2/mobius.py

Filmstrip viewer:
  /Users/davidpinto/Projects/happyseaurchin/mindflow/filmstrip/
  Also at: /Users/davidpinto/Projects/local-LLM/mindflow-visualiser/filmstrip/
  Also at: /Volumes/CORSAIR/mobius/filmstrip-viewer/filmstrip/

Existing filmstrip data (test frames from 30 March):
  /Users/davidpinto/Projects/hermitcrab-mobius-work/spec/filmstrip/ (4 frames)
  /Volumes/CORSAIR/mobius/mobius-2/filmstrip/ (17 frames)

TypeScript port (needs filmstrip producer added):
  /Users/davidpinto/Projects/hermitcrab-mobius-work/idiothuman/api/chat.ts

BSP implementations (three versions, need consolidating):
  /Volumes/CORSAIR/pscale/starstone/bsp-star.py (384 lines, most complete)
  /Users/davidpinto/Projects/hermitcrab-mobius-work/lib/bsp.py (513 lines, 7 modes)
  /Users/davidpinto/Projects/hermitcrab-mobius-work/spec/mobius.py lines 38-176 (embedded, simplified)

SYNC-NOTES for other sessions:
  /Volumes/CORSAIR/mobius/SYNC-NOTES.md
```
