/* The credit card a hosted game's frame carries once its law names credits (lane credits.games.1, 25 Nov 2026):
 * the beach's first layer of money, worked through one game. Money comes in only as a ticket at the beach's ticket
 * machine; the ticket turns into credits the moment it is paid; every credit spent on a go lands with the game's makers,
 * split equally (contract type one, point-creators: spine:experience-points 1.11118, at David's word, 'Just go for
 * makers split equally'). A player's first goes are free because others put credits in for them: the fund a game's
 * author seeds and every player who pays forward fills.
 *
 *   <script src="/games/frame.js" data-game="<game>"></script>
 *   <script src="/games/credits.js" data-game="<game>" defer></script>
 *
 * THE LAW SAYS WHETHER, never this file. function:<game> carries two lines, found by their opening words wherever they
 * stand: 'makers: <handle>, <handle> — …' (who a go's credits land with) and 'credits: <own product>, <fund product> at
 * <ticket machine> — …' (where credits are bought and kept). With no credits line, or a machine that does not answer
 * for those products, the card never shows and the game plays exactly as before. A test run names a machine on this
 * computer with ?machine=http://localhost:<port>, and no other address is taken from the page's own address.
 *
 * THE BOOK IS THE ONLY BALANCE. What a player holds is read off credits:<issuer>, the book the ticket machine alone
 * writes, in its order: what came to them less what went from them. A free go is the machine's to move (POST
 * /credits/draw: the fund to the makers, three a player); a paid go is the player's own gift, written at their
 * passport's 6.3 under their own key (sand-v2 3.1), which the machine moves only as far as the book says they hold
 * (POST /credits/spend). A page never writes a credit anywhere, and a line a player writes about themselves counts for
 * nothing (pool:experience-points 2). Keys go through siteKeys (theme.js, fetched only when a go is to be paid). */
(function () {
  'use strict';
  var me = document.currentScript, GAME = String((me && me.getAttribute('data-game')) || '');
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(GAME)) return;
  var WK = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var HANDLE = /^[A-Za-z0-9_-]{2,64}$/;
  var card = null, state = null;

  /* ── the beach, read and written with plain fetch (theme.js's pass rides it where one is held) ── */
  function read(name) {
    return fetch(WK + '?block=' + encodeURIComponent(name), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.status === 404 ? null : r.ok ? r.json() : Promise.reject(new Error('the beach answered ' + r.status + ' for ' + name)); });
  }
  function write(body) {
    return fetch(WK, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; }); });
  }
  function text(n) { return typeof n === 'string' ? n : n && typeof n === 'object' && typeof n._ === 'string' ? n._ : ''; }
  /* a law's line found by its opening word wherever it stands, as the plug finds 'board:' (ways:arcade) */
  function lineOf(law, word) {
    var found = '', re = new RegExp('^\\s*' + word + '\\s*:', 'i');
    (function walk(n) {
      if (found) return;
      if (typeof n === 'string') { if (re.test(n)) found = n; return; }
      if (n && typeof n === 'object') ['_', '1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(function (k) { if (k in n) walk(n[k]); });
    })(law);
    return found.replace(re, '').trim();
  }
  function namesIn(words) {
    return (words.split(/\s[—–-]\s|[.;(]/)[0] || '').split(/,|\band\b|\sat\s/).map(function (s) { return s.trim(); }).filter(function (h) { return HANDLE.test(h); });
  }
  /* the book's lines in the order the beach allocated them: an accumulator's slots read from the root, an underscore
   * as 0, every line at one depth, so a longer slot is a later one (the machine reads it the same way, lib/credits.ts).
   * A line: 1 the move, 2 the credits, 3 when, 4 the point, 5 to, 6 from, 7 what warrants it. */
  function linesOf(book) {
    var out = [];
    (function walk(n, path) {
      if (!n || typeof n !== 'object') return;
      if (typeof n['1'] === 'string' && typeof n['2'] === 'number' && typeof n['5'] === 'string' && typeof n['6'] === 'string') {
        out.push({ slot: path.replace(/^0+/, '') || '0', words: text(n), id: n['1'], n: n['2'], to: n['5'], point: typeof n['4'] === 'string' ? n['4'] : '', at: typeof n['3'] === 'string' ? n['3'] : '', from: n['6'], warrant: typeof n['7'] === 'string' ? n['7'] : '' });
        return;
      }
      Object.keys(n).forEach(function (k) { if (k === '_' || /^[1-9]$/.test(k)) walk(n[k], path + (k === '_' ? '0' : k)); });
    })(book, '');
    return out.sort(function (a, b) { return a.slot.length - b.slot.length || (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0); });
  }
  function round(x) { return Math.round(x * 100) / 100; }
  function held(lines, who) {
    return round(lines.reduce(function (t, l) { return t + (l.to === who ? l.n : 0) - (l.from === who ? l.n : 0); }, 0));
  }

  /* ── where the machine is: the law's, or one on this computer for a test run ── */
  function machineOf(words) {
    var asked = new URLSearchParams(location.search).get('machine') || '';
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/.test(asked)) return asked;
    var m = /\sat\s+(https:\/\/[^\s—–]+)/.exec(' ' + words);
    return m ? m[1].replace(/[.,;)]+$/, '').replace(/\/+$/, '') : '';
  }
  function terms(machine, id) {
    return fetch(machine + '/share/' + encodeURIComponent(id), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; });
  }

  /* ── who is playing: the name this device signs with, else the one the game made, else a new one ── */
  function stored(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function nameNow() {
    var n = stored('render:who') || stored('games:' + GAME + ':render:who');
    n = String(n).trim();
    return HANDLE.test(n) ? n : '';
  }
  function propose() { return 'starling-' + String(1000 + Math.floor(Math.random() * 9000)); }

  /* ── the keys, through siteKeys only (theme.js, fetched now: a frame page carries no chrome of its own) ── */
  function siteKeys() {
    if (window.siteKeys) return window.siteKeys.ready().then(function () { return window.siteKeys; });
    return new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = '/theme.js';
      s.onload = function () { window.siteKeys ? window.siteKeys.ready().then(function () { ok(window.siteKeys); }, no) : no(new Error('no keyring on this page')); };
      s.onerror = function () { no(new Error('the keyring did not load')); };
      document.head.appendChild(s);
    });
  }
  function randomKey() {
    var b = new Uint8Array(24); crypto.getRandomValues(b);
    return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  /* the key the player's passport answers to: one this device keeps for any of their blocks; for a name with no
   * passport yet, one made here and the passport founded latched to it; else asked for, once */
  function keyFor(name) {
    return siteKeys().then(function (K) {
      var key = K.forName(name);
      return read('passport:' + name).then(function (pp) {
        if (key) return { key: key, passport: pp };
        if (pp) {
          var asked = window.prompt(name + ' has a passport on the beach. Its credits move only on a gift written under its key: enter that key (it is kept on this device).');
          if (!asked) return Promise.reject(new Error('no key given'));
          return K.set('passport-latch:' + name, asked.trim()).then(function () { return { key: asked.trim(), passport: pp }; });
        }
        key = randomKey();
        var founded = { _: name + ' — a player on the beach, met at ' + GAME, '6': { _: 'what moves through ' + name + ': gifts written at 3, each under their own key (sand-v2 3.1)', '3': { _: 'gifts ' + name + ' wrote' } } };
        return write({ block: 'passport:' + name, content: founded, new_lock: key }).then(function (w) {
          if (!w.ok) return Promise.reject(new Error('the passport was not founded: ' + ((w.data && (w.data.error || w.data.code)) || w.status)));
          return K.set('passport-latch:' + name, key).then(function () { return { key: key, passport: founded }; });
        });
      });
    });
  }
  /* the gift written at the player's own 6.3: the first empty slot of nine, else the oldest the book has already
   * moved (a passport keeps nine gifts; the book keeps every move for good) */
  function slotFor(passport, lines, name) {
    var g = passport && passport['6'] && typeof passport['6'] === 'object' ? passport['6']['3'] : null, best = null;
    for (var d = 1; d <= 9; d++) {
      var at = g && typeof g === 'object' ? g[String(d)] : null;
      if (!at) return String(d);
      var moved = at && typeof at['1'] === 'string' && lines.some(function (l) { return l.id === at['1'] && l.from === name; });
      if (moved && (!best || String(at['5'] || '') < best.when)) best = { slot: String(d), when: String(at['5'] || '') };
    }
    return best ? best.slot : '';
  }
  function giveGo(name) {
    var s = state, probe = 'go-' + Date.now().toString(36) + '-' + randomKey().slice(0, 6);
    var gift = { _: 'a go of ' + s.title + ': ' + s.go + ' credit to its makers', '1': probe, '2': s.go, '3': 'function:' + GAME, '5': new Date().toISOString() };
    return keyFor(name).then(function (k) {
      var pp = k.passport || {}, six = pp['6'], body;
      if (!six || typeof six !== 'object') {
        body = { block: 'passport:' + name, spindle: '6', secret: k.key, content: { _: text(six) || 'what moves through ' + name + ': gifts written at 3 (sand-v2 3.1)', '3': { _: 'gifts ' + name + ' wrote', '1': gift } } };
      } else if (!six['3'] || typeof six['3'] !== 'object') {
        body = { block: 'passport:' + name, spindle: '6.3', secret: k.key, content: { _: text(six['3']) || 'gifts ' + name + ' wrote', '1': gift } };
      } else {
        var slot = slotFor(pp, s.lines, name);
        if (!slot) return Promise.reject(new Error('nine gifts stand unmoved at ' + name + '’s passport'));
        body = { block: 'passport:' + name, spindle: '6.3' + slot, secret: k.key, content: gift };
      }
      return write(body);
    }).then(function (w) {
      if (!w.ok) return Promise.reject(new Error('your gift was not written: ' + ((w.data && (w.data.error || w.data.code)) || w.status)));
      try { localStorage.setItem('render:who', name); } catch (e) {}
      return post('/credits/spend', { issuer: s.issuer, holder: name, probe: probe });
    });
  }
  function post(path, body) {
    return fetch(state.machine + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return r.ok && d.ok ? d : Promise.reject(new Error(said(d.error) || 'the ticket machine answered ' + r.status)); }); });
  }
  function said(code) {
    return ({ short: 'the book says you hold less than a go', no_free_goes_left: 'your free goes are used', fund_empty: 'the fund for free goes is empty', no_gift: 'the machine found no gift at your passport', point_names_no_makers: 'the game’s law names no makers' })[code] || code || '';
  }

  /* ── the card ── */
  var CSS = '.cr-back{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(244,241,234,.86);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}' +
    '.cr{max-width:30rem;width:100%;background:#fbf9f4;color:#22201b;border:1px solid #cfc6b4;border-radius:10px;padding:18px 20px;font:15px/1.5 Georgia,"Iowan Old Style",serif;box-shadow:0 8px 30px rgba(40,30,10,.18)}' +
    '.cr h2{margin:0 0 4px;font-size:21px;font-weight:normal;letter-spacing:.02em}.cr .t{font:12px/1.4 system-ui,sans-serif;color:#8a6d2b;text-transform:uppercase;letter-spacing:.08em}' +
    '.cr p{margin:10px 0}.cr .who{font-size:14px;color:#5b5446}.cr .who a,.cr .low a{color:inherit}' +
    '.cr button{display:block;width:100%;margin:8px 0 0;padding:11px 14px;border-radius:7px;border:1px solid #2f4a3a;background:#2f4a3a;color:#fff;font:15px/1.3 Georgia,serif;cursor:pointer;text-align:left}' +
    '.cr button.q{background:transparent;color:#2f4a3a}.cr button[disabled]{opacity:.55;cursor:default}.cr .err{color:#9b2c1d;font-size:14px}' +
    '.cr .low{margin-top:14px;padding-top:10px;border-top:1px solid #e2dacb;font-size:13px;color:#5b5446}.cr .low b{font-weight:normal;color:#22201b}' +
    '@media (prefers-color-scheme:dark){.cr-back{background:rgba(16,19,24,.86)}.cr{background:#171b21;color:#e9e4d8;border-color:#39404b}.cr .who,.cr .low{color:#a9a293}.cr .low b{color:#e9e4d8}.cr .low{border-color:#2b313a}.cr button{background:#7fae8f;border-color:#7fae8f;color:#10140f}.cr button.q{background:transparent;color:#a8d3b5}}';
  function el(tag, cls, words) { var e = document.createElement(tag); if (cls) e.className = cls; if (words != null) e.textContent = words; return e; }
  function button(words, quiet, act) {
    var b = el('button', quiet ? 'q' : '', words);
    b.type = 'button';
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(card.querySelectorAll('button'), function (x) { x.disabled = true; });
      var err = card.querySelector('.err'); if (err) err.textContent = '';
      Promise.resolve().then(act).catch(function (e) { paint(e && e.message ? e.message : String(e)); });
    });
    return b;
  }
  function buy(product) {
    var f = document.createElement('form');
    f.method = 'post'; f.action = state.machine + '/share/' + encodeURIComponent(product);
    var i = document.createElement('input'); i.type = 'hidden'; i.name = 'buyer_agent_id'; i.value = state.name; f.appendChild(i);
    document.body.appendChild(f); f.submit();
  }
  function play() {
    var back = card && card.parentNode; if (back) back.parentNode.removeChild(back);
    card = null;
    var g = document.getElementById('game') || document.querySelector('iframe'); if (g) g.focus();
  }
  function paint(error) {
    var s = state, back = card ? card.parentNode : null;
    if (!back) {
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      back = el('div', 'cr-back'); card = el('div', 'cr'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', s.title + ': a go');
      back.appendChild(card); document.body.appendChild(back);
    }
    card.textContent = '';
    card.appendChild(el('div', 't', s.test ? 'credits · Stripe test mode · no real money moves' : 'credits'));
    card.appendChild(el('h2', '', s.title));
    var who = el('p', 'who'); who.appendChild(document.createTextNode('Playing as ' + s.name + ' · '));
    var not = el('a', '', 'not you?'); not.href = '#'; not.addEventListener('click', function (e) {
      e.preventDefault();
      var n = String(window.prompt('Your name on the beach, exactly as it stands:', '') || '').trim();
      if (HANDLE.test(n)) { s.name = n; refresh(); }
    });
    who.appendChild(not); card.appendChild(who);
    var go = s.go === 1 ? '1 credit' : s.go + ' credits';
    if (s.freeLeft > 0 && s.fundLeft >= s.go) {
      card.appendChild(el('p', '', 'Your first ' + s.free + ' goes are free: other people put credits in for players who have put nothing in yet. This is free go ' + (s.free - s.freeLeft + 1) + ' of ' + s.free + ', and its ' + go + ' lands with the game’s makers.'));
      card.appendChild(button('Play this go, free', false, function () {
        return post('/credits/draw', { product: s.fund, holder: s.name }).then(play);
      }));
    } else if (s.mine >= s.go) {
      card.appendChild(el('p', '', (s.freeLeft > 0 ? 'The fund for free goes is empty just now. ' : 'Your free goes are used. ') + 'A go is ' + go + ', and you hold ' + s.mine + '. It lands with the game’s makers the moment you start.'));
      card.appendChild(button('Play this go: ' + go, false, function () { return giveGo(s.name).then(play); }));
    } else {
      card.appendChild(el('p', '', (s.freeLeft > 0 ? 'The fund for free goes is empty just now, and ' : 'Your free goes are used, and ') + 'a go is ' + go + '. You hold ' + (s.mine || 'none') + '.'));
    }
    card.appendChild(button(s.ownTitle + (s.test ? ' (test card)' : ''), true, function () { buy(s.own); }));
    card.appendChild(button(s.fundTitle + (s.test ? ' (test card)' : ''), true, function () { buy(s.fund); }));
    if (error) card.appendChild(el('p', 'err', error)); else card.appendChild(el('p', 'err', ''));
    var low = el('div', 'low');
    var landed = s.makers.map(function (m) { return m + ' ' + (s.landed[m] || 0); }).join(' · ');
    low.appendChild(el('p', '', 'Every credit spent on a go of ' + s.title + ' lands with its makers, as its law names them, split equally: ' + (landed || 'nobody named yet') + '. The fund for free goes holds ' + s.fundLeft + '.'));
    var bk = el('p', ''); bk.appendChild(document.createTextNode('Every move stands in the ticket machine’s book, '));
    var a = el('a', '', 'credits:' + s.issuer); a.href = WK + '?block=' + encodeURIComponent('credits:' + s.issuer); a.target = '_blank'; a.rel = 'noopener';
    bk.appendChild(a); bk.appendChild(document.createTextNode(', written by the machine alone: what anyone holds is what came to them less what went, in its order.'));
    low.appendChild(bk); card.appendChild(low);
    var first = card.querySelector('button:not([disabled])'); if (first && !error) first.focus();
  }
  function refresh() {
    var s = state;
    return read('credits:' + s.issuer).then(function (book) {
      var lines = linesOf(book), fund = 'fund:' + s.fund;
      var mine = {}; lines.forEach(function (l) { if (l.from === fund && l.warrant === s.name) mine[l.id] = 1; });
      s.lines = lines;
      s.mine = held(lines, s.name);
      s.freeLeft = Math.max(0, s.free - Object.keys(mine).length);
      s.fundLeft = held(lines, fund);
      s.landed = {};
      lines.forEach(function (l) { if (l.point === GAME && s.makers.indexOf(l.to) >= 0) s.landed[l.to] = round((s.landed[l.to] || 0) + l.n); });
      paint();
    }, function (e) { paint('The book could not be read: ' + e.message); });
  }

  function boot() {
    read('function:' + GAME).then(function (law) {
      var words = lineOf(law, 'credits'), makers = namesIn(lineOf(law, 'makers'));
      if (!words || !makers.length) return;
      var machine = machineOf(words), products = namesIn(words.split(/\sat\s/)[0] || '').filter(function (p) { return /^[a-z0-9][a-z0-9-]{0,63}$/.test(p); });
      if (!machine || products.length < 2) return;
      return Promise.all(products.map(function (p) { return terms(machine, p); })).then(function (all) {
        var own = all.filter(function (t) { return t && t.credits && t.credits.to === 'buyer'; })[0];
        var fund = all.filter(function (t) { return t && t.credits && t.credits.to === 'pool' && t.credits.point === GAME; })[0];
        if (!own || !fund || own.issuer !== fund.issuer) return;
        state = {
          machine: machine, test: /^http:\/\/(localhost|127\.0\.0\.1)/.test(machine), issuer: fund.issuer,
          own: own.id, ownTitle: own.title || own.id, fund: fund.id, fundTitle: fund.title || fund.id,
          free: fund.credits.free, go: fund.credits.go, makers: makers, title: (document.title.split(/\s[—–-]\s/)[0] || GAME),
          name: nameNow() || propose(), lines: [], mine: 0, freeLeft: 0, fundLeft: 0, landed: {},
        };
        return refresh();
      });
    }).catch(function () {});   // a law or a machine that does not answer leaves the game as it was
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
