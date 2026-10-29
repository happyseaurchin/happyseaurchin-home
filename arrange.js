/* arrange.js — a person's own arrangement of the proposals, read live and arranged by dragging or tapping.
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
 *
 * DRAGGING (y-ray.3, 27 Oct 2026, after David asked 'how do I actually rearrange them??'): every row of an
 * arrangement carries a grip, ⠿. Dragged, by touch or the mouse, it carries its proposal and whatever
 * stands inside it: up or down among the rows, onto another to go inside it, left to lift it out a level,
 * down among the ones not placed to take it out; the place it would land is drawn while it moves, and nine
 * at a rung is held. The first move on someone's arrangement starts yours from it. Tapped, the grip holds
 * its proposal, the tap way that stays beneath for anyone who cannot drag; its arrow keys move it.
 *
 * Drawn in the tokens every page here keeps (--foam, --vapour-dim, --line, --line-strong, --liquid,
 * --liquid-rgb, --mono, --card, --err), so it wears whichever palette the page has. Needs the beach's voice
 * for the write.
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
  /* a person's arrangement is drawn at /proposals/<handle>, so its block's name links there, never to a page that
     explains it as a convention (David, 27 Oct 2026: "not 'arrangement:happyseaurchin' which takes me to a
     spurious page"), and on a page of arrangements it is plain words, the page already being the one */
  function where(h) {
    var name = esc(FAMILY + ':' + h);
    return /^\/proposals\//.test(location.pathname) ? name : '<a href="/proposals/' + esc(encodeURIComponent(h)) + '">' + name + '</a>';
  }
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
  /* A ROW is a grip and a name: the grip drags its proposal with whatever stands inside it, and tapped it
     holds it, the tap way; the name is a link while looking and a tap target while arranging. A rung is
     INDENT px further in, its guide line standing under the grip of the row it is inside. */
  var GRIP = '⠿', INDENT = 26;
  var HOW = 'Drag <b>' + GRIP + '</b> to arrange: up or down to reorder, onto another to put it inside, left to lift it out a level.';
  var CSS = '.arr{position:relative;box-sizing:border-box;max-width:100%;border:1px solid var(--line-strong,#b3c3cb);border-radius:12px;padding:14px 16px;background:rgba(var(--liquid-rgb,27,90,108),0.04);color:var(--foam,inherit)}' +
    '.arr-head{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;justify-content:space-between}' +
    '.arr-who{font-weight:700;font-size:1.05rem;margin:0}' +
    '.arr-src{font-family:var(--mono,monospace);font-size:0.75rem;color:var(--vapour-dim,#526571);margin:0}' +
    '.arr-src a{color:inherit}' +
    '.arr-pick{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}' +
    '.arr button{font:inherit;cursor:pointer}' +
    '.arr-chip{border:1px solid var(--line-strong,#b3c3cb);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;min-height:34px;font-size:0.875rem}' +
    '.arr-chip[aria-pressed="true"]{background:var(--liquid,#1b5a6c);border-color:var(--liquid,#1b5a6c);color:var(--well,var(--abyss,#fff))}' +
    '.arr-how{margin:10px 0 6px;font-size:0.9375rem;line-height:1.45}' +
    '.arr-how b{color:var(--liquid,#1b5a6c)}' +
    '.arr-tree,.arr-tree ul{list-style:none;margin:0;padding:0}' +
    '.arr-tree ul ul{margin-left:13px;padding-left:12px;border-left:1px solid var(--line,#d3dee4)}' +
    '.arr-item{display:flex;align-items:flex-start;border:1px solid transparent;border-radius:8px;margin:2px 0}' +
    '.editing .arr-item{border-color:var(--line,#d3dee4)}' +
    '.arr .arr-grip{flex:none;align-self:stretch;width:26px;min-height:34px;display:flex;align-items:flex-start;justify-content:center;padding:10px 0 0;border:0;border-radius:7px;' +
      'background:transparent;color:var(--vapour-dim,#526571);font-size:16px;line-height:1;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    '.arr .arr-grip:hover,.arr .arr-grip:focus-visible{color:var(--liquid,#1b5a6c);background:rgba(var(--liquid-rgb,27,90,108),0.1);outline:none}' +
    '.arr-txt{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px;padding:6px 8px 6px 2px}' +
    '.arr-lab{color:inherit;font-weight:650}' +
    'a.arr-lab{text-decoration:none;border-bottom:1px solid rgba(var(--liquid-rgb,27,90,108),0.45)}' +
    'a.arr-snazzy{font-size:0.8rem;font-weight:650;line-height:1.5;text-decoration:none;color:inherit;padding:0 9px;border-radius:999px;border:1px solid rgba(var(--liquid-rgb,27,90,108),0.45)}' +
    '.arr button.arr-lab{border:0;background:none;padding:0;text-align:left;font-weight:650}' +
    '.arr-item .w,.arr-item .note{color:var(--vapour-dim,#526571);font-size:0.875rem}' +
    '.arr-item .note{font-style:italic}' +
    '.arr-item.held{border-color:var(--liquid,#1b5a6c);box-shadow:0 0 0 2px rgba(var(--liquid-rgb,27,90,108),0.35)}' +
    '.arr-item.target{border-style:dashed;border-color:rgba(var(--liquid-rgb,27,90,108),0.6)}' +
    '.arr-item.into{border-color:var(--liquid,#1b5a6c);background:rgba(var(--liquid-rgb,27,90,108),0.12);box-shadow:0 0 0 2px rgba(var(--liquid-rgb,27,90,108),0.3)}' +
    '.arr-item.into.full,.arr-zone.full{border-color:var(--err,#b3261e);outline-color:var(--err,#b3261e);background:transparent;box-shadow:0 0 0 2px rgba(179,38,30,0.25)}' +
    '.arr-lifted>.arr-item,.arr-lifted>ul{opacity:0.35}' +
    '.arr-zone{border-radius:10px}' +
    '.arr-zone.out,.arr-zone.here{outline:2px dashed var(--liquid,#1b5a6c);outline-offset:2px;background:rgba(var(--liquid-rgb,27,90,108),0.07)}' +
    '.arr-line{position:absolute;z-index:2;height:3px;margin-top:-1.5px;border-radius:2px;background:var(--liquid,#1b5a6c);pointer-events:none}' +
    '.arr-line::before{content:"";position:absolute;left:-5px;top:-3.5px;width:10px;height:10px;border-radius:50%;background:inherit}' +
    '.arr-line.full{background:var(--err,#b3261e)}' +
    '.arr-ghost{position:fixed;left:0;top:0;z-index:2147483600;pointer-events:none;box-sizing:border-box;max-width:min(22rem,calc(100vw - 16px));padding:7px 12px 8px;' +
      'border:1px solid var(--liquid,#1b5a6c);border-radius:10px;background:var(--card,var(--abyss,#fff));color:var(--foam,#12333c);box-shadow:0 10px 28px rgba(0,0,0,0.3);font-size:0.9375rem;line-height:1.3}' +
    '.arr-ghost b{display:block;font-weight:700}' +
    '.arr-ghost span{display:block;margin-top:2px;font-family:var(--mono,monospace);font-size:0.75rem;color:var(--liquid,#1b5a6c)}' +
    '.arr-ghost.full{border-color:var(--err,#b3261e)}.arr-ghost.full span{color:var(--err,#b3261e)}' +
    'html.arr-dragging,html.arr-dragging *{cursor:grabbing!important;-webkit-user-select:none!important;user-select:none!important}' +
    '.arr-h{font-family:var(--mono,monospace);font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--vapour-dim,#526571);margin:0;padding:12px 0 4px}' +
    '.arr-empty{color:var(--vapour-dim,#526571);font-size:0.9375rem;margin:6px 0;padding:10px 12px;border:1px dashed var(--line-strong,#b3c3cb);border-radius:8px}' +
    '.arr-tapway{margin:10px 0 0;font-size:0.8125rem;color:var(--vapour-dim,#526571)}' +
    '.arr-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px}' +
    '.arr-btn{border:1px solid var(--liquid,#1b5a6c);background:transparent;color:var(--liquid,#1b5a6c);border-radius:8px;padding:6px 14px;min-height:40px;font-weight:650}' +
    '.arr-btn.primary{background:var(--liquid,#1b5a6c);color:var(--well,var(--abyss,#fff))}' +
    '.arr-btn:disabled{opacity:0.45;cursor:default}' +
    '.arr .arr-link{border:0;background:none;padding:0;color:inherit;text-decoration:underline}' +
    '.arr-say{margin:8px 0;min-height:1.4em;font-size:0.9375rem}' +
    '.arr-say.err{color:var(--err,#b3261e)}' +
    '.arr-name{font:inherit;border:1px solid var(--line-strong,#b3c3cb);border-radius:8px;padding:6px 10px;min-height:40px;background:transparent;color:inherit;max-width:12rem}' +
    '.arr-look{display:flex;gap:6px;align-items:center;flex-wrap:wrap}';
  function style() {
    if (document.getElementById('arrange-css')) return;
    var s = document.createElement('style'); s.id = 'arrange-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function within(node, id) { return node.id === id || node.kids.some(function (k) { return within(k, id); }); }
  function leaf(p) { return { id: p.id, note: '', kids: [] }; }

  /* ── a move: one proposal, with whatever stands inside it, to t = { kind: 'gap', parent, index } (between
     rows, index counted among the parent's others), { kind: 'into', id } (inside another, last) or
     { kind: 'out' } (not placed; what stood inside it keeps its place, stepping up into its room) ── */
  function refuse(roots, id, t) {
    var f = find(roots, id), at = f ? (f.parent ? f.parent.id : '') : null;
    if (t.kind === 'out') return f ? '' : label(id) + ' is not placed.';
    var tid = t.kind === 'into' ? t.id : t.parent;
    if (f && tid && within(f.node, tid)) return label(tid) + ' is inside ' + label(id) + ', so ' + label(id) + ' can’t go inside it.';
    if (t.kind === 'into' && !find(roots, tid)) {
      /* a proposal not placed yet takes its place at the top first, then this one goes inside it */
      return roots.length - (at === '' ? 1 : 0) >= 9 ? 'Nine stand at the top already: put ' + label(tid) + ' inside one of them first.' : '';
    }
    var pf = tid ? find(roots, tid) : null, sibs = tid ? (pf ? pf.node.kids : []) : roots;
    if (sibs.length - (at === (tid || '') ? 1 : 0) < 9) return '';
    return tid ? 'Nine stand inside ' + label(tid) + ' already: put it one deeper, inside one of them.' : 'Nine stand at the top already: put it inside one of them.';
  }
  function moved(roots, id, t) {
    var w = clone(roots), f = find(w, id), node = f ? f.node : leaf({ id: id }), was = f ? (f.parent ? f.parent.id : '') : null, at = f ? f.at : -1;
    if (t.kind === 'out') {
      f.sibs.splice(f.at, 1);
      Array.prototype.splice.apply(f.sibs, [f.at, 0].concat(node.kids));
      return { roots: w, said: label(id) + ' is loose again; what stood inside it stays where it was.' };
    }
    if (f) f.sibs.splice(f.at, 1);
    if (t.kind === 'into') {
      var into = find(w, t.id);
      if (!into) { w.push(leaf({ id: t.id })); into = find(w, t.id); }
      into.node.kids.push(node);
      return { roots: w, said: label(id) + ' is inside ' + label(t.id) + ' now.' };
    }
    var sibs = t.parent ? find(w, t.parent).node.kids : w, now = t.parent || '';
    sibs.splice(Math.min(t.index, sibs.length), 0, node);
    return { roots: w, said: was === now ? label(id) + ' moved ' + (t.index < at ? 'up' : 'down') + '.' :
      now ? label(id) + ' is inside ' + label(now) + ' now.' : label(id) + (was === null ? ' is placed at the top now.' : ' stands at the top now.') };
  }

  function draw(el, opts) {
    opts = opts || {};
    style();
    var lst = [], kept = [], st = { who: opts.handle || DEFAULT, roots: [], how: 'list', touched: '' };
    var ed = null;     // while arranging: { roots, held, name, said, err, how, prior, undo }
    var drag = null;   // while a grip is down: { id, depth, row, pid, touch, x0, y0, x, y, on, t, line, ghost, tgt, raf }
    var mine = function () { return window.beachVoice && beachVoice.name ? beachVoice.name() : ''; };

    /* the rows: each proposal's grip, its name and its line, and beneath it what stands inside it */
    function rows(roots, depth, grips) {
      if (!roots.length) return '';
      return '<ul>' + roots.map(function (r) {
        var p = info(r.id, lst), cls = 'arr-item' + (ed && ed.held ? (ed.held === r.id ? ' held' : ' target') : '');
        /* a proposal's name goes to its standard view, and a Snazzy button beside it to its page where it has one: two
           addresses, each always itself (David, 28 Oct 2026) */
        var std = '/proposal/' + r.id, listed = lst.some(function (x) { return x.id === r.id; });
        var snazzy = listed && p.href !== std ? p.href : '';
        var name = ed ? '<button type="button" class="arr-lab" data-tap="' + esc(r.id) + '">' + esc(label(r.id)) + '</button>'
          : '<a class="arr-lab" href="' + esc(listed ? std : p.href) + '">' + esc(label(r.id)) + '</a>' +
            (snazzy ? '<a class="arr-snazzy" href="' + esc(snazzy) + '">Snazzy</a>' : '');
        return '<li><div class="' + cls + '" data-id="' + esc(r.id) + '" data-depth="' + depth + '">' +
          (grips ? '<button type="button" class="arr-grip" data-grip="' + esc(r.id) + '" aria-label="Move ' + esc(label(r.id)) +
            ': drag it, tap it to hold it, or use the arrow keys">' + GRIP + '</button>' : '') +
          '<span class="arr-txt">' + name +
          /* every row keeps its proposal's line, a row with others nested inside it too: a title alone does not say
             what a proposal is about (David, 29 Oct 2026) */
          (r.note ? '<span class="note">' + esc(r.note) + '</span>' : (p.what ? '<span class="w">' + esc(brief(p.what)) + '</span>' : '')) +
          '</span></div>' + rows(r.kids, depth + 1, grips) + '</li>';
      }).join('') + '</ul>';
    }
    function loose(roots) {
      var named = ids(roots);
      return lst.filter(function (p) { return !named[p.id]; });
    }
    /* where an arrangement is drawn: the placed tree, and beneath it the ones not placed */
    function zones(roots, empty) {
      var lo = loose(roots);
      return '<div class="arr-zone" data-box="placed">' + (roots.length ? '<div class="arr-tree">' + rows(roots, 0, true) + '</div>' : '<p class="arr-empty">' + empty + '</p>') + '</div>' +
        (lo.length ? '<div class="arr-zone" data-box="loose"><p class="arr-h">Not placed yet</p><div class="arr-tree">' + rows(lo.map(leaf), 0, true) + '</div></div>' : '');
    }
    function source() {
      var h = st.who;
      if (st.how === 'list') return 'the list as it was shared · <a href="/proposal">proposals</a>';
      if (st.how === 'said') return 'as David said it on 24 and 27 October — not yet kept in a block of his';
      return 'kept at ' + where(h) + (st.touched ? ' · changed ' + esc(rel(st.touched)) : '');
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
    function wireRows() {
      el.querySelectorAll('[data-grip]').forEach(function (g) {
        g.addEventListener('pointerdown', grab);
        g.addEventListener('click', function () { tapGrip(g.getAttribute('data-grip')); });
        g.addEventListener('keydown', keys);
      });
      el.querySelectorAll('[data-tap]').forEach(function (b) { b.addEventListener('click', function () { ed.err = false; act(b.getAttribute('data-tap')); }); });
    }
    function paintView(msg) {
      var me = mine(), list = st.how === 'list';
      var title = list ? 'The proposals, as the list stands' : (st.who === me ? 'Your arrangement' : whose(st.who) + '’s arrangement');
      el.innerHTML = '<div class="arr"><div class="arr-head"><p class="arr-who">' + esc(title) + '</p><p class="arr-src">' + source() + '</p></div>' +
        chips() +
        (list ? '<p class="arr-how">The list as it was shared. To arrange the proposals, choose an arrangement above and drag them, or tap Arrange yours.</p>' +
            '<div class="arr-zone" data-box="loose"><div class="arr-tree">' + rows(lst.map(leaf), 0, false) + '</div></div>'
          : '<p class="arr-how">' + HOW + '</p>' + (msg ? '<p class="arr-say err" aria-live="polite">' + esc(msg) + '</p>' : '') +
            zones(st.roots, esc(whose(st.who)) + ' keeps no arrangement yet, so every proposal stands loose. Drag one up here to start yours.') +
            '<p class="arr-tapway">Can’t drag? Tap ' + GRIP + ' to hold one, then tap where it goes.</p>') +
        '<div class="arr-acts"><button type="button" class="arr-btn primary" data-act="arrange">' +
        (get(draftKey(me)) ? 'Pick up yours, not kept yet' : st.how === 'said' ? 'David: keep it as yours' : 'Arrange yours') + '</button>' +
        (!list && st.who !== me && st.roots.length ? '<span class="arr-src">dragging starts yours from this one: copying is how arrangements spread</span>' : '') +
        '<span class="arr-look"><input class="arr-name" type="text" placeholder="anyone’s handle" aria-label="Look at someone’s arrangement by their handle" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="arr-btn" data-act="look">Look</button></span></div></div>';
      el.querySelectorAll('[data-who]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-who')); }); });
      el.querySelector('[data-act="arrange"]').addEventListener('click', startArranging);
      var inp = el.querySelector('.arr-look input'), look = function () { var h = inp.value.trim(); if (HANDLE.test(h)) show(h); };
      el.querySelector('[data-act="look"]').addEventListener('click', look);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') look(); });
      wireRows();
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

    /* ── arranging: yours, begun from the one shown, from yours on the beach, or from where you left it here ── */
    function draftKey(name) { return DRAFT + ':' + (name || '?'); }
    function shownHow() { return st.how !== 'list' && st.who === mine() ? (st.how === 'said' ? 'said' : 'yours') : 'copy'; }
    function begin(roots, how) {
      var saved = how === 'draft' ? null : get(draftKey(mine())), prior = null;
      if (saved) try { var d = JSON.parse(saved); if (Array.isArray(d) && JSON.stringify(d) !== JSON.stringify(roots)) prior = d; } catch (e) {}
      ed = { roots: roots, held: null, name: mine(), said: '', err: false, how: how, prior: prior, undo: [] };
    }
    function startArranging() {
      var me = mine(), saved = get(draftKey(me));
      if (saved) { try { var d = JSON.parse(saved); if (Array.isArray(d)) { begin(d, 'draft'); return paintEdit(); } } catch (e) {} }
      if (me && me !== st.who) {
        return read(me).then(function (a) { begin(a.stands ? a.roots : clone(st.roots), a.stands ? 'yours' : 'copy'); paintEdit(); },
          function () { begin(clone(st.roots), 'copy'); paintEdit(); });
      }
      begin(clone(st.roots), shownHow());
      paintEdit();
    }
    function keepDraft() { put(draftKey(ed.name || mine()), JSON.stringify(ed.roots)); }
    /* every move goes through here, by drag, by tap or by key; the first one on what is shown starts yours */
    function change(id, t, focus) {
      var from = ed ? ed.roots : st.roots, why = refuse(from, id, t);
      if (why) { if (!ed) return paintView(why); ed.said = why; ed.err = true; return paintEdit(focus ? id : ''); }
      var m = moved(from, id, t);
      if (!ed) begin(clone(st.roots), shownHow());
      ed.undo.push(clone(ed.roots));
      ed.roots = m.roots; ed.held = null; ed.err = false; ed.said = m.said;
      keepDraft(); paintEdit(focus ? id : '');
    }
    /* the tap way: tap one to hold it, then tap the one it goes inside */
    function act(target) {
      var h = ed.held;
      if (!h) { ed.held = target; ed.said = 'Holding ' + label(target) + '. Tap the proposal it goes inside, or put it at the top.'; return paintEdit(target); }
      if (target === h) { ed.held = null; ed.said = ''; return paintEdit(target); }
      change(h, { kind: 'into', id: target }, true);
    }
    function toTop() {
      var h = ed.held, f = h && find(ed.roots, h);
      if (!h) return;
      if (f && !f.parent) { ed.said = label(h) + ' is at the top already.'; return paintEdit(); }
      change(h, { kind: 'gap', parent: null, index: ed.roots.length });
    }
    function earlier() {
      var f = ed.held && find(ed.roots, ed.held);
      if (f && f.at > 0) change(ed.held, { kind: 'gap', parent: f.parent ? f.parent.id : null, index: f.at - 1 });
    }
    function takeOut() {
      if (find(ed.roots, ed.held)) return change(ed.held, { kind: 'out' });
      ed.held = null; ed.said = ''; paintEdit();
    }
    function tapGrip(id) {
      if (!ed) begin(clone(st.roots), shownHow());
      ed.err = false; act(id);
    }
    /* a grip's keys: up and down among its siblings, right into the one above it, left out a level;
       one not placed goes up to the top */
    function keys(e) {
      var id = e.currentTarget.getAttribute('data-grip'), roots = ed ? ed.roots : st.roots, f = find(roots, id), t = null;
      var pid = f && f.parent ? f.parent.id : null;
      if (!f) { if (e.key === 'ArrowUp') t = { kind: 'gap', parent: null, index: roots.length }; }
      else if (e.key === 'ArrowUp' && f.at > 0) t = { kind: 'gap', parent: pid, index: f.at - 1 };
      else if (e.key === 'ArrowDown' && f.at < f.sibs.length - 1) t = { kind: 'gap', parent: pid, index: f.at + 1 };
      else if (e.key === 'ArrowRight' && f.at > 0) t = { kind: 'into', id: f.sibs[f.at - 1].id };
      else if (e.key === 'ArrowLeft' && pid) { var pf = find(roots, pid); t = { kind: 'gap', parent: pf.parent ? pf.parent.id : null, index: pf.at + 1 }; }
      if (!t) return;
      e.preventDefault();
      change(id, t, true);
    }

    /* ── dragging: the grip is followed at the document, the place it would land drawn as it goes ── */
    function grab(e) {
      if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var row = e.currentTarget.parentNode;
      drag = { id: e.currentTarget.getAttribute('data-grip'), depth: +row.getAttribute('data-depth') || 0, row: row, pid: e.pointerId,
        touch: e.pointerType !== 'mouse', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, on: false };
      if (!drag.touch) e.preventDefault();      // a mouse drag selects no text
      document.addEventListener('pointermove', follow, { passive: false });
      document.addEventListener('pointerup', release);
      document.addEventListener('pointercancel', abandon);
    }
    function follow(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      drag.x = e.clientX; drag.y = e.clientY;
      if (!drag.on) {
        if (Math.abs(drag.x - drag.x0) + Math.abs(drag.y - drag.y0) < (drag.touch ? 10 : 6)) return;
        lift();
      }
      if (e.cancelable) e.preventDefault();
      aim();
    }
    function lift() {
      drag.on = true; drag.t = Date.now();
      drag.row.parentNode.classList.add('arr-lifted');
      document.documentElement.classList.add('arr-dragging');
      drag.line = document.createElement('div'); drag.line.className = 'arr-line';
      el.querySelector('.arr').appendChild(drag.line);
      drag.ghost = document.createElement('div'); drag.ghost.className = 'arr-ghost'; drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.innerHTML = '<b>' + GRIP + ' ' + esc(label(drag.id)) + '</b><span></span>';
      document.body.appendChild(drag.ghost);
      document.addEventListener('keydown', escape, true);
      drag.raf = requestAnimationFrame(edge);
    }
    /* near the top or the foot of the screen the page scrolls, so a long list is crossed in one drag; it
       gathers speed over the drag's first moments, so a row picked up near an edge does not run away */
    function edge() {
      if (!drag || !drag.on) return;
      var h = window.innerHeight, m = Math.min(64, h * 0.1), v = 0, ease = Math.min(1, (Date.now() - drag.t) / 700);
      if (drag.y < m) v = -Math.ceil((m - drag.y) / 3 * ease);
      else if (drag.y > h - m) v = Math.ceil((drag.y - (h - m)) / 3 * ease);
      if (v) { var was = window.pageYOffset; window.scrollBy(0, v); if (window.pageYOffset !== was) aim(); }
      drag.raf = requestAnimationFrame(edge);
    }
    /* where a drop at (x, y) would put it: onto a row's middle, inside it; between rows, there, as deep as the
       drag has moved right or left, between the deepest the row above allows and the row below needs; among
       the ones not placed, out */
    function aimAt(x, y) {
      var id = drag.id, roots = ed ? ed.roots : st.roots, f = find(roots, id);
      var boxP = el.querySelector('[data-box="placed"]'), boxL = el.querySelector('[data-box="loose"]');
      function rect(n) { var r = n.getBoundingClientRect(); return { id: n.getAttribute('data-id'), depth: +n.getAttribute('data-depth') || 0, top: r.top, bottom: r.bottom }; }
      function band(r) { return Math.min((r.bottom - r.top) * 0.3, 12); }
      function onto(tid) {
        var why = refuse(roots, id, { kind: 'into', id: tid }), same = !!f && !!f.parent && f.parent.id === tid && f.at === f.sibs.length - 1;
        return { kind: same ? 'same' : 'into', id: tid, full: !!why, say: why || (same ? 'stays where it is' : 'inside ' + label(tid)) };
      }
      var live = function (n) { return !n.closest('.arr-lifted'); };
      if (boxL && y >= boxL.getBoundingClientRect().top) {
        var over = [].filter.call(boxL.querySelectorAll('.arr-item'), live).map(rect).filter(function (r) { return y > r.top + band(r) && y < r.bottom - band(r); })[0];
        if (over) return onto(over.id);
        return f ? { kind: 'out', say: 'out, not placed' } : { kind: 'same', say: 'stays loose' };
      }
      var rs = boxP ? [].filter.call(boxP.querySelectorAll('.arr-item'), live).map(rect) : [], gi = rs.length;
      for (var i = 0; i < rs.length; i++) {
        var r = rs[i];
        if (y < r.top + band(r)) { gi = i; break; }
        if (y <= r.bottom - band(r)) return onto(r.id);
        if (y <= r.bottom) { gi = i + 1; break; }
      }
      var prev = rs[gi - 1], next = rs[gi];
      var depth = Math.max(next ? next.depth : 0, Math.min(prev ? prev.depth + 1 : 0, drag.depth + Math.round((x - drag.x0) / INDENT)));
      var pi = gi - 1; while (pi >= 0 && rs[pi].depth >= depth) pi--;
      var parent = depth && pi >= 0 ? rs[pi].id : null, index = 0;
      for (var k = pi + 1; k < gi; k++) if (rs[k].depth === depth) index++;
      var t = { kind: 'gap', parent: parent, index: index, depth: depth }, why = refuse(roots, id, t);
      var same = !!f && (f.parent ? f.parent.id : null) === parent && f.at === index;
      if (same) t.kind = 'same';
      t.full = !!why;
      t.say = why || (same ? 'stays where it is' : parent ? 'here, inside ' + label(parent) : 'here, at the top');
      t.y = !rs.length ? null : prev && next ? (prev.bottom + next.top) / 2 : next ? next.top - 2 : prev.bottom + 2;
      return t;
    }
    function aim() {
      var t = drag.tgt = aimAt(drag.x, drag.y), line = drag.line, g = drag.ghost;
      unmark();
      line.style.display = 'none';
      line.classList.toggle('full', !!t.full);
      if (t.kind === 'into') { var row = el.querySelector('.arr-item[data-id="' + t.id + '"]'); if (row) { row.classList.add('into'); if (t.full) row.classList.add('full'); } }
      else if (t.kind === 'out') el.querySelector('[data-box="loose"]').classList.add('out');
      else if (t.kind === 'gap') {
        var boxP = el.querySelector('[data-box="placed"]');
        if (t.y == null) { boxP.classList.add('here'); if (t.full) boxP.classList.add('full'); }
        else {
          var a = el.querySelector('.arr').getBoundingClientRect(), z = boxP.getBoundingClientRect(), left = z.left + t.depth * INDENT + 6;
          line.style.display = 'block';
          line.style.top = Math.round(t.y - a.top) + 'px';
          line.style.left = Math.round(left - a.left) + 'px';
          line.style.width = Math.max(40, Math.round(z.right - left)) + 'px';
        }
      }
      g.lastChild.textContent = t.full ? t.say : t.say && t.kind !== 'same' ? '→ ' + t.say : t.say;
      g.classList.toggle('full', !!t.full);
      var gw = g.offsetWidth, gh = g.offsetHeight, vw = document.documentElement.clientWidth;
      var gx = Math.max(8, Math.min(vw - gw - 8, drag.x + (drag.touch ? -gw / 2 : 16)));
      var gy = drag.touch ? drag.y - gh - 36 : drag.y + 16;
      if (gy < 8) gy = drag.y + 36;
      g.style.transform = 'translate(' + Math.round(gx) + 'px,' + Math.round(gy) + 'px)';
    }
    function unmark() {
      el.querySelectorAll('.arr-item.into,.arr-zone.out,.arr-zone.here').forEach(function (n) { n.classList.remove('into', 'out', 'here', 'full'); });
    }
    function release(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag;
      end();
      if (!d.on) return;                          // a tap: the click that follows holds it
      swallowClick();
      if (d.tgt && d.tgt.kind !== 'same') change(d.id, d.tgt);
    }
    function abandon(e) {
      if (!drag || (e && e.pointerId != null && e.pointerId !== drag.pid)) return;
      var on = drag.on;
      end();
      if (on) swallowClick();
    }
    function escape(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); abandon(); } }
    function end() {
      document.removeEventListener('pointermove', follow, { passive: false });
      document.removeEventListener('pointerup', release);
      document.removeEventListener('pointercancel', abandon);
      document.removeEventListener('keydown', escape, true);
      if (drag) {
        cancelAnimationFrame(drag.raf);
        if (drag.ghost) drag.ghost.remove();
        if (drag.line) drag.line.remove();
        if (drag.row.parentNode) drag.row.parentNode.classList.remove('arr-lifted');
      }
      unmark();
      document.documentElement.classList.remove('arr-dragging');
      drag = null;
    }
    /* the click a drag ends in is not a tap on whatever lies under the pointer once the panel is redrawn */
    function swallowClick() {
      var swallow = function (e) { e.stopPropagation(); e.preventDefault(); };
      window.addEventListener('click', swallow, true);
      setTimeout(function () { window.removeEventListener('click', swallow, true); }, 0);
    }

    function paintEdit(focus) {
      var me = mine(), btn = !!(window.beachVoice && beachVoice.button && beachVoice.button.shown());
      var replaces = me && st.who !== me && kept.some(function (k) { return k.handle === me; });
      var start = { draft: 'picked up where you left it on this device', yours: 'from your own, as it stands on the beach', said: 'from your words of 24 and 27 October',
        copy: st.how === 'list' ? 'from the plain list' : 'copied from ' + whose(st.who) + '’s' + (replaces ? '; keeping it replaces yours' : '') }[ed.how] || '';
      el.innerHTML = '<div class="arr editing"><div class="arr-head"><p class="arr-who">Arranging yours</p><p class="arr-src">' + esc(start) +
        (ed.prior ? ' · <button type="button" class="arr-link" data-act="prior">bring back the one you left on this device</button>' : '') + '</p></div>' +
        '<p class="arr-how">' + HOW + '</p>' +
        '<p class="arr-say' + (ed.err ? ' err' : '') + '" aria-live="polite">' + esc(ed.said) + '</p>' +
        zones(ed.roots, 'Nothing placed yet: drag a proposal up here.') +
        '<p class="arr-tapway">Can’t drag? Tap a proposal to hold it, then tap the one it goes inside. Nothing is written onto any proposal.</p>' +
        (ed.held ? '<div class="arr-acts"><button type="button" class="arr-btn" data-act="top">To the top</button><button type="button" class="arr-btn" data-act="up">Up one</button>' +
          (find(ed.roots, ed.held) ? '<button type="button" class="arr-btn" data-act="out">Take it out</button>' : '') +
          '<button type="button" class="arr-btn" data-act="let">Let go</button></div>' : '') +
        '<div class="arr-acts">' +
        (btn || me ? '' : '<input class="arr-name" type="text" id="arr-name" placeholder="your handle" aria-label="Your handle" autocomplete="username" autocapitalize="off" spellcheck="false">') +
        '<button type="button" class="arr-btn primary" data-act="keep">Keep it as mine</button>' +
        (ed.undo.length ? '<button type="button" class="arr-btn" data-act="undo">Undo</button>' : '') +
        '<button type="button" class="arr-btn" data-act="cancel">Put it away</button>' +
        '<span class="arr-src">' + esc(btn ? 'your button signs it' : me ? 'signed ' + me + ', under your own key' : 'under your own key') + ' · <a href="/explain?block=function:arrangement">how it’s kept</a></span></div></div>';
      wireRows();
      var on = function (a, fn) { var b = el.querySelector('[data-act="' + a + '"]'); if (b) b.addEventListener('click', fn); };
      on('top', toTop); on('up', earlier); on('out', takeOut);
      on('let', function () { ed.held = null; ed.said = ''; paintEdit(); });
      on('undo', function () { ed.roots = ed.undo.pop(); ed.held = null; ed.err = false; ed.said = 'Undone.'; keepDraft(); paintEdit(); });
      on('prior', function () { ed.undo.push(clone(ed.roots)); ed.roots = ed.prior; ed.prior = null; ed.how = 'draft'; ed.err = false; ed.said = 'The one you left on this device is back.'; keepDraft(); paintEdit(); });
      on('cancel', function () { ed = null; paintView(); });
      on('keep', keepIt);
      if (focus) { var g = el.querySelector('[data-grip="' + focus + '"]'); if (g) g.focus(); }
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
            var s = el.querySelector('.arr-src'); if (s) s.innerHTML = 'kept just now at ' + where(who) + ', under your own key';
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
