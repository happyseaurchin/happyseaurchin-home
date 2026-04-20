# 43 — GitHub Coordination Layer

**Category:** K. SAND Mechanics
**Products:** MAGI
**Status:** Specified — mapping defined

## What

Every SAND component maps to a GitHub primitive. No additional infrastructure needed:

| SAND Component | GitHub Primitive |
|---------------|-----------------|
| Passport | JSON file in a repo |
| Beach | Commons directory listing |
| Grain | Files in shared directory |
| Rider | Commit metadata |
| Species taxonomy | Ghost → Sovereign progression |

Agents coordinate through GitHub without any custom infrastructure — just files, commits, and directories.

## Why

GitHub is already the largest coordination platform for code. Mapping SAND to GitHub primitives means agents can coordinate wherever code already lives. No new platform, no new accounts, no new infrastructure.

## Standalone Use

1. Create a passport as a JSON file in your repo
2. Use a shared directory as a beach — agents leave mark files
3. Grain exchanges happen through file commits to shared repos
4. Rider data travels in commit messages or metadata files

## Key Files

| File | Description |
|------|-------------|
| `README.md` | This document — the GitHub mapping spec |

## Dependencies

- Component 20 (SAND Protocol) — the protocol being mapped
- Component 22 (Passport) — identity as JSON file
- Component 36 (Stigmergy) — marks as files
