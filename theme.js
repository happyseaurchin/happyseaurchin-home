/* theme.js — pick the register before first paint, and give the reader the switch.
 *
 * Loaded SYNCHRONOUSLY in <head>, above everything: the attribute has to be on
 * <html> before the first paint or the page flashes the wrong register on every
 * load, which is worse than not offering the choice at all.
 *
 * A stored choice always wins. With none stored, the reader's own system
 * preference decides — asking the operating system is better manners than
 * imposing a default and making them click.
 */
(function(){
  'use strict';
  var KEY = 'view:theme';

  function stored(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function prefersLight(){
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  }
  function apply(t){ document.documentElement.setAttribute('data-theme', t); }

  var saved = stored();
  apply(saved === 'light' || saved === 'dark' ? saved : (prefersLight() ? 'light' : 'dark'));

  function toggle(){
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem(KEY, next); } catch(e){}
  }

  /* Follow the system while the reader has expressed no preference of their own —
   * someone whose machine turns light at sunrise should find the page has too. */
  if (!stored() && window.matchMedia){
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onChange = function(e){ if (!stored()) apply(e.matches ? 'light' : 'dark'); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  document.addEventListener('DOMContentLoaded', function(){
    var own = document.getElementById('btn-theme');
    if (own){ own.addEventListener('click', toggle); return; }   /* the page has its own */
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'btn-theme';
    b.textContent = '◐';
    b.title = 'light or dark';
    b.setAttribute('aria-label', 'switch between the light and dark register');
    b.addEventListener('click', toggle);
    /* INTO THE BAR WHERE THERE IS ONE. Floating it at top:12px right:12px put it
     * over whatever the bar already had in that corner — and once 'go' was pinned
     * to the top right, directly on top of it, at a higher layer. A page's own
     * theme button has always lived in its bar; this makes the injected one behave
     * the same, which also means it gathers into 'options' like any other control
     * rather than being a floating exception nothing else knows about. */
    var bar = document.querySelector('.bar');
    if (bar){
      /* left of go, which owns the top-right corner on every page */
      var doors = bar.querySelector('details.dd[data-doors]');
      if (doors) bar.insertBefore(b, doors); else bar.appendChild(b);
    } else { b.className = 'theme-toggle'; document.body.appendChild(b); }
  });
})();

/* every page ends the same way: one of your own, and everyone else's.
 *
 * THIS FOOTER IS THE ONLY UNCONDITIONAL SURFACE ON THE SITE, which is why the
 * two doors nobody could find now stand here rather than in the places menu.
 * That menu is opt-in and, since 2026-09-08, shows only what a reader has
 * chosen — so it cannot carry discovery: a door you do not yet know exists
 * cannot live behind a list you would already have had to curate. Everyone
 * sees the footer, on every page, having chosen nothing. (David, 2026-09-09.)
 */
(function(){
  'use strict';
  /* WHICH DOOR "your own" MEANS IS DECIDED BY WHERE YOU STAND, and the path is
     the page, so there is no second source of truth to drift. A page whose
     subject is a FIELD — a walk, a recency or heatmap, a family's map, a fold —
     is showing somebody's project, so the thing to make is a field of your own.
     Anywhere else the offer stays the now, as it always was. The fault this
     closes: the link was hardcoded to /now everywhere, so a project walk offered
     to create a now — an answer to a question nobody standing there had asked. */
  var FIELD = { walk:1, recency:1, heatmap:1, tree:1, fold:1 };
  document.addEventListener('DOMContentLoaded', function(){
    if (document.getElementById('create-your-own')) return;
    var path = location.pathname.replace(/\/+$/, '');
    var onField = !!FIELD[(path.split('/')[1] || '').toLowerCase()];
    var p = document.createElement('p');
    p.id = 'create-your-own';
    p.style.cssText = 'display:flex;gap:22px;justify-content:center;flex-wrap:wrap;' +
      'text-align:center;font-family:var(--mono,monospace);font-size:12px;' +
      'letter-spacing:0.08em;padding:28px 16px 34px;margin:0;';
    function door(href, text){
      var a = document.createElement('a');
      a.href = href; a.textContent = text;
      p.appendChild(a);
    }
    door(onField ? 'https://happyseaurchin.com/found' : 'https://happyseaurchin.com/now',
         onField ? 'found a field of your own \u2192' : 'create your own \u2192');
    /* EVERY FIELD — the index of them all. Named for what it SHOWS, never for the
       route that happens to serve it: '/tree' is the plumbing and a reader never
       has to meet the word. Withheld on the index itself, where it would offer
       the page already open — the same courtesy the places menu pays. */
    if (path !== '/tree') door('https://happyseaurchin.com/tree', 'every field \u2192');
    document.body.appendChild(p);
  });
})();

/* ─────────────────────────────────────────────────────────────────────────────
 * keepDraft — a write box that a tick or a re-render can replace keeps its
 * draft on the device.
 *
 * That is the law, and the reason: the clock advances, the panel is rebuilt,
 * a live section is re-read on its tick — and the paragraph was gone mid-word
 * (recency, 2026-09-07; proposal:three-portals 3.2). So every keystroke lands
 * in localStorage under 'draft:' + key, a box built empty is refilled from
 * there, and the write that lands clears it:
 *
 *     var clear = keepDraft(textarea, FAMILY + ':' + HANDLE);
 *     ... the write lands: clear();
 *
 * The key names WHERE the words are going (family + hand, view + entry), never
 * the page, so the draft follows the box wherever the page rebuilds it. Storage
 * can be refused (private mode, a full quota): every access is wrapped, and a
 * refusal only means the draft is not kept — never a broken box.
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
  'use strict';
  function get(k){ try { return localStorage.getItem(k) || ''; } catch(e){ return ''; } }
  function set(k, v){ try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch(e){} }
  window.keepDraft = function(box, key){
    var k = 'draft:' + key;
    var clear = function(){ set(k, ''); };
    if (!box) return clear;
    if (!box.value){ var d = get(k); if (d) box.value = d; }
    box.addEventListener('input', function(){ set(k, box.value); });
    return clear;
  };
})();

/* ─────────────────────────────────────────────────────────────────────────────
 * dictate — every write box takes the voice as well as the keys.
 *
 * David's ruling (2026-09-07): add dictation. Browser-native — the Web Speech
 * API, SpeechRecognition or its webkit twin — so there is nothing to load and
 * nothing to pay. Chrome and Edge stream the audio to Google for the words;
 * Safari finds most of them on the device; Firefox has no API at all, so shows
 * no glyph. The tooltip says which, because a person should know where their
 * voice goes before they press.
 *
 *     window.dictate(textarea)   → the glyph, or null where there is no API
 *
 * A static box opts in with an attribute — <textarea data-dictate> — and is
 * wired on DOMContentLoaded; a box a page builds in script calls dictate(el)
 * right where it calls keepDraft. One glyph, laid over the box's own top-right
 * corner and never in its flow, so no page's layout moves (the box's right
 * padding is widened just enough that no word runs under it; the bottom-right
 * is left to the resize grip). Tap to listen, tap to stop; it also stops when
 * the box loses focus or the engine gives up for good.
 *
 * The words: what the engine has LOCKED is appended after whatever the box
 * held, a space between; the one phrase it is still revising rides at the end
 * with an ellipsis after it, and is replaced as it firms. Every change is an
 * input event on the box, so keepDraft keeps it and the page's own handlers
 * see it. Never a submit: Enter belongs to the page (recency and now say on
 * Enter — the marker is taken off the instant Enter is pressed, so what the
 * page reads is clean, and typing into the box mid-dictation simply re-bases
 * the session on what the box then holds).
 *
 * Ported from the mirror's use-speech-recognition (xstream-bsp), core only —
 * the interim is the LAST non-final entry, never their concatenation, and a
 * run of cumulative revisions collapses to the phrase it settled on: both are
 * phone faults, invisible on a desktop, paid for there (2026-08-09). Silence
 * ends a continuous session (sooner on a phone); it is restarted so dictation
 * survives the gap, with the locked phrases carried across the fold. A page
 * that rebuilds its box mid-dictation (recency on its tick, a view's live
 * section) hands the session to the successor the moment it wires it.
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
  'use strict';
  var MARK = '…';                      /* after the phrase still being revised */
  var SIZE = 22, INSET = 5;                 /* the glyph, and its distance from the corner */
  var TITLE = 'dictate — Chrome sends audio to Google for transcription; Safari transcribes mostly on device';
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4z"/>' +
    '<path d="M18 10a1 1 0 0 1 1 1 7 7 0 0 1-6 6.93V20h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.07A7 7 0 0 1 5 11a1 1 0 1 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 1-1z"/></svg>';
  var TERMINAL = { 'not-allowed':1, 'service-not-allowed':1, 'audio-capture':1, 'network':1, 'language-not-supported':1 };

  function ctor(){ return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

  /* compare on words alone — a revision may add capitals or punctuation the
   * draft did not have. Built, not written as a literal: a \p escape in the
   * source would be a parse error for an old browser, and this file paints the
   * register before anything else. */
  var STRIP;
  try { STRIP = new RegExp("[^\\p{L}\\p{N}\\s']", 'gu'); } catch(e){ STRIP = /[^\w\s']/g; }
  function wordsOf(s){ return s.toLowerCase().replace(STRIP, '').trim().replace(/\s+/g, ' '); }

  /* the phrases the engine has LOCKED, and the one hypothesis it is still
   * revising — the LAST non-final entry, never all of them glued together */
  function readResults(results){
    var finals = [], interim = '';
    for (var i = 0; i < results.length; i++){
      var r = results[i], t = r[0] ? (r[0].transcript || '') : '';
      if (r.isFinal) finals.push(t); else interim = t;
    }
    return { finals: finals, interim: interim };
  }

  /* an entry that merely EXTENDS the one before it is that entry rewritten,
   * not a new phrase; keep the last of each run */
  function collapse(parts){
    var runs = [];
    for (var i = 0; i < parts.length; i++){
      var t = (parts[i] || '').trim();
      if (!t) continue;
      if (runs.length){
        var a = wordsOf(t), b = wordsOf(runs[runs.length - 1]);
        if (a === b || a.indexOf(b + ' ') === 0){ runs[runs.length - 1] = t; continue; }
      }
      runs.push(t);
    }
    return runs;
  }

  /* the spoken words after what the box already held: a space between, unless
   * the box ended on a line break the writer put there */
  function glue(base, runs){
    var rest = runs.join(' ');
    if (!base) return rest;
    if (!rest) return base;
    return /\s$/.test(base) ? base + rest : base + ' ' + rest;
  }

  function inputEvent(){
    try { return new Event('input', { bubbles: true }); }
    catch(e){ var ev = document.createEvent('Event'); ev.initEvent('input', true, false); return ev; }
  }

  var active = null;   /* one microphone; one session at a time */

  window.dictate = function(box){
    if (!box || !('value' in box) || !box.parentNode) return null;
    if (!ctor()) return null;
    if (box._dictate) return box._dictate.button;

    var parent = box.parentNode;
    /* a span with the button role, not a <button>: every page dresses ITS
     * buttons for their row (.say button, .mirrorbox button …), and a glyph in
     * the corner of the box is not one of them */
    var btn = document.createElement('span');
    btn.className = 'dictate';
    btn.title = TITLE;
    btn.tabIndex = 0;
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'dictate');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = ICON;
    parent.insertBefore(btn, box.nextSibling);

    var rec = null, want = false, base = '', prior = [], finals = [];
    var written = null;       /* the last text this session put in the box */
    var writing = false;      /* while it is being put there */
    var startedAt = 0, heard = false, pending = null, anchored = false, seen = false;
    var api = { box: box, button: btn };

    /* ── the glyph over the corner ──────────────────────────────────────── */
    function place(){
      /* a box wired before it is attached (a part built and then appended) is
       * placed when it lands; one the page has since discarded lets go */
      if (!box.isConnected){ if (seen) window.removeEventListener('resize', place); return; }
      seen = true;
      var w = box.offsetWidth, h = box.offsetHeight;
      if (!w && !h){ btn.hidden = true; return; }
      btn.hidden = false;
      if (!anchored){
        anchored = true;
        var cs = getComputedStyle(parent);
        if (cs.position === 'static') parent.style.position = 'relative';
        var pr = parseFloat(getComputedStyle(box).paddingRight) || 0;
        if (pr < SIZE + INSET * 2) box.style.paddingRight = (SIZE + INSET * 2) + 'px';
      }
      btn.style.top = (box.offsetTop + INSET) + 'px';
      btn.style.left = (box.offsetLeft + w - SIZE - INSET) + 'px';
    }
    if (window.ResizeObserver){ var ro = new ResizeObserver(place); ro.observe(box); ro.observe(parent); }
    window.addEventListener('resize', place);
    box.addEventListener('focus', place);
    place();

    /* ── the words into the box ─────────────────────────────────────────── */
    function write(text){
      writing = true;
      box.value = text; written = text;
      try { box.scrollTop = box.scrollHeight; } catch(e){}
      box.dispatchEvent(inputEvent());
      writing = false;
    }
    function touched(){ return written !== null && box.value !== written; }
    /* the marker comes off where it was put; the phrase under it stays as last
     * heard, and anything typed after it stays too */
    function settle(){
      if (written === null || written.slice(-MARK.length) !== MARK) return;
      var stem = written.slice(0, -MARK.length), v = box.value;
      if (v.indexOf(stem + MARK) !== 0) return;      /* the box no longer holds it where it was put */
      write(stem + v.slice(stem.length + MARK.length));
    }
    function show(on){ btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    /* while listening, notice a box the page has discarded even if no blur and
     * no result ever says so — the session must not outlive its box */
    var watch = null;
    function watching(on){
      clearInterval(watch);
      watch = on ? setInterval(function(){ if (!box.isConnected) orphan(); }, 500) : null;
    }

    function begin(){
      var R = ctor(); if (!R) return;
      if (active && active !== api) active.stop();
      active = api;
      var r = new R();
      r.lang = document.documentElement.lang || navigator.language || 'en-US';
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      base = box.value.replace(/[ \t]+$/, '');
      prior = []; finals = []; written = null; heard = false;
      r.onresult = function(e){
        if (rec !== r) return;                       /* a superseded session's late words */
        if (!box.isConnected){ orphan(); return; }
        if (touched()){ if (!pending) rebase(); return; }
        heard = true;
        var got = readResults(e.results);
        finals = got.finals;
        var runs = collapse(prior.concat(finals, [got.interim]));
        write(glue(base, runs) + (got.interim.trim() ? MARK : ''));
      };
      r.onerror = function(e){
        if (rec === r && TERMINAL[e.error]){
          want = false;
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
            btn.title = 'the microphone was refused — allow it for this site to dictate';
        }
      };
      r.onend = function(){
        if (rec !== r) return;
        /* silence ended the session and the writer did not: carry the locked
         * phrases across the fold and go again — unless it died at once, which
         * is a fault, not a pause, and would loop */
        if (want && box.isConnected && (heard || Date.now() - startedAt > 1000)){
          prior = collapse(prior.concat(finals)); finals = []; heard = false; startedAt = Date.now();
          try { r.start(); return; } catch(e){}
        }
        rec = null; want = false; show(false); watching(false); settle();
        if (active === api) active = null;
      };
      rec = r; want = true; startedAt = Date.now();
      try { r.start(); show(true); watching(true); }
      catch(e){ rec = null; want = false; show(false); watching(false); if (active === api) active = null; }
    }
    /* the box changed under the session — typed into, or filled or cleared by
     * the page — so what it holds now is the base, and a fresh recogniser
     * carries on from there (a used one re-reports its whole span) */
    function rebase(){
      var r = rec; rec = null;
      if (r){ try { r.abort(); } catch(e){} }
      settle();
      begin();
    }
    function stop(){
      want = false; show(false);
      clearTimeout(pending); pending = null;
      settle();                                     /* a click that follows reads clean text */
      if (rec){ try { rec.stop(); } catch(e){} }    /* onend closes the session; late finals still firm the phrase */
      else if (active === api) active = null;
    }
    /* let go without settling — the successor box has the words already */
    function drop(){
      want = false; show(false); watching(false);
      var r = rec; rec = null;
      if (r){ try { r.abort(); } catch(e){} }
      if (active === api) active = null;
    }
    /* the page rebuilt its box; give the successor a moment to take the session over */
    var orphanTimer = null;
    function orphan(){
      if (orphanTimer) return;
      orphanTimer = setTimeout(function(){ orphanTimer = null; if (!box.isConnected) drop(); }, 1500);
    }
    api.stop = stop; api.drop = drop; api.begin = begin;
    api.listening = function(){ return want; };

    /* a fresh box standing where a live session's box stood is the same box rebuilt */
    if (active && active.listening() && !active.box.isConnected && sameBox(active.box, box)){
      active.drop();
      if (box.value.slice(-MARK.length) === MARK) box.value = box.value.slice(0, -MARK.length);
      begin();
    }

    btn.addEventListener('mousedown', function(e){ e.preventDefault(); });   /* the box keeps its focus */
    btn.addEventListener('click', function(){
      if (want){ stop(); return; }
      begin();
      if (want){ try { box.focus({ preventScroll: true }); } catch(e){ box.focus(); } }
    });
    btn.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); btn.click(); }
    });
    box.addEventListener('blur', function(){
      if (!want) return;
      settle();                                     /* whatever comes next reads clean text */
      /* Chrome also fires blur for a box being REMOVED, before the removal
       * lands — so decide a tick later: gone is the page rebuilding its box
       * (hold the session for the successor); still here is the writer
       * looking away */
      setTimeout(function(){ if (!want) return; if (box.isConnected) stop(); else orphan(); }, 0);
    });
    box.addEventListener('input', function(){
      if (want && !writing){ clearTimeout(pending); pending = setTimeout(function(){ pending = null; if (want) rebase(); }, 400); }
    });
    box.addEventListener('keydown', function(e){ if (e.key === 'Enter' && want) settle(); }, true);

    box._dictate = api;
    return btn;
  };

  function sameBox(a, b){
    if (a.id) return a.id === b.id;
    return a.placeholder === b.placeholder && a.className === b.className;
  }

  function wireAll(){
    var all = document.querySelectorAll('textarea[data-dictate]');
    for (var i = 0; i < all.length; i++) window.dictate(all[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireAll); else wireAll();
})();

/* ─────────────────────────────────────────────────────────────────────────────
 * siteDoors — the places menu, built by the page from what the page knows.
 *
 * A door has to carry the walker. Every page here takes its handle from the URL
 * path and nowhere else, so a bare '/walk' is not a door to the same room — it is
 * a door to an empty one. That is not a styling fault to be fixed with better links;
 * it is why this is a FUNCTION THE PAGE CALLS rather than a block that injects
 * itself. Only the page knows who is standing in it. (Learned by shipping the
 * other thing: happyseaurchin-home #144, reverted by #145.)
 *
 * So the catalogue lives here once — add a place, every page gains it — while the
 * identity rides in from the caller:
 *
 *     siteDoors({ handle: HANDLE, family: VENTURE, here: 'walk' });
 *
 * Two groups, because a home and a glance are not peers: what you WORK in stands
 * first, what you GLANCE at stands under a rule. And anything needing a handle we
 * do not have is left out entirely rather than offered empty — there is nowhere
 * for it to go yet, and omission is honest where a dead link is not.
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
  'use strict';

  /* [label, page, shape] — shape says what the page's path takes, read off the
   * pages themselves: handle = /page/<handle>, family = /page/<family>/<handle>,
   * bare = no path at all. Wrong shape here is a dead link there. */
  var WORK = [
    ['your now',    'now',      'handle'],
    ['your here',   'here',     'handle'],
    ['the project', 'walk',     'family'],
    ['my hands',     'hands',    'handle'],
    ['one at a time','next',     'handle'],
    ['the morning', 'morning',  'handle'],
    ['the ledger',  'ledger',   'handle']
  ];
  var GLANCE = [
    ['recency', 'recency', 'family'],
    ['across',  'across',  'handle'],
    ['the field', 'field',  'handle'],
    ['social brain', 'social-brain', 'optional'],
    ['earth',   'earth',    'optional'],
    ['globe',   'globe',    'optional']
  ];
  /* who you do it with: the door in, and the live surface where people actually
   * meet. The mirror named here is the BARE place — a page's own 'mirror ↗'
   * carries that page's coordinate, which makes it an act; the two do not
   * collide because they are not the same thing. */
  var WITH = [
    ['connect', 'connect', 'optional'],
    ['mirror.onen.ai', 'https://mirror.onen.ai/', 'external']
  ];
  var GROUPS = [WORK, GLANCE, WITH];

  var CSS = '' +
    '.dd{position:relative;flex:none}' +
    '.dd>summary{list-style:none;cursor:pointer;border:1px solid var(--line);border-radius:4px;' +
      'color:var(--vapour-dim);font-family:var(--mono);font-size:12px;padding:6px 10px}' +
    '.dd>summary::-webkit-details-marker{display:none}' +
    '.dd>summary:hover{color:var(--foam);border-color:var(--line-strong)}' +
    '.dd[open]>summary{color:var(--liquid);border-color:rgba(var(--liquid-rgb),0.4)}' +
    '.dd__menu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:216px;' +
      /* opaque, not 0.98: two percent was enough for the heading behind it to read
       * through the panel on a dark ground. */
      'background:rgb(var(--well-rgb));border:1px solid var(--line-strong);border-radius:8px;' +
      'padding:8px;display:flex;flex-direction:column;gap:2px;' +
      'box-shadow:0 8px 28px rgba(0,0,0,0.28)}' +
    /* places read as words, because a place is a word you read */
    '.dd__menu a,.dd__menu .here{font-family:var(--body);font-size:15px;line-height:1.4;' +
      'padding:5px 8px;border-radius:5px;text-decoration:none;border-bottom:none;color:var(--vapour)}' +
    '.dd__menu a:hover{background:rgba(var(--wash-rgb),0.07);color:var(--liquid)}' +
    '.dd__menu .here{color:var(--foam)}' +
    '.dd__rule{height:1px;background:var(--line);margin:7px 4px}' +
    /* acts keep the bar\'s own register — a button still looks like a button */
    '.dd__menu button{width:100%;text-align:left}' +
    '.dd__edit{width:100%;text-align:center;background:none;border:none;border-top:1px solid var(--line);'+
      'margin-top:6px;padding:8px 4px 2px;color:var(--vapour-dim);font-family:var(--mono);font-size:11px;'+
      'letter-spacing:0.06em;cursor:pointer}' +
    '.dd__edit:hover{color:var(--liquid)}' +
    '.dd__row{display:flex;align-items:center;gap:7px;padding:3px 4px}' +
    '.dd__name{flex:1;font-family:var(--body);font-size:14px;color:var(--vapour);white-space:nowrap}' +
    '.dd__mv{background:none;border:1px solid var(--line);border-radius:4px;color:var(--vapour-dim);' +
      'font-size:11px;line-height:1;padding:3px 6px;cursor:pointer}' +
    '.dd__mv:disabled{opacity:0.25;cursor:default}' +
    '.dd__foot{display:flex;gap:8px;white-space:nowrap}' +
    '.dd__foot .dd__edit{flex:1}' +
    '@media print{.dd{display:none}}';

  var styled = false;
  function style(){
    if (styled) return; styled = true;
    var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
  }

  /* One open at a time, and a click anywhere else closes it — the whole of the
   * behaviour, because <details> already carries the rest. */
  var wired = false;
  function wire(){
    if (wired) return; wired = true;
    /* CAPTURE phase throughout: a page's own control may stopPropagation to guard
      * the panel it is opening (walk's display button does exactly that), and a
      * bubble-phase listener would never learn the click happened. */
    document.addEventListener('click', function(e){
      [].forEach.call(document.querySelectorAll('details.dd[open]'), function(d){
        if (!d.contains(e.target)) d.removeAttribute('open');
      });
    }, true);
    /* choosing closes: a page's own panels (display, mirror, the key prompt) open
     * exactly where the menu stands, so leaving it open stacks two things in one
     * corner. Buttons only — a details' own summary must keep its toggle. */
    document.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('.dd__menu button');
      if (!b || b.hasAttribute('data-keep-open')) return;
      var d = b.closest('details.dd');
      if (d) d.removeAttribute('open');
    }, true);
    document.addEventListener('keydown', function(e){
      if (e.key !== 'Escape') return;
      [].forEach.call(document.querySelectorAll('details.dd[open]'), function(d){
        d.removeAttribute('open');
      });
    });
  }

  function href(page, shape, handle, family){
    var h = handle ? encodeURIComponent(handle) : '';
    if (shape === 'external') return page;   /* already a whole URL */
    if (shape === 'bare')   return '/' + page;
    /* optional: the page does not need a handle to work, but carries one so the
     * chain of doors is not broken by passing through it. */
    if (shape === 'optional') return handle ? '/' + page + '/' + h : '/' + page;
    if (shape === 'handle') return handle ? '/' + page + '/' + h : null;
    /* family: recency answers to a family and falls back to the now-clock, which is
     * why it is reachable from anywhere; walk without one has no room to open. */
    var f = family || (page === 'recency' ? 'now' : '');
    /* No family to hand it — but a walker we DO know. The page's own ask screen is
     * a real destination when it only has to ask the one thing it is missing, so
     * the handle rides in the query and the ask keeps it. Standing at your own now,
     * "which project" is a question worth being asked; "who are you" is not. */
    if (!f) return handle ? '/' + page + '?h=' + h : null;
    return '/' + page + '/' + encodeURIComponent(f) + (h ? '/' + h : '');
  }

  /* ── whose list it is ──────────────────────────────────────────────────────
   * Nobody has to decide the order centrally, because the reader decides it —
   * kept on this device, never written to the beach, exactly the organ the pages
   * already call 'display'. Until someone touches it they get the authored
   * arrangement, homes above a rule and glances below; once they reorder, the
   * rule goes and the list is simply theirs.
   * ────────────────────────────────────────────────────────────────────────── */
  /* The places list lives at lists:<handle> branch 2, by the same argument that
   * moved the projects to branch 1: which doors you want and in what order is a
   * fact about how you work, not a reading posture, so it belongs where it
   * follows you between devices and any LLM can read it. Held in memory here
   * until the fetch lands, because the menu must open instantly. */
  var STATED_DOORS = null;

  /* A stored order names pages, so a place ADDED here later still appears for
   * someone who arranged their list months ago — it joins the end rather than
   * vanishing. That is the whole reason this stores names and not indices. */
  function groupOf(p){
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].indexOf(p) >= 0) return i;
    return -1;
  }

  /* THE LIST IS THE MENU. Naming places is choosing them, and what a reader has
   * chosen is the whole of what they should meet — not the choice with the rest of
   * the catalogue greyed out beneath a rule, which is a list arguing with itself.
   * The catalogue is not lost by this: it stands whole, one tap away, under
   * 'choose what shows' — which is where a change to the list belongs anyway, so
   * the place that shows everything is now also the only place that can act on it.
   * The sibling organ has always read this way (the projects row: "there is no
   * hidden set either way — a family is in the list or it is not"), and the two
   * agree from here. Reversed 2026-09-08 at David's word, from a rule that said a
   * priority list orders the top and never hides the rest.
   *
   * The one thing a list cannot overrule is where the reader is STANDING. An
   * unstated page still takes its place, marked as here, or the menu quietly
   * disagrees with the page around it — the same exception the projects row makes
   * for the family you are in. It is for the MENU only: `here` is deliberately not
   * passed when the editor asks, because a page you merely landed on is not a page
   * you chose, and saving must never smuggle it into your list. */
  function arrange(here){
    var all = [].concat.apply([], GROUPS), by = {}, out = [], seen = {};
    all.forEach(function(x){ by[x[1]] = x; });
    if (STATED_DOORS && STATED_DOORS.length){
      STATED_DOORS.forEach(function(n){ if (by[n] && !seen[n]){ seen[n] = 1; out.push(by[n]); } });
      if (here && by[here] && !seen[here]){ seen[here] = 1; out.push(by[here]); }
      return { list: out, custom: true, all: all };
    }
    return { list: all, custom: false, all: all };
  }

  /* ── the acts, gathered ───────────────────────────────────────────────────
   * A bar carrying more than one of the page's own controls gathers them behind
   * 'options', on every page, without any page saying so — the same reason the
   * places catalogue lives here: one mechanism, changed once. Moving a button in
   * the DOM keeps its listeners and its id, so nothing is rewired and no page
   * needs to know this happened.
   *
   * ONE control stays a control: a dropdown holding a single thing is worse than
   * the thing, so /now keeps 'display' and /earth keeps 'workings' in the bar.
   * ────────────────────────────────────────────────────────────────────────── */
  function gatherActs(){
    var mount = document.querySelector('.bar');
    if (!mount || document.getElementById('dd-acts')) return;
    var btns = [].filter.call(mount.children, function(e){ return e.tagName === 'BUTTON'; });
    if (btns.length < 2) return;
    style(); wire();
    var d = document.createElement('details');
    d.className = 'dd'; d.id = 'dd-acts';
    var sum = document.createElement('summary');
    sum.textContent = 'options ▾';
    sum.title = 'what this page can do';
    d.appendChild(sum);
    var menu = document.createElement('div');
    menu.className = 'dd__menu';
    btns.forEach(function(b){ menu.appendChild(b); });   /* moving keeps the wiring */
    d.appendChild(menu);
    /* left of go — and go may not exist yet on a page whose handle arrives late,
     * in which case appending is already correct and go will land to the right. */
    var doors = mount.querySelector('details.dd[data-doors]');
    if (doors) mount.insertBefore(d, doors); else mount.appendChild(d);
  }
  /* after the page's own script, so a control created at boot is caught too */
  document.addEventListener('DOMContentLoaded', gatherActs);

  /* ── the projects you are in ───────────────────────────────────────────────
   * There is no directory page and none is needed: YOUR PROJECTS ARE THE FAMILIES
   * YOU HOLD A MIRROR IN, which the beach index already knows. A family exists iff
   * spine:<name> stands; you are in it iff <name>:<handle> stands. One read, no
   * configuration, nothing to keep up to date — a project appears in your row the
   * moment you first speak in it, and that is the whole mechanism.
   *
   * Requiring the spine is what makes it exact rather than nearly right: without
   * it, passport:, shell:, history:, pool:, ear: and a dozen other role-blocks all
   * end in your handle and would arrive here pretending to be projects.
   *
   * Three families are left out because they have their own pages and are not
   * projects in the sense this row means: your now, your ahead, your deck.
   * ────────────────────────────────────────────────────────────────────────── */
  /* a family whose own page is better than its walk. 'ahead' was here until its
   * page folded into /hands — the FAMILY is untouched and its blocks are still
   * ahead:<handle>; only the surface went, so it walks like any other now. */
  var OWN_PAGE = { 'now':'now', 'today-beach-deck':'today-beach-deck', 'ahead':'ahead' };
  /* A DEFAULT, NOT A LAW. There is no substrate fact that means 'project' — the
   * floor does not say it (beach-venture and genus-one are clocks; doing,
   * experiences and molequle are trees, and all five are projects), and nothing
   * else does either. It is a judgement about your own work, so the chooser below
   * owns it and this list only decides what a newcomer sees first. These two are
   * substrate machinery — the respond-deck and the health battery — rather than
   * anyone's project, which is why they start off for everybody and not just for
   * the hand that named them. Tick them back on and they stay on. */
  var OFF_BY_DEFAULT = { 'pulse':1, 'state-of-play':1 };
  var IDX_KEY = 'doors:index';
  var IDX_TTL = 5 * 60 * 1000;

  function readIndex(origin){
    var now = Date.now();
    try {
      var c = JSON.parse(sessionStorage.getItem(IDX_KEY) || 'null');
      if (c && c.origin === origin && (now - c.at) < IDX_TTL) return Promise.resolve(c.blocks);
    } catch(e){}
    return fetch(origin + '/.well-known/pscale-beach', { headers:{Accept:'application/json'}, cache:'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(j){
        var blocks = j.blocks || [];
        try { sessionStorage.setItem(IDX_KEY, JSON.stringify({origin:origin, at:now, blocks:blocks})); } catch(e){}
        return blocks;
      });
  }

  /* ── the list block: rank is depth ────────────────────────────────────────
   * lists:<handle> holds this hand's own ordered lists, ONE BRANCH PER LIST,
   * and each list is a NESTED CHAIN rather than a flat fan of 1-9:
   *
   *   1        the projects list          (its underscore says so)
   *   1.1      the first project
   *   1.11     the second
   *   1.111    the third  …
   *
   * Two things fall out of nesting that a flat fan cannot give. There is no limit
   * of nine, because a chain just keeps going. And RANK BECOMES DEPTH, so 'my top
   * three' is an APERTURE — read to depth three — rather than a filter somebody
   * has to compute. Reordering rewrites the branch, which is one small call.
   *
   * Branches 2-9 stand free for whatever other list a hand wants; nothing here
   * assumes branch 1 is the only one.
   * ────────────────────────────────────────────────────────────────────────── */
  function listBlockName(handle){ return 'lists:' + handle; }

  /* walk a chain, collecting each rung's underscore in order */
  function chainToList(node){
    var out = [], n = node && node['1'], guard = 0;
    while (n && typeof n === 'object' && guard++ < 200){
      if (typeof n._ === 'string' && n._.trim()) out.push(n._.trim());
      n = n['1'];
    }
    return out;
  }

  /* build the chain back from a list, deepest last */
  function listToChain(items){
    var node = null;
    for (var i = items.length - 1; i >= 0; i--){
      var rung = { '_': items[i] };
      if (node) rung['1'] = node;
      node = rung;
    }
    return node;
  }

  function readBranch(origin, handle, digit){
    return fetch(origin + '/.well-known/pscale-beach?block=' + encodeURIComponent(listBlockName(handle)),
                 { headers:{Accept:'application/json'}, cache:'no-store' })
      .then(function(r){ return r.status === 404 ? null : r.json(); })
      .then(function(b){ return b ? chainToList(b[String(digit)]) : null; })
      .catch(function(){ return null; });
  }
  var ROOT_SAYS = "The ordered lists this hand keeps for its own use — one branch per list, and the block is named for the lists rather than for any one of them, because the projects were only the first. Each list is nested so that RANK IS DEPTH: the first item stands at the first rung and the tenth at the tenth, so reading to a depth is reading a top-N and no list is capped at nine. Branch 1 holds the projects; branches 2 onward stand free for whatever else this hand wants ordered.";
  var DOORS_SAYS = "The places this hand wants in its own go menu, in the order it wants them — read by every page's places menu, which shows exactly this and nothing else. Naming a place here is choosing it, and a place left out simply does not appear: the menu is the choice, not the choice laid over a catalogue. Nothing is lost by leaving one out, because the catalogue every page offers stands whole behind 'choose what shows', which is where a list is changed.";
  var BRANCH_SAYS = "The families this hand counts as its own projects, most-standing first — read by the project row on the walk and recency pages, and by anything else that wants to know what is being worked on. Membership and order are one thing here: the row is this list, read straight down.";

  function latchFor(handle){ return 'lists-latch:' + handle; }

  function post(origin, body){
    return fetch(origin + '/.well-known/pscale-beach', { method:'POST', cache:'no-store',
      headers:{'Content-Type':'application/json', Accept:'application/json'},
      body: JSON.stringify(body) })
      .then(function(r){ return r.json().catch(function(){ return null; })
        .then(function(d){ return { ok:r.ok, status:r.status, data:d }; }); });
  }
  function lockRequired(w){
    return !w.ok && w.data && (w.data.code === 'lock_required' || w.data.error === 'lock_required');
  }

  /* Save ONE BRANCH, writing the block whole so nothing else in it is lost.
   *
   * Whole-block rather than a spindle write for two reasons, both learned by
   * probing the live beach rather than assumed. A new_lock sent ALONGSIDE a
   * spindle seals only that digit and leaves every other branch homesteadable —
   * so claiming has to happen at the root. And a whole-block write replaces
   * everything, so the other branches must be carried across deliberately; the
   * go list at branch 2 would otherwise be wiped every time the projects were
   * saved.
   *
   * One path covers create, claim and update, because sending secret and new_lock
   * together is admitted in every case: absent creates locked, unlocked takes the
   * lock, already-locked rotates to the same value, and a wrong key is refused. */
  function saveBranch(origin, handle, digit, branchSays, items){
    var name = listBlockName(handle);
    var branch = { '_': branchSays };
    var chain = listToChain(items);
    if (chain) branch['1'] = chain;

    return fetch(origin + '/.well-known/pscale-beach?block=' + encodeURIComponent(name),
                 { headers:{Accept:'application/json'}, cache:'no-store' })
      .then(function(r){ return r.status === 404 ? null : r.json(); })
      .then(function(existing){
        var content = existing ? JSON.parse(JSON.stringify(existing)) : {};
        if (typeof content._ !== 'string' || !content._) content._ = ROOT_SAYS;
        content[String(digit)] = branch;

        var key = null;
        try { key = localStorage.getItem(latchFor(handle)); } catch(e){}
        if (!key){
          key = prompt('Your key for ' + name + ' — invent one now if this is the first time; it keeps these lists yours to edit:');
          if (key === null || !key.trim()) return { ok:false, quiet:true };
          key = key.trim();
        }
        var body = { block: name, content: content, secret: key, new_lock: key };
        if (existing) body.confirm = true;      /* replacing a block that stands */

        return post(origin, body).then(function(w){
          if (w.ok){ try { localStorage.setItem(latchFor(handle), key); } catch(e){} return w; }
          if (!lockRequired(w)) return w;
          var v = prompt('That key was refused for ' + name + '. Try again:');
          if (v === null || !v.trim()) return { ok:false, quiet:true };
          body.secret = v.trim(); body.new_lock = v.trim();
          return post(origin, body).then(function(w2){
            if (w2.ok) try { localStorage.setItem(latchFor(handle), v.trim()); } catch(e){}
            return w2;
          });
        });
      });
  }

  var ROW_CSS = '' +
    /* not sticky itself any more — it rides inside .stickyhead with the bar */
    '.projrow{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 4px;' +
      'padding:9px 18px;background:rgba(var(--well-rgb),0.92);backdrop-filter:blur(8px);' +
      'border-bottom:1px solid var(--line);font-family:var(--body);font-size:14.5px}' +
    '.projrow a{color:var(--vapour-dim);text-decoration:none;border-bottom:none;padding:1px 5px;border-radius:4px}' +
    '.projrow a:hover{color:var(--liquid);background:rgba(var(--wash-rgb),0.07)}' +
    '.projrow .here{color:var(--foam);padding:1px 5px}' +
    '.projrow .sep{color:var(--vapour-dim);opacity:0.4}' +
    '.projrow--ask{gap:8px 10px;align-items:center;flex-wrap:wrap}' +
    '.projrow__ask-lab{font-family:var(--mono);font-size:11.5px;letter-spacing:0.06em;color:var(--vapour-dim);flex:none}' +
    '.projrow__ask-in{background:rgba(var(--well-rgb),0.55);border:1px solid var(--line-strong);border-radius:4px;' +
      'padding:6px 10px;color:var(--foam);font-family:var(--mono);font-size:13px;min-width:0;flex:1 1 130px}' +
    '.projrow__ask-go{background:var(--liquid);border:none;border-radius:4px;color:var(--abyss);' +
      'font-family:var(--mono);font-size:12px;font-weight:700;padding:6px 14px;cursor:pointer}' +
    '.projrow__ask-go:hover{background:var(--foam)}' +
    '.projrow__pick{margin-left:10px;background:none;border:none;color:var(--vapour-dim);' +
      'font-family:var(--mono);font-size:11px;letter-spacing:0.06em;cursor:pointer;padding:1px 4px}' +
    '.projrow__pick:hover{color:var(--liquid)}' +
    '.projrow__panel{flex:1 0 100%;display:flex;flex-wrap:wrap;gap:4px 16px;padding:9px 2px 2px;' +
      'margin-top:7px;border-top:1px solid var(--line)}' +
    '.projrow__item{display:flex;align-items:center;gap:7px;font-family:var(--body);' +
      'font-size:14px;color:var(--vapour);min-width:210px}' +
    '.projrow__name{flex:1}' +
    '.projrow__mv{background:none;border:1px solid var(--line);border-radius:4px;color:var(--vapour-dim);' +
      'font-size:11px;line-height:1;padding:2px 5px;cursor:pointer}' +
    '.projrow__mv:disabled{opacity:0.25;cursor:default}' +
    '.projrow__foot{flex:1 0 100%;padding-top:6px}' +
    '.projrow__panel input:disabled + *,.projrow__panel input:disabled{opacity:0.45;cursor:default}' +
    '.projrow__note{flex:1 0 100%;font-family:var(--mono);font-size:11.5px;letter-spacing:0.06em;' +
      'color:var(--solid);padding-top:7px}' +
    '.projrow__note a{color:var(--solid);border-bottom:none}' +
    '.projrow__note a:hover{color:var(--foam);background:none}' +
    '@media print{.projrow{display:none}}';
  var rowStyled = false;
  /* Both the row and the ask share these, and the ask reaches them by a path that
   * never ran the read — which is how it came to render as unstyled block text
   * with the label clipped off the left edge. Styling is not the read's to own. */
  function rowStyle(){
    if (rowStyled) return; rowStyled = true;
    var st = document.createElement('style'); st.textContent = ROW_CSS; document.head.appendChild(st);
  }

  /* The bar is sticky at the top and this row sits under it, so its offset is the
   * bar's height — measured, never assumed, because the bar wraps to two or three
   * lines on a narrow screen and a hardcoded 44px would bury the first project. */
  /* THE BAR AND THE ROW STICK AS ONE, by being one — wrapped together in a single
   * sticky box rather than the row being told, in pixels, how tall the bar is.
   *
   * The measured version was wrong twice for two different reasons and would have
   * been wrong a third time: the bar wraps to two lines on a phone after the
   * display face loads, and walk fills its bar text from the beach AFTER the row
   * is built, so any single measurement is taken before the height it is meant to
   * describe. Every fix for that was another event to listen for. A wrapper needs
   * no measurement, no observer and no listener, and cannot go stale at a width
   * nobody tested.
   *
   * Safe to do from here: no page styles body > .bar or uses a sibling selector on
   * it, and the wrapper is inserted where the bar already stood, so nesting is
   * unchanged. A page whose bar was never sticky becomes sticky by joining — which
   * is what recency wanted anyway, being the only one that was not. */
  var WRAP_CSS = '.stickyhead{position:sticky;top:0;z-index:10}' +
                 '@media print{.stickyhead{position:static}}';
  var wrapStyled = false;

  function stickTogether(row, bar){
    if (!wrapStyled){ wrapStyled = true;
      var st = document.createElement('style'); st.textContent = WRAP_CSS; document.head.appendChild(st); }
    var wrap = bar.parentNode.classList && bar.parentNode.classList.contains('stickyhead')
      ? bar.parentNode : null;
    if (!wrap){
      wrap = document.createElement('div');
      wrap.className = 'stickyhead';
      bar.parentNode.insertBefore(wrap, bar);
      wrap.appendChild(bar);
    }
    wrap.appendChild(row);
  }

  /* WITHOUT A HANDLE, ASK FOR ONE — here, where the row would have been, rather
   * than telling someone their URL is missing something. A person who does not
   * know they are supposed to be in the address cannot act on being told they are
   * not; a box they can type into is the same information made usable. Typing it
   * puts them on the same page as themselves, and everything else follows. */
  function askForHandle(cfg, bar){
    if (document.querySelector('.projrow')) return;
    rowStyle();
    var row = document.createElement('div');
    row.className = 'projrow projrow--ask';
    var lab = document.createElement('span');
    lab.className = 'projrow__ask-lab';
    lab.textContent = 'your handle —';
    var input = document.createElement('input');
    input.type = 'text'; input.className = 'projrow__ask-in';
    input.placeholder = 'who are you here?';
    input.setAttribute('autocapitalize','none'); input.setAttribute('spellcheck','false');
    input.setAttribute('aria-label','your handle');
    var go = document.createElement('button');
    go.type = 'button'; go.className = 'projrow__ask-go'; go.textContent = 'ok';
    function land(){
      var h = input.value.replace(/[^a-z0-9 _-]/gi, '').trim();
      if (!h) { input.focus(); return; }
      /* the page keeps its own shape: a family page keeps its family and gains a
       * handle; a page that takes only a handle takes it and nothing else */
      location.href = cfg.family
        ? '/' + cfg.page + '/' + encodeURIComponent(cfg.family) + '/' + encodeURIComponent(h)
        : '/' + cfg.page + '/' + encodeURIComponent(h);
    }
    go.addEventListener('click', land);
    input.addEventListener('keydown', function(e){ if (e.key === 'Enter') land(); });
    row.appendChild(lab); row.appendChild(input); row.appendChild(go);
    stickTogether(row, bar);
  }

  window.siteProjects = function(cfg){
    cfg = cfg || {};
    if (!cfg.page) return;
    var bar = document.querySelector('.bar');
    if (!bar || document.querySelector('.projrow')) return;
    if (!cfg.handle) return askForHandle(cfg, bar);
    var origin = cfg.beach || 'https://beach.happyseaurchin.com';

    Promise.all([readIndex(origin), readBranch(origin, cfg.handle, 1)]).then(function(both){
      var blocks = both[0], stated = both[1];
      var have = {};
      blocks.forEach(function(n){ have[n] = 1; });
      var mine = [];
      blocks.forEach(function(n){
        if (n.indexOf('spine:') !== 0) return;
        var f = n.slice(6);
        if (OWN_PAGE[f]) return;
        if (have[f + ':' + cfg.handle]) mine.push(f);
      });
      /* whatever you are standing in belongs in the row even if you hold no mirror
       * there yet — otherwise the row silently disagrees with the page above it */
      if (cfg.family && !OWN_PAGE[cfg.family] && mine.indexOf(cfg.family) < 0) mine.push(cfg.family);
      mine.sort();

      /* THE LIST IS THE TRUTH WHERE ONE STANDS. Said plainly at lists:<handle> branch 1,
       * it decides both membership and order and nothing is computed; absent, the
       * default below stands in until the hand says otherwise. There is no hidden
       * set either way — a family is in the list or it is not. */
      var visible;
      if (stated && stated.length){
        /* A family with its own page is held out of the COMPUTED default, because
         * nobody chose it. Named in the list it is a choice, so it stands. */
        visible = stated.slice();
        if (cfg.family && visible.indexOf(cfg.family) < 0) visible.push(cfg.family);
        /* a stated project you hold no mirror in yet is still yours — offer it too */
        stated.forEach(function(f){ if (mine.indexOf(f) < 0) mine.push(f); });
      } else {
        visible = mine.filter(function(f){
          if (f === cfg.family) return true;         /* never hide where you are standing */
          return !OFF_BY_DEFAULT[f];
        });
      }
      if (visible.length < 2 && mine.length < 2) return;   /* a row of one is furniture, not a choice */
      function shown(f){ return visible.indexOf(f) >= 0; }

      rowStyle();

      var row = document.createElement('div');
      row.className = 'projrow';
      row.setAttribute('aria-label', 'your projects');

      visible.forEach(function(f, i){
        if (i){ var s = document.createElement('span'); s.className = 'sep'; s.textContent = '•'; row.appendChild(s); }
        if (f === cfg.family){
          var cur = document.createElement('span');
          cur.className = 'here'; cur.textContent = f;
          cur.setAttribute('aria-current', 'true');
          row.appendChild(cur);
        } else {
          var a = document.createElement('a');
          /* The same page, the same you, a different project. EVERY item, with no
           * exception for a family that has its own page elsewhere: the row's whole
           * meaning is flicking without leaving where you are, so 'now' on the
           * recency page shows the now IN recency, like the others. Its own page is
           * still one tap away in the places menu, which is where a change of view
           * belongs. */
          a.href = '/' + cfg.page + '/' + encodeURIComponent(f) + '/' + encodeURIComponent(cfg.handle);
          a.textContent = f;
          row.appendChild(a);
        }
      });
      /* the chooser, on the row it governs — every family you hold a mirror in,
       * including the ones off by default, so nothing is unreachable. Same organ
       * as 'choose what shows' in the places menu, same device-local home. */
      var pick = document.createElement('button');
      pick.type = 'button'; pick.className = 'projrow__pick';
      pick.textContent = 'choose';
      pick.title = 'which of your families count as projects';
      pick.addEventListener('click', function(e){
        e.stopPropagation();
        if (row.querySelector('.projrow__panel')){ row.querySelector('.projrow__panel').remove(); return; }
        var panel = document.createElement('div');
        panel.className = 'projrow__panel';

        /* the working order: what is in the row, then everything else beneath it,
         * so ticking a family on drops it at the end rather than nowhere */
        var order = visible.slice();
        mine.forEach(function(f){ if (order.indexOf(f) < 0) order.push(f); });
        /* THE TICKS ARE WHAT WAS CHOSEN, NEVER WHAT IS MERELY UNDERFOOT. `visible`
         * force-adds the family being stood in so the row cannot disagree with the
         * page above it; ticking from that list would make a save silently adopt a
         * family only visited once. Tick from the stated list where there is one,
         * and from the computed default where there is not — the same law the
         * places menu keeps, where `here` reaches the menu and never the editor. */
        var inList = {};
        (stated && stated.length ? stated : visible).forEach(function(f){ inList[f] = 1; });

        function draw(){
          panel.innerHTML = '';
          order.forEach(function(f, i){
            var rowEl = document.createElement('div');
            rowEl.className = 'projrow__item';
            var cb = document.createElement('input');
            cb.type = 'checkbox'; cb.checked = !!inList[f];
            /* THE ONE YOU ARE STANDING IN IS UNTICKABLE LIKE ANY OTHER. It used to
             * be disabled here — "you are standing in it" — which made a family
             * joined by accident permanent: the row shows it on every page that
             * shows the row, and the only place offering to remove it was the one
             * page that refused. Julie met this at /walk/fairy-tales and was stuck
             * with it (David, 2026-09-10). Unticking now removes it from the saved
             * list; it still SHOWS while she stands in it, which the note below
             * says plainly so the save does not read as a failure. */
            cb.addEventListener('change', function(){
              if (cb.checked) inList[f] = 1; else delete inList[f];
              draw();
            });
            var nm = document.createElement('span');
            nm.className = 'projrow__name'; nm.textContent = f;
            if (!inList[f]) nm.style.opacity = '0.45';
            rowEl.appendChild(cb); rowEl.appendChild(nm);
            [['↑', -1], ['↓', 1]].forEach(function(mv){
              var b = document.createElement('button');
              b.type = 'button'; b.className = 'projrow__mv'; b.textContent = mv[0];
              b.disabled = (i + mv[1] < 0 || i + mv[1] >= order.length);
              b.addEventListener('click', function(e){
                e.stopPropagation();
                var j = i + mv[1], t = order[i]; order[i] = order[j]; order[j] = t;
                draw();
              });
              rowEl.appendChild(b);
            });
            panel.appendChild(rowEl);
          });

          var foot = document.createElement('div'); foot.className = 'projrow__foot';
          /* Unticking where you stand is honoured on save, but the row will still
           * carry the family while you are in it — say so at the moment of the
           * untick, or the reload reads as the save having been ignored. */
          if (cfg.family && !inList[cfg.family]){
            var stay = document.createElement('span');
            stay.className = 'projrow__note';
            stay.textContent = cfg.family + ' will still show while you stand in it \u2014 it leaves the row everywhere else';
            foot.appendChild(stay);
          }
          var save = document.createElement('button');
          save.type = 'button'; save.className = 'projrow__pick';
          save.textContent = 'save to the beach';
          save.title = 'writes branch 1 of lists:' + cfg.handle + ' — yours, portable, readable by anything';
          save.addEventListener('click', function(e){
            e.stopPropagation();
            save.disabled = true; save.textContent = 'saving…';
            saveBranch(origin, cfg.handle, 1, BRANCH_SAYS, order.filter(function(f){ return inList[f]; }))
              .then(function(w){
                if (w && w.ok){ location.reload(); return; }
                save.disabled = false;
                save.textContent = (w && w.quiet) ? 'save to the beach' : 'refused — try again';
              });
          });
          foot.appendChild(save);
          panel.appendChild(foot);
        }
        draw();
        row.appendChild(panel);
      });
      row.appendChild(pick);

      /* The note only where it is actually true, which is narrower than it was.
       *
       * The sunburst shows a now as well as it shows anything, so it says nothing
       * there — only /walk earns it. And it says nothing to someone who NAMED that
       * family in their own list, because they did not arrive by accident and a
       * page you chose should not nag you for choosing it. What is left is the case
       * it was written for: landing on /walk/now without having asked for it.
       *
       * Appended last, so it reads BELOW the projects rather than above them. */
      if (cfg.page === 'walk' && cfg.family && OWN_PAGE[cfg.family]
          && !(stated && stated.indexOf(cfg.family) >= 0)){
        var note = document.createElement('span');
        note.className = 'projrow__note';
        note.appendChild(document.createTextNode('walking your ' + cfg.family + ' — '));
        var back = document.createElement('a');
        back.href = '/' + OWN_PAGE[cfg.family] + '/' + encodeURIComponent(cfg.handle);
        back.textContent = 'its own page shows it better \u2192';
        note.appendChild(back);
        row.appendChild(note);
      }


      stickTogether(row, bar);
    }).catch(function(){ /* no row rather than a broken one */ });
  };

  window.siteDoors = function(cfg){
    cfg = cfg || {};
    var doorsRead = Promise.resolve();
    style(); wire();
    var mount = cfg.mount || document.querySelector('.bar');
    if (!mount || document.querySelector('details.dd[data-doors]')) return null;

    var d = document.createElement('details');
    d.className = 'dd'; d.setAttribute('data-doors', '');
    var s = document.createElement('summary');
    s.textContent = 'go ▾';
    s.title = 'the other places on this site — your handle travels with you';
    d.appendChild(s);

    var menu = document.createElement('div');
    menu.className = 'dd__menu';

    function paint(){
      menu.innerHTML = '';
      var a = arrange(cfg.here), lastGroup = null;

      function place(p){
        var u = href(p[1], p[2], cfg.handle, cfg.family);
        if (!u) return;                       /* nowhere to go yet — say so by omission */
        if (p[1] === cfg.here){
          var cur = document.createElement('span');
          cur.className = 'here'; cur.textContent = p[0];
          cur.setAttribute('aria-current', 'page');
          menu.appendChild(cur);
          return;
        }
        var link = document.createElement('a');
        link.href = u; link.textContent = p[0];
        menu.appendChild(link);
      }

      a.list.forEach(function(p){
        /* the group rule is the AUTHORED arrangement speaking; once a reader has
         * stated their own order it would be drawing a distinction they did not make */
        var g = groupOf(p);
        if (!a.custom && lastGroup !== null && g !== lastGroup){
          var r = document.createElement('div'); r.className = 'dd__rule'; menu.appendChild(r);
        }
        lastGroup = g;
        place(p);
      });

      var edit = document.createElement('button');
      edit.className = 'dd__edit'; edit.type = 'button'; edit.setAttribute('data-keep-open',''); edit.textContent = 'choose what shows';
      edit.addEventListener('click', function(e){
        e.stopPropagation();
        edit.textContent = 'reading your list\u2026';
        doorsRead.then(editor);
      });
      menu.appendChild(edit);
    }

    /* The editor is the same panel — a menu that flips over rather than a second
     * surface to find your way back out of. Edits are held in hand until saved,
     * because each save is one write to the beach rather than a scribble on this
     * device: the list is a fact about how you work and it should follow you. */
    function editor(){
      menu.innerHTML = '';
      var a = arrange();
      var order = a.list.map(function(p){ return p[1]; });
      var inList = {}; order.forEach(function(n){ inList[n] = 1; });
      /* anything in the catalogue but not in your list sits beneath, unticked */
      a.all.forEach(function(p){ if (order.indexOf(p[1]) < 0) order.push(p[1]); });
      var by = {}; a.all.forEach(function(p){ by[p[1]] = p; });

      function draw(){
        menu.innerHTML = '';
        order.forEach(function(n, i){
          var p = by[n]; if (!p) return;
          var row = document.createElement('div'); row.className = 'dd__row';
          var cb = document.createElement('input'); cb.type = 'checkbox';
          cb.checked = !!inList[n];
          cb.addEventListener('change', function(){
            if (cb.checked) inList[n] = 1; else delete inList[n];
            draw();
          });
          var name = document.createElement('span'); name.className = 'dd__name'; name.textContent = p[0];
          if (!inList[n]) name.style.opacity = '0.45';
          row.appendChild(cb); row.appendChild(name);
          [['↑', -1], ['↓', 1]].forEach(function(mv){
            var b = document.createElement('button'); b.type = 'button'; b.className = 'dd__mv';
            b.setAttribute('data-keep-open','');
            b.textContent = mv[0];
            b.disabled = (i + mv[1] < 0 || i + mv[1] >= order.length);
            b.addEventListener('click', function(e){
              e.stopPropagation();
              var j = i + mv[1], t = order[i]; order[i] = order[j]; order[j] = t;
              draw();
            });
            row.appendChild(b);
          });
          menu.appendChild(row);
        });

        var foot = document.createElement('div'); foot.className = 'dd__foot';
        var save = document.createElement('button'); save.type = 'button'; save.className = 'dd__edit';
        save.setAttribute('data-keep-open','');
        save.textContent = cfg.handle ? 'save to the beach' : 'sign in to save';
        save.disabled = !cfg.handle;
        save.title = cfg.handle ? 'writes branch 2 of lists:' + cfg.handle : 'a list needs a handle to belong to';
        save.addEventListener('click', function(e){
          e.stopPropagation();
          save.disabled = true; save.textContent = 'saving…';
          saveBranch(cfg.beach || 'https://beach.happyseaurchin.com', cfg.handle, 2, DOORS_SAYS,
                     order.filter(function(n){ return inList[n]; }))
            .then(function(w){
              if (w && w.ok){ location.reload(); return; }
              save.disabled = false;
              save.textContent = (w && w.quiet) ? 'save to the beach' : 'refused — try again';
            });
        });
        var done = document.createElement('button'); done.type = 'button'; done.className = 'dd__edit';
        done.setAttribute('data-keep-open','');
        done.textContent = 'cancel';
        done.addEventListener('click', function(e){ e.stopPropagation(); paint(); });
        foot.appendChild(save); foot.appendChild(done);
        menu.appendChild(foot);
      }
      draw();
    }

    paint();
    /* The menu opens on the default immediately and settles onto the stated list
     * when it arrives: a door a reader might tap in the first half-second matters
     * more than the order being right on the first frame. */
    /* THE EDITOR MUST WAIT, though the menu need not. Drawn before the read lands
     * the editor shows every place TICKED — no stated list means the default, and
     * the default is everything — and saving from there writes all fourteen as the
     * reader's own list, silently replacing the four they chose. Reading is safe to
     * do optimistically; writing is not, and on a phone that gap is real. */
    doorsRead = cfg.handle
      ? readBranch(cfg.beach || 'https://beach.happyseaurchin.com', cfg.handle, 2).then(function(list){
          if (list && list.length){
            STATED_DOORS = list;
            if (!menu.querySelector('.dd__row')) paint();   /* not while it is being edited */
          }
        })
      : Promise.resolve();
    d.appendChild(menu);
    /* GO IS ALWAYS THE TOP RIGHT, on every page and whatever else the bar carries,
     * because a fixed corner is what makes a control findable without looking for
     * it. Acts sit to its left; gatherActs places itself before this one. */
    mount.appendChild(d);
    return d;
  };
})();
