/* threads.js — a family's threads, read live and drawn where a page asks for them.
 *
 * A proposal grows into its project by its threads (function:proposal 5). Each piece of work is
 * a thread (function:thread): a ladder of rungs down digit 1 of spine:<thread>, each rung an
 * address where one act stands in its own mind's block, '<block> <address> — a few words'. The
 * project's law names its threads at its 5, one per digit: '<thread> — what it carries · step
 * <address>'. This reads them there, walks each ladder and reads every rung where it stands, so a
 * page changes as the keeper ties and nothing is ever written onto the page. Reads only.
 *
 * A page marks the place with <div data-threads="<family>"></div> and loads this script; it draws
 * there once the page has loaded. window.beachThreads = { read(family), draw(el, family, opts) }
 * for a page that draws them itself: the generic proposal page draws each thread beneath the step
 * it serves (opts.step) as well as all of them together. Drawn in the tokens every page here
 * keeps (--foam, --vapour-dim, --line, --line-strong, --liquid, --mono, --display), so it wears
 * whichever palette the page has.
 *
 * A REGISTRY THREAD (function:thread, as re-cut 29 October 2026) is named 'thread:<number> — what it
 * carries · step <address>'. It has no ladder: its line stands in spine:thread at its number, and
 * every hand's knots stand in that hand's own mirror, thread:<handle>, at the number and beneath it,
 * the digit the choice. This reads them across the mirrors and draws them as a quipu's pendant:
 * a knot's colour is its hand, several hands at one option a cluster, an option no one took a short
 * end, two options taken a fork, a knot that names another thread's place a crossing.
 * window.beachThreads.quipu(threads) draws a project's threads as one quipu, its main cord across
 * the top and each thread a pendant hanging from it.
 */
(function () {
  'use strict';
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var MAX_RUNGS = 60;
  var REPOS = {
    'happyseaurchin-home': 'happyseaurchin/happyseaurchin-home', 'bsp-mcp-server': 'pscale-commons/bsp-mcp-server',
    'bsp-mcp': 'pscale-commons/bsp-mcp-server', 'pscale-beach': 'pscale-commons/pscale-beach', 'xstream-bsp': 'happyseaurchin/xstream-bsp'
  };

  function esc(s) { var d = document.createElement('span'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function voiceOf(n) { while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; } return typeof n === 'string' ? n.trim() : ''; }
  function textOf(n) { return typeof n === 'string' ? n.trim() : voiceOf(n); }

  var got = {};
  function get(name, spindle) {
    var key = name + '@' + (spindle || '');
    if (!got[key]) {
      got[key] = fetch(BEACH + '?block=' + encodeURIComponent(name) + (spindle ? '&spindle=' + encodeURIComponent(spindle) : ''),
        { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('the beach answered ' + r.status);
        return r.json();
      });
    }
    return got[key];
  }

  /* '<thread> — what it carries · step <address>' */
  function parseThread(t) {
    var m = /^\s*(thread:\d+|[a-z0-9][a-z0-9-]*)\s*(?:[—–]\s*([\s\S]*))?$/i.exec(String(t || ''));
    if (!m) return null;
    var carries = (m[2] || '').trim(), step = '';
    var s = /\s*·\s*step\s+(\d+(?:\.\d+)?)\s*\.?\s*$/i.exec(carries);
    if (s) { step = s[1]; carries = carries.slice(0, s.index).trim(); }
    var reg = /^thread:(\d+)$/i.exec(m[1]);
    return { name: m[1].toLowerCase(), carries: carries, step: step, registry: reg ? reg[1] : '' };
  }
  function capFirst(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function idOf(name) { return 'th-' + String(name).replace(/[^a-z0-9-]/gi, '-'); }
  /* '<block> <address> — a few words'; the block's name may hold a space (a handle may), the address never does */
  function parseRung(t) {
    t = String(t || '').trim();
    var i = t.indexOf(' — '), left = (i >= 0 ? t.slice(0, i) : t).trim(), words = i >= 0 ? t.slice(i + 3).trim() : '';
    if (/^https?:\/\//i.test(left)) return { url: left, words: words };
    var m = /^(.+?)\s+(\d+(?:\.\d+)?)$/.exec(left);
    return m ? { block: m[1], addr: m[2], words: words } : { block: left, addr: '', words: words };
  }
  /* the ladder: the root, then down digit 1, one rung a depth */
  function addrOf(depth) { return depth === 0 ? '' : depth === 1 ? '1' : '1.' + new Array(depth).join('1'); }
  function ladder(spine) {
    var out = [], n = spine, depth = 0;
    while (n != null && depth < MAX_RUNGS) {
      var t = textOf(n);
      if (!t) break;
      var r = parseRung(t); r.depth = depth; r.at = addrOf(depth); r.text = t;
      out.push(r);
      if (typeof n !== 'object') break;
      n = n['1']; depth++;
    }
    return out;
  }
  function threadsNode(law) {
    if (!law || typeof law !== 'object') return null;
    var five = law['5'];
    if (five != null && /^THE THREADS\b/i.test(textOf(five))) return five;
    for (var d = 1; d <= 9; d++) { var n = law[String(d)]; if (n != null && /^THE THREADS\b/i.test(textOf(n))) return n; }
    return null;
  }

  /* what an act made, lifted from its own words: a pull request, a page, a document */
  function linksIn(text) {
    var out = [], seen = {}, m;
    function add(url, label, kind) { if (seen[url]) return; seen[url] = 1; out.push({ url: url, label: label, kind: kind }); }
    var PR = /\b(happyseaurchin-home|bsp-mcp-server|bsp-mcp|pscale-beach|xstream-bsp)\s+(?:PRs?\s+)?#(\d{1,5})((?:\s*(?:,|and|&)\s*#\d{1,5})*)/g;
    while ((m = PR.exec(text))) {
      var repo = REPOS[m[1]], nums = [m[2]].concat((m[3] || '').match(/\d{1,5}/g) || []);
      nums.forEach(function (n) { add('https://github.com/' + repo + '/pull/' + n, m[1] + ' #' + n, 'pr'); });
    }
    var URL = /\bhttps?:\/\/[^\s'"<>()\[\]{}]+|\b(?:[a-z0-9-]+\.)*(?:happyseaurchin\.com|onen\.ai)\/[^\s'"<>()\[\]{},;]*/gi;
    while ((m = URL.exec(text))) {
      var u = m[0].replace(/[.,;:!?'’)]+$/, '');
      if (/\.well-known\/|\/api\/|<|…/.test(u)) continue;
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      var pr = /github\.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)/i.exec(u);
      if (pr) { add(u, pr[1].split('/')[1] + ' #' + pr[2], 'pr'); continue; }
      add(u, u.replace(/^https?:\/\/(?:www\.)?/, '').replace(/\/$/, '').slice(0, 56), /github\.com/i.test(u) ? 'doc' : 'page');
    }
    var DOC = /\bproposals\/(20\d\d-\d\d-\d\d-[\w-]+?)(?:\.md)?(?=$|[\s,;)'’.:])/g;
    while ((m = DOC.exec(text))) add('https://github.com/pscale-commons/bsp-mcp-server/blob/main/proposals/' + m[1] + '.md', 'proposal ' + m[1].replace(/^20\d\d-\d\d-\d\d-/, '').replace(/-/g, ' '), 'doc');
    return out.slice(0, 5);
  }
  function whenOf(node, text) {
    var iso = node && typeof node === 'object' && typeof node['3'] === 'string' && /^\d{4}-\d\d-\d\dT/.test(node['3']) ? node['3'] : '';
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) { var m = /^(\d{4}-\d\d-\d\d)\b/.exec(text || ''); d = m ? new Date(m[1] + 'T12:00:00Z') : null; }
    return d && !isNaN(d) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  }

  /* ── a registry thread, read across the mirrors (function:thread 1-4) ── */
  function floorOf(b) { var d = 0, n = b; while (n && typeof n === 'object' && '_' in n) { d++; n = n._; if (typeof n === 'string') return d; } return d; }
  function raise(b, floor) { while (floorOf(b) < floor) b = { _: b }; return b; }
  function walk(b, ds) { var n = b; for (var i = 0; i < ds.length; i++) { if (!n || typeof n !== 'object') return undefined; n = n[ds[i] === '0' ? '_' : ds[i]]; } return n; }
  function dotted(ds, floor) { var l = ds.slice(0, floor).join('').replace(/^0+(?=\d)/, ''), r = ds.slice(floor).join(''); return r ? l + '.' + r : l; }
  var indexP = null;
  function indexNames() {
    if (!indexP) indexP = fetch(BEACH, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (ix) { return (ix.blocks || []).map(function (b) { return typeof b === 'string' ? b : (b && b.name) || ''; }); });
    return indexP;
  }
  function readRegistry(th) {
    return Promise.all([get('spine:thread').catch(function () { return null; }), indexNames().catch(function () { return []; })]).then(function (two) {
      var reg = two[0], floor = Math.max(1, floorOf(reg || {})), head = String(th.registry);
      while (head.length < floor) head = '0' + head;
      var nd = head.split('');
      th.line = textOf(walk(reg, nd));
      var names = two[1].filter(function (n) { return n.indexOf('thread:') === 0 && n.indexOf(':', 7) < 0; });
      return Promise.all(names.map(function (name) {
        return get(name).then(function (b) { return { who: name.slice(7), b: b }; }, function () { return { who: name.slice(7), b: null }; });
      })).then(function (ms) {
        var at = {};
        ms.forEach(function (m) {
          if (!m.b || typeof m.b !== 'object') return;
          (function rec(n, ds) {
            var t = textOf(n);
            if (t) { var a = dotted(ds, floor); (at[a] = at[a] || { ds: ds, lines: [] }).lines.push({ who: m.who, text: t }); }
            if (n && typeof n === 'object') for (var d = 1; d <= 9; d++) if (n[String(d)] != null) rec(n[String(d)], ds.concat(String(d)));
          })(walk(raise(m.b, floor), nd), nd);
        });
        th.tree = treeOf(at, nd, floor, th.registry);
        th.knots = Object.keys(at).map(function (a) { return at[a]; }).sort(function (x, y) { var a = x.ds.join(''), b = y.ds.join(''); return a < b ? -1 : a > b ? 1 : 0; });
        th.floor = floor;
        return th;
      });
    });
  }
  /* each address a node: the lines standing there, the hand that offered it (whose line stands at the
     knot above too), whether it was taken (a hand other than its offerer stands there, or the work
     went on beneath it), the live ends, and any other thread's place a line names */
  function treeOf(at, nd, floor, number) {
    var keys = Object.keys(at).map(function (a) { return at[a].ds.join(''); });
    function node(ds, parent) {
      var key = ds.join(''), a = dotted(ds, floor), here = at[a] || { lines: [] };
      var me = { addr: a, ds: ds, lines: here.lines, kids: [], depth: parent ? parent.depth + 1 : 0 };
      me.offerer = '';
      if (parent) parent.lines.forEach(function (pl) { if (!me.offerer && here.lines.some(function (l) { return l.who === pl.who; })) me.offerer = pl.who; });
      for (var d = 1; d <= 9; d++) {
        var ck = key + d;
        if (keys.some(function (k) { return k === ck || k.indexOf(ck) === 0; })) me.kids.push(node(ds.concat(String(d)), me));
      }
      me.hands = me.lines.filter(function (l) { return !parent || l.who !== me.offerer; });
      me.option = parent ? (me.lines.filter(function (l) { return l.who === me.offerer; })[0] || {}).text || '' : '';
      me.taken = !parent || me.hands.length > 0 || me.kids.some(function (k) { return k.lines.length > 0; });
      me.live = me.taken && !me.kids.some(function (k) { return k.taken; });
      me.crosses = [];
      me.lines.forEach(function (l) { var m, re = /\bthread:(\d+(?:\.\d+)?)\b/g; while ((m = re.exec(l.text))) if (m[1].split('.')[0] !== String(number)) me.crosses.push(m[1]); });
      return me;
    }
    return node(nd, null);
  }

  /* every thread the family's law names, each ladder walked and every rung read where it stands */
  var reads = {};
  function read(family) {
    if (reads[family]) return reads[family];
    reads[family] = get('function:' + family).then(function (law) {
      var node = threadsNode(law), list = [];
      if (node && typeof node === 'object') for (var d = 1; d <= 9; d++) { var t = parseThread(textOf(node[String(d)])); if (t) list.push(t); }
      return Promise.all(list.map(function (th) {
        if (th.registry) return readRegistry(th).then(function (t) { t.rungs = []; return t; }, function () { th.rungs = []; th.unread = true; return th; });
        return Promise.all([get('spine:' + th.name).catch(function () { return null; }), get('function:' + th.name).catch(function () { return null; })]).then(function (two) {
          th.rungs = ladder(two[0]);
          th.who = two[1] ? textOf(two[1]['2']).replace(/^WHO\s*[:—–-]\s*/i, '') : '';
          return Promise.all(th.rungs.map(function (r) {
            if (r.url || !r.block) { r.said = ''; r.links = r.url ? [{ url: r.url, label: r.url.replace(/^https?:\/\//, '').slice(0, 56), kind: 'page' }] : []; return null; }
            return get(r.block, r.addr).then(function (n) {
              r.said = textOf(n); r.when = whenOf(n, r.said); r.links = linksIn(r.said); r.missing = n == null;
            }, function () { r.said = ''; r.links = []; r.unread = true; });
          })).then(function () { return th; });
        });
      })).then(function (threads) { return { family: family, named: !!node, threads: threads }; });
    });
    return reads[family];
  }

  var CSS = '' +
    '.th-list{display:grid;gap:1.4rem;margin:0.6rem 0 1rem}' +
    '.th{min-width:0}' +
    '.th-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:0.3rem 0.8rem}' +
    '.th-name{font-family:var(--display);font-weight:700;font-size:1.08rem;margin:0;color:var(--foam);overflow-wrap:anywhere}' +
    '.th-tag{font-family:var(--mono);font-size:0.72rem;letter-spacing:0.05em;color:var(--vapour-dim);border:1px solid var(--line-strong);border-radius:999px;padding:0.05rem 0.5rem;text-decoration:none}' +
    'a.th-tag:hover{color:var(--liquid);border-color:var(--liquid)}' +
    '.th-carries{margin:0.25rem 0 0.15rem;color:var(--foam)}' +
    '.th-who{margin:0 0 0.5rem;font-size:0.9rem;color:var(--vapour-dim)}' +
    /* the cord, and a knot at each rung: a rung tied is filled, the next one an open ring */
    '.th-rungs{list-style:none;margin:0.5rem 0 0;padding:0 0 0 1.35rem;display:grid;gap:0.85rem;position:relative}' +
    '.th-rungs::before{content:"";position:absolute;left:0.42rem;top:0.45rem;bottom:0.6rem;width:2px;border-radius:2px;background:linear-gradient(var(--liquid),rgba(var(--liquid-rgb),0.25))}' +
    '.th-rung,.th-next{position:relative;min-width:0}' +
    '.th-rung::before,.th-next::before{content:"";position:absolute;left:-1.2rem;top:0.36rem;width:0.62rem;height:0.62rem;border-radius:50%;box-sizing:border-box}' +
    '.th-rung::before{background:var(--liquid);box-shadow:0 0 0 3px rgba(var(--liquid-rgb),0.16)}' +
    '.th-rung.th-last::before{box-shadow:0 0 0 4px rgba(var(--liquid-rgb),0.3)}' +
    '.th-next::before{border:2px dashed var(--line-strong);background:transparent}' +
    '.th-at{font-family:var(--mono);font-size:0.74rem;letter-spacing:0.03em;color:var(--vapour-dim);display:flex;flex-wrap:wrap;gap:0.2rem 0.6rem;align-items:baseline}' +
    '.th-at a{color:inherit;text-decoration:none;border-bottom:1px dotted var(--line-strong);overflow-wrap:anywhere}' +
    '.th-at a:hover{color:var(--liquid)}' +
    '.th-at b{color:var(--liquid);font-weight:500}' +
    '.th-words{margin:0.1rem 0 0;font-weight:600;color:var(--foam);overflow-wrap:anywhere}' +
    '.th-said{margin:0.3rem 0 0;font-size:0.93rem;color:var(--vapour-dim)}' +
    '.th-said>summary{cursor:pointer;list-style:none;overflow-wrap:anywhere}' +
    '.th-said>summary::-webkit-details-marker{display:none}' +
    '.th-said>summary .th-more{font-family:var(--mono);font-size:0.72rem;color:var(--liquid);white-space:nowrap}' +
    '.th-said[open]>summary .th-clip{display:none}' +
    '.th-said[open]>summary{margin-bottom:0.3rem}' +
    '.th-said .th-full{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}' +
    '.th-links{display:flex;flex-wrap:wrap;gap:0.35rem;margin-top:0.4rem}' +
    '.th-links a{font-family:var(--mono);font-size:0.72rem;letter-spacing:0.02em;text-decoration:none;color:var(--liquid);border:1px solid rgba(var(--liquid-rgb),0.45);border-radius:999px;padding:0.1rem 0.55rem;overflow-wrap:anywhere}' +
    '.th-links a:hover{background:rgba(var(--liquid-rgb),0.1)}' +
    '.th-next span{font-family:var(--mono);font-size:0.74rem;color:var(--vapour-dim)}' +
    '.th-empty{color:var(--vapour-dim);margin:0.3rem 0 0.8rem}' +
    '.th-empty a,.th-foot a{color:var(--liquid)}' +
    '.th-foot{font-size:0.86rem;color:var(--vapour-dim);margin:0.2rem 0 0}' +
    '.th-mini{display:grid;gap:0.35rem;margin:0.8rem 0 0.4rem;padding:0.7rem 0.9rem;border:1px dashed var(--line-strong);border-radius:8px}' +
    '.th-mini .th-lbl{font-family:var(--mono);font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--vapour-dim)}' +
    '.th-mini a{color:var(--liquid);overflow-wrap:anywhere}' +
    '.th-mini p{margin:0;font-size:0.95rem;overflow-wrap:anywhere}' +
    /* the quipu: a project's main cord, a pendant for each thread, knots in the colour of their hands */
    '.th-quipu{overflow-x:auto;margin:0.5rem 0 0.3rem;-webkit-overflow-scrolling:touch}' +
    '.q-wrap{min-width:0}.q-main{border-top:2.6px solid var(--foam);opacity:0.85;margin:0.9rem 0 0;padding-top:0.15rem;font-family:var(--mono);font-size:0.72rem;color:var(--vapour-dim)}' +
    '.q-pendants{display:flex;flex-wrap:wrap;gap:0.4rem 1.2rem;align-items:flex-start}' +
    'svg.th-q{display:block;height:auto;max-width:none;color:var(--foam);flex:none}' +
    'svg.th-q text{font-family:var(--mono);font-size:11px;fill:currentColor}' +
    'svg.th-q .q-dim{fill:var(--vapour-dim)}' +
    'svg.th-q .q-cord{stroke:var(--line-strong);stroke-width:2;fill:none}' +
    'svg.th-q .q-main{stroke:var(--foam);stroke-width:2.6;fill:none;opacity:0.75}' +
    'svg.th-q .q-short{stroke:var(--line-strong);stroke-width:1.3;stroke-dasharray:4 3;fill:none}' +
    'svg.th-q .q-open{fill:none;stroke:var(--line-strong);stroke-width:1.6}' +
    'svg.th-q .q-next{fill:none;stroke:var(--line-strong);stroke-width:1.6;stroke-dasharray:3 2.5}' +
    'svg.th-q .q-rung{fill:var(--liquid)}' +
    '.th-legend{display:flex;flex-wrap:wrap;gap:0.3rem 1rem;font-size:0.8rem;color:var(--vapour-dim);margin:0.2rem 0 0.6rem}' +
    '.th-legend i{display:inline-block;width:0.7rem;height:0.7rem;border-radius:50%;vertical-align:-0.05rem;margin-right:0.3rem}' +
    '.th-legend .lk{background:var(--liquid)}.th-legend .lo{border:1.6px solid var(--line-strong)}.th-legend .ln{border:1.6px dashed var(--line-strong)}' +
    '.th-knots{list-style:none;margin:0.4rem 0 0;padding:0;display:grid;gap:0.35rem}' +
    '.th-knots li{font-size:0.92rem;overflow-wrap:anywhere;color:var(--foam)}' +
    '.th-knots li.th-not{color:var(--vapour-dim)}' +
    '.th-knots .th-addr{font-family:var(--mono);font-size:0.76rem;color:var(--vapour-dim);margin-right:0.45rem}' +
    '.th-knots .th-hand{font-weight:600}' +
    '.th-knots .th-dot{display:inline-block;width:0.55rem;height:0.55rem;border-radius:50%;margin-right:0.35rem;vertical-align:0.05rem}';
  function style() {
    if (document.getElementById('threads-css')) return;
    var s = document.createElement('style'); s.id = 'threads-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function clip(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }

  /* ── THE QUIPU (function:thread 8): knots by position, cords by what they are about ──
     A pendant hangs as a quipu's does: its strand runs down, one row to each address in address
     order; an option no one took juts out as a short end on its own row; a second option taken is a
     fork, a subsidiary cord in a lane of its own; the words stand in one column beside the cords. */
  var HANDS = ['#2f7fc1', '#d9622b', '#2e9e6b', '#a855b5', '#c9a227', '#d1495b', '#3aa6a6', '#7a8a2e'];
  function handColour(who) { var h = 0; for (var i = 0; i < who.length; i++) h = (h * 31 + who.charCodeAt(i)) >>> 0; return HANDS[h % HANDS.length]; }
  var ROWH = 38, LANE = 24, TOP = 30, WORDS = 276;
  /* a knot's words without its hand's name, which the row already gives */
  function said(l) { var t = String(l.text || ''), w = l.who.toLowerCase(); return t.toLowerCase().indexOf(w) === 0 ? t.slice(w.length).replace(/^\s*(\([^)]{0,40}\))?\s*[:—–-]\s*/, '') : t; }
  function rowsOf(t) {
    var rows = [], lanes = 1;
    (function rec(n, lane) {
      n.lane = lane; n.row = rows.length; rows.push(n);
      var first = true;
      n.kids.forEach(function (k) {
        if (!k.taken) { k.lane = lane; k.row = rows.length; rows.push(k); return; }
        var l = first ? lane : lanes++; first = false;
        rec(k, l);
      });
    })(t, 0);
    return { rows: rows, lanes: lanes };
  }
  /* one pendant, its own svg: a registry thread's knots, or a keeper's ladder */
  function pendant(th) {
    var out = [], rows, lanes;
    if (th.tree) { var r = rowsOf(th.tree); rows = r.rows; lanes = r.lanes; }
    else { rows = (th.rungs || []).map(function (g, i) { return { ladder: g, lane: 0, row: i, taken: true }; }); lanes = 1; }
    var X = function (lane) { return 14 + lane * LANE; }, Y = function (row) { return TOP + row * ROWH; };
    var tx = X(lanes - 1) + 30, n = rows.length, W = tx + WORDS, H = Y(n) + (th.tree ? 4 : ROWH);
    var label = th.registry ? 'thread ' + th.registry : th.name;
    out.push('<text x="' + (X(0) + 8) + '" y="12" class="q-dim">' + esc(label) + '</text>');
    if (th.tree) {
      var lastIn = {};
      rows.forEach(function (x) { if (x.taken) lastIn[x.lane] = x.row; });
      for (var lane = 0; lane < lanes; lane++) if (lastIn[lane] != null) {
        var start = rows.filter(function (x) { return x.taken && x.lane === lane; })[0];
        var c = start.hands && start.hands.length ? handColour(start.hands[0].who) : '';
        out.push('<line class="q-cord" x1="' + X(lane) + '" y1="' + (lane === 0 ? 0 : Y(start.row)) + '" x2="' + X(lane) + '" y2="' + Y(lastIn[lane]) + '"' + (c ? ' style="stroke:' + c + '"' : '') + '/>');
      }
      rows.forEach(function (x) {
        x.kids.forEach(function (k) {
          if (k.taken && k.lane !== x.lane) out.push('<path class="q-cord" d="M' + X(x.lane) + ' ' + Y(x.row) + ' C ' + X(k.lane) + ' ' + Y(x.row) + ', ' + X(k.lane) + ' ' + Y(x.row) + ', ' + X(k.lane) + ' ' + Y(k.row) + '"' + (k.hands.length ? ' style="stroke:' + handColour(k.hands[0].who) + '"' : '') + '/>');
        });
      });
      rows.forEach(function (x) {
        var y = Y(x.row), cx = X(x.lane), head, words;
        if (x.taken) {
          var hs = x.hands;
          if (x.live && hs.length) out.push('<circle cx="' + cx + '" cy="' + y + '" r="' + (10 + 3 * hs.length) + '" fill="' + handColour(hs[0].who) + '" opacity="0.18"/>');
          if (!hs.length) out.push('<circle class="q-open" cx="' + cx + '" cy="' + y + '" r="5"/>');
          hs.forEach(function (l, i) { out.push('<circle cx="' + (cx + i * 9) + '" cy="' + y + '" r="6" fill="' + handColour(l.who) + '" stroke="var(--paper,#fff)" stroke-width="1"><title>' + esc(x.addr + ' · ' + l.who + ': ' + l.text) + '</title></circle>'); });
          head = x.addr + (hs.length ? ' · ' + hs.map(function (l) { return l.who; }).join(', ') : '');
          words = hs.length ? said(hs[0]) : x.option;
        } else {
          out.push('<line class="q-short" x1="' + cx + '" y1="' + y + '" x2="' + (cx + 16) + '" y2="' + y + '"/><circle class="q-open" cx="' + (cx + 20) + '" cy="' + y + '" r="4"><title>' + esc(x.addr + ' · offered by ' + x.offerer + ', not taken: ' + x.option) + '</title></circle>');
          head = x.addr + ' · not taken'; words = x.option;
        }
        out.push('<text x="' + tx + '" y="' + (y - 3) + '"' + (x.taken ? '' : ' class="q-dim"') + '>' + esc(clip(head, 38)) + '</text>');
        out.push('<text x="' + tx + '" y="' + (y + 11) + '" class="q-dim">' + esc(clip(words, 40)) + (x.crosses && x.crosses.length ? ' ⨯ thread:' + esc(x.crosses[0]) : '') + '</text>');
      });
    } else {
      out.push('<line class="q-cord" x1="' + X(0) + '" y1="0" x2="' + X(0) + '" y2="' + Y(n) + '"/>');
      rows.forEach(function (x) {
        var y = Y(x.row), g = x.ladder;
        out.push('<circle class="q-rung" cx="' + X(0) + '" cy="' + y + '" r="6"><title>' + esc((g.block || g.url || '') + ' ' + (g.addr || '') + ' — ' + (g.words || '')) + '</title></circle>');
        out.push('<text x="' + tx + '" y="' + (y - 3) + '">' + esc(clip(g.words || g.block || g.url, 40)) + '</text>');
        out.push('<text x="' + tx + '" y="' + (y + 11) + '" class="q-dim">' + esc(clip((g.block || '') + (g.addr ? ' ' + g.addr : ''), 40)) + '</text>');
      });
      out.push('<circle class="q-next" cx="' + X(0) + '" cy="' + Y(n) + '" r="6"/><text x="' + tx + '" y="' + (Y(n) + 4) + '" class="q-dim">next, untied</text>');
    }
    return '<svg class="th-q" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="img" aria-label="' +
      esc(label + ', drawn as a quipu pendant: ' + n + (th.tree ? ' addresses' : ' rungs') + '.') + '">' + out.join('') + '</svg>';
  }
  /* a project's threads as one quipu: the main cord across the top, each thread a pendant hanging
     from it; on a narrow screen the pendants wrap beneath one another */
  function quipu(threads, opts) {
    opts = opts || {};
    var ps = (threads || []).filter(function (th) { return th.tree || (th.rungs && th.rungs.length); }).map(pendant);
    if (!ps.length) return '';
    return '<div class="q-wrap">' + (opts.title ? '<div class="q-main"><span>' + esc(opts.title) + '</span></div>' : '<div class="q-main"></div>') +
      '<div class="q-pendants">' + ps.join('') + '</div></div>';
  }
  var LEGEND = '<p class="th-legend"><span><i class="lk"></i>a knot tied — its colour is the hand that tied it</span><span><i class="lo"></i>an option offered, not taken</span><span><i class="ln"></i>next, untied</span><span>⨯ a knot naming another thread\u2019s place</span></p>';
  function knotsHTML(th) {
    var out = [];
    (function rec(n) {
      if (n.taken) n.hands.forEach(function (l) { out.push('<li><span class="th-addr">' + esc(n.addr) + '</span><span class="th-dot" style="background:' + handColour(l.who) + '"></span><span class="th-hand">' + esc(l.who) + '</span> · ' + esc(said(l)) + '</li>'); });
      else out.push('<li class="th-not"><span class="th-addr">' + esc(n.addr) + '</span>offered by ' + esc(n.offerer) + ', not taken · ' + esc(n.option) + '</li>');
      n.kids.forEach(rec);
    })(th.tree);
    return '<ol class="th-knots">' + out.join('') + '</ol>';
  }
  function rungHTML(r, last) {
    var at = r.url ? '<a href="' + esc(r.url) + '" rel="noopener">' + esc(r.url.replace(/^https?:\/\//, '').slice(0, 56)) + '</a>'
      : '<a href="' + esc(BEACH + '?block=' + encodeURIComponent(r.block) + (r.addr ? '&spindle=' + encodeURIComponent(r.addr) : '')) + '" title="the words as they stand on the beach">' +
        esc(r.block) + (r.addr ? ' <b>' + esc(r.addr) + '</b>' : '') + '</a>';
    var said = '';
    if (r.said) {
      /* the act's own words, without the date its record opens with (the rung shows it) */
      var body = r.said.replace(/^\d{4}-\d\d-\d\d\b[^—\n]{0,40}—\s*/, '').replace(/\s+/g, ' ').trim(), short = clip(body, 190);
      said = short.length < body.length
        ? '<details class="th-said"><summary><span class="th-clip">' + esc(short) + ' </span><span class="th-more">read it all</span></summary><p class="th-full">' + esc(r.said) + '</p></details>'
        : '<p class="th-said">' + esc(short) + '</p>';
    } else if (r.missing) said = '<p class="th-said">Nothing stands there yet.</p>';
    else if (r.unread) said = '<p class="th-said">Couldn’t be read just now.</p>';
    return '<li class="th-rung' + (last ? ' th-last' : '') + '">' +
      '<div class="th-at">' + at + (r.when ? '<span>' + esc(r.when) + '</span>' : '') + '</div>' +
      (r.words ? '<p class="th-words">' + esc(r.words.charAt(0).toUpperCase() + r.words.slice(1)) + '</p>' : '') + said +
      (r.links && r.links.length ? '<div class="th-links">' + r.links.map(function (l) { return '<a href="' + esc(l.url) + '" rel="noopener">' + esc(l.label) + ' ↗</a>'; }).join('') + '</div>' : '') +
    '</li>';
  }
  function threadHTML(th, opts) {
    var step = th.step ? (opts.stepHref ? '<a class="th-tag" href="' + esc(opts.stepHref(th.step)) + '">serves step ' + esc(th.step) + '</a>' : '<span class="th-tag">serves step ' + esc(th.step) + '</span>') : '';
    if (th.registry) {
      var t = th.tree, hands = {};
      (function rec(x) { if (x.taken) x.hands.forEach(function (l) { hands[l.who] = 1; }); x.kids.forEach(rec); })(t || { kids: [], hands: [], taken: false });
      var nh = Object.keys(hands).length;
      return '<article class="th" id="' + idOf(th.name) + '">' +
        '<div class="th-head"><h3 class="th-name">thread ' + esc(th.registry) + '</h3>' + step +
          '<span class="th-tag">' + nh + (nh === 1 ? ' hand' : ' hands') + '</span>' +
          '<a class="th-tag" href="' + esc(BEACH + '?block=spine:thread&spindle=' + encodeURIComponent(th.registry)) + '" title="its line in the registry">spine:thread ' + esc(th.registry) + '</a></div>' +
        '<p class="th-carries">' + esc(capFirst(th.carries || th.line || '')) + '</p>' +
        (t && t.lines.length ? '<div class="th-quipu">' + quipu([th]) + '</div>' + LEGEND + knotsHTML(th)
          : '<p class="th-empty">' + (th.unread ? 'Its mirrors couldn’t be read just now.' : 'Opened in the registry; no knot tied yet.') + '</p>') +
      '</article>';
    }
    var n = th.rungs.length;
    return '<article class="th" id="' + idOf(th.name) + '">' +
      '<div class="th-head"><h3 class="th-name">' + esc(th.name) + '</h3>' + step +
        '<span class="th-tag">' + n + (n === 1 ? ' rung' : ' rungs') + '</span>' +
        '<a class="th-tag" href="/walk/' + encodeURIComponent(th.name) + '">walk it</a></div>' +
      (th.carries ? '<p class="th-carries">' + esc(th.carries.charAt(0).toUpperCase() + th.carries.slice(1)) + '</p>' : '') +
      (th.who ? '<p class="th-who">' + esc(clip(th.who, 220)) + '</p>' : '') +
      (n ? '<ol class="th-rungs">' + th.rungs.map(function (r, i) { return rungHTML(r, i === n - 1); }).join('') +
        '<li class="th-next"><span>the next rung, not yet tied</span></li></ol>'
        : '<p class="th-empty">Named in the law, its ladder not yet begun.</p>') +
    '</article>';
  }

  /* opts.step: only the threads serving that step, drawn small (the step's own section);
     opts.stepHref(addr): where a thread's step lives on this page; opts.empty: the words when none stand */
  function draw(el, family, opts) {
    opts = opts || {};
    style();
    if (!opts.step) el.innerHTML = '<p class="th-empty">Reading the threads from the beach…</p>';
    return read(family).then(function (got) {
      var list = got.threads.filter(function (t) { return !opts.step || t.step === opts.step; });
      if (opts.step) {
        el.innerHTML = list.length ? '<div class="th-mini"><span class="th-lbl">' + (list.length === 1 ? 'Its thread' : 'Its threads') + '</span>' + list.map(function (th) {
          if (th.registry) {
            var lives = []; (function rec(x) { if (x.live && x.hands.length) lives.push(x); x.kids.forEach(rec); })(th.tree || { kids: [], hands: [] });
            return '<p><a href="#' + idOf(th.name) + '">thread ' + esc(th.registry) + '</a>' +
              (lives.length ? ' · where it stands: ' + lives.map(function (x) { return esc(x.addr) + ' ' + esc(x.hands[0].who) + ', ' + esc(clip(x.hands[0].text, 80)); }).join('; ') : '') + '</p>';
          }
          var last = th.rungs[th.rungs.length - 1];
          return '<p><a href="#' + idOf(th.name) + '">' + esc(th.name) + '</a> · ' + th.rungs.length + (th.rungs.length === 1 ? ' rung' : ' rungs') +
            (last && last.words ? ', the latest: ' + esc(last.words) : '') + '</p>';
        }).join('') + '</div>' : '';
        return got;
      }
      el.innerHTML = list.length
        ? '<div class="th-list">' + list.map(function (th) { return threadHTML(th, opts); }).join('') + '</div>' +
          '<p class="th-foot">A thread in the registry is a number; each hand ties its own knot in its own mirror at the option it takes, so the address is the record and an option no one took stays readable. A thread tied before 29 October is a keeper’s ladder, each rung an address where one act stands. Both are read live where they were made. <a href="/explain?block=function:thread">How a thread works</a>.</p>'
        : '<p class="th-empty">' + (opts.empty || 'Nothing is tied yet. As the work begins, each piece of it is carried here as a thread: a ladder of addresses on the beach, each where one act stands — a build’s record, a working document, a live site — read live, so this page grows with the work.') +
          ' <a href="/explain?block=function:thread">How a thread works</a>.</p>';
      return got;
    }, function () {
      if (!opts.step) el.innerHTML = '<p class="th-empty">The threads couldn’t be read just now.</p>';
    });
  }

  window.beachThreads = { read: read, draw: draw, quipu: quipu, legend: LEGEND, style: style, parseRung: parseRung, parseThread: parseThread, linksIn: linksIn };

  function auto() {
    document.querySelectorAll('[data-threads]').forEach(function (el) {
      var fam = (el.getAttribute('data-threads') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (fam) draw(el, fam);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
