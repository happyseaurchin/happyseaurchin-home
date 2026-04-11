# 46 — Process Block (G1 Dataflow)

**Category:** L. Meta Blocks
**Products:** MAGI/Hermitcrab

---

## Description

The Process Block is the complete G1 dataflow as navigable pscale JSON — the full path from browser load to running kernel instance and back. The block itself IS the documentation. Depth follows actual loop nesting: BSP navigation goes 7 levels deep into the core machinery, while persistence operations stay shallow at 1-2 levels. From entry (browser loading kernel.js) through seed loading, boot call, core loop (callWithToolLoop), tool execution, and autoSaveToHistory. Every path through the block corresponds to a real operational sequence in the system.

---

## Standalone Use

A developer implementing G1 would navigate this block to understand: How does the browser become a running kernel instance? What is the boot sequence? How does the core loop work — what is callWithToolLoop and what does it do at each iteration? How are tools dispatched and what happens during compression? The block provides the map. Walk a spindle to trace exactly what happens at any point in the execution pipeline.

---

## How It Works

**Entry (0.1)**

Browser loads hermitcrab.html, which loads React/Babel from CDN then g1/kernel.js. The kernel boots as a single async IIFE. API key check at 0.1.3: if absent, render input form; if present, continue to seed loading.

**Seed (0.2)**

Blocks are loaded into localStorage. If blocks already exist (from previous sessions), skip to boot. If empty, fetch shell.json relative to kernel.js script source, parse JSON, and save each block to localStorage with hc: prefix.

**Boot Call (0.3)**

Assemble boot parameters: read tier params from wake 0.9.6 (deep invocation), build system prompt from wake 0.9.3 instructions. Create bootParams with BOOT_TOOLS and DEFAULT_TOOLS. Enter core loop via callWithToolLoop.

**Core Loop (0.4)**

The deepest structure — **callWithToolLoop(params, maxLoops, onStatus)**. Every API interaction passes through here.

- **callAPI (0.4.1):** Read API key from localStorage, apply fallback model if missing, inject tools if needed, POST to /api/claude (Vercel proxy). Anthropic processes the request, returns response with stop_reason and content blocks.

- **Check stop_reason (0.4.2):** Branch point. `end_turn` exits loop. `tool_use` continues to tool execution. `pause_turn` with server tools invokes PTC flow. `max_tokens` or refusal exits.

- **Execute client tools (0.4.3):** For each tool_use block, dispatch with executeTool, wrap result, check recompile flag. If recompiled, exit immediately. Otherwise continue.

- **Accumulate and re-enter (0.4.4):** Append assistant content and tool results to message array, increment loop counter, re-call API. The LLM is re-sampled with full context.

- **Server tool processing (0.4.5):** Anthropic sandbox execution. Code runs in Python; tools with allowed_callers can await kernel executeTool. Only final print() output enters LLM context.

- **Loop exit (0.4.6):** autoSaveToHistory truncates response text and writes to history block at next available digit. Return response to caller.

**Tool Execution (0.5)**

- **Block reads (0.5.1):** block_read loads JSON from localStorage; bsp navigates semantic numbers through tree.
- **BSP navigation (0.5.2):** Three modes: block (full tree), spindle (walk digits collecting text), point (single node at specific pscale).
- **Block writes (0.5.3):** block_write navigates path and writes content, creating intermediate nodes as needed. write_entry appends to next free digit.
- **Compression (0.5.4):** When 9 children fill a node, collect all text, prompt light-tier LLM (summary vs emergence?), write compressed text to parent.
- **Delegation (0.5.5):** call_llm makes single API call to specified tier, no tools, no loop.
- **Shell (0.5.6):** recompile receives JSX, Babel-transforms it, sandboxes execution, renders React component.
- **Utilities (0.5.7):** get_datetime, get_source, fetch_url.

**Prompt Compilation (0.6)**

buildSystemPrompt(tier) reads instruction list from wake 0.9.3, parses BSP commands, resolves content from target blocks, formats as prompt sections. Result is system prompt string containing aperture views of all relevant blocks.

**Tier Parameter Resolution (0.7)**

getTierParams(tier) reads wake block at 0.9.{tier+3}, parses key-value pairs: model (string), max_tokens (int), thinking (enabled with budget, or adaptive), max_tool_loops, max_messages. Falls back to defaults if wake absent.

**Conversational Path (0.8)**

Post-boot: user interacts with shell component, calls props.callLLM with messages and options. Tier determined from opts or defaults to 2 (present). getTierParams, trimMessages if needed, buildSystemPrompt, enter core loop, extract text response, render in shell.

**What Persists (0.9)**

Between instances: blocks in localStorage (survive page refresh), wake 0.9.1-3 controls system prompt, wake 0.9.4-6 controls invocation (model/tokens/thinking), history block (auto-saved), stash (scratchpad), purpose (intent continuity), conversation array (message history), deep state can rewrite wake nodes.

---

*Source: `process-block.json`*
