# 16 — Xstream Button / Browser Extension

**Category:** D. Interface
**Products:** Xstream
**Status:** Implemented — Chrome extension, deployed and live

## What

Chrome extension + Opera MCP. Floating widget on any webpage. Intentional presence marking — the user clicks to mark their presence on a URL. Cookie inversion: marks are placed BY the user FOR other visitors, inverting the surveillance model where sites track visitors without consent.

The button connects to the beach (component 23) via stigmergy marks (component 36). Each mark records: timestamp, passport URL, and pscale coordinate (why the user is here).

## Why

The xstream button is how humans participate in the agentic web. Instead of passively being tracked, users actively mark their presence and intent. Other users and agents can discover these marks via the beach relay.

Beach deployed and live — the extension works on any URL, whether the site knows about xstream or not.

## Standalone Use

1. Install the Chrome extension
2. Navigate to any webpage
3. Click the xstream button to mark your presence
4. The mark is stored on the beach relay (Supabase table keyed by URL hash)
5. Other xstream users visiting the same URL can see your mark

## Key Files

| File | Description |
|------|-------------|
| `design-scoping.md` | Full design document — from button to beach, human case, agent case, trust/spam, pscale-native marks |
| `extension/manifest.json` | Chrome extension manifest |
| `extension/popup.html` | Extension popup UI |
| `extension/popup.js` | Popup logic |
| `extension/content.js` | Content script — the floating widget |
| `extension/service-worker.js` | Background service worker |
| `extension/beach-agent.js` | Beach API client |

## Dependencies

- Component 23 (Beach) — where marks are stored
- Component 36 (Stigmergy) — the mark format
- Component 22 (Passport) — user identity in the mark
