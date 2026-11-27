# `flock-world/map.html`

the flock world's map (27 Nov 2026, lane coil.1, at David's 'core, flock world … let's build out a whole system'; thread:155), at `/flock-world/map`, named at `world:flock-world` 6. It shows the world itself, drawn by `games/world.js` exactly as each game draws it, so what it shows is what every phone flies. The proposal's crafted page, `/flock-world`, is a picture of the idea; this is the world as built.

WHAT IT SHOWS:
- **The torus** at the size the beach keeps (`FlockWorld.load`, `world:flock-world` 1 and 2): a square canvas, north up, its ground sampled 300 × 300 and drawn at the screen's width, high ground a shade lighter, rivers in water. The patches' lines carry each patch's address and its name.
- **Today's crossings** for Forage and Migration, rooms 1 to 3 each: a solid line for the open room and dashed for the next two, ▲ at the start and ● at the roost. A line leaving one edge comes in at the other. A room with players in it now is drawn heavier and marked live in the list.
- **A tap on the map** names the place: its patch's address and name, its ground, how high, how wet, its cover, and the rooms that fly within 25 km of it that day.
- **The day** steps back and forward a day at a time from the beach's own clock (`X-Pscale-Now`, the day address as the games compute it).
- **The list of today's crossings** gives each room's start and roost by patch name and address, and its heading.
- **The legend** of the nine kinds and the rivers.

WHO IS FLYING NOW: read as the games shelf reads it (`games.md`): each room's liquid, `liquid:pool:<game>` and `:2`, `:3`, a slot counting while it is under 25 seconds old by the beach's clock, re-read every half minute while the page is in view. It writes nothing.

ITS LOOK: the site's own (`theme.css`, `theme.js`, the bar through `siteDoors`), light and dark. The ground's nine kinds and the rivers have a palette of their own in each register (`--g1` to `--g9`, `--gw`), since a map's colours are its data. The crossings wear the theme's two accents, amber for Forage and teal for Migration. `<html data-family="flock-world">`, so the corner door names the family, whose phase is now project.

CHECKED (scratchpad `map-check.mjs`), served as Vercel serves the repository and read against the live beach, every write held back, on a phone at 390 in the dark and a desktop at 1280 in the light:
- the world is drawn, with six rooms and ten legend lines;
- there is no sideways scroll;
- a tap at the middle names patch 5 and its ground;
- the next day flies other crossings;
- nothing is thrown and nothing is written.
