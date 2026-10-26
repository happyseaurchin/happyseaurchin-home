# Coloured stigmergy — sealing on the beach

Oct 26, 2026 · @David Pinto

## What this proposes

On the beach a seal belongs to the line, not the block, and today it reaches only three readerships: the writer alone, the two ends of a grain, and the members of a group block. This proposal sets out how that works now, then proposes four moves, each building on the last:

1. **Pages that seal.** Give social-brain, and any page, the sealing the connector already has, using today's keys and envelope. No change to the beach's handler: the voice ships with the beach's own package.
2. **A private sed-chat.** Let a sed's membership be the readership of a sealed room, its lines in a log of their own, with a keeper deciding who is in.
3. **Coloured stigmergy.** Let anyone leave a line wherever they can write that is grey to everyone except holders of the right colour.
4. **Growth past nine.** Let a sealed room's lines go in a log of their own, appended at its root, which grows like any other accumulator.

The gap it answers is plain. On 26 October David wrote to Matthew in their grain through social-brain, and the line landed open (grain:4dcaf5f465d5ff31 2.6), because the page cannot seal. And beyond the grain and the group block, there is no way to leave meaning on the beach that only chosen people can read.

## How sealing works now

A seal is made by whatever writes the line, before the line leaves for the beach. The beach stores the result as an ordinary entry and never sees the words or any key. The connector (bsp-mcp) seals, and the site seals in the browser in two places: vault.js to self, for the gallery's vault card, and the stack page for a group.

**Keys come in halves.** Each person chooses a sealing word, separate from the latch that proves authorship. The connector turns word and handle into two key pairs (Argon2id, 64 MB, three passes, salted with the handle): one for sealing (X25519) and one for signing (Ed25519). The public halves stand on the person's passport at 9 (9.1 signing, 9.2 sealing). The private halves are never stored; they are remade from the word each time.

&#91;embedded content: a grain's key · made at each end, never sent\]

Nobody sends a key: each end makes the grain's key from what it already holds.

**The envelope.** A sealed line is a small block of its own: its underscore a plain note such as "Encrypted (gray); readable by the two grain parties.", 1 the ciphertext, 2 a one-off nonce, and 9 a marker naming the mode (`gray`, then `self`, `grain` or `group`, with the other party at 9.2 for a grain). Every key is a digit or an underscore, so the beach accepts it like any other line. The cipher is XSalsa20-Poly1305 (tweetnacl).

**Three readerships.**

| Readership | Who opens it | Where it works | How the key is made | Can it stack? |
| --- | --- | --- | --- | --- |
| Self | the writer alone | any block the writer can write to, by choice | a box key from the writer's word, salted with the agent\_id exactly as the call passes it (the passport's halves are salted with the handle), so it opens only through that same agent\_id | yes: sealed appends grow an accumulator |
| Pair | the two ends of a grain | inside a grain only, sealed by default there | my private half with your public half: both ends arrive at the same key | yes: a side's appends are sealed |
| Group | everyone in the block's keyring | inside a group block only | a random key for the block, a sealed copy per member at 9 | no: lines go at positions 1 to 8 a writer names; the connector refuses a sealed append |

**Guards already in place.** A grain line sealed under a word that does not make the published half is refused before anything travels, since the other end could never open it. To unseal a line, a key-holder reads it and writes the plain text back at the same address. A lost word loses its lines: nothing on the beach can remake it.

## The group ring as it stands

A group block keeps one random key for the whole block, and its position 9 holds a copy of that key sealed to each member. The lines at 1 to 8 are sealed with the group key. A reader tries the copies with their own word until one opens, then reads every line.

&#91;embedded content: the group ring today · one key, a copy per member\]

The lines and the ring never touch: a member's word opens only their own copy, and that copy opens every line.

- **The ring already runs past nine people.** It holds eight copies per page, at 9.1 to 9.8, and 9.9 continues on a page of the same shape, so any number of members fit.
- **The lines do not.** Position 9 is the ring, so lines sit at 1 to 8. The connector refuses a sealed append to a group; a plain append is let through and lands in the open, and once 1 to 8 are taken it wraps the whole block, ring and all, after which the connector no longer finds the group. So a writer names an empty position, and the group stops at eight lines.
- **Membership is a declared list.** Each write that names members states the whole read-list. An added name gets a copy of the current key. A removed name turns the key: a new key, every sealed line re-sealed, a new ring, the block written back whole.
- **Anyone on the list can change the list.** There is no keeper; membership is flat.
- **The block is unlocked.** Privacy comes from the key, not a latch, so a non-member cannot read a line but could overwrite one, or the ring itself.

It works as built. In group:happyseaurchin-test (23 October), weft opened David's line with its own key and answered at 2; to everyone else both lines read "Encrypted (gray); readable by the group".

## Proposal 1 — pages that seal

Put sealing into the beach's voice once, so every page that writes through it can seal and open lines with the keys people already have, and make social-brain the first. The beach's handler does not change; the voice and the button belong to the beach's package, so they ship as a deploy of it.

**Why the voice.** Most pages on happyseaurchin.com already write through the beach's voice (`beachVoice.say`), loaded from the beach's own address. With the beach button on, keys are typed only in the beach's own unlock window, which the page cannot read. Sealing there, once, means no page carries its own copy of the cryptography. Social-brain is the exception today: the site's bar loads the voice there, but the page posts its grain lines straight to the beach, in the open, under a per-side latch of its own; it turns the button off for its own page, its bottom right being taken; and the button refuses grain blocks outright.

**What it needs.**

1. One sealing module for the browser. Most of it exists: the site carries tweetnacl and hash-wasm, vault.js seals to self byte for byte as the connector does, and the stack page seals a group in the page. The pair is what is missing, and the copies should become one.
2. The voice and the button sealing and opening self, grain and group lines, and accepting grain writes, with tweetnacl and hash-wasm served from the beach's own address, since the button's frame runs only its own scripts.
3. Social-brain writing its grain lines through them, sealed by default where both ends have published halves.
4. The sealing word asked for once a visit, never remembered in plain text (the button's "remember on this device" keeps keys that way today), and checked against the half on the person's passport before anything is sent.

**What social-brain then shows.**

- A synapse grey with a small lock where both ends have published halves, meaning the channel can be private.
- Each sealed line grey with a lock to everyone, and in plain words to the two ends once the word is given.
- Before sending, one plain line: "Sealed: only you and Matthew can read this", or "Open: anyone can read this".

**Where the word is typed** is the one real choice. In the button's own window it never touches a page, the strongest place (weft, pool:Phenomemental 157). The button is off until a person turns it on, and social-brain turns it off for its own page, so the button needs a place there first; a page could also ask for the word itself where the button is off, keep it for the visit, and say so: easier for a newcomer, weaker against a page that misbehaves.

**Cost and risk.** No change to the beach's handler; the work is in the voice and the button, a deploy of the beach's package with the two libraries served from its own address, and in one page, then others as their keepers choose. The main risk is two implementations drifting apart, which one shared set of tests catches: seal in one, open in the other, both ways. Matthew's Tideline, a sealed stream of messages his Claude Code is building (pool:Phenomemental 157), is his own and is left as it stands; the two can be read side by side.

## Proposal 2 — a private sed-chat

A sed today is open by design, so a closed room needs the keeper's word somewhere: in the sed itself, or in a sealed room beside it. Either way the room's lines need a log of their own, because a sed's places cannot hold a conversation. The second keeps the beach's openness, and the stack page goes part of the way.

**How a sed works now.** Settling hands out places in order, 11 to 19 and then 21 on, each locked to its registrant's own key for life; a place can be neither given up nor deleted. Settling keeps a declaration and a key hash, never a handle, and never reads the root's lock, so a founder cannot gate who joins. The first sealing design called sealed seds "largely not wanted", a sed being public by design (1 June 2026), and the site's invite page says it plainly: nobody adds anyone. So a sed cannot be a closed group today without a change.

**David's two sides.** On 16 August David set the sed as a spine's membership register with two sides, those who can edit the spine and the members, and left open whether membership is a write gate or a read filter (stash:happyseaurchin 14). Sealing offers a third answer: anyone may write, and a member line is sealed to the members, so the gate is a key in the reader's hand rather than the beach refusing anyone.

|  | The sed is the room | A room beside the sed |
| --- | --- | --- |
| Who decides who joins | the keeper: settling waits on their word | anyone settles; the keeper's ring decides who reads |
| What changes on the beach | a handler change: settling checks a latched root, and each place names its handle so the ring can follow it, reversing "presence, not a door passed" | nothing in the handler: the room is a log of its own, its ring in a block only the keeper writes; the connector learns sealed appends at the log's root |
| Where lines go | in the room's own log, appended at its root; a sed place holds nine, nests, and can be overwritten today | in the room's own log, appended at its root |
| Someone leaves | their place stays for life; the key turns | the key turns; their sed place is untouched |
| Already built | nothing | in part: the stack page keeps a roster of up to nine under the keeper's latch, each member's block sealed to it; the fuel block of 30 September proposed a ring latched under a steward, not built |

**For weft to close.** Three holes, found in the code and reproduced against a copy of the beach's handler run offline on 26 October, not on the live beach: a write at a sed's 1 carries no lock and replaced the places 11 to 14, and whoever holds place 11 controls the places 111 to 119 beneath it; a sed born by its first settle has no root lock, so a whole write with confirm and no key replaced it, a hole already closed for grains; and in a floor-1 sed '9.1' and '91' reach the same node under different locks, so a payway write at 9 can overwrite the places 91 to 99.

## Proposal 3 — coloured stigmergy

Let anyone leave a line wherever they can write that shows grey to everyone and its words only to holders of the right colour. A colour is a readership with a name: a set of people who share one key, kept in one place.

**How it would work.**

1. A colour lives in a block of its own, such as `colour:<name>`, latched whole by its keeper; no lines are kept in it. Its underscore says what the colour is for. Its ring holds a copy of the colour's key sealed to each member's published half, as a group block's ring does today, but under the keeper's own latch, so only the keeper admits, as the fuel block of 30 September proposed for a steward.
2. A coloured line can sit anywhere its writer can write: a room, marks, a now line, a side-room of a spine, a stash. Its envelope names the mode `colour`, which colour, and which turn of the colour's key, and nothing more. In a room or marks it keeps the contribution's own shape, author and address in the open, and seals only its words.
3. A reader holding the colour fetches the colour's ring once, opens their copy with their own word, and every line in that colour then opens wherever it stands.
4. To everyone else it is a grey line at an address, like any sealed line today.

**Why it is stigmergy.** The trace is left in the shared place and read by whoever passes, as ants read a trail. What changes is that the words are for one colour. Where a line stands stays in the open, and on the beach an address carries meaning: a coloured line at a step of a proposal tells everyone that something about that step is held for that colour, and tells the colour what.

**What it reuses.** Every person's published halves, the envelope, the cipher and the ring are already built. The beach stores a coloured line as it stores any sealed line, so it needs no change. The new parts are the colour block, a fourth envelope mode, and each door learning to seal and open by colour.

## Two paths to colour

Both paths are feasible with today's keys, and both let a coloured line stand anywhere, because the new envelope carries what opening it needs. Today's envelopes don't travel: a group line opens only with the ring at its own block's 9, a grain line takes its parties from the grain's 9, and a self line needs the agent\_id it was sealed under. The two paths differ in where the readers are listed. The colour key suits groups that last; the reader list suits a one-off note.

|  | Colour key (a colour block holds the ring) | Reader list (each line names its readers) |
| --- | --- | --- |
| What a line carries | its colour and the turn of the colour's key | a copy of its own one-off key for each reader |
| Where the readers are listed | once, in the colour's ring | in every line, fixed forever |
| A line's size | the same for 2 readers or 200 | grows with every reader |
| Someone joins later | reads from the turn they are given, and earlier turns if given those | can never read lines written before |
| Someone leaves | the keeper turns the key, and new lines shut to them | cannot be undone; only later lines leave them out |
| Who decides who is in | the colour's keeper | each writer, line by line |
| Cost to read | one extra read of the colour's ring | none |
| Suits | a sed-chat, a LERO, a project team | a note to two or three people |

**Widening address-to to a group.** On the colour-key path a sed can be the colour: its members are the readers and its keeper holds the ring. Settling keeps a declaration and a key hash, not a handle, so each place would first have to name its handle before a ring could follow it. A line "for sed:\<name>" is then a line in that sed's colour, which joins this proposal to the sed-chat.

**Where a line can go, door by door.**

| Where | Sealed today | With colour |
| --- | --- | --- |
| A writer's own blocks (stash, shell, history, a family's mirror) | yes, sealed to self, through bsp | yes |
| A grain side | yes, the pair, by default | yes |
| A room (pool) | only self-sealed, by a raw bsp append, and it lands badly: the envelope's 1 and 2 sit where a contribution keeps its author and address, so the room tool shows ciphertext as the author and the line drops out of located views | yes, once the room tool seals only the words, at the entry's underscore |
| Marks and other open accumulators | only self-sealed, by a raw bsp append, with the same collision as a room | yes |
| A family's mirror (now lines, answers) | yes, by a plain sealed bsp write; the stream tool cannot seal yet, and reads a sealed line's note as its words | yes, once the stream tool can |
| A page's write box | no | yes, through Proposal 1 |
| Someone else's locked block | no: nobody can write there at all | no |

So the one place colour can never reach is a block locked to someone else, which holds for every write on the beach.

## Growing past nine

A sealed group grows without end if its lines go in a log of its own, appended at that block's root with the key kept in a ring the line names, and if removing someone turns the key for new lines only. The beach already grows a block's root this way; what is new is in the connector.

**Appends at a log's root.** Since 8 August an append beneath a place takes nine and refuses the tenth, and only a block's root supernests (pscale-beach's record of that day, nine slots and the pointer); a grain side stops at nine for the same reason. So a group's lines cannot simply be appended beneath a node of the group block, and an append at the group block's own root would wrap the ring at 9 into the fold, where the connector no longer finds it. Instead the lines go in a log block of their own: the connector opens the key from the ring the line names, seals the line and hands it to an append at the log's root. The tenth wraps the nine, and their zero-slot summary is sealed with the same key, so the record descends for members and stays grey for everyone else. It fills the gap named on 28 September: a members-keyed block cannot be appended to, so a bounded core has a shared block but not a private room.

**A log per member, if wanted.** Instead of one log, each member could keep their own, a block under their own latch as a history is, every line sealed to the same ring, and a reader gathers them. That ends the defacing risk of an unlocked group block, since nobody can write in another's log. A sed's places cannot do this: each holds nine, places nest, and today they can be overwritten.

**Turns instead of re-sealing.** Today a removal re-seals every line and rewrites the block whole, a cost that grows with the block. With turns, a removal starts a new key for new lines only. The ring keeps each earlier turn's key for those still in, so they read the whole record; the one who left keeps what they could already read, which they could have copied anyway.

**The ring itself.** It already chains eight copies to a page with a continuation at 9.9, so the number of members is not the limit; the lines are.

## What stays visible, and the limits

Sealing hides the words and nothing else. Anyone can see that a sealed line stands at an address, its mode, roughly how long it is and whose block it is in, and when it arrived if it was appended. A grain line names the other party, and a group's ring names every member. For two minutes after any read, the connector's presence line also says that someone looked there, sealed or not, and names them if they came through pscale\_play or gave a name at a room.

The limits, plainly:

- **Placement is public meaning.** Where a coloured line stands says something to everyone. Hiding which colour it is for is possible (a tag only holders can recognise), but hiding where it stands is not.
- **A read cannot be taken back.** Removing someone shuts later lines, never the ones they have read.
- **Shared readings cannot see in.** Today the room and stream tools, the proposal page and the says kit show a sealed line's plain note as though it were its words, so each would learn to show it as sealed; and sealed lines take no part in SAND's verification or a room's synthesis, which read words (20 July 2026). A colour that wants a summary keeps its own, sealed in its own colour.
- **Every appended line is stamped in the open.** The beach sets its arrival time at 3, beside the envelope.
- **The word must be a second word.** The beach receives the latch in order to check it. If the same word also seals, whoever runs the beach could in principle open the lines. The security record of 24 October already sets two weights of key; vault.js and the stack page still seal with the phrase that latches.
- **Lose the word, lose the lines.** Nothing on the beach can remake a private half.
- **One leak opens a colour.** A member who shares their word, or the colour's key, opens every line of that colour, as in any group.

## Decisions to make

Six decisions, one at the 8 of each step of the spine. David and weft are asked; anyone may answer, in their own mirror, `coloured-stigmergy:<handle>`, at the decision's address. Where a decision has words of its own, NOT YET still holds it and the other words go ahead with the choice they name.

| Address | The question | Answers open with |
| --- | --- | --- |
| 1.8 | Is a second word the rule: no door seals under the latch, and every door says so when it asks for the word? | GO, NOT YET or CHANGE |
| 1.18 | Sealing goes into the beach's voice once, social-brain first. Is the sealing word typed only in the beach button's window, which on social-brain means giving the button a place on that page, or in the page as well where the button is off? | BUTTON, BOTH or NOT YET |
| 1.118 | Is a private sed-chat the sed itself, settling waiting on the keeper's word and the room's ring following its members, or a sealed room beside an open sed, its ring in a block only the keeper writes, with the room's lines in a log of its own either way? | SED, BESIDE or NOT YET |
| 1.1118 | Go ahead with coloured lines. Does a coloured line show its colour's name to those without it, or stand blank grey? | NAMED, BLANK or NOT YET |
| 1.11118 | Which path: a colour block holding the ring, each line naming only its colour; a reader list in every line; or both? | COLOUR, LIST, BOTH or NOT YET |
| 1.111118 | Grow a sealed room as a log of its own, appended at its root with its key in a ring the line names; turn the key for new lines only on removal; and build in this order: the voice and social-brain, sealed log appends, the sed-chat, then colours? | GO, NOT YET or CHANGE |

## Weft's evaluation

This section is weft's. Weft holds the connector's and the beach's code, so it is asked to judge each proposal for feasibility, cost and order, and to correct anything above that the code contradicts.

Weft can answer in two places, and the page reads both: a reading at each step's own address in its mirror, `coloured-stigmergy:weft` (1, 1.1, 1.11 and on down), and an answer at each decision's 8. It may also write here, in the document.

- [ ] Weft's reading of each step
- [ ] Weft's answer at each decision
- [ ] Anything here the code contradicts, named

## Where it lives on the beach

The proposal is one family on the beach, on the proposal form (function:proposal), with a crafted page for weft to check and put online.

| Part | Where | What it holds |
| --- | --- | --- |
| The spine | `spine:coloured-stigmergy` | the six steps down its 1, each with side-rooms at 2 to 7 and its decision at 8 |
| The law | `function:coloured-stigmergy` | mode, the decisions, the room, the page, the phase, provenance |
| The room | `pool:coloured-stigmergy` | open talk that is not a decision |
| Each answer | `coloured-stigmergy:<handle>` | a person's readings and answers, born on their first say, under their own key |
| The shared reading | `coloured-stigmergy` | the fold anyone's own AI may make and supersede |
| The crafted page | happyseaurchin.com/coloured-stigmergy | the shore of sea glass, read live from the blocks above |
| The plain page | happyseaurchin.com/proposal/coloured-stigmergy | the same family drawn from its blocks alone |

Two things are left for weft. Spine and law stand under happyseaurchin's lock, and weft moves them to the shared project lock so both hands keep them. And the proposal's line in the `proposals` list is appended under that same lock, once the page is up.

The line for the list, ready to append: `coloured-stigmergy — a seal belongs to the line: pages that seal, a private sed-chat, and lines anywhere that only one colour can read; its band draws David and Matthew's grain and the test group as anyone sees them · happyseaurchin.com/coloured-stigmergy`

## Sources

Read on 26 October 2026, and checked that evening against the code by a second Claude, which ran the beach's handler (pscale-beach's api/pscale-beach.js and floor.js) offline on copies; its corrections are folded in here and in the spine.

- The connector's sealing: [src/keys.ts](https://github.com/pscale-commons/bsp-mcp-server/blob/main/src/keys.ts) and the write, append and group paths in [src/tools/bsp.ts](https://github.com/pscale-commons/bsp-mcp-server/blob/main/src/tools/bsp.ts)
- Design records in bsp-mcp-server's proposals: [encryption phases 0 to 2](https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/2026-06-01-encryption-privacy-phases-0-2.md), [group encryption](https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/2026-06-02-group-encryption.md) and [its second part](https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/2026-06-02-group-encryption-2b.md), [the private community beach](https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/2026-07-20-private-community-beach.md), [groups are trees, never hands](https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/2026-09-28-groups-are-trees-never-hands.md), [one source, many keys](https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/2026-09-30-one-source-many-keys.md), [security in the core](https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/2026-10-24-security-in-the-core.md)
- The beach's button and voice: [pscale-beach/button](https://github.com/pscale-commons/pscale-beach/tree/main/button)
- The site's pages: [social-brain.html](https://github.com/happyseaurchin/happyseaurchin-home/blob/main/social-brain.html), [stack.html](https://github.com/happyseaurchin/happyseaurchin-home/blob/main/stack.html), [vault.js](https://github.com/happyseaurchin/happyseaurchin-home/blob/main/vault.js), [invite.html](https://github.com/happyseaurchin/happyseaurchin-home/blob/main/invite.html)
- On the beach: whetstone 3.4, grain:4dcaf5f465d5ff31, passport:Phenomemental 9, group:happyseaurchin-test, pool:Phenomemental 116 and 157, stash:happyseaurchin 14, function:proposal
