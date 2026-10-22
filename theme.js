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
    /* AND IN THE PERSON'S OWN SETTINGS (David, 2026-10-18: 'the light dark theme should be in
     * options'): settings:<handle> 9.2, through the beach's voice, wherever this device knows their
     * name, so the choice follows them to every device; below, every page takes it up */
    if (window.siteVoice) window.siteVoice().then(function(v){ return v.set('9.2', next); }, function(){});
  }
  /* the person's own choice, read from their settings once the page has painted in this device's */
  window.siteTheme = {
    adopt: function(t){
      if ((t !== 'light' && t !== 'dark') || t === document.documentElement.getAttribute('data-theme')) return;
      apply(t);
      try { localStorage.setItem(KEY, t); } catch(e){}
    }
  };

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

/* ── THE HOURS — the clock's gatherings and beats, read on this device's clock.
 *
 * The beach's clock is the UTC day in ninths of ninths (pscale://sundial): nine
 * gatherings of 2h40m, each nine beats of about 18 minutes, so an hour falls
 * through the middle of a beat and "how do beats refer to hours" (David,
 * 2026-10-05, before a 4pm) has an exact answer nobody should have to work out.
 * A page marks each gathering or beat it names with that address —
 * data-when="2026411566" — and calls clockTimes(root) once; this writes the span
 * beside it in the device's own time zone (the clock keeps none, sundial 8.3).
 * 'show times' under options shows or hides every one at once with one attribute
 * on <html>, set here before first paint as the light and dark is. Off until
 * asked for, and offered only on a page that has named a gathering or a beat:
 * a reader who never asks sees every page exactly as it was. (tidying.19) ── */
(function(){
  'use strict';
  var KEY = 'view:times';
  function on(){ try { return localStorage.getItem(KEY) === 'on'; } catch(e){ return false; } }
  function apply(v){
    if (v) document.documentElement.setAttribute('data-times', '');
    else document.documentElement.removeAttribute('data-times');
  }
  apply(on());

  /* [start, end) in ms of a gathering (nine digits) or a beat (ten); null otherwise */
  function spanOf(addr){
    var a = String(addr || '').replace(/\D/g, '');
    if (a.length === 10 && a[9] === '0') a = a.slice(0, 9);
    if (a.length !== 9 && a.length !== 10) return null;
    var season = +a[4], mis = +a[5], band = +a[6], dib = +a[7], g = +a[8], b = a.length === 10 ? +a[9] : 0;
    if (season < 1 || season > 4 || mis < 1 || mis > 3 || band < 1 || dib < 1 || g < 1) return null;
    var gS = 86400000 / 9, start = Date.UTC(+a.slice(0, 4), (season - 1) * 3 + mis - 1, (band - 1) * 7 + dib) + (g - 1) * gS;
    return b ? [start + (b - 1) * gS / 9, start + b * gS / 9] : [start, start + gS];
  }
  /* each edge to its nearest minute, as this device writes a time of day */
  function wall(ms){ return new Date(Math.round(ms / 60000) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  var styled = false, offered = false;
  function style(){
    if (styled) return; styled = true;
    var st = document.createElement('style');
    st.textContent = '.when-t{display:none;margin-left:.5em;font-family:var(--mono);font-size:.8em;' +
      'letter-spacing:.02em;color:var(--vapour-dim);white-space:nowrap}' +
      'html[data-times] .when-t{display:inline}';
    document.head.appendChild(st);
  }
  /* the switch joins the page's acts: into options when the bar has gathered,
   * else into the bar beside the light and dark, which gathers it */
  function offer(){
    if (offered || document.getElementById('btn-times')) return;
    var menu = document.querySelector('#dd-acts .dd__menu'), bar = document.querySelector('.bar');
    if (!menu && !bar) return;
    offered = true;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'btn-times';
    b.title = 'the clock’s gatherings and beats, on your own clock';
    var say = function(){ b.textContent = on() ? 'hide times' : 'show times'; };
    say();
    b.addEventListener('click', function(){
      var v = !on();
      try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch(e){}
      apply(v); say();
    });
    /* RIGHT ABOVE THE PAGE'S OWN DISPLAY, where it has one, so how a page is shown
     * stands together (David, 2026-10-06), else first under options — in the menu
     * if the bar has gathered, else in the bar, whose gathering keeps the order */
    var display = document.getElementById('btn-display');
    if (menu) { menu.insertBefore(b, display && display.parentNode === menu ? display : menu.firstChild); return; }
    var first = [].filter.call(bar.children, function(e){ return e.tagName === 'BUTTON'; })[0];
    var doors = bar.querySelector('details.dd[data-doors]');
    bar.insertBefore(b, (display && display.parentNode === bar ? display : first) || doors || null);
  }
  function decorate(el){
    var addr = el.getAttribute('data-when'), t = el.querySelector(':scope > .when-t');
    if (t && t.getAttribute('data-for') === addr) return;
    if (t) t.remove();
    var sp = spanOf(addr);
    if (!sp) return;
    t = document.createElement('span');
    t.className = 'when-t'; t.setAttribute('data-for', addr);
    t.textContent = wall(sp[0]) + '–' + wall(sp[1]);
    el.appendChild(t);
    offer();
  }
  function sweep(root){ [].forEach.call(root.querySelectorAll('[data-when]'), decorate); }

  /* clockTimes(root, { watch: true }) — once, for a page that repaints its clock
   * (the beat moves every ~18 minutes, a walk redraws its rows on every tap).
   * { offer: true } — for a page that IS a view of the clock before it has named
   * a gathering or a beat (/recency opens on the day, and its dial's own rings
   * are too crowded to carry hours), so the switch is there from the start. */
  window.clockTimes = function(root, opts){
    root = root || document.body; opts = opts || {};
    style();
    if (opts.offer) offer();
    sweep(root);
    if (opts.watch && !root.hasAttribute('data-when-watched')){
      root.setAttribute('data-when-watched', '');
      new MutationObserver(function(){ sweep(root); })
        .observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-when'] });
    }
  };
})();

/* ── THE SCOPE — whose walks a page shows (David, 2026-10-13: "add it as an option drop
 * down so that the computer remembers the user's preference — for now and projects and
 * most other pages where there is a list of voices"; and that evening: "It is not a
 * filter, it acts more like a scope — so that there is only a bunch of walks that are
 * actually walked … Default to 'no scope' ie no sed").
 *
 * A scope is a standing group, a sed:<group> on the beach, each seat taken under its
 * holder's own key and naming its holder by opening with their name on the beach,
 * 'happyhedgehog — …', or by a shell:<handle> within it: presence, never a door passed
 * (open-commons 3.4). Chosen under options, the scope holds every page that lists voices
 * to the walks its people actually walk, on this device and for every page at once: a
 * voice whose hand holds no seat is out of scope, and the page SAYS SO AND HOW MANY — a
 * view that hides its own edge is a lie rather than a view (sed:beach-venture-cast).
 * Nothing is hidden on the beach and nothing is gated; every voice stands where it stood.
 * Never out of scope: the page's own hand (a /now/<handle> is that hand's) and the name
 * this device signs with. A group that seats nobody holds everyone. No group until one is
 * chosen, and offered only on a page that lists voices; once a person's organic web can
 * be read (open-commons 3.1), that is the default to come. The choice of no group is
 * called SCOPE: EVERYONE, never 'no scope' (David, 2026-10-20, the card on his timer:
 * "'no scope' is just ugly").
 *
 * THE SCOPE WHERE THE VOICES ARE (David, 2026-10-20: "add scope dropdown to the pop ups on
 * /now and /walk so that a user can scope the voices … whenever there's a bunch of voices,
 * we want the voices to be below generally, and easily scope-able"). A page lays
 * siteScope.pick(out) above the voices it governs: one dropdown, everyone and the groups
 * that seat somebody, and more… for the chooser. Choosing there is choosing under options.
 *
 * WHERE A SCOPE IS HELD (David, 2026-10-13: "yes build both — lists branch 5 and fold the
 * cast in"). Who is in a scope stands in the group's own seats and nowhere else. Which
 * scope a reader looks through is taken, in order, from: this window's own choice (the
 * chooser; sessionStorage, so another tab is untouched); the person's own default, the
 * first of the scopes they read through at lists:<handle> branch 5 — rank is depth, so it
 * follows the person to every device and their own AI can read it, as the row at 3 does;
 * what this device last chose (localStorage, for a reader the device knows no name for);
 * else everyone. 'make this my default' writes branch 5 under the passport's key.
 *
 * A page opts in once with siteScope.watch(redraw, { owner }), asks siteScope.keep(handle)
 * of each voice as it draws (or siteScope.sift(list, handleOf) for the kept and the count
 * out of scope), and lays siteScope.note(out) beside the list. redraw runs again whenever
 * the scope changes, here or in another tab, and once the group's seats have been read. A
 * page that reads the beach as it draws waits on siteScope.ready() before its first draw,
 * and draws again only when known() holds. ── */
(function(){
  'use strict';
  var KEY = 'view:scope', OLD = 'view:voices', ORIGIN = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  var seats = null, readFor = null, seatsP = Promise.resolve(), personal = null, personaP = null, watchers = [], owners = [], styled = false, card = null, groups = null;
  function low(s){ return String(s == null ? '' : s).toLowerCase(); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clean(v){ return low(v).replace(/^sed:/, '').replace(/[^a-z0-9_-]/g, ''); }
  /* the scope this window looks through: its own choice ('-' is everyone, chosen here), else the
   * person's default, else what this device last chose — one made under the first name,
   * voices, carries over — else everyone ('') */
  function chosen(){
    var w = null; try { w = sessionStorage.getItem(KEY); } catch(e){}
    if (w !== null) return w === '-' ? '' : clean(w);
    if (personal && personal.length) return personal[0];
    try { return clean(localStorage.getItem(KEY) || localStorage.getItem(OLD)); } catch(e){ return ''; }
  }
  /* the name this device signs with (knownName below reads the same), as written and lower-cased */
  function meRaw(){
    try { var v = localStorage.getItem('render:who') || localStorage.getItem('venture:who') || ''; return (window.cleanHandle ? window.cleanHandle(v) : String(v).replace(/[^A-Za-z0-9_-]/g, '')) || ''; }
    catch(e){ return ''; }
  }
  function me(){ return low(meRaw()); }
  /* the scopes this person reads through, the default first — lists:<handle> branch 5 */
  function persona(){
    var h = meRaw();
    if (!h || !window.siteLists){ personal = []; return Promise.resolve(personal); }
    return window.siteLists.read(h, 5).then(function(names){ personal = (names || []).map(clean).filter(Boolean); return personal; },
      function(){ personal = []; return personal; });
  }
  function voiceOf(n){ while (n && typeof n === 'object'){ if (!('_' in n)) return null; n = n._; } return typeof n === 'string' ? n : null; }
  /* the hands a group seats, lower-cased */
  function seatsOf(sed){
    var out = [];
    (function walk(n, depth){
      if (!n || typeof n !== 'object') return;
      for (var d = 1; d <= 9; d++){
        var c = n[d]; if (c == null) continue;
        if (depth >= 1){
          var t = voiceOf(c) || '', m = /^\s*([A-Za-z0-9_-]+)\s+[—–-]\s/.exec(t) || /^\s*shell:([A-Za-z0-9_-]+)/.exec(t);
          if (m && out.indexOf(low(m[1])) < 0) out.push(low(m[1]));
        }
        walk(c, depth + 1);
      }
    })(sed, 0);
    return out;
  }
  function read(name){
    return fetch(ORIGIN + (name ? '?block=' + encodeURIComponent(name) : ''), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; });
  }
  /* the seats of the scope now chosen, read once per choice */
  function settle(){
    var g = chosen();
    if (readFor === g) return;
    readFor = g; seats = g ? null : [];
    seatsP = g ? read('sed:' + g).then(function(b){ if (readFor === g){ seats = b ? seatsOf(b) : []; redraw(); } }) : Promise.resolve();
  }
  function load(){
    settle();
    if (!personaP) personaP = persona().then(function(){ var was = readFor; settle(); if (readFor !== was) redraw(); });
  }
  function redraw(){ label(); watchers.forEach(function(f){ try { f(); } catch(e){} }); }
  /* narrowing right now: a group is chosen, read, and names somebody */
  function active(){ return !!chosen() && !!seats && seats.length > 0; }
  function keep(h){
    if (!active()) return true;
    h = low(h);
    return seats.indexOf(h) >= 0 || owners.indexOf(h) >= 0 || (!!h && h === me());
  }
  function sift(list, handleOf){
    var kept = [], aside = 0;
    (list || []).forEach(function(x){ if (keep(handleOf ? handleOf(x) : x)) kept.push(x); else aside++; });
    return { kept: kept, aside: aside };
  }
  /* the line that says what the scope left out — empty when the scope is everyone */
  function note(out){
    var g = chosen(); if (!g) return '';
    var ch = ' · <button type="button" data-scope>change</button>';
    if (!seats) return '<p class="sc-note">scope sed:' + esc(g) + ' — reading its seats…' + ch + '</p>';
    if (!seats.length) return '<p class="sc-note">sed:' + esc(g) + ' seats nobody yet, so the scope holds everyone' + ch + '</p>';
    return '<p class="sc-note">scope sed:' + esc(g) + ' — ' + (out ? out + (out === 1 ? ' voice' : ' voices') + ' out of scope' : 'every voice here is in scope') + ch + '</p>';
  }
  /* THE DROPDOWN, laid above a list of voices: everyone, then the groups that seat somebody in
   * the chooser's own order (read once, the first time a dropdown is laid, and filled in where it
   * stands), the window's own choice wherever it is not among them, and more… for the chooser.
   * `out` is how many the scope left out, or the page's own line about what was set aside. */
  var groupsP = null;
  function options(){
    var g = chosen(), seen = {}, h = '';
    var add = function(n){ if (seen[n]) return; seen[n] = 1; h += '<option value="' + esc(n) + '"' + (n === g ? ' selected' : '') + '>scope: ' + esc(n || 'everyone') + '</option>'; };
    add('');
    (groups ? groups.map(function(x){ return x.name; }) : personal || []).forEach(add);
    if (g) add(g);
    return h + (groups ? '' : '<option disabled>reading the groups…</option>') + '<option value="*">more…</option>';
  }
  function pick(out){
    var g = chosen();
    style();
    var refill = function(){ [].forEach.call(document.querySelectorAll('select[data-scope-pick]'), function(s){ s.innerHTML = options(); }); };
    if (!groupsP) groupsP = listGroups().then(refill, function(){ groups = groups || []; refill(); });
    var line = typeof out === 'string' ? out : !g ? '' : !seats ? 'reading its seats…'
      : !seats.length ? 'it seats nobody yet, so it holds everyone'
      : out ? out + (out === 1 ? ' voice' : ' voices') + ' out of scope' : 'every voice here is in scope';
    return '<p class="sc-pick"><select data-scope-pick' + (g ? ' class="on"' : '') + ' aria-label="scope: whose voices to show">' +
      options() + '</select>' + (line ? '<span>' + line + '</span>' : '') + '</p>';
  }

  var CSS = '.sc-note{font-family:var(--mono);font-size:11.5px;letter-spacing:0.04em;color:var(--vapour-dim);margin:6px 0}' +
    '.sc-note button{background:none;border:0;padding:0;font:inherit;letter-spacing:inherit;color:var(--liquid);cursor:pointer;text-decoration:underline;text-underline-offset:3px}' +
    '.sc-pick{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:2px 0;font-family:var(--mono);font-size:11.5px;letter-spacing:0.04em;color:var(--vapour-dim);line-height:1.5}' +
    /* as wide as the choice it shows, where the browser can size a box to its content */
    '.sc-pick select{font:inherit;letter-spacing:inherit;color:var(--vapour);background:rgb(var(--well-rgb));border:1px solid var(--line);border-radius:6px;padding:4px 6px;cursor:pointer;max-width:100%;field-sizing:content}' +
    '.sc-pick select.on{color:var(--liquid);border-color:rgba(var(--liquid-rgb),0.5)}' +
    '.sc-pick select:hover{border-color:var(--liquid)}' +
    '.sc-pick option{background:rgb(var(--well-rgb));color:var(--foam)}' +
    /* a phone zooms the page into any box under 16px when it is tapped */
    '@media (pointer:coarse){.sc-pick select{font-size:16px}}' +
    '.sc{border:1px solid var(--line-strong);border-radius:12px;background:rgb(var(--well-rgb));color:var(--foam);padding:0;' +
      'width:min(420px,calc(100vw - 32px));max-height:calc(100vh - 48px);box-shadow:0 12px 40px rgba(0,0,0,0.4)}' +
    '.sc::backdrop{background:rgba(0,0,0,0.5)}' +
    '.sc__in{padding:22px 20px 18px;display:grid;gap:12px}' +
    '.sc__x{position:absolute;top:8px;right:8px;background:none;border:none;color:var(--vapour-dim);font-size:14px;line-height:1;padding:6px;cursor:pointer}' +
    '.sc__x:hover{color:var(--foam)}' +
    '.sc__h{font-family:var(--display);font-weight:700;font-size:19px;line-height:1.2;margin:0}' +
    '.sc__p{font-family:var(--body);font-size:15px;line-height:1.45;color:var(--vapour);margin:0}' +
    '.sc__list{display:grid;gap:6px;max-height:46vh;overflow:auto}' +
    '.sc__g{display:grid;gap:2px;text-align:left;background:none;border:1px solid var(--line);border-radius:8px;padding:8px 12px;cursor:pointer;color:var(--foam)}' +
    '.sc__g:hover{border-color:var(--liquid)}' +
    '.sc__g[aria-pressed="true"]{border-color:var(--liquid);background:rgba(var(--wash-rgb),0.07)}' +
    '.sc__g b{font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:0.02em}' +
    '.sc__g span{font-family:var(--body);font-size:14px;line-height:1.35;color:var(--vapour-dim)}' +
    '.sc__any{display:flex;gap:8px}' +
    '.sc__any input{flex:1;min-width:0;background:rgba(var(--well-rgb),0.55);border:1px solid var(--line-strong);border-radius:6px;padding:7px 10px;color:var(--foam);font-family:var(--mono);font-size:13px}' +
    '.sc__any button{background:none;border:1px solid var(--liquid);border-radius:6px;color:var(--liquid);font-family:var(--mono);font-size:12.5px;padding:7px 12px;cursor:pointer}' +
    '.sc__wait{font-family:var(--mono);font-size:12px;color:var(--vapour-dim)}' +
    '.sc__mine{border-top:1px solid var(--line);padding-top:12px;display:grid;gap:8px}' +
    '.sc__mine[hidden]{display:none}' +
    '.sc__mine b{font-family:var(--mono);font-size:13px;color:var(--foam)}' +
    '.sc__acts button{background:none;border:1px solid var(--liquid);border-radius:6px;color:var(--liquid);font-family:var(--mono);font-size:12.5px;padding:7px 12px;cursor:pointer}' +
    '.sc__said{font-family:var(--mono);font-size:12px;color:var(--vapour-dim);margin:0}' +
    '.sc__said:empty{display:none}';
  function style(){
    if (styled) return; styled = true;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  }

  /* the act under options, saying what it is set to */
  function label(){
    var b = document.getElementById('btn-scope'); if (!b) return;
    var g = chosen();
    b.textContent = 'scope: ' + (g || 'everyone');
  }
  function offer(){
    if (document.getElementById('btn-scope')) return;
    var menu = document.querySelector('#dd-acts .dd__menu'), bar = document.querySelector('.bar');
    if (!menu && !bar) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'btn-scope';
    b.title = 'whose walks the pages show — every walk, or the walks of the people in one group';
    b.addEventListener('click', choose);
    if (menu) menu.appendChild(b);
    else { var doors = bar.querySelector('details.dd[data-doors]'); bar.insertBefore(b, doors || null); }
    label();
  }

  /* the chooser: everyone, or a group that seats somebody — the groups this device's
   * name sits in first — or any group by its name */
  function set(g){
    try { sessionStorage.setItem(KEY, g || '-'); } catch(e){}
    try { localStorage.removeItem(OLD); if (g) localStorage.setItem(KEY, g); else localStorage.removeItem(KEY); } catch(e){}
    settle(); redraw(); if (card && card.open) card.close();
  }
  /* the person's default: branch 5 of their lists, written whole under the passport's key —
   * this scope first and the rest after it, or the list emptied for everyone */
  var SCOPES_SAYS = "The scopes this hand reads through, the one it reads through first — each a standing group, sed:<group>, whose seated people's walks every page shows while the scope is on (happyseaurchin.com: scope, under options); a voice out of scope is left out and counted, never hidden. RANK IS DEPTH, as in the lists beside this: 5.1 is the default, taken up wherever this hand's name is on the device, and 5.11 the next, offered first in the chooser. Empty, scope: everyone. Who is in a scope stands in that group's own seats, never here, and a window may look through another scope for itself without touching this list. Once this hand's organic web can be read (open-commons 3.1), an empty list means that instead.";
  var said = '';   /* what the last keep said, shown in the footer it redraws */
  function makeDefault(g){
    var h = meRaw(), say = card && card.querySelector('.sc__said');
    if (!h || !window.siteLists) return;
    var names = g ? [g].concat((personal || []).filter(function(x){ return x !== g; })) : [];
    if (say) say.textContent = 'keeping it in lists:' + h + '…';
    window.siteLists.save(h, 5, SCOPES_SAYS, names.map(function(x){ return 'sed:' + x; })).then(function(w){
      if (w && w.ok){ personal = names; said = (g ? 'sed:' + g : 'Everyone') + ' is your default now, wherever your name is on the device.'; settle(); redraw(); fill(); }
      else if (say) say.textContent = w && w.quiet ? 'Nothing kept.' : 'The beach refused it (' + ((w && w.status) || '?') + ').';
    });
  }
  function listGroups(){
    if (groups) return Promise.resolve(groups);
    return read('').then(function(ix){
      var names = ((ix && ix.blocks) || []).map(function(b){ return typeof b === 'string' ? b : (b && b.name) || ''; })
        .filter(function(n, i, all){ return /^sed:[\w-]+$/.test(n) && all.indexOf(n) === i; }).map(function(n){ return n.slice(4); }).slice(0, 60);
      return Promise.all(names.map(function(n){ return read('sed:' + n).then(function(b){ return { name: n, seats: b ? seatsOf(b) : [] }; }); }));
    }).then(function(all){
      var mine = me(), rank = function(x){ var i = (personal || []).indexOf(x.name); return i < 0 ? 99 : i; };
      groups = all.filter(function(x){ return x.seats.length; }).sort(function(a, b){
        return rank(a) - rank(b) || (b.seats.indexOf(mine) >= 0) - (a.seats.indexOf(mine) >= 0) || b.seats.length - a.seats.length || (a.name < b.name ? -1 : 1);
      });
      return groups;
    });
  }
  function fill(){
    var g = chosen(), list = card.querySelector('.sc__list');
    var row = function(name, line){ return '<button type="button" class="sc__g" data-g="' + esc(name) + '" aria-pressed="' + (name === g) + '"><b>' + (name ? 'sed:' + esc(name) : 'everyone') + '</b><span>' + line + '</span></button>'; };
    list.innerHTML = row('', 'every walk, as the beach has it') + '<p class="sc__wait">reading the groups on the beach…</p>';
    var def = function(){ return (personal && personal[0]) || ''; };
    listGroups().then(function(gs){
      var mine = me();
      list.innerHTML = row('', 'every walk, as the beach has it' + (meRaw() && personal && !def() ? ' · your default' : '')) + gs.map(function(x){
        var names = x.seats.slice(0, 5).join(', ') + (x.seats.length > 5 ? ' and ' + (x.seats.length - 5) + ' more' : '');
        return row(x.name, (x.name === def() ? 'your default · ' : '') + x.seats.length + ' seated' + (mine && x.seats.indexOf(mine) >= 0 ? ', you among them' : '') + ': ' + esc(names));
      }).join('') + (gs.some(function(x){ return x.name === g; }) || !g ? '' : row(g, 'chosen here; it seats nobody yet'));
    });
    /* the person's default, kept in their lists — offered only where the device knows their name */
    var foot = card.querySelector('.sc__mine'), h = meRaw();
    foot.hidden = !h;
    if (!h) return;
    (personaP || Promise.resolve()).then(function(){
      var d = def(), act = '', called = function(x){ return x ? 'sed:' + esc(x) : 'everyone'; };
      if (g !== d) act = '<button type="button" data-make="' + esc(g) + '">make ' + called(g) + ' my default</button>';
      foot.innerHTML = '<p class="sc__p">Your default, kept in your lists so it follows you to every device: <b>' + called(d) + '</b>.' +
        (g === d ? ' This window is set to it.' : ' This window is set to ' + called(g) + '.') + '</p>' +
        (act ? '<p class="sc__acts">' + act + '</p>' : '') + '<p class="sc__said">' + esc(said) + '</p>';
      said = '';
    });
  }
  function choose(){
    style();
    if (!card){
      card = document.createElement('dialog');
      card.className = 'sc';
      card.setAttribute('aria-label', 'scope: whose walks to show');
      card.innerHTML = '<div class="sc__in">' +
        '<button type="button" class="sc__x" aria-label="close">✕</button>' +
        '<p class="sc__h">Scope</p>' +
        '<p class="sc__p">Whose walks every page shows, on this device: all of them, or only the walks of the people seated in one group. A scope hides nothing on the beach, and each list says how many it left out.</p>' +
        '<div class="sc__list"></div>' +
        '<form class="sc__any"><input type="text" spellcheck="false" autocapitalize="off" placeholder="or a group by name, sed:…" aria-label="a group by name"><button type="submit">use</button></form>' +
        '<div class="sc__mine" hidden></div>' +
        '</div>';
      card.querySelector('.sc__x').addEventListener('click', function(){ card.close(); });
      card.addEventListener('click', function(e){
        if (e.target === card) return card.close();
        var m = e.target.closest('[data-make]'); if (m) return makeDefault(m.getAttribute('data-make'));
        var b = e.target.closest('[data-g]'); if (b) set(b.getAttribute('data-g'));
      });
      card.querySelector('.sc__any').addEventListener('submit', function(e){
        e.preventDefault();
        var v = low(card.querySelector('.sc__any input').value).trim().replace(/^sed:/, '').replace(/[^a-z0-9_-]/g, '');
        if (v){ card.querySelector('.sc__any input').value = ''; set(v); }
      });
      document.body.appendChild(card);
    }
    fill();
    if (card.showModal) card.showModal(); else card.setAttribute('open', '');
  }
  document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('[data-scope]')) choose(); });
  /* a dropdown's choice is the choice under options; more… opens the chooser and leaves it as it was */
  document.addEventListener('change', function(e){
    var s = e.target;
    if (!s || !s.matches || !s.matches('select[data-scope-pick]')) return;
    if (s.value === '*'){ s.value = chosen(); choose(); return; }
    set(s.value);
  });
  window.addEventListener('storage', function(e){ if (e.key === KEY || e.key === OLD){ load(); redraw(); } });

  window.siteScope = {
    /* a page that lists voices: redraw runs on every change; owner is never out of scope */
    watch: function(fn, opts){
      opts = opts || {};
      [].concat(opts.owner || []).forEach(function(h){ if (h && owners.indexOf(low(h)) < 0) owners.push(low(h)); });
      if (fn && watchers.indexOf(fn) < 0) watchers.push(fn);
      style(); offer(); load();
    },
    keep: keep, sift: sift, note: note, pick: pick, active: active,
    name: chosen, choose: choose,
    /* for a page that reads as it draws: whether the scope is settled (none, or its seats
     * read), and a promise of that — draw once it holds, and again only when it changes */
    known: function(){ return personal !== null && (!chosen() || !!seats); },
    ready: function(){ load(); return personaP.then(function(){ return seatsP; }); }
  };
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
  /* ONE DOOR IN, EVERYWHERE: "come in →" is /welcome — the single portal where a
     visitor decides to add themselves (a passport: a name, one line, a key; then
     today's line). The same text on every page, and the title it lands on, so
     there is nothing to learn twice. Ruled 2026-09-16 (David: "a non-user who is
     visiting someone's o-page can navigate it and then, at some point, DECIDE to
     create their own, and they get a single page/portal"). Before it the foot
     offered a now, then a passport page — each a door to something, neither the
     decision. Withheld on /welcome itself. A FIELD page — a walk, a recency or
     heatmap, a family's map, a fold — adds the field door as well, because
     standing in somebody's project the other thing to make is a field of your
     own. */
  var FIELD = { walk:1, recency:1, heatmap:1, tree:1, fold:1 };
  document.addEventListener('DOMContentLoaded', function(){
    if (document.getElementById('create-your-own')) return;
    var path = location.pathname.replace(/\/+$/, '');
    var first = (path.split('/')[1] || '').toLowerCase().replace(/\.html$/, '');   /* a local preview serves the file by name */
    var onField = !!FIELD[first];
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
    /* WITHHELD WHERE THE PAGE IS ITSELF THE COMING-IN \u2014 /welcome, and the entrance,
       which asks the same question one rung earlier and holds /welcome as one of
       its six ways in. A door in the foot of the door is the confusion the
       entrance was built to end. */
    if (first !== 'welcome' && first.indexOf('entrance') !== 0) door('https://happyseaurchin.com/welcome', 'come in \u2192');
    /* EVERY FIELD — the index of them all. Named for what it SHOWS, never for the
       route that happens to serve it: '/tree' is the plumbing and a reader never
       has to meet the word. Withheld on the index itself, where it would offer
       the page already open — the same courtesy the places menu pays. */
    if (path !== '/tree') door('https://happyseaurchin.com/tree', 'every field \u2192');
    if (onField) door('https://happyseaurchin.com/found', 'found a field \u2192');
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
 * cleanHandle: the one rule for a handle, on every page.
 *
 * A handle is letters, digits, underscore and hyphen, with one space between
 * words: never a space at either end, never two together. A handle may hold a
 * space. Mark Beall's is "Mark Beall" (David, 2026-10-08), and a door that
 * dropped the space opened the empty now:MarkBeall instead of his now. Every
 * page reads a handle through this, from its address, its boxes and this
 * device, so the rule lives here and nowhere else:
 *
 *     HANDLE = cleanHandle(decodeURIComponent(m[1])) || null;
 *
 * In an address the space travels as %20 (encodeURIComponent on the way out,
 * decodeURIComponent on the way in); in a block name it stands as itself,
 * now:Mark Beall. A box that cleans itself while the person types passes
 * `typing`, which keeps the one space just typed before the next word:
 *
 *     const c = cleanHandle(box.value, true); if (c !== box.value) box.value = c;
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
  'use strict';
  window.cleanHandle = function(v, typing){
    var s = String(v || '').replace(/[^a-z0-9_\s-]/gi, '').replace(/\s+/g, ' ');
    return typing ? s.replace(/^ /, '') : s.trim();
  };
})();

/* ─────────────────────────────────────────────────────────────────────────────
 * dictate — every write box takes the voice as well as the keys.
 *
 * David's ruling (2026-09-07): add dictation. Browser-native — the Web Speech
 * API, SpeechRecognition or its webkit twin — so there is nothing to load and
 * nothing to pay. Chrome finds the words on the device or streams the audio to
 * Google, by its own choice; Safari finds most of them on the device; Firefox
 * has no API at all, so shows no glyph. The tooltip says which, because a
 * person should know where their voice goes before they press.
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
 * held, a space between, each phrase that came bare made a sentence (below);
 * the one phrase it is still revising rides at the end with an ellipsis after
 * it, and is replaced as it firms. Every change is an
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
  var TITLE = 'dictate — Chrome transcribes on this device or sends audio to Google; Safari transcribes mostly on device';
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

  /* A SENTENCE PER LOCKED PHRASE (David, 2026-10-12: 'it used to create
   * sentences … now it is just one long blurb'). Punctuation was always the
   * engine's, and an engine recognising on the device hands back bare words —
   * Chrome now picks the device for itself. So a phrase that arrives BARE (no
   * punctuation at all) gets a capital where a sentence starts and a full stop
   * where it ended, each locked phrase having ended at a pause; in English a
   * lone 'i' stands up. A phrase the engine punctuated is left as it came. The
   * phrase still being revised gets its capital only; its stop waits for the
   * lock. The mirror's use-speech-recognition shapes the same (shapeSpoken). */
  var PUNCTUATED = /[.,!?;:…]/;
  function sentence(before, t, open, lang){
    if (PUNCTUATED.test(t)) return t;
    if (/^en\b/i.test(lang || '')) t = t.replace(/\bi\b/g, 'I');
    if (!before || /[.!?…]["'”’)\]]*\s*$/.test(before) || /\n\s*$/.test(before)) t = t.charAt(0).toUpperCase() + t.slice(1);
    return open ? t : t + '.';
  }

  /* the spoken words after what the box already held: a space between, unless
   * the box ended on a line break the writer put there; the last phrase stays
   * open while the engine is still revising it */
  function glue(base, runs, open, lang){
    var out = base;
    for (var i = 0; i < runs.length; i++){
      var s = sentence(out, runs[i], open && i === runs.length - 1, lang);
      out = !out ? s : /\s$/.test(out) ? out + s : out + ' ' + s;
    }
    return out;
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
      /* the engine's own punctuation where the browser offers it (Chrome's
       * unspokenPunctuation, 2026); elsewhere the sentences above stand in */
      if ('unspokenPunctuation' in r) r.unspokenPunctuation = true;
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
        var open = !!got.interim.trim();
        write(glue(base, runs, open, r.lang) + (open ? MARK : ''));
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
 * The handle names whose pages these are, never who is looking — and since the
 * menu's first line is also the switch between names, a page that takes names in
 * place rather than by its address (the globe) hands over its own hand for that:
 *
 *     siteDoors({ handle: HANDLE, here: 'globe', take: takeName });
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
  /* NAMES ARE NEUTRAL — now, here, page — never "your now": the menu lists the
   * pages OF THE HANDLE IN THE URL, and on happyhedgehog's now that is her now,
   * whoever is looking. The handle stands as the menu's first line so the names
   * read as hers. (David, 2026-09-16: "so it doesn't matter who is looking".) */
  var WORK = [
    ['now',          'now',      'handle'],
    ['here',         'here',     'handle'],
    ['page',         'page',     'handle'],
    ['passport',     'passport', 'handle'],
    ['hands',        'hands',    'handle'],
    /* every handle that spends a key, and the model each uses (David, 2026-09-21) */
    ['models',       'models',   'handle'],
    /* how the beach reaches this handle — /push/<handle> forwards to the push
     * engine's own page, which must stand at its own address (David, 2026-09-26) */
    ['notifications','push',     'handle'],
    ['projects',     'walk',     'family'],
    /* every meeting drawn as one ring, the copies hung under the meeting each came
     * from — a meeting's address is its own name, never a handle, so the handle is
     * carried in the query and the ring moves it to /ring/<name>/<handle>, where it
     * fills the reader's name, so the browser can fill their key (David, 2026-10-10: "Are
     * meetings included in the drop-down go menu"; "can we do a /ring/<name>/<handle>") */
    ['meetings',     'ring',     'carry'],
    /* when people are free — each person's calendar on the clock, filled by their own
     * AI, drawn as a week; the handle rides the query and marks their own lane
     * (David, 2026-10-10, availability.1: "an /availability o-page … a traditional
     * display with blocked calendar") */
    ['availability', 'availability', 'carry'],
    /* a person's pounds by the month, their box beside everyone's row; the page stands without a handle
     * (everyone, as one box) and opens on theirs with one (David, 2026-10-19, moneybox.1: "should there be
     * /moneybox/happyseaurchin o-pages for each individual user too?") */
    ['moneybox',     'moneybox', 'optional'],
    /* the reflexive experiences this hand has had and made, first, then every premiere —
     * a premiere's address is its design's name, so the handle rides the query (David,
     * 2026-10-18: "it should be in the go dropdown list under the user's handle in order
     * to navigate to the user's premieres") */
    ['premieres',    'premiere', 'carry'],
    /* the hand's record drawn as threads through the days, each turn's pull requests, pages, documents and
     * apps a link; /lanes/<hand>+<hand> lays several side by side (David, 2026-10-20: "a simple visual for
     * the lanes/sessions we are operating with; and allows others to attach theirs") */
    ['lanes',        'lanes',    'handle'],
    ['one at a time','next',     'handle'],
    ['the morning',  'morning',  'handle'],
    ['the ledger',   'ledger',   'handle']
  ];
  var GLANCE = [
    ['recency',          'recency',      'family'],
    ['relational field', 'field',        'handle'],
    ['globe',            'globe',        'optional'],
    ['social brain',     'social-brain', 'optional'],
    ['across',           'across',       'handle'],
    ['earth',            'earth',        'optional']
  ];
  /* off until chosen — every other door is what a newcomer meets */
  var DOORS_OFF = { next:1, morning:1, ledger:1, across:1, earth:1, connect:1, lanes:1, 'https://mirror.onen.ai/':1 };
  /* a page renamed keeps the lists that named it */
  var DOOR_ALIAS = { shell:'passport', self:'passport' };
  /* who you do it with: the door in, and the live surface where people actually
   * meet. The mirror named here is the BARE place — a page's own 'mirror ↗'
   * carries that page's coordinate, which makes it an act; the two do not
   * collide because they are not the same thing. */
  var WITH = [
    ['connect', 'connect', 'optional'],
    ['mirror.onen.ai', 'https://mirror.onen.ai/', 'external']
  ];
  var GROUPS = [WORK, GLANCE, WITH];

  /* THE SITE'S OWN PAGES — the ways in and the places to look around, standing in
   * no one's handle and no one world. Three kinds of bar, one menu each (David,
   * 2026-09-24): a person's pages list that person's places, the tables list the
   * tables, and these list each other. [page, label] — the path is the page. */
  var SITE = [
    ['entrance',    'the entrance'],
    ['welcome',     'come in'],
    ['connect',     'connect your AI'],
    /* what a passphrase keeps, what stays open, and storm cover (security.1, 2026-10-12) */
    ['beach-security', 'beach security'],
    ['experiences', 'experiences'],
    /* the same experiences laid as transparencies — four layers, one over another, the
     * same experience at the same spot on each, read differently by each (David,
     * 2026-10-11: "probably on the 'outside' ring for now") */
    ['experience-ecology', 'experience ecology'],
    ['animations',  'animations'],
    /* every reflexive experience, gathered from each maker's own list (David, 2026-10-18:
     * "We definitely need a gallery of them") */
    ['premiere',    'premieres'],
    /* every proposal on the beach, each drawn from its own blocks, and the form that makes one
     * (function:proposal, 2026-10-22: "build the proposal-package") */
    ['proposal',    'proposals'],
    ['dashboard',   'the beach, live'],
    /* the window as it is compiled — ribbons of what entered each call (David, 2026-10-13: "if only it were included in the go dropdown") */
    ['mindflow/flow', 'semantic flow'],
    /* every call through bsp-mcp as it happens, drawn from the router's reflection (bsp-mcp #530) */
    ['mindflow/reflection', 'the reflection, live'],
    ['path',        'part by part', '/path/beach-venture'],
    ['tracks',      'the tracks',   '/tracks/beach-venture'],
    ['ring',        'meetings'],
    /* a meeting's State Stack, live: phones set their stacks, one screen draws the room (task:weft 33, 2026-10-14) */
    ['stack',       'the state stack'],
    ['availability','availability'],
    ['moneybox',    'moneybox'],
    ['tree',        'every field'],
    ['found',       'found a field'],
    ['lately',      'lately'],
    ['news',        'news']
  ];

  /* THE NAME THIS DEVICE SIGNS WITH — render:who, kept by whichever page last wrote
   * under it (/welcome's 'that's me' and its three cards, /page, /view, /render,
   * /network, and /now when a line lands under its key). Never a sign-in: it only says
   * whose pages the site's own menu should offer when a page carries no handle of its
   * own, and the way back to them from anyone else's (the switch, below). */
  function knownName(){
    try { return window.cleanHandle(localStorage.getItem('render:who')) || null; }
    catch(e){ return null; }
  }

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
      /* never past the screen's foot: a long list scrolls inside (the go menu
       * measures its own room when it opens; this is the floor for any menu) */
      'max-height:calc(100vh - 80px);max-height:calc(100dvh - 80px);overflow-y:auto;overscroll-behavior:contain;' +
      'box-shadow:0 8px 28px rgba(0,0,0,0.28)}' +
    /* places read as words, because a place is a word you read */
    '.dd__menu a,.dd__menu .here{font-family:var(--body);font-size:15px;line-height:1.4;' +
      'padding:5px 8px;border-radius:5px;text-decoration:none;border-bottom:none;color:var(--vapour)}' +
    '.dd__menu a:hover{background:rgba(var(--wash-rgb),0.07);color:var(--liquid)}' +
    '.dd__menu .here{color:var(--foam)}' +
    '.dd__who{font-family:var(--mono);font-size:11px;letter-spacing:0.12em;color:var(--solid);padding:4px 8px}' +
    '.dd__rule{height:1px;background:var(--line);margin:7px 4px}' +
    /* the lists as tabs along the top, the one showing in the sea's colour; they
     * stay in sight while a long list scrolls beneath them */
    '.dd__tabs{display:flex;gap:2px;position:sticky;top:0;z-index:1;margin:-8px -8px 4px;padding:6px 8px 0;' +
      'background:rgb(var(--well-rgb));border-bottom:1px solid var(--line);border-radius:8px 8px 0 0}' +
    '.dd__menu button.dd__tab{width:auto;flex:none;max-width:12em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
      'background:none;border:none;border-bottom:2px solid transparent;border-radius:0;margin:0 0 -1px;padding:5px 8px 6px;' +
      'cursor:pointer;font-family:var(--mono);font-size:11.5px;letter-spacing:0.06em;color:var(--vapour-dim)}' +
    '.dd__menu button.dd__tab:hover{color:var(--foam)}' +
    '.dd__menu button.dd__tab[aria-selected="true"]{color:var(--liquid);border-bottom-color:var(--liquid)}' +
    /* first in a hand's list: another name, and the way back to your own */
    '.dd__head{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 4px;margin:2px 0}' +
    '.dd__menu button.dd__switch{width:auto;background:none;border:none;border-radius:4px;margin:0;padding:3px 8px 4px;' +
      'cursor:pointer;font-family:var(--mono);font-size:12px;letter-spacing:0.06em;color:var(--vapour-dim)}' +
    '.dd__menu button.dd__switch:hover{color:var(--liquid)}' +
    '.dd__menu a.dd__back{font-family:var(--mono);font-size:12px;letter-spacing:0.06em;color:var(--vapour-dim);padding:3px 8px 4px}' +
    '.dd__menu a.dd__back:hover{color:var(--liquid)}' +
    '.dd__ask{display:flex;gap:6px;padding:2px 4px 4px;flex:1}' +
    '.dd__ask input{flex:1 1 0;width:0;min-width:0;background:rgba(var(--well-rgb),0.55);border:1px solid var(--line-strong);' +
      'border-radius:4px;padding:5px 8px;color:var(--foam);font-family:var(--mono);font-size:12px}' +
    '.dd__menu .dd__ask button{width:auto}' +
    '.dd__lab{font-family:var(--mono);font-size:10.5px;letter-spacing:0.1em;color:var(--vapour-dim);padding:6px 8px 2px}' +
    /* acts keep the bar\'s own register — a button still looks like a button */
    '.dd__menu button{width:100%;text-align:left}' +
    '.dd__edit{width:100%;text-align:center;background:none;border:none;border-top:1px solid var(--line);'+
      'margin-top:6px;padding:8px 4px 2px;color:var(--vapour-dim);font-family:var(--mono);font-size:11px;'+
      'letter-spacing:0.06em;cursor:pointer}' +
    '.dd__edit:hover{color:var(--liquid)}' +
    /* the chooser: two columns, shown | not shown, stacked on a phone; the ⠿ is the
     * handle a finger drags, so it alone refuses to scroll the menu */
    '.dd__menu.dd__menu--wide{width:min(500px,calc(100vw - 24px))}' +
    '.dd__cols{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;align-items:start}' +
    '@media (max-width:540px){.dd__cols{grid-template-columns:1fr}}' +
    '.dd__list{display:flex;flex-direction:column;gap:1px}' +
    '.dd__item{display:flex;align-items:center;border-radius:5px}' +
    '.dd__item--drag{background:rgba(var(--wash-rgb),0.12);box-shadow:0 3px 12px rgba(0,0,0,0.3)}' +
    '.dd__menu button.dd__grip{width:auto;flex:none;background:none;border:none;border-radius:4px;padding:5px 4px 5px 6px;' +
      'cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none;color:var(--vapour-dim);font-size:14px;line-height:1}' +
    '.dd__menu button.dd__grip:hover,.dd__item--drag button.dd__grip{color:var(--liquid)}' +
    '.dd__menu button.dd__pick{flex:1;min-width:0;display:flex;align-items:center;gap:10px;background:none;border:none;' +
      'border-radius:5px;padding:5px 8px;cursor:pointer;font-family:var(--body);font-size:14.5px;line-height:1.35;color:var(--vapour)}' +
    '.dd__menu .dd__col--off button.dd__pick{color:var(--vapour-dim)}' +
    '.dd__menu button.dd__pick:hover{background:rgba(var(--wash-rgb),0.07);color:var(--liquid)}' +
    '.dd__act{margin-left:auto;font-family:var(--mono);font-size:13px;color:var(--vapour-dim)}' +
    '.dd__empty{font-family:var(--mono);font-size:11px;letter-spacing:0.04em;color:var(--vapour-dim);padding:6px 8px}' +
    /* save and cancel stay at the foot however long the columns run */
    '.dd__foot{display:flex;gap:8px;white-space:nowrap;position:sticky;bottom:0;z-index:1;margin:4px -8px -8px;padding:0 8px 8px;' +
      'background:rgb(var(--well-rgb));border-radius:0 0 8px 8px}' +
    '.dd__foot .dd__edit{flex:1}' +
    /* the share-forward card — the page's own ground, and the code on white so any camera reads it */
    '.sf{border:1px solid var(--line-strong);border-radius:12px;background:rgb(var(--well-rgb));color:var(--foam);' +
      'padding:0;width:min(300px,calc(100vw - 32px));text-align:center;box-shadow:0 12px 40px rgba(0,0,0,0.4)}' +
    '.sf__in{padding:26px 22px 22px}' +
    '.sf::backdrop{background:rgba(0,0,0,0.5)}' +
    '.sf__x{position:absolute;top:8px;right:8px;background:none;border:none;color:var(--vapour-dim);' +
      'font-size:14px;line-height:1;padding:6px;cursor:pointer}' +
    '.sf__x:hover{color:var(--foam)}' +
    '.sf__line{font-family:var(--body);font-size:17px;line-height:1.4;margin:0 0 18px}' +
    '.sf__qr,.sf__qr:hover{display:inline-block;border:none;border-radius:8px;overflow:hidden;line-height:0}' +
    '.sf__qr img{display:block;width:200px;height:200px}' +
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
    /* carry: the page's path names something else (a meeting), so the handle rides in the query */
    if (shape === 'carry')  return handle ? '/' + page + '?h=' + h : '/' + page;
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
      STATED_DOORS.forEach(function(n){ n = DOOR_ALIAS[n] || n; if (by[n] && !seen[n]){ seen[n] = 1; out.push(by[n]); } });
      if (here && by[here] && !seen[here]){ seen[here] = 1; out.push(by[here]); }
      return { list: out, custom: true, all: all };
    }
    var dflt = all.filter(function(p){ return !DOORS_OFF[p[1]] || p[1] === here; });
    return { list: dflt, custom: false, all: all };
  }

  /* ── the acts, gathered ───────────────────────────────────────────────────
   * A bar carrying more than one of the page's own controls gathers them behind
   * 'options', on every page, without any page saying so — the same reason the
   * places catalogue lives here: one mechanism, changed once. Moving a button in
   * the DOM keeps its listeners and its id, so nothing is rewired and no page
   * needs to know this happened.
   *
   * ONE control stays a control: a dropdown holding a single thing is worse than
   * the thing. Since 2026-09-24 every bar carries 'share forward' beside the
   * light-and-dark switch, so every bar gathers.
   * ────────────────────────────────────────────────────────────────────────── */
  function gatherActs(){
    var mount = document.querySelector('.bar');
    if (!mount || document.getElementById('dd-acts')) return;
    shareAct(mount);
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

  /* ── share forward ─────────────────────────────────────────────────────────
   * The Sqale invite that passes the magic-mirror on (David, 2026-09-24): one
   * act in every bar, laid in before the gathering counts so it always stands
   * under 'options' and never loose in a bar. The act opens a card holding the
   * code a friend scans off this screen, and the same invite is one tap for
   * whoever holds it. The same line and the same code stand in the mirror's
   * question card. The code is a static file, fetched only when the card opens.
   * ────────────────────────────────────────────────────────────────────────── */
  var SHARE_FORWARD = 'https://app.sqale.co/invite/CWnW336J44mlPdtWnTC7Ie3Pp5jjCG';
  var shareCard = null;
  function shareAct(mount){
    if (document.getElementById('btn-share-forward')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'btn-share-forward';
    b.textContent = 'share forward';
    b.title = 'pass the magic-mirror on — a code a friend can scan';
    b.addEventListener('click', openShare);
    mount.appendChild(b);
  }
  function openShare(){
    style();
    if (!shareCard){
      shareCard = document.createElement('dialog');
      shareCard.className = 'sf';
      shareCard.setAttribute('aria-label', 'share forward the magic-mirror');
      shareCard.innerHTML = '<div class="sf__in">' +
        '<button type="button" class="sf__x" aria-label="close">✕</button>' +
        '<p class="sf__line">Turn the internet into a beach — ' +
          '<a href="' + SHARE_FORWARD + '" target="_blank" rel="noopener">share forward</a> the magic-mirror!</p>' +
        '<a class="sf__qr" href="' + SHARE_FORWARD + '" target="_blank" rel="noopener" ' +
          'title="tap to open the invite — or hold it up for a friend to scan">' +
          '<img src="/assets/share-forward.svg" width="200" height="200" ' +
          'alt="QR code for the invite that shares the magic-mirror forward"></a></div>';
      shareCard.querySelector('.sf__x').addEventListener('click', function(){ shareCard.close(); });
      /* the card fills the dialog, so only a tap on the dimmed page around it
       * lands on the dialog itself — that closes it, as Escape does */
      shareCard.addEventListener('click', function(e){ if (e.target === shareCard) shareCard.close(); });
      document.body.appendChild(shareCard);
    }
    if (shareCard.showModal) shareCard.showModal();
    else window.open(SHARE_FORWARD, '_blank', 'noopener');
  }

  /* ── a card, from any page ─────────────────────────────────────────────────
   * David, 2026-10-12: a card minted into the hand from wherever the reading
   * is, at the top of the bar to the left of 'options'. Light by construction
   * ('it could load up too much on the o-page'): the bar carries one button and
   * the page asks the beach nothing for it. The card behind it is /mint.js,
   * fetched on the first tap with /hand.js (where a page has not loaded it) as
   * the share card's code is, and it reads the hand only then. Laid in AFTER the
   * gathering, so it stands in the bar and never under 'options'. Named
   * '＋card' and in the cards' own gold (David, 2026-10-12: '＋ by itself is
   * too enigmatic').
   * ────────────────────────────────────────────────────────────────────────── */
  function mintAct(){
    var mount = document.querySelector('.bar');
    if (!mount || document.getElementById('btn-mint')) return;
    /* ON A PHONE THE BAR HAS NO ROOM TO SPARE: the longest title cannot wrap
     * below its longest word (a handle), so the bar's gaps and side padding
     * tighten a little there and the word stacks under its ＋ — else the bar
     * outgrows the screen and the page scrolls sideways (measured at 375px on
     * /walk/<family>/<handle>).
     * AND IT CARRIES ITS WHOLE LOOK, never a page's: a bar whose page styles no
     * buttons (/walk, /recency) left it the browser's own white button (David,
     * 2026-10-12: 'it should just be gold, not white background') — so the gold
     * outline of the bar's other controls, on the bar's own ground, in both
     * registers. */
    var st = document.createElement('style');
    st.textContent = '.bar #btn-mint{-webkit-appearance:none;appearance:none;background:none;' +
        'border:1px solid rgba(var(--solid-rgb),0.55);border-radius:4px;color:var(--solid);' +
        'font-family:var(--mono);font-size:12px;line-height:inherit;padding:6px 10px;cursor:pointer;white-space:nowrap}' +
      '.bar #btn-mint:hover{color:var(--foam);border-color:var(--solid)}' +
      '@media (max-width:420px){html .bar{gap:6px;padding-left:12px;padding-right:12px}' +
        '.bar #btn-mint{white-space:normal;width:min-content;font-size:10.5px;line-height:1.05;padding:3px 6px;letter-spacing:0}}';
    document.head.appendChild(st);
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'btn-mint';
    b.textContent = '＋card';
    b.title = 'a card for today, in your hand';
    b.setAttribute('aria-label', 'add a card to your hand');
    b.addEventListener('click', openMint);
    var acts = document.getElementById('dd-acts');
    var doors = mount.querySelector('details.dd[data-doors]');
    mount.insertBefore(b, acts || doors || null);
  }
  function script(src){
    return new Promise(function(ok, no){
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  var minting = null;
  function openMint(){
    if (window.mintCard) return window.mintCard();
    if (!minting) minting = (window.hand ? Promise.resolve() : script('/hand.js'))
      .then(function(){ return script('/mint.js'); });
    minting.then(function(){ if (window.mintCard) window.mintCard(); },
                 function(){ minting = null; });
  }
  /* registered after gatherActs, so it runs after it */
  document.addEventListener('DOMContentLoaded', mintAct);

  /* ── the beach button, on every page that carries the bar ──────────────────
   * David, 2026-10-15: 'implement it in my O pages … I'm looking at the Now
   * page, and the button is there.' The button is a frame from the beach's own
   * origin (pscale-commons/pscale-beach button/, served at beach/button/): a
   * person unlocks it in the beach's own window, may add their own key, and
   * asks the beach from it, and nothing on this site — this file included — can
   * read what is typed into it or kept there. Since 2026-10-16 it is tapped as
   * xstream's construction button is ('let's go with the new one!'): its circle,
   * bottom right and moved by the grip beside it, shows + to open the prompt, #
   * for settings (where 'hide the button' puts it away until the page reloads)
   * and × to close; one window holds the reply, anything it would write staged
   * with commit, and the prompt.
   * Never in an embed or in a page framed by another, which has its own; never
   * on a page whose body says data-beach-button="off" (its own bottom right is
   * taken: a map's attribution, a side panel). While a page's own sheet or pop
   * is open the button's circle, edge and window step under it, so the sheet's
   * save stays in reach on a phone: the style is carried here, as the ＋card
   * carries its own.
   * A SWITCH UNDER OPTIONS turns it on and off (David, 2026-10-15: 'a toggle in
   * options … to enable/disable the beach button'), and IT IS OFF UNTIL A PERSON
   * TURNS IT ON (David, 2026-10-18: 'relegate the beach button to hidden as
   * default -- and the user needs to enable it, and then it is saved as a
   * configuration on the beach like the go listing'). It comes with the beach's
   * voice (pscale-beach button/voice.js, served beside it), the page's side of
   * the button: a page that takes words asks the voice for them, which goes
   * through the button where the person has it and through the page's own box
   * where not, and the voice brings the button wherever the person has turned it
   * on. Their choice is kept with their settings on the beach, settings:<handle>
   * at 9.1 (the per-person layer of the beach's settings block; 9 is pages), so
   * it follows them to every device that knows their name; a device that knows
   * none keeps it for itself. This file loads the voice on every page with the
   * bar and offers the switch; nothing else here touches the button. The light
   * or the dark is kept beside it, at 9.2 (the ◐, at the top of this file).
   * ────────────────────────────────────────────────────────────────────────── */
  var VOICE = 'https://beach.happyseaurchin.com/button/voice.js';
  var voiceP = null;
  window.siteVoice = function(){ return voice(); };
  /* the beach's voice, once a page: a page that carries it already is not given a second */
  function voice(){
    if (window.beachVoice) return Promise.resolve(window.beachVoice);
    if (!voiceP) voiceP = new Promise(function(ok, no){
      var s = document.createElement('script');
      s.src = VOICE; s.async = true;
      s.onload = function(){ if (window.beachVoice) ok(window.beachVoice); else no(); };
      s.onerror = function(){ voiceP = null; no(); };
      document.body.appendChild(s);
    });
    return voiceP;
  }
  /* the act under options, saying what it will do */
  function bbSwitch(v){
    if (document.getElementById('btn-beach-button')) return;
    var menu = document.querySelector('#dd-acts .dd__menu'), bar = document.querySelector('.bar');
    if (!menu && !bar) return;
    var t = document.createElement('button');
    t.type = 'button'; t.id = 'btn-beach-button';
    t.title = 'the beach button: a frame from the beach, bottom right, holding your handle, passphrase and key where this page cannot reach them — kept in your own settings on the beach wherever your name is known';
    var say = function(){ t.textContent = v.button.shown() ? 'hide beach button' : 'show beach button'; };
    say(); v.onButton(say);
    t.addEventListener('click', function(){
      var on = !v.button.shown();
      v.button.set(on).then(function(r){
        say();
        /* let go at the browser's prompt or in the button: nothing to tell */
        if (r && !r.ok && !r.quiet && !/^declined|^covered/.test(r.error || ''))
          alert('The beach did not keep this in your settings (' + (r.error || r.status || 'no answer') + '), so the beach button is ' + (on ? 'on' : 'off') + ' on this device only.');
      });
    });
    if (menu) menu.appendChild(t);
    else { var doors = bar.querySelector('details.dd[data-doors]'); bar.insertBefore(t, doors || null); }
  }
  function beachButton(){
    var b = document.body;
    if (!b || !document.querySelector('.bar')) return;
    if (window.top !== window || b.classList.contains('embed') || new URLSearchParams(location.search).get('embed') === '1') return;
    /* a page whose corner is taken still follows the person's light or dark; it only has no button */
    var corner = b.getAttribute('data-beach-button') !== 'off';
    if (corner){
      var st = document.createElement('style');
      st.textContent = 'body:has(.sheet-back:not(.hidden),.pop-back:not(.hidden)) :is(iframe[title="beach button"],[data-beach-button-dock],[data-beach-button-edge]){z-index:29 !important}';
      document.head.appendChild(st);
    }
    voice().then(function(v){
      if (corner) bbSwitch(v);
      v.setting('9.2').then(function(t){ if (window.siteTheme) window.siteTheme.adopt(t); });
    }, function(){ /* the beach's voice could not be reached: no switch, and this device's own register */ });
  }
  document.addEventListener('DOMContentLoaded', beachButton);

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
   * Three families are left out of that reckoning because they have their own
   * pages: your now, your ahead, your deck. Now comes back in by another door,
   * below: it is not found, it is given.
   * ────────────────────────────────────────────────────────────────────────── */
  /* a family whose own page is better than its walk. 'ahead' was here until its
   * page folded into /hands — the FAMILY is untouched and its blocks are a hand
   * per project, ahead:<project>:<handle> (hand.js); only the surface went. */
  var OWN_PAGE = { 'now':'now', 'today-beach-deck':'today-beach-deck', 'ahead':'ahead' };
  /* THE PROJECTS EVERY HAND HAS, whether or not it has spoken in them (David,
   * 2026-10-16: "when new person sees projects, they see now ... obviously
   * they're part of now. So the now project should be automatic", and here with
   * it). Every handle has a now (function:now) and stands on the ground, so the
   * two lead the row of anyone who has not yet saved a list, and a hand's first
   * list starts from them, so joining a first project adds to the row rather
   * than replacing it. NOW IS IN EVERY LIST (David, 2026-10-17: "add now to
   * everyone's list"): a list saved without it still shows it, first; the
   * chooser holds it ticked; and every write of a list carries it. A list is
   * locked to its holder's key, so this is how now reaches the lists nobody else
   * can write. 'here' stays a choice once a list stands (an empty list is no
   * list), and shows only where the page can walk the ground. */
  var EVERY_HAND = ['now', 'here'];
  /* the depth of a block's underscore chain — /walk's floorOf, held to exactly: ten is the clock */
  function floorOf(block){ var n = 0, node = block; while (node && typeof node === 'object' && ('_' in node)){ node = node._; n++; } return n; }
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

  /* the index's own touched stamps, kept beside its names, so a law is read again only when it has moved */
  var TOUCHED = {};
  function readIndex(origin){
    var now = Date.now();
    try {
      var c = JSON.parse(sessionStorage.getItem(IDX_KEY) || 'null');
      if (c && c.origin === origin && (now - c.at) < IDX_TTL){ TOUCHED = c.touched || {}; return Promise.resolve(c.blocks); }
    } catch(e){}
    return fetch(origin + '/.well-known/pscale-beach', { headers:{Accept:'application/json'}, cache:'no-store' })
      .then(function(r){ return r.json(); })
      .then(function(j){
        var blocks = j.blocks || [];
        TOUCHED = j.touched || {};
        try { sessionStorage.setItem(IDX_KEY, JSON.stringify({origin:origin, at:now, blocks:blocks, touched:TOUCHED})); } catch(e){}
        return blocks;
      });
  }

  /* THE MODE FROM THE LAW (function:document 1): the word after 'mode:' at a family's law's 1 —
   * 'document' for a family read top to bottom. Read off each law at its 1 and kept on this
   * device against the index's touched stamps, so a law is read again only when it has moved;
   * no registry block. The walk's old documents row kept the same memo under the same name. */
  var MODES_KEY = 'walk-doc-modes';
  function modeWord(n){
    while (n && typeof n === 'object'){ if (!('_' in n)) return ''; n = n._; }
    var m = /^\s*mode:\s*([a-z][\w-]*)/i.exec(typeof n === 'string' ? n : '');
    return m ? m[1].toLowerCase() : '';
  }
  function readModes(origin, fams){
    var memo = {};
    try { memo = JSON.parse(localStorage.getItem(MODES_KEY) || '{}') || {}; } catch(e){}
    function stamp(f){ return TOUCHED['function:' + f] || ''; }
    /* a law with no stamp has not moved since the stamps began, and moving gives it one */
    return Promise.all(fams.filter(function(f){ return !(memo[f] && memo[f].t === stamp(f)); }).map(function(f){
      return fetch(origin + '/.well-known/pscale-beach?block=' + encodeURIComponent('function:' + f) + '&spindle=1',
                   { headers:{Accept:'application/json'}, cache:'no-store' })
        .then(function(r){ return r.status === 404 ? null : r.ok ? r.json() : Promise.reject(r.status); })
        .then(function(n){ memo[f] = { t: stamp(f), m: modeWord(n) }; }, function(){});
    })).then(function(){
      var kept = {}, mode = {};
      fams.forEach(function(f){ if (memo[f]){ kept[f] = memo[f]; mode[f] = memo[f].m; } });
      try { localStorage.setItem(MODES_KEY, JSON.stringify(kept)); } catch(e){}
      return mode;
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

  /* walk a chain, keeping each rung's own children. The chain runs through 1, so a
   * rung is {_: the name, 1: the next rung, 2: THE RELATIONSHIP LINE — how this hand
   * stands to the family, in its own words: 'as coordinator, for Community Recovery'
   * (apex conventions 2.131; bsp-mcp #447 §5)}. Digits 3-9 beneath a rung are kept
   * as found, so a later convention has room and a save never strips one. */
  function chainToItems(node){
    var out = [], n = node && node['1'], guard = 0;
    while (n && typeof n === 'object' && guard++ < 200){
      if (typeof n._ === 'string' && n._.trim()){
        var item = { name: n._.trim(), line: (typeof n['2'] === 'string' ? n['2'].trim() : '') };
        Object.keys(n).forEach(function(k){ if (/^[3-9]$/.test(k)) item[k] = n[k]; });
        out.push(item);
      }
      n = n['1'];
    }
    return out;
  }
  /* the names alone, in order */
  function chainToList(node){ return chainToItems(node).map(function(x){ return x.name; }); }

  /* build the chain back from a list, deepest last — items are names, or
   * {name, line, …} as chainToItems gives them, so what stood beneath a rung stands
   * after the save (the order used to be saved as bare names, which would have
   * dropped every line the moment someone re-ordered their row) */
  function listToChain(items){
    var node = null;
    for (var i = items.length - 1; i >= 0; i--){
      var it = typeof items[i] === 'string' ? { name: items[i] } : items[i];
      var rung = { '_': it.name };
      if (it.line) rung['2'] = it.line;
      Object.keys(it).forEach(function(k){ if (/^[3-9]$/.test(k)) rung[k] = it[k]; });
      if (node) rung['1'] = node;
      node = rung;
    }
    return node;
  }

  /* ONE READ OF A HAND'S LISTS PER PAGE: the go menu reads branch 2, the project row
   * branch 1 and the scope branch 5, all from the same block, so the block is fetched
   * once and shared; a save puts what it wrote in its place, and a read about to be
   * written back (the relationship line) asks for it fresh */
  var listsRead = {};
  function listsBlock(origin, handle, fresh){
    var k = origin + '|' + handle;
    if (fresh || !listsRead[k]) listsRead[k] = fetch(origin + '/.well-known/pscale-beach?block=' + encodeURIComponent(listBlockName(handle)),
                 { headers:{Accept:'application/json'}, cache:'no-store' })
      .then(function(r){ return r.status === 404 ? null : r.json(); })
      .catch(function(){ delete listsRead[k]; return null; });
    return listsRead[k];
  }
  function readItems(origin, handle, digit, fresh){
    return listsBlock(origin, handle, fresh)
      .then(function(b){ return b ? chainToItems(b[String(digit)]) : null; })
      .catch(function(){ return null; });
  }
  function readBranch(origin, handle, digit){
    return readItems(origin, handle, digit).then(function(items){ return items ? items.map(function(x){ return x.name; }) : null; });
  }
  var ROOT_SAYS = "The ordered lists this hand keeps for its own use — one branch per list, and the block is named for the lists rather than for any one of them, because the projects were only the first. Each list is nested so that RANK IS DEPTH: the first item stands at the first rung and the tenth at the tenth, so reading to a depth is reading a top-N and no list is capped at nine. Branch 1 holds the projects; branches 2 onward stand free for whatever else this hand wants ordered.";
  var DOORS_SAYS = "The places this hand wants in its own go menu, in the order it wants them — read by every page's go menu, which shows exactly this under the hand's own tab, with the site's pages and the tables in the tabs beside it. Naming a place here is choosing it, and a place left out simply does not appear: the menu is the choice, not the choice laid over a catalogue. Nothing is lost by leaving one out, because the catalogue every page offers stands whole behind 'choose what shows', which is where a list is changed.";
  var BRANCH_SAYS = "The families this hand counts as its own projects, most-standing first — read by the project row on the walk and recency pages, and by anything else that wants to know what is being worked on. Membership and order are one thing here: the row is this list, read straight down. Beneath each family's rung, at its 2, this hand's own line on how it stands to the family — 'as coordinator, for Community Recovery' — plural across families and changed at will; there is no roster anywhere (the beach's conventions 2.131).";

  function latchFor(handle){ return 'lists-latch:' + handle; }

  /* ── THE RELATIONSHIP LINE, read and written — how a hand stands to a family, in its
   * own words beneath the family's rung in lists:<handle> branch 1, at the rung's 2
   * (the beach's conventions 2.131; bsp-mcp #447 §5). The walk's join door writes it;
   * the row's titles read it. A family not yet listed is appended at the chain's end,
   * so listing and saying how you stand to it are one act. Saved under the passport's
   * key, as every block named for a handle is (handle_bound). ── */
  /* any branch of a hand's lists, by name: the scope keeps its own at 5 (theme.js siteScope) */
  window.siteLists = {
    read: function(handle, digit){ return readBranch('https://beach.happyseaurchin.com', handle, digit); },
    save: function(handle, digit, says, names){ return saveBranch('https://beach.happyseaurchin.com', handle, digit, says, names); }
  };
  window.siteRelation = {
    read: function(origin, handle){ return readItems(origin || 'https://beach.happyseaurchin.com', handle, 1); },
    write: function(origin, handle, family, line){
      origin = origin || 'https://beach.happyseaurchin.com';
      return readItems(origin, handle, 1, true).then(function(items){
        /* a first list starts from the projects every hand has, so the row the
         * hand was shown is still there after it joins */
        items = items && items.length ? items : EVERY_HAND.map(function(f){ return { name: f }; });
        /* and now is in every list, however the list was saved before */
        if (!items.some(function(x){ return x.name === 'now'; })) items.unshift({ name: 'now' });
        var it = items.filter(function(x){ return x.name === family; })[0];
        if (!it){ it = { name: family }; items.push(it); }
        it.line = (line || '').trim();
        return saveBranch(origin, handle, 1, BRANCH_SAYS, items);
      });
    }
  };

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
      .then(function(r){
        /* a read that failed is never written over: the block would be replaced by its error */
        if (!r.ok && r.status !== 404) throw { ok:false, status:r.status };
        return r.status === 404 ? null : r.json();
      })
      .then(function(existing){
        var content = existing ? JSON.parse(JSON.stringify(existing)) : {};
        if (typeof content._ !== 'string' || !content._) content._ = ROOT_SAYS;
        content[String(digit)] = branch;

        var key = null;
        /* the passport's own key first: the beach binds lists:<handle> to it (handle_bound) */
        try { key = localStorage.getItem(latchFor(handle)) || localStorage.getItem('passport-latch:' + handle); } catch(e){}
        if (!key){
          key = prompt('Your key for ' + name + ' — the one your passport uses, if you have one; it keeps these lists yours to edit:');
          if (key === null || !key.trim()) return { ok:false, quiet:true };
          key = key.trim();
        }
        var body = { block: name, content: content, secret: key, new_lock: key };
        if (existing) body.confirm = true;      /* replacing a block that stands */

        var landed = function(){ listsRead[origin + '|' + handle] = Promise.resolve(content); };
        return post(origin, body).then(function(w){
          if (w.ok){ try { localStorage.setItem(latchFor(handle), key); } catch(e){} landed(); return w; }
          var bound = !w.ok && w.data && w.data.code === 'handle_bound';
          if (!lockRequired(w) && !bound) return w;
          var v = prompt(bound ? 'The beach binds ' + name + " to your passport's key — enter that key:" : 'That key was refused for ' + name + '. Try again:');
          if (v === null || !v.trim()) return { ok:false, quiet:true };
          body.secret = v.trim(); body.new_lock = v.trim();
          return post(origin, body).then(function(w2){
            if (w2.ok){ try { localStorage.setItem(latchFor(handle), v.trim()); } catch(e){} landed(); }
            return w2;
          });
        });
      })
      .catch(function(e){ return e && e.ok === false ? e : { ok:false, error: String((e && e.message) || e) }; });
  }

  /* the quiet line beneath the row — how a hand stands to the family it is in */
  var BARE_CSS = '.projrow__bare{flex-basis:100%;font-family:var(--mono);font-size:11px;letter-spacing:0.06em;' +
                 'color:var(--vapour-dim);padding-top:4px}' +
                 '.projrow__bare a{color:var(--vapour-dim);text-decoration:underline dotted;margin:0}';
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
    '.projrow__lead{font-family:var(--mono);font-size:11.5px;letter-spacing:0.06em;color:var(--vapour-dim);padding:1px 5px 1px 8px}' +
    '.projrow .projrow__every{margin-left:8px}' +
    '.projrow__pick{margin-left:10px;background:none;border:none;color:var(--vapour-dim);' +
      'font-family:var(--mono);font-size:11px;letter-spacing:0.06em;cursor:pointer;padding:1px 4px}' +
    '.projrow__pick:hover{color:var(--liquid)}' +
    '.projrow__panel{flex:1 0 100%;display:flex;flex-wrap:wrap;gap:4px 16px;padding:9px 2px 2px;' +
      'margin-top:7px;border-top:1px solid var(--line)}' +
    '.projrow__item{display:flex;align-items:center;gap:7px;font-family:var(--body);' +
      'font-size:14px;color:var(--vapour);min-width:210px}' +
    '.projrow__name{flex:1}' +
    '.projrow__group{flex:1 0 100%;font-family:var(--mono);font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;' +
      'color:var(--vapour-dim);padding-top:6px}' +
    '.projrow__mv{background:none;border:1px solid var(--line);border-radius:4px;color:var(--vapour-dim);' +
      'font-size:11px;line-height:1;padding:2px 5px;cursor:pointer}' +
    '.projrow__mv:disabled{opacity:0.25;cursor:default}' +
    '.projrow__foot{flex:1 0 100%;padding-top:6px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 0}' +
    '.projrow__open{display:flex;gap:6px;margin-left:auto;min-width:0}' +
    '.projrow__open input{font-family:var(--mono);font-size:12px;padding:5px 9px;border:1px solid var(--line-strong);border-radius:4px;' +
      'background:rgba(var(--well-rgb),0.55);color:var(--foam);width:16em;min-width:0}' +
    '.projrow__open button{font-family:var(--mono);font-size:12px;border:1px solid var(--line);border-radius:4px;background:none;' +
      'color:var(--vapour);padding:5px 10px;cursor:pointer;flex:none}' +
    '.projrow__open button:hover{color:var(--foam);border-color:var(--line-strong)}' +
    '.projrow__panel input:disabled{opacity:0.45;cursor:default}' +
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
    var st = document.createElement('style'); st.textContent = ROW_CSS + BARE_CSS; document.head.appendChild(st);
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
      var h = window.cleanHandle(input.value);
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

    Promise.all([readIndex(origin), readItems(origin, cfg.handle, 1)]).then(function(both){
      var blocks = both[0], items = both[1] || [];
      var stated = items.map(function(x){ return x.name; });
      var lineOf = {};
      items.forEach(function(x){ if (x.line) lineOf[x.name] = x.line; });
      var have = {};
      blocks.forEach(function(n){ have[n] = 1; });
      /* A FAMILY IS WELL-FORMED WHEN ITS LAW STANDS — function:<name> beside
       * spine:<name> (ways:founding 2.2; bsp-mcp proposals/2026-09-28-forms-a-family-
       * declares-its-law §3.1). The row lists only well-formed families, which is
       * David's "only show well-formed projects" (2026-09-28): a spine with no law is
       * drawn bare by the pages, under nobody's words, and a row that names it
       * beside the others says it is something it is not yet. It is not hidden
       * either — a family you list or hold a mirror in that has no form yet waits in
       * the chooser under its own heading, and a direct link still opens it (his
       * answer to the forms proposal's §9); it is never listed beneath the row (David,
       * 2026-10-01: no list of badly formed projects). The families with their own pages and the ground
       * carry their law elsewhere (function:now, function:earth) and are exempt. */
      /* A HAND'S OWN DIARY IS NOT A PROJECT: spine:<handle> beside passport:<handle>
       * is the family /page founds for a person's posts, and a reader's answer there
       * founds <handle>:<reader> — which made every person you had answered arrive
       * in your row as a project, and now would arrive as one 'with no form yet'.
       * Its form is the page. Left out of the computed row; counted well-formed if
       * a hand lists it on purpose, as the families with their own pages are. */
      function isDiary(f){ return !!have['passport:' + f]; }
      function wellFormed(f){ return !!have['function:' + f] || !!OWN_PAGE[f] || f === 'here' || isDiary(f); }
      var mine = [], bare = [];
      blocks.forEach(function(n){
        if (n.indexOf('spine:') !== 0) return;
        var f = n.slice(6);
        if (OWN_PAGE[f] || isDiary(f)) return;
        if (!have[f + ':' + cfg.handle]) return;
        (wellFormed(f) ? mine : bare).push(f);
      });
      /* whatever you are standing in belongs in the row even if you hold no mirror
       * there yet — otherwise the row silently disagrees with the page above it;
       * and a bare family you are standing in is said plainly by the page above,
       * not repeated beneath the row */
      if (cfg.family && !OWN_PAGE[cfg.family] && mine.indexOf(cfg.family) < 0) mine.push(cfg.family);
      bare = bare.filter(function(f){ return f !== cfg.family; });
      /* THE GROUND IS EVERYONE'S. 'here' is the one family named by register rather
       * than by spine: — its spine is spatial:earth at the real and your voice there
       * is identity:<handle> — so the apex index never lists it and the rule above
       * cannot find it. Every handle stands on the earth-map, so it is offered in the
       * row on every page that can walk it (David, 2026-09-14: "why doesn't here
       * appear?") and stays a choice like any other; a page that cannot walk the
       * ground leaves it out even when a saved list names it. Now and here stand
       * first, as every hand's own (EVERY_HAND), and the found families after. */
      var walksGround = !!{ walk: 1 }[cfg.page];
      var given = EVERY_HAND.filter(function(f){ return f !== 'here' || walksGround; });
      mine.sort();
      mine = given.concat(mine.filter(function(f){ return given.indexOf(f) < 0; }));

      /* THE LIST IS THE TRUTH WHERE ONE STANDS. Said plainly at lists:<handle> branch 1,
       * it decides both membership and order and nothing is computed; absent, the
       * default below stands in until the hand says otherwise. There is no hidden
       * set either way — a family is in the list or it is not. */
      var visible;
      if (stated && stated.length){
        /* A family with its own page is held out of the COMPUTED default, because
         * nobody chose it. Named in the list it is a choice, so it stands. */
        visible = stated.slice();
        if (!walksGround) visible = visible.filter(function(f){ return f !== 'here'; });
        /* now is in every list (EVERY_HAND): one saved without it still shows it, first */
        if (visible.indexOf('now') < 0) visible.unshift('now');
        if (cfg.family && visible.indexOf(cfg.family) < 0) visible.push(cfg.family);
        /* a stated family with no form yet stays yours and stays listed; it waits in
         * the chooser until its law stands, never drawn as a project beside the
         * others (the family you stand in is the one exception, said above) */
        visible = visible.filter(function(f){ return f === cfg.family || wellFormed(f); });
        /* a stated project you hold no mirror in yet is still yours — offer it too */
        stated.forEach(function(f){
          if (f === cfg.family) return;
          if (wellFormed(f)){ if (mine.indexOf(f) < 0) mine.push(f); }
          else if (bare.indexOf(f) < 0) bare.push(f);
        });
      } else {
        visible = mine.filter(function(f){
          if (f === cfg.family) return true;         /* never hide where you are standing */
          return !OFF_BY_DEFAULT[f];
        });
      }
      /* A HAND IN NO PROJECT YET IS SHOWN THE BEACH'S PROJECTS, never an empty bar. James
       * (emojisword) met /walk/now with no row at all, because a newcomer's row is the
       * ground alone and a row of one is hidden (David, 2026-10-08). A project is what the
       * beach's conventions call one (2.13): spine:<f> for its addresses, function:<f> for
       * its law, pool:<f> for its room — which leaves out the tests and the machinery that
       * carry a law and no room. Most-spoken first, nine at most, each opening its walk,
       * where the join door founds the mirror and lists the family in one act. Nothing is
       * written by being offered, and once a family is joined the row is the hand's own
       * and the offer is gone. A passport first, as /welcome says: the beach binds a mirror
       * to its holder's key. */
      /* A ROW OF ONE KEEPS ITS CHOOSER (David, 2026-10-10). It was hidden as furniture
       * while 'choose' held only the hand's own families; since the documents and any
       * family by name stand there too, it is always a choice, so a hand with a list or
       * a mirror keeps its row however short, and the offer below ends in it as well. */
      /* IN NO PROJECT YET now means nothing beyond the projects every hand has, save
       * the one being stood in (2026-10-16); standing in a family on the walk, its own
       * join door in the masthead is the offer. Without a passport the row still
       * stands, now and here in it, and only the offer waits: the row used to be
       * withheld whole, which hid the very projects a newcomer has from the start. */
      var offer = null;
      var joined = mine.filter(function(f){ return EVERY_HAND.indexOf(f) < 0; });
      var doorHere = cfg.page === 'walk' && joined.indexOf(cfg.family) >= 0;
      if (!doorHere && joined.length < 2 && !bare.length && !stated.length && have['passport:' + cfg.handle] &&
          !joined.some(function(f){ return have[f + ':' + cfg.handle]; })){
        /* people in a family, counted as /tree counts them: <f>:<handle> */
        var people = {};
        blocks.forEach(function(n){
          var i = n.lastIndexOf(':');
          if (i > 0 && /^[A-Za-z][A-Za-z0-9 _-]*$/.test(n.slice(i + 1))) people[n.slice(0, i)] = (people[n.slice(0, i)] || 0) + 1;
        });
        offer = blocks.filter(function(n){ return n.indexOf('spine:') === 0; })
          .map(function(n){ return n.slice(6); })
          .filter(function(f){ return f !== cfg.family && !OWN_PAGE[f] && !OFF_BY_DEFAULT[f] && !isDiary(f) && have['function:' + f] && have['pool:' + f]; })
          .sort(function(x, y){ return (people[y] || 0) - (people[x] || 0) || x.localeCompare(y); })
          .map(function(f){ return { name: f, people: people[f] || 0 }; });
        if (!offer.length) offer = null;
      }
      function shown(f){ return visible.indexOf(f) >= 0; }

      rowStyle();

      var row = document.createElement('div');
      row.className = 'projrow';
      row.setAttribute('aria-label', offer ? 'your projects, and projects to join' : 'your projects');

      visible.forEach(function(f, i){
        if (i){ var s = document.createElement('span'); s.className = 'sep'; s.textContent = '•'; row.appendChild(s); }
        if (f === cfg.family){
          var cur = document.createElement('span');
          cur.className = 'here'; cur.textContent = f;
          cur.setAttribute('aria-current', 'true');
          if (lineOf[f]) cur.title = lineOf[f];
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
          if (lineOf[f]) a.title = lineOf[f];     /* how this hand stands to it, in its own words */
          row.appendChild(a);
        }
      });
      /* the chooser, on the row it governs — every family you hold a mirror in,
       * including the ones off by default, so nothing is unreachable. Same organ
       * as 'choose what shows' in the places menu, same device-local home. */
      var pick = document.createElement('button');
      pick.type = 'button'; pick.className = 'projrow__pick';
      pick.textContent = 'choose';
      pick.title = 'your projects, the documents on this beach, and any family by name';
      pick.addEventListener('click', function(e){
        e.stopPropagation();
        if (row.querySelector('.projrow__panel')){ row.querySelector('.projrow__panel').remove(); return; }
        var panel = document.createElement('div');
        panel.className = 'projrow__panel';

        /* the working order: what is in the row, then everything else beneath it,
         * so ticking a family on drops it at the end rather than nowhere */
        var order = visible.slice();
        mine.forEach(function(f){ if (order.indexOf(f) < 0) order.push(f); });
        /* a family with no form yet is still yours to list or unlist; it is only
         * the row that waits for its law */
        bare.forEach(function(f){ if (order.indexOf(f) < 0) order.push(f); });
        /* THE TICKS ARE WHAT WAS CHOSEN, NEVER WHAT IS MERELY UNDERFOOT. `visible`
         * force-adds the family being stood in so the row cannot disagree with the
         * page above it; ticking from that list would make a save silently adopt a
         * family only visited once. Tick from the stated list where there is one,
         * and from the computed default where there is not — the same law the
         * places menu keeps, where `here` reaches the menu and never the editor. */
        var inList = {}, listed = {};
        (stated && stated.length ? stated : visible).forEach(function(f){ inList[f] = 1; listed[f] = 1; });
        inList.now = 1;      /* in every list, so a save writes it into one saved without it */

        /* SEPARATED BY FORM, as the walk reads it (David, 2026-10-01): a spine whose
         * underscore chain runs ten deep walks as the clock, any other spine as
         * branches, the ground as places, and a family with no law waits beneath
         * them. Read off each spine when the chooser opens — the form is where the
         * data sits, never a word stored beside it. The arrows move a family within
         * its form; the row keeps the saved order.
         * DOCUMENTS ARE A FORM LIKE THE OTHERS (David, 2026-10-10: "add documents to
         * the drop down and treat them like all the others"): a family whose law says
         * 'mode: document' at its 1 stands under its own heading, and every document
         * on the beach is offered there, mirror or none, because a document is often
         * one somebody else wrote for you to read. Ticked, it joins the row like any
         * project; there is no second row of documents. */
        var GROUPS = [['clock', 'on the clock'], ['tree', 'in branches'], ['document', 'documents'], ['ground', 'on the map'], ['bare', 'no form yet']];
        var formOf = {}, isDoc = {};
        function groupOf(f){ return isDoc[f] ? 'document' : formOf[f] || 'tree'; }
        function readForms(){
          var laws = blocks.filter(function(n){ return n.indexOf('spine:') === 0 && have['function:' + n.slice(6)]; })
            .map(function(n){ return n.slice(6); })
            .filter(function(f){ return /^[a-z0-9-]+$/i.test(f); })
            .sort();
          var docs = readModes(origin, laws).then(function(mode){
            laws.forEach(function(f){
              if (mode[f] !== 'document') return;
              isDoc[f] = 1;
              if (order.indexOf(f) < 0) order.push(f);
            });
          });
          return Promise.all([docs].concat(order.map(function(f){
            if (f === 'here'){ formOf[f] = 'ground'; return null; }
            if (bare.indexOf(f) >= 0){ formOf[f] = 'bare'; return null; }
            return fetch(origin + '/.well-known/pscale-beach?block=' + encodeURIComponent('spine:' + f),
                         { headers:{Accept:'application/json'}, cache:'no-store' })
              .then(function(r){ return r.ok ? r.json() : null; })
              .then(function(b){ formOf[f] = floorOf(b) === 10 ? 'clock' : 'tree'; })
              .catch(function(){ formOf[f] = 'tree'; });
          })));
        }

        function draw(){
          panel.innerHTML = '';
          GROUPS.forEach(function(g){
            var fams = order.filter(function(f){ return groupOf(f) === g[0]; });
            if (!fams.length) return;
            var head = document.createElement('div');
            head.className = 'projrow__group'; head.textContent = g[1];
            panel.appendChild(head);
            fams.forEach(function(f, k){
              var rowEl = document.createElement('div');
              rowEl.className = 'projrow__item';
              var cb = document.createElement('input');
              cb.type = 'checkbox'; cb.checked = !!inList[f];
              /* now is in every list (EVERY_HAND): held ticked, never one to drop */
              if (f === 'now'){ cb.disabled = true; cb.title = 'every hand has a now — it stays in the list'; }
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
                var other = fams[k + mv[1]];
                b.disabled = !other;
                b.addEventListener('click', function(e){
                  e.stopPropagation();
                  var i = order.indexOf(f), j = order.indexOf(other);
                  order[i] = other; order[j] = f;
                  draw();
                });
                rowEl.appendChild(b);
              });
              panel.appendChild(rowEl);
            });
          });

          var foot = document.createElement('div'); foot.className = 'projrow__foot';
          /* The row carries the family you stand in whether or not it is in your list,
           * so say which: unticked just now, the save is honoured and the row still
           * carries it while you are in it, or the reload reads as the save ignored;
           * never in the list, it is there only because you are standing in it (David,
           * 2026-10-10, at availability-scope: the old line spoke of an untick he had
           * never made). */
          if (cfg.family && !inList[cfg.family]){
            var stay = document.createElement('span');
            stay.className = 'projrow__note';
            stay.textContent = listed[cfg.family]
              ? cfg.family + ' will still show while you stand in it \u2014 it leaves the row everywhere else'
              : cfg.family + ' isn\u2019t in your list \u2014 tick it to keep it in the row';
            foot.appendChild(stay);
          }
          var save = document.createElement('button');
          save.type = 'button'; save.className = 'projrow__pick';
          save.textContent = 'save to the beach';
          save.title = 'writes branch 1 of lists:' + cfg.handle + ' — yours, portable, readable by anything';
          save.addEventListener('click', function(e){
            e.stopPropagation();
            save.disabled = true; save.textContent = 'saving…';
            saveBranch(origin, cfg.handle, 1, BRANCH_SAYS, order.filter(function(f){ return inList[f]; }).map(function(f){
                return items.filter(function(x){ return x.name === f; })[0] || { name: f };   /* the rung's own line rides along */
              }))
              .then(function(w){
                if (w && w.ok){ location.reload(); return; }
                save.disabled = false;
                save.textContent = (w && w.quiet) ? 'save to the beach' : 'refused — try again';
              });
          });
          foot.appendChild(save);
          /* ANY FAMILY, BY NAME \u2014 the box the walk's documents row carried, moved here
           * with the documents: the way to a family you hold no mirror in and nobody
           * has listed for you. It opens on this same page, as the row's links do. */
          var open = document.createElement('span'); open.className = 'projrow__open';
          var fams = blocks.filter(function(n){ return n.indexOf('spine:') === 0 && /^[a-z0-9-]+$/i.test(n.slice(6)); })
            .map(function(n){ return n.slice(6); }).sort();
          var dl = document.createElement('datalist'); dl.id = 'projrow-fams';
          fams.forEach(function(f){ var o = document.createElement('option'); o.value = f; dl.appendChild(o); });
          var box = document.createElement('input');
          box.setAttribute('list', 'projrow-fams'); box.placeholder = 'open a family by name';
          box.setAttribute('aria-label', 'open a family by name');
          box.setAttribute('autocapitalize', 'none'); box.setAttribute('autocomplete', 'off'); box.spellcheck = false;
          var go = document.createElement('button'); go.type = 'button'; go.textContent = 'open';
          function openIt(){
            var f = box.value.trim().replace(/[^a-z0-9-]/gi, '');
            if (!f) return;
            if (fams.indexOf(f) < 0){ box.value = ''; box.placeholder = 'no family named ' + f + ' here'; return; }
            location.href = '/' + cfg.page + '/' + encodeURIComponent(f) + '/' + encodeURIComponent(cfg.handle);
          }
          go.addEventListener('click', function(e){ e.stopPropagation(); openIt(); });
          box.addEventListener('keydown', function(e){ if (e.key === 'Enter'){ e.preventDefault(); openIt(); } });
          open.appendChild(box); open.appendChild(go); open.appendChild(dl);
          foot.appendChild(open);
          panel.appendChild(foot);
        }
        panel.textContent = 'reading the forms\u2026';
        row.appendChild(panel);
        readForms().then(draw);
      });
      /* the offer stands before the chooser — nothing joined yet beyond now and here,
       * but the documents and any family by name are there to choose all the same */
      if (offer){
        var lead = document.createElement('span');
        lead.className = 'projrow__lead';
        lead.textContent = 'nothing joined yet \u2014 pick one:';
        row.appendChild(lead);
        offer.slice(0, 9).forEach(function(p, i){
          if (i){ var s = document.createElement('span'); s.className = 'sep'; s.textContent = '•'; row.appendChild(s); }
          var a = document.createElement('a');
          a.href = '/walk/' + encodeURIComponent(p.name) + '/' + encodeURIComponent(cfg.handle);
          a.textContent = p.name;
          a.title = p.people + (p.people === 1 ? ' person' : ' people') + ' in it';
          row.appendChild(a);
        });
        if (offer.length > 9){
          var every = document.createElement('a');
          every.className = 'projrow__every';
          every.href = '/tree?h=' + encodeURIComponent(cfg.handle);
          every.textContent = 'every field \u2192';
          row.appendChild(every);
        }
      }
      row.appendChild(pick);
      /* how this hand stands to the family it is standing in — its own line; on the
       * walk the masthead carries it, with the door that writes it */
      if (cfg.page !== 'walk' && cfg.family && lineOf[cfg.family]){
        var fl = document.createElement('span');
        fl.className = 'projrow__bare';
        fl.textContent = 'you, here: ' + lineOf[cfg.family];
        row.appendChild(fl);
      }

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
    s.title = cfg.world ? 'this table, and the open tables' : cfg.rpg ? 'the tables and the mirror'
      : cfg.site ? 'the ways in, and the places to look around' : 'this handle’s pages, and the places to glance at';
    d.appendChild(s);

    var menu = document.createElement('div');
    menu.className = 'dd__menu';

    /* THE LISTS AS TABS (tidying.22; David, 2026-10-12: "I need to work on it so that
     * it is more obvious"). The go menus are kinds of list — a hand's places, the site's
     * own pages, the tables or a character's table — and a reader standing in one must
     * reach the others without knowing an address. Until today each list carried one
     * door across at its foot ('welcome' one way, '<name>'s now' the other; David,
     * 2026-10-02), which named neither list and moved the reader before showing them
     * anything. Now each list is a tab along the menu's top, in the same order on every
     * page, and the menu opens on the tab of the page it stands on: a hand's places on a
     * hand's page, the site's on the site's, the tables at a table. A tap shows another
     * list in place. The hand's tab is the page's own name, or else the name this
     * device signs with, and is left out where neither is known, as the crossing was.
     * A hand's list is kept at the apex whichever beach the page reads. */
    var APEX = 'https://beach.happyseaurchin.com';
    var HOME = cfg.world ? 'table' : cfg.rpg ? 'tables' : cfg.site ? 'site' : 'hand';
    var HAND = HOME === 'hand' ? (cfg.handle || null) : (HOME === 'site' && cfg.handle) || knownName();
    var TABS = [].concat(HOME === 'hand' || HAND ? ['hand'] : [], ['site'], cfg.rpg ? ['tables'] : [], cfg.world ? ['table'] : []);
    var TAB = HOME;
    var LABEL = { hand: HAND || 'places', site: 'the site', tables: 'the tables', table: 'this table' };
    var TIP = { hand: HAND ? HAND + '’s places' : 'a person’s places — say whose',
                site: 'happyseaurchin.com — the ways in, and the places to look around',
                tables: 'the open tables, and how the game plays', table: 'this table, and who is at it' };

    function tabRow(){
      var row = document.createElement('div');
      row.className = 'dd__tabs'; row.setAttribute('role', 'tablist');
      TABS.forEach(function(t){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'dd__tab'; b.setAttribute('role', 'tab');
        b.setAttribute('data-keep-open', '');
        b.setAttribute('aria-selected', t === TAB ? 'true' : 'false');
        b.textContent = LABEL[t]; b.title = TIP[t];
        b.addEventListener('click', function(e){
          e.stopPropagation();
          if (t === TAB) return;
          TAB = t;
          if (t === 'hand') readStated();
          paint();
        });
        row.appendChild(b);
      });
      menu.appendChild(row);
    }

    /* a place in a list: a link, or the one stood on, marked as here */
    function door(label, url, here){
      if (here){
        var cur = document.createElement('span');
        cur.className = 'here'; cur.textContent = label; cur.setAttribute('aria-current', 'page');
        menu.appendChild(cur);
        return;
      }
      var a = document.createElement('a'); a.href = url; a.textContent = label;
      menu.appendChild(a);
    }
    function rule(){ var r = document.createElement('div'); r.className = 'dd__rule'; menu.appendChild(r); }

    /* A CHARACTER IN A WORLD keeps none of a person's places — no now, no here, no
     * hands, no list of its own — so a world page's menu is the world's: this
     * character's page, the others at the same table (read off the table's own
     * index, as /rpg reads it), the table in the mirror, and the open tables.
     * Nothing to choose, so no editor. The catalogue across worlds — earth's and a
     * fantasy world's alike — is a later pass; this is the table's shape now. */
    var CAST = null;
    function paintWorld(){
      var who = document.createElement('span');
      who.className = 'dd__who'; who.textContent = (cfg.handle ? cfg.handle + ' · ' : '') + cfg.world;
      menu.appendChild(who);
      /* the character's own pages at this world — the one stood on marked as here */
      [['page', '’s page', '/page/'], ['passport', '’s passport', '/passport/'], ['gallery', '’s pictures', '/gallery/']].forEach(function(own){
        if (!cfg.handle) return;   /* a world page with no one carried — the table's own doors only */
        /* the ring at a table: the character's page and their pictures are offered from each other;
           the passport is written to its holder and shows only as the place stood on */
        if (own[0] === 'passport' && own[0] !== cfg.here) return;
        door(cfg.handle + own[1], own[2] + encodeURIComponent(cfg.handle) + '?world=' + encodeURIComponent(cfg.world), own[0] === cfg.here);
      });
      var others = (CAST || []).filter(function(n){ return !cfg.handle || n.toLowerCase() !== String(cfg.handle).toLowerCase(); });
      if (others.length){
        var lab = document.createElement('span');
        lab.className = 'dd__lab'; lab.textContent = 'at this table';
        menu.appendChild(lab);
        others.forEach(function(n){ door(n, '/page/' + encodeURIComponent(n) + '?world=' + encodeURIComponent(cfg.world)); });
      }
      rule();
      door('the table in the mirror ↗', 'https://mirror.onen.ai/?world=' + encodeURIComponent(cfg.world));
      door('the open tables', '/rpg');
      door('what play costs', '/costs');
    }

    /* THE TABLES' OWN PAGES, standing in no one world (/rpg): the open tables, the
     * mirror where the tables are played, and the page that says how the game goes.
     * A character is reached from its table's line on the page itself. */
    function paintRpg(){
      [['rpg', 'the open tables', '/rpg'], ['mirror', 'the mirror ↗', 'https://mirror.onen.ai/'], ['play', 'how the game plays', '/play'], ['costs', 'what play costs', '/costs'], ['gallery', 'the tables, in stills', '/gallery' + (cfg.world ? '?world=' + encodeURIComponent(cfg.world) : '')]].forEach(function(p){
        door(p[1], p[2], p[0] === cfg.here);
      });
    }

    /* THE SITE'S OWN PAGES (SITE, above): each other, the one stood on marked as
     * here; across a rule the mirror and the tables. A reader passing through from
     * someone else's places carries that name in the query, which the site's pages
     * take, so the hand's tab there still offers the way back — the chain of doors is
     * not broken by passing through. */
    function carry(url){
      var me = knownName();
      if (!HAND || (me && me.toLowerCase() === HAND.toLowerCase())) return url;
      return url + (url.indexOf('?') < 0 ? '?' : '&') + 'h=' + encodeURIComponent(HAND);
    }
    function paintSite(){
      SITE.forEach(function(p){ door(p[1], carry(p[2] || '/' + p[0]), p[0] === cfg.here); });
      rule();
      door('the mirror ↗', 'https://mirror.onen.ai/');
      door('the tables', '/rpg');
    }

    /* THE SWITCH — first in a hand's list (tidying.19, 2026-10-05). A name on any page
     * opens that person's page (#319), and from there every door carries their name, so
     * a reader who followed one had no way back but the address bar. The tab says whose
     * places these are; '⇄ another name' takes any other name, the same place theirs.
     * And while the list stands in a name that is not the one this device signs with,
     * that name stands beside it: one tap back to the same place as yourself. Never a
     * sign-in — a key still decides what can be written. */
    function sameFor(h){
      var p = null;
      [].concat.apply([], GROUPS).forEach(function(x){ if (x[1] === cfg.here) p = x; });
      return (p && href(p[1], p[2], h, cfg.family)) || '/now/' + encodeURIComponent(h);
    }
    function goAs(h){
      if (typeof cfg.take === 'function'){ d.removeAttribute('open'); cfg.take(h); return; }
      location.href = sameFor(h);
    }
    function switchRow(){
      var me = knownName();
      var head = document.createElement('div'); head.className = 'dd__head';
      var who = document.createElement('button');
      who.type = 'button'; who.className = 'dd__switch'; who.setAttribute('data-keep-open', '');
      who.textContent = HAND ? '⇄ another name' : '⇄ whose pages?';
      who.title = 'another name — the same place, theirs';
      who.addEventListener('click', function(e){ e.stopPropagation(); askName(head, who); });
      head.appendChild(who);
      if (me && (!HAND || me.toLowerCase() !== HAND.toLowerCase())){
        var back = document.createElement('a');
        back.className = 'dd__back'; back.href = sameFor(me);
        back.textContent = '↩ ' + me;
        back.title = 'this place as ' + me + ' — the name this device signs with';
        back.addEventListener('click', function(e){
          if (typeof cfg.take !== 'function' || e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault(); goAs(me);
        });
        head.appendChild(back);
      }
      menu.appendChild(head);
    }
    /* the switch flips into a box where it stands, as 'choose what shows' flips the list */
    function askName(head, who){
      var row = document.createElement('div'); row.className = 'dd__ask';
      var input = document.createElement('input');
      input.type = 'text'; input.placeholder = 'a name'; input.setAttribute('aria-label', 'whose pages');
      input.setAttribute('autocapitalize', 'none'); input.setAttribute('spellcheck', 'false');
      var ok = document.createElement('button');
      ok.type = 'button'; ok.textContent = 'go'; ok.setAttribute('data-keep-open', '');
      function land(){
        var h = window.cleanHandle(input.value);
        if (h) goAs(h); else input.focus();
      }
      ok.addEventListener('click', function(e){ e.stopPropagation(); land(); });
      input.addEventListener('keydown', function(e){ if (e.key === 'Enter') land(); });
      row.appendChild(input); row.appendChild(ok);
      head.replaceChild(row, who);
      input.focus();
    }

    function paintHand(){
      switchRow();
      var a = arrange(cfg.here), lastGroup = null;
      a.list.forEach(function(p){
        /* the group rule is the AUTHORED arrangement speaking; once a reader has
         * stated their own order it would be drawing a distinction they did not make */
        var g = groupOf(p);
        if (!a.custom && lastGroup !== null && g !== lastGroup) rule();
        lastGroup = g;
        var u = href(p[1], p[2], HAND, cfg.family);
        if (u) door(p[0], u, p[1] === cfg.here);   /* nowhere to go yet — say so by omission */
      });
      var edit = document.createElement('button');
      edit.className = 'dd__edit'; edit.type = 'button'; edit.setAttribute('data-keep-open',''); edit.textContent = 'choose what shows';
      edit.addEventListener('click', function(e){
        e.stopPropagation();
        edit.textContent = 'reading your list…';
        doorsRead.then(editor);
      });
      menu.appendChild(edit);
    }

    function paint(){
      menu.innerHTML = '';
      menu.classList.remove('dd__menu--wide');
      tabRow();
      if (TAB === 'hand') paintHand();
      else if (TAB === 'site') paintSite();
      else if (TAB === 'tables') paintRpg();
      else paintWorld();
    }

    /* THE CHOOSER — the same panel flipped over, in two columns (tidying.22; David,
     * 2026-10-12): on the left what shows, in its order, which is the menu exactly as
     * it will read; on the right the rest of the catalogue. A tap on a place moves it
     * across; the ⠿ beside a shown place drags it into its order, and the arrow keys
     * move it from there. On a phone the columns stack. Edits are held in hand until
     * saved, because each save is one write to the beach rather than a scribble on
     * this device: the list is a fact about how you work and it should follow you. */
    function editor(){
      var a = arrange();
      var by = {}; a.all.forEach(function(p){ by[p[1]] = p; });
      var shown = a.list.map(function(p){ return p[1]; });
      function swallow(e){ e.stopPropagation(); e.preventDefault(); }

      function grip(item, list, n, label){
        var g = document.createElement('button');
        g.type = 'button'; g.className = 'dd__grip'; g.setAttribute('data-keep-open', '');
        g.textContent = '⠿';
        g.setAttribute('aria-label', 'move ' + label + ' — drag it, or use the arrow keys');
        g.addEventListener('pointerdown', function(e){
          if (e.button) return;
          e.preventDefault();
          item.classList.add('dd__item--drag');
          /* the row goes before the first other row whose middle is below the pointer —
           * followed at the document, because moving the row in the page lets go of any
           * capture the grip held, and the drag would stall halfway */
          function move(ev){
            var before = null;
            [].some.call(list.children, function(c){
              if (c === item) return false;
              var r = c.getBoundingClientRect();
              if (ev.clientY < r.top + r.height / 2){ before = c; return true; }
              return false;
            });
            if (before !== item.nextSibling) list.insertBefore(item, before);
          }
          function up(){
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            item.classList.remove('dd__item--drag');
            shown = [].map.call(list.children, function(c){ return c.getAttribute('data-n'); }).filter(Boolean);
            /* the click a drag ends in is not a tap on whatever lay under the pointer —
             * outside the menu it would close it */
            window.addEventListener('click', swallow, true);
            setTimeout(function(){ window.removeEventListener('click', swallow, true); }, 0);
          }
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
          document.addEventListener('pointercancel', up);
        });
        g.addEventListener('keydown', function(e){
          var step = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
          var i = shown.indexOf(n), j = i + step;
          if (!step || j < 0 || j >= shown.length) return;
          e.preventDefault();
          shown.splice(j, 0, shown.splice(i, 1)[0]);
          draw(n);
        });
        return g;
      }

      function column(title, names, on){
        var col = document.createElement('div'); col.className = 'dd__col' + (on ? '' : ' dd__col--off');
        var lab = document.createElement('div'); lab.className = 'dd__lab'; lab.textContent = title;
        var list = document.createElement('div'); list.className = 'dd__list';
        col.appendChild(lab); col.appendChild(list);
        names.forEach(function(n){
          var p = by[n]; if (!p) return;
          var item = document.createElement('div'); item.className = 'dd__item'; item.setAttribute('data-n', n);
          if (on) item.appendChild(grip(item, list, n, p[0]));
          var pick = document.createElement('button');
          pick.type = 'button'; pick.className = 'dd__pick'; pick.setAttribute('data-keep-open', '');
          pick.title = (on ? 'hide ' : 'show ') + p[0];
          var nm = document.createElement('span'); nm.textContent = p[0];
          var act = document.createElement('span'); act.className = 'dd__act'; act.textContent = on ? '−' : '+';
          pick.appendChild(nm); pick.appendChild(act);
          pick.addEventListener('click', function(e){
            e.stopPropagation();
            if (on) shown.splice(shown.indexOf(n), 1); else shown.push(n);
            draw();
          });
          item.appendChild(pick);
          list.appendChild(item);
        });
        if (!list.children.length){
          var none = document.createElement('div'); none.className = 'dd__empty';
          none.textContent = on ? 'nothing yet — tap a place to show it' : 'every place shows';
          list.appendChild(none);
        }
        return col;
      }

      function draw(focus){
        menu.innerHTML = '';
        menu.classList.add('dd__menu--wide');
        var hint = document.createElement('div'); hint.className = 'dd__lab';
        hint.textContent = (HAND ? HAND + '’s go menu' : 'the go menu') + ' — tap a place to move it across, drag ⠿ to order';
        menu.appendChild(hint);
        var cols = document.createElement('div'); cols.className = 'dd__cols';
        cols.appendChild(column('shown', shown, true));
        cols.appendChild(column('not shown', a.all.map(function(p){ return p[1]; })
          .filter(function(n){ return shown.indexOf(n) < 0; }), false));
        menu.appendChild(cols);

        var foot = document.createElement('div'); foot.className = 'dd__foot';
        var save = document.createElement('button'); save.type = 'button'; save.className = 'dd__edit';
        save.setAttribute('data-keep-open','');
        /* there is no sign-in on this site: a handle is carried in the page's path,
         * so a page without one has nowhere to keep the list yet */
        save.textContent = HAND ? 'save to the beach' : 'needs your handle to save';
        save.disabled = !HAND;
        save.title = HAND ? 'writes branch 2 of lists:' + HAND : 'a list needs a handle to belong to';
        save.addEventListener('click', function(e){
          e.stopPropagation();
          save.disabled = true; save.textContent = 'saving…';
          saveBranch(APEX, HAND, 2, DOORS_SAYS, shown)
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

        if (focus){
          var it = [].filter.call(menu.querySelectorAll('.dd__item'), function(c){ return c.getAttribute('data-n') === focus; })[0];
          if (it) it.querySelector('.dd__grip').focus();
        }
      }
      draw();
    }

    /* A hand's stated list is read when its tab is first shown — at once on the hand's
     * own pages, elsewhere only if the reader opens that tab. The menu opens on the
     * default immediately and settles onto the stated list when it arrives: a door a
     * reader might tap in the first half-second matters more than the order being right
     * on the first frame. */
    /* THE EDITOR MUST WAIT, though the menu need not. Drawn before the read lands
     * the editor shows every place TICKED — no stated list means the default, and
     * the default is everything — and saving from there writes all fourteen as the
     * reader's own list, silently replacing the four they chose. Reading is safe to
     * do optimistically; writing is not, and on a phone that gap is real. */
    var statedRead = false;
    function readStated(){
      if (statedRead || !HAND) return;
      statedRead = true;
      doorsRead = readBranch(APEX, HAND, 2).then(function(list){
        if (list && list.length){
          STATED_DOORS = list;
          /* not while it is being edited, nor while a name is being typed at the top */
          if (TAB === 'hand' && !menu.querySelector('.dd__item') && !menu.querySelector('.dd__ask')) paint();
        }
      });
    }

    paint();
    if (HOME === 'hand') readStated();
    if (cfg.world && cfg.beach){
      readIndex(cfg.beach).then(function(blocks){
        CAST = blocks.filter(function(b){ return b.indexOf('passport:') === 0; })
          .map(function(b){ return b.slice(9); })
          .filter(function(n){ return n && n === window.cleanHandle(n); })
          .sort(function(x, y){ return x.localeCompare(y); });
        if (TAB === 'table' && !menu.querySelector('.dd__ask')) paint();
      }).catch(function(){});
    }
    d.appendChild(menu);
    /* Opening measures the room below the bar, so the menu ends above the screen's
     * foot and scrolls inside — nothing in a long list, nor the chooser's save, is out
     * of reach on a phone. Closing puts the menu back on its own list, but never in
     * the middle of choosing, where a stray tap outside would throw away an unsaved
     * order. */
    function fit(){ menu.style.maxHeight = Math.max(180, window.innerHeight - menu.getBoundingClientRect().top - 12) + 'px'; }
    window.addEventListener('resize', function(){ if (d.open) fit(); });
    d.addEventListener('toggle', function(){
      if (d.open){ fit(); return; }
      if (menu.querySelector('.dd__item')) return;
      if (TAB !== HOME || menu.querySelector('.dd__ask')){ TAB = HOME; paint(); }
    });
    /* GO IS ALWAYS THE TOP RIGHT, on every page and whatever else the bar carries,
     * because a fixed corner is what makes a control findable without looking for
     * it. Acts sit to its left; gatherActs places itself before this one. */
    mount.appendChild(d);
    return d;
  };
})();

/* ── The name line — where a typed handle stands on this beach. ─────────────
 * A beach is an open commons: any hand may bring a block into being, so every
 * page that says something under a handle mints <family>:<handle> on its first
 * say — and a slipped letter in the handle mints a permanent block beside the
 * one it meant (now:happyhedsgehog beside now:happyhedgehog, set aside
 * 2026-09-21; bsp-mcp proposals/2026-09-21-tidying-and-spam.md 2.4). The one
 * moment that can be caught without ever interrupting a say is the moment a
 * person types their handle, so this wires one quiet line under the handle box
 * of every page that has one (#ask-handle, or #h) — and it is NEVER a gate: the
 * page's own button works exactly as before, and a newcomer, who is by
 * definition a name standing nowhere, is told nothing at all.
 *
 * It speaks only when the typed name is a letter or two — or only a capital, a
 * space or a hyphen — from a name standing in MORE blocks than it does. The
 * measure is the LAST segment of each block name, and the question is "does
 * this name stand ANYWHERE here", never "has it a passport": a person may have
 * a shell, a pool and an ear and no passport at all. One index read per page,
 * made when the box is first touched, paid by the reader's own browser.
 *
 * window.pscaleNames is the measure itself, shared with /lately so the site
 * holds one copy. (The mirror carries the same measure in TypeScript:
 * xstream-bsp src/kernel/name-standing.ts.) ── */
(function(){
  var APEX = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
  function tail(n){ return n.slice(n.lastIndexOf(':') + 1); }
  function fold(s){ return s.toLowerCase().replace(/[\s\-_]/g, ''); }
  function edits(a, b){
    if (Math.abs(a.length - b.length) > 2) return 9;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev.push(j);
    for (i = 1; i <= a.length; i++){
      var cur = [i];
      for (j = 1; j <= b.length; j++)
        cur.push(Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] !== b[j-1] ? 1 : 0)));
      prev = cur;
    }
    return prev[b.length];
  }
  /* every last segment, and how many blocks stand under it — archives, collectives
   * and grains lend none: their tails are dates and pair ids, not names */
  function standing(blocks){
    var m = new Map();
    blocks.forEach(function(b){
      if (b.indexOf(':') < 0 || /^(archive|sed|grain):/.test(b)) return;
      var t = tail(b); m.set(t, (m.get(t) || 0) + 1);
    });
    return m;
  }
  /* the best-standing name a typed one is a letter from, if it stands in MORE blocks */
  function near(name, stand){
    var f = fold(name), mine = stand.get(name) || 0, best = null;
    stand.forEach(function(n, o){
      if (o === name || n <= mine) return;
      var same = fold(o) === f;
      if (!same && (Math.min(name.length, o.length) < 5 || edits(f, fold(o)) > 2)) return;
      if (!best || n > best.n) best = { name: o, n: n, same: same };
    });
    return best ? { name: best.name, n: best.n, same: best.same, mine: mine } : null;
  }
  window.pscaleNames = { tail: tail, standing: standing, near: near };

  document.addEventListener('DOMContentLoaded', function(){
    var box = document.getElementById('ask-handle') || document.getElementById('h');
    if (!box) return;
    box.setAttribute('autocapitalize', 'none');
    box.setAttribute('autocorrect', 'off');
    box.setAttribute('spellcheck', 'false');
    var line = document.createElement('p');
    line.hidden = true;
    line.style.cssText = 'margin:8px 0 0;font-family:var(--mono);font-size:11.5px;line-height:1.6;letter-spacing:.03em;color:var(--vapour-dim)';
    /* below the row the box sits in, so a flex bar keeps its shape */
    (box.parentElement || box).insertAdjacentElement('afterend', line);

    var stand = null, asked = false;
    function say(){
      var name = box.value.trim();
      var hit = stand && name.length >= 3 ? near(name, stand) : null;
      if (!hit){ line.hidden = true; return; }
      line.textContent = '';
      line.appendChild(document.createTextNode(hit.mine
        ? name + ' stands in ' + hit.mine + ' block' + (hit.mine === 1 ? '' : 's') + ' here, a near name in more. Did you mean '
        : 'nothing stands under ' + name + ' here. Did you mean '));
      var pick = document.createElement('a');
      pick.href = '#'; pick.textContent = hit.name;
      pick.addEventListener('click', function(e){
        e.preventDefault();
        box.value = hit.name;
        box.dispatchEvent(new Event('input', { bubbles: true }));
        box.focus();
      });
      line.appendChild(pick);
      line.appendChild(document.createTextNode('? Or carry on, if this name is yours.'));
      line.hidden = false;
    }
    function ask(){
      if (asked) return; asked = true;
      fetch(APEX, { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; })
        .then(function(ix){ if (ix && ix.blocks){ stand = standing(ix.blocks); say(); } })
        .catch(function(){ /* the page stands without it */ });
    }
    box.addEventListener('focus', ask);
    box.addEventListener('input', function(){ ask(); say(); });
    if (box.value) ask();
  });
})();

/* ── A name opens its page. ─────────────────────────────────────────────────
 * Wherever a page draws a person's name beside what they said — a reading at an
 * address, a reader's answer, a line left in a parlour, a voice at a table — the
 * name is the way to that person's page: /page/<name>, with ?world=<table> when
 * it was said at a table. That page is written for the visitor — who they are,
 * today's line, their posts, and their parlour at the foot — and all of it reads
 * and answers with no key. Never the mirror, which needs a key and an
 * introduction, and never the passport, which is written to its holder (David,
 * 2026-09-26).
 *
 * Only a name that STANDS becomes a link — one holding a block /page draws from
 * (a passport, a now, a diary, a parlour; at a table also what the character
 * knows, wants, did and saw) — because a name typed into a keyless box, or a
 * person a keeper voices, has no page, and a link to "nobody by that name" is a
 * dead end. A page marks each name it draws with data-name (and data-world at a
 * table) and calls nameLinks(root) after it paints — or once, with { watch: true },
 * for a box it repaints from many places; the beach's index is read once per page
 * per beach, or handed in by a page that already holds it ({ blocks }). A name
 * already linked is left as it is, so repainting is free. ── */
(function(){
  var APEX = 'https://beach.happyseaurchin.com';
  var OWN = ['passport:', 'now:', 'spine:', 'pool:'];
  var AT_A_TABLE = OWN.concat(['stash:', 'knows:', 'purpose:', 'history:', 'witnessed:']);
  var asked = {};
  function blocksAt(origin){
    if (!asked[origin]) asked[origin] = fetch(origin + '/.well-known/pscale-beach', { headers:{ Accept:'application/json' }, cache:'no-store' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(ix){ return (ix && ix.blocks) || []; })
      .catch(function(){ return []; });
    return asked[origin];
  }
  function hrefOf(name, world){
    var enc = encodeURIComponent;
    /* a static preview serves page.html by name; the site serves /page/<name> */
    return /\.html$/.test(location.pathname)
      ? '/page.html?handle=' + enc(name) + (world ? '&world=' + enc(world) : '')
      : '/page/' + enc(name) + (world ? '?world=' + enc(world) : '');
  }
  window.nameLinks = function(root, opts){
    opts = opts || {};
    if (opts.watch && root && !root.hasAttribute('data-names-watched')){
      root.setAttribute('data-names-watched', '');
      var again = { origin: opts.origin, blocks: opts.blocks, world: opts.world };
      new MutationObserver(function(){ window.nameLinks(root, again); }).observe(root, { childList: true, subtree: true });
    }
    var marked = (root || document).querySelectorAll('[data-name]:not([data-named])');
    if (!marked.length) return;
    var ready = opts.blocks ? Promise.resolve(opts.blocks) : blocksAt(opts.origin || APEX);
    ready.then(function(blocks){
      var has = new Set(blocks);
      Array.prototype.forEach.call(marked, function(el){
        el.setAttribute('data-named', '');
        var name = el.getAttribute('data-name'), world = el.getAttribute('data-world') || opts.world || '';
        if (!name || !(world ? AT_A_TABLE : OWN).some(function(p){ return has.has(p + name); })) return;
        var a = document.createElement('a');
        a.className = 'name-link';
        a.href = hrefOf(name, world);
        a.title = name + '’s page';
        while (el.firstChild) a.appendChild(el.firstChild);
        el.appendChild(a);
      });
    });
  };
})();
