# `games/wrap.js`

the wrapper (24 Nov 2026, lane coil.1, at David's 'Build the wrapper kit for hosted games'): the beach's side of every game hosted at `/games/<game>`, around the game and never inside it. David drew the line the same afternoon: the PLUG is a game's mechanics with others (the room plug's introductions and relay, matches, lockstep, rooms that split, scale), the WRAPPER its admin and the beach's text (share, its room and the lines left there, points, your own AI, the board). This is the wrapper, for hosted games first.

WHERE IT STANDS: `games/frame.js` loads it on every frame page, so no game's own pages change, and it lays one handle on the frame page's left edge, mid-height, where no hosted game keeps a control (Coil's and Forage's sit on the top and bottom edges), outside the game's sealed frame, so a tap on it never reaches the game. The handle, a ring and the word 'beach', carries a green dot while anyone is in the game's room.

THE DRAWER it opens is a `<dialog>`: a bottom sheet on a phone, a 400 px panel on the left of a wide screen, light or dark as the person's system is. In it, in order:
- **Share on the String**: the String's own way in, `/string?add=<the game's page>`, in a new tab (`string.md`, `theme-js-share.md`).
- **Send the link**: the phone's share sheet, else copied.
- **Ask your AI about it**: the site's door (`siteDoorOpen`, `door-js.md`) for the game's family where its law stands on the beach, its first message written for the game.
- **Today**: the board's top three and the day's count, from `/api/board` as `/arcade` reads them (a number is a time only where its word is s), and who is in its room now, from the room plug's liquid as `/games` reads it, re-read every half minute.
- **The room**: its last five lines, and a box to leave one, appended to the open room `pool:<game>` in the plug's note shape (`{_, 1: '<name>, a visitor', 2: the day, 3: when}`) as `/arcade`'s box appends one. The line goes under the name the person plays this game under (kept by the frame at `games:<game>:render:who`), else the device's, else one the beach's voice makes. The box keeps its draft (`keepDraft`, key `games:<game>:room`) and takes dictation (`dictate`; its glyph's rules are carried in the wrapper, since the frame page loads no `theme.css`, which would dress the frame around the game).
- **Experience Points**: one line on what play will earn as the proposal stands (`experience-points.md`), linked.
- The way back to `/games` and `/arcade`.

A game the beach knows nothing of (`/api/board` 404, as The Chain) shows no board and no room.

WHAT IT LEAVES ALONE: `theme.js` and the beach's voice load on the first opening and never before, so a game starts as it always did; the frame page sets `data-ai-door="off"` as they load, so the site's corner door and Share stay out of the game's corner, the drawer carrying both. It reads no message from the game's frame and adds nothing to the frame's sandbox or to `vercel.json`'s header for `/games/:game/game`, so the game can reach none of it, and nothing it loads reaches into the game. Never in a page framed by another.

CHECKED headless, served as Vercel serves the repository with `/api/board` read from the live site and every beach write held back: on Coil at 390 and 1280, the handle at the edge, nothing of the site loaded before the drawer opened, the board and the room drawn, Share's address, the box's draft and dictation, no corner door, a line appended in the note shape and shown at the room's top with the box emptied, ✕ handing the keys back to the game, the door opened with a first message for the game's family, the game playing on in its sealed origin, nothing thrown; on The Chain, no board and no room. `smoke-games.mjs forage` passes its seven frame checks with it present.

NEXT, named and not built: the game pointing to the wrapper at the right moment, a word from the game to its frame (an end card's 'share this ride' opening Share with the ride's line), which the frame would take only from its own game, as it takes storage; points once Experience Points lands; and the same kit for a game hosted on its maker's own site, through the beach's scripts it already carries.
