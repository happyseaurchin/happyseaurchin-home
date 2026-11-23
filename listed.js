/* listed.js — the proposals on the beach read as one list: the keeper's, the block proposals, and every maker's own,
 * proposed:<handle> (function:proposal 7 and 8). A maker lists a proposal they made with one line in their own block,
 * '<name> — what it is · its page', under their own key, with nobody's permission (David, 23 November 2026: "Go with the
 * non-permission method; the listing on proposals page should go through the check and if it doesn't match, send message
 * to pool of proposal"). Every page that lists proposals reads both through this one module, a proposal shown once where
 * it is first listed, the keeper's list first.
 *
 * A maker's line is shown only once its family passes the check below: the battery's own first faults
 * (pscale://proposal-test, proposal_form.py), the ones a page can read from the family's blocks. A family that fails
 * stays off the list with its first fault in words, which the list page names; weft's daily check (wake:weft 6.31) runs
 * the whole battery over every maker's list and says what to mend in the proposal's own room, pool:<name>, once for each
 * change. This module only reads.
 *
 *   beachListed.read(keeperBlock)      → Promise<{ keeper: [line], makers: [line] }>, a line being
 *                                        { name, what, page, by, ok, fault } (by, ok and fault on a maker's line)
 *   beachListed.parse(text)            → { name, what, page } or null
 *   beachListed.fault(name, s, l, r)   → '' where spine s, law l and room r pass, else the first fault in words
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

  /* ── the check: the battery's first faults, in its own order, as a page can read them from a family's blocks.
     Each says what is wrong in words a maker can act on; the first one found is the one named. ── */
  var DEFAULT_WORDS = ['GO', 'NOT YET', 'CHANGE'];
  function decisionFault(t, at) {
    if (!/^DECIDE\s*—\s*/.test(t)) return 'the decision at ' + at + ' does not open ‘DECIDE —’';
    var i = t.indexOf(' Asked of ');
    if (i < 0) return 'the decision at ' + at + ' names nobody it waits on: its last sentence says ‘Asked of <whom>.’';
    var tail = t.slice(i);
    /* words of its own close the line, capitals alone: a gloss in brackets or a digit among them breaks the buttons */
    if (/\b[A-Z][A-Z' ]*\s*\([^)]*\)\s*(?:,|or\b)/.test(tail) || /\b[A-Z][A-Z' ]*\s*\([^)]*\)\s*\.?\s*$/.test(tail))
      return 'the decision at ' + at + ' carries a gloss in brackets among its words; its words close the line, capitals alone';
    var m = /([A-Z][A-Z' ]*(?:,\s*[A-Z][A-Z' ]*)*\s+or\s+[A-Z][A-Z' ]*)\.\s*$/.exec(tail);
    if (m) {
      var words = m[1].split(/\s*,\s*|\s+or\s+/).map(function (w) { return w.trim(); }).filter(Boolean);
      var own = words.some(function (w) { return DEFAULT_WORDS.indexOf(w) < 0; });
      if (own && words.indexOf('NOT YET') < 0) return 'the decision at ' + at + ' has words of its own and no NOT YET, which it keeps as its hold';
    }
    return '';
  }
  /* the decisions a page reads: each step's 8, down 1 from the root, and the 8 of each step's side-rooms */
  function decisionsOf(spine) {
    var out = [], node = spine['1'], at = '1';
    while (node && typeof node === 'object') {
      if (node['8'] != null) out.push({ at: at + '8', t: textOf(node['8']) });
      for (var d = 2; d <= 7; d++) {
        var room = node[String(d)];
        if (room && typeof room === 'object' && room['8'] != null) out.push({ at: at + d + '8', t: textOf(room['8']) });
      }
      node = node['1']; at += '1';
    }
    return out.map(function (x) { return { at: x.at.charAt(0) + (x.at.length > 1 ? '.' + x.at.slice(1) : ''), t: x.t }; });
  }
  function fault(name, spine, law, room) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) return 'its name holds more than lower-case letters, digits and hyphens';
    if (!spine || typeof spine !== 'object') return 'spine:' + name + ' does not stand on the beach';
    if (!law || typeof law !== 'object') return 'function:' + name + ' does not stand: a family stands when its law stands';
    if (spine._ && typeof spine._ === 'object') return 'its spine’s root is nested, so no page reads its first step at 1';
    var root = textOf(spine), i = root.indexOf(' — ');
    if (i < 1 || /[a-z]/.test(root.slice(0, i))) return 'its spine’s root has no title before ‘ — ’';
    if (spine['1'] == null) return 'its spine has no first step at 1';
    if (!/^mode:\s*document\b/.test(textOf(law['1']))) return 'its law’s 1 is not ‘mode: document’';
    if (!/^phase:\s*\S/.test(textOf(law['7']))) return 'its law’s 7 does not open ‘phase:’ and its kind';
    var decs = decisionsOf(spine);
    for (var k = 0; k < decs.length; k++) { var f = decisionFault(decs[k].t, decs[k].at); if (f) return f; }
    if (!room || typeof room !== 'object') return 'it has no room, pool:' + name + ', for talk and for its check';
    return '';
  }

  /* every maker's own list: one read the site keeps a few seconds for a crowd (api/mirrors), else the beach straight */
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
      });
  }

  function read(keeperBlock) {
    var keeper = keeperBlock ? lines(keeperBlock).map(parse).filter(Boolean) : [];
    var seen = {};
    keeper.forEach(function (s) { seen[s.name] = 1; });
    return makersLists().then(function (got) {
      var mirrors = got.mirrors || {}, born = got.born || {};
      /* the earliest list first, as the arcade's door reads its makers' lists, so a proposal is shown where it was first listed */
      var hands = Object.keys(mirrors).sort(function (a, b) {
        var x = String(born[a] || born[FAM + ':' + a] || ''), y = String(born[b] || born[FAM + ':' + b] || '');
        return x < y ? -1 : x > y ? 1 : a.localeCompare(b);
      });
      var makers = [];
      hands.forEach(function (h) {
        lines(mirrors[h]).map(parse).filter(Boolean).forEach(function (s) {
          if (seen[s.name]) return;
          seen[s.name] = 1;
          s.by = h;
          makers.push(s);
        });
      });
      return Promise.all(makers.map(function (s) {
        return Promise.all([readBlock('spine:' + s.name), readBlock('function:' + s.name), readBlock('pool:' + s.name)].map(function (p) { return p.catch(function () { return null; }); }))
          .then(function (three) { s.fault = fault(s.name, three[0], three[1], three[2]); s.ok = !s.fault; return s; });
      })).then(function () { return { keeper: keeper, makers: makers }; });
    }, function () { return { keeper: keeper, makers: [] }; });
  }

  window.beachListed = { read: read, parse: parse, fault: fault, lines: lines };
})();
