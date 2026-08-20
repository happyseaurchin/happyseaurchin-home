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
