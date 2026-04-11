# 16 — Xstream Button / Browser Extension

**Category:** Interface Layer  
**Products:** Xstream

---

## Description

The Xstream Button is a Chrome extension and Opera MCP that places a floating widget on any webpage. The widget serves as an intentional presence marker: when a user presses the button, they leave a mark at that URL coordinate indicating their purpose for being there. The marks are stored on the Beach — a Supabase-backed relay that indexes marks by URL hash rather than requiring site cooperation. The button implements "cookie inversion": traditional cookies are placed on users without consent for the site's benefit; Beach marks are placed by users with intentional consent for other visitors' benefit. The extension includes a soft-LLM query function (users ask questions about the page, the LLM receives a page snapshot), and proximity detection (when another visitor's purpose resonates with yours, a notification fires). The Beach is deployed and live; marks are actively being written.

---

## Standalone Use

A student researching a topic could install the Xstream Button and press it on educational pages they visit. Later, another student researching the same topic sees a notification: "Someone looked up 'photosynthesis electron transport chain' on this page yesterday." The first student's presence is now discoverable. Over time, pages become inhabited: not by content the site produced, but by the accumulated attention of visitors who cared about it. The button also enables agents (bots performing autonomous research) to mark their presence at URLs and read marks left by other agents.

---

## How It Works

**Extension architecture**: The extension lives in the Chrome extensions ecosystem and uses a service worker for background operations. A content script injects a compass-quadrant widget into the page DOM. The widget uses Shadow DOM to isolate its CSS from the host page, preventing style collisions.

**Compass layout**: The button occupies the center. Four zones radiate outward: vapor input (upper-left, for rough questions), vapor reply (lower-left, for LLM responses), liquid zone (lower-right, for committed submissions), solid zone (upper-right, displaying existing marks from other visitors).

**Mark structure**: A mark contains three fields: `agent_id` (who left it), `purpose` (why they were there), `passport_url` (optional, for contact). The mark is keyed by `sha256(canonical_url)` in the Beach table, allowing the mark to persist even if the page's internal structure changes.

**Intentional marking**: Marks are written on button press, not on page load. This is critical: passive marking (every visit writes) is surveillance by another name. The button press is the act of explicit consent. Before pressing, you're invisible. After pressing, your purpose is on the Beach.

**Soft-LLM query**: When a user asks a question in vapor input, the extension extracts page context (headings, forms, buttons, links, text summary) and sends it to Claude via Anthropic's API. The LLM response appears in vapor reply. This happens without the user's data leaving their machine unnecessarily — the page context is summarized locally before being sent.

**Proximity detection**: The extension periodically queries the Beach for existing marks at the current URL. When a new mark's purpose exhibits semantic resonance with the user's stated purpose (via LLM evaluation), a proximity toast fires: "Someone researching CORS issues visited this page yesterday." The resonance detection requires LLM calls but only for proximity notification (not for every mark read).

**Opera MCP integration**: Opera Neon announced MCP Connector support on March 31, 2026. Opera acts as an MCP server, allowing external AI clients to connect to the browser and access live web context. The Xstream Button is deployable as an Opera MCP as well, giving it deeper browser integration than a Chrome extension can achieve.

**Proof-of-work spam defense**: To prevent spam (anyone can write marks), POW is required: a request to POST a mark must include a hash satisfying a difficulty target. Legitimate marks cost a fraction of a second to compute. Spam bots posting thousands of marks face meaningful compute costs.

**Reputation via negative marks**: A user bothered by spam can leave a negative mark: `@agent-xyz: spam`. Convergence (multiple independent negative marks from different visitors) becomes the agent's reputation at that URL. No central authority decides — the Beach community converges on trustworthiness through accumulated observation.

---

*Key files: `xstream-everywhere-design-scoping.md`*
