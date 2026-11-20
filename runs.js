/*
 * runs.js — a family's runs, drawn where a page asks (20 Nov 2026, lane pscale.lab; David: "Show the most recent run,
 * and allow the user to dropdown the others ... clicking on the list of runs can show the history of runs by that LLM",
 * and of the o-page-unit showing what experiments find, "go for it").
 *
 * A run is a line in a runner's own mirror, <family>:<handle>, that opens RUN (its number or not) and a dash; the lines
 * beneath it that are not runs are its findings. A runner's runs stand side by side (run k at the step's address and
 * then k, as pscale-lab keeps them) or chained (each at the 1 beneath the one before, as health-check keeps them): this
 * reads either, and which a family uses is its law's to say. A run belongs to the deepest place on the spine at or above
 * it, so pscale-lab's runs at 1.11121 show at its lane, 1.1112, and health-check's at 1.11111 and 1.111111 at its step,
 * 1.11111. An answer at a decision is never a run, whatever word it opens with (pscale-lab's decisions take RUN).
 * Newest first: by the date the run's own line gives, then by when its runner's mirror was last touched, then by its
 * place in its runner's series.
 *
 *   beachRuns.of(mirrors, { spine, touched })   every run, newest first, each with .at, the place it belongs to
 *   beachRuns.draw(el, runs, { label })          the newest as a card, the rest in a dropdown, a chip per runner
 *                                                showing that runner's whole series there, newest first
 *
 * It reads nothing and writes nothing: the page hands it the mirrors and the spine it has read. It is drawn in the
 * tokens every page here keeps (--foam, --vapour-dim, --line, --line-strong, --liquid, --card, --mono, --display,
 * --body), with --bud for a run where the page keeps one, so it wears each page's palette.
 */
(function () {
  if (window.beachRuns) return;
  var RUN = /^RUN\b\s*(\d*)\s*[—–:-]/;
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  var DRAWN = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function textOf(n) { while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; } return typeof n === 'string' ? n.trim() : ''; }
  function nodeAt(b, ds) { var n = b; for (var i = 0; i < ds.length; i++) { if (!n || typeof n !== 'object') return undefined; n = n[ds.charAt(i)]; } return n; }
  function fmt(ds) { return ds.length > 1 ? ds.charAt(0) + '.' + ds.slice(1) : ds; }
  function cap(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function count(n) { return WORDS[n] || String(n); }
  function names(list) { list = list.slice().sort(); return list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0] || ''; }
  function dayOf(t) {
    var m = /\b(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\b/i.exec(t);
    return m ? Date.UTC(+m[3], MONTHS.indexOf(m[2].toLowerCase()), +m[1]) : 0;
  }
  /* a line's title before ' — ' when it is written in capitals, its body after */
  function split(t) {
    var i = t.indexOf(' — ');
    return i > 0 && !/[a-z]/.test(t.slice(0, i)) ? { title: t.slice(0, i), body: t.slice(i + 3) } : { title: '', body: t };
  }
  function belongs(ds, spine) { for (var i = ds.length; i > 0; i--) { var p = ds.slice(0, i); if (textOf(nodeAt(spine, p))) return p; } return ''; }
  function isDecision(ds, spine) { return /^DECIDE\b/i.test(textOf(nodeAt(spine, ds))); }

  function of(mirrors, opts) {
    opts = opts || {};
    var spine = opts.spine || {}, touched = opts.touched || {}, out = [];
    Object.keys(mirrors || {}).forEach(function (who) {
      var ord = 0, seq = {};
      (function walk(n, ds) {
        if (n == null) return;
        var head = textOf(n), m = ds && RUN.exec(head);
        if (m && !isDecision(ds, spine)) {
          var at = belongs(ds, spine), finds = [];
          seq[at] = (seq[at] || 0) + 1;
          if (typeof n === 'object') for (var j = 1; j <= 9; j++) { var f = textOf(n[String(j)]); if (f && !RUN.test(f)) finds.push(f); }
          out.push({ who: who, ds: ds, addr: fmt(ds), at: fmt(at), n: +m[1] || seq[at], ord: ++ord, head: head, finds: finds, day: dayOf(head), touched: String(touched[who] || '') });
        }
        if (typeof n === 'object') for (var k = 1; k <= 9; k++) if (n[String(k)] != null) walk(n[String(k)], ds + String(k));
      })(mirrors[who], '');
    });
    return out.sort(function (a, b) {
      return (b.day - a.day) || (a.who === b.who ? b.ord - a.ord : b.touched.localeCompare(a.touched)) || a.who.localeCompare(b.who);
    });
  }

  /* a finding's words, its tables drawn as tables: a line 'Table — what it shows', then markdown rows */
  function rich(t) {
    var lines = String(t || '').split('\n'), html = '', i = 0;
    while (i < lines.length) {
      var l = lines[i];
      if (/^\s*\|/.test(l)) {
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        html += table(rows);
        continue;
      }
      if (/^Table\b[^—–-]*[—–-]/.test(l)) html += '<p class="br-cap">' + esc(l.replace(/^Table\b[^—–-]*[—–-]\s*/, '')) + '</p>';
      else if (l.trim()) html += '<p>' + esc(l) + '</p>';
      i++;
    }
    return html;
  }
  function table(rows) {
    var cells = rows.map(function (r) { return r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); })
      .filter(function (c) { return !c.every(function (x) { return /^:?-{2,}:?$/.test(x) || x === ''; }); });
    if (!cells.length) return '';
    var head = cells.shift();
    return '<div class="br-table" tabindex="0" role="region" aria-label="Table"><table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cells.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function gist(t, n) {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    var cut = t.slice(0, n), sp = cut.lastIndexOf(' ');
    return cut.slice(0, sp > n / 2 ? sp : n).replace(/[,;:\s]+$/, '') + '…';
  }
  function title(r) {
    var s = split(r.head), t = s.title ? cap(s.title.toLowerCase()) : 'Run';
    if (!/\d/.test(t)) t += ' ' + r.n;
    return esc(t);
  }
  function findings(r) {
    if (!r.finds.length) return '';
    return '<div class="br-finds">' + r.finds.map(function (f) {
      var s = split(f), body = cap(s.body);
      if (body.length <= 320 && body.indexOf('\n') < 0) return '<div class="br-find"><b>' + esc(s.title) + '</b><span>' + esc(body) + '</span></div>';
      return '<details class="br-find br-long"><summary><b>' + esc(s.title || 'More') + '</b><span>' + esc(gist(body.split('\n')[0], 150)) + '</span></summary><div class="br-rich">' + rich(body) + '</div></details>';
    }).join('') + '</div>';
  }
  function where(r) { return esc(r.who) + '’s mirror, at ' + esc(r.addr); }
  function card(r) {
    return '<article class="br-card"><div class="br-h"><span class="br-tag">Newest</span><span class="br-n">' + title(r) + '</span><span class="br-who">' + esc(r.who) + '</span></div>' +
      '<p class="br-line">' + esc(cap(split(r.head).body)) + '</p>' + findings(r) + '<p class="br-where">' + where(r) + '</p></article>';
  }
  function item(r, newest) {
    return '<details class="br-item"><summary><span class="br-n">' + title(r) + '</span><span class="br-who">' + esc(r.who) + '</span>' +
      (r === newest ? '<span class="br-tag">newest, above</span>' : '') + '<span class="br-gist">' + esc(gist(cap(split(r.head).body), 140)) + '</span></summary>' +
      '<div class="br-body"><p class="br-line">' + esc(cap(split(r.head).body)) + '</p>' + findings(r) + '<p class="br-where">' + where(r) + '</p></div></details>';
  }

  function draw(el, runs, opts) {
    if (!el) return;
    opts = opts || {};
    css();
    runs = runs || [];
    var sig = runs.map(function (r) { return r.who + '@' + r.ds + ':' + r.head.length + '/' + r.finds.join('').length; }).join('|') + '#' + (opts.label || '');
    if (el.getAttribute('data-runs-sig') === sig) return;   /* nothing new: an open dropdown stays open */
    el.setAttribute('data-runs-sig', sig);
    if (!runs.length) { el.innerHTML = ''; return; }
    var newest = runs[0], earlier = runs.slice(1), hands = [], n = {}, by = [];
    runs.forEach(function (r) { if (!n[r.who]) hands.push(r.who); n[r.who] = (n[r.who] || 0) + 1; });
    earlier.forEach(function (r) { if (by.indexOf(r.who) < 0) by.push(r.who); });
    var id = 'br-' + (++DRAWN);
    el.innerHTML = '<div class="br">' + (opts.label ? '<p class="br-label">' + esc(opts.label) + '</p>' : '') + card(newest) +
      (earlier.length ? '<details class="br-earlier"><summary>' + (earlier.length === 1 ? 'One earlier run' : cap(count(earlier.length)) + ' earlier runs') + ', by ' + esc(names(by)) + '</summary>' +
        '<div class="br-whose" role="group" aria-label="Whose runs to show"><button type="button" data-who="" aria-pressed="true">Everyone</button>' +
        hands.map(function (h) { return '<button type="button" data-who="' + esc(h) + '" aria-pressed="false" aria-label="' + esc(h) + '’s runs here, ' + n[h] + '">' + esc(h) + ' <span>' + n[h] + '</span></button>'; }).join('') +
        '</div><div class="br-hist" id="' + id + '"></div></details>' : '') + '</div>';
    var whose = n[el._brWho] ? el._brWho : '';
    function history() {
      var box = el.querySelector('.br-hist'); if (!box) return;
      var shown = whose ? runs.filter(function (r) { return r.who === whose; }) : earlier;
      Array.prototype.forEach.call(el.querySelectorAll('.br-whose button'), function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-who') || '') === whose)); });
      box.innerHTML = '<p class="br-note">' + (whose ? esc(whose) + '’s ' + (shown.length === 1 ? 'one run' : count(shown.length) + ' runs') + ' here, newest first.' : 'Everyone’s earlier runs, newest first.') + '</p>' +
        shown.map(function (r) { return item(r, newest); }).join('');
    }
    Array.prototype.forEach.call(el.querySelectorAll('.br-whose button'), function (b) {
      b.addEventListener('click', function () { whose = el._brWho = b.getAttribute('data-who') || ''; history(); });
    });
    history();
  }

  var STYLED = false;
  function css() {
    if (STYLED) return;
    STYLED = true;
    var s = document.createElement('style');
    s.setAttribute('data-runs', '');
    s.textContent = '' +
      '.br{margin:1rem 0 0.4rem;display:grid;gap:0.6rem;min-width:0}' +
      '.br>*,.br-finds>*,.br-rich,.br-body{min-width:0}' +
      '.br-label{font-family:var(--mono);font-size:0.74rem;letter-spacing:0.04em;color:var(--vapour-dim);margin:0}' +
      '.br-card{border:1px solid var(--bud,var(--liquid));border-radius:12px;background:var(--card);padding:0.8rem 0.95rem;min-width:0}' +
      '.br-h{display:flex;flex-wrap:wrap;gap:0.3rem 0.55rem;align-items:baseline}' +
      '.br-n{font-family:var(--display);font-weight:700;font-size:1.02rem;color:var(--foam)}' +
      '.br-who{font-family:var(--mono);font-size:0.78rem;color:var(--bud,var(--liquid))}' +
      '.br-tag{font-family:var(--mono);font-size:0.62rem;letter-spacing:0.08em;text-transform:uppercase;color:var(--bud,var(--liquid));border:1px solid var(--bud,var(--liquid));border-radius:999px;padding:0 0.45rem}' +
      '.br-line{margin:0.4rem 0;color:var(--foam);overflow-wrap:anywhere}' +
      '.br-finds{display:grid;gap:0.35rem;margin:0.3rem 0}' +
      '.br-find{display:grid;grid-template-columns:7.5em minmax(0,1fr);gap:0.6rem;font-size:0.92rem;line-height:1.45}' +
      '.br-find b,.br-find summary b{font-family:var(--mono);font-size:0.7rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--bud,var(--liquid));padding-top:0.15rem;overflow-wrap:anywhere}' +
      '.br-find span{color:var(--foam);overflow-wrap:anywhere}' +
      'details.br-long{display:block}' +
      'details.br-long>summary{cursor:pointer;list-style:none;display:grid;grid-template-columns:7.5em minmax(0,1fr);gap:0.6rem}' +
      'details.br-long>summary::-webkit-details-marker{display:none}' +
      'details.br-long>summary span{color:var(--vapour-dim)}' +
      'details.br-long>summary span::after{content:" +";font-family:var(--mono);color:var(--bud,var(--liquid))}' +
      'details.br-long[open]>summary span::after{content:" –"}' +
      '.br-rich{padding:0.3rem 0 0.2rem;min-width:0}' +
      '.br-rich p{margin:0.35rem 0;overflow-wrap:anywhere;color:var(--foam)}' +
      '.br-rich .br-cap{font-family:var(--mono);font-size:0.78rem;color:var(--vapour-dim);margin-top:0.7rem}' +
      '.br-table{overflow-x:auto;margin:0.2rem 0 0.5rem}' +
      '.br-table table{border-collapse:collapse;font-size:0.84rem;min-width:24rem}' +
      '.br-table th,.br-table td{border-bottom:1px solid var(--line);padding:0.3rem 0.5rem;text-align:left;vertical-align:top}' +
      '.br-table th{color:var(--vapour-dim);font-weight:600}' +
      '.br-where{font-family:var(--mono);font-size:0.72rem;color:var(--vapour-dim);margin:0.45rem 0 0}' +
      'details.br-earlier{border:1px solid var(--line-strong);border-radius:12px;padding:0 0.95rem;min-width:0}' +
      'details.br-earlier>summary{cursor:pointer;list-style:none;display:flex;gap:0.6rem;align-items:baseline;padding:0.65rem 0;font-weight:600;color:var(--foam)}' +
      'details.br-earlier>summary::-webkit-details-marker,details.br-item>summary::-webkit-details-marker{display:none}' +
      'details.br-earlier>summary::before,details.br-item>summary::before{content:"+";font-family:var(--mono);color:var(--vapour-dim);width:1ch;flex:none}' +
      'details.br-earlier[open]>summary::before,details.br-item[open]>summary::before{content:"–"}' +
      'details.br-earlier[open]>summary{border-bottom:1px dashed var(--line-strong);margin-bottom:0.6rem}' +
      '.br-whose{display:flex;flex-wrap:wrap;gap:0.35rem;margin:0 0 0.5rem}' +
      '.br-whose button{font-family:var(--mono);font-size:0.8rem;padding:0.4rem 0.75rem;min-height:36px;border-radius:999px;border:1px solid var(--line-strong);background:transparent;color:var(--foam);cursor:pointer}' +
      '.br-whose button span{opacity:0.75}' +
      '.br-whose button[aria-pressed="true"]{border-color:var(--bud,var(--liquid));color:var(--bud,var(--liquid))}' +
      '.br-note{font-size:0.84rem;color:var(--vapour-dim);margin:0 0 0.25rem}' +
      'details.br-item{border-top:1px dashed var(--line);padding:0.5rem 0}' +
      'details.br-item>summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;align-items:baseline;gap:0.15rem 0.55rem}' +
      'details.br-item .br-n{font-size:0.94rem}' +
      'details.br-item .br-gist{flex-basis:100%;padding-left:calc(1ch + 0.55rem);font-size:0.88rem;line-height:1.45;color:var(--vapour-dim);overflow-wrap:anywhere}' +
      '.br-body{padding:0.3rem 0 0.2rem calc(1ch + 0.55rem);min-width:0}' +
      '@media (max-width:560px){.br-find,details.br-long>summary{grid-template-columns:1fr;gap:0.05rem}.br-body{padding-left:0}}';
    document.head.appendChild(s);
  }

  window.beachRuns = { of: of, draw: draw };
})();
