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
    '.gw-seg{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}.gw-seg[hidden]{display:none}.gw-seg button{min-height:40px;min-width:56px;padding:0 12px;border-radius:999px;border:1px solid var(--gw-rule);background:transparent;' +
      'color:var(--gw-ink);font:600 14.5px/1 inherit;font-family:inherit;cursor:pointer}.gw-seg button[aria-pressed="true"]{background:var(--gw-acc);color:var(--gw-acc-ink);border-color:var(--gw-acc)}' +
    '.gw-keyrow,.gw-swrow{margin:10px 0 0}.gw-keyrow input,.gw-swrow input{box-sizing:border-box;width:100%;min-height:44px;font:15px/1.45 inherit;font-family:inherit;color:var(--gw-ink);background:var(--gw-well);border:1px solid var(--gw-rule);border-radius:10px;padding:9px 11px}' +
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
    '<section class="gw-till" hidden><h3>Money for ' + esc(TITLE) + '</h3>' +
      '<p class="gw-note gw-lede"></p><p class="gw-note gw-sw" hidden></p>' +
      '<p class="gw-seg gw-scopes" role="group" aria-label="What it is for"><button type="button" data-gw-scope="line" aria-pressed="true">The game</button><button type="button" data-gw-scope="point" aria-pressed="false">A column</button><button type="button" data-gw-scope="surface" aria-pressed="false">Everyone</button></p>' +
      '<p class="gw-seg gw-layers" role="group" aria-label="Which column" hidden><button type="button" data-gw-layer="players" aria-pressed="false">Players</button><button type="button" data-gw-layer="bringers" aria-pressed="false">Bringers</button><button type="button" data-gw-layer="makers" aria-pressed="true">Makers</button><button type="button" data-gw-layer="beach" aria-pressed="false">The beach</button></p>' +
      '<p class="gw-note gw-scope-say"></p>' +
      '<p class="gw-seg gw-amounts" role="group" aria-label="How much"><button type="button" data-gw-amt="100" aria-pressed="false">£1</button><button type="button" data-gw-amt="500" aria-pressed="true">£5</button><button type="button" data-gw-amt="1000" aria-pressed="false">£10</button></p>' +
      '<p class="gw-till-h gw-split-h">Where it would go now</p><ul class="gw-split gw-quote"></ul>' +
      '<div class="gw-keyrow" hidden><input type="password" class="gw-key" autocomplete="current-password" placeholder="your beach key, kept on this device" aria-label="Your beach key, kept on this device"></div>' +
      '<p class="gw-acts"><button type="button" class="gw-btn gw-main gw-put">Put £5 in</button></p>' +
      '<p class="gw-status gw-put-said" aria-live="polite"></p>' +
      '<div class="gw-pot" hidden><p class="gw-till-h gw-pot-h"></p>' +
      '<p class="gw-till-h">Each part, if asked for now: weightings, as things stand now</p><ul class="gw-split gw-values"></ul>' +
      '<p class="gw-till-h">Each part as credits: each sum shared as things stood when it landed</p><ul class="gw-split gw-credits"></ul>' +
      '<p class="gw-note">The two differ once play moves after a sum lands: weightings follow who plays now, credits keep each sum\'s shares as they were when it was paid.</p>' +
      '<p class="gw-note">A part is taken out by asking for it at <a href="/shore" target="_blank" rel="noopener">Shore</a>: the keeper checks it against the weightings as they stand and pays by hand. <a href="/value-weightings" target="_blank" rel="noopener">How a part is worked out →</a></p></div></section>' +
    '<section class="gw-switch" hidden><h3>Your switch</h3>' +
      '<p class="gw-note">As the keeper, you set the till for every game here. It is <code>till:' + esc(KEEPER) + '</code> on the beach, changed with your key.</p>' +
      '<p class="gw-till-h">Who sees the till</p><p class="gw-seg gw-sw-till" role="group" aria-label="Who sees the till"><button type="button" data-gw-sw="till" data-gw-v="off" aria-pressed="false">Nobody</button><button type="button" data-gw-sw="till" data-gw-v="keeper" aria-pressed="false">Only me</button><button type="button" data-gw-sw="till" data-gw-v="on" aria-pressed="false">Everyone</button></p>' +
      '<p class="gw-till-h">Money</p><p class="gw-seg gw-sw-money" role="group" aria-label="Test or real money"><button type="button" data-gw-sw="money" data-gw-v="test" aria-pressed="false">A test</button><button type="button" data-gw-sw="money" data-gw-v="real" aria-pressed="false">Real</button></p>' +
      '<p class="gw-till-h">Who pays</p><p class="gw-seg gw-sw-paid" role="group" aria-label="Who pays"><button type="button" data-gw-sw="paid" data-gw-v="player" aria-pressed="false">The player</button><button type="button" data-gw-sw="paid" data-gw-v="keeper" aria-pressed="false">Me</button></p>' +
      '<div class="gw-swrow" hidden><input type="password" class="gw-swkey" autocomplete="current-password" placeholder="your beach key, kept on this device" aria-label="Your beach key, kept on this device"></div>' +
      '<p class="gw-status gw-sw-said" aria-live="polite"></p></section>' +
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

  /* ── THE TILL (27 Nov 2026, lane coil.1; thread:155): money for this game, as spine:value-weightings has it. A sum
   * waits in the pot of the scope its giver names, nothing is held for anyone, and a part is worked out only when
   * someone asks to take it out, from the weightings as they stand then; the keeper pays it by hand, at Shore. The
   * scopes (David, 27 Nov 2026: 'a single product-point (game), or column (xp group), or everyone (all xp
   * distribution)'): THE GAME, a line, its four columns under its law's weights; A COLUMN, a point, one of them alone;
   * EVERYONE, the surface, every thing that takes money by its time, then each by its own line. Where a sum would go,
   * the pot, and each part read two ways (as things stand now, and as each sum landed, which is what a credit would
   * hold) are the reader's own: /api/xp?quote= and ?ledger=&read=now|landed. Shown only for a game whose law carries
   * a SUPPORT line, and only as THE SWITCH says: the keeper's own block, till:happyseaurchin, under his key (David:
   * 'I need a way to switch it on/off centrally, or to effectively pay for it myself'):
   *   1 'till: off | keeper | on'   who sees the till: nobody, only a device signed as the keeper, everyone;
   *   2 'paid by: player | <handle>' whose money a sum is (a handle paying, the player still choosing scope and sum);
   *   3 'money: test | real'         test: an open ledger, ledger:test-till, anyone's line, nothing charged; real: the
   *                                  beach's own ledger, ledger:till, under the keeper's key, so only the keeper puts a
   *                                  sum in (David: 'operational for me … to flick it to financial'), with the key his
   *                                  device keeps (siteKeys), asked for once where it keeps none;
   *   4 'things: <thing>, …'         the things that take money, which Everyone spans.
   * A switch that cannot be read, or says nothing it knows, keeps the till shut. ── */
  var KEEPER = 'happyseaurchin', AMT = 500, SCOPE = 'line', LAYER_ON = 'makers', tillOn = false, supportOK = null, SWRAW = null;
  var SW = { till: 'off', paidBy: 'player', money: 'test', things: [GAME] };
  var LAYER = { players: 'playing it', bringers: 'bringing players', makers: 'making it', beach: 'keeping the beach' };
  function voiceOf(n) { while (n && typeof n === 'object') n = n._; return typeof n === 'string' ? n : ''; }
  function switchNow() {
    return fetch(BEACH + '?block=' + encodeURIComponent('till:' + KEEPER), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (b) {
        SWRAW = b;
        var t = /^\s*till:\s*(off|keeper|on)\b/i.exec(voiceOf(b && b['1'])), p = /^\s*paid by:\s*([A-Za-z0-9_-]{2,64})\b/i.exec(voiceOf(b && b['2']));
        var m = /^\s*money:\s*(test|real)\b/i.exec(voiceOf(b && b['3'])), th = /^\s*things:\s*([a-z0-9 ,-]+)/i.exec(voiceOf(b && b['4']));
        var things = th ? th[1].split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(function (x) { return /^[a-z0-9][a-z0-9-]{0,63}$/.test(x); }) : [];
        return { till: t ? t[1].toLowerCase() : 'off', paidBy: p ? p[1] : 'player', money: m ? m[1].toLowerCase() : 'test', things: things.length ? things : [GAME] };
      }, function () { return { till: 'off', paidBy: 'player', money: 'test', things: [GAME] }; });
  }
  /* the keeper's own device: the name the site signs with here, or the name this game is played under */
  function keeperHere() {
    var site = ''; try { site = clean(localStorage.getItem('render:who')); } catch (e) {}
    return [site, ownName()].some(function (n) { return n && n.toLowerCase() === KEEPER; });
  }
  function payer() { return SW.paidBy && SW.paidBy.toLowerCase() !== 'player' ? SW.paidBy : ''; }
  function real() { return SW.money === 'real'; }
  function ledgerName() { return real() ? 'till' : 'test-till'; }
  function money(p) { p = Math.round(p); return '£' + (p % 100 ? (p / 100).toFixed(2) : String(p / 100)); }
  function getJSON(url) { return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }); }
  function surfaceQ() { return '&surface=' + encodeURIComponent(SW.things.join(',')); }
  function scopeWords() { return SCOPE === 'surface' ? 'for anything' : 'for ' + GAME + (SCOPE === 'point' ? ' · ' + LAYER_ON : ''); }
  function rowsOf(list, commons) {
    var rows = (list || []).filter(function (r) { return r.value >= 0.5; }).map(function (r) {
      var f = r.from || {}, top = Object.keys(f).sort(function (a, b) { return (f[b] || 0) - (f[a] || 0); })[0];
      return { name: r.handle, p: r.value, why: (LAYER[top] || '') + (r.paid ? ' · paid ' + money(r.paid) + ', could ask ' + money(r.could) : '') };
    });
    if (commons >= 0.5) rows.push({ name: 'the commons', p: commons, why: 'the parts nobody can be named for yet' });
    return rows.map(function (r) { return '<li><span>' + esc(r.name) + (r.why ? '<span class="gw-why">' + esc(r.why) + '</span>' : '') + '</span><span class="gw-amt">' + money(r.p) + '</span></li>'; }).join('');
  }
  function drawQuote() {
    var say = SCOPE === 'surface' ? 'Everyone: every thing that takes money (' + SW.things.join(', ') + ') by the time people give it, then each by its own law.'
      : SCOPE === 'point' ? 'One column of ' + TITLE + ' alone: the ' + (LAYER_ON === 'beach' ? 'beach' : LAYER_ON) + ', each by their time.'
      : TITLE + ': its players, the people who brought them, its makers and the beach, by its law\'s weights.';
    $('.gw-scope-say').textContent = say;
    $('.gw-layers').hidden = SCOPE !== 'point';
    $('.gw-split-h').textContent = 'Where ' + money(AMT) + ' would go now';
    $('.gw-put').textContent = 'Put ' + money(AMT) + ' in' + (payer() ? ', paid by ' + payer() : '') + (real() ? '' : ', a test');
    var url = '/api/xp?quote=' + AMT + '&for=' + (SCOPE === 'surface' ? 'anything' : encodeURIComponent(GAME)) + (SCOPE === 'point' ? '&layer=' + LAYER_ON : '') + surfaceQ();
    return getJSON(url).then(function (q) {
      if (!q || !q.by) { $('.gw-quote').innerHTML = '<li><span class="gw-why">Where it would go could not be read just now.</span><span></span></li>'; return; }
      var html = rowsOf(q.by, q.commons);
      if (!html && q.pots && q.pots.held) html = '<li><span class="gw-why">Nobody has played on the beach yet, so it would wait, held, until someone does.</span><span></span></li>';
      $('.gw-quote').innerHTML = html || '<li><span class="gw-why">Nobody has played it on the beach yet, so it waits in the commons: a run kept or a line in its room, and the parts begin to have names.</span><span></span></li>';
    });
  }
  /* the pot: the ledger read now and as landed; the sums for this game (its line, its columns) and for everyone */
  function drawPot() {
    var L = ledgerName();
    return Promise.all([getJSON('/api/xp?ledger=' + L + '&read=now' + surfaceQ()), getJSON('/api/xp?ledger=' + L + '&read=landed' + surfaceQ())]).then(function (got) {
      var now = got[0], then = got[1];
      if (!now || !now.given) { $('.gw-pot').hidden = true; return; }
      var line = (now.pots.line || {})[GAME] || 0, point = 0;
      Object.keys(now.pots.point || {}).forEach(function (k) { if (k.indexOf(GAME + ' · ') === 0) point += now.pots.point[k]; });
      var parts = [[line, ' for ' + TITLE], [point, ' for its columns'], [now.pots.surface || 0, ' for everyone']].filter(function (x) { return x[0] > 0; }).map(function (x) { return money(x[0]) + x[1]; });
      $('.gw-pot-h').textContent = (real() ? 'The beach\'s ledger' : 'The test ledger') + ' holds ' + money(now.held) + (now.paid ? ', ' + money(now.paid) + ' paid out' : '') +
        (parts.length ? ': ' + parts.join(', ') + '.' : '.');
      $('.gw-values').innerHTML = rowsOf(now.by, now.commons) || '<li><span class="gw-why">No part has a name yet.</span><span></span></li>';
      $('.gw-credits').innerHTML = (then && rowsOf(then.by, then.commons)) || '<li><span class="gw-why">Nothing has been shared as credits yet.</span><span></span></li>';
      $('.gw-pot').hidden = false;
    });
  }
  function lede() {
    $('.gw-lede').innerHTML = real()
      ? '<b>Real money.</b> Each sum is written in the beach\'s own ledger, <code>ledger:till</code>, under the keeper\'s key, and shared as the weightings stand when someone asks for their part, which the keeper pays by hand. Nothing is charged on this page.'
      : 'Money put in is shared by everyone who made it what it is. Nothing is held for anyone: a person\'s part is worked out when they ask to take it out. <b>This is a test: nothing is charged.</b>';
    var notes = [];
    if (SW.till === 'keeper') notes.push('Shown only to you, as the keeper: nobody else sees this till until it is switched on.');
    if (payer()) notes.push('Every sum is paid by ' + payer() + ': no money from the player, who chooses what it is for and how much.');
    if (real() && !keeperHere()) notes.push('In real money only the keeper puts a sum in for now; a card payment for anyone comes with the ticket machine.');
    $('.gw-sw').hidden = !notes.length; $('.gw-sw').textContent = notes.join(' ');
    var keyNeeded = real() && keeperHere() && !(window.siteKeys && window.siteKeys.forName && window.siteKeys.forName(KEEPER));
    $('.gw-keyrow').hidden = !keyNeeded;
    $('.gw-put').hidden = real() && !keeperHere();
  }
  /* THE KEEPER'S SWITCH (27 Nov 2026, lane coil.1, at David's 'operational for me (as owner of the game) to flick it to
     financial'): on the keeper's own device the drawer carries the switch itself, shown even while the till is off. Each
     choice rewrites its one line of till:<keeper>, the word changed and the line's own words kept, with the keeper's key
     (kept on this device as the till keeps it, given once where none is), and every game's till follows. */
  function keyFor() { return (window.siteKeys && window.siteKeys.forName && window.siteKeys.forName(KEEPER)) || ''; }
  function swPaint() {
    if (!keeperHere()) { $('.gw-switch').hidden = true; return; }
    $('.gw-switch').hidden = false;
    pick('.gw-sw-till', 'data-gw-v', SW.till); pick('.gw-sw-money', 'data-gw-v', SW.money); pick('.gw-sw-paid', 'data-gw-v', payer() ? 'keeper' : 'player');
    $('.gw-swrow').hidden = !!keyFor();
  }
  var SW_RE = [null, /^(\s*till:\s*)(off|keeper|on)\b/i, /^(\s*paid by:\s*)([A-Za-z0-9_-]{2,64})\b/i, /^(\s*money:\s*)(test|real)\b/i];
  var SW_SAY = { 'till off': 'Switched off: no game shows a till, yours included. This switch stays here for you.', 'till keeper': 'Switched to you alone: the till shows only on your device.',
    'till on': 'Switched on: every player sees the till.', 'money real': 'Real money: each sum you put in is written in the beach\'s own ledger, ledger:till, under your key. Nothing is charged on the page.',
    'money test': 'Back to a test: sums go into the open test ledger, and nothing is charged.', 'paid keeper': 'You pay: every sum is yours, and the player chooses what it is for.', 'paid player': 'The player pays: each sum is theirs.' };
  function flip(which, val) {
    var n = which === 'till' ? 1 : which === 'paid' ? 2 : 3, word = which === 'paid' ? (val === 'keeper' ? KEEPER : 'player') : val;
    var said = $('.gw-sw-said'), typed = String(($('.gw-swkey') || {}).value || ''), key = keyFor() || typed;
    if (!key) { said.textContent = 'Your beach key is needed to change the switch: give it once, and this device keeps it.'; $('.gw-swrow').hidden = false; return; }
    var v = voiceOf(SWRAW && SWRAW[String(n)]), re = SW_RE[n];
    var content = v && re.test(v) ? v.replace(re, function (m, a) { return a + word; }) : ['', 'till: ', 'paid by: ', 'money: '][n] + word;
    said.textContent = 'Switching…';
    Array.prototype.forEach.call(dlg.querySelectorAll('.gw-switch button'), function (b) { b.disabled = true; });
    fetch(BEACH, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ block: 'till:' + KEEPER, spindle: String(n), content: content, secret: key }) })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { if (!r.ok || (d && d.error)) throw new Error((d && (d.error || d.message)) || 'the beach answered ' + r.status); }); })
      .then(function () {
        if (typed && !keyFor() && window.siteKeys && window.siteKeys.set) window.siteKeys.set('beach-key:till:' + KEEPER, typed);
        $('.gw-swkey').value = '';
        said.textContent = SW_SAY[which + ' ' + val] || 'Switched.';
        till();
      }, function (err) { said.textContent = 'The switch didn\'t change: ' + err.message + '.'; })
      .then(function () { Array.prototype.forEach.call(dlg.querySelectorAll('.gw-switch button'), function (b) { b.disabled = false; }); });
  }
  Array.prototype.forEach.call(dlg.querySelectorAll('.gw-switch button'), function (b) { b.addEventListener('click', function () { flip(b.getAttribute('data-gw-sw'), b.getAttribute('data-gw-v')); }); });
  function till() {
    switchNow().then(function (sw) {
      SW = sw;
      (window.siteKeys && window.siteKeys.ready ? window.siteKeys.ready() : Promise.resolve()).then(swPaint, swPaint);
      var show = sw.till === 'on' || (sw.till === 'keeper' && keeperHere());
      if (!show) { $('.gw-till').hidden = true; $('.gw-points').hidden = false; tillOn = false; return; }
      /* the game's law must carry a SUPPORT line: read once, from its four columns */
      var law = supportOK === null ? getJSON('/api/xp?family=' + encodeURIComponent(GAME)).then(function (xp) { return (supportOK = !!(xp && xp.law && xp.law.support)); }) : Promise.resolve(supportOK);
      return law.then(function (ok) {
        if (!ok) { $('.gw-till').hidden = true; $('.gw-points').hidden = false; tillOn = false; return; }
        tillOn = true; $('.gw-till').hidden = false; $('.gw-points').hidden = true;
        return (window.siteKeys && window.siteKeys.ready ? window.siteKeys.ready() : Promise.resolve()).then(function () { lede(); return Promise.all([drawQuote(), drawPot()]); });
      });
    });
  }
  function pick(group, attr, val) { Array.prototype.forEach.call(dlg.querySelectorAll(group + ' button'), function (x) { x.setAttribute('aria-pressed', String(x.getAttribute(attr) === val)); }); }
  Array.prototype.forEach.call(dlg.querySelectorAll('.gw-amounts button'), function (b) { b.addEventListener('click', function () { AMT = +b.getAttribute('data-gw-amt') || 500; pick('.gw-amounts', 'data-gw-amt', String(AMT)); drawQuote(); }); });
  Array.prototype.forEach.call(dlg.querySelectorAll('.gw-scopes button'), function (b) { b.addEventListener('click', function () { SCOPE = b.getAttribute('data-gw-scope'); pick('.gw-scopes', 'data-gw-scope', SCOPE); drawQuote(); }); });
  Array.prototype.forEach.call(dlg.querySelectorAll('.gw-layers button'), function (b) { b.addEventListener('click', function () { LAYER_ON = b.getAttribute('data-gw-layer'); pick('.gw-layers', 'data-gw-layer', LAYER_ON); drawQuote(); }); });
  $('.gw-put').addEventListener('click', function () {
    var btn = $('.gw-put'), said = $('.gw-put-said'), amt = AMT, isReal = real();
    if (isReal && !keeperHere()) { said.textContent = 'In real money only the keeper puts a sum in for now.'; return; }
    btn.disabled = true; said.textContent = 'Putting it in…';
    var typed = String(($('.gw-key') || {}).value || '');
    loadKit().then(function () { return window.siteKeys && window.siteKeys.ready ? window.siteKeys.ready() : null; }).then(nameNow).then(function (n) {
      var name = clean(who.value) || n || 'a visitor', by = payer();
      var key = isReal ? ((window.siteKeys && window.siteKeys.forName && window.siteKeys.forName(KEEPER)) || typed) : '';
      if (isReal && !key) throw new Error('your beach key is needed for the beach\'s own ledger, kept on this device once it is given');
      /* the line in value-weightings' own form (1.13): its scope after 'for', the player who chose it where another pays */
      var entry = { _: 'IN — ' + money(amt) + ' · from ' + (by || name) + ' · ' + scopeWords() + (by ? ' · chosen by ' + name : '') + (isReal ? '' : ' · a test, nothing charged'),
        1: by || name, 2: day, 3: new Date().toISOString(), 4: SCOPE === 'surface' ? 'anything' : GAME, 5: String(amt) };
      if (by) entry[6] = name;
      var body = { block: 'ledger:' + ledgerName(), append: true, content: entry };
      if (isReal) body.secret = key;
      return fetch(BEACH, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { if (!r.ok || (d && d.error)) throw new Error((d && (d.error || d.message)) || 'the beach answered ' + r.status); }); })
        .then(function () { if (isReal && typed && window.siteKeys && window.siteKeys.set) { window.siteKeys.set('beach-key:till:' + KEEPER, typed); $('.gw-key').value = ''; $('.gw-keyrow').hidden = true; } });
    }).then(function () {
      said.textContent = 'Thank you: ' + money(amt) + (payer() ? ' from ' + payer() : '') + ' is in ' + (SCOPE === 'surface' ? 'everyone\'s pot' : SCOPE === 'point' ? TITLE + '\'s ' + LAYER_ON + '\' pot' : TITLE + '\'s pot') + (isReal ? ', in the beach\'s own ledger.' : ', as a test. Nothing was charged.');
      return drawPot();
    }, function (err) {
      said.textContent = 'That didn\'t reach the ledger: ' + err.message + '. Nothing was charged; try again.';
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
