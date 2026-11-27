/* games/census.js — THE COUNT of the flock world (27 Nov 2026, lane coil.1, thread 155 of spine:thread): one line for
 * each live room every half minute, in the census block of the region its flock is over now (world:flock-world 4;
 * spine:flock-world 1.11113; keel's CHANGE at flock-world:keel 1.11118, a block per region from the start, so each
 * region's counts can be kept at the beach that carries it; David's GO at flock-world:happyseaurchin 1.11118, 'Yes.
 * Scalability through federated beaches.'). You connect only to the birds in your room; the rest of the world reaches
 * you as counts, and no server tallies it: each room's host keeps its own line, and every reader sums what stands.
 *
 *   FlockCensus.keeper()        one room's line, kept by its host: k.put(o) as often as it likes (it writes every half
 *                               minute, at once when the flock crosses into another region), k.leave() to blank it
 *   FlockCensus.read(W)         every live line on the world W, from every region, newest first
 *   FlockCensus.regions(W)      the census blocks of W's regions: census:flock-world:1 to :9 at rung 1
 *   FlockCensus.words(o)        a line's words: '31 flying, heading north-east · 3 home · Sedge, Tern'
 *   FlockCensus.sum(lines, game) the rooms, the birds flying and home, across lines (one game's, or all)
 *
 * A REGION is a patch of the world at its rung, named by its address (world.js addrAt; rung 1 is nine patches, 1 to 9,
 * 5 the middle), and its census block is census:flock-world:<address>, open, as a room's liquid is. A LINE stands in
 * one slot of it, the room plug's slot in shape (button/room.js, at the beach): { _: its words, 1: the room
 * (pool:migration:2), 2: the day, 3: when it was written, 4: how many fly, 5: how many are home, 6: the heading in
 * degrees from north, 7: where, 'x,y' in km on the torus, 8: the players' names, only where a room holds five or fewer }.
 * A blank line ('' at the underscore) is a room ended; a line silent for ninety seconds is a room gone; either slot is
 * taken by the next room to come, its own room's slot first, so a host handing over hands its line on. Plain fetch, no
 * key: it runs in a sandboxed game (an opaque origin that reaches the beach and nothing else), on the map and on the
 * shelf alike. */
(function (root) {
  'use strict';
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var EVERY = 30000, GONE = 90000, FEW = 5;
  var skew = 0;   // the beach's clock less this phone's, from the X-Pscale-Now it answers with, so a line's time is the beach's
  function stamp(r) { try { var t = Date.parse(String(r.headers.get('X-Pscale-Now') || '').split('|')[0].trim()); if (!isNaN(t)) skew = t - Date.now(); } catch (e) {} }
  function now() { return Date.now() + skew; }
  function blockOf(addr) { return 'census:flock-world' + (addr ? ':' + addr : ''); }
  function regions(W) {
    var out = [], half = (W.side - 1) / 2;
    for (var py = half; py >= -half; py--) for (var px = -half; px <= half; px++) out.push(blockOf(W.addrOf(px, py)));
    return out;
  }
  function read(block) {
    return fetch(BEACH + '?block=' + encodeURIComponent(block), { cache: 'no-store', headers: { Accept: 'application/json' } }).then(function (r) {
      stamp(r);
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('the beach answered ' + r.status);
      return r.json();
    });
  }
  function post(body) {
    return fetch(BEACH, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) {
        stamp(r);
        return r.json().catch(function () { return null; }).then(function (d) {
          return { ok: r.ok && !(d && d.error), status: r.status, code: d && d.code, error: d && (d.error || d.message), slot: d && d.slot };
        });
      });
  }
  /* every line of a region's block, however deep the beach has nested its slots (the room plug's walk) */
  function slots(block) {
    var found = [];
    (function walk(node, path) {
      if (!node || typeof node !== 'object') return;
      Object.keys(node).forEach(function (k) {
        if (!/^[1-9]$/.test(k) && k !== '_') return;
        var s = node[k], at = path + (k === '_' ? '0' : k);
        if (s && typeof s === 'object' && typeof s['1'] === 'string' && typeof s['3'] === 'string') found.push({ slot: at.replace(/^0+/, ''), entry: s });
        else if (s && typeof s === 'object') walk(s, at);
      });
    })(block, '');
    return found;
  }
  function alive(e, t) { var age = t - Date.parse(e['3']); return typeof e._ === 'string' && e._ !== '' && e['4'] != null && age < GONE && age > -GONE; }
  var POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  function heading(deg) { return POINTS[Math.round((((+deg || 0) % 360) + 360) % 360 / 45) % 8]; }
  function degOf(dir) { var a = Math.atan2(dir.x, dir.y) * 180 / Math.PI; return Math.round((a + 360) % 360); }
  function words(o) {
    var s = (o.flying | 0) + ' flying' + ((o.flying | 0) ? ', heading ' + heading(o.heading) : '');
    if (o.home != null) s += ' · ' + (o.home | 0) + ' home';
    if (o.names && o.names.length && o.names.length <= FEW) s += ' · ' + o.names.join(', ');
    return s;
  }
  function roomOf(name) {
    var m = /^pool:([a-z0-9][a-z0-9-]*)(?::([0-9a-z][0-9a-z-]*))?$/.exec(String(name || ''));
    return m ? { game: m[1], room: m[2] ? (/^\d+$/.test(m[2]) ? +m[2] : m[2]) : 1 } : null;
  }

  function keeper() {
    var region = '', slot = '', room = '', day = '', last = 0, wrote = 0, writing = null, stopped = false;
    function entry(o, blank) {
      var e = { _: blank ? '' : words(o), 1: String(o.room), 2: String(o.day || ''), 3: new Date(now()).toISOString() };
      if (!blank) {
        e['4'] = String(o.flying | 0);
        if (o.home != null) e['5'] = String(o.home | 0);
        e['6'] = String(Math.round(+o.heading || 0) % 360);
        e['7'] = (Math.round(o.x * 10) / 10) + ',' + (Math.round(o.y * 10) / 10);
        if (o.names && o.names.length && o.names.length <= FEW) e['8'] = o.names.slice(0, FEW).join(', ');
      }
      return e;
    }
    /* a slot in the region's block: this room's own (a host handing over hands its line on), else a blank or silent one,
       the longest silent first, and '' where none is free, so the line is appended */
    function claim(reg, rm) {
      return read(blockOf(reg)).then(function (block) {
        var t = now(), mine = null, free = [];
        slots(block || {}).forEach(function (x) { if (x.entry['1'] === rm) { if (!mine) mine = x; } else if (!alive(x.entry, t)) free.push(x); });
        free.sort(function (a, b) { return (Date.parse(a.entry['3']) || 0) - (Date.parse(b.entry['3']) || 0); });
        return mine ? mine.slot : free.length ? free[0].slot : '';
      }, function () { return ''; });
    }
    function write(reg, at, e) {
      var block = blockOf(reg);
      return (at ? post({ block: block, spindle: at, content: e }) : post({ block: block, append: true, content: e })).then(function (r) {
        if (r.ok && !at && r.slot != null) return String(r.slot);
        if (r.ok) return at;
        if (at && r.status === 404) return post({ block: block, append: true, content: e }).then(function (r2) { return r2.ok && r2.slot != null ? String(r2.slot) : ''; });
        return '';
      }, function () { return at; });
    }
    function blankOld() {
      if (!region || !slot) return Promise.resolve();
      var e = entry({ room: room, day: day }, true), reg = region, at = slot;
      return post({ block: blockOf(reg), spindle: at, content: e }).catch(function () {});
    }
    return {
      put: function (o) {
        if (stopped || writing || !o || !o.W || !o.room) return false;
        var t = Date.now(), reg = o.W.addrAt(o.x, o.y), rm = String(o.room);
        var moved = !!last && (reg !== region || rm !== room);
        if (last && !moved && t - last < EVERY) return false;
        var fresh = !last || moved || t - wrote > GONE * 2 / 3;   // a slot held through a long silence may have been taken
        last = t;
        var e = entry(o, false);
        writing = (moved ? blankOld() : Promise.resolve()).then(function () {
          if (moved) slot = '';
          region = reg; room = rm; day = String(o.day || '');
          return fresh ? claim(reg, rm) : slot;
        }).then(function (at) { return write(reg, at, e); }).then(function (at) {
          slot = at; wrote = Date.now(); writing = null;
          if (stopped) return blankOld();
        }, function () { writing = null; });
        return true;
      },
      leave: function () {
        stopped = true;
        return (writing || Promise.resolve()).then(function () { return blankOld(); }).then(function () { slot = ''; region = ''; });
      },
      get region() { return region; },
      get slot() { return slot; }
    };
  }

  /* every live line on the world, from every region, a room once (its newest), newest first */
  function readAll(W) {
    var names = regions(W);
    return Promise.all(names.map(function (b) { return read(b).catch(function () { return null; }); })).then(function (blocks) {
      var t = now(), byRoom = {};
      blocks.forEach(function (block, i) {
        slots(block || {}).forEach(function (x) {
          var e = x.entry; if (!alive(e, t)) return;
          var r = roomOf(e['1']), xy = String(e['7'] || '').split(','), at = Date.parse(e['3']);
          if (!r) return;
          var line = { region: names[i].replace(/^census:flock-world:?/, ''), slot: x.slot, name: e['1'], game: r.game, room: r.room, day: String(e['2'] || ''), at: at,
            flying: +e['4'] || 0, home: e['5'] != null ? (+e['5'] || 0) : null, heading: +e['6'] || 0, x: +xy[0], y: +xy[1],
            names: e['8'] ? String(e['8']).split(/,\s*/).filter(Boolean) : [], words: e._ };
          if (!isFinite(line.x) || !isFinite(line.y)) return;
          if (!byRoom[line.name] || byRoom[line.name].at < at) byRoom[line.name] = line;
        });
      });
      return Object.keys(byRoom).map(function (k) { return byRoom[k]; }).sort(function (a, b) { return b.at - a.at; });
    });
  }
  function sum(lines, game) {
    var s = { rooms: 0, flying: 0, home: 0 };
    (lines || []).forEach(function (l) { if (game && l.game !== game) return; s.rooms++; s.flying += l.flying; s.home += l.home || 0; });
    return s;
  }

  root.FlockCensus = { keeper: keeper, read: readAll, regions: regions, words: words, sum: sum, heading: heading, degOf: degOf, roomOf: roomOf,
    EVERY: EVERY, GONE: GONE, FEW: FEW, BEACH: BEACH };
})(typeof window !== 'undefined' ? window : this);
