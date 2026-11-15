/* door.js — WITH YOUR AI: the door every page a person is handed carries
 * (spine:o-page-unit 1.1 and its side-rooms 1.12 to 1.14; David's GO at 1.18, 15 November 2026;
 * thread:41). theme.js lays the button and fetches this file on the first tap, never before, so a
 * page that is never asked costs nothing.
 *
 * One sheet over the page, never away from it, holding three things: how to add the beach to the
 * reader's own AI, in Claude's own menu steps (the open connector for a stranger, the one that keeps
 * the key hidden where this device already knows a name); a first message to paste, written for this
 * page, its family, its kind and the place the reader has reached in it; and /connect for the rest.
 * The message names ways:reader, the one reader's way every page hands over (keel's CHANGE at 1.18).
 *
 * It reads one block, the family's law, to learn the kind (its 1 the mode, its 7 the phase), and
 * writes nothing anywhere. The door wears a look of its own in every page's light and dark, so a
 * person who has met it once knows it on every page (keel at 1.8: fixed places, fixed names). */
(function () {
  'use strict';
  if (window.siteDoor) return;

  var BEACH = (document.documentElement.getAttribute('data-beach') || 'https://beach.happyseaurchin.com').replace(/\/+$/, '');
  var OPEN = 'https://bsp.hermitcrab.me/mcp/v1', HIDDEN = OPEN + '/me';
  var DOOR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3.5 21h17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="14.6" cy="12.4" r="1.25" fill="currentColor"/></svg>';

  /* ── what the page is ─────────────────────────────────────────────────────────────────── */
  function slug(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, ''); }
  function familyOf() {
    if (typeof window.siteDoorFamily === 'function') return window.siteDoorFamily();
    var h = document.documentElement;
    if (h.getAttribute('data-family')) return { name: slug(h.getAttribute('data-family')) };
    if (h.getAttribute('data-proposal')) return { name: slug(h.getAttribute('data-proposal')) };
    return null;
  }
  function who() {
    try { return String(localStorage.getItem('render:who') || '').replace(/[^A-Za-z0-9_-]/g, ''); } catch (e) { return ''; }
  }
  function voice(x) { return typeof x === 'string' ? x : x && typeof x._ === 'string' ? x._ : ''; }

  /* THE KIND, read off the family's law: its 7 the phase, its 1 the mode (spine:o-page-unit 1.1111) */
  var kinds = {};
  function kindOf(fam) {
    if (!fam) return Promise.resolve('');
    if (kinds[fam.name] !== undefined) return Promise.resolve(kinds[fam.name]);
    var url = BEACH + '/.well-known/pscale-beach?block=' + encodeURIComponent('function:' + fam.name);
    return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (law) {
        var phase = (/^\s*phase:\s*([a-z][a-z -]*?)(?:\s+[—–-]\s|\s*$)/i.exec(voice(law && law['7'])) || [])[1] || '';
        var mode = (/^\s*mode:\s*([a-z][a-z0-9-]*)/i.exec(voice(law && law['1'])) || [])[1] || '';
        phase = phase.toLowerCase().trim(); mode = mode.toLowerCase();
        var k = phase === 'walk' ? 'recipe' : phase === 'set aside' ? 'set aside' : phase
          || ({ meeting: 'meeting', schematic: 'schematic', experience: 'premiere', game: 'game', document: 'document' })[mode]
          || fam.kind || '';
        kinds[fam.name] = k;
        return k;
      })
      .catch(function () { return fam.kind || ''; });
  }

  /* WHERE THE READER IS: the part whose top has passed two fifths of the screen, read from the
   * addresses the page already marks (a step's section, a part's data-at, a title drawn from the
   * spine). A step down 1 (1, 1.1, 1.11 …) is told as 'step n of N'. */
  var ADDR = /^\d+(\.\d+)?$/;
  function marked() {
    var out = [], seen = {};
    var els = document.querySelectorAll('section[data-step],section[data-at],.item[data-at],[data-sp][data-part="title"]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], a = el.getAttribute('data-step') || el.getAttribute('data-at') || el.getAttribute('data-sp') || '';
      if (!ADDR.test(a)) continue;
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      out.push({ addr: a, el: el, top: r.top });
      if (/^1(\.1+)?$/.test(a)) seen[a] = 1;
    }
    var steps = Object.keys(seen).sort(function (x, y) { return x.length - y.length; });
    return { all: out, steps: steps };
  }
  /* a part's title, the best a page offers, in that order (never whatever comes first in the page:
   * a step's address label stands before its heading) */
  var TITLES = ['[data-part="title"]', 'h2', 'h3', '.head .t', '.head', 'h4', 'summary', 'strong', 'b'];
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim().replace(/^\d+(\.\d+)?\s+/, '').replace(/\s+\d+(\.\d+)?$/, ''); }
  function titleOf(el) {
    if (el.matches && el.matches('[data-part="title"]')) return clean(el.textContent).slice(0, 80);
    for (var i = 0; i < TITLES.length; i++) {
      var t = el.querySelector(TITLES[i]), s = t ? clean(t.textContent) : '';
      if (s && !ADDR.test(s)) return s.slice(0, 80);
    }
    return '';
  }
  function markAt(m, addr) {
    for (var i = 0; i < m.all.length; i++) if (m.all[i].addr === addr) return m.all[i];
    return null;
  }
  /* the step a part stands in: the longest step down 1 whose digits begin the part's own */
  function stepOf(m, addr) {
    var d = addr.replace('.', ''), best = '';
    for (var i = 0; i < m.steps.length; i++) {
      var s = m.steps[i].replace('.', '');
      if (d.indexOf(s) === 0 && s.length > best.replace('.', '').length) best = m.steps[i];
    }
    return best;
  }
  function placeOf(m, addr) {
    var pick = addr ? markAt(m, addr) : null, line = window.innerHeight * 0.4;
    if (!pick) { for (var j = 0; j < m.all.length; j++) if (m.all[j].top <= line) pick = m.all[j]; }
    if (!pick) pick = m.all[0] || null;
    if (!pick) return null;
    var title = titleOf(pick.el), step = m.steps.length > 1 ? stepOf(m, pick.addr) : '';
    var n = m.steps.indexOf(step), stepped = step ? markAt(m, step) : null, stepTitle = stepped ? titleOf(stepped.el) : '';
    var said;
    if (step && step === pick.addr) said = 'step ' + (n + 1) + ' of ' + m.steps.length + (title ? ', ' + lower(title) : '');
    else if (step) said = 'step ' + (n + 1) + ' of ' + m.steps.length + (stepTitle ? ', ' + lower(stepTitle) : '') +
      ', in its part ' + (title ? lower(title) + ' ' : '') + '(' + pick.addr + ')';
    else said = (title ? lower(title) + ' ' : 'the part ') + '(' + pick.addr + ')';
    return { addr: pick.addr, step: step, said: said };
  }
  /* a title set mid-sentence: its first letter lowered, unless its first word is an acronym (AI, SALT) */
  function lower(t) { return t && /^[A-Z]([a-z']|\s)/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; }

  /* THE FIRST MESSAGE, written by the page from what it knows (spine:o-page-unit 1.12) */
  var NOUN = {
    proposal: 'the proposal', inquiry: 'the inquiry', recipe: 'the recipe', project: 'the project',
    complete: 'the finished proposal', 'set aside': 'the set-aside proposal', meeting: 'the meeting',
    schematic: 'the schematic', document: 'the document', premiere: 'the premiere', game: 'the game'
  };
  var ASK = {
    proposal: 'Take me through it from there, then help me answer its decisions',
    project: 'Tell me where it stands and what is waiting, then help me answer what is still open',
    complete: 'Tell me what it did and where it ended',
    inquiry: 'Take me through it from there, then help me answer its questions',
    recipe: 'Ask me where I am, then take me through the next step',
    meeting: 'Tell me what was said and what comes next, then help me answer it',
    schematic: 'Explain this part and how it fits the whole, then help me comment where it does not fit',
    premiere: 'Tell me what it is and how to take part'
  };
  /* the page's public address: its canonical where it names one, so a preview or a local copy
   * still hands the reader's AI the page as everyone else finds it */
  function pageUrl() {
    var c = document.querySelector('link[rel="canonical"]'), o = document.querySelector('meta[property="og:url"]');
    var href = (c && c.getAttribute('href')) || (o && o.getAttribute('content')) || '';
    try { if (href) { var u = new URL(href, location.href); return u.host + u.pathname.replace(/\/+$/, ''); } } catch (e) {}
    var host = /(^|\.)happyseaurchin\.com$/.test(location.hostname) ? location.host : 'happyseaurchin.com';
    return host + location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
  }
  function message(fam, kind, place, me) {
    var url = pageUrl();
    if (!fam) {
      return "I'm on " + url + ', a page of the beach at ' + BEACH.replace(/^https?:\/\//, '') +
        '. Use the beach connector to read what it shows, and help me with it' + (me ? ' as ' + me : '') + '.';
    }
    var host = BEACH.replace(/^https?:\/\//, ''), way = kind === 'recipe' ? 'ways:recipe' : 'ways:reader';
    var out = "I'm reading " + (NOUN[kind] || 'the page') + ' ' + fam.name + ' at ' + url + '. ' +
      'Use the beach connector: its text is spine:' + fam.name + ' and its law function:' + fam.name + ' at ' + host +
      ', and ' + way + ' says how to help me with it. Without a connector, read it at ' + BEACH +
      '/.well-known/pscale-beach?block=spine:' + fam.name + '. ';
    if (place) out += "I've reached " + place.said + '. ';
    out += (ASK[kind] || 'Take me through it from there, then help me answer it') +
      (me ? ', in my own reading, ' + fam.name + ':' + me + '.' : "; help me draft my answers and I'll give them on the page.");
    return out;
  }

  /* ── the sheet ────────────────────────────────────────────────────────────────────────── */
  var CSS =
    '.aid-back{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;padding:16px;' +
      'background:rgba(12,9,24,.56);--aid-bg:#fbfaf7;--aid-card:#fff;--aid-ink:#1d1b22;--aid-ink2:#545061;--aid-rule:rgba(29,27,34,.14);' +
      '--aid-acc:#5b3fcf;--aid-acc-ink:#fff;--aid-soft:rgba(91,63,207,.09);' +
      'font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--aid-ink);text-align:left}' +
    'html[data-theme="dark"] .aid-back{background:rgba(0,0,0,.62);--aid-bg:#17151e;--aid-card:#201d29;--aid-ink:#f1eef7;--aid-ink2:#b9b3c7;' +
      '--aid-rule:rgba(241,238,247,.16);--aid-acc:#ab98ff;--aid-acc-ink:#17151e;--aid-soft:rgba(171,152,255,.13)}' +
    '.aid-back[hidden]{display:none}' +
    '.aid-sheet{position:relative;width:min(580px,100%);max-height:min(88vh,860px);overflow:auto;-webkit-overflow-scrolling:touch;' +
      'background:var(--aid-bg);border:1px solid var(--aid-rule);border-radius:18px;padding:20px 20px 22px;box-shadow:0 18px 60px rgba(10,6,30,.35)}' +
    '@media (max-width:640px){.aid-back{align-items:flex-end;padding:0}.aid-sheet{width:100%;max-height:90vh;border-radius:18px 18px 0 0;' +
      'padding:18px 16px calc(22px + env(safe-area-inset-bottom))}}' +
    '@media (prefers-reduced-motion:no-preference){.aid-back.in .aid-sheet{animation:aid-rise .3s cubic-bezier(.3,.7,.2,1)}}' +
    '@keyframes aid-rise{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}' +
    '.aid-sheet *{box-sizing:border-box}' +
    '.aid-x{position:absolute;top:12px;right:12px;width:38px;height:38px;border-radius:50%;border:1px solid var(--aid-rule);' +
      'background:var(--aid-card);color:var(--aid-ink);cursor:pointer;font-size:19px;line-height:1}' +
    '.aid-k{margin:0;font:600 11.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.09em;text-transform:uppercase;color:var(--aid-acc)}' +
    '.aid-h{margin:3px 46px 8px 0;font:700 27px/1.1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;align-items:center;gap:10px;color:var(--aid-ink)}' +
    '.aid-h svg{width:30px;height:30px;flex:none;color:var(--aid-acc)}' +
    '.aid-lede{margin:0 0 12px;color:var(--aid-ink2);font-size:14.5px}' +
    '.aid-where{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;border-radius:12px;background:var(--aid-soft);margin:0 0 14px;font-size:14.5px}' +
    '.aid-where p{margin:0;flex:1 1 220px}' +
    '.aid-where[hidden]{display:none}' +
    '.aid-chips{display:inline-flex;flex-wrap:wrap;gap:4px}' +
    '.aid-chips button{min-width:30px;height:28px;border:1px solid var(--aid-rule);border-radius:8px;cursor:pointer;background:var(--aid-card);' +
      'color:var(--aid-ink);font:700 12.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:0 7px}' +
    '.aid-chips button[aria-pressed="true"]{background:var(--aid-acc);color:var(--aid-acc-ink);border-color:var(--aid-acc)}' +
    '.aid-steps{list-style:none;margin:0;padding:0;display:grid;gap:12px}' +
    '.aid-steps>li{border:1px solid var(--aid-rule);border-radius:14px;padding:12px 14px;background:var(--aid-card)}' +
    '.aid-steps h3{margin:0 0 8px;font:700 16px/1.3 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;align-items:center;gap:9px;color:var(--aid-ink)}' +
    '.aid-n{flex:none;width:24px;height:24px;border-radius:50%;display:inline-grid;place-items:center;background:var(--aid-acc);color:var(--aid-acc-ink);' +
      'font:700 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace}' +
    '.aid-conn{display:inline-flex;flex-wrap:wrap;border:1px solid var(--aid-rule);border-radius:999px;padding:3px;gap:2px;margin:0 0 10px}' +
    '.aid-conn button{border:0;background:none;border-radius:999px;padding:6px 12px;font:600 13px/1.2 inherit;font-family:inherit;cursor:pointer;color:var(--aid-ink2)}' +
    '.aid-conn button[aria-selected="true"]{background:var(--aid-ink);color:var(--aid-bg)}' +
    '.aid-cst{margin:0 0 8px;padding-left:1.3em;display:grid;gap:6px;font-size:14px}' +
    '.aid-url{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:4px}' +
    '.aid-url code{background:var(--aid-bg);border:1px solid var(--aid-rule);border-radius:8px;padding:3px 8px;font:12.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere;color:var(--aid-ink)}' +
    '.aid-mini,.aid-btn{border:1px solid var(--aid-rule);background:var(--aid-card);color:var(--aid-ink);border-radius:999px;padding:4px 11px;font:600 12.5px/1.3 inherit;font-family:inherit;cursor:pointer}' +
    '.aid-btn{background:var(--aid-acc);color:var(--aid-acc-ink);border-color:var(--aid-acc);padding:8px 14px;font-size:14px}' +
    '.aid-linkish{border:0;background:none;padding:0;color:var(--aid-acc);text-decoration:underline;cursor:pointer;font:inherit}' +
    '.aid-small{margin:6px 0 0;color:var(--aid-ink2);font-size:13.5px}' +
    '.aid-small a,.aid-cst a{color:var(--aid-acc)}' +
    '.aid-msg{display:block;width:100%;min-height:118px;margin-top:6px;border-radius:10px;border:1px solid var(--aid-rule);background:var(--aid-bg);color:var(--aid-ink);' +
      'padding:10px;font:12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical}' +
    '.aid-row{margin:8px 0 0;display:flex;flex-wrap:wrap;align-items:center;gap:8px}' +
    'html.aid-open{overflow:hidden}';

  var HTML =
    '<div class="aid-sheet" role="dialog" aria-modal="true" aria-labelledby="aid-h">' +
    '<button type="button" class="aid-x" aria-label="Close, back to where you were">×</button>' +
    '<p class="aid-k">this page’s door</p>' +
    '<h2 class="aid-h" id="aid-h">' + DOOR_SVG + 'With your AI</h2>' +
    '<p class="aid-lede">Bring your own AI to this page: add the beach to it once, then paste a first message written for where you are. It opens over the page, so you keep your place.</p>' +
    '<div class="aid-where"><p>You are at <b class="aid-at">the start</b>.</p><span class="aid-chips" role="group" aria-label="Start from another step"></span></div>' +
    '<ol class="aid-steps">' +
    '<li><h3><span class="aid-n">1</span>Add the beach to your AI</h3>' +
      '<div class="aid-conn" role="tablist" aria-label="Which connector">' +
        '<button type="button" role="tab" data-conn="open" aria-selected="true">The open one</button>' +
        '<button type="button" role="tab" data-conn="hidden" aria-selected="false">Your key hidden</button></div>' +
      '<div data-pan="open" role="tabpanel"><ol class="aid-cst">' +
        '<li>Copy this address:<span class="aid-url"><code>' + OPEN + '</code><button type="button" class="aid-mini" data-copy="' + OPEN + '">Copy</button></span></li>' +
        '<li>In Claude, open <b>Customize → Connectors</b>. <a href="https://claude.ai/customize/connectors" target="_blank" rel="noopener">Open Claude’s connectors ↗</a></li>' +
        '<li>Press <b>+ Add</b>, then <b>Add custom connector</b>.</li>' +
        '<li>Name it <b>beach</b>, paste the address as its URL, and press <b>Add</b>. If Claude asks how to connect, choose <b>No sign in</b>.</li></ol>' +
        '<p class="aid-small">Your AI reads the beach straight away. When it writes as you, it asks for your key in the chat; to keep your key out of the chat, use <button type="button" class="aid-linkish" data-conn="hidden">your key hidden</button>.</p></div>' +
      '<div data-pan="hidden" role="tabpanel" hidden><ol class="aid-cst">' +
        '<li>Copy this address:<span class="aid-url"><code>' + HIDDEN + '</code><button type="button" class="aid-mini" data-copy="' + HIDDEN + '">Copy</button></span></li>' +
        '<li>In Claude, open <b>Customize → Connectors</b>. <a href="https://claude.ai/customize/connectors" target="_blank" rel="noopener">Open Claude’s connectors ↗</a></li>' +
        '<li>Press <b>+ Add</b>, then <b>Add custom connector</b>.</li>' +
        '<li>Name it <b>beach</b>, paste the address as its URL, then press <b>Continue</b> and <b>Add</b>. Leave the connection settings as Claude fills them in.</li>' +
        '<li>Press <b>Connect</b> beside beach. A page from bsp-mcp opens: check that its address starts <b>bsp.hermitcrab.me</b>, type your handle and your key, and press <b>Hide my key</b>. That page is the only place your key is typed.</li></ol>' +
        '<p class="aid-small">Your AI then writes as you and never sees your key. No handle yet? Make one at <a href="/connect#medium">happyseaurchin.com/connect</a>.</p></div>' +
      '<p class="aid-small aid-who"></p></li>' +
    '<li><h3><span class="aid-n">2</span>Paste this first message</h3>' +
      '<p class="aid-small">Start a new chat and paste it. The page wrote it for where you are, and it works with the beach connector or without.</p>' +
      '<textarea class="aid-msg" readonly aria-label="The first message for your AI"></textarea>' +
      '<p class="aid-row"><button type="button" class="aid-btn" data-copy-msg>Copy the message</button> <span class="aid-small aid-copied" aria-live="polite"></span></p></li>' +
    '<li><h3><span class="aid-n">3</span>Everything else</h3>' +
      '<p class="aid-small" style="margin:0">ChatGPT and other AIs, Claude Code, an agent of your own, and what to do when something goes wrong: <a href="/connect">happyseaurchin.com/connect</a></p></li>' +
    '</ol></div>';

  var back = null, opener = null, state = { fam: null, kind: '', place: null, marks: null, me: '' };
  function $(sel) { return back.querySelector(sel); }
  function build() {
    if (back) return;
    var st = document.createElement('style');
    st.setAttribute('data-ai-door-style', '');
    st.textContent = CSS;
    document.head.appendChild(st);
    back = document.createElement('div');
    back.className = 'aid-back';
    back.hidden = true;
    back.innerHTML = HTML;
    document.body.appendChild(back);
    $('.aid-x').addEventListener('click', close);
    back.addEventListener('click', function (e) {
      if (e.target === back) return close();
      var c = e.target.closest('[data-conn]');
      if (c) return showConn(c.getAttribute('data-conn'));
      var cp = e.target.closest('[data-copy]');
      if (cp) return copy(cp.getAttribute('data-copy'), cp);
      if (e.target.closest('[data-copy-msg]')) return copy($('.aid-msg').value, null, $('.aid-copied'));
      var ch = e.target.closest('[data-at]');
      if (ch && ch.parentNode && ch.parentNode.classList.contains('aid-chips')) {
        state.place = placeOf(state.marks, ch.getAttribute('data-at'));
        paint();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (!back || back.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(back.querySelectorAll('button,a[href],textarea')).filter(function (x) { return x.offsetParent !== null && !x.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  function showConn(c) {
    [].forEach.call(back.querySelectorAll('.aid-conn [data-conn]'), function (t) {
      var on = t.getAttribute('data-conn') === c;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
    });
    [].forEach.call(back.querySelectorAll('[data-pan]'), function (p) { p.hidden = p.getAttribute('data-pan') !== c; });
  }
  function copy(text, btn, said) {
    function done(ok) {
      if (said) said.textContent = ok ? 'Copied. Paste it into a new chat with your AI.' : 'Select the text above and copy it.';
      if (btn) { var was = btn.textContent; btn.textContent = ok ? 'Copied' : 'Select it'; setTimeout(function () { btn.textContent = was; }, 1600); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      back.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove(); done(ok);
    }
  }
  function paint() {
    var w = $('.aid-where'), chips = $('.aid-chips'), steps = (state.marks && state.marks.steps) || [];
    w.hidden = !state.place;
    if (state.place) $('.aid-at').textContent = state.place.said;
    chips.innerHTML = steps.length > 1 && steps.length <= 12
      ? steps.map(function (a, i) {
          var on = !!state.place && (state.place.addr === a || state.place.step === a);
          return '<button type="button" data-at="' + a + '" aria-pressed="' + String(on) + '" aria-label="Start from step ' + (i + 1) + '">' + (i + 1) + '</button>';
        }).join('')
      : '';
    $('.aid-msg').value = message(state.fam, state.kind, state.place, state.me);
    $('.aid-who').textContent = state.me
      ? 'This device knows you as ' + state.me + ', so the door offers the connector that keeps your key hidden.'
      : 'Your AI reads and helps you draft with no name. To have it answer under your own name, make one at happyseaurchin.com/connect.';
  }
  function open(opts) {
    opts = opts || {};
    build();
    opener = opts.from || document.activeElement;
    state.fam = opts.family ? { name: slug(opts.family), kind: opts.kind || '' } : familyOf();
    state.me = who();
    state.marks = marked();
    state.place = placeOf(state.marks, opts.at);
    state.kind = state.fam ? (kinds[state.fam.name] || state.fam.kind || '') : '';
    showConn(state.me ? 'hidden' : 'open');
    $('.aid-copied').textContent = '';
    back.hidden = false;
    back.classList.add('in');
    document.documentElement.classList.add('aid-open');
    paint();
    $('.aid-x').focus();
    if (state.fam) kindOf(state.fam).then(function (k) { if (!back.hidden && k !== state.kind) { state.kind = k; paint(); } });
  }
  function close() {
    if (!back || back.hidden) return;
    back.hidden = true; back.classList.remove('in');
    document.documentElement.classList.remove('aid-open');
    if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (e) { opener.focus(); } }
  }

  window.siteDoor = { open: open, close: close, message: message, kindOf: kindOf, placeOf: function (addr) { return placeOf(marked(), addr); } };
})();
