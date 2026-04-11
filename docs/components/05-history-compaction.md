# 5 — History Compaction

**Category:** B. Process Layer — How Things Move Through Time
**Products:** MAGI/Hermitcrab, Xstream, Onen

---

## Description

History Compaction is the mechanism by which sequential content — conversation turns, observations, changes, events — progressively summarises into a navigable hierarchy without losing the underlying detail. Rather than consuming raw items, compaction adds resolution above them: a summary of nine entries appears at position 10, summaries of summaries at position 100, and so on. The mechanic is lossless — all raw entries remain accessible. It enables agents to maintain continuous memory across thousands of interactions while staying within token budgets.

---

## Standalone Use

You could implement this independently for any stream of sequential data: chat histories, audit logs, game session records, or time-series observations. Feed solid text into the compaction engine. Every 9 raw items, generate a summary capturing what persisted across those 9. At the next level up, when you have 9 summaries, generate a summary-of-summaries. Repeat. The numeric structure (each digit position representing a level of abstraction) becomes your navigation index — no search queries needed, pure structural navigation.

---

## How It Works

**The basic mechanic.** Raw items fill positions 1 through 9. When the 10th item arrives, a summary of items 1–9 is generated and placed at position 10. The new raw item goes to position 11. Items 12–19 are raw. Position 20 summarises items 11–19. At position 100, a summary of the summaries at 10, 20, 30... 90 appears. This is the pscale 2 level — a summary of summaries.

**Reading an address.** Address 5432 means: the 2nd raw item in the 3rd summary within the 4th summary-of-summaries within the 5th era. To provide context for any address, retrieve the supporting summaries at 5000, 5400, 5430 — progressively wider lenses on the same stream.

**Three compaction modes.** Summary compaction captures what persisted — the through-line across 9 moments. Emergence compaction looks for patterns invisible at lower resolution — what becomes visible when you look at 81 raw items rather than 9 summaries. Density compaction is frequency-based: what appeared most often, what triggered most, what shifted most. The mode depends on what the compaction prompt asks.

**The discovery property.** At higher pscale levels, the compaction function can access both the summaries (what's known) and all raw data (full depth). It then asks: "What pattern exists in the raw data that isn't captured by the summaries?" This look-back mechanism is what makes higher pscale not just compression but genuine discovery.

---

*Key files: `pscale-compaction-reference.md`, `history-compaction-proposal.md`*
