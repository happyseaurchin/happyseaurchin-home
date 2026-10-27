/* arrange.js — a person's own arrangement of the proposals, read live and arranged by tapping.
 *
 * The Y-ray's first step (spine:y-ray 1.111111; David's GO at 1.1111118, 27 Oct 2026). Each person keeps
 * one block, arrangement:<handle>, under their own key: each position names a proposal by reference
 * ('game-arcade', and after ' — ' the holder's own line if they want one), and what stands at its 1-9 is
 * what they see inside it. A proposal it does not name stands loose at the top, in the list's order. The
 * law is function:arrangement; the spine, spine:arrangement, holds no positions on purpose, because an
 * arrangement's addresses are its holder's own.
 *
 * Nothing here writes a proposal. The one write is the person's own block, kept whole through the beach's
 * voice (beachVoice.keep, field 'arrangement'): through their button where it is on the page, else under
 * the key the browser asks them for. An arrangement not yet kept stays on this device until it is.
 *
 * window.beachArrange = { read(handle), list(), others(), parse(block), toBlock(roots, name), label(id),
 *   info(id, list), said(handle), draw(el, opts) }. draw() makes the panel: whose arrangement is shown, the
 *   tree with links, the ones not placed, and 'Arrange yours'. opts: { handle, onShow(roots, who, how) }.
 * Drawn in the tokens every page here keeps (--foam, --vapour-dim, --line, --line-strong, --liquid,
 * --liquid-rgb, --mono), so it wears whichever palette the page has. Needs the beach's voice for the write.
 */
(function () {
  'use strict';
  if (window.beachArrange) return;
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var FAMILY = 'arrangement', DEFAULT = 'happyseaurchin', DRAFT = 'arrange-draft';
  var NAMEOK = /^[a-z0-9][a-z0-9-]{0,63}$/;
  var HANDLE = /^[A-Za-z0-9_-]{1,32}$/;
  /* David's arrangement as he said it, until he keeps it: the character sheets inside visual consistency,
     inside the Onen RPG, inside the game arcade (keel, from his words of 24 October), and TRONIC glass
     inside the arcade (his line at y-ray 1.111118, 27 October). Nothing on the beach holds this until he
     keeps it from a page; then his block is read instead and this is never used again. */
  var SAID = { happyseaurchin: [
    { id: 'game-arcade', note: '', kids: [
      { id: 'onen-rpg', note: '', kids: [
        { id: 'visual-consistency', note: '', kids: [{ id: 'character-sheets', note: '', kids: [] }] }] },
      { id: 'tronic-glass', note: '', kids: [] }] }] };
  var LABELS = { 'game-arcade': 'Game arcade', 'passing-it-on': 'Passing it on', 'character-sheets': 'Character sheets',
    'tronic-glass': 'TRONIC glass', 'threads': 'Threads', 'visual-consistency': 'Visual consistency', 'onen-rpg': 'Onen RPG', 'y-ray': 'Y-ray',
    'leros-on-the-commons': 'LEROs on the Commons', 'the-string': 'The String', 'code-as-blocks': 'Code as blocks', 'weft-bee': 'Weft bee',
    'time-nesting': 'Time nesting', 'pscale-native': 'Pscale native', 'two-spines': 'Two spines', 'coloured-stigmergy': 'Coloured stigmergy',
    'ai-inoculation': 'AI Inoculation' };
  var EXTRA = { 'onen-rpg': { what: 'the RPG itself, a project David counts as his own rather than a proposal', href: '/rpg' } };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function voiceOf(n) { while (n && typeof n === 'object') n = n._; return typeof n === 'string' ? n.trim() : ''; }
  function label(id) { return LABELS[id] || (id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')); }
  /* a proposal's line short enough for a row: its first clause where the whole runs long */
  function brief(t) {
    t = String(t || '');
    if (t.length <= 90) return t;
    var m = /^(.{30,}?)(?::\s|,\s)/.exec(t);
    return m ? m[1] : t.slice(0, 88).replace(/\s+\S*$/, '') + '…';
  }
  function whose(h) { return h === DEFAULT ? 'David' : h; }
  function clone(roots) { return JSON.parse(JSON.stringify(roots || [])); }
  function rel(iso) {
    var t = Date.parse(iso); if (!t) return '';
    var s = (Date.now() - t) / 1000;
    if (s < 90) return 'just now';
    if (s < 5400) return Math.round(s / 60) + ' minutes ago';
    if (s < 129600) return Math.round(s / 3600) + ' hours ago';
    return Math.round(s / 86400) + ' days ago';
  }

  function readBlock(name) {
    return fetch(BEACH + '?block=' + encodeURIComponent(name), { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('the beach answered ' + r.status);
      return r.json();
    });
  }

  /* ── the block and the tree ── */
  function parse(block) {
    var seen = {};
    function kidsOf(n) {
      var out = [];
      if (!n || typeof n !== 'object') return out;
      for (var d = 1; d <= 9; d++) {
        var c = n[String(d)];
        if (c == null) continue;
        var t = typeof c === 'string' ? c.trim() : voiceOf(c._), cut = t.indexOf(' — ');
        var id = (cut < 0 ? t : t.slice(0, cut)).trim().toLowerCase(), note = cut < 0 ? '' : t.slice(cut + 3).trim();
        if (!NAMEOK.test(id) || seen[id]) continue;
        seen[id] = 1;
        out.push({ id: id, note: note, kids: kidsOf(c) });
      }
      return out;
    }
    return kidsOf(block);
  }
  function intro(name) {
    return 'ARRANGEMENT — ' + (name ? name + '’s' : 'this hand’s') + ' own arrangement of the proposals: each position names a proposal by reference, ' +
      'and what stands beneath it is what they see inside it; a proposal not named here stands loose (function:arrangement). ' +
      'Sovereign to them, and anyone may read it and start their own from it.';
  }
  function toBlock(roots, name) {
    function node(x) {
      var n = { _: x.id + (x.note ? ' — ' + x.note : '') };
      (x.kids || []).slice(0, 9).forEach(function (k, i) { n[String(i + 1)] = node(k); });
      return n;
    }
    var b = { _: intro(name) };
    (roots || []).slice(0, 9).forEach(function (r, i) { b[String(i + 1)] = node(r); });
    return b;
  }
  function ids(roots, out) { out = out || {}; (roots || []).forEach(function (r) { out[r.id] = 1; ids(r.kids, out); }); return out; }
  function find(roots, id, parent) {
    for (var i = 0; i < (roots || []).length; i++) {
      if (roots[i].id === id) return { node: roots[i], sibs: roots, at: i, parent: parent || null };
      var f = find(roots[i].kids, id, roots[i]);
      if (f) return f;
    }
    return null;
  }

  /* someone's arrangement: { handle, roots, stands, touched } — stands false where no block of theirs is on the beach */
  function read(handle) {
    handle = String(handle || DEFAULT);
    return readBlock(FAMILY + ':' + handle).then(function (b) {
      return { handle: handle, roots: b ? parse(b) : [], stands: !!b };
    });
  }
  function said(handle) { return SAID[handle] ? clone(SAID[handle]) : null; }

  /* the beach's list of proposals, in the order shared: [{ id, what, href }] */
  function listed(b) {
    var floor = 1, n = b, out = [];
    while (n && typeof n === 'object' && n._ && typeof n._ === 'object') { floor++; n = n._; }
    (function walk(n, depth) {
      if (depth === floor) { var t = typeof n === 'string' ? n.trim() : voiceOf(n); if (t) out.push(t); return; }
      if (!n || typeof n !== 'object') return;
      if (n._ && typeof n._ === 'object') walk(n._, depth + 1);
      for (var d = 1; d <= 9; d++) if (n[String(d)] != null) walk(n[String(d)], depth + 1);
    })(b, 0);
    return out;
  }
  var LIST = null;
  function list() {
    if (!LIST) LIST = readBlock('proposals').then(function (b) {
      var out = [];
      listed(b || {}).forEach(function (t) {
        var m = /^\s*([a-z0-9][a-z0-9-]*)\s+—\s+([\s\S]*?)(?:\s*·\s*(\S+))?\s*$/i.exec(t);
        if (!m) return;
        var href = m[3] ? (/^https?:/.test(m[3]) ? m[3] : 'https://' + m[3]) : '/proposal/' + m[1].toLowerCase();
        out.push({ id: m[1].toLowerCase(), what: m[2].split(';')[0].trim(), href: href.replace(/^https:\/\/happyseaurchin\.com/, '') || '/proposal/' + m[1].toLowerCase() });
      });
      return out;
    }, function () { LIST = null; return []; });
    return LIST;
  }
  function info(id, lst) {
    var p = (lst || []).filter(function (x) { return x.id === id; })[0];
    if (p) return p;
    return { id: id, what: (EXTRA[id] || {}).what || '', href: (EXTRA[id] || {}).href || '/walk/' + id };
  }
  /* everyone who keeps an arrangement, the latest changed first (the site's one read of a family's mirrors) */
  function others() {
    return fetch('/api/mirrors?family=' + FAMILY, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
      .then(function (d) {
        var m = (d && d.mirrors) || {}, t = (d && d.touched) || {};
        return Object.keys(m).sort(function (a, b) { return String(t[b] || '').localeCompare(String(t[a] || '')); })
          .map(function (h) { return { handle: h, touched: t[h] || '', roots: parse(m[h]) }; });
      });
  }

  /* ── the panel ── */
  var CSS = '.arr{box-sizing:border-box;max-width:100%;border:1px solid var(--line-strong,#b3c3cb);border-radius:12px;padding:14px 16px;background:rgba(var(--liquid-rgb,27,90,108),0.04);color:var(--foam,inherit)}' +
    '.arr-head{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;justify-content:space-between}' +
    '.arr-who{font-weight:700;font-size:1.05rem;margin:0}' +
    '.arr-src{font-family:var(--mono,monospace);font-size:0.75rem;color:var(--vapour-dim,#526571);margin:0}' +
    '.arr-src a{color:inherit}' +
    '.arr-pick{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}' +
    '.arr button{font:inherit;cursor:pointer}' +
    '.arr-chip{border:1px solid var(--line-strong,#b3c3cb);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;min-height:34px;font-size:0.875rem}' +
    '.arr-chip[aria-pressed="true"]{background:var(--liquid,#1b5a6c);border-color:var(--liquid,#1b5a6c);color:var(--well,var(--abyss,#fff))}' +
    '.arr-tree,.arr-tree ul{list-style:none;margin:0;padding:0}' +
    '.arr-tree ul{margin-left:14px;padding-left:12px;border-left:1px solid var(--line,#d3dee4)}' +
    '.arr-tree li{margin:2px 0}' +
    '.arr-row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;padding:4px 0}' +
    '.arr-row a{color:inherit;font-weight:650;text-decoration:none;border-bottom:1px solid rgba(var(--liquid-rgb,27,90,108),0.45)}' +
    '.arr-row .w{color:var(--vapour-dim,#526571);font-size:0.875rem}' +
    '.arr-row .note{font-style:italic;color:var(--vapour-dim,#526571);font-size:0.875rem}' +
    '.arr-h{font-family:var(--mono,monospace);font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--vapour-dim,#526571);margin:12px 0 4px}' +
    '.arr-empty{color:var(--vapour-dim,#526571);font-size:0.9375rem;margin:6px 0}' +
    '.arr-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}' +
    '.arr-btn{border:1px solid var(--liquid,#1b5a6c);background:transparent;color:var(--liquid,#1b5a6c);border-radius:8px;padding:6px 14px;min-height:40px;font-weight:650}' +
    '.arr-btn.primary{background:var(--liquid,#1b5a6c);color:var(--well,var(--abyss,#fff))}' +
    '.arr-btn:disabled{opacity:0.45;cursor:default}' +
    '.arr-tap{display:block;width:100%;box-sizing:border-box;text-align:left;border:1px solid var(--line,#d3dee4);background:transparent;color:inherit;border-radius:8px;padding:7px 10px;min-height:40px;margin:3px 0}' +
    '.arr-tap .w{color:var(--vapour-dim,#526571);font-size:0.8125rem;display:block}' +
    '.arr-tap.held{border-color:var(--liquid,#1b5a6c);box-shadow:0 0 0 2px rgba(var(--liquid-rgb,27,90,108),0.35);font-weight:700}' +
    '.arr-tap.target{border-style:dashed;border-color:var(--liquid,#1b5a6c)}' +
    '.arr-tap.off{opacity:0.4}' +
    '.arr-say{margin:8px 0;min-height:1.4em;font-size:0.9375rem}' +
    '.arr-say.err{color:var(--err,#b3261e)}' +
    '.arr-name{font:inherit;border:1px solid var(--line-strong,#b3c3cb);border-radius:8px;padding:6px 10px;min-height:40px;background:transparent;color:inherit;max-width:12rem}' +
    '.arr-look{display:flex;gap:6px;align-items:center;flex-wrap:wrap}';
  function style() {
    if (document.getElementById('arrange-css')) return;
    var s = document.createElement('style'); s.id = 'arrange-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  function draw(el, opts) {
    opts = opts || {};
    style();
    var lst = [], kept = [], st = { who: opts.handle || DEFAULT, roots: [], how: 'list', touched: '' };
    var ed = null;     // while arranging: { roots, held, name }
    var mine = function () { return window.beachVoice && beachVoice.name ? beachVoice.name() : ''; };

    function rowsView(roots) {
      if (!roots.length) return '';
      return '<ul>' + roots.map(function (r) {
        var p = info(r.id, lst);
        return '<li><div class="arr-row"><a href="' + esc(p.href) + '">' + esc(label(r.id)) + '</a>' +
          (r.note ? '<span class="note">' + esc(r.note) + '</span>' : (p.what && !r.kids.length ? '<span class="w">' + esc(brief(p.what)) + '</span>' : '')) + '</div>' +
          rowsView(r.kids) + '</li>';
      }).join('') + '</ul>';
    }
    function loose(roots) {
      var named = ids(roots);
      return lst.filter(function (p) { return !named[p.id]; });
    }
    function source() {
      var h = st.who;
      if (st.how === 'list') return 'the list as it was shared · <a href="/explain?block=proposals">proposals</a>';
      if (st.how === 'said') return 'as David said it on 24 and 27 October — not yet kept in a block of his';
      return 'kept at <a href="/explain?block=' + esc(FAMILY + ':' + h) + '">' + esc(FAMILY + ':' + h) + '</a>' + (st.touched ? ' · changed ' + esc(rel(st.touched)) : '');
    }
    function chips() {
      var me = mine(), hs = [DEFAULT];
      if (me && hs.indexOf(me) < 0) hs.push(me);
      kept.forEach(function (k) { if (hs.indexOf(k.handle) < 0) hs.push(k.handle); });
      if (hs.indexOf(st.who) < 0 && st.how !== 'list') hs.push(st.who);
      return '<div class="arr-pick" role="group" aria-label="Whose arrangement">' +
        '<button type="button" class="arr-chip" data-who="" aria-pressed="' + (st.how === 'list') + '">The list</button>' +
        hs.map(function (h) {
          var on = st.how !== 'list' && st.who === h;
          return '<button type="button" class="arr-chip" data-who="' + esc(h) + '" aria-pressed="' + on + '">' + esc(h === me ? 'Yours' : whose(h) + '’s') + '</button>';
        }).join('') + '</div>';
    }
    function paintView() {
      var title = st.how === 'list' ? 'The proposals, as the list stands' : (st.who === mine() ? 'Your arrangement' : whose(st.who) + '’s arrangement');
      var lo = st.how === 'list' ? lst : loose(st.roots);
      el.innerHTML = '<div class="arr"><div class="arr-head"><p class="arr-who">' + esc(title) + '</p><p class="arr-src">' + source() + '</p></div>' +
        chips() +
        (st.how === 'list' ? '' : (st.roots.length ? '<div class="arr-tree">' + rowsView(st.roots) + '</div>' :
          '<p class="arr-empty">' + esc(whose(st.who)) + ' keeps no arrangement yet, so every proposal stands loose.</p>')) +
        (lo.length ? (st.how === 'list' ? '' : '<p class="arr-h">Not placed yet</p>') + '<div class="arr-tree">' + rowsView(lo.map(function (p) { return { id: p.id, note: '', kids: [] }; })) + '</div>' : '') +
        '<div class="arr-acts"><button type="button" class="arr-btn primary" data-act="arrange">' +
        (st.how === 'said' ? 'David: keep it as yours' : 'Arrange yours') + '</button>' +
        (st.how !== 'list' && st.who !== mine() && st.roots.length ? '<span class="arr-src">or start yours from this one: copying is how arrangements spread</span>' : '') +
        '<span class="arr-look"><input class="arr-name" type="text" placeholder="anyone’s handle" aria-label="Look at someone’s arrangement by their handle" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="arr-btn" data-act="look">Look</button></span></div></div>';
      el.querySelectorAll('[data-who]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-who')); }); });
      el.querySelector('[data-act="arrange"]').addEventListener('click', startArranging);
      var inp = el.querySelector('.arr-look input'), look = function () { var h = inp.value.trim(); if (HANDLE.test(h)) show(h); };
      el.querySelector('[data-act="look"]').addEventListener('click', look);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') look(); });
      if (opts.onShow) try { opts.onShow(clone(st.roots), st.who, st.how); } catch (e) {}
    }
    /* show someone's arrangement: theirs where it stands; David's as he said it where his does not; '' the list */
    function show(h) {
      if (!h) { st = { who: st.who, roots: [], how: 'list', touched: '' }; paintView(); return Promise.resolve(); }
      return read(h).then(function (a) {
        var k = kept.filter(function (x) { return x.handle === h; })[0];
        if (a.stands) st = { who: h, roots: a.roots, how: 'kept', touched: k ? k.touched : '' };
        else if (SAID[h]) st = { who: h, roots: said(h), how: 'said', touched: '' };
        else st = { who: h, roots: [], how: 'kept', touched: '' };
        paintView();
      }, function () {
        st = SAID[h] ? { who: h, roots: said(h), how: 'said', touched: '' } : { who: h, roots: [], how: 'kept', touched: '' };
        paintView();
      });
    }

    /* ── arranging: tap one to hold it, then tap where it goes ── */
    function draftKey(name) { return DRAFT + ':' + (name || '?'); }
    function startArranging() {
      var me = mine(), saved = get(draftKey(me));
      function begin(roots, how) { ed = { roots: roots, held: null, name: me, said: '', how: how }; paintEdit(); }
      if (saved) { try { var d = JSON.parse(saved); if (Array.isArray(d)) return begin(d, 'draft'); } catch (e) {} }
      if (me && me !== st.who) {
        return read(me).then(function (a) { begin(a.stands ? a.roots : clone(st.roots), a.stands ? 'yours' : 'copy'); }, function () { begin(clone(st.roots), 'copy'); });
      }
      begin(clone(st.roots), st.who === me && st.how === 'kept' ? 'yours' : 'copy');
    }
    function keepDraft() { put(draftKey(ed.name || mine()), JSON.stringify(ed.roots)); }
    function within(node, id) { return node.id === id || node.kids.some(function (k) { return within(k, id); }); }
    function take(id) {
      var f = find(ed.roots, id);
      if (f) { f.sibs.splice(f.at, 1); return f.node; }
      return { id: id, note: '', kids: [] };
    }
    function act(target) {
      var h = ed.held;
      if (!h) { ed.held = target; ed.said = 'Holding ' + label(target) + '. Tap the proposal it goes inside, or put it at the top.'; return paintEdit(); }
      if (target === h) { ed.held = null; ed.said = ''; return paintEdit(); }
      var into = find(ed.roots, target), hf = find(ed.roots, h);
      if (hf && into && within(hf.node, target)) { ed.said = label(target) + ' is inside ' + label(h) + ', so ' + label(h) + ' can’t go inside it.'; ed.err = true; return paintEdit(); }
      if (!into) {
        /* a proposal not placed yet takes its place at the top first, then the held one goes inside it */
        if (ed.roots.length >= 9) { ed.said = 'Nine stand at the top already: put ' + label(target) + ' inside one of them first.'; ed.err = true; return paintEdit(); }
        ed.roots.push({ id: target, note: '', kids: [] });
        into = find(ed.roots, target);
      }
      if (into.node.kids.length >= 9) { ed.said = 'Nine stand inside ' + label(target) + ' already: put it one deeper, inside one of them.'; ed.err = true; return paintEdit(); }
      var n = take(h);
      into = find(ed.roots, target);
      into.node.kids.push(n);
      ed.held = null; ed.err = false; ed.said = label(h) + ' is inside ' + label(target) + ' now.';
      keepDraft(); paintEdit();
    }
    function toTop() {
      var h = ed.held; if (!h) return;
      var f = find(ed.roots, h);
      if (f && !f.parent) { ed.said = label(h) + ' is at the top already.'; return paintEdit(); }
      if (ed.roots.length >= 9) { ed.said = 'Nine stand at the top already: put it inside one of them.'; ed.err = true; return paintEdit(); }
      ed.roots.push(take(h)); ed.held = null; ed.err = false; ed.said = label(h) + ' stands at the top now.'; keepDraft(); paintEdit();
    }
    function earlier() {
      var f = ed.held && find(ed.roots, ed.held);
      if (!f || f.at === 0) return;
      f.sibs.splice(f.at, 1); f.sibs.splice(f.at - 1, 0, f.node); ed.said = label(ed.held) + ' moved up one.'; keepDraft(); paintEdit();
    }
    function takeOut() {
      var h = ed.held, f = h && find(ed.roots, h);
      if (!f) { ed.held = null; ed.said = ''; return paintEdit(); }
      f.sibs.splice(f.at, 1);
      /* what stood inside it keeps its place, stepping up into its room */
      Array.prototype.splice.apply(f.sibs, [f.at, 0].concat(f.node.kids));
      ed.held = null; ed.err = false; ed.said = label(h) + ' is loose again; what stood inside it stays where it was.'; keepDraft(); paintEdit();
    }
    function rowsEdit(roots, depth) {
      return roots.map(function (r) {
        var cls = 'arr-tap' + (ed.held === r.id ? ' held' : (ed.held ? ' target' : ''));
        var ins = r.kids.length ? r.kids.length + ' inside' : '';
        return '<button type="button" class="' + cls + '" data-tap="' + esc(r.id) + '" style="margin-left:' + Math.min(depth, 6) * 16 + 'px;width:calc(100% - ' + Math.min(depth, 6) * 16 + 'px)">' +
          esc(label(r.id)) + (ins ? '<span class="w">' + ins + '</span>' : '') + '</button>' + rowsEdit(r.kids, depth + 1);
      }).join('');
    }
    function paintEdit() {
      var me = mine(), lo = loose(ed.roots), btn = !!(window.beachVoice && beachVoice.button && beachVoice.button.shown());
      var start = { draft: 'picked up where you left it on this device', yours: 'from your own, as it stands on the beach', copy: st.how === 'list' ? 'from the plain list' : 'copied from ' + whose(st.who) + '’s' }[ed.how] || '';
      el.innerHTML = '<div class="arr"><div class="arr-head"><p class="arr-who">Arranging yours</p><p class="arr-src">' + esc(start) + '</p></div>' +
        '<p class="arr-say' + (ed.err ? ' err' : '') + '" aria-live="polite">' + esc(ed.said || 'Tap a proposal to hold it, then tap the one it goes inside. Nothing is written onto any proposal.') + '</p>' +
        (ed.roots.length ? '<p class="arr-h">Placed</p>' + rowsEdit(ed.roots, 0) : '') +
        (lo.length ? '<p class="arr-h">Not placed yet</p>' + rowsEdit(lo.map(function (p) { return { id: p.id, note: '', kids: [] }; }), 0) : '') +
        '<div class="arr-acts">' +
        (ed.held ? '<button type="button" class="arr-btn" data-act="top">To the top</button><button type="button" class="arr-btn" data-act="up">Up one</button>' +
          (find(ed.roots, ed.held) ? '<button type="button" class="arr-btn" data-act="out">Take it out</button>' : '') +
          '<button type="button" class="arr-btn" data-act="let">Let go</button>' : '') +
        '</div><div class="arr-acts">' +
        (btn || me ? '' : '<input class="arr-name" type="text" id="arr-name" placeholder="your handle" aria-label="Your handle" autocomplete="username" autocapitalize="off" spellcheck="false">') +
        '<button type="button" class="arr-btn primary" data-act="keep">Keep it as mine</button>' +
        '<button type="button" class="arr-btn" data-act="cancel">Put it away</button>' +
        '<span class="arr-src">' + esc(btn ? 'your button signs it' : me ? 'signed ' + me + ', under your own key' : 'under your own key') + ' · <a href="/explain?block=function:arrangement">how it’s kept</a></span></div></div>';
      el.querySelectorAll('[data-tap]').forEach(function (b) { b.addEventListener('click', function () { ed.err = false; act(b.getAttribute('data-tap')); }); });
      var on = function (a, fn) { var b = el.querySelector('[data-act="' + a + '"]'); if (b) b.addEventListener('click', fn); };
      on('top', toTop); on('up', earlier); on('out', takeOut);
      on('let', function () { ed.held = null; ed.said = ''; paintEdit(); });
      on('cancel', function () { ed = null; paintView(); });
      on('keep', keepIt);
      if (opts.onShow) try { opts.onShow(clone(ed.roots), me || 'you', 'arranging'); } catch (e) {}
    }
    function keepIt() {
      if (!window.beachVoice) { ed.said = 'The beach’s voice isn’t on this page, so nothing can be kept from here.'; ed.err = true; return paintEdit(); }
      var nameEl = el.querySelector('#arr-name'), name = nameEl ? nameEl.value.trim() : mine();
      if (nameEl && !HANDLE.test(name)) { ed.said = 'Give your handle first: up to 32 letters, digits, - or _.'; ed.err = true; paintEdit(); var n2 = el.querySelector('#arr-name'); if (n2) n2.focus(); return; }
      var btn = el.querySelector('[data-act="keep"]'); if (btn) { btn.disabled = true; btn.textContent = 'Keeping…'; }
      beachVoice.keep({ field: FAMILY, content: toBlock(ed.roots, name || ''), name: name || undefined }).then(function (r) {
        if (r && r.ok) {
          var who = r.name || name || mine();
          put(draftKey(ed.name || mine()), null); put(draftKey(who), null);
          ed = null;
          kept = kept.filter(function (k) { return k.handle !== who; });
          kept.unshift({ handle: who, touched: new Date().toISOString() });
          return show(who).then(function () {
            var s = el.querySelector('.arr-src'); if (s) s.innerHTML = 'kept just now at <a href="/explain?block=' + esc(FAMILY + ':' + who) + '">' + esc(FAMILY + ':' + who) + '</a>, under your own key';
          });
        }
        if (r && r.quiet) { ed.said = ''; return paintEdit(); }
        ed.said = (r && r.error) || 'The beach didn’t take it just now. It is kept on this device; try again in a moment.'; ed.err = true; paintEdit();
      });
    }

    var ready = Promise.all([list(), others().catch(function () { return []; })]).then(function (two) {
      lst = two[0] || []; kept = two[1] || [];
      if (opts.handle === '') { st.how = 'list'; paintView(); return; }
      return show(opts.handle || DEFAULT);
    });
    return { ready: ready, show: show };
  }

  window.beachArrange = { FAMILY: FAMILY, DEFAULT: DEFAULT, read: read, said: said, list: list, others: others, parse: parse, toBlock: toBlock, label: label, info: info, draw: draw };
})();
