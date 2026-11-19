/* What a hosted game keeps, inside its sandbox (ways:plug 8; lane plug.1, 27 Oct 2026). A game plugged here runs at
 * /games/<game>/game in an opaque origin, where the browser's own localStorage throws; the service adds this one line
 * at the top of the game's head, so it stands in before anything else on the page runs: what the frame page handed in
 * (window.name, which /games/frame.js fills) to read at once, every change sent back to that page, which keeps it
 * under the game's own name. The beach's voice keeps a player's key here, so a newcomer's name and key last from one
 * visit to the next. A page that has its own storage (a maker's copy on their own site) is left as it is; one opened
 * alone, outside its frame, keeps what it is given for the visit only. */
(function () {
  'use strict';
  var HEAD = 'games-bridge:', handed = null;
  try { if (String(window.name).indexOf(HEAD) === 0) handed = JSON.parse(String(window.name).slice(HEAD.length)); } catch (e) {}
  try { if (handed) window.name = ''; } catch (e) {}
  try { window.localStorage.getItem('-'); return; } catch (e) {}   // the browser's own storage works: nothing to stand in for
  var framed = !!handed && window.parent !== window, game = handed && handed.game, to = '*';
  try { to = new URL(location.href).origin; } catch (e) {}
  function store(seed, send) {
    var data = Object.create(null);
    Object.keys(seed || {}).forEach(function (k) { data[k] = String(seed[k]); });
    function post(op, key, value) {
      if (!send) return;
      try { window.parent.postMessage({ bridge: 'games', game: game, op: op, key: key, value: value }, to); } catch (e) {}
    }
    return {
      getItem: function (k) { k = String(k); return k in data ? data[k] : null; },
      setItem: function (k, v) { k = String(k); v = String(v); data[k] = v; post('set', k, v); },
      removeItem: function (k) { k = String(k); delete data[k]; post('remove', k); },
      clear: function () { data = Object.create(null); post('clear'); },
      key: function (i) { var ks = Object.keys(data); return i >= 0 && i < ks.length ? ks[i] : null; },
      get length() { return Object.keys(data).length; }
    };
  }
  var local = store(handed && handed.store, framed), session = store(null, false);
  try { Object.defineProperty(window, 'localStorage', { configurable: true, enumerable: true, get: function () { return local; } }); } catch (e) {}
  try { Object.defineProperty(window, 'sessionStorage', { configurable: true, enumerable: true, get: function () { return session; } }); } catch (e) {}
})();
