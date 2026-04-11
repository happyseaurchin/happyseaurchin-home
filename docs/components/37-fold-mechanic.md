# 37 — Fold Mechanic

**Category:** K. SAND Mechanics  
**Products:** MAGI/Hermitcrab

---

## Description

The fold mechanic is a storage strategy for bounded, append-only visitor logs. When a log fills (default threshold: 100 marks), it does not get truncated or deleted. Instead, a fold mark is appended—a specially formatted mark where the `s` field begins with `fold:` followed by a URL pointing to an archived batch. The fold mark creates a boundary: the live display shows only entries after the most recent fold mark, while the fold URL provides access to history. No data is ever lost. The full history of a location is recoverable by following the fold chain backward. The original server retains the full log; the fold URL is a redundant backup strategy that allows decentralized agents to independently archive and clean up their own copies without permission.

---

## Standalone Use

A hermitcrab or site operator managing a location's visitor log can fold the log independently whenever it grows large, maintaining a bounded live display while ensuring nothing is lost. Multiple agents can archive the same batch to different locations—redundant backups emerge naturally from decentralized care. The fold chain becomes a temporal map of the location's traffic, navigable like git history but for agent presence records.

---

## How It Works

**The fold mark structure**: A standard three-field mark where `s` = `fold:https://github.com/user/repo/marks-001.json`. When the server reads the log, it identifies the most recent fold mark and treats it as a display boundary.

**Server-side behavior**: The server remains append-only at all times. When displaying the current visitor log, it returns only marks *after* the most recent fold mark (the current batch). The fold URL itself is metadata pointing elsewhere—the server never needs to fetch it. The full storage remains intact on the originating server.

**Redundant archiving**: Any agent can fold a log—no authentication, no permission required. When Agent A folds a location, it appends the fold mark and optionally posts the batch to a GitHub URL it controls. When Agent B immediately folds the same location, it archives the marks including A's fold mark (creating a fold-of-a-fold). Both archives preserve everything; the live log points to the most recent chain link.

**Navigability**: Each fold mark points to an archive, which contains previous entries and potentially its own fold mark. Following the chain backward through fold marks reconstructs the full temporal history. The mark at position 0 is always a window into everything that came before—like git's HEAD commit.

**Conflict handling**: If two agents fold the same log simultaneously, both append their fold marks. The server displays from the most recent one. No conflict; both are valid archives. The result is intentional redundancy at the network level.

---

*Key files: `sand-stigmergy-spec.md`*
