/**
 * weigh.js — the weightings, worked (spine:shore 1.1112; spine:experience-points): a family's four columns at any
 * moment, a sum shared by them, and a ledger run, every sum shared as its family's columns stood when it landed.
 *
 * It reads only the blocks handed to it, and fetches and writes nothing, so the XP reader (/api/xp) runs it on the
 * beach's own blocks and the lab (/weightings) on invented ones: the same blocks always give the same answer. Loaded
 * as a plain <script> it is window.weigh; imported or required, it is the same object.
 *
 *   prepare(blocks, beatOf?)         what does not move with the moment: the law, the acts in time order, who brought whom
 *       blocks: { family, law, economy, fam: { mirrors, born }, room, strings: { mirrors }, threads: { mirrors } },
 *       as the reader reads them (mirrors.js's mirrorsOf for the family, the String and the threads)
 *   xpAt(prep, at)                   the four columns at a moment, as /api/xp answers them
 *   shareOut(xp, credits, payer?)    N credits in whole numbers, as a ticket machine writes them at the moment of payment
 *   partsOf(xp, amount)              a sum shared exactly, nothing rounded, as the weightings read it
 *   ledgerLines(block)               a ledger's IN and PAID lines, wherever the beach's appends put them, oldest first
 *   runLedger(lines, preps, opts?)   every sum in, shared as its family stood when it landed, less what was paid
 *
 * Experience points are human time, counted in active beats (the clock's pscale 0, eighty-one a day) in which a person
 * did something on the beach that can be checked (spine:experience-points 1.1). One line a beat makes four pots, each a
 * different reading of the same lines (1.11): the players' pot counts each person's own beats; the bringers' pot gives
 * each beat to whoever brought that person, divided equally along the chain back (1.111, David's CHAIN); the makers' pot
 * gives each beat to the makers the family's own law names, equally (1.1111, David's GO); the beach's pot gives each beat
 * to the beach, as the law names it. A beat nobody can be named for in a pot goes to the commons (1.1114). Agents count
 * nothing (1.15). The law's support line says how a sum is shared among the four: 'weights: a b c d' for the players,
 * the bringers, the makers and the beach (equal unless it says so); and 'the players: <holder>' sends the players' part
 * to whom it names, a game's tournament pot, instead of to each player by beats (David at experience-points 1.8: 'money
 * distribution to players is through tournaments').
 */
(function (root, make) {
  if (typeof module === 'object' && module && module.exports) module.exports = make();
  else root.weigh = make();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SITE = 'https://happyseaurchin.com';
  const COMMONS = 'commons';
  const POTS = ['players', 'bringers', 'makers', 'beach'];
  const zero = () => ({ players: 0, bringers: 0, makers: 0, beach: 0 });

  /* ── a block, walked as pscale: digits 1-9 by key, the digit 0 by '_' when it holds a subtree ── */
  const textOf = (n) => (typeof n === 'string' ? n.trim() : n && typeof n === 'object' && typeof n._ === 'string' ? n._.trim() : '');
  function linesOf(n, path = '', out = []) {
    const t = path ? textOf(n) : '';                     // the root's own line is the mirror's header, never a reading
    if (t) out.push({ path, text: t });
    if (n && typeof n === 'object') {
      for (const k of Object.keys(n)) {
        if (/^[1-9]$/.test(k)) linesOf(n[k], path + k, out);
        else if (k === '_' && n._ && typeof n._ === 'object') linesOf(n._, path + '0', out);
      }
    }
    return out;
  }
  function nodeAt(b, digits) {
    let n = b;
    for (const c of digits) { if (!n || typeof n !== 'object') return null; n = n[c === '0' ? '_' : c]; }
    return n;
  }
  /* an accumulator's entries ({_, 1: who, 3: stamp}) wherever the ladder has wrapped them */
  function entriesOf(n, out = []) {
    if (!n || typeof n !== 'object') return out;
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (!v || typeof v !== 'object') continue;
      if (/^[1-9]$/.test(k) && typeof v._ === 'string' && typeof v['1'] === 'string') out.push(v);
      if (/^[1-9]$/.test(k) || k === '_') entriesOf(v, out);
    }
    return out;
  }
  const counted = (t) => t && !/^WITHDRAWN\b/i.test(t);   // a NOT YET is an answer too; a withdrawn line is not
  const handleOf = (who) => { const m = /^\s*([A-Za-z0-9_.-]{2,64})\b/.exec(String(who || '')); return m && !/^anon$/i.test(m[1]) ? m[1] : ''; };

  /* ── the law: where the room is, which threads are its own, and the support line's conditions ── */
  function lawOf(law, family) {
    const lines = linesOf(law || {});
    const room = (lines.find((l) => l.path === '3' && /pool:([a-z0-9-]+)/i.test(l.text)) || {}).text;
    const threads = new Set();
    for (const l of lines) if (l.path[0] === '5') for (const m of l.text.matchAll(/^thread:(\d+)\b/gi)) threads.add(m[1]);
    const page = ((lines.find((l) => /^page:\s*(https?:\/\/\S+)/i.test(l.text)) || {}).text || '').replace(/^page:\s*/i, '').split(/\s/)[0];
    // the support line (any digit, its conditions beneath it): 'SUPPORT — …', then 'makers: a, b', 'the beach: c',
    // 'the players: <holder>', 'weights: 1 1 1 1'
    const support = lines.find((l) => /^SUPPORT\b/.test(l.text));
    const under = support ? lines.filter((l) => l.path.startsWith(support.path) && l.path !== support.path) : [];
    const listAfter = (re) => {
      const l = under.find((x) => re.test(x.text)) || lines.find((x) => re.test(x.text));
      if (!l) return [];
      return l.text.replace(re, '').split(/\s[—–-]\s/)[0].split(/[,;]|\band\b/).map((s) => handleOf(s)).filter(Boolean);
    };
    const w = under.map((x) => /^weights:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(x.text)).find(Boolean);
    // the supporter's own share, to take part and gift with (David, 25 Nov 2026: 'giving people credits to take part in
    // the experience'): 'the supporter: 50%' or 'the supporter: 0.5'; none, or 0, sends every credit to the four columns
    const s = under.map((x) => /^the supporter:\s*([\d.]+)\s*(%)?/i.exec(x.text)).find(Boolean);
    const supporter = s ? Math.min(1, Math.max(0, Number(s[1]) / (s[2] ? 100 : Number(s[1]) > 1 ? 100 : 1))) : 0;
    return {
      room: room ? /pool:([a-z0-9-]+)/i.exec(room)[1] : family,
      threads: [...threads],
      page,
      support: support ? support.path : null,
      makers: listAfter(/^makers:\s*/i),
      beach: listAfter(/^the beach:\s*/i),
      players: listAfter(/^the players:\s*/i),
      weights: w ? w.slice(1, 5).map(Number) : [1, 1, 1, 1],
      supporter: Number.isFinite(supporter) ? supporter : 0,
    };
  }

  /* ── agents count nothing (1.15): the handles named on an 'agents:' line in the economy's own law
   * (function:experience-points 2.11), and on one in the family's own law, never guessed from a passport's words, which
   * misread both ways (a person who mentions their Claude, an agent that calls itself a helper: pool:experience-points 7) ── */
  function agentsNamed(...laws) {
    const out = new Set();
    for (const b of laws) for (const l of linesOf(b || {})) {
      const m = /^agents:\s*(.*)$/i.exec(l.text);
      if (!m) continue;
      for (const part of m[1].split(/\s[—–-]\s/)[0].split(/[,;]|\band\b/)) { const h = handleOf(part); if (h) out.add(h); }
    }
    return out;
  }

  /* ── the String: who brought whom to this family's page ── */
  function bringersOf(strings, pages) {
    const norm = (u) => { try { const x = new URL(u, SITE); return x.pathname.replace(/\.html$/, '').replace(/(.)\/+$/, '$1').toLowerCase(); } catch (e) { return ''; } };
    const shares = [];                                   // { who, path }
    for (const [h, b] of Object.entries(strings)) {
      for (const l of linesOf(b)) {
        const m = /^SHARE\s+(\S+)/i.exec(l.text);
        if (m && pages.has(norm(m[1]))) shares.push({ who: h, path: l.path });
      }
    }
    shares.sort((a, b) => a.path.localeCompare(b.path));
    const firstBy = {};                                   // person → the sharer of the earliest share of this page they answered
    for (const s of shares) {
      for (const [o, b] of Object.entries(strings)) {
        if (o === s.who || firstBy[o]) continue;
        const a = textOf(nodeAt(b, s.path));
        if (a && !/^(WITHDRAWN|SHARE)\b/i.test(a)) firstBy[o] = s.who;
      }
    }
    return { shares: shares.length, firstBy };
  }
  function chainOf(h, firstBy, agents) {
    const chain = [], seen = new Set([h]);
    let at = firstBy[h];
    while (at && !seen.has(at) && chain.length < 9) { seen.add(at); if (!agents.has(at)) chain.push(at); at = firstBy[at]; }
    return chain;
  }

  /* ── the sundial's beat, pscale-beach lib/temporal.js momentToAddress (itself bsp-mcp src/temporal.ts): re-ported,
   * never forked; the reader hands in api/news.js's own port, the lab uses this one ── */
  function beatOfMoment(when) {
    const y = when.getUTCFullYear(), month = when.getUTCMonth(), dom = when.getUTCDate();
    const secOfDay = when.getUTCHours() * 3600 + when.getUTCMinutes() * 60 + when.getUTCSeconds();
    const partS = 86400 / 9, beatS = partS / 9;
    const part = Math.floor(secOfDay / partS), beat = Math.floor((secOfDay - part * partS) / beatS);
    return [
      Math.floor(y / 1000) % 10, Math.floor(y / 100) % 10, Math.floor(y / 10) % 10, y % 10,
      Math.floor(month / 3) + 1, (month % 3) + 1,
      Math.floor((dom - 1) / 7) + 1, ((dom - 1) % 7) + 1,
      part + 1, beat + 1,
    ].join('');
  }

  /* ── what does not move with the moment, read once: the law, every act in time order, who brought whom ──
   * A room line carries its stamp, so it counts once per beat from its moment; a mirror line counts one act, one beat
   * (1.16), from the moment its mirror was born; a knot on the law's threads carries no time and counts at every moment. */
  function prepare(blocks, beatOf) {
    const family = blocks.family, law = blocks.law || null, beat = beatOf || beatOfMoment;
    const L = lawOf(law, family);
    const acts = [];                                      // { h, ms, beat }: beat '' is an act with no stamp of its own
    const fam = blocks.fam || {};
    for (const [h, b] of Object.entries(fam.mirrors || {})) {
      const born = Date.parse((fam.born || {})[h] || '');
      for (const l of linesOf(b)) if (counted(l.text)) acts.push({ h, ms: born || -Infinity, beat: '' });
    }
    for (const e of entriesOf(blocks.room)) {
      const ts = Date.parse(e['3'] || '');
      if (!ts || /^SUMMARY\b/.test(e._)) continue;
      const h = handleOf(e['1']);
      if (h) acts.push({ h, ms: ts, beat: beat(new Date(ts)) });
    }
    for (const [h, b] of Object.entries((blocks.threads || {}).mirrors || {})) {
      for (const n of L.threads) for (const l of linesOf(nodeAt(b, n), n)) if (counted(l.text)) acts.push({ h, ms: -Infinity, beat: '' });
    }
    acts.sort((a, b) => (a.ms === b.ms ? 0 : a.ms < b.ms ? -1 : 1));
    const pages = new Set(['/' + family, '/proposal/' + family]);
    if (L.page) { try { pages.add(new URL(L.page).pathname.replace(/\.html$/, '').toLowerCase()); } catch (e) { /* a page line with no address */ } }
    const brought = bringersOf((blocks.strings || {}).mirrors || {}, pages);
    const agents = agentsNamed(blocks.economy, law);
    const free = (hs) => hs.filter((h) => !agents.has(h));
    return { family, L, acts, brought, agents, beat, chains: {}, makers: free(L.makers), beach: free(L.beach), players: free(L.players) };
  }

  /* each person's acts up to a moment: a tally that only moves forward, so a run of sums in time order reads each act once */
  function tallyTo(prep, atMs, st) {
    st = st || { i: 0, acts: {} };
    const A = prep.acts;
    while (st.i < A.length && A[st.i].ms <= atMs) {
      const a = A[st.i++], t = st.acts[a.h] || (st.acts[a.h] = { beats: new Set(), lines: 0 });
      if (a.beat) t.beats.add(a.beat); else t.lines++;
    }
    return st;
  }

  /* ── the four columns from a tally ── */
  function columnsOf(prep, st, at) {
    const { L, agents, makers, beach, brought } = prep;
    const columns = { players: {}, bringers: {}, makers: {}, beach: {} };
    const commons = zero();
    const put = (pot, h, v) => { columns[pot][h] = (columns[pot][h] || 0) + v; };
    let total = 0;
    for (const [h, a] of Object.entries(st.acts)) {
      if (agents.has(h)) continue;
      const beats = a.beats.size + a.lines;
      if (!beats) continue;
      total += beats;
      put('players', h, beats);
      const chain = prep.chains[h] || (prep.chains[h] = chainOf(h, brought.firstBy, agents));
      if (chain.length) for (const c of chain) put('bringers', c, beats / chain.length); else commons.bringers += beats;
      if (makers.length) for (const m of makers) put('makers', m, beats / makers.length); else commons.makers += beats;
      if (beach.length) for (const s of beach) put('beach', s, beats / beach.length); else commons.beach += beats;
    }
    return {
      family: prep.family, at: at.toISOString(), beat: prep.beat(at), beats: total,
      law: { at: 'function:' + prep.family, support: L.support, room: 'pool:' + L.room, threads: L.threads.map((n) => 'thread:' + n), makers: L.makers, beach: L.beach, players: L.players, weights: L.weights, supporter: L.supporter },
      columns, commons,
      agents: [...new Set([...Object.keys(st.acts), ...Object.values(brought.firstBy), ...L.makers, ...L.beach, ...L.players])].filter((h) => agents.has(h)).sort(),
      string: { shares: brought.shares, brought: Object.keys(brought.firstBy).length },
    };
  }
  const xpAt = (prep, at) => columnsOf(prep, tallyTo(prep, at.getTime()), at);

  /* who holds a pot's part, by weight: the players' part to the holders the law names, when it names any; otherwise each
   * column by its beats, and the commons for what nobody can be named for. null: nobody at all, the whole part to the commons */
  function holdersOf(xp, pot) {
    const agents = new Set(xp.agents || []);
    const held = pot === 'players' ? (xp.law.players || []).filter((h) => !agents.has(h)) : [];
    if (held.length) return held.map((h) => [h, 1]);
    const col = xp.columns[pot], all = Object.values(col).reduce((a, b) => a + b, 0) + xp.commons[pot];
    if (!all) return null;
    return [...Object.entries(col), [COMMONS, xp.commons[pot]]];
  }

  /* ── N credits shared: the supporter's own share first, where they take part (the law's 'the supporter:'), then the
   * rest by the four columns, each pot its weighted part, each part by its holders' weights, all in whole credits ── */
  function shareOut(xp, credits, supporter = '') {
    const all = Math.max(0, Math.floor(credits)), W = xp.law.weights, sumW = W.reduce((a, b) => a + b, 0) || 4;
    const own = supporter ? Math.floor(all * (xp.law.supporter || 0) + 1e-9) : 0, N = all - own;
    const parts = whole(POTS.map((p, i) => [p, (N * W[i]) / sumW]), N);
    const by = {}, toCommons = zero();
    for (const pot of POTS) {
      const part = parts[pot];
      if (!part) continue;
      const hold = holdersOf(xp, pot);
      if (!hold) { toCommons[pot] = part; continue; }
      const weight = hold.reduce((a, [, v]) => a + v, 0);
      const got = whole(hold.map(([h, v]) => [h, (part * v) / weight]), part);
      for (const [h, n] of Object.entries(got)) {
        if (!n) continue;
        if (h === COMMONS) { toCommons[pot] += n; continue; }
        const row = by[h] || (by[h] = { handle: h, credits: 0, from: zero() });
        row.credits += n; row.from[pot] += n;
      }
    }
    const commons = Object.values(toCommons).reduce((a, b) => a + b, 0);
    return { credits: all, supporter: own ? { handle: supporter, credits: own } : null, columns: N,
      by: Object.values(by).sort((a, b) => b.credits - a.credits || a.handle.localeCompare(b.handle)), commons, commonsFrom: toCommons };
  }
  /* largest remainder: whole numbers that sum to exactly n, ties broken by name so anyone gets the same */
  function whole(pairs, n) {
    const out = {}, rest = [];
    let given = 0;
    for (const [k, v] of pairs) { const f = Math.floor(v + 1e-9); out[k] = (out[k] || 0) + f; given += f; rest.push([k, v - f]); }
    rest.sort((a, b) => { const d = b[1] - a[1]; return Math.abs(d) > 1e-9 ? d : String(a[0]).localeCompare(String(b[0])); });
    for (let i = 0; given < n && rest.length; i = (i + 1) % rest.length) { out[rest[i][0]]++; given++; }
    return out;
  }

  /* ── a sum shared exactly: each holder's part of each pot, nothing rounded, as the weightings read it ── */
  function partsOf(xp, amount) {
    const W = xp.law.weights, sumW = W.reduce((a, b) => a + b, 0) || 4;
    const by = {}, commonsFrom = zero();
    POTS.forEach((pot, i) => {
      const part = (amount * W[i]) / sumW;
      if (!part) return;
      const hold = holdersOf(xp, pot);
      if (!hold) { commonsFrom[pot] += part; return; }
      const weight = hold.reduce((a, [, v]) => a + v, 0);
      for (const [h, v] of hold) {
        const x = (part * v) / weight;
        if (!x) continue;
        if (h === COMMONS) { commonsFrom[pot] += x; continue; }
        (by[h] || (by[h] = zero()))[pot] += x;
      }
    });
    return { amount, by, commonsFrom };
  }

  /* ── the ledger's lines (function:shore 8): 'IN — £<amount> · from <a name> · for <a family's name, or anything>' and
   * 'PAID — £<amount> · to <handle> · for <what>', a minus sum putting a mistake right; any other line is a note ── */
  function parseLine(text, stamp) {
    const t = String(text || '').trim().replace(/\s+·\s+\d{4}-\d\d-\d\dT[\d:.]+Z[\s\S]*$/, '');
    const m = /^(IN|PAID)\s*[—–-]\s*([−-])?\s*£\s*([\d,]+(?:\.\d{1,2})?)\s*([\s\S]*)$/i.exec(t);
    if (!m) return { kind: 'note', amount: 0, text: t, when: stamp || '' };
    const out = { kind: m[1].toUpperCase() === 'IN' ? 'in' : 'paid', amount: parseFloat(m[3].replace(/,/g, '')) * (m[2] ? -1 : 1),
      to: '', from: '', what: '', family: '', layer: '', surface: false, text: t, when: stamp || '' };
    for (const p of m[4].replace(/^\s*·\s*/, '').split(/\s+·\s+/)) {
      let q;
      if ((q = /^to\s+(.+)$/i.exec(p))) out.to = q[1].trim();
      else if ((q = /^from\s+(.+)$/i.exec(p))) out.from = q[1].trim();
      else if ((q = /^for\s+([\s\S]+)$/i.exec(p))) out.what = q[1].trim();
      // a POINT names its layer after the thing, 'for reef-run · makers' (spine:value-weightings 1.13)
      else if ((q = /^(?:the\s+)?(players|bringers|makers|beach)$/i.exec(p.trim()))) out.layer = q[1].toLowerCase();
    }
    // the family a sum is for is the first word after 'for', where it is a family's name; whether a law stands under
    // that name is the reader's to find, and a sum for anything, or for a word that names no family, is shared by nobody
    const f = out.kind === 'in' && /^([a-z0-9][a-z0-9-]{1,63})(?=$|[\s,;.:—–(])/i.exec(out.what);
    if (f && !/^anything$/i.test(f[1])) out.family = f[1].toLowerCase();
    // THE SURFACE: money for anything (1.13), shared among every thing by its time, then by each thing's own line
    out.surface = out.kind === 'in' && /^anything\b/i.test(out.what);
    if (!out.family) out.layer = '';
    return out;
  }
  function ledgerLines(b) {
    const out = [];
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (typeof n._ === 'string' && /^(IN|PAID|CORRECTION)\b/i.test(n._.trim())) out.push(parseLine(n._, typeof n['3'] === 'string' ? n['3'] : ''));
      for (const k of Object.keys(n)) {
        const v = n[k];
        if (typeof v === 'string' && /^[1-9]$/.test(k) && /^(IN|PAID)\b/i.test(v.trim())) out.push(parseLine(v, ''));
        else if (v && typeof v === 'object') walk(v);
      }
    })(b);
    return out.sort((a, c) => String(a.when).localeCompare(String(c.when)));
  }

  /* ── the weightings as each sum landed, by an index a pot ──
   * Shared sum by sum (columnsOf, then partsOf), a run costs each sum a pass over every person in its family. The same
   * arithmetic runs here at one step a sum and one a new beat: each pot keeps an index, the running total of each sum's
   * part over its column's whole weight as the sum landed, and a holder's share of a pot is their weight times the rise
   * of the index while they held that weight, settled whenever their weight moves and once at the end. check-xp.mjs
   * checks that the two ways agree on an invented month of tickets. */
  const heldBy = () => ({ i: 0, seen: {}, v: { players: {}, bringers: {}, makers: {}, beach: {} }, last: { players: {}, bringers: {}, makers: {}, beach: {} },
    c: zero(), lastC: zero(), tot: zero(), idx: zero(), got: {}, gotC: zero(), direct: zero() });
  function settle(s, pot, h) {
    const v = s.v[pot][h];
    if (v) { const g = s.got[h] || (s.got[h] = zero()); g[pot] += v * (s.idx[pot] - s.last[pot][h]); }
    s.last[pot][h] = s.idx[pot];
  }
  function settleC(s, pot) { s.gotC[pot] += s.c[pot] * (s.idx[pot] - s.lastC[pot]); s.lastC[pot] = s.idx[pot]; }
  function lean(s, pot, h, dv) { settle(s, pot, h); s.v[pot][h] = (s.v[pot][h] || 0) + dv; s.tot[pot] += dv; }
  function leanC(s, pot, dv) { settleC(s, pot); s.c[pot] += dv; s.tot[pot] += dv; }
  /* a new beat for h: the same four readings columnsOf makes of it */
  function beatFor(prep, s, h) {
    if (prep.agents.has(h)) return;
    lean(s, 'players', h, 1);
    const chain = prep.chains[h] || (prep.chains[h] = chainOf(h, prep.brought.firstBy, prep.agents));
    if (chain.length) for (const c of chain) lean(s, 'bringers', c, 1 / chain.length); else leanC(s, 'bringers', 1);
    if (prep.makers.length) for (const m of prep.makers) lean(s, 'makers', m, 1 / prep.makers.length); else leanC(s, 'makers', 1);
    if (prep.beach.length) for (const b of prep.beach) lean(s, 'beach', b, 1 / prep.beach.length); else leanC(s, 'beach', 1);
  }
  function advance(prep, s, atMs) {
    const A = prep.acts;
    while (s.i < A.length && A[s.i].ms <= atMs) {
      const a = A[s.i++], t = s.seen[a.h] || (s.seen[a.h] = { beats: new Set(), lines: 0 });
      if (a.beat) { if (t.beats.has(a.beat)) continue; t.beats.add(a.beat); } else t.lines++;
      beatFor(prep, s, a.h);
    }
  }
  /* a sum lands: the players' part to the holders the law names, each other pot's part raising its index, or the whole
   * part to the commons where nobody stands in the column yet */
  function land(prep, s, amount) {
    const W = prep.L.weights, sumW = W.reduce((a, b) => a + b, 0) || 4;
    POTS.forEach((pot, i) => {
      const part = (amount * W[i]) / sumW;
      if (!part) return;
      if (pot === 'players' && prep.players.length) { for (const h of prep.players) (s.got[h] || (s.got[h] = zero())).players += part / prep.players.length; return; }
      if (!s.tot[pot]) { s.direct[pot] += part; return; }
      s.idx[pot] += part / s.tot[pot];
    });
  }
  /* a sum's own parts as it lands, for a trace: each pot's named part, the commons, and the watched holders' parts */
  function glimpse(prep, s, amount, watch) {
    const W = prep.L.weights, sumW = W.reduce((a, b) => a + b, 0) || 4, pots = zero(), by = {};
    let c = 0;
    POTS.forEach((pot, i) => {
      const part = (amount * W[i]) / sumW;
      if (!part) return;
      if (pot === 'players' && prep.players.length) {
        pots.players += part;
        if (watch) for (const h of prep.players) if (watch.has(h)) by[h] = (by[h] || 0) + part / prep.players.length;
        return;
      }
      if (!s.tot[pot]) { c += part; return; }
      pots[pot] += (part * (s.tot[pot] - s.c[pot])) / s.tot[pot];
      c += (part * s.c[pot]) / s.tot[pot];
      if (watch) for (const h of watch) { const v = s.v[pot][h]; if (v) by[h] = (by[h] || 0) + (part * v) / s.tot[pot]; }
    });
    return { pots, commons: c, by };
  }
  /* a sum's parts from one reading's parts of a single unit, for a trace of a run read at one moment */
  function scaled(u, amount, watch) {
    const pots = zero(), by = {};
    for (const [h, fr] of Object.entries(u.by)) {
      for (const p of POTS) pots[p] += fr[p] * amount;
      if (watch && watch.has(h)) by[h] = (fr.players + fr.bringers + fr.makers + fr.beach) * amount;
    }
    return { pots, commons: POTS.reduce((a, p) => a + u.commonsFrom[p], 0) * amount, by };
  }

  /* ── a ledger run (spine:shore 1.1112): every sum in that names a family is shared as that family's columns stood when
   * it landed, each person's exact part of each sum added up and made whole pence once, at the end; what each was paid
   * comes off, and what is left is the most they could ask for. A sum for anything is counted and shared by nobody.
   *   opts.credits: whole credits at each sum instead, as a ticket machine writes them at the moment of payment
   *   opts.readAt:  one moment for every sum, the lab's contrast to reading each as it landed
   *   opts.slow:    sum by sum through columnsOf and partsOf, the reference the index is checked against
   *   opts.trace:   each sum's own parts in the order they landed, every holder's where the run goes sum by sum and the
   *                 watched ones' (opts.watch, a list of handles) where it goes by the index or by one reading ── */
  function runLedger(lines, preps, opts) {
    opts = opts || {};
    const nowMs = opts.now ? new Date(opts.now).getTime() : Date.now();
    const readAt = opts.readAt ? new Date(opts.readAt) : null;
    const how = opts.credits ? 'credits' : readAt ? 'once' : opts.slow ? 'slow' : 'index';
    const watch = opts.watch ? new Set(opts.watch) : null;
    const ins = [], outs = [];
    for (const l of lines || []) {
      if (l.kind === 'in') ins.push({ l, ms: Date.parse(l.when) || nowMs });
      else if (l.kind === 'paid') outs.push(l);
    }
    ins.sort((a, b) => a.ms - b.ms);
    const states = {}, totals = {}, units = {}, exact = {}, wholes = {}, from = {}, families = {}, commonsFrom = zero();
    const trace = opts.trace ? [] : null;
    const addFrom = (h, fr) => { const r = from[h] || (from[h] = zero()); for (const p of POTS) r[p] += fr[p] || 0; };
    const addExact = (h, fr) => { exact[h] = (exact[h] || 0) + fr.players + fr.bringers + fr.makers + fr.beach; addFrom(h, fr); };
    let given = 0, shared = 0, anything = 0, commons = 0;
    for (const { l, ms } of ins) {
      const pence = Math.round(l.amount * 100);
      given += pence;
      const prep = l.family ? preps[l.family] : null;
      if (!prep) { anything += pence; if (trace) trace.push({ ms, pence, family: '', by: {}, pots: zero(), commons: 0 }); continue; }
      const f = families[l.family] || (families[l.family] = { sums: 0, pence: 0 });
      f.sums++; f.pence += pence; shared += pence;
      if (how === 'index') {
        const s = states[l.family] || (states[l.family] = heldBy());
        advance(prep, s, ms);
        if (trace) trace.push(Object.assign({ ms, pence, family: l.family }, glimpse(prep, s, pence, watch)));
        land(prep, s, pence);
        continue;
      }
      if (how === 'once') {
        totals[l.family] = (totals[l.family] || 0) + pence;
        if (trace) trace.push(Object.assign({ ms, pence, family: l.family }, scaled(units[l.family] || (units[l.family] = partsOf(xpAt(prep, readAt), 1)), pence, watch)));
        continue;
      }
      // sum by sum: the family's columns as the sum landed, then its parts, whole credits or exact
      states[l.family] = tallyTo(prep, ms, states[l.family]);
      const xp = columnsOf(prep, states[l.family], new Date(ms));
      const row = {}, pots = zero();
      let c = 0;
      if (how === 'credits') {
        const s = shareOut(xp, pence);
        for (const r of s.by) {
          wholes[r.handle] = (wholes[r.handle] || 0) + r.credits; addFrom(r.handle, r.from); row[r.handle] = r.credits;
          for (const q of POTS) pots[q] += r.from[q];
        }
        for (const p of POTS) commonsFrom[p] += s.commonsFrom[p];
        commons += s.commons; c = s.commons;
      } else {
        const p = partsOf(xp, pence);
        for (const [h, fr] of Object.entries(p.by)) {
          addExact(h, fr); row[h] = fr.players + fr.bringers + fr.makers + fr.beach;
          for (const q of POTS) pots[q] += fr[q];
        }
        for (const q of POTS) { commonsFrom[q] += p.commonsFrom[q]; c += p.commonsFrom[q]; }
      }
      if (trace) trace.push({ ms, pence, family: l.family, by: row, pots, commons: c });
    }
    if (how === 'index') for (const s of Object.values(states)) {
      for (const pot of POTS) { for (const h of Object.keys(s.v[pot])) settle(s, pot, h); settleC(s, pot); }
      for (const [h, g] of Object.entries(s.got)) addExact(h, g);
      for (const q of POTS) commonsFrom[q] += s.gotC[q] + s.direct[q];
    }
    if (how === 'once') for (const [fam, pence] of Object.entries(totals)) {
      const p = partsOf(xpAt(preps[fam], readAt), pence);
      for (const [h, fr] of Object.entries(p.by)) addExact(h, fr);
      for (const q of POTS) commonsFrom[q] += p.commonsFrom[q];
    }
    let earned = wholes;
    if (how !== 'credits') {
      earned = whole([...Object.entries(exact), [COMMONS, POTS.reduce((a, p) => a + commonsFrom[p], 0)]], shared);
      commons = earned[COMMONS] || 0;
      delete earned[COMMONS];
    }
    const paid = {}, lower = {};
    for (const h of Object.keys(earned)) lower[h.toLowerCase()] = h;
    let paidOut = 0;
    for (const l of outs) {
      const pence = Math.round(l.amount * 100), to = handleOf(l.to);
      paidOut += pence;
      if (!to) continue;
      const h = lower[to.toLowerCase()] || to;
      paid[h] = (paid[h] || 0) + pence;
    }
    const round = (r) => { const o = zero(); for (const p of POTS) o[p] = Math.round((r && r[p]) || 0); return o; };
    const by = [...new Set([...Object.keys(earned), ...Object.keys(paid)])]
      .map((h) => ({ handle: h, earned: earned[h] || 0, paid: paid[h] || 0, could: Math.max(0, (earned[h] || 0) - (paid[h] || 0)), from: round(from[h]) }))
      .sort((a, b) => b.earned - a.earned || a.handle.localeCompare(b.handle));
    return {
      unit: 'pence', method: how === 'credits' ? 'credits' : 'weightings', read: readAt ? readAt.toISOString() : 'as each sum landed',
      given, shared, anything, paid: paidOut, held: given - paidOut, families, by, commons, commonsFrom: round(commonsFrom), trace,
    };
  }

  /* ── THE VALUE AT EXIT (spine:value-weightings 1.11 and 1.111; 27 Nov 2026, lane coil.1, at David's 'trial with actual
   * eg £1 delivering weightings to single product-point (game), or column (xp group), or everyone'; thread:155) ──
   * Every sum waits in the pot of the scope its line names, nothing held for anyone, and a person's value is their part
   * of every pot as the weightings stand when it is read: read 'now', as value-weightings has it (a part worked out when
   * someone asks to take money out), or read 'landed', each sum as the weightings stood when it landed, which is what a
   * credit made at payment would hold, so the two can be set side by side on the same lines (David: 'We need to test
   * viability with xp and weightings versus credits').
   *   a LINE, 'for <thing>': the thing's four pots by its law's weights, each pot by its people's time;
   *   a POINT, 'for <thing> · <layer>': that one pot of the thing alone;
   *   the SURFACE, 'for anything': first among the things by their time, each thing's share its beats over all things'
   *     (its past value 1 until things are rated: 1.111's v[s]), then each thing's share by its own line.
   * What a person was paid comes off their value (CLAIM, 1.1118, the simplest, while that decision stands open), never
   * below nothing. A part nobody can be named for goes to the commons; a sum for a thing no law stands for is held,
   * shared by nobody. Exact pence; whole pence only where it is shown. ── */
  function exitValues(lines, preps, opts) {
    opts = opts || {};
    const read = opts.read === 'landed' ? 'landed' : 'now', now = opts.now || new Date();
    const things = (opts.surface && opts.surface.length ? opts.surface : Object.keys(preps)).filter((f) => preps[f]);
    const cache = {};
    const xpWhen = (f, ms) => cache[f + '@' + ms] || (cache[f + '@' + ms] = xpAt(preps[f], new Date(ms)));
    const value = {}, from = {}, paidTo = {}, commonsFrom = zero(), pots = { line: {}, point: {}, surface: 0, held: 0 };
    let given = 0, paidOut = 0;
    const add = (h, pot, x) => { if (h === COMMONS) { commonsFrom[pot] += x; return; } value[h] = (value[h] || 0) + x; (from[h] || (from[h] = zero()))[pot] += x; };
    const share = (xp, pence, layer) => {
      const W = layer ? POTS.map((p) => (p === layer ? 1 : 0)) : xp.law.weights, sumW = W.reduce((a, b) => a + b, 0) || 4;
      POTS.forEach((pot, i) => {
        const part = (pence * W[i]) / sumW;
        if (!part) return;
        const hold = holdersOf(xp, pot);
        if (!hold) { commonsFrom[pot] += part; return; }
        const weight = hold.reduce((a, [, v]) => a + v, 0);
        for (const [h, v] of hold) add(h, pot, (part * v) / weight);
      });
    };
    for (const l of lines) {
      const pence = Math.round(l.amount * 100);
      if (l.kind === 'paid') { paidOut += pence; const h = handleOf(l.to); if (h) paidTo[h.toLowerCase()] = (paidTo[h.toLowerCase()] || 0) + pence; continue; }
      if (l.kind !== 'in') continue;
      given += pence;
      const ms = read === 'landed' ? (Date.parse(l.when) || now.getTime()) : now.getTime();
      if (l.surface) {
        pots.surface += pence;
        const xs = things.map((f) => xpWhen(f, ms)), all = xs.reduce((a, x) => a + x.beats, 0);
        if (!all) { pots.held += pence; continue; }
        for (const x of xs) if (x.beats) share(x, (pence * x.beats) / all, '');
        continue;
      }
      if (!l.family || !preps[l.family]) { pots.held += pence; continue; }
      if (l.layer) { const k = l.family + ' · ' + l.layer; pots.point[k] = (pots.point[k] || 0) + pence; }
      else pots.line[l.family] = (pots.line[l.family] || 0) + pence;
      share(xpWhen(l.family, ms), pence, l.layer || '');
    }
    const lower = {};
    for (const h of Object.keys(value)) lower[h.toLowerCase()] = h;
    for (const h of Object.keys(paidTo)) if (!lower[h]) { lower[h] = h; value[h] = 0; }
    const by = Object.keys(value).map((h) => {
      const p = paidTo[h.toLowerCase()] || 0;
      return { handle: h, value: value[h], paid: p, could: Math.max(0, value[h] - p), from: from[h] || zero() };
    }).sort((a, b) => b.value - a.value || a.handle.localeCompare(b.handle));
    const commons = POTS.reduce((a, p) => a + commonsFrom[p], 0);
    return { unit: 'pence', read, at: now.toISOString(), things, given, paid: paidOut, held: given - paidOut, pots, by, commons, commonsFrom };
  }

  return { SITE, COMMONS, POTS, textOf, linesOf, nodeAt, entriesOf, handleOf, lawOf, agentsNamed, bringersOf, chainOf,
    beatOfMoment, prepare, tallyTo, columnsOf, xpAt, shareOut, whole, partsOf, parseLine, ledgerLines, runLedger, exitValues };
}));
