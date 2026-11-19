/* mindflow/key.js — the Anthropic key a person brings to mindflow, kept on this device WRAPPED, never in plain text
 * (the doors' battery, 5 Nov 2026, bsp-mcp proposals/2026-11-05-the-doors-battery-minimal.md §8 item 20): under a key
 * the browser will not hand out, through the beach's own keeping (button/seal.js keep, a non-extractable AES-GCM key
 * in this origin's IndexedDB), as the site's pages keep theirs (theme.js siteKeys, which these pages do not load). A
 * key kept plain before is read at once, wrapped, and the plain copy goes; a browser that cannot wrap keeps what it
 * kept, as it kept it, and is given nothing new to keep. Shared by mindflow/byok and mindflow/explorer.
 *
 *   mindflowKey.ready()    resolves once the kept key is read
 *   mindflowKey.get()      the key, or ''
 *   mindflowKey.set(key)   kept wrapped; '' forgets it */
(function(){
  'use strict';
  if (window.mindflowKey) return;
  var NAME = 'mindflow-api-key', SEAL = 'https://beach.happyseaurchin.com/button/seal.js';
  var KEY = '', READY = null, sealP = null;
  function rd(){ try { return localStorage.getItem(NAME) || ''; } catch(e){ return ''; } }
  function wr(v){ try { localStorage.setItem(NAME, v); } catch(e){} }
  function rm(){ try { localStorage.removeItem(NAME); } catch(e){} }
  function wrapped(v){ return /^w1\./.test(v || ''); }
  function seal(){
    if (window.beachSeal) return Promise.resolve(window.beachSeal);
    if (sealP) return sealP;
    sealP = new Promise(function(ok, no){
      var s = document.createElement('script');
      s.src = SEAL; s.async = true;
      s.onload = function(){ if (window.beachSeal) ok(window.beachSeal); else { sealP = null; no(new Error('the seal did not load')); } };
      s.onerror = function(){ sealP = null; no(new Error('could not load ' + SEAL)); };
      (document.head || document.documentElement).appendChild(s);
    });
    return sealP;
  }
  function able(S){ return !!(S && S.keep && S.keep.able()); }
  function ready(){
    if (READY) return READY;
    var v = rd();
    if (v && !wrapped(v)) KEY = v;
    READY = !v ? Promise.resolve() : seal().then(function(S){
      if (wrapped(v)) return S.keep.unwrap(v).then(function(t){ if (t !== null && !KEY) KEY = t; });
      if (!able(S)) return;
      /* kept plain before: wrapped, read back, and only then the plain copy replaced */
      return S.keep.wrap(v).then(function(w){ return S.keep.unwrap(w).then(function(t){ if (t === v && rd() === v) wr(w); }); });
    }).catch(function(){});
    return READY;
  }
  function set(k){
    k = String(k || '').trim();
    KEY = k;
    if (!k){ rm(); return Promise.resolve(); }
    if (rd() && !wrapped(rd())) rm();
    return seal().then(function(S){
      if (!able(S)) return;
      return S.keep.wrap(k).then(function(w){ if (KEY === k) wr(w); });
    }).catch(function(){});
  }
  window.mindflowKey = { ready: ready, get: function(){ return KEY; }, set: set };
  ready();
})();
