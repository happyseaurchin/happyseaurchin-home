/* listed.js — the proposals on the beach read as one list: the keeper's, the block proposals, and every maker's own,
 * proposed:<handle> (function:proposal 7 and 8). A maker lists a proposal they made with one line in their own block,
 * '<name> — what it is · its page', under their own key, with nobody's permission (David, 23 November 2026: "Go with the
 * non-permission method; the listing on proposals page should go through the check and if it doesn't match, send message
 * to pool of proposal"). Every page that lists proposals reads both through this one module, a proposal shown once where
 * it is first listed, the keeper's list first.
 *
 * A maker's line is shown only once its family passes the check below: the battery's own first faults
 * (pscale://proposal-test, proposal_form.py), the ones a page can read from the family's blocks, ported case by case so
 * the page is never stricter than the battery (thread:138.112, at David's word, 23 November 2026: "yes fix listed.js").
 * A family that fails stays off the list with its first fault in words, which the list page names; weft's daily check
 * (wake:weft 6.31) runs the whole battery over every maker's list and says what to mend in the proposal's own room,
 * pool:<name>, once for each change. This module only reads.
 *
 *   beachListed.read(keeperBlock)      → Promise<{ keeper: [line], makers: [line] }>, a line being
 *                                        { name, what, page, by, ok, fault } (by, ok and fault on a maker's line)
 *   beachListed.lineOf(name)           → Promise<line or null>: the first maker's line for a name, unchecked, as a
 *                                        proposal's own page counts it listed (proposal.html)
 *   beachListed.parse(text)            → { name, what, page } or null
 *   beachListed.fault(name, s, l, r)   → '' where spine s, law l and room r (the room the law names) pass, else the
 *                                        first fault in words
 *   beachListed.roomOf(name, law)      → the room's name, as the page takes it: the first pool:<room> any line of the
 *                                        law names, else the family's own name
 *   beachListed.lines(block)           → every line at a block's floor, in order
 */
(function () {
  'use strict';
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var FAM = 'proposed';

  function readBlock(name) {
    return fetch(BEACH + '?block=' + encodeURIComponent(name), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('the beach answered ' + r.status);
        return r.json();
      });
  }
  function textOf(n) { while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; } return typeof n === 'string' ? n.trim() : ''; }

  /* every line at a block's floor, in the order it grew: a list grows at its root and nests each nine under a summary */
  function lines(b) {
    var floor = 1, n = b, out = [];
    while (n && typeof n === 'object' && n._ && typeof n._ === 'object') { floor++; n = n._; }
    (function walk(n, depth) {
      if (depth === floor) { var t = textOf(n); if (t) out.push(t); return; }
      if (!n || typeof n !== 'object') return;
      if (n._ && typeof n._ === 'object') walk(n._, depth + 1);
      for (var d = 1; d <= 9; d++) if (n[String(d)] != null) walk(n[String(d)], depth + 1);
    })(b, 0);
    return out;
  }
  /* a line: '<name> — what it is · its page', the page optional */
  function parse(t) {
    var m = /^\s*([a-z0-9][a-z0-9-]*)\s*—\s*([\s\S]*?)(?:\s*·\s*(\S+))?\s*$/i.exec(String(t || ''));
    if (!m) return null;
    return { name: m[1].toLowerCase(), what: m[2].trim(), page: m[3] ? (/^https?:/.test(m[3]) ? m[3] : 'https://' + m[3]) : '' };
  }

  /* ── the check: the battery's first faults, in its own order (family, decisions, room, page), each read as the
     proposal page reads the blocks (proposal.html stepsOf, roomsOf, decisionOf, lawOf) and as proposal_form.py judges
     them. Each says what is wrong in words a maker can act on; the first one found is the one named. ── */
  var MAX_STEPS = 12;   /* proposal.html stepsOf stops here */
  var TOK = "[A-Z][A-Z’']*(?: [A-Z][A-Z’']*)*";
  var CLOSING = new RegExp('(?:^|\\s)(' + TOK + '(?:, ' + TOK + ')*,? or ' + TOK + ')\\.?\\s*$');   /* the words the buttons read */
  var WORD = '[^,a-z]*[A-Z0-9][^,a-z]*';
  var OFFERED = new RegExp('^(' + WORD + '(?:, ' + WORD + ')*,? or ' + WORD + ')$');   /* the words as their maker wrote them */
  function under(addr, k) { return addr + (addr.indexOf('.') < 0 ? '.' : '') + k; }
  function wordsOf(closing) { return closing.split(/,\s*|\s+or\s+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function isDecide(t) { return /^DECIDE\b/i.test(t || ''); }
  /* a decision as the page reads it: the words its buttons offer, and whom it waits on, its last sentence before them */
  function decisionOf(text) {
    var body = String(text).replace(/^DECIDE\s*[—–:-]\s*/i, '').trim(), tokens = ['GO', 'NOT YET', 'CHANGE'], closing = false;
    var m = CLOSING.exec(body);
    if (m) { tokens = wordsOf(m[1]); closing = true; body = body.slice(0, m.index).trim(); }
    var who = '', re = /[.?!]\s+(?=\S)/g, b, cut = -1;
    while ((b = re.exec(body))) cut = b.index + 1;
    if (cut > 0) { var w = body.slice(cut).trim(); if (w.length <= 170) who = w.replace(/\.$/, ''); }
    return { tokens: tokens, closing: closing, who: who };
  }
  /* the words a decision's last sentence offers as its maker wrote them, glosses in brackets set aside, digits kept */
  function offeredWords(text) {
    var body = String(text).replace(/^DECIDE\s*[—–:-]\s*/i, '').replace(/\s*\([^()]*\)/g, '').trim();
    var parts = body.split(/[.?!]\s+(?=\S)/), tail = parts[parts.length - 1].trim().replace(/\.+$/, '');
    var m = OFFERED.exec(tail);
    return m ? wordsOf(m[1]) : null;
  }
  function decisionFault(text, at) {
    var d = decisionOf(text);
    if (!d.who) return 'the decision at ' + at + ' names nobody it waits on: its last sentence, before its words, says whom';
    var offered = offeredWords(text);
    if (offered && offered.join('\u0000') !== d.tokens.join('\u0000'))
      return 'the decision at ' + at + ' offers ' + offered.join(', ') + ', and its buttons read ' + d.tokens.join(', ') +
        ': a word holds capitals and apostrophes alone, with no digit and no gloss in brackets';
    if (d.closing && d.tokens.indexOf('NOT YET') < 0)
      return 'the decision at ' + at + ' closes on its own words (' + d.tokens.join(', ') + ') with no NOT YET, which it keeps as its hold';
    return '';
  }
  /* the decisions a page reads, in its order: each step's 8 down 1 (twelve steps at most) and its side-rooms' 8, then the
     rooms around the proposal, the root's 2 to 7, each of which may ask beside the steps at its 8 (function:proposal 3,
     David's word, 21 November 2026). A step's 8 that does not open DECIDE is a note, never a decision. */
  function decisionsOf(spine) {
    var out = [], node = spine['1'], addr = '1', n = 0;
    while (node != null && n < MAX_STEPS) {
      n++;
      if (typeof node !== 'object') break;
      var d8 = textOf(node['8']);
      if (isDecide(d8)) out.push({ at: under(addr, '8'), t: d8 });
      for (var k = 2; k <= 7; k++) {
        var r = node[String(k)], rd = r && typeof r === 'object' ? textOf(r['8']) : '';
        if (isDecide(rd)) out.push({ at: under(under(addr, String(k)), '8'), t: rd });
      }
      node = node['1']; addr = under(addr, '1');
    }
    for (var j = 2; j <= 7; j++) {
      var room = spine[String(j)], t8 = room && typeof room === 'object' ? textOf(room['8']) : '';
      if (isDecide(t8)) out.push({ at: under(String(j), '8'), t: t8 });
    }
    return out;
  }
  /* every line of a block with its address, the root's as '0' */
  function linesOf(block, addr, out) {
    if (typeof block === 'string') { out.push([addr || '0', block]); return out; }
    if (!block || typeof block !== 'object') return out;
    if (typeof block._ === 'string') out.push([addr || '0', block._]);
    else if (block._ && typeof block._ === 'object') linesOf(block._, addr, out);
    for (var k = 1; k <= 9; k++) if (block[String(k)] != null) linesOf(block[String(k)], addr ? under(addr, String(k)) : String(k), out);
    return out;
  }
  /* the law as the page reads it: the room, the first pool:<room> any line names, else the family's own; the phase, the
     first line opening 'phase:' */
  function lawOf(law, name) {
    var L = { room: '', phase: '' };
    if (law && typeof law === 'object') for (var d = 1; d <= 9; d++) {
      var t = textOf(law[String(d)]), m;
      if (!t) continue;
      if (!L.room && (m = /\bpool:([A-Za-z0-9_-]+)/.exec(t))) L.room = m[1];
      if (!L.phase && (m = /^phase:\s*(set aside|[a-z]+)\b/i.exec(t))) L.phase = m[1].toLowerCase();
    }
    if (!L.room) L.room = name;
    return L;
  }
  function roomOf(name, law) { return lawOf(law, name).room; }
  function fault(name, spine, law, room) {
    /* the family */
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return 'its name holds more than lower-case letters, digits and hyphens';
    if (!spine || typeof spine !== 'object') return 'spine:' + name + ' does not stand on the beach';
    if (!law || typeof law !== 'object') return 'function:' + name + ' does not stand: a family stands when its law stands';
    if (spine._ && typeof spine._ === 'object') return 'its spine’s root is nested, so no page reads its first step at 1';
    if (textOf(spine).indexOf(' — ') < 0) return 'its spine’s root has no title before ‘ — ’';
    if (spine['1'] == null) return 'its spine has no first step at 1';
    if (!/^mode:\s*document\b/.test(textOf(law['1']))) return 'its law’s 1 is not ‘mode: document’';
    /* the decisions: each where a page reads one, and each read as its maker wrote it */
    var decs = decisionsOf(spine), read = {};
    decs.forEach(function (d) { read[d.at] = 1; });
    var stray = linesOf(spine, '', []).filter(function (p) { return isDecide(p[1]) && !read[p[0]]; })[0];
    if (stray) return 'a decision at ' + stray[0] + ' stands where no page reads one: at a step’s 8, a side-room’s 8, or the 8 of a room at the root';
    for (var k = 0; k < decs.length; k++) { var f = decisionFault(decs[k].t, decs[k].at); if (f) return f; }
    /* the room: the one the law names, standing */
    var L = lawOf(law, name), m3 = /\bpool:([A-Za-z0-9_-]+)/.exec(textOf(law['3']));
    if (m3 && m3[1] !== L.room) return 'its law’s 3 names pool:' + m3[1] + ', and the page takes the first room any line of its law names, pool:' + L.room;
    if (!room || typeof room !== 'object') return L.room !== name ? 'its law names pool:' + L.room + ' for its room, and no such room stands' : 'it has no room, pool:' + name + ', for talk and for its check';
    /* the phase: listed by its maker, it is drawn as the kind its law names, the form's own or another */
    var t7 = textOf(law['7']);
    if (!L.phase && t7) return 'its law’s 7 opens ‘' + t7.slice(0, 30) + '’, not ‘phase:’ and its kind';
    return '';
  }

  /* every maker's own list: one read the site keeps a few seconds for a crowd (api/mirrors), else the beach straight;
     the earliest list first, as the arcade's door reads its makers' lists, so a proposal is shown where it was first listed */
  function makersLists() {
    return fetch('/api/mirrors?family=' + FAM, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
      .then(function (d) {
        if (d && d.mirrors) return { mirrors: d.mirrors, born: d.born || {} };
        return fetch(BEACH, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (ix) {
          var names = (ix.blocks || []).map(function (b) { return typeof b === 'string' ? b : (b && b.name) || ''; })
            .filter(function (n) { return n.indexOf(FAM + ':') === 0 && n.indexOf(':', FAM.length + 1) < 0; });
          var out = {};
          return Promise.all(names.map(function (n) { return readBlock(n).then(function (b) { if (b) out[n.slice(FAM.length + 1)] = b; }, function () {}); }))
            .then(function () { return { mirrors: out, born: (ix.born || {}) }; });
        });
      })
      .then(function (got) {
        var born = got.born || {};
        got.hands = Object.keys(got.mirrors || {}).sort(function (a, b) {
          var x = String(born[a] || born[FAM + ':' + a] || ''), y = String(born[b] || born[FAM + ':' + b] || '');
          return x < y ? -1 : x > y ? 1 : a.localeCompare(b);
        });
        return got;
      });
  }
  function makersLines(got, seen) {
    var out = [];
    got.hands.forEach(function (h) {
      lines(got.mirrors[h]).map(parse).filter(Boolean).forEach(function (s) {
        if (seen[s.name]) return;
        seen[s.name] = 1;
        s.by = h;
        out.push(s);
      });
    });
    return out;
  }

  function read(keeperBlock) {
    var keeper = keeperBlock ? lines(keeperBlock).map(parse).filter(Boolean) : [];
    var seen = {};
    keeper.forEach(function (s) { seen[s.name] = 1; });
    return makersLists().then(function (got) {
      var makers = makersLines(got, seen);
      var safe = function (p) { return p.catch(function () { return null; }); };
      return Promise.all(makers.map(function (s) {
        return Promise.all([safe(readBlock('spine:' + s.name)), safe(readBlock('function:' + s.name)), safe(readBlock('pool:' + s.name))])
          .then(function (three) {
            /* the room the law names, where it names another */
            var r = roomOf(s.name, three[1]);
            return r === s.name ? three : safe(readBlock('pool:' + r)).then(function (room) { return [three[0], three[1], room]; });
          })
          .then(function (three) { s.fault = fault(s.name, three[0], three[1], three[2]); s.ok = !s.fault; return s; });
      })).then(function () { return { keeper: keeper, makers: makers }; });
    }, function () { return { keeper: keeper, makers: [] }; });
  }
  /* the first maker's line for a name, unchecked: a proposal's own page counts it listed (function:proposal 8) */
  function lineOf(name) {
    return makersLists().then(function (got) {
      return makersLines(got, {}).filter(function (s) { return s.name === String(name).toLowerCase(); })[0] || null;
    }, function () { return null; });
  }

  window.beachListed = { read: read, lineOf: lineOf, parse: parse, fault: fault, roomOf: roomOf, lines: lines };
})();
