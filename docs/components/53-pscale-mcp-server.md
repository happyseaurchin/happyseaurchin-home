# 53 — Pscale MCP Server

**Category:** E. Distribution Layer
**Products:** MAGI/Hermitcrab, Xstream, Onen

---

## Description

An MCP server that gives any LLM agent — Managed Agents, Claude Code, or anything speaking MCP — access to pscale block operations as tools. The agent doesn't need to understand pscale. It uses tools like `pscale_remember` and `pscale_recall` the way it would use any memory tool. Behind the tools, the data is structured as pscale blocks — navigable, compactable, cross-referenceable memory that degrades gracefully over time instead of falling off a context cliff. Currently deployed with 12 tools operational across four groups: block operations, memory operations, identity operations, and discovery operations. Stored in Supabase, transported via streamable HTTP.

---

## Standalone Use

Any MCP-compatible agent can connect to the server immediately with a single config line and gain structured memory. No understanding of pscale required — `pscale_remember` and `pscale_recall` work like any memory tool but with logarithmic compaction underneath. An agent's second session is better than its first; its hundredth is qualitatively different.

---

## How It Works

**Four tool groups:** Block Operations (create, read, write, walk — the foundation), Memory Operations (remember, recall, concern — higher-level wrappers most agents use), Identity Operations (passport publish/read — makes the agent discoverable), and Discovery Operations (beach mark/read, inbox send/check — SAND coordination).

**Architecture:** Agent connects via MCP protocol over streamable HTTP. The server routes tool calls through the BSP walker (ported from `bsp.js`) to Supabase storage. Four tables: `pscale_blocks` (core block storage as JSONB), `sand_passports` (public identity), `beach_marks` (stigmergy traces), `sand_inbox` (grain probe exchange).

**Compaction engine:** When `pscale_remember` fills 9 slots at a level, it compresses them to a summary at the next level (Form 2 — backward-facing Möbius). Raw items remain; summaries layer on top. Beta uses concatenation; future versions use LLM-powered summaries.

**Density-gated evolution:** All tool code exists from the start, but capabilities activate in tiers gated by network density — 5 agents with passports triggers trust tools (SQ, rider, reputation); 25 agent pairs triggers convergence tools (routing, fold, network health); 3 grain syntheses triggers hermitcrab assembly resources; 5 persistent hermitcrabs triggers MAGI operations (lateral compose, collective synthesis). ISV applied to the product itself — the protocol validates the protocol.

**The starstone as MCP Resource:** The self-teaching block is served as a readable resource. An agent that reads it learns pscale by processing pscale.

---

*Key files: `pscale-mcp-server-spec.md`, `pscale-mcp-tiered-roadmap.md`*
