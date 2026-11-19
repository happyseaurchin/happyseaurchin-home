/* The frame a hosted game plays in (ways:plug 8; lane plug.1, 27 Oct 2026). A game handed in at files:<game> and plugged
 * by the service is served at /games/<game>/game sandboxed (vercel.json: its own opaque origin, its only connections
 * the beach and this site's reads), and played here, at /games/<game>, inside an iframe sandboxed the same way, so
 * nothing it runs can read what this site keeps in the browser: the names and keys other pages keep, the vault's
 * cookies. What the game keeps for itself (its player's name and key, which the beach's voice keeps, its switches)
 * is kept here on its behalf, under games:<game>:, handed to the frame as it opens (its window.name, read once by
 * /games/bridge.js inside) and taken back from that frame alone, a change at a time, within a game's share.
 *
 *   <iframe id="game" sandbox="allow-scripts …"></iframe>
 *   <script src="/games/frame.js" data-game="<game>"></script>                                                   */
(function () {
  'use strict';
  var me = document.currentScript, GAME = String((me && me.getAttribute('data-game')) || '');
  var held = document.getElementById('game');
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(GAME) || !held) return;
  var PRE = 'games:' + GAME + ':', KEYS = 200, VALUE = 20000, SHARE = 200000;
  function kept() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PRE) === 0) out[k.slice(PRE.length)] = localStorage.getItem(k);
      }
    } catch (e) {}
    return out;
  }
  function size(s) { var n = 0; for (var k in s) n += k.length + String(s[k]).length; return n; }
  /* a frame's name is read from it once, as it is made, so the frame is made here: the page's own iframe, its sandbox
   * and the rest as the page wrote them, given its name and then its address */
  var frame = document.createElement('iframe');
  for (var i = 0; i < held.attributes.length; i++) frame.setAttribute(held.attributes[i].name, held.attributes[i].value);
  frame.name = 'games-bridge:' + JSON.stringify({ game: GAME, store: kept() });
  frame.src = '/games/' + GAME + '/game' + location.search + location.hash;
  held.parentNode.replaceChild(frame, held);
  window.addEventListener('message', function (e) {
    if (!frame.contentWindow || e.source !== frame.contentWindow) return;   // the game's own frame, and nothing else
    var m = e.data;
    if (!m || m.bridge !== 'games' || m.game !== GAME) return;
    try {
      if (m.op === 'set' && typeof m.key === 'string' && m.key.length <= 200 && typeof m.value === 'string' && m.value.length <= VALUE) {
        var s = kept(); s[m.key] = m.value;
        if (Object.keys(s).length > KEYS || size(s) > SHARE) return;   // past a game's share: kept for the visit only, inside
        localStorage.setItem(PRE + m.key, m.value);
      } else if (m.op === 'remove' && typeof m.key === 'string') {
        localStorage.removeItem(PRE + m.key);
      } else if (m.op === 'clear') {
        Object.keys(kept()).forEach(function (k) { localStorage.removeItem(PRE + k); });
      }
    } catch (err) {}
  });
})();
