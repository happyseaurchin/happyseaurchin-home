/* says.js — comments on a page's parts, as a kit any page carries (24 Oct 2026).
 *
 * Each page that took comments on its parts carried its own copy of the same code (Nearly There, Who owns
 * the shell?, the proposals). This is that code once, so a page plugs it in instead of rebuilding it
 * (David, 24 Oct: "a minimal system that this kind of comment spine mirror structure can be inserted as a
 * kind of kit"). A page loads it after theme.js, whose keepDraft and dictate every write box carries:
 *
 *   <script src="/says.js"></script>
 *   <script>beachSays.timed({ family, scenes, player, controls })</script>
 *
 * THE TIMED KIND, for a film that plays scene after scene. One button under the film's controls,
 * 'Comment on this scene', opens the comment window for the scene now showing, at any moment, playing or
 * paused: the comment belongs to that scene. The film waits while the window is open and goes on when it
 * closes. It never stops by itself at a scene's end to ask (David, 24 Oct: "too confusing … no auto stop
 * for comments"): a person pauses when they want, or comments as it plays. The window holds the comment
 * the person has already made on that scene, so commenting again starts from it and the new words take
 * its place, and everyone else's are beneath it.
 *   family    the family's name: spine:<family> must stand on the beach, its scenes down 1
 *   scenes    the scenes' names, in order; scene i says at 1, 1.1, 1.11 … (i ones after the point)
 *   player    the film's side, a few calls the page gives: current() the scene showing, playing(),
 *             play(), pause(), and onChange(fn) where fn(i) hears each change of scene
 *   controls  the row the comment button follows
 *   buttonClass   the page's own class for a button, so the comment button wears its look
 *   unit, noun   'scene' and 'comment' unless the page says otherwise; room, a pool to link at the end
 * Colours come from the page's own --paper, --panel, --ink, --ink-2, --rule; it sets --says-accent for
 * the kit's one colour of its own, and --says-* to change any other.
 *
 * Where the comments stand: each in its sayer's own mirror, <family>:<handle>, at the scene's address on
 * spine:<family>, written through the beach's voice (button/voice.js, loaded here where the page has
 * not). The handle is typed in the window, or is the one this device already signs with; the key is the
 * browser's to ask for, kept on the device and sent only to the beach, so the page never holds it.
 * Everyone's are read back through /api/mirrors, the sayer's own mirror fresh beside them, and the beach
 * straight where that read cannot be had; a shared reading, the bare block <family> at the same address,
 * shows above them where anyone's own AI has kept one. The kit never synthesises.
 */
(function () {
  'use strict';
  if (window.beachSays) return;
  var BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var VOICE = 'https://beach.happyseaurchin.com/button/voice.js';
  var SHOWN = 6;   /* comments listed at once; the rest are one tap down */

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function clean(v, typing) { return (window.cleanHandle ? window.cleanHandle(v, typing) : String(v || '').replace(/[^A-Za-z0-9_\s-]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 32); }
  function esc(s) { var d = document.createElement('span'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function voiceOf(n) { while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; } return typeof n === 'string' ? n.trim() : ''; }
  function textOf(n) { return typeof n === 'string' ? n.trim() : voiceOf(n); }
  function nodeAt(b, addr) { var n = b, ds = String(addr).replace('.', '').split(''); for (var i = 0; i < ds.length; i++) { if (!n || typeof n !== 'object') return undefined; n = n[ds[i]]; } return n; }
  /* a comment set into a copy of a mirror as the beach sets it: a line standing where another nests beneath moves to its underscore */
  function put(b, addr, text) {
    var ds = String(addr).replace('.', '').split(''), n = b;
    for (var i = 0; i < ds.length - 1; i++) {
      var k = ds[i];
      if (typeof n[k] === 'string') n[k] = { _: n[k] }; else if (!n[k] || typeof n[k] !== 'object') n[k] = {};
      n = n[k];
    }
    var last = ds[ds.length - 1];
    if (n[last] && typeof n[last] === 'object') n[last]._ = text; else n[last] = text;
  }
  /* the address of the i-th part down the spine's 1: 1, 1.1, 1.11 … */
  function address(i) { return i > 0 ? '1.' + new Array(i + 1).join('1') : '1'; }
  function readBlock(name) {
    return fetch(BEACH + '?block=' + encodeURIComponent(name), { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('the beach answered ' + r.status);
      return r.json();
    });
  }

  /* ── the beach's voice, loaded here where the page has not ── */
  var voiceP = null;
  function away() { return Promise.resolve({ ok: false, error: 'the beach could not be reached just now' }); }
  function voice() {
    if (voiceP) return voiceP;
    voiceP = new Promise(function (done) {
      if (window.beachVoice) { done(window.beachVoice); return; }
      var s = document.createElement('script');
      s.src = VOICE; s.async = true;
      s.onload = function () { done(window.beachVoice || null); };
      s.onerror = function () { done(null); };
      (document.body || document.head || document.documentElement).appendChild(s);
    }).then(function (v) { return v || { say: away, button: { shown: function () { return false; } }, onButton: function () {} }; });
    return voiceP;
  }
  function buttonShown() { var v = window.beachVoice; return !!(v && v.button && v.button.shown && v.button.shown()); }

  /* ── a family: everyone's mirrors of it, read together ── */
  var ME = clean(store.get('render:who') || '');
  var FAMS = {};
  function family(name) {
    if (FAMS[name]) return FAMS[name];
    var f = FAMS[name] = { name: name, mirrors: {}, touched: {}, fold: null, state: 'reading', readAt: 0, heard: [] };
    var inFlight = null;
    function tell() {
      f.heard.forEach(function (fn) { try { fn(); } catch (e) {} });
      if (win && win.cur && win.cur.f === f) paintWindow();
    }
    f.onRead = function (fn) { f.heard.push(fn); };
    /* every mirror and the fold as one read the site keeps a few seconds for a crowd (api/mirrors); where
       that can't be had, the beach read straight; and the sayer's own mirror always read fresh beside it */
    f.read = function () {
      if (inFlight) return inFlight;
      inFlight = fetch('/api/mirrors?family=' + encodeURIComponent(name), { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.ok ? r.json().then(function (d) { f.fold = d.fold || null; f.touched = d.touched || {}; return d.mirrors || {}; }) : null; }, function () { return null; })
        .then(function (got) {
          if (got) return got;
          return fetch(BEACH, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (ix) {
            var touched = ix.touched || {}, out = {}, stamps = {};
            var names = (ix.blocks || []).map(function (b) { return typeof b === 'string' ? b : (b && b.name) || ''; })
              .filter(function (n) { return n.indexOf(name + ':') === 0 && n.indexOf(':', name.length + 1) < 0; });
            return Promise.all(names.map(function (n) {
              return readBlock(n).then(function (b) { if (!b) return; var h = n.slice(name.length + 1); out[h] = b; if (touched[n]) stamps[h] = touched[n]; }, function () {});
            }).concat(readBlock(name).then(function (fo) { f.fold = fo; }, function () {}))).then(function () { f.touched = stamps; return out; });
          });
        })
        .then(function (got) {
          if (!ME) return got;
          return readBlock(name + ':' + ME).then(function (own) { if (own) got[ME] = own; return got; }, function () { return got; });
        })
        .then(function (got) { f.mirrors = got; f.state = 'read'; f.readAt = Date.now(); }, function () { f.state = 'failed'; })
        .then(function () { inFlight = null; tell(); });
      return inFlight;
    };
    f.fresh = function (ms) { return f.state !== 'reading' && Date.now() - f.readAt < ms; };
    /* everyone's at a part, the sayer's own first, then the latest */
    f.at = function (addr) {
      var out = [];
      Object.keys(f.mirrors).forEach(function (h) {
        var t = textOf(nodeAt(f.mirrors[h], addr));
        if (t) out.push({ who: h, text: t, when: f.touched[h] || '' });
      });
      return out.sort(function (a, b) { return (b.who === ME) - (a.who === ME) || String(b.when).localeCompare(String(a.when)) || a.who.localeCompare(b.who); });
    };
    f.mine = function (addr) { return ME && f.mirrors[ME] ? textOf(nodeAt(f.mirrors[ME], addr)) : ''; };
    f.foldAt = function (addr) { return f.fold ? voiceOf(nodeAt(f.fold, addr)) : ''; };
    f.say = function (addr, text, as) {
      return voice().then(function (v) { return v.say({ field: name, at: addr, text: text, name: as || undefined }); }).then(function (r) {
        if (r && r.ok) {
          ME = clean(r.name || as || ME); if (ME) store.set('render:who', ME);
          put(f.mirrors[ME] || (f.mirrors[ME] = {}), addr, text);   /* it shows at once; the read after confirms it from the beach */
          tell();
          f.read();
        }
        return r;
      });
    };
    return f;
  }

  function errText(r, noun) {
    var code = r && r.code;
    if (code === 'lock_required' || code === 'handle_bound' || (r && r.status === 403)) return 'That handle’s words are kept under another key. If it’s yours, try again with the key you used before. Your ' + noun + ' is still here.';
    return 'Not added: ' + ((r && r.error) || 'the beach did not answer') + '. Your ' + noun + ' is still here.';
  }

  /* ── the look: the page's own colours and type, and one accent of the kit's ── */
  var CSS = [
    ':where(:root){--says-paper:var(--paper,#fff);--says-panel:var(--panel,#f3f4f5);--says-ink:var(--ink,#16202c);--says-ink-2:var(--ink-2,#56616c);--says-rule:var(--rule,#c8ced3);',
    '--says-accent:var(--say,#6a40c9);--says-accent-soft:color-mix(in srgb,var(--says-accent) 50%,transparent);--says-accent-glow:color-mix(in srgb,var(--says-accent) 70%,transparent);',
    '--says-accent-tint:color-mix(in srgb,var(--says-accent) 9%,transparent);--says-accent-ring:color-mix(in srgb,var(--says-accent) 26%,transparent);--says-ink-tint:color-mix(in srgb,var(--says-ink) 5%,transparent);',
    '--says-err:var(--err,#b8402b);--says-display:var(--display,var(--font-display,Georgia,"Times New Roman",serif));--says-text:var(--body,var(--font-text,system-ui,-apple-system,"Segoe UI",sans-serif));--says-mono:var(--mono,var(--font-mono,ui-monospace,Menlo,monospace))}',
    '@media (prefers-color-scheme:dark){:where(:root:not([data-theme="light"])){--says-accent:var(--say,#ad93ff);--says-err:var(--err,#ff8f78)}}',
    ':where(:root[data-theme="dark"]){--says-accent:var(--say,#ad93ff);--says-err:var(--err,#ff8f78)}',
    /* the row under the film's controls */
    '.says-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
    '.says-bar .says-sp{flex:1 1 0;min-width:0}',
    '.says-open{display:inline-flex;align-items:center;gap:9px}',
    '.says-open i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--says-accent);box-shadow:0 0 8px var(--says-accent-glow)}',
    '.says-open .says-n{font-variant-numeric:tabular-nums;color:var(--says-ink-2)}',
    '.says-open.said i{background:transparent;box-shadow:none;border:2px solid var(--says-accent);box-sizing:border-box;width:10px;height:10px}',
    '.says-open:focus-visible,.says-on:focus-visible,.says-x:focus-visible,.says-send:focus-visible{outline:2px solid var(--says-accent);outline-offset:2px}',
    '.says-on{border:1px solid var(--says-rule);background:var(--says-panel);color:var(--says-ink);border-radius:999px;padding:0 17px;min-height:38px;cursor:pointer;font:500 14px/1 var(--says-text)}',
    '.says-on:hover{border-color:var(--says-ink-2)}',
    /* the window */
    '.says-panel{box-sizing:border-box;width:min(600px,calc(100vw - 24px));max-width:none;max-height:min(90vh,920px);margin:auto;padding:0;overflow:auto;overscroll-behavior:contain;',
    'border:1px solid var(--says-accent-soft);border-radius:20px;background:var(--says-panel);color:var(--says-ink);box-shadow:0 30px 90px -40px var(--says-accent-glow);',
    'font:16px/1.5 var(--says-text);animation:says-in .32s cubic-bezier(.2,.7,.1,1) both}',
    '.says-panel::backdrop{background:rgba(8,13,17,.42);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}',
    '.says-card{padding:18px 22px 22px}.says-card:focus{outline:none}',
    '.says-top{display:flex;align-items:center;justify-content:space-between;gap:12px}',
    '.says-lbl{margin:0;font:500 11px/1.35 var(--says-mono);letter-spacing:.13em;text-transform:uppercase;color:var(--says-accent)}',
    '.says-x{flex:none;border:0;background:none;color:var(--says-ink-2);font-size:1.55rem;line-height:1;padding:2px 9px 5px;border-radius:9px;cursor:pointer}',
    '.says-x:hover{color:var(--says-ink);background:var(--says-ink-tint)}',
    '.says-q{margin:8px 0 14px;font:500 clamp(1.4rem,3.6vw,1.8rem)/1.12 var(--says-display)}',
    '.says-q span{display:block;margin-top:7px;font:400 1rem/1.5 var(--says-text);color:var(--says-ink-2)}',
    '.says-field{position:relative}',
    '.says-card textarea{box-sizing:border-box;display:block;width:100%;min-height:120px;resize:vertical;margin:0;padding:12px 14px;border-radius:12px;',
    'border:1px solid var(--says-rule);background:var(--says-ink-tint);color:var(--says-ink);font:400 1.02rem/1.5 var(--says-text)}',
    '.says-card textarea:focus,.says-as input:focus{outline:none;border-color:var(--says-accent);box-shadow:0 0 0 3px var(--says-accent-ring)}',
    '.says-as{margin:14px 0 0;font-size:1rem;color:var(--says-ink-2)}',
    '.says-as label{display:grid;gap:7px;font:500 11px/1.3 var(--says-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--says-ink-2)}',
    '.says-as input{box-sizing:border-box;width:min(320px,100%);padding:9px 12px;border-radius:10px;border:1px solid var(--says-rule);background:var(--says-ink-tint);',
    'color:var(--says-ink);font:400 1.02rem/1.3 var(--says-text);letter-spacing:0;text-transform:none}',
    '.says-as b{color:var(--says-ink);font-weight:700}',
    '.says-as small{display:block;margin-top:6px;font:400 .9rem/1.45 var(--says-text);letter-spacing:0;text-transform:none;color:var(--says-ink-2)}',
    '.says-linkish{border:0;padding:0;background:none;font:inherit;color:var(--says-accent);cursor:pointer;text-decoration:underline;text-decoration-color:var(--says-accent-soft);text-underline-offset:3px}',
    '.says-go{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;margin-top:16px}',
    '.says-send{flex:none;border:0;border-radius:999px;padding:11px 22px;background:var(--says-accent);color:var(--says-panel);font:700 1rem/1 var(--says-text);cursor:pointer}',
    '.says-send:hover{filter:brightness(1.08)}.says-send:disabled{opacity:.55;cursor:progress}',
    '.says-key{flex:1 1 230px;margin:0;font-size:.88rem;line-height:1.45;color:var(--says-ink-2)}',
    '.says-hint{margin:12px 0 0;font-size:.96rem;line-height:1.45;color:var(--says-ink-2)}.says-hint:empty{margin:0}',
    '.says-hint.ok{color:var(--says-accent)}.says-hint.err{color:var(--says-err)}',
    '.says-reading{margin:18px 0 0;padding:12px 14px;border-radius:12px;background:var(--says-accent-tint);border:1px solid var(--says-accent-ring)}',
    '.says-reading p{margin:5px 0 0;font-size:1rem;line-height:1.5;color:var(--says-ink)}.says-reading .says-label{margin:0}',
    '.says-label{margin:0 0 10px;font:500 11px/1.3 var(--says-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--says-ink-2)}',
    '.says-others{margin:22px 0 0;padding-top:16px;border-top:1px dashed var(--says-rule)}',
    '.says-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}',
    '.says-list li{padding:10px 13px 11px;border-radius:12px;border:1px solid var(--says-rule);font-size:1rem;line-height:1.5;color:var(--says-ink-2);overflow-wrap:anywhere;white-space:pre-line}',
    '.says-list li.mine{border-color:var(--says-accent-soft)}',
    '.says-list .who{display:block;margin-bottom:3px;font:500 11px/1.3 var(--says-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--says-ink-2);white-space:normal}',
    '.says-list li.mine .who{color:var(--says-accent)}.says-list li.empty{border-style:dashed;font-style:italic}',
    '.says-more{margin-top:10px}',
    '.says-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;margin-top:20px}',
    '.says-room{font:500 12px/1.3 var(--says-mono);letter-spacing:.05em;color:var(--says-accent)}',
    /* the site's dictation glyph (theme.js dictate), drawn here for a page that has no theme.css */
    '.says-card .dictate{position:absolute;z-index:2;width:22px;height:22px;margin:0;padding:0;display:flex;align-items:center;justify-content:center;',
    'background:var(--says-panel);border:1px solid var(--says-rule);border-radius:50%;color:var(--says-ink-2);cursor:pointer;box-sizing:border-box}',
    '.says-card .dictate svg{width:13px;height:13px;fill:currentColor;display:block}',
    '.says-card .dictate:hover{color:var(--says-ink);border-color:var(--says-ink-2)}',
    '.says-card .dictate.on{color:var(--says-accent);border-color:var(--says-accent-soft);animation:says-pulse 1.6s ease-in-out infinite}',
    '.says-card .dictate[hidden]{display:none}',
    '@media (max-width:560px){.says-panel{width:100%;max-width:100%;max-height:92vh;margin:auto 0 0;border-radius:18px 18px 0 0;border-bottom:0}',
    '.says-card{padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px))}}',
    '@keyframes says-in{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes says-pulse{0%,100%{box-shadow:0 0 0 0 var(--says-accent-soft)}50%{box-shadow:0 0 0 7px transparent}}',
    '@media (prefers-reduced-motion:reduce){.says-panel{animation:none!important}.says-card .dictate.on{animation:none;box-shadow:0 0 0 3px var(--says-accent-ring)}}'
  ].join('\n');
  var styled = false;
  function style() {
    if (styled) return; styled = true;
    var st = document.createElement('style');
    st.setAttribute('data-says', '');
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ── the window: one for the page, opened at one part at a time ── */
  var win = null;
  function windowFor() {
    if (win) return win;
    style();
    var d = document.createElement('dialog');
    d.className = 'says-panel';
    d.innerHTML =
      '<div class="says-card" tabindex="-1">' +
        '<div class="says-top"><p class="says-lbl"></p><button type="button" class="says-x" aria-label="Close">×</button></div>' +
        '<p class="says-q"></p>' +
        '<div class="says-field"></div>' +
        '<div class="says-as"></div>' +
        '<div class="says-go"><button type="button" class="says-send">Add it</button>' +
          '<p class="says-key">It stands under your handle, in your own mirror on the beach. The first time, your browser asks for your key and keeps it on this device; it goes only to the beach.</p></div>' +
        '<p class="says-hint" aria-live="polite"></p>' +
        '<div class="says-reading" hidden></div>' +
        '<div class="says-others"><p class="says-label"><span class="says-ol"></span><span class="says-count"></span></p><ul class="says-list" aria-live="polite"></ul>' +
          '<button type="button" class="says-linkish says-more" hidden></button></div>' +
        '<div class="says-foot"><span class="says-roomline"></span><button type="button" class="says-on"></button></div>' +
      '</div>';
    document.body.appendChild(d);
    win = { el: d, card: d.querySelector('.says-card'), cur: null };
    /* what the page listens for (a film's arrows and space bar) is not heard while the window is open */
    d.addEventListener('keydown', function (e) { e.stopPropagation(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    d.querySelector('.says-x').addEventListener('click', function () { d.close(); });
    d.querySelector('.says-more').addEventListener('click', function () { if (win.cur) { win.cur.all = true; paintWindow(); } });
    d.querySelector('.says-on').addEventListener('click', function () { var c = win.cur; if (c) c.onward = true; d.close(); });
    d.querySelector('.says-send').addEventListener('click', send);
    d.addEventListener('close', function () {
      var c = win.cur; win.cur = null;
      clearInterval(win.poll);
      if (c && c.closed) c.closed(!!c.onward);
    });
    return win;
  }
  function tell(cls, t) { var h = win.el.querySelector('.says-hint'); h.className = 'says-hint' + (cls ? ' ' + cls : ''); h.textContent = t || ''; }
  function paintAs() {
    var el = win.el.querySelector('.says-as');
    if (buttonShown()) { el.textContent = 'Adding it through your beach button.'; return; }
    if (ME) {
      el.innerHTML = 'Adding it as <b>' + esc(ME) + '</b> · <button type="button" class="says-linkish says-notme">not you?</button>';
      el.querySelector('.says-notme').addEventListener('click', function () {
        ME = ''; store.del('render:who'); paintAs(); repaintAll();
        var i = el.querySelector('input'); if (i) i.focus();
      });
      return;
    }
    if (el.querySelector('input')) return;
    el.innerHTML = '<label>Your handle on the beach<input class="says-me" autocomplete="username" spellcheck="false" autocapitalize="off" maxlength="32" placeholder="your handle"></label>' +
      '<small>New here? Choose one: letters, digits, - or _. The browser then asks you to choose a key for it.</small>';
    var input = el.querySelector('input');
    input.addEventListener('input', function () { var c = clean(input.value, true); if (c !== input.value) input.value = c; });
  }
  function paintWindow() {
    var c = win.cur; if (!c) return;
    var f = c.f, list = f.at(c.at), mine = f.mine(c.at), noun = c.noun;
    var fold = f.foldAt(c.at), rd = win.el.querySelector('.says-reading');
    rd.hidden = !fold;
    rd.innerHTML = fold ? '<p class="says-label">The shared reading, so far</p><p>' + esc(fold) + '</p>' : '';
    var ul = win.el.querySelector('.says-list');
    if (!list.length) ul.innerHTML = '<li class="empty">' + (f.state === 'reading' ? 'Reading what others have said…' : f.state === 'failed' ? 'The beach couldn’t be read just now.' : 'Nobody has added a ' + esc(noun) + ' here yet. Be the first.') + '</li>';
    else ul.innerHTML = (c.all ? list : list.slice(0, SHOWN)).map(function (s) {
      return '<li' + (s.who === ME ? ' class="mine"' : '') + '><span class="who">' + esc(s.who) + (s.who === ME ? ' · you' : '') + '</span>' + esc(s.text) + '</li>';
    }).join('');
    var more = win.el.querySelector('.says-more');
    more.hidden = !!c.all || list.length <= SHOWN;
    more.textContent = 'Show all ' + list.length;
    win.el.querySelector('.says-count').textContent = list.length ? ' · ' + list.length : '';
    /* once the beach is read, the box starts with their own last words here, when it holds nothing else */
    var box = win.el.querySelector('textarea');
    if (f.state === 'read' && !c.filled) { c.filled = true; if (mine && !box.value) box.value = mine; }
    win.el.querySelector('.says-send').textContent = mine ? 'Change mine' : 'Add it';
    paintAs();
  }
  function send() {
    var c = win.cur; if (!c) return;
    var box = win.el.querySelector('textarea'), btn = win.el.querySelector('.says-send'), text = box.value.trim();
    if (!text) { tell('err', 'Write something first.'); box.focus(); return; }
    var typed = win.el.querySelector('.says-as input');
    var me = ME || (typed ? clean(typed.value) : '');
    if (!me && !buttonShown()) { tell('err', 'Give your handle first. It is how your words are signed.'); if (typed) typed.focus(); return; }
    if (me === ME && text === c.f.mine(c.at)) { tell('ok', 'That is what your ' + c.noun + ' here already reads.'); return; }
    btn.disabled = true; tell('', 'Adding it on the beach…');
    c.f.say(c.at, text, me).then(function (r) {
      if (r && r.ok) c.clear();
      if (win.cur !== c) return;
      if (!r || !r.ok) {
        if (r && r.needName) { tell('err', r.error); if (typed) typed.focus(); return; }
        tell('err', r && r.quiet ? 'Not added: no key was given. Your ' + c.noun + ' is still here.' : errText(r, c.noun));
        return;
      }
      tell('ok', 'Added. It stands in your own mirror on the beach, under ' + ME + '. Add again here whenever you like, and the new words take its place.');
      paintWindow();
    }, function (e) { tell('err', 'Couldn’t reach the beach: ' + ((e && e.message) || e) + '. Your ' + c.noun + ' is still here.'); })
      .then(function () { btn.disabled = false; });
  }
  /* open the window at one part: { f, at, label, of, noun, ask, onwardLabel, room, closed(onward), toList } */
  function openWindow(c) {
    windowFor();
    if (win.el.open) return;   /* one window at a time: the page behind it is inert while it is open */
    win.cur = c;
    var d = win.el;
    d.setAttribute('aria-label', 'Your ' + c.noun + ' on ' + c.label);
    d.querySelector('.says-lbl').textContent = c.of + ' · ' + c.label;
    d.querySelector('.says-q').innerHTML = esc(c.ask[0]) + '<span>' + esc(c.ask[1]) + '</span>';
    d.querySelector('.says-ol').textContent = 'Everyone’s ' + c.noun + 's here';
    d.querySelector('.says-on').textContent = c.onwardLabel || 'Close';
    d.querySelector('.says-roomline').innerHTML = c.room ? '<a class="says-room" href="' + esc(c.room) + '">The whole of it, in its room →</a>' : '';
    /* a fresh box for each part, its draft kept under where its words are going */
    var field = d.querySelector('.says-field');
    field.innerHTML = '<textarea maxlength="1500" placeholder="In your own words…"></textarea>';
    var box = field.querySelector('textarea');
    box.setAttribute('aria-label', 'Your ' + c.noun + ' on ' + c.label);
    c.clear = window.keepDraft ? window.keepDraft(box, c.f.name + ':' + c.at) : function () {};
    tell('', '');
    paintWindow();
    d.showModal();
    if (window.dictate) window.dictate(box);
    var fine = !!(window.matchMedia && matchMedia('(pointer: fine)').matches);
    try { (fine && !c.toList ? box : win.card).focus({ preventScroll: true }); } catch (e) {}
    d.scrollTop = 0;
    if (c.toList) { var o = d.querySelector('.says-others'); d.scrollTop = Math.max(0, o.offsetTop - 12); }
    if (!c.f.fresh(20000)) c.f.read();
    /* while it is open, what others add comes in as they add it */
    win.poll = setInterval(function () { if (!document.hidden) c.f.read(); }, 45000);
  }
  var painters = [];
  function repaintAll() { painters.forEach(function (fn) { try { fn(); } catch (e) {} }); if (win && win.cur) paintWindow(); }

  /* ── the timed kind: a film, scene after scene ── */
  function timed(cfg) {
    style();
    var f = family(cfg.family), p = cfg.player, names = cfg.scenes || [], n = names.length;
    var unit = cfg.unit || 'scene', noun = cfg.noun || 'comment';
    var Unit = unit.charAt(0).toUpperCase() + unit.slice(1);

    var row = document.createElement('div');
    row.className = 'says-bar';
    row.innerHTML = '<button type="button" class="' + esc(cfg.buttonClass || '') + ' says-open"><i aria-hidden="true"></i>' +
      '<span>' + esc(noun.charAt(0).toUpperCase() + noun.slice(1)) + ' on this ' + esc(unit) + '</span><span class="says-n"></span></button>';
    cfg.controls.parentNode.insertBefore(row, cfg.controls.nextSibling);
    var openBtn = row.querySelector('.says-open');

    function label(i) { return names[i] || (Unit + ' ' + (i + 1)); }
    function of(i) { return Unit + ' ' + (i + 1) + ' of ' + n; }
    function paintRow() {
      var i = p.current(), at = address(i), all = f.at(at).length, mine = f.mine(at);
      openBtn.querySelector('.says-n').textContent = all ? ' · ' + all : '';
      openBtn.classList.toggle('said', !!mine);
      openBtn.setAttribute('aria-label', (mine ? 'Change your ' : 'Add a ') + noun + ' on ' + unit + ' ' + (i + 1) + ', ' + label(i) + (all ? '; ' + all + ' so far' : ''));
    }
    painters.push(paintRow);
    f.onRead(paintRow);

    /* the window at the scene showing; the film waits while it is open, and goes on if it was playing */
    openBtn.addEventListener('click', function () {
      if (win && win.el.open) return;
      var i = p.current(), wasPlaying = p.playing();
      if (wasPlaying) p.pause();
      openWindow({
        f: f, at: address(i), label: label(i), of: of(i), noun: noun, room: cfg.room,
        ask: ['Your ' + noun + ' on this ' + unit, 'What struck you, a question, what you’d change, or what it brings to mind, in your own words.'],
        onwardLabel: wasPlaying ? 'Keep watching ›' : 'Close',
        closed: function () { paintRow(); if (wasPlaying) p.play(); }
      });
    });
    p.onChange(paintRow);
    paintRow();
    f.read();
    voice().then(function (v) { if (v.onButton) v.onButton(function () { if (win && win.cur) paintAs(); }); });
    return { family: f };
  }

  window.beachSays = { timed: timed, family: family, address: address, voice: voice };
})();
