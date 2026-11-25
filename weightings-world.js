/**
 * weightings-world.js — an invented game's month for the weightings lab (/weightings): its people, its shares, its races
 * and its tickets, written as the blocks the beach would hold (the game's law with its support line, its room of
 * finished races, the String of who brought whom, the ledger's lines), so the lab runs them through weigh.js, the XP
 * reader's own working, and reads what each party could ask for. Every name and number is invented, and the same
 * settings always invent the same month: the draws are seeded.
 *
 *   inventMonth(opts?) → { blocks, lines, cast, meta }
 *     blocks: { family, law, economy, fam, room, strings, threads }, as weigh.prepare takes them
 *     lines:  the ledger's IN lines, one a ticket, parsed as weigh.ledgerLines would read them
 *     cast:   { makers, beach, cup, distributors: [{ h, reach, from, to, shares, brought }], players: [{ h, via, arrive, tickets }] }
 *     meta:   { start, end, tickets, price, paid (what buyers paid), fees, net (what the ledger holds), feeEach }
 *
 * The month is December 2026. Each player arrives once: through a distributor's share, through another player's share
 * (the chain), or by finding the game alone. Each ticket buys a session of one to three races, each race a line in the
 * game's room in a beat of its own, after the ticket lands. A late distributor (eli) shares only in the last ten days.
 */
(function (root, make) {
  if (typeof module === 'object' && module && module.exports) module.exports = make(require('./weigh.js'));
  else root.weightingsWorld = make(root.weigh);
}(typeof self !== 'undefined' ? self : this, function (weigh) {
  'use strict';
  const DAY = 86400000, BEAT = 86400000 / 81;
  const START = Date.UTC(2026, 11, 1), DAYS = 31, END = START + DAYS * DAY;

  const DEFAULTS = {
    family: 'reef-run', tickets: 1000, price: 5, weights: [5, 10, 80, 5], cup: true,
    makers: ['mara'], beach: ['tide'], making: 6, brought: 0.7, chain: 0.15, seed: 7,
    fee: 'none', feePct: 1.5, feeFixed: 20,                     // Stripe's standard UK card: 1.5% + 20p
    distributors: [
      { h: 'ana', reach: 0.40, from: 1, to: 14, says: 'a streamer, early in the month' },
      { h: 'ben', reach: 0.20, from: 1, to: 31, says: 'shares with friends all month' },
      { h: 'cai', reach: 0.12, from: 6, to: 20, says: 'posts in a racing forum' },
      { h: 'dee', reach: 0.08, from: 10, to: 31, says: 'shares now and then' },
      { h: 'eli', reach: 0.20, from: 22, to: 31, says: 'a late post, the last ten days' },
    ],
  };

  /* a seeded draw (mulberry32): the same seed, the same month */
  function draw(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* a line at an address, the digit 0 by '_', as a mirror holds a say at its moment */
  function put(b, path, text) {
    let n = b;
    for (const c of path.slice(0, -1)) {
      const k = c === '0' ? '_' : c;
      n = n[k] && typeof n[k] === 'object' ? n[k] : (n[k] = {});
    }
    n[path.slice(-1) === '0' ? '_' : path.slice(-1)] = text;
  }
  /* an accumulator's entries nested nine to a node, as a room's ladder holds them */
  function nest(items) {
    if (items.length <= 9) { const n = {}; items.forEach((v, i) => { n[i + 1] = v; }); return n; }
    const size = Math.ceil(items.length / 9), n = {};
    for (let i = 0; i < 9 && i * size < items.length; i++) n[i + 1] = nest(items.slice(i * size, (i + 1) * size));
    return n;
  }
  const iso = (ms) => new Date(Math.round(ms)).toISOString();
  const money = (p) => '£' + (p / 100).toFixed(2);

  function inventMonth(opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const rnd = draw(o.seed);
    const fam = o.family, page = 'https://happyseaurchin.com/games/' + fam;
    const T = Math.max(1, Math.round(o.tickets));
    const N = Math.max(3, Math.min(T, Math.round(T * 0.36)));

    /* the moments shares are made, each in a beat of its own, so an answer names one share */
    const taken = new Set();
    const beatOf = (ms) => weigh.beatOfMoment(new Date(ms));
    function ownBeat(ms) {
      let m = Math.max(START + 60000, Math.min(ms, END - BEAT));
      for (let i = 0; taken.has(beatOf(m)) && i < 4000; i++) m = m + BEAT < END ? m + BEAT : START + rnd() * (END - START - BEAT);
      taken.add(beatOf(m));
      return m;
    }

    /* the distributors' shares: one every three days or so, inside the days each shares */
    const distributors = (o.distributors || []).map((d) => {
      const span = Math.max(1, d.to - d.from + 1), k = Math.max(1, Math.round(span / 3));
      const shares = [];
      for (let i = 0; i < k; i++) shares.push({ h: d.h, ms: ownBeat(START + (d.from - 1 + ((i + 0.15 + rnd() * 0.7) * span) / k) * DAY) });
      return { h: d.h, reach: d.reach, from: d.from, to: d.to, says: d.says || '', shares, brought: 0 };
    });
    const reach = distributors.reduce((a, d) => a + d.reach, 0);

    /* the players, and how each came: a distributor's share, another player's share (the chain), or alone */
    const width = Math.max(3, String(N).length);
    const players = [];
    for (let i = 0; i < N; i++) players.push({ h: 'p' + String(i + 1).padStart(width, '0'), via: '', share: null, own: null, arrive: 0, tickets: 1 });
    for (const p of players) {
      if (rnd() >= o.brought || !reach) { p.via = ''; p.arrive = START + rnd() * (END - START - DAY); continue; }
      if (rnd() < o.chain) { p.via = '*'; continue; }
      let r = rnd() * reach, d = distributors[distributors.length - 1];
      for (const x of distributors) { if ((r -= x.reach) <= 0) { d = x; break; } }
      const s = d.shares[Math.floor(rnd() * d.shares.length)];
      p.via = d.h; p.share = s; p.arrive = Math.min(END - DAY / 2, s.ms + rnd() * 1.5 * DAY); d.brought++;
    }
    const settled = players.filter((p) => p.via !== '*' && p.arrive < END - 3 * DAY);
    for (const p of players.filter((x) => x.via === '*')) {
      if (!settled.length) { p.via = ''; p.arrive = START + rnd() * (END - START - DAY); continue; }
      const x = settled[Math.floor(rnd() * settled.length)];
      if (!x.own) x.own = { h: x.h, ms: ownBeat(x.arrive + (0.3 + rnd() * 2) * DAY) };
      p.via = x.h; p.share = x.own; p.arrive = Math.min(END - DAY / 2, x.own.ms + rnd() * DAY);
    }

    /* the tickets: one each, the rest by a long tail (a few race a lot), fewer for those who came late */
    const w = players.map((p) => Math.pow(1 - rnd(), -1 / 1.6) * ((END - p.arrive) / (END - START) + 0.05));
    const cum = [];
    w.reduce((a, v, i) => (cum[i] = a + v), 0);
    const total = cum[cum.length - 1];
    for (let i = N; i < T; i++) {
      const u = rnd() * total;
      let lo = 0, hi = cum.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid + 1; else hi = mid; }
      players[lo].tickets++;
    }

    /* the fee on a card: none, off the top (the ledger holds the price less the fee), or paid by the buyer on top */
    const price = Math.round(o.price * 100);
    const feeOn = (p) => Math.round((p * o.feePct) / 100 + o.feeFixed);
    let paidEach = price, net = price;
    if (o.fee === 'top') { net = price - feeOn(price); }
    else if (o.fee === 'buyer') { paidEach = Math.ceil((price + o.feeFixed) / (1 - o.feePct / 100)); net = paidEach - feeOn(paidEach); }

    /* each ticket's moment, its line in the ledger, and its session of races in the room */
    const tickets = [], races = [];
    for (const p of players) {
      const times = [p.arrive + rnd() * 3 * 3600000];
      for (let i = 1; i < p.tickets; i++) times.push(p.arrive + rnd() * (END - p.arrive - 3600000));
      times.sort((a, b) => a - b);
      for (const t of times) {
        tickets.push({ h: p.h, ms: t });
        const k = 1 + Math.floor(rnd() * 3);
        for (let j = 0; j < k; j++) {
          const at = t + (3 + 18 * j + rnd() * 4) * 60000;
          const s = 75 + rnd() * 40;
          races.push({ _: 'FINISHED ' + Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0'), 1: p.h, 3: iso(at) });
        }
      }
    }
    /* the makers' own test races in the last days of November, before the first ticket: making counts where it lands on
       the beach (spine:experience-points 1.14), so the makers' and the beach's columns stand before anyone pays */
    for (const m of o.makers) for (let j = 0; j < o.making; j++) {
      const at = START - (5 - (j * 5) / o.making) * DAY + rnd() * 3 * 3600000;
      races.push({ _: 'TEST RUN ' + (1 + rnd()).toFixed(2).replace('.', ':') + ' — making the track', 1: m, 3: iso(at) });
    }
    tickets.sort((a, b) => a.ms - b.ms);
    races.sort((a, b) => (a[3] < b[3] ? -1 : 1));
    const lines = tickets.map((t) => weigh.parseLine('IN — ' + money(net) + ' · from ' + t.h + ' · for ' + fam, iso(t.ms)));

    /* the String: each share a line in its sharer's own mirror at its moment, each answer at the same address */
    const strings = {};
    const say = (h, ms, text) => { const b = strings[h] || (strings[h] = { _: 'MIRROR — ' + h + ', on the String' }); put(b, beatOf(ms), text); };
    for (const d of distributors) for (const s of d.shares) say(d.h, s.ms, 'SHARE ' + page + ' — come and race');
    for (const p of players) {
      if (p.own) say(p.h, p.own.ms, 'SHARE ' + page + ' — race me');
      if (p.share) say(p.h, p.share.ms, 'came to race');
    }

    /* the game's law, its support line saying how a ticket is shared */
    const W = o.weights;
    const support = { _: 'SUPPORT — a ticket is ' + money(price) + ', each shared by the four columns as they stand when it lands.' };
    let i = 1;
    support[i++] = 'makers: ' + o.makers.join(', ') + ' — who made it';
    support[i++] = 'the beach: ' + o.beach.join(', ') + ' — who keeps the beach\'s server';
    if (o.cup) support[i++] = 'the players: ' + fam + '-cup — held for its tournaments';
    support[i++] = 'weights: ' + W.join(' ') + ' — the players, the bringers, the makers, the beach';
    const law = { _: 'THE LAW of ' + fam + ' — an invented race game, for the weightings lab (/weightings): every name and number in it is invented.',
      1: 'mode: game', 3: 'room: pool:' + fam, 6: 'page: ' + page, 7: support };
    const room = Object.assign({ _: 'The room of ' + fam + ': each finished race, as the game\'s plug keeps it.' }, nest(races));

    return {
      blocks: { family: fam, law, economy: { _: 'THE ECONOMY — invented for the lab; nobody here is an agent.' }, fam: { mirrors: {}, born: {} },
        room, strings: { mirrors: strings }, threads: { mirrors: {} } },
      lines,
      cast: { makers: o.makers.slice(), beach: o.beach.slice(), cup: o.cup ? fam + '-cup' : '', distributors,
        players: players.map((p) => ({ h: p.h, via: p.via, arrive: p.arrive, tickets: p.tickets, shared: !!p.own })) },
      meta: { start: START, end: END, tickets: T, players: N, races: races.length, price, paidEach, net, feeEach: paidEach - net,
        paid: paidEach * T, fees: (paidEach - net) * T, held: net * T, fee: o.fee, weights: W.slice(), cup: !!o.cup },
    };
  }

  /* ── a month run through the reader's own working (weigh.js): what each party could ask for at the month's end ──
   * how: { credits: true } whole credits at each ticket, as a ticket machine writes them; { readAt } one moment for every
   * ticket instead of each as it landed; { watch: true } each ticket's parts for the distributors and the players who
   * shared, in its trace. The parties are read by column from each ticket's own parts: the creator is the makers'
   * column, the distributors the bringers' (the named distributors and the players who shared onward), the cup or the
   * players the players', the beach's server the beach's, and the commons whatever nobody could be named for. */
  function runMonth(opts, how) {
    const world = inventMonth(opts);
    const prep = weigh.prepare(world.blocks);
    const sharers = world.cast.players.filter((p) => p.shared).map((p) => p.h);
    const h = Object.assign({ now: world.meta.end, trace: true }, how || {});
    if (h.watch === true) h.watch = world.cast.distributors.map((d) => d.h).concat(sharers);
    const run = weigh.runLedger(world.lines, { [world.blocks.family]: prep }, h);
    const pots = { players: 0, bringers: 0, makers: 0, beach: 0 };
    let commons = 0;
    for (const t of run.trace) { for (const p of weigh.POTS) pots[p] += t.pots[p]; commons += t.commons; }
    const row = {};
    for (const r of run.by) row[r.handle] = r;
    const parties = {
      creator: pots.makers, distributors: pots.bringers, players: pots.players, beach: pots.beach, commons,
      named: world.cast.distributors.map((d) => ({ h: d.h, says: d.says, brought: d.brought, from: d.from, to: d.to, pence: row[d.h] ? row[d.h].earned : 0 })),
      sharers: { people: sharers.length, list: sharers, pence: sharers.reduce((a, s) => a + (row[s] ? row[s].from.bringers : 0), 0),
        paid: sharers.filter((s) => row[s] && row[s].from.bringers > 0).length },
      cup: world.cast.cup && row[world.cast.cup] ? row[world.cast.cup].earned : 0,
      perPlayer: world.cast.players.map((p) => ({ h: p.h, tickets: p.tickets, pence: row[p.h] ? row[p.h].from.players : 0 })),
      wholes: { commons: run.commons, creator: world.cast.makers.reduce((a, m) => a + (row[m] ? row[m].earned : 0), 0),
        beach: world.cast.beach.reduce((a, b) => a + (row[b] ? row[b].earned : 0), 0) },
    };
    parties.wholes.distributors = parties.named.reduce((a, d) => a + d.pence, 0) + parties.sharers.pence;
    return { world, prep, run, parties };
  }

  return { DEFAULTS, START, END, DAY, BEAT, draw, put, nest, inventMonth, runMonth };
}));
