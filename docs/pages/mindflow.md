# `mindflow/`

speech-to-structure tools (see below)

### mindflow/ tools

Each subdirectory is a standalone static page; shared walkers live at `mindflow/bsp.js`, `bsp-star.js`, `zand.js`, `pscale-to-gingko.js`. byok and explorer load no `theme.js`, so the Anthropic key a person brings is kept by `mindflow/key.js` (5 Nov 2026): wrapped under the beach's own keeping (`button/seal.js` keep), a key kept plain before wrapped on load and its plain copy gone, as `siteKeys` keeps the site's.

- **basic** — free word cloud from speech
- **byok** — bring-your-own Anthropic key; LLM concept extraction into the cloud
- **explorer** — navigate pscale block topology; load a block or compile one live from speech
- **editor** — pscale JSON editor; document & column views, star rendering, 0-form toggle for sunztone v5
- **zand-editor** — ztone editor (digit `0` is voicing, the sunztone v5 successor format); floor-aware addresses; walk modes free/spindle/ring/disc/point
- **filmstrip** — kernel API-log viewer (C/B/A loops); includes `producer.js` for capturing LLM I/O as frames
- **zand-filmstrip** — agent-loop wake viewer (γ, edits, currents, faces); sibling of zand-editor
- **filmstrip-3d** — context window as a 3D landscape; renders whole beach surfaces via `/api/beach-relay`; the landing page's "Thornkeep" entry is a bookmark into it with the Thornkeep shelf pre-loaded

Foundry → public: tools iterate here; stable versions are mirrored to `pscale-commons/dev-tools`.
