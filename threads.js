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
    var m = /^\s*([a-z0-9][a-z0-9-]*)\s*(?:[—–]\s*([\s\S]*))?$/i.exec(String(t || ''));
    if (!m) return null;
    var carries = (m[2] || '').trim(), step = '';
    var s = /\s*·\s*step\s+(\d+(?:\.\d+)?)\s*\.?\s*$/i.exec(carries);
    if (s) { step = s[1]; carries = carries.slice(0, s.index).trim(); }
    return { name: m[1].toLowerCase(), carries: carries, step: step };
  }
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

  /* every thread the family's law names, each ladder walked and every rung read where it stands */
  var reads = {};
  function read(family) {
    if (reads[family]) return reads[family];
    reads[family] = get('function:' + family).then(function (law) {
      var node = threadsNode(law), list = [];
      if (node && typeof node === 'object') for (var d = 1; d <= 9; d++) { var t = parseThread(textOf(node[String(d)])); if (t) list.push(t); }
      return Promise.all(list.map(function (th) {
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
    '.th-mini p{margin:0;font-size:0.95rem;overflow-wrap:anywhere}';
  function style() {
    if (document.getElementById('threads-css')) return;
    var s = document.createElement('style'); s.id = 'threads-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function clip(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; }
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
    var n = th.rungs.length;
    return '<article class="th" id="th-' + esc(th.name) + '">' +
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
          var last = th.rungs[th.rungs.length - 1];
          return '<p><a href="#th-' + esc(th.name) + '">' + esc(th.name) + '</a> · ' + th.rungs.length + (th.rungs.length === 1 ? ' rung' : ' rungs') +
            (last && last.words ? ', the latest: ' + esc(last.words) : '') + '</p>';
        }).join('') + '</div>' : '';
        return got;
      }
      el.innerHTML = list.length
        ? '<div class="th-list">' + list.map(function (th) { return threadHTML(th, opts); }).join('') + '</div>' +
          '<p class="th-foot">Each rung is an address on the beach where one act stands, read live where it was made; the keeper ties the next by its address. <a href="/explain?block=function:thread">How a thread works</a>.</p>'
        : '<p class="th-empty">' + (opts.empty || 'Nothing is tied yet. As the work begins, each piece of it is carried here as a thread: a ladder of addresses on the beach, each where one act stands — a build’s record, a working document, a live site — read live, so this page grows with the work.') +
          ' <a href="/explain?block=function:thread">How a thread works</a>.</p>';
      return got;
    }, function () {
      if (!opts.step) el.innerHTML = '<p class="th-empty">The threads couldn’t be read just now.</p>';
    });
  }

  window.beachThreads = { read: read, draw: draw, parseRung: parseRung, parseThread: parseThread, linksIn: linksIn };

  function auto() {
    document.querySelectorAll('[data-threads]').forEach(function (el) {
      var fam = (el.getAttribute('data-threads') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (fam) draw(el, fam);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
