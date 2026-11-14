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
 *
 * WHERE A LINE STANDS (function:thread re-cut 3 November 2026, bsp-mcp proposals/2026-11-03-threads-
 * without-the-keyword.md): an act and an option are told apart by where they stand, never by a word —
 * the lines a hand puts beneath its own act are its options, and every other line is an act — so an
 * option is taken when another hand's line stands at it or anything beneath it, and its offerer is
 * the hand whose act stands at the knot above. A place put in a hand's room, pool:<handle>, waits on
 * that hand until one of its options is taken or, where none was offered, until that hand ties at or
 * beneath it; window.beachThreads.waiting(handle) reads those, and every live end whose closing clause
 * names the hand (from 29 October to 3 November every act closed ' · waits on <handle>' or
 * ' · complete'), for the page that is theirs (the loom). Each option is set in beneath the knot that
 * offered it, and each open option of a live end whose clause names a hand carries a tap for that
 * hand: it says the option's words in that hand's own mirror at the option's address, through the
 * beach's voice (window.siteVoice, the loom's word chips), and puts the place in the room of the hand
 * that offered it (window.beachThreads.handOn).
 *
 * THE ENDINGS BACK (function:thread re-cut 4 November 2026, bsp-mcp proposals/2026-11-04-threads-keep-their-
 * endings.md): every act closes ' · waits on <handle>', ' · waits on <handle> from <date>' or ' · complete',
 * and an option never does, so whose move it is stands in the thread again. A live end that waits on a hand
 * from a date not yet come stays off their cards until that day, and waiting(handle).later lists it for a
 * 'later' row; a place in a room is the doorbell, and makes a card only where the place's own lines carry no
 * ending (the threads tied from 3 to 4 November). The tap writes the option's words and ' · waits on <the
 * hand that offered it>' again, and still rings that hand's room.
 *
 * THE FOLD (14 November 2026, at David's word: 'concatenated versions of the
 * quipu/threads, so that the graphic can be shortened and the user can expand it'): a strand longer than
 * nine knots shows its opening knot, one line counting the earlier knots folded away, and its newest seven
 * down to its end with its open choices. A knot a fork leaves from is never folded, so nothing live is
 * hidden, and each fork folds as a cord of its own. A tap unfolds it; the fold is the reader's, stored
 * nowhere. The same fold serves the cord in words, a keeper's ladder and the quipu's pendant. The rule is
 * bsp-mcp proposals/2026-11-14-threads-fold.md; its sentence for function:thread 8.11 went to the thread battery,
 * which held it out (F4 missed its gate), so the law itself says nothing of a thread's length.
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
  /* an act is told from an option by where it stands (function:thread 3): see treeOf. A line that closes
     ' · waits on <handle>' or ' · complete' before its reads, as every act did from 29 October to 3
     November, is an act wherever it stands (function:thread 7); in a thread opened before 29 October a
     line is also an act by its reads, a time or a word, as the thread battery's checker reads it */
  var READS = ' · read: ';
  var CLAUSE = /\s·\s(?:waits on ([A-Za-z0-9_.\-]+(?:(?:,\s*|\s+and\s+)[A-Za-z0-9_.\-]+)*)(?:\s+from\s+(\d{4}-\d\d-\d\d))?|complete)\s*$/;
  /* the day a waiting is put off to, ' · waits on <handle> from 2026-11-07', or '' */
  function fromOf(t) { var m = CLAUSE.exec(bodyOf(t)); return (m && m[2]) || ''; }
  var PHASE2 = '2026-10-29T17:13:14Z';   /* the law of the closing clause, the battery's V2_SINCE */
  /* a place, thread:<address>, standing on its own: never the tail of a block's name, archive:ways:thread:2026-11-03 */
  var PLACE = /(^|[^\w:])thread:(\d+(?:\.\d+)?)\b/;
  function bodyOf(t) { return String(t || '').split(READS)[0]; }
  function closes(t) { return CLAUSE.test(bodyOf(t)); }
  function actBefore(t) {
    var b = bodyOf(t);
    return String(t || '').indexOf(READS) >= 0 || /\bwait(?:s|ing)?\s+(?:on|for)\b|\bcomplete\b/i.test(b) ||
      /\bat [A-Za-z0-9_.\-]+'s word\b/i.test(b) || /\b20\d\d-\d\d-\d\dT\d\d:\d\d/.test(b);
  }
  /* whom an act waits on by its own words: its closing clause, or, in a thread opened before 29 October,
     the last 'waits on' it says; every other live end waits on whoever's room holds its place (waiting) */
  function waitsOn(t, before) {
    var m = CLAUSE.exec(bodyOf(t));
    if (m) return m[1] ? m[1].split(/,\s*|\s+and\s+/) : [];
    if (before === false) return [];
    var all = bodyOf(t).match(/\bwaits? on ([A-Za-z0-9_\-]+)/gi) || [];
    return all.length ? [all[all.length - 1].replace(/^waits? on /i, '')] : [];
  }
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
      var nd = head.split(''), entry = walk(reg, nd);
      th.line = textOf(entry);
      th.opened = entry && typeof entry === 'object' && typeof entry['3'] === 'string' ? entry['3'] : '';
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
        th.tree = treeOf(at, nd, floor, th.registry, !!th.opened && th.opened < PHASE2);
        th.knots = Object.keys(at).map(function (a) { return at[a]; }).sort(function (x, y) { var a = x.ds.join(''), b = y.ds.join(''); return a < b ? -1 : a > b ? 1 : 0; });
        th.floor = floor;
        return th;
      });
    });
  }
  /* each address a node: the lines standing there, each an act or an option by where it stands — a line
     at the thread's number is an act; beneath another hand's line, or beneath its own option (taken one
     deeper), a hand's line is an act; beneath its own act it is an option, unless it offers two or more
     of its own beneath it (a step that went on) (function:thread 3), as the thread battery's form pass
     reads it; the hand that offered it (whose act stands at the knot above, and whose option stands
     here); whether it was taken (an act stands here, or the work went on beneath it); the live ends,
     acts with nothing taken beneath them, and whom a closing clause says each waits on; and any other
     thread's place a line names. What position cannot tell: a hand's own step beneath its own act that
     offers one option or none reads as an option. before: the thread was opened before 29 October, when a
     line was also an act by a word, or by any line of its own one digit beneath (function:thread 7) */
  function treeOf(at, nd, floor, number, before) {
    var all = Object.keys(at).map(function (a) { return at[a]; });
    function beneath(key) {
      return all.some(function (x) { var k = x.ds.join(''); return k.length > key.length && k.indexOf(key) === 0; });
    }
    /* how many of the hand's own lines stand one digit beneath, never deeper: a hand's answer far down a
       thread says nothing of the option it offered near the top */
    function offers(key, who) {
      return all.filter(function (x) { var k = x.ds.join(''); return k.length === key.length + 1 && k.indexOf(key) === 0 && x.lines.some(function (l) { return l.who === who; }); }).length;
    }
    function node(ds, parent) {
      var key = ds.join(''), a = dotted(ds, floor), here = at[a] || { lines: [] };
      var me = { addr: a, ds: ds, lines: here.lines, kids: [], depth: parent ? parent.depth + 1 : 0, parent: parent };
      here.lines.forEach(function (l) {
        var above = parent && parent.lines.some(function (p) { return p.act && p.who === l.who; });
        l.act = !parent || closes(l.text) || !above || offers(key, l.who) >= (before ? 1 : 2) || !!(before && actBefore(l.text));
      });
      var offering = parent ? parent.lines.filter(function (l) { return l.act; }).map(function (l) { return l.who; }) : [];
      var opt = parent ? (here.lines.filter(function (l) { return !l.act && offering.indexOf(l.who) >= 0; })[0] || here.lines.filter(function (l) { return !l.act; })[0]) : null;
      me.offerer = opt ? opt.who : offering[0] || '';
      me.option = opt ? opt.text : '';
      for (var d = 1; d <= 9; d++) {
        var ck = key + d;
        if (all.some(function (x) { return x.ds.join('').indexOf(ck) === 0; })) me.kids.push(node(ds.concat(String(d)), me));
      }
      me.hands = me.lines.filter(function (l) { return l.act; });
      me.taken = !parent || me.hands.length > 0 || beneath(key);
      me.live = me.hands.length > 0 && !me.kids.some(function (k) { return k.taken; });
      me.waits = []; me.from = '';
      if (me.live) me.hands.forEach(function (l) { waitsOn(l.text, !!before).forEach(function (w) { if (me.waits.indexOf(w) < 0) me.waits.push(w); }); });
      if (me.live) me.hands.forEach(function (l) { var f = fromOf(l.text); if (f > me.from) me.from = f; });
      me.crosses = [];
      me.lines.forEach(function (l) { var m, re = new RegExp(PLACE.source, 'g'); while ((m = re.exec(l.text))) if (m[2].split('.')[0] !== String(number)) me.crosses.push(m[2]); });
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
        /* a keeper's ladder is read only where the beach's index holds its blocks, so a thread a law names
           and nobody founded asks for nothing that is not there */
        return indexNames().catch(function () { return null; }).then(function (names) {
          var has = function (n) { return !names || names.indexOf(n) >= 0; };
          return Promise.all([has('spine:' + th.name) ? get('spine:' + th.name).catch(function () { return null; }) : null,
            has('function:' + th.name) ? get('function:' + th.name).catch(function () { return null; }) : null]);
        }).then(function (two) {
          th.rungs = ladder(two[0]);
          th.who = two[1] ? textOf(two[1]['2']).replace(/^WHO\s*[:—–-]\s*/i, '') : '';
          return Promise.all(th.rungs.map(function (r) {
            if (r.url || !r.block) { r.said = ''; r.links = r.url ? [{ url: r.url, label: r.url.replace(/^https?:\/\//, '').slice(0, 56), kind: 'page' }] : []; return null; }
            return indexNames().catch(function () { return null; }).then(function (names) {
              if (names && names.indexOf(r.block) < 0) return null;
              return get(r.block, r.addr);
            }).then(function (n) {
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
    '.th-knots .th-dot{display:inline-block;width:0.55rem;height:0.55rem;border-radius:50%;margin-right:0.35rem;vertical-align:0.05rem}' +
    /* a tap on an open option: the word chip the loom's tiles wear */
    '.th-tap{font-family:var(--mono);font-size:0.72rem;font-weight:700;letter-spacing:0.04em;border:1px solid rgba(var(--liquid-rgb),0.6);background:rgba(var(--liquid-rgb),0.1);color:var(--liquid);border-radius:5px;padding:0.15rem 0.55rem;cursor:pointer;white-space:nowrap;margin-left:0.25rem}' +
    '.th-tap:hover{background:rgba(var(--liquid-rgb),0.24)}.th-tap:disabled{cursor:progress;opacity:0.55}' +
    '.th-tap:focus-visible{outline:2px solid var(--liquid);outline-offset:1px}' +
    '.th-sn{font-family:var(--mono);font-size:0.7rem;color:var(--vapour-dim);margin-left:0.35rem}' +
    /* the cord (function:thread 8 on a page): the route one line at one indent, the ways not taken
       leading off it as short faint ends, the ways open now dashed, a fork a cord set in */
    '.th-cord{list-style:none;margin:0.8rem 0 0.4rem;padding:0 0 0 1.75rem;position:relative;display:grid;gap:1rem;z-index:0}' +
    '.th-cord::before{content:"";position:absolute;left:0.6rem;top:0.55rem;bottom:0.7rem;width:3px;border-radius:3px;background:var(--foam,currentColor);opacity:0.5;z-index:2}' +
    '.th-k{position:relative;min-width:0}' +
    '.th-k::before{content:"";position:absolute;left:-1.49rem;top:0.33rem;width:0.85rem;height:0.85rem;box-sizing:border-box;border-radius:50%;background:var(--th-hand,var(--liquid,currentColor));box-shadow:0 0 0 3px var(--paper,transparent);z-index:3}' +
    '.th-k.th-live::before{box-shadow:0 0 0 3px var(--paper,transparent),0 0 0 6px rgba(var(--liquid-rgb,128,128,128),0.35)}' +
    '.th-k.th-bare::before{background:var(--paper,transparent);border:2px solid var(--line-strong,currentColor)}' +
    '.th-act{margin:0;line-height:1.5;color:var(--foam,inherit);overflow-wrap:anywhere}' +
    '.th-act+.th-act{margin-top:0.45rem}' +
    '.th-kaddr{font-family:var(--mono,monospace);font-size:0.72rem;letter-spacing:0.02em;color:var(--vapour-dim,inherit);margin-right:0.5rem;white-space:nowrap}' +
    '.th-khand{font-weight:700;margin-right:0.1rem}' +
    '.th-quiet{color:var(--vapour-dim,inherit)}' +
    '.th-ending{font-family:var(--mono,monospace);font-size:0.7rem;white-space:nowrap;border:1px solid var(--line-strong,currentColor);border-radius:999px;padding:0.02rem 0.45rem;color:var(--vapour-dim,inherit)}' +
    '.th-live .th-ending{border-color:rgba(var(--liquid-rgb,128,128,128),0.7);color:var(--liquid,inherit)}' +
    '.th-cross{font-family:var(--mono,monospace);font-size:0.7rem;color:var(--vapour-dim,inherit)}' +
    '.th-reads{display:block;margin-top:0.15rem;font-family:var(--mono,monospace);font-size:0.68rem;line-height:1.4;color:var(--vapour-dim,inherit);opacity:0.8;overflow-wrap:anywhere}' +
    '.th-ends{list-style:none;margin:0.4rem 0 0.1rem 1.4rem;padding:0;display:grid;gap:0.25rem}' +
    '.th-end{position:relative;padding-left:1.2rem;font-size:0.84rem;line-height:1.45;color:var(--vapour-dim,inherit);opacity:0.68;overflow-wrap:anywhere}' +
    '.th-end::before{content:"";position:absolute;left:-2.46rem;top:-0.44rem;width:3.4rem;height:1.05rem;border-bottom:1.5px solid currentColor;border-bottom-left-radius:2rem 1.05rem;opacity:0.7;z-index:1}' +
    '.th-end .th-kaddr{font-size:0.66rem}' +
    '.th-ends.th-open .th-end{color:var(--foam,inherit);opacity:1}' +
    '.th-ends.th-open .th-end::before{border-bottom-style:dashed;border-bottom-color:var(--liquid,currentColor);opacity:0.9}' +
    '.th-fork{margin:0.7rem 0 0 1.4rem}' +
    '.th-fork::after{content:"";position:absolute;left:-2.46rem;top:-0.5rem;width:3.15rem;height:1.05rem;border-top:3px solid var(--foam,currentColor);border-right:3px solid var(--foam,currentColor);border-top-right-radius:1rem;opacity:0.5;box-sizing:border-box}' +
    '.th-key{display:flex;flex-wrap:wrap;gap:0.3rem 1.1rem;margin:0.4rem 0 0;font-size:0.78rem;color:var(--vapour-dim,inherit)}' +
    '.th-key i{display:inline-block;vertical-align:0.08rem;margin-right:0.4rem;box-sizing:border-box}' +
    '.th-key .ck-on{width:0.7rem;height:0.7rem;border-radius:50%;background:var(--liquid,currentColor)}' +
    '.th-key .ck-off{width:1.3rem;height:0.55rem;border-bottom:1.5px solid currentColor;border-bottom-left-radius:0.9rem 0.55rem;opacity:0.7}' +
    '.th-key .ck-open{width:1.3rem;height:0.55rem;border-bottom:1.5px dashed var(--liquid,currentColor);border-bottom-left-radius:0.9rem 0.55rem}' +
    /* the fold: the earlier knots tucked into one line, three dots on the cord where
       they are; a tap opens them on the same cord, at the same indent */
    '.th-k.th-fold::before,.th-rung.th-fold::before{top:0.08rem;width:0.6rem;height:1.3rem;border:0;border-radius:0;box-shadow:none;' +
      'background:radial-gradient(circle,var(--line-strong,currentColor) 0 2px,transparent 2.6px) center top/100% 33.34% repeat-y,var(--paper,transparent)}' +
    '.th-k.th-fold::before{left:-1.365rem}.th-rung.th-fold::before{left:-1.19rem}' +
    '.th-fd>summary{cursor:pointer;list-style:none;font-family:var(--mono,monospace);font-size:0.74rem;line-height:1.5;color:var(--vapour-dim,inherit);overflow-wrap:anywhere}' +
    '.th-fd>summary::-webkit-details-marker{display:none}' +
    '.th-fd>summary:focus-visible{outline:2px solid var(--liquid,currentColor);outline-offset:2px;border-radius:4px}' +
    '.th-fd .th-frange{margin-right:0.3rem;letter-spacing:0.02em}' +
    '.th-fd .th-go{color:var(--liquid,inherit);text-decoration:underline dotted;text-underline-offset:0.2em}' +
    '.th-fd[open] .th-sh,.th-fd:not([open]) .th-hd{display:none}' +
    '.th-cord.th-folded{margin:0.9rem 0 0 -1.75rem;z-index:auto}.th-cord.th-folded::before{display:none}' +
    '.th-rungs.th-folded{margin:0.8rem 0 0 -1.35rem}.th-rungs.th-folded::before{display:none}' +
    '.q-fold{flex:none;min-width:0}.q-fold>.q-all{display:none}.q-fold.q-unfolded>.q-all{display:block}.q-fold.q-unfolded>.q-folded{display:none}' +
    'svg.th-q [data-th-unfold]{cursor:pointer;outline:none}' +
    'svg.th-q .q-hit{fill:transparent;pointer-events:all}' +
    'svg.th-q [data-th-unfold]:hover .q-hit,svg.th-q [data-th-unfold]:focus-visible .q-hit{fill:rgba(var(--liquid-rgb,128,128,128),0.1);stroke:var(--liquid);stroke-width:1.2}' +
    'svg.th-q .q-dots{fill:currentColor}svg.th-q .q-go{fill:var(--liquid)}' +
    'svg.th-q .q-faint{fill:var(--vapour-dim);opacity:0.6;font-size:10px}';
  function style() {
    if (document.getElementById('threads-css')) return;
    var s = document.createElement('style'); s.id = 'threads-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function clip(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }

  /* ── THE FOLD: a strand shows nine knots at most ──
     its opening knot, one line counting the earlier knots folded away, and its newest seven; a knot a
     fork leaves from stays, so the fold takes only straight runs of two or more. A strand is an array,
     oldest first; each run is [first, last], inclusive. */
  var FOLD_NEW = 7, FOLD_MOST = FOLD_NEW + 2;
  function foldRuns(strand, stays) {
    var runs = [], run = null;
    if (strand.length <= FOLD_MOST) return runs;
    for (var i = 1; i < strand.length - FOLD_NEW; i++) {
      if (stays && stays(strand[i])) { run = null; continue; }
      if (run) run[1] = i; else runs.push(run = [i, i]);
    }
    return runs.filter(function (r) { return r[1] > r[0]; });
  }
  function forksFrom(n) { return n.kids.filter(function (k) { return k.taken; }).length > 1; }
  /* a tree's strands, oldest knot first: the route, then each fork, a cord of its own */
  function strandsOf(t) {
    var out = [];
    (function from(n) {
      var s = [], forks = [];
      while (n) {
        s.push(n);
        var on = n.kids.filter(function (k) { return k.taken; });
        forks = forks.concat(on.slice(1)); n = on[0] || null;
      }
      out.push(s); forks.forEach(from);
    })(t);
    return out;
  }
  /* a list's items with each run tucked into one line that opens at a tap (a <details>, so it needs no
     script): li and ol name the list's own classes, so a folded knot opens on the same cord */
  function foldHTML(items, runs, rangeOf, li, ol, unit) {
    var out = '', r = 0;
    for (var i = 0; i < items.length; i++) {
      var run = runs[r];
      if (!run || i !== run[0]) { out += items[i]; continue; }
      var k = run[1] - run[0] + 1, range = rangeOf ? rangeOf(run[0], run[1]) : '';
      out += '<li class="' + li + ' th-fold"><details class="th-fd"><summary>' + (range ? '<span class="th-frange">' + esc(range) + '</span> ' : '') +
        '<span class="th-sh">' + k + ' earlier ' + unit + 's, folded · <span class="th-go">show them</span></span>' +
        '<span class="th-hd">' + k + ' earlier ' + unit + 's · <span class="th-go">fold them</span></span></summary>' +
        '<ol class="' + ol + ' th-folded">' + items.slice(run[0], run[1] + 1).join('') + '</ol></details></li>';
      i = run[1]; r++;
    }
    return out;
  }

  /* ── THE QUIPU (function:thread 8): knots by position, cords by what they are about ──
     A pendant hangs as a quipu's does: its strand runs down, one row to each address in address
     order; an option no one took juts out as a short end on its own row; a second option taken is a
     fork, a subsidiary cord in a lane of its own; the words stand in one column beside the cords. */
  var HANDS = ['#2f7fc1', '#d9622b', '#2e9e6b', '#a855b5', '#c9a227', '#d1495b', '#3aa6a6', '#7a8a2e'];
  function handColour(who) { var h = 0; for (var i = 0; i < who.length; i++) h = (h * 31 + who.charCodeAt(i)) >>> 0; return HANDS[h % HANDS.length]; }
  var ROWH = 38, LANE = 24, TOP = 30, WORDS = 276;
  /* a knot's words without its hand's name, which the row already gives */
  function said(l) {
    var t = String(l.text || ''), w = l.who.toLowerCase(), m = t.toLowerCase().indexOf(w) === 0 && /^\s*(\([^)]{0,40}\))?\s*[:—–-]\s*/.exec(t.slice(w.length));
    return m ? t.slice(w.length + m[0].length) : t;   /* 'weft (lane x): built' reads 'built'; 'weft takes 2.41' keeps its name */
  }
  /* the ways a knot offered and no one took sit right beneath it, before the strand that went on */
  function rowsOf(t) {
    var rows = [], lanes = 1;
    (function rec(n, lane) {
      n.lane = lane; n.row = rows.length; rows.push(n);
      n.kids.forEach(function (k) { if (!k.taken) { k.lane = lane; k.row = rows.length; rows.push(k); } });
      var first = true;
      n.kids.forEach(function (k) {
        if (!k.taken) return;
        var l = first ? lane : lanes++; first = false;
        rec(k, l);
      });
    })(t, 0);
    return { rows: rows, lanes: lanes };
  }
  /* a pendant's fold line: three dots on the cord where the earlier knots are tucked,
     the count beside them, a tap to show them */
  function foldRow(cx, y, tx, W, f) {
    var say = f.n + ' earlier ' + f.unit + 's folded' + (f.range ? ', ' + f.range : '') + ': show them';
    return '<g class="q-foldrow" data-th-unfold role="button" tabindex="0" aria-label="' + esc(say) + '"><title>' + esc(say) + '</title>' +
      '<rect class="q-hit" x="0" y="' + (y - 17) + '" width="' + W + '" height="34" rx="6"/>' +
      [-7, 0, 7].map(function (d) { return '<circle class="q-dots" cx="' + cx + '" cy="' + (y + d) + '" r="2.3"/>'; }).join('') +
      '<text x="' + tx + '" y="' + (y - 3) + '">' + f.n + ' earlier ' + f.unit + 's, folded</text>' +
      '<text x="' + tx + '" y="' + (y + 11) + '" class="q-go">' + esc(clip('show them' + (f.range ? ' · ' + f.range : ''), 40)) + '</text></g>';
  }
  /* one pendant, its own svg: a registry thread's knots, or a keeper's ladder; folded unless all, and it
     says whether it folds anything (a pendant that does is drawn both ways, and a tap swaps them) */
  function pendant(th, all) {
    var out = [], rows, lanes, foldAt = {}, gone = {}, folds = 0;
    if (th.tree) {
      var r = rowsOf(th.tree); rows = r.rows; lanes = r.lanes;
      strandsOf(th.tree).forEach(function (s) {
        foldRuns(s, forksFrom).forEach(function (run) {
          folds++;
          foldAt[s[run[0]].addr] = { n: run[1] - run[0] + 1, range: s[run[0]].addr + ' to ' + s[run[1]].addr, unit: 'knot' };
          for (var i = run[0]; i <= run[1]; i++) {
            if (i > run[0]) gone[s[i].addr] = 1;
            s[i].kids.forEach(function (k) { if (!k.taken) gone[k.addr] = 1; });
          }
        });
      });
      if (folds && !all) {
        rows = rows.filter(function (x) { return !gone[x.addr]; });
        rows.forEach(function (x, i) { x.row = i; });
      }
    } else {
      var rungs = th.rungs || [], runs = foldRuns(rungs);
      folds = runs.length;
      rows = [];
      rungs.forEach(function (g, i) {
        var run = !all && runs.filter(function (rn) { return i >= rn[0] && i <= rn[1]; })[0];
        if (run && i > run[0]) return;
        rows.push(run ? { fold: { n: run[1] - run[0] + 1, range: '', unit: 'rung' }, lane: 0, row: rows.length, taken: true }
          : { ladder: g, lane: 0, row: rows.length, taken: true });
      });
      lanes = 1;
    }
    var X = function (lane) { return 14 + lane * LANE; }, Y = function (row) { return TOP + row * ROWH; };
    var tx = X(lanes - 1) + 30, n = rows.length, W = tx + WORDS, H = Y(n) + (th.tree ? 4 : ROWH);
    var label = th.registry ? 'thread ' + th.registry : th.name;
    out.push('<text x="' + (X(0) + 8) + '" y="12" class="q-dim">' + esc(label) + '</text>');
    if (folds && all) {
      var fx = X(0) + 8 + Math.ceil(label.length * 6.8) + 12;
      out.push('<g data-th-unfold role="button" tabindex="0" aria-label="fold the earlier ' + (th.tree ? 'knots' : 'rungs') + ' again"><rect class="q-hit" x="' + (fx - 4) + '" y="0" width="' + Math.max(40, W - fx + 4) + '" height="18" rx="4"/>' +
        '<text x="' + fx + '" y="12" class="q-go">fold them</text></g>');
    }
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
        if (!all && foldAt[x.addr]) { out.push(foldRow(cx, y, tx, W, foldAt[x.addr])); return; }
        if (x.taken) {
          var hs = x.hands;
          if (x.live && hs.length) out.push('<circle cx="' + cx + '" cy="' + y + '" r="' + (10 + 3 * hs.length) + '" fill="' + handColour(hs[0].who) + '" opacity="0.18"/>');
          if (!hs.length) out.push('<circle class="q-open" cx="' + cx + '" cy="' + y + '" r="5"/>');
          hs.forEach(function (l, i) { out.push('<circle cx="' + (cx + i * 9) + '" cy="' + y + '" r="6" fill="' + handColour(l.who) + '" stroke="var(--paper,#fff)" stroke-width="1"><title>' + esc(x.addr + ' · ' + l.who + ': ' + l.text) + '</title></circle>'); });
          head = x.addr + (hs.length ? ' · ' + hs.map(function (l) { return l.who; }).join(', ') : '');
          words = hs.length ? said(hs[0]) : x.option;
        } else {
          /* a way not taken is set aside: a short end, and its words faint, smaller and set in */
          out.push('<line class="q-short" x1="' + cx + '" y1="' + y + '" x2="' + (cx + 16) + '" y2="' + y + '"/><circle class="q-open" cx="' + (cx + 20) + '" cy="' + y + '" r="4"><title>' + esc(x.addr + ' · offered by ' + x.offerer + ', not taken: ' + x.option) + '</title></circle>');
          out.push('<text x="' + (tx + 14) + '" y="' + (y + 4) + '" class="q-faint">' + esc(clip(x.addr + '  ' + x.option, 38)) + '</text>');
          return;
        }
        out.push('<text x="' + tx + '" y="' + (y - 3) + '">' + esc(clip(head, 38)) + '</text>');
        out.push('<text x="' + tx + '" y="' + (y + 11) + '" class="q-dim">' + esc(clip(words, 40)) + (x.crosses && x.crosses.length ? ' ⨯ thread:' + esc(x.crosses[0]) : '') + '</text>');
      });
    } else {
      out.push('<line class="q-cord" x1="' + X(0) + '" y1="0" x2="' + X(0) + '" y2="' + Y(n) + '"/>');
      rows.forEach(function (x) {
        var y = Y(x.row), g = x.ladder;
        if (x.fold) { out.push(foldRow(X(0), y, tx, W, x.fold)); return; }
        out.push('<circle class="q-rung" cx="' + X(0) + '" cy="' + y + '" r="6"><title>' + esc((g.block || g.url || '') + ' ' + (g.addr || '') + ' — ' + (g.words || '')) + '</title></circle>');
        out.push('<text x="' + tx + '" y="' + (y - 3) + '">' + esc(clip(g.words || g.block || g.url, 40)) + '</text>');
        out.push('<text x="' + tx + '" y="' + (y + 11) + '" class="q-dim">' + esc(clip((g.block || '') + (g.addr ? ' ' + g.addr : ''), 40)) + '</text>');
      });
      out.push('<circle class="q-next" cx="' + X(0) + '" cy="' + Y(n) + '" r="6"/><text x="' + tx + '" y="' + (Y(n) + 4) + '" class="q-dim">next, untied</text>');
    }
    /* a group, not an image, where it holds a control: a role of img would hide the fold's button */
    return { folds: folds, svg: '<svg class="th-q' + (folds ? (all ? ' q-all' : ' q-folded') : '') + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="' + (folds ? 'group' : 'img') + '" aria-label="' +
      esc(label + ', drawn as a quipu pendant: ' + n + (th.tree ? ' addresses' : ' rungs') + (folds && !all ? ', the earlier ones folded' : '') + '.') + '">' + out.join('') + '</svg>' };
  }
  /* a project's threads as one quipu: the main cord across the top, each thread a pendant hanging
     from it; on a narrow screen the pendants wrap beneath one another. A pendant that folds is drawn
     folded and whole, and a tap on its fold swaps them (the fold, above) */
  function quipu(threads, opts) {
    opts = opts || {};
    var ps = (threads || []).filter(function (th) { return th.tree || (th.rungs && th.rungs.length); }).map(function (th) {
      var f = pendant(th, false);
      return f.folds ? '<div class="q-fold">' + f.svg + pendant(th, true).svg + '</div>' : f.svg;
    });
    if (!ps.length) return '';
    return '<div class="q-wrap">' + (opts.title ? '<div class="q-main"><span>' + esc(opts.title) + '</span></div>' : '<div class="q-main"></div>') +
      '<div class="q-pendants">' + ps.join('') + '</div></div>';
  }
  var LEGEND = '<p class="th-legend"><span><i class="lk"></i>a knot tied — its colour is the hand that tied it</span><span><i class="lo"></i>an option offered, not taken</span><span><i class="ln"></i>next, untied</span><span>⨯ a knot naming another thread\u2019s place</span></p>';
  /* a tap on an open option, for each hand the live end above it waits on: it says the option's words in
     the tapper's own mirror at the option's address, and puts that place in the room of the hand that
     offered it (function:thread 5) */
  function tapsHTML(n) {
    var p = n.parent;
    if (!p || n.taken || !p.live || !p.waits.length || !n.option) return '';
    var to = n.offerer || p.hands[0].who, text = n.option + ' · waits on ' + to;
    return ' ' + p.waits.map(function (w) {
      return '<button type="button" class="th-tap" data-at="' + esc(n.addr) + '" data-who="' + esc(w) + '" data-to="' + esc(to) + '" data-say="' + esc(text) + '" title="' +
        esc('says this in thread:' + w + ' at ' + n.addr + ', and puts thread:' + n.addr + ' in ' + to + '’s room: ' + text) + '">take this' + (p.waits.length > 1 ? ', as ' + esc(w) : '') + '</button>';
    }).join(' ') + '<span class="th-sn" aria-live="polite"></span>';
  }
  /* ── THE CORD (function:thread 8, drawn in words): the route one line, the ways not taken set aside ──
     A thread reads as one line: from its opening knot to its live end every act on the route stands at
     one indent, whole, joined by one cord; the options a knot offered and no one took lead off that knot
     as short faint ends, their words smaller and set in, never in the route's type; the options still
     open at a live end lead off it dashed and in full, with the tap that takes them; a second option
     taken beneath one knot is a fork, a cord of its own set in one step. The look is the page's (the
     tokens it keeps); the structure is the form's, the same on every page. */
  function partsOf(l) {
    var full = String(l.text || ''), body = bodyOf(full), reads = full.length > body.length ? full.slice(body.length + READS.length).trim() : '';
    var m = CLAUSE.exec(body), ending = '';
    if (m) { ending = m[0].replace(/^\s·\s/, '').trim(); body = body.slice(0, m.index); }
    return { words: said({ who: l.who, text: body.trim() }), ending: ending, reads: reads };
  }
  function cordHTML(t) {
    /* a knot passed shows its words alone (the knot after it answers its ending); the live end shows
       whom it waits on and what it read, which is where the work stands */
    function act(n, l) {
      var p = partsOf(l);
      return '<p class="th-act"><span class="th-kaddr">' + esc(n.addr) + '</span><b class="th-khand" style="color:' + handColour(l.who) + '">' + esc(l.who) + '</b> ' +
        esc(capFirst(p.words)) + (n.live && p.ending ? ' <span class="th-ending">' + esc(p.ending) + '</span>' : '') +
        (n.crosses && n.crosses.length ? ' <span class="th-cross">⨯ thread:' + esc(n.crosses[0]) + '</span>' : '') +
        (n.live && p.reads ? '<span class="th-reads">read: ' + esc(p.reads) + '</span>' : '') + '</p>';
    }
    function knot(n) {
      var hs = n.hands, c = hs.length ? handColour(hs[0].who) : '';
      var out = '<li class="th-k' + (n.live ? ' th-live' : '') + (hs.length ? '' : ' th-bare') + '"' + (c ? ' style="--th-hand:' + c + '"' : '') + '>';
      out += hs.length ? hs.map(function (l) { return act(n, l); }).join('')
        : '<p class="th-act th-quiet"><span class="th-kaddr">' + esc(n.addr) + '</span>' + esc(capFirst(n.option || 'taken up beneath')) + '</p>';
      var ends = n.kids.filter(function (k) { return !k.taken && k.option; });
      if (ends.length) out += '<ul class="th-ends' + (n.live ? ' th-open' : '') + '" aria-label="' + (n.live ? 'ways open now' : 'ways offered, not taken') + '">' +
        ends.map(function (k) { return '<li class="th-end"><span class="th-kaddr">' + esc(k.addr) + '</span>' + esc(capFirst(k.option)) + tapsHTML(k) + '</li>'; }).join('') + '</ul>';
      var on = n.kids.filter(function (k) { return k.taken; });
      on.slice(1).forEach(function (k) { out += '<ol class="th-cord th-fork" aria-label="a fork, from ' + esc(n.addr) + '">' + strand(k) + '</ol>'; });
      return { html: out + '</li>', next: on[0] || null };
    }
    /* a strand longer than nine knots folds its earlier straight runs into a line that opens (the fold, above) */
    function strand(n) {
      var ns = [], hs = [];
      while (n) { var r = knot(n); ns.push(n); hs.push(r.html); n = r.next; }
      return foldHTML(hs, foldRuns(ns, forksFrom), function (a, b) { return ns[a].addr + ' to ' + ns[b].addr; }, 'th-k', 'th-cord', 'knot');
    }
    return '<ol class="th-cord" aria-label="the route, knot by knot">' + strand(t) + '</ol>';
  }
  var CORD_KEY = '<p class="th-key"><span><i class="ck-on"></i>the way taken, each knot in the colour of the hand that tied it</span><span><i class="ck-off"></i>a way offered, not taken</span><span><i class="ck-open"></i>a way open now</span></p>';
  /* every knot, each option set in beneath the knot that offered it (function:thread 8): the old list,
     kept for a page that asks for it; a thread is drawn as its cord */
  function knotsHTML(th) {
    var out = [];
    (function rec(n) {
      var pad = n.depth ? ' style="margin-left:' + (n.depth * 1.1).toFixed(1) + 'rem"' : '';
      if (n.taken) n.hands.forEach(function (l) { out.push('<li' + pad + '><span class="th-addr">' + esc(n.addr) + '</span><span class="th-dot" style="background:' + handColour(l.who) + '"></span><span class="th-hand">' + esc(l.who) + '</span> · ' + esc(said(l)) + '</li>'); });
      else out.push('<li class="th-not"' + pad + '><span class="th-addr">' + esc(n.addr) + '</span>offered by ' + esc(n.offerer) + ', not taken · ' + esc(n.option) + tapsHTML(n) + '</li>');
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
        (t && t.lines.length ? cordHTML(t) + CORD_KEY
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
      (n ? '<ol class="th-rungs">' + foldHTML(th.rungs.map(function (r, i) { return rungHTML(r, i === n - 1); }), foldRuns(th.rungs), null, 'th-rung', 'th-rungs', 'rung') +
        '<li class="th-next"><span>the next rung, not yet tied</span></li></ol>'
        : '<p class="th-empty">Named in the law, its ladder not yet begun.</p>') +
    '</article>';
  }

  /* opts.step: only the threads serving that step, drawn small (the step's own section);
     opts.stepHref(addr): where a thread's step lives on this page; opts.empty: the words when none stand */
  var drawn = new WeakMap();
  function draw(el, family, opts) {
    opts = opts || {};
    style();
    if (!opts.step) { el.setAttribute('data-threads-family', family); drawn.set(el, opts); }
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

  /* what this page read is forgotten once a tap has written, so the next read is the beach's */
  function forget() { got = {}; reads = {}; indexP = null; }

  /* the places put in a hand's room, pool:<handle>: each thread:<address> an entry names, with the hand
     that put it there (an entry's 1); replies nested beneath an entry are read too */
  function roomPlaces(handle) {
    return get('pool:' + handle).then(function (room) {
      var out = [];
      (function rec(n) {
        if (!n || typeof n !== 'object') return;
        if (typeof n._ === 'string' && typeof n['1'] === 'string' && typeof n['3'] === 'string') {
          var m, re = new RegExp(PLACE.source, 'g');
          while ((m = re.exec(n._))) out.push({ place: m[2], by: n['1'].trim() });
        } else if (n._ && typeof n._ === 'object') rec(n._);
        for (var d = 1; d <= 9; d++) if (n[String(d)] && typeof n[String(d)] === 'object') rec(n[String(d)]);
      })(room);
      return out;
    }, function () { return []; });
  }
  function nodeAt(t, addr) { var hit = null; (function rec(x) { if (!hit) { if (x.addr === addr) hit = x; else x.kids.forEach(rec); } })(t); return hit; }
  /* a place put in a hand's room waits on that hand until one of its options is taken, or, where none
     was offered, until that hand ties a line at or beneath it (function:thread 3), as the battery's
     short.py reads a card */
  function stillWaits(x, holder, by) {
    if (x.kids.some(function (k) { return k.taken; })) return false;
    if (x.kids.some(function (k) { return k.lines.some(function (l) { return l.who === by; }); })) return true;
    var mine = false;
    (function rec(y) { if (y.lines.some(function (l) { return l.who === holder; })) mine = true; y.kids.forEach(rec); })(x);
    return !mine;
  }
  /* everything in the registry that waits on a hand, with the options still open beneath it: what a
     person's own page shows them (function:thread 5), whether or not a proposal's law names the thread —
     each live end whose ending names them, and each place in their room that still waits on them where the
     place's own lines carry no ending. A live end that waits on them from a day not yet come is not a card:
     the list's .later holds it, with its day, for a 'later' row */
  function waiting(handle, fresh) {
    if (fresh) forget();
    var places = roomPlaces(handle);
    return get('spine:thread').then(function (reg) {
      if (!reg || typeof reg !== 'object') return [];
      var floor = Math.max(1, floorOf(reg)), nums = [];
      (function rec(n, ds) {
        if (ds.length === floor) { if (textOf(n)) nums.push(ds.join('').replace(/^0+(?=\d)/, '')); return; }
        if (!n || typeof n !== 'object') return;
        if (ds.length < floor - 1 && n._ && typeof n._ === 'object') rec(n._, ds.concat('0'));   /* a supernested root keeps 1 to 9 at 01 to 09 */
        for (var d = 1; d <= 9; d++) if (n[String(d)] != null) rec(n[String(d)], ds.concat(String(d)));
      })(reg, []);
      return Promise.all(nums.map(function (num) { return readRegistry({ name: 'thread:' + num, registry: num, carries: '' }).catch(function () { return null; }); }));
    }).then(function (ths) {
      return places.then(function (ps) {
        var out = [], seen = {}, byNum = {}, today = new Date().toISOString().slice(0, 10);
        out.later = [];
        function card(th, x, from) {
          if (seen[th.registry + ' ' + x.addr]) return;
          seen[th.registry + ' ' + x.addr] = 1;
          (x.from > today ? out.later : out).push({ number: th.registry, line: th.line, end: x, from: from, day: x.from,
            options: x.kids.filter(function (k) { return !k.taken && k.option; }) });
        }
        (ths || []).forEach(function (th) {
          if (!th || !th.tree) return;
          byNum[th.registry] = th;
          (function rec(x) { if (x.live && x.waits.indexOf(handle) >= 0) card(th, x, ''); x.kids.forEach(rec); })(th.tree);
        });
        ps.forEach(function (p) {
          var th = byNum[p.place.split('.')[0]], x = th && nodeAt(th.tree, p.place);
          var ended = x && x.lines.some(function (l) { return closes(l.text); });   /* an ending holds the state; the room line was its doorbell */
          if (x && x.lines.length && !ended && stillWaits(x, handle, p.by)) card(th, x, p.by);
        });
        return out;
      });
    });
  }

  /* the place a person's choice makes, put in the room of the hand that offered it (function:thread 5):
     one append, as any hand may append to an open room, dated by the beach */
  function handOn(to, at, words, from) {
    if (!to) return Promise.resolve({ ok: false, error: 'no hand offered it' });
    words = bodyOf(words).replace(CLAUSE, '');   /* the room line rings; the ending stands in the thread */
    return fetch(BEACH, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block: 'pool:' + to, append: true, content: { _: 'thread:' + at + ' — ' + words, 1: from || '', 2: '' } }) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) { return r.ok ? { ok: true } : { ok: false, error: (b && b.error) || 'the beach answered ' + r.status }; });
      }, function (e) { return { ok: false, error: (e && e.message) || 'the beach could not be reached' }; });
  }

  /* a tap says the option in the tapper's own mirror, through the beach's voice, puts its place in the
     offerer's room, then draws again from the beach */
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('.th-tap') : null;
    if (!b || b.disabled) return;
    var host = b.closest('[data-threads-family]'), note = b.parentNode.querySelector('.th-sn');
    b.disabled = true; if (note) { note.className = 'th-sn'; note.textContent = 'saying…'; }
    (window.siteVoice ? window.siteVoice() : Promise.reject(new Error('the beach’s voice did not load'))).then(function (v) {
      return v.say({ field: 'thread', at: b.getAttribute('data-at'), text: b.getAttribute('data-say'), name: b.getAttribute('data-who') });
    }).then(function (r) {
      if (!r || !r.ok) { b.disabled = false; if (note) note.textContent = r && r.quiet ? '' : 'not said: ' + ((r && r.error) || 'the beach did not take it'); return; }
      var name = r.name || b.getAttribute('data-who'), to = b.getAttribute('data-to');
      return handOn(to, b.getAttribute('data-at'), b.getAttribute('data-say'), name).then(function (h) {
        if (note) note.textContent = (name !== b.getAttribute('data-who') ? 'said, as ' + name : 'said') + (h.ok ? '' : '; ' + to + '’s room was not told: ' + h.error);
        forget();
        if (host) draw(host, host.getAttribute('data-threads-family'), drawn.get(host) || {});
      });
    }, function (e) { b.disabled = false; if (note) note.textContent = 'not said: ' + ((e && e.message) || 'the beach could not be reached'); });
  });

  /* a tap or a key on a pendant's fold shows its earlier knots, and on 'fold them' tucks them away again: the
     reader's, stored nowhere, so the next drawing starts folded */
  function unfold(ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-th-unfold]') : null, w = b && b.closest('.q-fold');
    if (!w) return;
    if (ev.type === 'keydown') { if (ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); }
    var open = w.classList.toggle('q-unfolded'), to = w.querySelector((open ? '.q-all' : '.q-folded') + ' [data-th-unfold]');
    if (to && ev.type === 'keydown') to.focus();
  }
  document.addEventListener('click', unfold);
  document.addEventListener('keydown', unfold);

  window.beachThreads = { read: read, draw: draw, quipu: quipu, legend: LEGEND, cord: cordHTML, cordKey: CORD_KEY, style: style, parseRung: parseRung, parseThread: parseThread, linksIn: linksIn,
    waiting: waiting, handOn: handOn, forget: forget, waitsOn: waitsOn };

  function auto() {
    document.querySelectorAll('[data-threads]').forEach(function (el) {
      var fam = (el.getAttribute('data-threads') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (fam) draw(el, fam);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
