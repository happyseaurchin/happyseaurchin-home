/* vault.js — the vault, opened in the page.
 *
 * A person's vault is one block at their home beach, vault:<handle> (ways:vault): the root law in
 * plain text, and beneath it entries — each a KEY-GROUP the handle holds — sealed individually, so
 * that a session holding the vault key recovers every other key the handle owns. This file lets a
 * page do what only the router (bsp-mcp) could do until now: seal and open those entries in the
 * browser, so a key goes from the beach to this page to the service it pays, and nowhere else.
 *
 * TWO KEYS, THE SAFER SHAPE (ways:vault 1 and 4.1; spine:security-schematic 1.53 and 1.55; the doors'
 * battery, 5 Nov 2026, §8): the person's everyday key, the one their passport uses, LATCHES the vault —
 * it is what every write carries as secret, and all the beach checks — and a VAULT KEY of its own, chosen
 * apart from every latch, SEALS every entry. The vault key never leaves the page: it derives the sealing
 * key here, and the beach only ever holds what it sealed; it is never sent as secret, which would carry it
 * to the beach (ways:vault 1.2). The router reads the same vault with the latch as secret and the vault key
 * as enc_secret. A vault founded under one phrase, before the page took two (the one-key trade, ways:vault
 * 1.3), opens with that phrase as ever, and reseal() seals every entry it holds again under a vault key,
 * reading each back under it in the same pass (ways:vault 2.2), the latch unchanged.
 *
 *   vault.read(origin, handle, vaultKey)          { exists, law, entries: [{ slot, label, whole, envelope, text, opened }], canary }
 *                                                 canary: 'opens' | 'sealed' | 'none', under this key
 *   vault.found(origin, handle, latch, vaultKey, law)               born latched under the latch, its canary sealed under the
 *                                                                   vault key and proved three ways; a vault key that is the latch refused
 *   vault.keep(origin, handle, latch, vaultKey, label, text, slot)  one key-group, its label plain, the key sealed; → its slot
 *   vault.reseal(origin, handle, latch, oldKey, vaultKey, law)      every entry the old key opens, and the canary, sealed again under
 *                                                                   the vault key and read back; the law at the root replaced where
 *                                                                   one is given. { resealed, left, canary }
 *   vault.home(origin)                            the beach a vault stands at for a page reading origin: the beach itself,
 *                                                 never a table (/w/<name>) or a world (<x>.beach.<domain>) beneath it
 *
 * THE CIPHER IS THE BEACH'S OWN SEAL (4 Nov 2026, coloured stigmergy step 4): this file seals and opens
 * through button/seal.js, served by the beach beside its voice, and keeps no copy of the cipher — the
 * one module every page seals through, byte for byte as bsp-mcp's src/keys.ts seals, proved by the
 * shared test vectors (bsp-mcp scripts/smoke-gray-vectors.ts). A SELF envelope is nacl.secretbox under
 * the key Argon2id derives from the vault key and the salt: {_: note, 1: ciphertext, 2: nonce,
 * 9: {_: 'gray', 1: 'self'}} — spine-legal, so the beach's shape gate admits it and a keyless reader
 * sees opaque structure and nothing else.
 *
 * THE SALT IS THE ADDRESSING FORM (ways:vault 2.3): a vault decrypts only under the exact string it
 * was sealed with. The recipe founds a vault as bsp(agent_id='<beach-url>', …), so the salt here is
 * the beach's origin, e.g. 'https://beach.happyseaurchin.com' — never the handle — and a vault the
 * gallery founds opens at the router under that same address, and the other way round.
 *
 * THE ENTRY a page appends (characters-in-the-vault, 2026-09-15; the image key and the picture place,
 * 2026-09-29): { _: <plain label — what the key is, for whom, since when>, 1: <sealed: the key alone> }
 * The label IS the list, readable without the key; the key is never plain. Every write carries the
 * latch (secret) and never a per-spindle lock (ways:vault 1.2). The canary stands at 9, sealed whole.
 *
 * The seal is loaded on first use from the beach the page's voice names, else the home beach; in node
 * (the vectors smoke) it is handed in as globalThis.beachSeal.
 */
(function (root) {
  'use strict';
  var NOTE = 'Encrypted (gray); readable only with the author secret.';
  var HOME = 'https://beach.happyseaurchin.com';
  var libs = null;
  function need() {
    if (libs) return libs;
    if (root.beachSeal) return libs = Promise.resolve(root.beachSeal);
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return Promise.reject(new Error('in node the beach\'s seal is handed in as globalThis.beachSeal'));
    libs = new Promise(function (res, rej) {
      var from = ((root.beachVoice && root.beachVoice.beach) || HOME).replace(/\/+$/, '') + '/button/seal.js';
      var s = document.createElement('script'); s.src = from; s.async = true;
      s.onload = function () { if (root.beachSeal) res(root.beachSeal); else { libs = null; rej(new Error('the seal did not load')); } };
      s.onerror = function () { libs = null; rej(new Error('could not load ' + from)); };
      document.head.appendChild(s);
    });
    return libs;
  }
  function forget() { need().then(function (S) { S.forget(); }, function () {}); }
  function isEnvelope(n) { return !!(n && typeof n === 'object' && typeof n['1'] === 'string' && typeof n['2'] === 'string' && n['9'] && typeof n['9'] === 'object' && n['9']['_'] === 'gray'); }
  function seal(plaintext, secret, salt) { return need().then(function (S) { return S.self.seal(plaintext, secret, salt); }); }
  function open(envelope, secret, salt) {
    if (!isEnvelope(envelope) || envelope['9']['1'] !== 'self') return Promise.resolve(null);
    return need().then(function (S) { return S.self.open(envelope, secret, salt); });
  }

  /* ── where a vault stands, and the block on the wire ── */
  function home(origin) {
    var o = String(origin || HOME).replace(/\/+$/, '').replace(/\/w\/[^/]+$/, '');
    try { var u = new URL(o), h = u.hostname, i = h.indexOf('.beach.'); if (i > 0) h = h.slice(i + 1); return u.protocol + '//' + h + (u.port ? ':' + u.port : ''); }
    catch (e) { return o; }
  }
  function wire(origin) { return origin.replace(/\/+$/, '') + '/.well-known/pscale-beach'; }
  function getJSON(u) { return fetch(u, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (r) { if (r.status === 404) return null; if (!r.ok) throw new Error('read failed (' + r.status + ')'); return r.json(); }); }
  function post(origin, body) {
    return fetch(wire(origin), { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { d.ok = r.ok; d.status = r.status; return d; }); });
  }
  function voice(n) { while (n && typeof n === 'object') n = n._; return typeof n === 'string' ? n : ''; }
  function digits(n) { return n && typeof n === 'object' ? Object.keys(n).filter(function (k) { return /^[1-9]$/.test(k); }).sort() : []; }
  function refusal(w, what) {
    return new Error(w.code === 'lock_required' ? 'that is not the key this vault is latched with: your passport’s key'
      : w.code === 'handle_bound' ? 'a vault answers to the same key as your passport, and this key does not open its passport'
      : (w.error || what + ' (' + w.status + ')'));
  }
  function canaryText(handle, salt) { return 'canary — sealed ' + new Date().toISOString() + ' by ' + handle + ' at ' + salt + ' under its vault key; if this reads, the vault key opens the vault'; }

  /* READ — every entry the vault holds, opened where the vault key opens it. An entry appended by a page is
   * {_: label, 1: envelope}; an entry the router wrote whole is an envelope itself (its text may carry
   * its own label). Entries that do not open under this key are listed as sealed. The canary, sealed whole
   * at 9, is no entry: it says whether this key is the vault's. */
  function read(origin, handle, vaultKey) {
    var salt = origin.replace(/\/+$/, '');
    return getJSON(wire(origin) + '?block=' + encodeURIComponent('vault:' + handle) + '&_t=' + Date.now()).then(function (block) {
      if (!block) return { exists: false, law: '', entries: [], canary: 'none' };
      var out = [], canary = isEnvelope(block['9']) ? block['9'] : null;
      digits(block).forEach(function (k) {
        var e = block[k];
        if (k === '9' && canary) return;
        if (isEnvelope(e)) out.push({ slot: k, label: '', whole: true, envelope: e });
        else if (e && typeof e === 'object') out.push({ slot: k, label: typeof e._ === 'string' ? e._ : '', whole: false, envelope: isEnvelope(e['1']) ? e['1'] : null });
      });
      return Promise.all(out.map(function (e) {
        if (!e.envelope) return Promise.resolve(e);
        return open(e.envelope, vaultKey, salt).then(function (text) { e.text = text; e.opened = text !== null; return e; });
      }).concat([canary ? open(canary, vaultKey, salt) : Promise.resolve(undefined)])).then(function (r) {
        var c = r.pop();
        return { exists: true, law: voice(block), entries: r, canary: c === undefined ? 'none' : c === null ? 'sealed' : 'opens' };
      });
    });
  }

  /* FOUND — a vault born locked whole under the latch (ways:vault 4.2), then proved at 9 with a canary
   * sealed under the vault key, three ways (4.3): it opens under the vault key, and not under the latch or
   * a wrong key. The vault key is chosen apart from every latch (4.1), so the same phrase is refused here. */
  function found(origin, handle, latch, vaultKey, law) {
    var salt = origin.replace(/\/+$/, '');
    if (!latch || !vaultKey) return Promise.reject(new Error('a vault takes two keys: your passport’s, which latches it, and a vault key of its own, which seals it'));
    if (latch === vaultKey) return Promise.reject(new Error('the vault key must not be your passport’s key: the beach checks that one, and the vault key never goes there'));
    return post(origin, { block: 'vault:' + handle, content: { _: law }, new_lock: latch }).then(function (w) {
      if (!w.ok) throw refusal(w, 'could not found the vault');
      var canary = canaryText(handle, salt);
      return seal(canary, vaultKey, salt).then(function (env) {
        return post(origin, { block: 'vault:' + handle, spindle: '9', content: env, secret: latch });
      }).then(function (w2) {
        if (!w2.ok) throw refusal(w2, 'the canary was refused');
        return getJSON(wire(origin) + '?block=' + encodeURIComponent('vault:' + handle) + '&spindle=9&_t=' + Date.now());
      }).then(function (env) {
        return Promise.all([open(env, vaultKey, salt), open(env, latch, salt), open(env, vaultKey + 'x', salt)]);
      }).then(function (r) {
        if (r[0] !== canary) throw new Error('the canary did not read back under the vault key');
        if (r[1] !== null || r[2] !== null) throw new Error('the canary opened under another key — refusing to trust this vault');
        return true;
      });
    });
  }

  /* KEEP — one key-group: the label plain at the entry, the key sealed at its 1 under the vault key, the write
   * latched with the passport's key. A slot given rewrites that entry (a rotation rewrites one entry, never the
   * table); none given appends. */
  function keep(origin, handle, latch, vaultKey, label, plaintext, slot) {
    var salt = origin.replace(/\/+$/, '');
    if (!vaultKey) return Promise.reject(new Error('the vault key first: it seals what the vault keeps'));
    return seal(plaintext, vaultKey, salt).then(function (env) {
      if (slot) return post(origin, { block: 'vault:' + handle, spindle: String(slot), content: { _: label, '1': env }, secret: latch }).then(function (w) { if (!w.ok) throw refusal(w, 'the vault refused the entry'); return String(slot); });
      return post(origin, { block: 'vault:' + handle, content: { _: label }, append: true, secret: latch }).then(function (w) {
        if (!w.ok) throw refusal(w, 'the vault refused the entry');
        var at = String(w.slot);
        return post(origin, { block: 'vault:' + handle, spindle: at + '.1', content: env, secret: latch }).then(function (w2) { if (!w2.ok) throw refusal(w2, 'the key could not be sealed'); return at; });
      });
    });
  }

  /* RESEAL — a vault sealed under one key (the one-key trade: the passport's own phrase) sealed again under a vault
   * key, entry by entry, each read back under the new key before the next (ways:vault 2.2), and the canary; the law
   * at the root replaced where one is given. An entry the old key does not open is left as it stands, and counted.
   * The latch, the passport's key, is unchanged. */
  function reseal(origin, handle, latch, oldKey, vaultKey, law) {
    var salt = origin.replace(/\/+$/, ''), at = function (e) { return e.whole ? e.slot : e.slot + '.1'; };
    if (!vaultKey || vaultKey === latch) return Promise.reject(new Error('the vault key must be a key of its own, not your passport’s'));
    if (vaultKey === oldKey) return Promise.reject(new Error('that is the key the vault is sealed under now: choose another for its vault key'));
    return read(origin, handle, oldKey).then(function (v) {
      if (!v.exists) throw new Error('no vault stands under ' + handle);
      var done = 0, left = 0, chain = Promise.resolve();
      v.entries.forEach(function (e) {
        if (!e.envelope) return;
        if (!e.opened){ left++; return; }
        chain = chain.then(function () {
          return seal(e.text, vaultKey, salt).then(function (env) {
            return post(origin, { block: 'vault:' + handle, spindle: at(e), content: env, secret: latch });
          }).then(function (w) {
            if (!w.ok) throw refusal(w, 'entry ' + e.slot + ' could not be sealed again');
            return getJSON(wire(origin) + '?block=' + encodeURIComponent('vault:' + handle) + '&spindle=' + at(e) + '&_t=' + Date.now());
          }).then(function (back) { return open(back, vaultKey, salt); }).then(function (t) {
            if (t !== e.text) throw new Error('entry ' + e.slot + ' did not read back under the vault key');
            done++;
          });
        });
      });
      return chain.then(function () {
        return seal(canaryText(handle, salt), vaultKey, salt);
      }).then(function (env) {
        return post(origin, { block: 'vault:' + handle, spindle: '9', content: env, secret: latch });
      }).then(function (w) {
        if (!w.ok) throw refusal(w, 'the canary could not be sealed again');
        return law ? post(origin, { block: 'vault:' + handle, spindle: '0', content: law, secret: latch }) : { ok: true };
      }).then(function (w) {
        if (!w.ok) throw refusal(w, 'the law could not be written');
        return read(origin, handle, vaultKey);
      }).then(function (after) {
        if (after.canary !== 'opens') throw new Error('the canary did not read back under the vault key');
        return { resealed: done, left: left, canary: after.canary };
      });
    });
  }

  root.vault = { seal: seal, open: open, read: read, found: found, keep: keep, reseal: reseal, home: home, isEnvelope: isEnvelope, forget: forget, NOTE: NOTE };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.vault;
})(typeof globalThis !== 'undefined' ? globalThis : this);
