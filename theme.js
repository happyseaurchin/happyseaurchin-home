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

/* every page ends the same way: the door to a now of your own */
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    if (document.getElementById('create-your-own')) return;
    var p = document.createElement('p');
    p.id = 'create-your-own';
    p.style.cssText = 'text-align:center;font-family:var(--mono,monospace);font-size:12px;letter-spacing:0.08em;padding:28px 16px 34px;margin:0;';
    var a = document.createElement('a');
    a.href = 'https://happyseaurchin.com/now';
    a.textContent = 'create your own \u2192';
    p.appendChild(a);
    document.body.appendChild(p);
  });
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
    ['the project', 'walk',     'family'],
    ['my hands',     'hands',    'handle'],
    ['the piles',   'ahead',    'handle'],
    ['one at a time','next',     'handle'],
    ['the morning', 'morning',  'handle'],
    ['the ledger',  'ledger',   'handle']
  ];
  var GLANCE = [
    ['recency', 'recency', 'family'],
    ['across',  'across',  'handle'],
    ['the field', 'field',  'handle'],
    ['the reach', 'reach',  'optional'],
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
    '.dd__menu a.rest{color:var(--vapour-dim);font-size:14px}' +
    '.dd__menu a.rest:hover{color:var(--liquid)}' +
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

  function arrange(){
    var all = [].concat.apply([], GROUPS), by = {}, out = [], seen = {};
    all.forEach(function(x){ by[x[1]] = x; });
    if (STATED_DOORS && STATED_DOORS.length){
      /* A PRIORITY LIST ORDERS THE TOP, IT DOES NOT HIDE THE REST. Naming four
       * places is saying which four matter, never that the other nine stopped
       * existing — and a menu that is the only way to reach a page must not be
       * the thing that loses it. So the stated ones stand first, then a rule,
       * then everything else the catalogue holds. */
      STATED_DOORS.forEach(function(n){ if (by[n] && !seen[n]){ seen[n] = 1; out.push(by[n]); } });
      var rest = all.filter(function(x){ return !seen[x[1]]; });
      return { list: out, rest: rest, custom: true, hidden: {}, all: all };
    }
    return { list: all, rest: [], custom: false, hidden: {}, all: all };
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
  var DOORS_SAYS = "The places this hand wants in its own go menu, in the order it wants them — read by every page's places menu, which shows exactly this and nothing else. Naming a place here is choosing it; leaving one out is not hiding it, since the catalogue a page offers is always larger than any one hand's list.";
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
        var inList = {}; visible.forEach(function(f){ inList[f] = 1; });

        function draw(){
          panel.innerHTML = '';
          order.forEach(function(f, i){
            var rowEl = document.createElement('div');
            rowEl.className = 'projrow__item';
            var cb = document.createElement('input');
            cb.type = 'checkbox'; cb.checked = !!inList[f];
            cb.disabled = (f === cfg.family);       /* you are standing in it */
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
      var a = arrange(), lastGroup = null;

      function place(p, dim){
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
        if (dim) link.className = 'rest';
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
        place(p, false);
      });

      /* everything the catalogue holds that the stated list did not name — quieter,
       * under a rule, and still one tap away */
      if (a.rest && a.rest.length){
        var r2 = document.createElement('div'); r2.className = 'dd__rule'; menu.appendChild(r2);
        a.rest.forEach(function(p){ place(p, true); });
      }
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
