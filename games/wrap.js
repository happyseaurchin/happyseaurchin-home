/* The wrapper a hosted game plays in (24 Nov 2026, lane coil.1, at David's 'Build the wrapper kit for hosted games'):
 * the beach's side of a game, around it and never inside it. The game plays sealed in its frame (frame.js keeps what it
 * keeps; vercel.json's sandbox keeps it from everything else); this, on the site's own page around the frame, lays one
 * handle on the left edge, where no hosted game keeps a control, and the handle opens a drawer: share the game the
 * String's way, send its link, ask your own AI about it (the site's door, for the game's family on the beach), today's
 * board and who is in its room now, the room's last lines with a box to leave one (appended to the open room in the
 * plug's own note shape), what play here will count toward (Experience Points), and the way back to the shelves.
 * Nothing of it reaches into the game, and the game reaches none of it: no message from the frame is read here.
 * theme.js (the door, a box's kept draft, dictation, the pass) and the beach's voice (the name a line goes under) load
 * on the first opening and never before, so a game starts as it always did; the site's own corner door and Share stay
 * out of a game's corner (data-ai-door off), the drawer carrying both. Loaded by /games/frame.js for every hosted game.
 * Its note: docs/pages/games-wrap-js.md. */
(function () {
  'use strict';
  var me = document.currentScript, GAME = String((me && me.getAttribute('data-game')) || '');
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(GAME) || window.top !== window || document.querySelector('.gw-tab')) return;
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var VOICE = 'https://beach.happyseaurchin.com/button/voice.js';
  var PAGE = 'https://happyseaurchin.com/games/' + GAME;
  var TITLE = String(document.title || '').replace(/\s*—\s*a game on the beach\s*$/i, '').trim() || GAME;
  var FRESH = 25000;   // the room plug's own window: a slot older than this is a player gone

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(s) { return String(s || '').replace(/[^a-z0-9_\s-]/gi, '').replace(/\s+/g, ' ').trim().slice(0, 32); }
  function ago(iso) {
    var t = Date.parse(iso); if (isNaN(t)) return '';
    var s = Math.max(0, (Date.now() - t) / 1000);
    return s < 90 ? 'just now' : s < 5400 ? Math.round(s / 60) + ' min ago' : s < 129600 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago';
  }
  /* a board's number as its line says it, as /games and /arcade read it: a time only where the word after it is s */
  function unitOf(line) { var m = /^\s*[A-Za-z][A-Za-z0-9_-]*\s+-?\d+(?:\.\d+)?\s*([a-z]{1,12})\b/.exec(line || ''); return m ? ' ' + m[1] : ''; }
  function scoreWords(r) { var u = unitOf(r.line); return u === ' s' ? (Math.round(r.score * 100) / 100).toFixed(2) + ' s' : String(r.score) + u; }

  /* ── theme.js and the voice, on the first opening ── */
  var kit = null;
  function script(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = ok; s.onerror = function () { no(new Error(src + ' did not load')); };
      document.head.appendChild(s);
    });
  }
  function loadKit() {
    if (kit) return kit;
    document.documentElement.setAttribute('data-ai-door', 'off');
    kit = Promise.all([
      typeof window.keepDraft === 'function' ? null : script('/theme.js').catch(function () {}),
      window.beachVoice ? null : script(VOICE).catch(function () {})
    ]);
    return kit;
  }

  var CSS =
    '.gw-tab{position:fixed;left:env(safe-area-inset-left,0);top:50%;transform:translateY(-50%);z-index:40;display:flex;flex-direction:column;' +
      'align-items:center;gap:7px;margin:0;padding:11px 6px 11px 5px;border:1px solid rgba(255,255,255,.3);border-left:0;border-radius:0 12px 12px 0;' +
      'background:rgba(8,12,20,.6);color:#eaf2ff;font:700 10px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'letter-spacing:.12em;text-transform:uppercase;cursor:pointer;opacity:.72;-webkit-tap-highlight-color:transparent;' +
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:2px 0 14px rgba(0,0,0,.25);transition:opacity .2s ease,padding .2s ease}' +
    '.gw-tab:hover,.gw-tab:focus-visible{opacity:1;padding-right:9px}.gw-tab:focus-visible{outline:2px solid #8fd3ff;outline-offset:2px}' +
    '.gw-ring{width:13px;height:13px;border-radius:50%;border:2.5px solid currentColor;box-sizing:border-box}' +
    '.gw-word{writing-mode:vertical-rl;transform:rotate(180deg)}' +
    '.gw-tab .gw-dot{width:7px;height:7px;border-radius:50%;background:#7ef0b0;box-shadow:0 0 8px #7ef0b0}.gw-tab .gw-dot[hidden]{display:none}' +
    '.gw-sheet{--gw-bg:#fbfaf7;--gw-ink:#1d2330;--gw-mute:#5d6779;--gw-rule:rgba(20,30,50,.12);--gw-acc:#2a63c9;--gw-acc-ink:#fff;--gw-well:#f0ede6;' +
      '--well-rgb:240,237,230;--line:rgba(20,30,50,.18);--line-strong:rgba(20,30,50,.35);--vapour-dim:#5d6779;--foam:#1d2330;--liquid:#2a63c9;--liquid-rgb:42,99,201;' +
      'padding:0;border:0;margin:auto 0 0;width:100%;max-width:100%;max-height:86vh;border-radius:16px 16px 0 0;overflow:hidden;' +
      'background:var(--gw-bg);color:var(--gw-ink);box-shadow:0 -12px 40px rgba(0,0,0,.35);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '@media (prefers-color-scheme:dark){.gw-sheet{--gw-bg:#10151e;--gw-ink:#e6edf7;--gw-mute:#9aabc2;--gw-rule:rgba(255,255,255,.12);--gw-acc:#8fd3ff;--gw-acc-ink:#06121d;--gw-well:#0a0e15;' +
      '--well-rgb:10,14,21;--line:rgba(255,255,255,.18);--line-strong:rgba(255,255,255,.35);--vapour-dim:#9aabc2;--foam:#e6edf7;--liquid:#8fd3ff;--liquid-rgb:143,211,255}}' +
    '@media (min-width:760px){.gw-sheet{margin:0 auto 0 0;width:400px;height:100%;max-height:100%;border-radius:0 16px 16px 0;box-shadow:12px 0 40px rgba(0,0,0,.35)}}' +
    '.gw-sheet::backdrop{background:rgba(4,8,14,.45)}' +
    '.gw-in{box-sizing:border-box;max-height:86vh;overflow:auto;padding:16px 18px calc(18px + env(safe-area-inset-bottom,0px))}' +
    '@media (min-width:760px){.gw-in{height:100vh;max-height:100vh}}' +
    '.gw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 12px}' +
    '.gw-head h2{margin:0;font-size:20px;line-height:1.25}.gw-head small{display:block;font-size:13px;font-weight:500;color:var(--gw-mute)}' +
    '.gw-x{flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--gw-rule);background:transparent;color:var(--gw-ink);font:18px/1 sans-serif;cursor:pointer}' +
    '.gw-sheet h3{margin:18px 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--gw-mute)}.gw-sheet h3 code{text-transform:none;letter-spacing:0}' +
    '.gw-acts{display:flex;flex-wrap:wrap;gap:8px;margin:0}' +
    '.gw-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--gw-acc);' +
      'background:transparent;color:var(--gw-acc);font:600 14px/1.1 inherit;font-family:inherit;text-decoration:none;cursor:pointer}' +
    '.gw-btn.gw-main{background:var(--gw-acc);color:var(--gw-acc-ink)}.gw-btn[disabled]{opacity:.55;cursor:default}' +
    '.gw-status{margin:6px 0 0;min-height:1.2em;font-size:13px;color:var(--gw-mute);overflow-wrap:anywhere}' +
    '.gw-here{margin:0 0 4px;font-size:14px}.gw-here.on{color:var(--gw-acc)}.gw-count{margin:0 0 4px;font-size:14px;color:var(--gw-mute)}' +
    '.gw-top,.gw-lines{list-style:none;margin:0;padding:0}' +
    '.gw-top li{display:grid;grid-template-columns:2ch 1fr auto;gap:10px;padding:6px 0;border-top:1px solid var(--gw-rule)}' +
    '.gw-top .gw-rank{color:var(--gw-mute)}.gw-top .gw-score{font-variant-numeric:tabular-nums}' +
    '.gw-lines li{padding:7px 0;border-top:1px solid var(--gw-rule);overflow-wrap:anywhere}.gw-lines .gw-when{margin-left:8px;font-size:12px;color:var(--gw-mute)}' +
    '.gw-lines .gw-none{color:var(--gw-mute)}' +
    '.gw-say{margin:10px 0 0}.gw-box{position:relative}' +
    '.gw-say textarea,.gw-say input{box-sizing:border-box;width:100%;font:15px/1.45 inherit;font-family:inherit;color:var(--gw-ink);background:var(--gw-well);' +
      'border:1px solid var(--gw-rule);border-radius:10px;padding:9px 34px 9px 11px}' +
    '.gw-say textarea{min-height:64px;resize:vertical}.gw-row{display:flex;gap:8px;margin-top:8px}.gw-row input{flex:1;min-height:44px;padding-right:11px}' +
    '.gw-note,.gw-points p{margin:8px 0 0;font-size:13px;line-height:1.45;color:var(--gw-mute)}.gw-points a,.gw-more a{color:var(--gw-acc)}' +
    '.gw-more{margin:20px 0 0;font-size:14px}' +
    /* dictation's glyph, as theme.css draws it (this page carries no theme.css, which would dress the frame around a game) */
    '.gw-sheet .dictate{position:absolute;z-index:2;width:22px;height:22px;margin:0;padding:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;' +
      'background:rgba(var(--well-rgb),.55);border:1px solid var(--line);border-radius:50%;color:var(--vapour-dim);cursor:pointer;line-height:1;user-select:none}' +
    '.gw-sheet .dictate svg{width:13px;height:13px;fill:currentColor;display:block}.gw-sheet .dictate:hover{color:var(--foam);border-color:var(--line-strong)}' +
    '.gw-sheet .dictate.on{color:var(--liquid);border-color:rgba(var(--liquid-rgb),.55);box-shadow:0 0 0 3px rgba(var(--liquid-rgb),.3)}.gw-sheet .dictate[hidden]{display:none}' +
    /* the till: three amounts, where a sum would go now, the pot and each part if asked for now */
    '.gw-amounts{display:flex;gap:8px;margin:10px 0 0}.gw-amounts button{min-height:40px;min-width:56px;border-radius:999px;border:1px solid var(--gw-rule);background:transparent;' +
      'color:var(--gw-ink);font:600 15px/1 inherit;font-family:inherit;cursor:pointer}.gw-amounts button[aria-pressed="true"]{background:var(--gw-acc);color:var(--gw-acc-ink);border-color:var(--gw-acc)}' +
    '.gw-till-h{margin:12px 0 2px;font-size:13px;color:var(--gw-mute)}' +
    '.gw-split{list-style:none;margin:0;padding:0}.gw-split li{display:grid;grid-template-columns:1fr auto;gap:10px;padding:6px 0;border-top:1px solid var(--gw-rule);font-size:14.5px}' +
    '.gw-split .gw-why{display:block;font-size:12px;color:var(--gw-mute)}.gw-split .gw-amt{font-variant-numeric:tabular-nums}' +
    '@media print{.gw-tab,.gw-sheet{display:none}}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  /* ── the handle ── */
  var tab = document.createElement('button');
  tab.type = 'button'; tab.className = 'gw-tab';
  tab.setAttribute('aria-haspopup', 'dialog');
  tab.setAttribute('aria-label', TITLE + ' on the beach: share it, its room, your AI');
  tab.title = TITLE + ' on the beach';
  tab.innerHTML = '<span class="gw-ring" aria-hidden="true"></span><span class="gw-word" aria-hidden="true">beach</span><span class="gw-dot" hidden></span>';
  document.body.appendChild(tab);

  /* ── the drawer ── */
  var dlg = document.createElement('dialog');
  dlg.className = 'gw-sheet';
  dlg.setAttribute('aria-labelledby', 'gw-title');
  dlg.innerHTML = '<div class="gw-in">' +
    '<header class="gw-head"><h2 id="gw-title">' + esc(TITLE) + '<small>on the beach</small></h2><button type="button" class="gw-x" aria-label="Back to the game">✕</button></header>' +
    '<p class="gw-acts"><a class="gw-btn gw-main" href="/string?add=' + encodeURIComponent(PAGE) + '" target="_blank" rel="noopener">Share on the String</a>' +
      '<button type="button" class="gw-btn" data-gw="send">Send the link</button>' +
      '<button type="button" class="gw-btn" data-gw="ai">Ask your AI about it</button></p>' +
    '<p class="gw-status gw-said" aria-live="polite"></p>' +
    '<section class="gw-today" hidden><h3>Today</h3><p class="gw-here" hidden></p><p class="gw-count"></p><ol class="gw-top"></ol></section>' +
    '<section class="gw-till" hidden><h3>A ticket for ' + esc(TITLE) + '</h3>' +
      '<p class="gw-note">Money put in is shared by everyone who made this game what it is: its players, the people who brought them, its makers and the beach. Nothing is held for anyone: a person\'s part is worked out when they ask to take it out. <b>This is a test: nothing is charged.</b></p>' +
      '<p class="gw-amounts" role="group" aria-label="How much"><button type="button" data-amt="100" aria-pressed="false">£1</button><button type="button" data-amt="500" aria-pressed="true">£5</button><button type="button" data-amt="1000" aria-pressed="false">£10</button></p>' +
      '<p class="gw-till-h gw-split-h">Where it would go now</p><ul class="gw-split"></ul>' +
      '<p class="gw-acts"><button type="button" class="gw-btn gw-main gw-put">Put £5 in, a test</button></p>' +
      '<p class="gw-status gw-put-said" aria-live="polite"></p>' +
      '<div class="gw-pot" hidden><p class="gw-till-h gw-pot-h"></p><ul class="gw-split gw-values"></ul>' +
      '<p class="gw-note">A part is taken out by asking for it at <a href="/shore" target="_blank" rel="noopener">Shore</a>: the keeper checks it against the weightings as they stand and pays by hand. <a href="/value-weightings" target="_blank" rel="noopener">How a part is worked out →</a></p></div></section>' +
    '<section class="gw-room" hidden><h3>The room <code>pool:' + esc(GAME) + '</code></h3><ul class="gw-lines"></ul>' +
      '<form class="gw-say"><div class="gw-box"><textarea rows="2" maxlength="2000" placeholder="Say something about ' + esc(TITLE) + '"></textarea></div>' +
      '<div class="gw-row"><input type="text" maxlength="32" placeholder="your name" aria-label="your name" autocomplete="nickname"><button type="submit" class="gw-btn gw-main">Leave a line</button></div>' +
      '<p class="gw-status gw-sent" aria-live="polite"></p></form>' +
      '<p class="gw-note">A line left here goes into the game\'s room on the beach, open to everyone, beside the runs kept there.</p></section>' +
    '<section class="gw-points"><h3>Experience Points</h3><p>What play here will earn is the beach\'s proposal: money put into a game, shared out each month by the time people give it, in four equal pots, to its players, the people who brought them, its makers and the beach. <a href="/experience-points" target="_blank" rel="noopener">Read it, and say yours →</a></p></section>' +
    '<p class="gw-more"><a href="/games">All the games</a> · <a href="/arcade">The arcade</a></p>' +
    '</div>';
  document.body.appendChild(dlg);
  var $ = function (sel) { return dlg.querySelector(sel); };
  var frame = document.getElementById('game') || document.querySelector('iframe');

  var board = null, day = '';
  function open() {
    if (dlg.open) return;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    loadKit().then(dress);
    refresh();
  }
  function close() { if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); } }
  tab.addEventListener('click', open);
  $('.gw-x').addEventListener('click', close);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });   // a tap on the backdrop
  dlg.addEventListener('close', function () { try { if (frame) frame.focus(); } catch (e) {} });   // the game has the keys again

  /* today's board, and the room's last lines, as /arcade reads them: one read of /api/board; a game the beach knows
   * nothing of (no law, no room) shows neither */
  function refresh() {
    fetch('/api/board?game=' + encodeURIComponent(GAME), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (b) { if (!b || b.error) return; board = b; day = String(b.day || ''); drawToday(b); drawRoom(b.recent || []); }, function () {});
    hereNow();
    till();
  }

  /* ── THE TILL (27 Nov 2026, lane coil.1, at David's 'work out how to enable moneyflow through tickets so that we have
   * an example'; thread:155): a ticket for this game, money in for its four layers, the line its law's SUPPORT names
   * (weights, makers, the beach), as spine:value-weightings has it: the sum waits in the game's pot, nothing is held for
   * anyone, and a part is worked out only when someone asks to take it out, from the weightings as they stand then.
   * Where it would go is read live from /api/xp (the game's four columns, the law's weights, a credit a penny). A TEST:
   * nothing is charged; the line goes into an open test ledger, ledger:test-flock-world, never Shore's. Shown only for a
   * game whose law carries a SUPPORT line. ── */
  var LEDGER = 'ledger:test-flock-world', AMT = 500, tillOn = false;
  var LAYER = { players: 'playing it', bringers: 'bringing players', makers: 'making it', beach: 'keeping the beach' };
  function money(p) { p = Math.round(p); return '£' + (p % 100 ? (p / 100).toFixed(2) : String(p / 100)); }
  function xpOf(pence) {
    return fetch('/api/xp?family=' + encodeURIComponent(GAME) + '&credits=' + Math.max(0, Math.round(pence)), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
  }
  function splitItems(xp) {
    var by = (xp && xp.shares && xp.shares.by) || [], rows = by.filter(function (r) { return r.credits > 0; }).map(function (r) {
      var f = r.from || {}, top = Object.keys(f).sort(function (a, b) { return (f[b] || 0) - (f[a] || 0); })[0];
      return { name: r.handle, p: r.credits, why: LAYER[top] || '' };
    });
    var c = (xp && xp.shares && xp.shares.commons) || (xp && xp.split && xp.split.commons) || 0;
    rows.sort(function (a, b) { return b.p - a.p; });
    if (c > 0) rows.push({ name: 'the commons', p: c, why: 'the parts nobody can be named for yet' });
    return rows.map(function (r) { return '<li><span>' + esc(r.name) + (r.why ? '<span class="gw-why">' + esc(r.why) + '</span>' : '') + '</span><span class="gw-amt">' + money(r.p) + '</span></li>'; }).join('');
  }
  function drawSplit() {
    $('.gw-split-h').textContent = 'Where ' + money(AMT) + ' would go now';
    $('.gw-put').textContent = 'Put ' + money(AMT) + ' in, a test';
    return xpOf(AMT).then(function (xp) {
      if (!xp || !xp.law || !xp.law.support) { $('.gw-till').hidden = true; return false; }
      $('.gw-till').hidden = false; $('.gw-points').hidden = true;   // the till says what Experience Points' card said, as it now stands
      $('.gw-till .gw-split:not(.gw-values)').innerHTML = splitItems(xp) +
        (xp.beats ? '' : '<li><span class="gw-why">Nobody has played it on the beach yet, so it waits in the commons: a run kept or a line in its room, and the parts begin to have names.</span><span></span></li>');
      return true;
    });
  }
  /* the pot: every IN line of the test ledger for this game, wherever the beach's appends nested it */
  function potLines(block) {
    var out = [];
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (typeof n._ === 'string' && /^IN\b/.test(n._) && n['4'] === GAME && /^\d+$/.test(String(n['5'] || ''))) out.push(+n['5']);
      Object.keys(n).forEach(function (k) { if (/^[1-9]$/.test(k) && n[k] && typeof n[k] === 'object') walk(n[k]); });
    })(block);
    return out;
  }
  function drawPot() {
    return fetch(BEACH + '?block=' + encodeURIComponent(LEDGER), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (b) {
        var lines = b ? potLines(b) : [], pot = lines.reduce(function (s, p) { return s + p; }, 0);
        if (!pot) { $('.gw-pot').hidden = true; return; }
        return xpOf(pot).then(function (xp) {
          $('.gw-pot-h').textContent = 'In the pot for ' + TITLE + ': ' + money(pot) + ' from ' + lines.length + (lines.length === 1 ? ' ticket' : ' tickets') + '. Each part, if asked for now:';
          $('.gw-values').innerHTML = splitItems(xp);
          $('.gw-pot').hidden = false;
        });
      }, function () {});
  }
  function till() {
    drawSplit().then(function (on) { tillOn = on; if (on) drawPot(); });
  }
  Array.prototype.forEach.call(dlg.querySelectorAll('.gw-amounts button'), function (b) {
    b.addEventListener('click', function () {
      AMT = +b.getAttribute('data-amt') || 500;
      Array.prototype.forEach.call(dlg.querySelectorAll('.gw-amounts button'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      drawSplit();
    });
  });
  $('.gw-put').addEventListener('click', function () {
    var btn = $('.gw-put'), said = $('.gw-put-said'), amt = AMT;
    btn.disabled = true; said.textContent = 'Putting it in…';
    loadKit().then(nameNow).then(function (n) {
      var name = clean(who.value) || n || 'a visitor';
      var entry = { _: 'IN — ' + money(amt) + ' · from ' + name + ' · for ' + GAME + ' · a test, nothing charged', 1: name, 2: day, 3: new Date().toISOString(), 4: GAME, 5: String(amt) };
      return fetch(BEACH, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ block: LEDGER, append: true, content: entry }) })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { if (!r.ok || (d && d.error)) throw new Error((d && (d.error || d.message)) || 'the beach answered ' + r.status); }); });
    }).then(function () {
      said.textContent = 'Thank you: ' + money(amt) + ' is in ' + TITLE + '\'s pot, as a test. Nothing was charged.';
      return drawPot();
    }, function (err) {
      said.textContent = 'That didn\'t reach the beach: ' + err.message + '. Nothing was charged; try again.';
    }).then(function () { btn.disabled = false; });
  });
  function drawToday(b) {
    $('.gw-today').hidden = false;
    $('.gw-count').textContent = b.runs ? b.runs + (b.runs === 1 ? ' run' : ' runs') + ' by ' + b.players + (b.players === 1 ? ' player' : ' players') + ' today' : 'No runs today yet: the first is yours to make.';
    $('.gw-top').innerHTML = (b.top || []).slice(0, 3).map(function (r, i) {
      return '<li><span class="gw-rank">' + (i + 1) + '</span><span>' + esc(r.name) + '</span><span class="gw-score">' + esc(scoreWords(r)) + '</span></li>';
    }).join('');
  }
  function lineItem(x) {
    return '<li><b>' + esc(x.name || 'a visitor') + '</b> ' + esc(x.text || (x.run ? 'kept a run' : '')) + '<span class="gw-when">' + esc(ago(x.when)) + '</span></li>';
  }
  function drawRoom(recent) {
    $('.gw-room').hidden = false;
    $('.gw-lines').innerHTML = recent.length ? recent.slice(0, 5).map(lineItem).join('') : '<li class="gw-none">Nothing said in the room yet.</li>';
  }

  /* who is in its room now, as /games reads it: the room plug's liquid, a slot a player, fresh within its window */
  function slotsOf(node, out) {
    if (!node || typeof node !== 'object') return out;
    Object.keys(node).forEach(function (k) {
      if (!/^[1-9_]$/.test(k)) return;
      var s = node[k];
      if (s && typeof s === 'object' && typeof s['1'] === 'string' && typeof s['3'] === 'string') out.push(s); else slotsOf(s, out);
    });
    return out;
  }
  function hereNow() {
    fetch(BEACH + '?block=' + encodeURIComponent('liquid:pool:' + GAME), { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) return null;
      var now = Date.parse(String(r.headers.get('X-Pscale-Now') || '').split('|')[0].trim()) || Date.now();
      return r.json().then(function (block) {
        return slotsOf(block, []).filter(function (s) { return s._ && typeof s['7'] === 'string' && Math.abs(now - Date.parse(s['3'])) < FRESH; }).map(function (s) { return clean(s['1']) || 'someone'; });
      });
    }).then(function (names) {
      var el = $('.gw-here'), dot = tab.querySelector('.gw-dot');
      if (!names) { el.hidden = true; dot.hidden = true; return; }
      var n = names.length, who = names.slice(0, 3).join(', ') + (n > 3 ? ' and ' + (n - 3) + ' more' : '');
      el.className = 'gw-here' + (n ? ' on' : '');
      el.textContent = n ? '● ' + n + (n === 1 ? ' player' : ' players') + ' in its room now: ' + who : 'Nobody in its room just now: the next to come finds you there.';
      el.hidden = false; dot.hidden = !n;
    }, function () {});
  }
  hereNow();
  setInterval(function () { if (!document.hidden) hereNow(); }, 30000);   // the handle's dot says someone is in the room, as the shelf does

  /* ── a line in the room: the name this person plays the game under (the frame keeps it), else the device's, else one
   * the voice makes; appended to the open room in the plug's note shape, as /arcade's box appends one ── */
  var NAME = '';
  function ownName() { try { return clean(localStorage.getItem('games:' + GAME + ':render:who')); } catch (e) { return ''; } }
  function nameNow() {
    if (NAME) return Promise.resolve(NAME);
    var own = ownName();
    if (own) return Promise.resolve(NAME = own);
    var V = window.beachVoice, n = clean(V && V.name && V.name());
    if (n) return Promise.resolve(NAME = n);
    return V && V.propose ? V.propose().then(function (p) { return (NAME = clean(p)); }, function () { return ''; }) : Promise.resolve('');
  }
  var form = $('.gw-say'), box = form.querySelector('textarea'), who = form.querySelector('input'), send = form.querySelector('button'), sent = $('.gw-sent');
  var clearDraft = function () {}, dressed = false;
  function dress() {   // once theme.js is here: the box keeps its draft and takes dictation, and the name is filled
    if (dressed) return; dressed = true;
    if (typeof window.keepDraft === 'function') clearDraft = window.keepDraft(box, 'games:' + GAME + ':room') || clearDraft;
    if (typeof window.dictate === 'function') window.dictate(box);
    nameNow().then(function (n) { if (!who.value) who.value = n; });
  }
  who.addEventListener('change', function () { NAME = clean(who.value); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = box.value.trim().slice(0, 2000); if (!text) { box.focus(); return; }
    send.disabled = true; sent.textContent = 'Sending…';
    loadKit().then(nameNow).then(function (n) {
      var name = clean(who.value) || n; who.value = name; NAME = name;
      var entry = { _: text, 1: (name || 'a visitor') + (name ? ', a visitor' : ''), 2: day, 3: new Date().toISOString() };
      return fetch(BEACH, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ block: 'pool:' + GAME, append: true, content: entry }) })
        .then(function (r) {
          return r.json().catch(function () { return null; }).then(function (d) {
            if (!r.ok || (d && d.error)) throw new Error((d && (d.error || d.message)) || 'the beach answered ' + r.status);
            return entry;
          });
        });
    }).then(function (entry) {
      clearDraft(); box.value = '';
      var list = $('.gw-lines'), none = list.querySelector('.gw-none'); if (none) none.remove();
      list.insertAdjacentHTML('afterbegin', lineItem({ name: NAME, text: entry._, when: entry[3] }));
      while (list.children.length > 5) list.lastChild.remove();
      sent.textContent = 'Thank you, ' + (NAME || 'visitor') + ': your line is in the room.';
    }, function (err) {
      sent.textContent = 'That didn\'t reach the beach: ' + err.message + '. Your words are kept here; try again.';
    }).then(function () { send.disabled = false; });
  });

  /* ── share and your AI ── */
  $('[data-gw="send"]').addEventListener('click', function () {
    var said = $('.gw-said');
    if (navigator.share) { navigator.share({ title: TITLE, url: PAGE }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(PAGE).then(function () { said.textContent = 'The link is copied: ' + PAGE; }, function () { said.textContent = PAGE; });
    else said.textContent = PAGE;
  });
  $('[data-gw="ai"]').addEventListener('click', function (e) {
    var btn = e.currentTarget, said = $('.gw-said');
    said.textContent = 'Opening the door…';
    loadKit().then(function () {
      if (typeof window.siteDoorOpen !== 'function') { said.textContent = 'The door did not open here: https://happyseaurchin.com/connect says how to bring the beach to your AI.'; return; }
      said.textContent = '';
      close();
      /* a game with a law on the beach is a family its door can name; the name is the one this person plays it under, where
       * the page keeps their runs (<game>:<name>), never the device's */
      window.siteDoorOpen(btn, { family: board && board.law ? GAME : undefined, me: ownName() || undefined });
    });
  });
})();
