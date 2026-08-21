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
    b.className = 'theme-toggle';
    b.type = 'button';
    b.textContent = '◐';
    b.title = 'light or dark';
    b.setAttribute('aria-label', 'switch between the light and dark register');
    b.addEventListener('click', toggle);
    document.body.appendChild(b);
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
    ['ahead',       'ahead',    'handle'],
    ['your deck',   'next',     'handle'],
    ['my decks',    'my-decks', 'handle'],
    ['the morning', 'morning',  'handle'],
    ['the ledger',  'ledger',   'handle']
  ];
  var GLANCE = [
    ['recency', 'recency', 'family'],
    ['across',  'across',  'handle'],
    ['the field', 'field',  'handle'],
    ['earth',   'earth',    'bare']
  ];

  var CSS = '' +
    '.dd{position:relative;flex:none}' +
    '.dd>summary{list-style:none;cursor:pointer;border:1px solid var(--line);border-radius:4px;' +
      'color:var(--vapour-dim);font-family:var(--mono);font-size:12px;padding:6px 10px}' +
    '.dd>summary::-webkit-details-marker{display:none}' +
    '.dd>summary:hover{color:var(--foam);border-color:var(--line-strong)}' +
    '.dd[open]>summary{color:var(--liquid);border-color:rgba(var(--liquid-rgb),0.4)}' +
    '.dd__menu{position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:172px;' +
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
      if (!b) return;
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
    if (shape === 'bare')   return '/' + page;
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

  window.siteDoors = function(cfg){
    cfg = cfg || {};
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

    function add(list){
      var any = false;
      list.forEach(function(p){
        var u = href(p[1], p[2], cfg.handle, cfg.family);
        if (!u) return;                       /* nowhere to go yet — say so by omission */
        any = true;
        if (p[1] === cfg.here){
          var cur = document.createElement('span');
          cur.className = 'here'; cur.textContent = p[0];
          cur.setAttribute('aria-current', 'page');
          menu.appendChild(cur);
        } else {
          var a = document.createElement('a');
          a.href = u; a.textContent = p[0];
          menu.appendChild(a);
        }
      });
      return any;
    }

    var hadWork = add(WORK);
    var rule = document.createElement('div'); rule.className = 'dd__rule';
    if (hadWork) menu.appendChild(rule);
    add(GLANCE);

    d.appendChild(menu);
    /* places sit left of acts: going somewhere is the commoner intent, and the
     * two controls read as a pair only when they keep a stable order. */
    var first = mount.querySelector('details.dd, button');
    if (first) mount.insertBefore(d, first); else mount.appendChild(d);
    return d;
  };
})();
