/**
 * /api/sitemap — a website's own map, read as one pscale block (19 Nov 2026, lane eye.17, at David's 'go ahead with
 * step 4': "the internet -- effectively a browser to the internet where site-maps get translated into pscale blocks").
 *
 *   GET /api/sitemap?site=<a site's name, or an address on it>
 *       { site, origin, found, state, maps, pages, seen, elsewhere, more, read, block }
 *
 * WHERE A SITE KEEPS ITS MAP: its robots.txt names it (a Sitemap line, the sitemaps protocol's own way); a site that names
 * none is looked for at /sitemap.xml and /sitemap_index.xml. A map may be an index of maps, read in turn, and a map that
 * comes gzipped is opened. A map written as plain lines of addresses is read as one.
 *
 * THE BLOCK (strata 1: one block, the nesting is the data): the site's own pages, the segments of each page's path its
 * rungs, in the order the site's own map first names them. A page says '<its name> — <its address>', so the eye finds its
 * link in its words; a folder that is no page says how many pages stand beneath it; a run of folders with only one way down
 * reads as one rung ('En / us'). Where a rung holds more than nine, they are nested nine to a node, as an accumulator nests
 * its entries (block-conventions 3.5), each node saying which it holds ('first … last — 10 to 18 of 37'), so every page
 * stays a walk of digits. The top says whose site it is, how many pages its map lists, when it was read, and its front page.
 *
 * IT IS NEVER A FETCHER FOR ANY ADDRESS (string.js's rule, and its guard): the site must be a name on the public internet,
 * and every address on the way is looked up and refused if it is not (string.js mayRead); only the site's robots.txt and
 * the maps it names (or the two well-known places) are read, over https only (a map named http:// is asked for as https://,
 * and no redirect is followed down to http), each through at most three redirects, each looked at first;
 * a map named on another site is passed by unless it is the site's own name or beneath it; at most MAPS maps, BYTES bytes
 * a map once opened, PAGES pages and BUDGET of time; and only the block comes back, built from the <loc>s of the site's own
 * pages, never anything a map or a page said beyond them. Nothing is stored: the CDN keeps a site's block an hour and
 * serves it for a day while the next is read, so a crowd at one site costs one read.
 */

import { mayRead } from './string.js';

const AGENT = 'happyseaurchin-eye/1.0 (+https://happyseaurchin.com/eye)';
const MAPS = 12;             // maps read at most, an index's among them
const BYTES = 6000000;       // bytes of one map read at most, once opened where it came gzipped
const ROBOTS = 200000;       // bytes of robots.txt read at most
const PAGES = 2000;          // pages kept in the block at most
const BUDGET = 14000;        // ms for the whole read: what is read by then is what is kept
const HOPS = 3;              // redirects followed at most, each address looked at first
const WELL_KNOWN = ['/sitemap.xml', '/sitemap_index.xml'];

/* a site is named by its address: example.com, www.example.com, https://example.com/anything; '' where it is not one */
export function siteOf(v) {
  let s = String(v || '').trim();
  if (!s || s.length > 300 || /\s/.test(s)) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'https://' + s;
  let u; try { u = new URL(s); } catch { return ''; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || (u.port && u.port !== '80' && u.port !== '443')) return '';
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (host.length > 253 || !host.includes('.') || /^\d+(\.\d+){3}$/.test(host) || host.startsWith('[')) return '';
  if (!host.split('.').every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) return '';
  if (/\.(local|localhost|internal|intranet|lan|home|test|invalid|onion)$/.test(host)) return '';
  return host;
}
const bare = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
/* the site itself, its www twin, or a name beneath it: where its maps may stand */
const ownName = (host, site) => { const a = bare(host), b = bare(site); return a === b || a.endsWith('.' + b); };

/* ── reading, guarded ── */
async function get(url, accept, until) {
  let u; try { u = new URL(url); } catch { return { why: 'not an address' }; }
  for (let hop = 0; hop <= HOPS; hop++) {
    if (u.protocol !== 'https:') return { why: 'not a secure web address' };   // never downgraded on the way
    if (!(await mayRead(u))) return { refused: true, why: u.hostname + ' is not on the public internet' };
    const left = until - Date.now();
    if (left < 400) return { why: 'out of time' };
    let r;
    try { r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': AGENT, Accept: accept }, signal: AbortSignal.timeout(Math.min(8000, left)) }); }
    catch { return { why: u.hostname + ' did not answer' }; }
    const to = r.status >= 300 && r.status < 400 ? r.headers.get('location') : '';
    if (!to) return { r, u };
    try { if (r.body) await r.body.cancel(); } catch {}
    try { u = new URL(to, u); } catch { return { why: 'a redirect to nowhere' }; }
  }
  return { why: 'too many redirects' };
}
/* a body read as text up to cap bytes, opened first where it came gzipped (its first two bytes say so) */
async function textOf(r, cap) {
  if (!r.body) return '';
  const raw = r.body.getReader();
  let first;
  try { first = await raw.read(); } catch { return ''; }
  if (first.done || !first.value) return '';
  const head = first.value, gz = head.length > 1 && head[0] === 0x1f && head[1] === 0x8b;
  const again = new ReadableStream({
    start(c) { c.enqueue(head); },
    async pull(c) { try { const { done, value } = await raw.read(); if (done) c.close(); else c.enqueue(value); } catch (e) { c.error(e); } },
    cancel() { raw.cancel().catch(() => {}); }
  });
  const rd = (gz ? again.pipeThrough(new DecompressionStream('gzip')) : again).getReader(), dec = new TextDecoder();
  let text = '', n = 0;
  try {
    while (n < cap) { const { done, value } = await rd.read(); if (done) break; n += value.length; text += dec.decode(value, { stream: true }); }
  } catch { /* what was read is what is kept */ }
  try { await rd.cancel(); } catch {}
  return text;
}
const XML = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = (s) => String(s).replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) =>
  e[0] !== '#' ? XML[e.toLowerCase()] : String.fromCodePoint(/^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
/* what a map holds: its <loc>s, and whether they are maps (an index) or pages; a map of plain lines is pages */
export function mapOf(text) {
  const t = String(text || '');
  if (!/<\s*(urlset|sitemapindex)\b/i.test(t.slice(0, 20000)) && !/<loc>/i.test(t)) {
    return { index: false, locs: t.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\/\S+$/i.test(l)) };
  }
  const locs = [], re = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi;
  let m; while ((m = re.exec(t))) locs.push(unxml(m[1]).trim());
  return { index: /<\s*sitemapindex\b/i.test(t.slice(0, 20000)), locs };
}
/* robots.txt's Sitemap lines, in order */
export function mapsNamedIn(robots) {
  const out = [];
  for (const line of String(robots || '').split(/\r?\n/)) { const m = /^\s*sitemap\s*:\s*(\S+)/i.exec(line); if (m && !out.includes(m[1])) out.push(m[1]); }
  return out;
}

/* ── the block ── */
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
/* a segment's own words: its letters unescaped, an ending like .html dropped, dashes as spaces, its first letter raised */
export function nameOf(seg) {
  let s = String(seg || '');
  if (s[0] === '?') return clip(s, 80);
  try { s = decodeURIComponent(s); } catch { /* as it stands */ }
  s = s.replace(/\.(html?|php|aspx?|jsp|cfm|shtml)$/i, '').replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim() || String(seg);
  return clip(s.charAt(0).toUpperCase() + s.slice(1), 80);
}
const node = (seg) => ({ seg, name: seg ? nameOf(seg) : '', url: '', kids: new Map(), count: 0 });
/* the site's pages as a tree of their paths, in the order its map names them; a query is a rung of its own */
export function treeOf(urls) {
  const root = node('');
  for (const href of urls) {
    let u; try { u = new URL(href); } catch { continue; }
    const segs = u.pathname.split('/').filter(Boolean);
    if (u.search) segs.push(u.search);
    let n = root;
    for (const s of segs) { if (!n.kids.has(s)) n.kids.set(s, node(s)); n = n.kids.get(s); }
    if (!n.url) n.url = u.origin + u.pathname + u.search;
  }
  (function count(n) { n.count = (n.url ? 1 : 0); for (const k of n.kids.values()) n.count += count(k); return n.count; })(root);
  (function fold(n) {                     // a folder that is no page, with one way down, reads as one rung with it
    for (const [s, k] of Array.from(n.kids.entries())) {
      let c = k;
      while (!c.url && c.kids.size === 1) { const only = c.kids.values().next().value; only.name = c.name + ' / ' + only.name; c = only; }
      if (c !== k) n.kids.set(s, c);
      fold(c);
    }
  })(root);
  return root;
}
const pages = (n) => n + (n === 1 ? ' page' : ' pages');
function blockOf(n) {
  const text = n.url ? n.name + ' — ' + n.url : n.name + ' — ' + pages(n.count) + ' beneath';
  const kids = Array.from(n.kids.values());
  return kids.length ? Object.assign({ _: text }, nineOf(kids)) : text;
}
/* a rung's crowd, nine to a node: past nine, each digit holds a run of them, nested again until a node holds nine */
function nineOf(list) {
  const out = {};
  if (list.length <= 9) { list.forEach((k, i) => { out[i + 1] = blockOf(k); }); return out; }
  let size = 9; while (size * 9 < list.length) size *= 9;
  for (let i = 0, d = 1; i < list.length; i += size, d++) {
    const run = list.slice(i, i + size);
    out[d] = run.length === 1 ? blockOf(run[0])
      : Object.assign({ _: clip(run[0].name, 40) + ' … ' + clip(run[run.length - 1].name, 40) + ' — ' + (i + 1) + ' to ' + (i + run.length) + ' of ' + list.length }, nineOf(run));
  }
  return out;
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = (d) => d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
export function siteBlock(site, origin, urls, more, now) {
  const root = treeOf(urls), when = day(now || new Date()), front = origin + '/';
  const said = site + ' — its pages as its own sitemap lists them: ' + pages(urls.length) + (more ? ', the first of more' : '') + ', read ' + when + '. Its front page: ' + front;
  return Object.assign({ _: said }, nineOf(Array.from(root.kids.values())));
}

/* ── the read: robots.txt, then each map it names, an index's maps in turn, until the caps ── */
export async function read(site) {
  const until = Date.now() + BUDGET, out = { site, origin: 'https://' + site, found: false, state: 'none', maps: [], pages: 0, seen: 0, elsewhere: 0, more: false, read: new Date().toISOString() };
  const first = await get('https://' + site + '/robots.txt', 'text/plain,*/*;q=0.5', until);
  if (first.refused) return Object.assign(out, { refused: true, state: 'refused', error: first.why });
  let named = [];
  if (first.r) {
    out.origin = first.u.origin;
    if (first.r.ok) named = mapsNamedIn(await textOf(first.r, ROBOTS));
    else { try { if (first.r.body) await first.r.body.cancel(); } catch {} }
  } else if (/did not answer/.test(first.why || '')) {
    return Object.assign(out, { state: 'down', block: { _: site + ' — did not answer just now, so nothing there could be read. Its front page: https://' + site + '/' } });
  }
  const home = new URL(out.origin).hostname, queue = [], asked = new Set(), urls = [], kept = new Set();
  // a map is read over https, an http:// one named in robots.txt asked for as https:// (most sites list them so and serve both)
  const ask = (href) => { let u; try { u = new URL(href, out.origin); } catch { return; } if (u.protocol === 'http:') u.protocol = 'https:'; if (u.protocol !== 'https:' || !ownName(u.hostname, home) || asked.has(u.href)) return; asked.add(u.href); queue.push(u.href); };
  named.forEach(ask);
  if (!queue.length) WELL_KNOWN.forEach((p) => ask(out.origin + p));
  while (queue.length && out.maps.length < MAPS && urls.length < PAGES && Date.now() < until - 400) {
    const href = queue.shift();
    const got = await get(href, 'application/xml,text/xml,text/plain,*/*;q=0.5', until);
    if (!got.r) continue;
    if (!got.r.ok) { try { if (got.r.body) await got.r.body.cancel(); } catch {} continue; }
    const map = mapOf(await textOf(got.r, BYTES));
    if (!map.locs.length) continue;
    out.maps.push(href);
    if (map.index) { map.locs.forEach(ask); continue; }
    for (const loc of map.locs) {
      out.seen++;
      let u; try { u = new URL(loc); } catch { continue; }
      if (bare(u.hostname) !== bare(home) || !/^https?:$/.test(u.protocol)) { out.elsewhere++; continue; }
      const key = (u.pathname.replace(/\/+$/, '') || '/') + u.search;
      if (kept.has(key)) continue;
      if (urls.length >= PAGES) { out.more = true; break; }
      kept.add(key); urls.push(u.origin + u.pathname + u.search);
    }
  }
  if (queue.length && urls.length) out.more = true;
  out.pages = urls.length; out.found = urls.length > 0;
  out.state = out.found ? 'read' : 'none';
  out.block = out.found ? siteBlock(site, out.origin, urls, out.more)
    : { _: site + ' — keeps no sitemap where its robots.txt or the usual places would name one, so there is nothing here to walk yet. Its front page: ' + out.origin + '/' };
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'GET only' }); }
  const site = siteOf((req.query && req.query.site) || '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!site) return res.status(400).json({ error: 'a site is named by its address, such as example.com' });
  let out;
  try { out = await read(site); }
  catch { out = { site, origin: 'https://' + site, found: false, state: 'down', block: { _: site + ' — could not be read just now. Its front page: https://' + site + '/' } }; }
  if (out.refused) { res.setHeader('Vercel-CDN-Cache-Control', 'max-age=3600'); return res.status(400).json({ error: out.error, site }); }
  res.setHeader('Vercel-CDN-Cache-Control', out.found ? 'max-age=3600, stale-while-revalidate=86400' : out.state === 'down' ? 'max-age=60' : 'max-age=900, stale-while-revalidate=3600');
  return res.status(200).json(out);
}
