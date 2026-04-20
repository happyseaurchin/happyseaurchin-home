# Lobby → Liquid Pool: Spec for Claude Code

**Date**: 14 April 2026
**Repo**: `github.com/pscale-commons/pscale-mcp-server`
**Context**: The lobby tools currently model chat (sequential messages). This spec evolves them to model **concurrent liquid** — a pool of contributions that each participant's LLM synthesizes independently on read.

---

## Mental Model

The lobby is NOT a chatroom. It is a **liquid pool at a coordinate**.

- Participants **contribute** (send liquid into the pool)
- Participants **engage** (read accumulated liquid since their last visit)
- Each participant's **own LLM** synthesizes the liquid into solid for them
- The pool holds raw contributions with timestamps and authors
- No central synthesis. No canonical solid. Each reader gets their own.

The synthesis rules are NOT in the backend. They travel with the reader — as a prompt, a skill, or a memory instruction. The backend can provide a **default hint** so a naive client knows what to do.

---

## Database Changes

### 1. Add `synthesis_hint` to lobby tracking

The lobby already has some form of tracking (likely in `lobby_messages` or a lobby metadata row). Add:

```sql
-- If there's a lobbies/lobby_metadata table:
ALTER TABLE lobby_metadata ADD COLUMN synthesis_hint TEXT DEFAULT NULL;

-- If lobbies are tracked differently (e.g. first message creates the lobby),
-- add a dedicated table:
CREATE TABLE IF NOT EXISTS lobby_state (
  lobby_id TEXT PRIMARY KEY,
  url_hash TEXT NOT NULL,
  synthesis_hint TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Add per-participant read markers

```sql
CREATE TABLE IF NOT EXISTS lobby_read_markers (
  lobby_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (lobby_id, participant_id)
);
```

Updated on every `lobby_read` and `lobby_send` call. When a participant reads or sends, their marker advances to NOW.

### 3. Ensure `lobby_messages` has what we need

Each message should have (confirm these exist):
- `id` (UUID or serial)
- `lobby_id` (TEXT)
- `participant_id` (TEXT)
- `content` (TEXT) — raw contribution, not summarized
- `created_at` (TIMESTAMPTZ)

---

## Tool Changes

### `pscale_lobby_join`

**Current**: Creates/joins lobby at a URL.

**Add parameter**:
```
synthesis_hint (string, optional):
  Default instructions for how a client LLM should synthesize
  accumulated liquid. Only the lobby creator's hint is stored.
  If the lobby already exists, this parameter is ignored.
  
  If not provided by creator, system default is used:
  "Synthesize these contributions into a coherent summary.
   Preserve each participant's key point.
   Flag any disagreements or tensions.
   Note areas of convergence."
```

**Return value** — add:
```json
{
  "lobby_id": "...",
  "participants": ["..."],
  "synthesis_hint": "...",
  "existing": true
}
```

The `synthesis_hint` is always returned so the joining participant's LLM sees it immediately.

### `pscale_lobby_read`

**Current**: Returns all messages in the lobby.

**Add parameter**:
```
since (string, optional):
  ISO 8601 timestamp. If provided, return only messages
  created AFTER this timestamp. If omitted, use the
  participant's stored read marker (from lobby_read_markers).
  If no marker exists, return all messages.
```

**Changed behaviour**:
1. Read messages since the participant's last marker (or `since` param)
2. Update the participant's read marker to NOW
3. Return messages + synthesis_hint + marker info

**Return value**:
```json
{
  "lobby_id": "...",
  "messages": [
    {
      "participant_id": "phenomemental",
      "content": "I think the key issue is...",
      "created_at": "2026-04-14T15:30:00Z"
    },
    {
      "participant_id": "happyseaurchin",
      "content": "Building on that, what if we...",
      "created_at": "2026-04-14T15:35:00Z"
    }
  ],
  "synthesis_hint": "Synthesize these contributions...",
  "previous_marker": "2026-04-14T15:00:00Z",
  "new_marker": "2026-04-14T15:40:00Z",
  "message_count": 2,
  "nothing_new": false
}
```

When no new messages exist:
```json
{
  "lobby_id": "...",
  "messages": [],
  "synthesis_hint": "...",
  "previous_marker": "2026-04-14T15:35:00Z",
  "new_marker": "2026-04-14T15:35:00Z",
  "message_count": 0,
  "nothing_new": true
}
```

The `nothing_new` flag lets the client LLM respond naturally — "No new contributions since you last checked."

### `pscale_lobby_send`

**Current**: Sends a message, returns new messages from others.

**Change**: After inserting the message, update the sender's read marker to NOW. The response should include the same structure as `lobby_read` — accumulated liquid from others since the sender's previous marker, plus synthesis_hint.

```
content (string, required):
  Raw contribution. Sent as-is. No server-side processing.
  The participant's LLM may have condensed this from
  longer input, or the participant may have typed it raw.
  The backend doesn't care.
```

**Return value**: Same shape as `lobby_read` response, but the returned messages exclude the message just sent (the sender already knows what they said). Marker advances past the sent message.

---

## What Does NOT Change

- **2-hour message expiry** — keep it. Old liquid that's been read by everyone doesn't need to persist. But consider: change to "delete messages where ALL participants' read markers have passed them" instead of a flat 2-hour TTL. This is more correct — a message that nobody has read yet shouldn't be deleted even if it's old. (Optional improvement, not required for v1.)

- **30-minute lobby dissolve** — keep it. Lobbies without activity dissolve.

- **Co-presence detection** on `beach_mark`/`beach_read` — keep it. Still useful for discovery.

- **The `.well-known` issue** — not addressed here. That's a separate routing question.

---

## System Default Synthesis Hint

```
Synthesize these contributions into a coherent summary.
Preserve each participant's key point.
Flag any disagreements or tensions.
Note areas of convergence.
Present as a unified understanding, not as a list of who said what.
```

This default is used when the lobby creator doesn't specify a hint. It produces Quaker-clerk-style synthesis — the minute, not the transcript.

---

## The Participant Flow (For Testing)

### First engagement:
1. User tells Claude: "Check the lobby at hermitcrab.me"
2. Claude calls `lobby_read(url="hermitcrab.me", participant_id="happyseaurchin")`
3. No prior marker → returns all messages + synthesis_hint
4. Claude reads the synthesis_hint, applies it to the messages, produces solid in conversation
5. User reads solid, thinks, responds naturally
6. Claude condenses user's response → calls `lobby_send(content="...")`
7. Send returns confirmation + any new messages from others that arrived during step 5-6

### Subsequent engagement:
1. User returns later: "What's new at hermitcrab.me?"
2. Claude calls `lobby_read` → gets only messages since last marker
3. If nothing new: "No new contributions since you last checked."
4. If new liquid: Claude synthesizes and presents solid
5. User contributes → Claude sends

### Multi-participant timing:
- Alice checks in at 2:00, reads 3 messages from Bob/Carol, contributes
- Bob checks in at 2:15, reads Carol's message + Alice's new contribution, contributes
- Carol checks in at 2:30, reads Alice + Bob's new contributions, contributes
- Each person's solid is different because they synthesized at different moments from different deltas
- This is correct behaviour, not a bug

---

## Implementation Notes for Claude Code

1. Check the current lobby table structure first — the lobby tools were added today, so look at what `lobby_join`, `lobby_send`, `lobby_read` handlers currently do.

2. The `lobby_read_markers` table is new. Apply as a migration.

3. The `synthesis_hint` storage location depends on how lobbies are currently tracked. If there's a metadata row per lobby, add a column. If not, create the `lobby_state` table.

4. The read marker update on `lobby_read` should be atomic with the message fetch — read messages WHERE created_at > marker, THEN update marker to NOW, in a single transaction if possible.

5. `lobby_send` should: INSERT message → UPDATE read marker → SELECT new messages from others since previous marker → RETURN. The response gives the sender immediate feedback on what others have contributed.

6. Keep the tool descriptions updated in the MCP registration. The description for `lobby_read` should mention synthesis_hint and the marker system. The description for `lobby_join` should mention the optional synthesis_hint parameter.
