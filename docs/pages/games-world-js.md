# `games/world.js`

the flock world's core (27 Nov 2026, lane coil.1, at David's 'core, flock world … let's build out a whole system'; `spine:flock-world` ONE WORLD at 1.8, TORUS at 1.118, CORE at 1.1111118; thread:155): one world for every flock game to fly, each game a meeple keeping its own play and board. A pure module with no page of its own. It loads as a plain script, defining `window.FlockWorld`, and as a CommonJS module for checks. A hosted game loads it from inside its sandbox as `/games/world.js` through the header's `script-src 'self'`, as it loads `/games/bridge.js`, so the header is never widened.

THE TORUS: a square of patches whose sides wrap, east into west and north into south. At rung r the world is 3^r patches a side. A patch's address is r digits, the coarsest first, each its place in a three-by-three: 1 2 3 / 4 5 6 / 7 8 9, north at the top, 5 the middle. A patch's column and row from the middle are balanced threes, so growing a rung puts a 5 in front of every address and moves nothing. `addrOf`, `patchAt` and `addrAt` go between places, patches and addresses.

THE GROUND (`ground(x, y)`, km, x east and y north) is drawn from where a place is, never from the day. A patch therefore stays itself as the world grows round it, and only the seam is drawn again: the band either side of the torus's edge, 24 km by default, where a place is blended half and half with its twin a world away so the ground runs on unbroken. The ground comes in nine kinds, one per digit, as `world:flock-world` 3 says them: stubble, hedges, meadow, plough, orchard, heath, marsh, woods, ridge.
- high ground is ridge, and the next heath;
- wet low ground is marsh;
- deep woods are woods;
- river valleys are water meadows;
- the rest is farmland, fields three kilometres across choosing among the farm kinds by their shares.

Each place also carries its elevation, wetness, wood, river and cover, from 0 (open) to 1 (deep) for a bird hiding from a hawk. `fields` gives the raw blended fields.

A ROOM'S CROSSING (`crossing(day, game, room)`, keel at 1.118): the open room is room 1, `:2` is room 2, and a friends' room is its word. It starts anywhere on the torus, heads north in spring and summer and south in autumn and winter (Migration's own season, read from the beach's day address), and spreads either side. Its roost is a fixed 300 km on, whatever the world's size, so rooms spread over the world and flocks pass where crossings cross. A heading is a drawn pair made unit by `sqrt`, never an angle.

THE WEATHER (`storm(day, x, y, u)`): fronts crossing the world through the day, a few per patch, each a moving round of rain fading to nothing at its edge. `u` is the fraction of the day flown, so each game's clock reads the same sky. Patches also have names and towns (`place`, `towns`), drawn from where they are.

PORTABLE BY CONSTRUCTION (keel, `pool:flock-world` 2, browsers rounding sin, cos, atan2, exp, log and pow each their own way): it uses only integers, + − × ÷, `Math.floor` and `Math.sqrt`. Its hashes and value noise are Forage's own (`mix`, `hash3`, `n2`), so the world is the same on every phone to the last bit.

THE BEACH KEEPS ITS SIZE: `FlockWorld.load(beach)` reads `world:flock-world` (its 1 `rung: 1`, its 2 `patch: 400 km · crossing: 300 km · seam: 24 km`). Where the beach does not answer it gives the defaults, which are the same. `make(cfg)` builds the world. `mark` (e.g. `w1r1p400c300`) names it, for a run's proof to say which world it was flown in.

CHECKED (scratchpad `world-check.cjs`): the middle of every rung is all fives; north-west is 1, east 6 and south-east 9; growing a rung puts a 5 in front of every address; every patch of rung 2 round-trips through its address; 400 of 400 places inside the world keep their ground when it grows; the seam's largest step is under 2·10⁻⁶; crossings head north in spring and south in autumn, with unit headings; two rooms on a day fly different crossings, and the roost lies 300 km on round the torus. A digest of the ground over four rungs, 64 crossings, the towns, the names and the weather comes out the same in node (V8, Chrome's engine) and bun (JavaScriptCore, Safari's): `8aa5e451`.

NEXT, carried at thread:155: Forage flies it (its bands drawn along its room's crossing, rooms that split, a proof naming the room and the world), then Migration (its country placed along its room's crossing in a room-local frame), the count beyond your room, the world growing by its rooms, and content from the beach.
