/* games/world.js — THE FLOCK WORLD's core (27 Nov 2026, lane coil.1, at David's 'core, flock world … build out a whole
 * system'; spine:flock-world 1.8 ONE WORLD, 1.118 TORUS, 1.1111118 CORE). One world for every flock game to fly, each
 * game a meeple keeping its own play and board (Forage, Migration): the world is the core, the games plug into it.
 *
 * THE TORUS (spine:flock-world 1.116): a square of patches whose sides wrap, east into west and north into south. A
 * patch is a pscale address: at rung r the world is 3^r patches a side, and a patch's address is r digits, the
 * coarsest first, each digit its place in a three-by-three (1 2 3 / 4 5 6 / 7 8 9, north at the top, 5 the middle).
 * The world grows by a rung at the day's turn, the whole of it becoming the middle patch of a world three times as
 * wide, so every address gains a 5 in front and nothing already standing moves.
 *
 * THE GROUND is drawn from where a place is, never from the day, so a patch stays itself as the world grows round it:
 * only the seam, the band where the torus's edges meet, is drawn again when the edges move outward. A day draws
 * where each room flies over it, its crossing (keel at 1.118: a fixed length, and each room its own start and roost
 * from the day and the room's number), so rooms spread over the world and flocks pass where their crossings cross.
 *
 * PORTABLE BY CONSTRUCTION (keel, pool:flock-world 2: browsers round sin, cos, atan2, exp, log and pow each their own
 * way): integers, + − × ÷, floor and sqrt only, as Forage's engine already keeps, so every phone draws the same
 * world to the last bit. Its hashes and noise are Forage's own (mix, hash3, n2), so a meeple reads them the same.
 *
 *   var W = FlockWorld.make({ rung: 1 });              // or FlockWorld.load().then(FlockWorld.make)
 *   W.ground(x, y)          the ground at (x, y) km: { kind 1-9, key, name, elev, wet, river, wood, cover }
 *   W.crossing(day, game, room)  a room's crossing: { start, dir, len, roost, at(s) }, all in km on the torus
 *   W.addrAt(x, y)          the patch's pscale address there; W.place(px, py) its name; W.towns(px, py) its towns
 *   W.storm(day, x, y, u)   the weather's strength there at u, the fraction of the day flown (0 dawn, 1 dusk)
 *
 * Units are kilometres, x east and y north. A game maps its own units and frame onto these (Forage four metres to
 * the unit, north up; Migration twenty metres, north at −y). */
(function (root) {
  'use strict';
  var VERSION = 'w1';
  var DEF = { rung: 1, patch: 400, cross: 300, seam: 24 };   // km: a patch, a day's crossing, the seam's half-width
  var S = 0x51ab7e;                                           // the world's own salt: its ground never moves

  // ── hashing and noise: integers only (Forage's engine, games/forage/game.html), so the world is the same everywhere ──
  function mix(h) {
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function hash3(a, b, c) { return mix(Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x165667b1, 0x85ebca6b) ^ Math.imul((c | 0) + 0x61c88647, 0xc2b2ae35)); }
  function h01(a, b, c) { return hash3(a, b, c) / 4294967296; }
  function hs(a, b, c) { return hash3(a, b, c) / 2147483648 - 1; }
  function strHash(s) { s = String(s); var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function smooth(f) { return f * f * (3 - 2 * f); }
  function n2(x, y, salt) {
    var i = Math.floor(x), j = Math.floor(y), ux = smooth(x - i), uy = smooth(y - j);
    var a = h01(i, j, salt), b = h01(i + 1, j, salt), c = h01(i, j + 1, salt), d = h01(i + 1, j + 1, salt);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* THE NINE KINDS OF GROUND, one per digit, as world:flock-world 3 says them in words: what each is, how much cover
   * it gives a bird from a hawk (0 open to 1 deep), and the farm kinds' share of farmland. A meeple maps them onto its
   * own: Forage's bands, Migration's ridges, marshes and resting woods. */
  var KINDS = [null,
    { key: 'stubble', name: 'Barley stubble', cover: 0, farm: 3 },
    { key: 'hedges', name: 'Hawthorn hedges', cover: 0.5, farm: 2 },
    { key: 'meadow', name: 'Water meadows', cover: 0.1, farm: 2 },
    { key: 'plough', name: 'Plough', cover: 0, farm: 3 },
    { key: 'orchard', name: 'Old orchard', cover: 0.6, farm: 1 },
    { key: 'heath', name: 'Heath', cover: 0.2, farm: 0 },
    { key: 'marsh', name: 'Saltmarsh', cover: 0.1, farm: 0 },
    { key: 'woods', name: 'Woods', cover: 0.9, farm: 0 },
    { key: 'ridge', name: 'High ridge', cover: 0, farm: 0 }
  ];
  var FARM = [];   // the farm kinds by their share, the field's hash choosing among them
  for (var k = 1; k <= 9; k++) for (var f = 0; f < KINDS[k].farm; f++) FARM.push(k);

  /* the fields, on the plane that never ends, in km: high ground in three octaves, wet ground in two, woods, and the
   * rivers where a slow field crosses its middle (a river's line, winding as the field winds); its valley lowers the
   * ground on either side */
  function raw(x, y, o) {
    var e = 0.55 * n2(x / 140, y / 140, S + 1) + 0.3 * n2(x / 45, y / 45, S + 2) + 0.15 * n2(x / 14, y / 14, S + 3);
    var w = 0.6 * n2(x / 90, y / 90, S + 4) + 0.4 * n2(x / 25, y / 25, S + 5);
    var r = n2(x / 70, y / 70, S + 8) - 0.5; if (r < 0) r = -r;
    o.e = e; o.w = w; o.wood = n2(x / 20, y / 20, S + 7); o.r = r;
    return o;
  }

  var MONTH = /^\d{4}(\d)(\d)\d{4}$/;
  /* the month of a day: the beach's day address carries its year, its season (1 January to March … 4 October to
   * December) and the season's month; a plain date is read too, and anything else is taken as March */
  function monthOf(day) {
    var m = MONTH.exec(String(day));
    if (m && +m[1] >= 1 && +m[1] <= 4 && +m[2] >= 1 && +m[2] <= 3) return (+m[1] - 1) * 3 + (+m[2] - 1);
    m = /^\d{4}-(\d{2})-\d{2}$/.exec(String(day)); if (m) return clamp(+m[1] - 1, 0, 11);
    return 2;
  }
  /* north in spring and summer, south in autumn and winter, as Migration's birds fly (its season, south = autumn on) */
  function southOf(day) { var m = monthOf(day); return m >= 8 || m <= 1; }

  var PRE = ['Hollin', 'Wether', 'Thorn', 'Ashby', 'Saltar', 'Brack', 'Lang', 'Holm', 'Rook', 'Merry', 'Fen', 'Cold',
    'Ravens', 'Witter', 'Sedge', 'Marl', 'Ings', 'Crane', 'Swale', 'Elder', 'Kettle', 'Owl', 'Harrow', 'Otter'];
  var SUF = ['by', 'ton', 'ham', 'thwaite', 'dale', 'well', 'stead', 'wick', 'ley', 'ford', 'holme', 'garth'];
  var LAND = ['Moss', 'Carr', 'Moor', 'Levels', 'Wolds', 'Fell', 'Vale', 'Flats', 'Heath', 'Downs', 'Marches', 'Edge'];
  function pick(a, h) { return a[h % a.length]; }

  function make(cfg) {
    cfg = cfg || {};
    var rung = clamp(Math.floor(+cfg.rung >= 0 ? +cfg.rung : DEF.rung), 0, 8);
    var P = +cfg.patch > 0 ? +cfg.patch : DEF.patch, CROSS = +cfg.cross > 0 ? +cfg.cross : DEF.cross, SEAM = +cfg.seam > 0 ? +cfg.seam : DEF.seam;
    var side = 1; for (var i = 0; i < rung; i++) side *= 3;
    var E = side * P, HALF = E / 2;
    if (SEAM > P / 4) SEAM = P / 4;
    var tmp = {}, twin = {};

    function wrap(v) { return v - E * Math.floor((v + HALF) / E); }
    /* the torus's own distance and difference: the shorter way round */
    function dx(a, b) { return wrap(b - a); }
    function dist(ax, ay, bx, by) { var x = wrap(bx - ax), y = wrap(by - ay); return Math.sqrt(x * x + y * y); }

    /* THE FIELDS ON THE TORUS: inside the world each place is itself; within the seam, the band where the edges meet,
     * a place is blended with its twin a world away, half and half at the edge itself, so the ground runs on unbroken
     * round the world. As the world grows the seam moves out and the ground it leaves behind is itself again. */
    function fields(x, y, o) {
      o = o || {};
      x = wrap(x); y = wrap(y);
      raw(x, y, o);
      var ax = HALF - (x < 0 ? -x : x), ay = HALF - (y < 0 ? -y : y);
      if (rung === 0 || (ax >= SEAM && ay >= SEAM)) return o;
      var tx = x - (x < 0 ? -E : E), ty = y - (y < 0 ? -E : E);
      var wx = ax < SEAM ? 0.5 * (1 - sstep(0, SEAM, ax)) : 0, wy = ay < SEAM ? 0.5 * (1 - sstep(0, SEAM, ay)) : 0;
      var e = o.e, w = o.w, wd = o.wood, r = o.r;
      if (wx > 0) { raw(tx, y, twin); e += (twin.e - e) * wx; w += (twin.w - w) * wx; wd += (twin.wood - wd) * wx; r += (twin.r - r) * wx; }
      if (wy > 0) {
        var e2 = 0, w2 = 0, wd2 = 0, r2 = 0;
        raw(x, ty, twin); e2 = twin.e; w2 = twin.w; wd2 = twin.wood; r2 = twin.r;
        if (wx > 0) { raw(tx, ty, twin); e2 += (twin.e - e2) * wx; w2 += (twin.w - w2) * wx; wd2 += (twin.wood - wd2) * wx; r2 += (twin.r - r2) * wx; }
        e += (e2 - e) * wy; w += (w2 - w) * wy; wd += (wd2 - wd) * wy; r += (r2 - r) * wy;
      }
      o.e = e; o.w = w; o.wood = wd; o.r = r;
      return o;
    }

    /* THE GROUND at a place: a river where the river field crosses its middle, its valley either side; high ground
     * as ridge and heath; wet low ground as marsh; woods where the wood field is deep; and the rest farmland, each
     * field a kilometre and a half across choosing its kind by the farm kinds' shares (about a band of Forage's
     * flight, so a flock crosses a field or two a minute) */
    function ground(x, y, o) {
      o = o || {};
      fields(x, y, tmp);
      var river = 1 - tmp.r / 0.012; if (river < 0) river = 0;
      var valley = 1 - sstep(0.012, 0.07, tmp.r);
      var elev = tmp.e - 0.14 * valley; if (elev < 0) elev = 0;
      var kind;
      if (elev > 0.7) kind = 9;
      else if (elev > 0.6) kind = 6;
      else if (tmp.w > 0.64 && elev < 0.46) kind = 7;
      else if (tmp.wood > 0.72) kind = 8;
      else if (valley > 0.55) kind = 3;
      else {
        var wx = wrap(x), wy = wrap(y);
        kind = FARM[hash3(Math.floor(wx / 1.5), Math.floor(wy / 1.5), S + 6) % FARM.length];
      }
      o.kind = kind; o.key = KINDS[kind].key; o.name = KINDS[kind].name; o.cover = KINDS[kind].cover;
      o.elev = elev; o.wet = tmp.w; o.wood = tmp.wood; o.river = river; o.valley = valley;
      return o;
    }

    /* A PATCH: its column and row from the middle (0, 0), and its address. Columns and rows are balanced threes, so
     * each digit is a place in its three-by-three and the middle of every rung is 5. */
    function patchOf(x, y) { return { px: Math.floor(wrap(x) / P + 0.5), py: Math.floor(wrap(y) / P + 0.5) }; }
    function addrOf(px, py) {
      var s = '';
      for (var k = 0; k < rung; k++) {
        var tx = ((px % 3) + 3) % 3, ty = ((py % 3) + 3) % 3;
        if (tx === 2) tx = -1; if (ty === 2) ty = -1;
        s = String(1 + (1 - ty) * 3 + (tx + 1)) + s;
        px = (px - tx) / 3; py = (py - ty) / 3;
      }
      return s;
    }
    function addrAt(x, y) { var p = patchOf(x, y); return addrOf(p.px, p.py); }
    /* the patch an address names, and its middle */
    function patchAt(addr) {
      addr = String(addr || ''); var px = 0, py = 0, m = 1;
      for (var k = addr.length - 1; k >= 0; k--) {
        var d = addr.charCodeAt(k) - 49; if (d < 0 || d > 8) return null;
        px += ((d % 3) - 1) * m; py += (1 - Math.floor(d / 3)) * m; m *= 3;
      }
      return { px: px, py: py, x: px * P, y: py * P };
    }
    /* a patch's name and its towns, drawn from where it is, so a patch keeps them as the world grows */
    function place(px, py) {
      var h = hash3(px, py, S + 20);
      return pick(PRE, h) + ' ' + pick(LAND, hash3(px, py, S + 21));
    }
    function towns(px, py) {
      var out = [], n = 4 + (hash3(px, py, S + 22) % 4);
      for (var t = 0; t < n; t++) {
        var x = px * P + hs(px, py * 31 + t, S + 23) * P * 0.48, y = py * P + hs(px * 31 + t, py, S + 24) * P * 0.48;
        var h = hash3(px * 7 + t, py * 13 - t, S + 25);
        out.push({ x: wrap(x), y: wrap(y), name: pick(PRE, h) + pick(SUF, h >>> 8) });
      }
      return out;
    }

    /* A ROOM'S CROSSING: from the day, the game and the room (the open room is room 1, the next :2, and a friends'
     * room its word), a start anywhere on the torus and a heading north in spring and summer, south in autumn and
     * winter, spread either side; the roost a fixed length on, so every crossing is a day's flight however big the
     * world grows (keel at 1.118). The heading is a drawn pair made unit by sqrt, never an angle. */
    function crossing(day, game, room) {
      var key = String(day) + '|' + String(game || '') + '|' + String(room == null ? 1 : room);
      var h = strHash('crossing|' + key), ax = 0, ay = 0, q = 0;
      for (var t = 0; t < 32; t++) { ax = hs(h, t, 1); ay = hs(h, t, 2); q = ax * ax + ay * ay; if (q > 0.04 && q <= 1) break; }
      var dyb = southOf(day) ? -1.25 : 1.25;
      ay += dyb; var l = Math.sqrt(ax * ax + ay * ay);
      var dir = { x: ax / l, y: ay / l };
      var start = { x: wrap((h01(h, 3, 0) - 0.5) * E), y: wrap((h01(h, 4, 0) - 0.5) * E) };
      function at(s) { return { x: wrap(start.x + dir.x * s), y: wrap(start.y + dir.y * s) }; }
      return { key: key, day: String(day), game: String(game || ''), room: String(room == null ? 1 : room), start: start, dir: dir, len: CROSS, roost: at(CROSS), at: at };
    }

    /* THE WEATHER: storm fronts crossing the world through the day, a few for each patch, each a moving round of rain
     * whose strength falls to nothing at its edge; u is the fraction of the day flown, so every game's clock reads
     * the same sky (Migration's 210 seconds, a slower game's its own) */
    var fronts = {};
    function frontsOf(day) {
      var key = String(day); if (fronts[key]) return fronts[key];
      var h = strHash('weather|' + key), n = 2 + side * side, out = [];
      for (var t = 0; t < n; t++) {
        var vx = hs(h, t, 31), vy = hs(h, t, 32), sp = 180 + 260 * h01(h, t, 33);
        var l = Math.sqrt(vx * vx + vy * vy) || 1;
        out.push({ x: (h01(h, t, 34) - 0.5) * E, y: (h01(h, t, 35) - 0.5) * E, vx: vx / l * sp, vy: vy / l * sp,
          r: 50 + 70 * h01(h, t, 36), I: 0.55 + 0.45 * h01(h, t, 37), u0: 0.6 * h01(h, t, 38), u1: 0 });
        out[t].u1 = out[t].u0 + 0.25 + 0.4 * h01(h, t, 39);
      }
      return (fronts[key] = out);
    }
    function storm(day, x, y, u) {
      var fs = frontsOf(day), s = 0;
      for (var t = 0; t < fs.length; t++) {
        var F = fs[t]; if (u < F.u0 || u > F.u1) continue;
        var ramp = sstep(F.u0, F.u0 + 0.06, u) * (1 - sstep(F.u1 - 0.06, F.u1, u));
        var cx = wrap(F.x + F.vx * u), cy = wrap(F.y + F.vy * u);
        var ddx = wrap(x - cx), ddy = wrap(y - cy), qq = (ddx * ddx + ddy * ddy) / (F.r * F.r);
        if (qq >= 1) continue;
        var b = (1 - qq) * (1 - qq) * F.I * ramp; if (b > s) s = b;
      }
      return s;
    }

    return {
      version: VERSION, rung: rung, patch: P, cross: CROSS, seam: SEAM, side: side, extent: E, kinds: KINDS,
      wrap: wrap, dx: dx, dist: dist, fields: fields, ground: ground,
      patchOf: patchOf, addrOf: addrOf, addrAt: addrAt, patchAt: patchAt, place: place, towns: towns,
      crossing: crossing, storm: storm, fronts: frontsOf, monthOf: monthOf, southOf: southOf,
      /* what a proof names: the world it was flown in, every measure that draws its ground and its crossings */
      mark: VERSION + 'r' + rung + 'p' + P + 'c' + CROSS + 's' + SEAM
    };
  }
  /* the world a proof names, made again: 'w1r1p400c300s24' → the same world, wherever the proof is checked */
  var worlds = {};
  function fromMark(mark) {
    var m = /^w1r(\d+)p(\d+)c(\d+)s(\d+)$/.exec(String(mark || ''));
    if (!m) return null;
    return worlds[mark] || (worlds[mark] = make({ rung: +m[1], patch: +m[2], cross: +m[3], seam: +m[4] }));
  }

  /* THE WORLD AS THE BEACH KEEPS IT: world:flock-world, its 1 the rung ('rung: 1') and its 2 the measures ('patch: 400
   * km · crossing: 300 km · seam: 24 km'); where the beach cannot be read, the world as this file was made */
  function load(beach) {
    var base = String(beach || 'https://beach.happyseaurchin.com').replace(/\/+$/, '');
    function voice(n) { while (n && typeof n === 'object') n = n._; return typeof n === 'string' ? n : ''; }
    function num(s, word) { var m = new RegExp(word + ':\\s*(\\d+)').exec(s); return m ? +m[1] : undefined; }
    return fetch(base + '/.well-known/pscale-beach?block=' + encodeURIComponent('world:flock-world'), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (b) {
        if (!b) return { rung: DEF.rung, source: 'default' };
        var one = voice(b['1']), two = voice(b['2']);
        return { rung: num(one, 'rung'), patch: num(two, 'patch'), cross: num(two, 'crossing'), seam: num(two, 'seam'), source: 'beach' };
      }, function () { return { rung: DEF.rung, source: 'default' }; });
  }

  var API = { make: make, load: load, fromMark: fromMark, version: VERSION, defaults: DEF, kinds: KINDS, strHash: strHash, hash3: hash3, n2: n2 };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.FlockWorld = API;
})(typeof self !== 'undefined' ? self : this);
