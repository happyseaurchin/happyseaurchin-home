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

/* ─────────────────────────────────────────────────────────────────────────────
 * The site's footer — where else you can stand.
 *
 * A page's bar was carrying two different kinds of thing in one row: <a> to
 * another page, and <button> acting on this one. The CSS drew the buttons the
 * louder of the two — a bordered chip against dim plain text — so the page's own
 * controls shouted and the ways out whispered, and no page named more than three
 * of the ten places anyway. Four named none and were dead ends; /earth named one
 * that had been retired.
 *
 * They are separated here by KIND rather than by decoration: a place is a word
 * you read, an act is a button you press. Acts stay in the bar. Places live down
 * here, the same on every page, injected once — so no page can forget one, and no
 * page has to be edited to gain the next. That is the same reason the door below
 * this is injected rather than authored, and the reason /opportunities and cards
 * will cost one line here when they exist rather than twenty-four edits.
 *
 * Column one is where you STAND IN TIME: your clock, a project's clock, and the
 * clock's own horizon. Two is READING ACROSS many hands — mirrors at a rung,
 * places on the ground, streams overlapped. Three is what you DO next. Four is
 * who you do it WITH. No headers, deliberately: four short columns at the foot
 * teach by position, and a header is a word the reader then has to place.
 *
 * The mirror named here is the BARE place. A page's own 'mirror ↗' carries that
 * page's own coordinate, which makes it an act — it stays in the page, and the
 * two do not collide, because they are not the same thing.
 * ───────────────────────────────────────────────────────────────────────────── */
(function(){
  'use strict';

  var COLUMNS = [
    [ ['now','/now'],         ['walk','/walk'],   ['recency','/recency'] ],
    [ ['across','/across'],   ['earth','/earth'], ['field','/field'] ],
    [ ['morning','/morning'], ['ahead','/ahead'] ],
    [ ['connect','/connect'], ['mirror.onen.ai','https://mirror.onen.ai/'] ]
  ];

  /* The first path segment is the page, whatever rides after it: /walk, /walk.html
   * and /walk/beach-venture/weft are all the walk. Someone already standing on a
   * page is shown its name in the strong ink and not offered a door back into the
   * room they are in. */
  function here(){
    return (location.pathname.split('/')[1] || '').toLowerCase().replace(/\.html$/, '');
  }

  /* Every value is a token, per the house law in theme.css — and every token here
   * carries a fallback, so the block still reads on a page that loads this script
   * without that stylesheet rather than rendering as unstyled ink. */
  var CSS = '' +
    '#site-doors{max-width:720px;margin:56px auto 0;padding:24px 18px 0;' +
      'border-top:1px solid var(--line,rgba(128,128,128,0.2));' +
      'display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:16px 22px}' +
    '#site-doors ul{list-style:none;margin:0;padding:0}' +
    '#site-doors li{margin:0 0 8px}' +
    '#site-doors a,#site-doors span{font-family:var(--body,Georgia,serif);font-size:15px;line-height:1.45}' +
    '#site-doors a{color:var(--vapour,#889);text-decoration:none;border-bottom:none}' +
    '#site-doors a:hover{color:var(--liquid,#33C2D2)}' +
    '#site-doors .here{color:var(--foam,#EFF6F5)}' +
    '@media print{#site-doors{display:none}}';

  document.addEventListener('DOMContentLoaded', function(){
    if (document.getElementById('site-doors')) return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var nav = document.createElement('nav');
    nav.id = 'site-doors';
    nav.setAttribute('aria-label', 'the places on this site');

    var at = here();
    COLUMNS.forEach(function(col){
      var ul = document.createElement('ul');
      col.forEach(function(place){
        var name = place[0], href = place[1];
        var li = document.createElement('li');
        if (href.charAt(0) === '/' && href.slice(1) === at){
          var s = document.createElement('span');
          s.className = 'here';
          s.textContent = name;
          s.setAttribute('aria-current', 'page');
          li.appendChild(s);
        } else {
          var a = document.createElement('a');
          a.href = href;
          a.textContent = name;
          li.appendChild(a);
        }
        ul.appendChild(li);
      });
      nav.appendChild(ul);
    });

    document.body.appendChild(nav);
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
