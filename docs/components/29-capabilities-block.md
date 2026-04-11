# 29 — Capabilities Block

**Category:** H. Shell Blocks  
**Products:** MAGI/Hermitcrab, Xstream

---

## Description

The Capabilities Block organizes tools and operational levers according to their distance from the hermitcrab's cognition, forming a Distance Gradient. Layer 1 contains internal reasoning (extended thinking, budget tokens) invisible to external systems. Layer 2 includes API-side tools (web search, code execution, web fetch) that execute on Claude's infrastructure and feed results directly back into reasoning. Layer 3 encompasses client-side tools (block read/write, interface recompilation, pscale navigation) that run in the kernel and require explicit tool_use loop handling. Layer 4 includes browser APIs (clipboard, speech, notifications) available through the interface once built. The gradient determines what is natural versus effortful—tools closer to cognition require fewer round-trips and feel more native; tools at distance require explicit invocation and network hops. The capabilities block surfaces everything via aperture with no separate dashboard needed.

---

## Standalone Use

A developer designing any LLM system could use the Distance Gradient principle to organize tool access: maximize what's native (internal reasoning, server-side processing), minimize external round-trips, surface only highest-leverage tools in the interface. This naturally leads to responsive, cost-effective systems where tools feel like extensions of thought rather than external services.

---

## How It Works

**Layer 1: Internal reasoning.** Extended thinking, budget tokens, reflection—processing that happens inside Claude's context without any external visibility. The hermitcrab doesn't call these; they are native substrate.

**Layer 2: Server-side tools.** Claude's infrastructure runs web_search, web_fetch, code_execution. Results feed back into reasoning within a single API call. No network round-trip from the hermitcrab's perspective—it just continues thinking with new information.

**Layer 3: Client-side tools.** block_read, block_write, recompile, get_source—these run in the kernel and require tool_use/tool_result round-trips. Farther from native cognition but essential for persistence and interface control.

**Layer 4: Browser APIs.** clipboard, speech, notifications, geolocation—available through the interface once the hermitcrab builds it. Farthest from cognition but highest visibility to the human.

**Aperture as dashboard.** The capabilities block doesn't need a separate UI. The aperture shows pscale 0 (one sentence per layer), giving the hermitcrab immediate awareness. Deeper exploration happens on demand via spindle extraction.

---

*Source: `/sessions/happy-inspiring-clarke/mnt/Downloads/consolidation.json` (section 0.2.3) and `/sessions/happy-inspiring-clarke/mnt/Downloads/G1-V3-PLAN.md`*
