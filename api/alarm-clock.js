/**
 * /api/alarm-clock — the alarm family's clock (function:alarm 5).
 *
 * Every five minutes (vercel.json crons) it reads each holder's own alarm,
 * alarm:<handle>, and rings every line whose beat began in the five minutes
 * before this run's slot: the line goes, in the holder's own words, into the
 * holder's own parlour, pool:<handle>, as a voice committed by 'alarm'. That is
 * the whole of it. The beach's doorbell rings whatever already listens at a
 * parlour — the push engine carries the line to the holder through their ear,
 * and the waker wakes the holder's agent if it is enrolled with its dial on.
 *
 * It keeps no state and holds no key: the mirrors and the parlours are public
 * and open, and the slot alone says which beat is due, so each line rings once
 * and the line in the parlour is the trace. A run the scheduler skips leaves
 * its window unrung. It reads the words only to carry them — the address is
 * when, the words are what (function:alarm 1).
 *
 * Query (every call carries the cron bearer when CRON_SECRET is set):
 *   slot=<ISO instant>  run as if at that instant (to ring a missed window)
 *   dry=1               report what would ring and post nothing
 *
 * Env (Vercel project settings):
 *   CRON_SECRET — if set, Vercel sends it as a Bearer token on cron
 *                 invocations; manual calls must too
 */

const BEACH = 'https://beach.happyseaurchin.com';
const WELL = `${BEACH}/.well-known/pscale-beach`;
const PERIOD_MS = 5 * 60 * 1000;   // the cron's own period: one window per run

/* ── the sundial — momentToAddress, addressToSpan and voiceAddress as in
 * api/news.js (pscale-beach lib/temporal.js, itself the port of bsp-mcp
 * src/temporal.ts): re-port, never fork. ── */
const DAY_PARTS = ['deep night', 'dawn', 'early morning', 'morning', 'midday',
  'afternoon', 'late afternoon', 'evening', 'night'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function momentToAddress(when) {
  const y = when.getUTCFullYear();
  const month = when.getUTCMonth();
  const dom = when.getUTCDate();
  const secOfDay = when.getUTCHours() * 3600 + when.getUTCMinutes() * 60 + when.getUTCSeconds();
  const partS = 86400 / 9;
  const beatS = partS / 9;
  const part = Math.floor(secOfDay / partS);
  const beat = Math.floor((secOfDay - part * partS) / beatS);
  return [
    Math.floor(y / 1000) % 10, Math.floor(y / 100) % 10, Math.floor(y / 10) % 10, y % 10,
    Math.floor(month / 3) + 1, (month % 3) + 1,
    Math.floor((dom - 1) / 7) + 1, ((dom - 1) % 7) + 1,
    part + 1, beat + 1,
  ].join('');
}

function addressToSpan(addr) {
  const d = addr.split('').map(Number);
  let depth = 10;
  while (depth > 1 && d[depth - 1] === 0) depth--;
  const y = d[0] * 1000 + d[1] * 100 + d[2] * 10 + d[3];
  if (depth <= 4) return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)), pscale: 6 };
  const season = d[4] - 1;
  if (depth === 5) return { start: new Date(Date.UTC(y, season * 3, 1)), end: new Date(Date.UTC(y, season * 3 + 3, 1)), pscale: 5 };
  const month = season * 3 + (d[5] - 1);
  if (depth === 6) return { start: new Date(Date.UTC(y, month, 1)), end: new Date(Date.UTC(y, month + 1, 1)), pscale: 4 };
  const bandStart = (d[6] - 1) * 7 + 1;
  if (depth === 7) {
    const rawEnd = Date.UTC(y, month, bandStart + 7);
    const monthEnd = Date.UTC(y, month + 1, 1);
    return { start: new Date(Date.UTC(y, month, bandStart)), end: new Date(Math.min(rawEnd, monthEnd)), pscale: 3 };
  }
  const dom = bandStart + (d[7] - 1);
  const dayStart = Date.UTC(y, month, dom);
  if (depth === 8) return { start: new Date(dayStart), end: new Date(dayStart + 86400_000), pscale: 2 };
  const partS = 9600_000;
  const pStart = dayStart + (d[8] - 1) * partS;
  if (depth === 9) return { start: new Date(pStart), end: new Date(pStart + partS), pscale: 1 };
  const beatS = partS / 9;
  const bStart = pStart + (d[9] - 1) * beatS;
  return { start: new Date(bStart), end: new Date(bStart + beatS), pscale: 0 };
}

function voiceAddress(addr) {
  const { start, pscale } = addressToSpan(addr);
  const y = start.getUTCFullYear();
  if (pscale === 6) return `${y}`;
  if (pscale === 5) return `${['winter-quarter', 'spring-quarter', 'summer-quarter', 'autumn-quarter'][Math.floor(start.getUTCMonth() / 3)]} ${y}`;
  if (pscale === 4) return `${MONTHS[start.getUTCMonth()]} ${y}`;
  if (pscale === 3) return `the week of ${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]} ${y}`;
  const day = `${WEEKDAYS[start.getUTCDay()]} ${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]} ${y}`;
  if (pscale === 2) return day;
  const part = DAY_PARTS[Number(addr[8]) - 1];
  if (pscale === 1) return `${day}, ${part}`;
  return `${day}, ${part} (beat ${addr[9]})`;
}

// A node's own line: the string, or the underscore chain down to one.
function voiceOf(node) {
  let n = node;
  while (n && typeof n === 'object') n = n._;
  return typeof n === 'string' ? n.trim() : '';
}

async function nodeAt(block, spindle) {
  const r = await fetch(`${WELL}?block=${encodeURIComponent(block)}&spindle=${spindle}`);
  if (!r.ok) return null;
  try { return await r.json(); } catch { return null; }
}

// The beat that began in [slot − period, slot), if one did. A beat is about
// eighteen minutes wide, so a five-minute window holds at most one start.
function dueBeat(slotMs) {
  const beat = momentToAddress(new Date(slotMs - 1));
  return addressToSpan(beat).start.getTime() >= slotMs - PERIOD_MS ? beat : null;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const q = req.query || {};
  const at = q.slot ? Date.parse(String(q.slot)) : Date.now();
  if (Number.isNaN(at)) return res.status(400).json({ error: 'slot is not an instant' });
  const dry = q.dry === '1' || q.dry === 'true';
  const slot = Math.floor(at / PERIOD_MS) * PERIOD_MS;
  const window = [new Date(slot - PERIOD_MS).toISOString(), new Date(slot).toISOString()];
  const beat = dueBeat(slot);
  if (!beat) return res.status(200).json({ window, beat: null, rang: [] });

  let names;
  try {
    const index = await (await fetch(WELL)).json();
    names = new Set(index.blocks || []);
  } catch (e) {
    return res.status(502).json({ window, beat, error: `the beach index did not answer: ${e.message}` });
  }
  const holders = [...names].filter((n) => n.startsWith('alarm:')).map((n) => n.slice('alarm:'.length));
  const rang = [];
  const unrung = [];
  await Promise.all(holders.map(async (holder) => {
    try {
      const line = voiceOf(await nodeAt(`alarm:${holder}`, beat));
      if (!line) return;
      if (!names.has(`pool:${holder}`)) { unrung.push({ holder, why: 'no parlour' }); return; }
      if (dry) { rang.push({ holder, line, dry: true }); return; }
      const r = await fetch(WELL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          block: `pool:${holder}`,
          append: true,
          content: { _: `${line.replace(/[\s.]+$/, '')} — your alarm, set for ${voiceAddress(beat)}.`, 1: 'alarm', 2: '', 3: new Date().toISOString() },
        }),
      });
      const ack = await r.json().catch(() => ({}));
      if (r.ok) rang.push({ holder, slot: ack.slot });
      else unrung.push({ holder, why: `parlour refused: ${r.status} ${ack.error || ''}`.trim() });
    } catch (e) {
      unrung.push({ holder, why: e.message });
    }
  }));
  return res.status(200).json({ window, beat, voicing: voiceAddress(beat), holders: holders.length, rang, unrung });
}
