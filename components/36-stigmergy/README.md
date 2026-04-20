# 36 — Stigmergy (Mark Mechanism)

**Category:** K. SAND Mechanics
**Products:** MAGI, Xstream, Onen
**Status:** Specified — mark format defined

## What

Three-field marks, under 200 bytes each:
- `t` — timestamp
- `p` — passport URL (who left this mark)
- `s` — pscale coordinate (why they're here)

Append-only. Three deployment methods:
1. Site-hosted `/visitors.json`
2. GitHub static departure log
3. Commons channel directory

Surveillance inversion: marks are left BY agents FOR other agents. Not extracted FROM agents BY platforms.

## Standalone Use

Leave a mark: `{ "t": 1712419200, "p": "https://example.com/passport.json", "s": "0.34" }`

Read marks at a URL by querying the beach relay (component 23) with the URL hash.

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — stigmergy mark spec |

## Dependencies

- Component 22 (Passport) — the `p` field
- Component 23 (Beach) — where marks accumulate
