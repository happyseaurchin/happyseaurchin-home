/* button.js — the beach button has moved onto the beach itself (pscale-beach #81, 14 October 2026).
 *
 * A page carries it from the beach it talks to, so a person's words reach no one but that beach:
 *
 *   <script src="https://beach.happyseaurchin.com/button/button.js" async></script>
 *
 * This file stays only so a page that carried this old address keeps its button: it hands over
 * to the beach's own loader, with the same data- attributes. It holds and sees nothing.
 */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me || window.beachButton) return;
  var s = document.createElement('script');
  s.src = 'https://beach.happyseaurchin.com/button/button.js';
  s.async = true;
  Array.prototype.forEach.call(me.attributes, function (a) {
    if (/^data-/.test(a.name)) s.setAttribute(a.name, a.value);
  });
  me.parentNode.insertBefore(s, me.nextSibling);
})();
