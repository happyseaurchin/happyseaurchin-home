/**
 * /api/sitemap — a website as one pscale block of links to its pages (19 Nov 2026, lane eye.17; made simple the same day at
 * David's word: "A simple process that checks a url and then if there's a site-map schematic, translate it into pscale
 * block; or just do a quick spider and map top level -- we just want one pscale block with links to discrete pages. Not
 * content. The content can be displayed as a page, like a full page option -- effectively it becomes a browser").
 *
 *   GET /api/sitemap?site=<a site's name, or an address on it>
 *       the site's top: { site, origin, found, state, kind, frame, frameWhy, from, pages, maps, seen, elsewhere, more, read, block }
 *   GET /api/sitemap?site=<the site>&map=<the address of one of its maps>
 *       that one map, as the places beneath its place: { site, map, found, state, kind, pages, maps, seen, elsewhere, more, read, block }
 *
 * ONE FILE A READ. The top reads the site's robots.txt and then one map: the one its robots.txt names, else /sitemap.xml,
 * else /sitemap_index.xml. A map of pages gives the pages (kind 'pages'). A map that is an index gives its maps (kind
 * 'maps'), each a place read only when the reader goes into it (?map=, one map a read, never a chain of them); a robots.txt
 * that names several maps gives those, none of them read at the top. A site that keeps no map is read the quick way
 * (kind 'links'): the links on its front page that stay on the site, the site itself or its www twin.
 *
 * WHETHER IT MAY BE SHOWN INSIDE ANOTHER PAGE (frame): the front page's own headers say so, read once a site, at the top,
 * from the one request for the front page (its body read only for its links, and let go where a map was found):
 * X-Frame-Options DENY or SAMEORIGIN, or a Content-Security-Policy whose frame-ancestors leave out happyseaurchin.com, is
 * no (frame false), read as a browser reads them (HTML's X-Frame-Options steps; where an enforced policy gives
 * frame-ancestors, that alone governs). frame is null where the front page could not be read. The eye then opens the
 * site's pages full size inside itself, in a frame with no reach into this site, or says the site won't be shown inside
 * another page and opens it beside.
 *
 * THE BLOCK (strata 1: one block, the nesting is the data): the places, the segments of each page's path its rungs, in the
 * order the map or the front page first names them. A page says '<its name> — <its address>', so the eye finds its link in
 * its words; a folder that is no page says how many pages stand beneath it; a run of folders with only one way down reads
 * as one rung ('En / us'). A map not yet read says '<its name> — sitemap: <its address>'; read, its place holds its own
 * places, its words still ending 'sitemap: <its address>'. Where a rung holds more than nine, they are nested nine to a
 * node, as an accumulator nests its entries (block-conventions 3.5), each node saying which it holds ('first … last — 10
 * to 18 of 37'), so every place stays a walk of digits. The top says whose site it is, what was read and when, and its
 * front page. Links only, never content: nothing a map or a page says beyond its addresses comes back.
 *
 * IT IS NEVER A FETCHER FOR ANY ADDRESS (string.js's rule, and its guard): the site must be a name on the public internet,
 * and every address on the way is looked up and refused if it is not (string.js mayRead), over https only (an http:// map
 * is asked for as https://, and no redirect is followed down to http), each through at most three redirects, each looked
 * at first. A map asked for by ?map= must stand on the site's own name (the site, its www twin, or a name beneath it) and
 * have a map's address (.xml, .xml.gz or .txt, or the word sitemap in it). A read is robots.txt and one file, one request
 * at a time, never two at once at one site: at most ROBOTS bytes, then one map of at most MAP bytes once opened (let go
 * once it has named PLACES and one more, and at once where it is a web page, not a map) or the front page's FRONT bytes,
 * all within BUDGET. Nothing is stored: the CDN keeps a block an hour and serves it for a day while the next is read, so a
 * crowd at one site costs one read.
 */

import { mayRead } from './string.js';

const AGENT = 'happyseaurchin-eye/1.0 (+https://happyseaurchin.com/eye)';
const US = 'https://happyseaurchin.com';   // the page the eye frames a site in, which frame-ancestors are read against
const ROBOTS = 200000;       // bytes of robots.txt read at most
const MAP = 1500000;         // bytes of the one map read at most, once opened where it came gzipped
const FRONT = 1000000;       // bytes of the front page read at most, for its links, where the site keeps no map
const PLACES = 500;          // places kept in a block at most: a few hundred pages, or maps
const BUDGET = 8000;         // ms for the whole read: what is read by then is what is kept
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
/* a map asked for by its address: on the site's own name, over https (an http:// one asked for as https://), with an
   address a map has; '' where it is not one */
export function mapAsked(v, site) {
  const s = String(v || '').trim();
  if (!s || s.length > 2000 || /\s/.test(s)) return '';
  let u; try { u = new URL(s); } catch { return ''; }
  if (u.protocol === 'http:') u.protocol = 'https:';
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || !ownName(u.hostname, site)) return '';
  if (!/sitemap/i.test(u.pathname + u.search) && !/\.(xml|txt)(\.gz)?$|\.gz$/i.test(u.pathname)) return '';
  u.hash = '';
  return u.href;
}

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
    letGo(r);
    try { u = new URL(to, u); } catch { return { why: 'a redirect to nowhere' }; }
  }
  return { why: 'too many redirects' };
}
function letGo(r) { try { if (r && r.body) r.body.cancel().catch(() => {}); } catch { /* already let go */ } }
const unanswered = (why) => /did not answer|out of time/.test(why || '');
const WEB_PAGE = /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype\s+html|html|head|body)\b/i;
/* a body read as text up to cap bytes, opened first where it came gzipped (its first two bytes say so); let go as soon as
   enough(text) says it has said enough, and, where notPage, at once if it is a web page */
async function textOf(r, cap, enough, notPage) {
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
  let text = '', n = 0, looked = !notPage;
  try {
    while (n < cap) {
      const { done, value } = await rd.read(); if (done) break;
      n += value.length; text += dec.decode(value, { stream: true });
      if (!looked && text.length >= 512) { looked = true; if (WEB_PAGE.test(text)) { text = ''; break; } }
      if (enough && enough(text)) break;
    }
  } catch { /* what was read is what is kept */ }
  try { await rd.cancel(); } catch {}
  return !looked && WEB_PAGE.test(text) ? '' : text;
}
/* true once re has matched n times in the text so far, each part looked at once (re carries the g flag) */
function upTo(re, n) {
  let count = 0, from = 0;
  return (text) => {
    re.lastIndex = from; let m;
    while ((m = re.exec(text))) { if (!m[0].length) re.lastIndex++; count++; from = re.lastIndex; if (count >= n) return true; }
    from = Math.max(from, text.length - 16);
    return false;
  };
}
/* a map has said enough once it has named PLACES and one more: its </loc>s, or, a map of plain lines, its lines */
function mapEnough() {
  const locs = upTo(/<\/loc\s*>/gi, PLACES + 1), lines = upTo(/^[ \t]*https?:\/\/\S+[ \t]*\r?$/gim, PLACES + 1);
  return (t) => (/<(?:urlset|sitemapindex|loc)\b/i.test(t.slice(0, 8192)) ? locs(t) : lines(t));
}
const XML = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unxml = (s) => String(s).replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => {
  if (e[0] !== '#') return XML[e.toLowerCase()];
  const c = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : m;
});
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
/* the links a page gives, in order: each <a href> resolved against the page (or its <base>), http(s) only, its fragment
   dropped; never its words */
export function linksOf(html, page) {
  const t = String(html || ''), out = [];
  const attr = (m) => unxml(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3] || '').trim();
  let base = page;
  const bm = /<base\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/i.exec(t);
  if (bm) { try { const b = new URL(attr(bm), page); if (/^https?:$/.test(b.protocol)) base = b.href; } catch { /* the page's own */ } }
  const re = /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+))/gi;
  let m;
  while ((m = re.exec(t))) {
    const h = attr(m);
    if (!h || h[0] === '#') continue;
    let u; try { u = new URL(h, base); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || u.username || u.password) continue;
    u.hash = ''; out.push(u.href);
  }
  return out;
}

/* ── may it be shown inside another page: the front page's headers, read as a browser reads them ── */
const DEFAULT_PORT = { 'http:': '80', 'https:': '443' };
/* one source of a frame-ancestors list against the page that would frame it (us), the framed page being self (CSP3 6.7.2) */
function sourceAllows(src, us, self) {
  const low = String(src || '').trim().toLowerCase();
  if (low === "'self'") return self.hostname === us.hostname && (us.protocol === 'https:' || self.protocol === us.protocol);
  if (low === '*') return /^https?:$/.test(us.protocol);
  if (/^[a-z][a-z0-9+.-]*:$/.test(low)) return low === us.protocol || (low === 'http:' && us.protocol === 'https:');
  if (low[0] === "'") return false;                                    // a nonce, a hash or another keyword
  const m = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*|\*\.[^/:]+|[^/:*]+)(?::(\d+|\*))?(?:\/.*)?$/.exec(low);
  if (!m) return false;
  const [, scheme, host, port] = m, want = scheme ? scheme + ':' : self.protocol;
  if (!(us.protocol === want || (want === 'http:' && us.protocol === 'https:'))) return false;
  const h = us.hostname.toLowerCase();
  if (host !== '*' && (host.startsWith('*.') ? !h.endsWith(host.slice(1)) : h !== host)) return false;
  return !port || port === '*' || port === (us.port || DEFAULT_PORT[us.protocol]);
}
export function frameOf(headers, page, us) {
  const hd = (k) => String((headers && typeof headers.get === 'function' ? headers.get(k) : headers && headers[k]) || '');
  let self, me;
  try { self = new URL(page); } catch { self = new URL('https://invalid.invalid/'); }
  try { me = new URL(us || US); } catch { me = new URL(US); }
  // an enforced Content-Security-Policy that gives frame-ancestors governs alone, and the X-Frame-Options are then not read;
  // each policy given must let it (several headers arrive joined by commas)
  const lists = [];
  for (const policy of hd('content-security-policy').split(',')) {
    for (const dir of policy.split(';')) {
      const t = dir.trim().split(/\s+/).filter(Boolean);
      if (t.length && t[0].toLowerCase() === 'frame-ancestors') { lists.push(t.slice(1)); break; }
    }
  }
  if (lists.length) {
    const no = lists.find((l) => { const srcs = l.filter((x) => x.toLowerCase() !== "'none'"); return !srcs.some((x) => sourceAllows(x, me, self)); });
    return no ? { frame: false, why: clip('its Content-Security-Policy says frame-ancestors ' + (no.join(' ') || "'none'"), 160) }
      : { frame: true, why: 'its frame-ancestors let ' + me.hostname + ' show it' };
  }
  // HTML's X-Frame-Options steps: DENY, SAMEORIGIN (from another origin), or more than one value with either of them or
  // ALLOWALL among them, is no; anything else is let be
  const xfo = Array.from(new Set(hd('x-frame-options').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean)));
  const said = 'its X-Frame-Options say ' + xfo.map((v) => v.toUpperCase()).join(', ');
  if (xfo.length > 1 && xfo.some((v) => v === 'deny' || v === 'sameorigin' || v === 'allowall')) return { frame: false, why: said };
  if (xfo.length === 1 && (xfo[0] === 'deny' || (xfo[0] === 'sameorigin' && self.origin !== me.origin))) return { frame: false, why: said };
  return { frame: true, why: xfo.length ? said + ', which does not stop it' : 'nothing in its headers stops it' };
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
/* a map's own words, from its address: the words in it other than sitemap, index and https ('/food/sitemap.xml' Food,
   '/sitemaps/https-index-uk-archive.xml' Uk archive), a number kept with the name it came with ('sitemap-0' Sitemap 0) */
export function mapNameOf(href) {
  let u; try { u = new URL(href); } catch { return 'A sitemap'; }
  const segs = u.pathname.split('/').filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
  const strip = (s) => String(s || '').replace(/(^|[-_.\s])(sitemaps?|sitemap[-_]?index|index|https?)(?=$|[-_.\s])/gi, '$1')
    .replace(/[-_.\s]{2,}/g, '-').replace(/^[-_.\s]+|[-_.\s]+$/g, '');
  const last = (segs.pop() || '').replace(/\.(xml|txt)(\.gz)?$|\.gz$|\.(php|aspx?|jsp|cfm)$/i, '');
  let name = strip(last);
  for (let i = segs.length - 1; i >= 0 && !name; i--) name = strip(segs[i]);
  if (/^\d+$/.test(name) || (!name && u.search)) name = last;
  if (u.search) name = (name ? name + ' ' : '') + u.search;
  return name ? nameOf(name) : 'Its sitemap';
}
const node = (seg) => ({ seg, name: seg ? nameOf(seg) : '', url: '', kids: new Map(), count: 0 });
/* the site's pages as a tree of their paths, in the order they were named; a query is a rung of its own */
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
const mapsSaid = (n) => n + (n === 1 ? ' map' : ' maps');
function blockOf(n) {
  const text = n.text || (n.url ? n.name + ' — ' + n.url : n.name + ' — ' + pages(n.count) + ' beneath');
  const kids = n.kids ? Array.from(n.kids.values()) : [];
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
/* the places beneath a top or a map's place: its maps in their order, each '<its name> — sitemap: <its address>', read when
   gone into; or its pages, as the tree of their paths */
const placesOf = (got) => nineOf(got.kind === 'maps' ? got.maps.map((href) => ({ name: mapNameOf(href), text: mapNameOf(href) + ' — sitemap: ' + href }))
  : Array.from(treeOf(got.urls).kids.values()));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const day = (d) => d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
export function siteBlock(site, origin, urls, more, now, how) {
  const said = site + ' — ' + (how || 'its pages as its own sitemap lists them') + ': ' + pages(urls.length) + (more ? ', the first of more' : '') + ', read ' + day(now || new Date()) + '. Its front page: ' + origin + '/';
  return Object.assign({ _: said }, placesOf({ kind: 'pages', urls }));
}

/* ── one map: its pages on the site, or, an index, its maps on the site's own name ── */
async function readMap(href, site, home, until) {
  const got = await get(href, 'application/xml,text/xml,text/plain,*/*;q=0.5', until);
  if (!got.r) return { refused: !!got.refused, down: unanswered(got.why), missing: !got.refused && !unanswered(got.why), why: got.why };
  if (!got.r.ok) { letGo(got.r); return { missing: true, why: href + ' answered ' + got.r.status }; }
  const map = mapOf(await textOf(got.r, MAP, mapEnough(), true));
  if (!map.locs.length) return { missing: true, why: href + ' names no addresses' };
  const out = { seen: 0, elsewhere: 0, more: map.locs.length > PLACES, kind: map.index ? 'maps' : 'pages', maps: [], urls: [] };
  const kept = new Set();
  for (const loc of map.locs) {
    out.seen++;
    let u; try { u = new URL(loc); } catch { continue; }
    if (map.index) {                                      // a map of maps, read over https on the site's own name
      if (u.protocol === 'http:') u.protocol = 'https:';
      if (u.protocol !== 'https:' || !(ownName(u.hostname, home) || ownName(u.hostname, site))) { out.elsewhere++; continue; }
      u.hash = '';
      if (kept.has(u.href)) continue;
      if (out.maps.length >= PLACES) { out.more = true; break; }
      kept.add(u.href); out.maps.push(u.href);
    } else {                                              // its pages, on the site itself or its www twin
      if (!/^https?:$/.test(u.protocol) || !(bare(u.hostname) === bare(home) || bare(u.hostname) === bare(site))) { out.elsewhere++; continue; }
      const key = (u.pathname.replace(/\/+$/, '') || '/') + u.search;
      if (kept.has(key)) continue;
      if (out.urls.length >= PLACES) { out.more = true; break; }
      kept.add(key); out.urls.push(u.origin + u.pathname + u.search);
    }
  }
  return out;
}
/* the front page's links on the site: the quick way, where the site keeps no map */
async function frontLinks(f, site, home) {
  const fhome = f.u.hostname, kept = new Set(), urls = [];
  let seen = 0, elsewhere = 0, more = false;
  for (const href of linksOf(await textOf(f.r, FRONT), f.u.href)) {
    seen++;
    const u = new URL(href), b = bare(u.hostname);
    if (!(b === bare(fhome) || b === bare(home) || b === bare(site))) { elsewhere++; continue; }
    const key = (u.pathname.replace(/\/+$/, '') || '/') + u.search;
    if (key === '/' || kept.has(key)) continue;           // the front page is the block's own top
    if (urls.length >= PLACES) { more = true; continue; }
    kept.add(key); urls.push(u.origin + u.pathname + u.search);
  }
  return { kind: 'links', urls, maps: [], seen, elsewhere, more };
}

/* ── the top: robots.txt and one map, else the front page's links; the front page's headers say whether it may be framed ── */
export async function read(site) {
  const now = new Date(), until = Date.now() + BUDGET;
  const out = { site, origin: 'https://' + site, found: false, state: 'none', kind: 'none', frame: null, frameWhy: '', from: '', pages: 0, maps: 0, seen: 0, elsewhere: 0, more: false, read: now.toISOString() };
  // one request at a time, never two at once at one site (some sites stall a second): robots.txt, one map, the front page
  const first = await get('https://' + site + '/robots.txt', 'text/plain,*/*;q=0.5', until);
  if (first.refused) return Object.assign(out, { refused: true, state: 'refused', error: first.why });
  let named = [];
  if (first.r) {
    out.origin = first.u.origin;
    if (first.r.ok) named = mapsNamedIn(await textOf(first.r, ROBOTS)); else letGo(first.r);
  } else if (unanswered(first.why)) {
    return Object.assign(out, { state: 'down', block: { _: site + ' — did not answer just now, so nothing there could be read. Its front page: https://' + site + '/' } });
  }
  const home = new URL(out.origin).hostname, maps = [];
  // a map is read over https, an http:// one named in robots.txt asked for as https:// (most sites name them so and serve both)
  for (const href of named) {
    let u; try { u = new URL(href, out.origin); } catch { continue; }
    if (u.protocol === 'http:') u.protocol = 'https:';
    if (u.protocol !== 'https:' || !(ownName(u.hostname, home) || ownName(u.hostname, site))) continue;
    u.hash = ''; if (!maps.includes(u.href)) maps.push(u.href);
  }
  let got = null;
  if (maps.length > 1) {                                  // its robots.txt names several maps: those are the places, none read
    got = { kind: 'maps', maps: maps.slice(0, PLACES), urls: [], seen: named.length, elsewhere: named.length - maps.length, more: maps.length > PLACES };
    out.from = out.origin + '/robots.txt';
  } else {
    for (const href of maps.length ? maps : WELL_KNOWN.map((p) => out.origin + p)) {
      const one = await readMap(href, site, home, until);
      if (!one.missing) { if (!one.refused && !one.down) { got = one; out.from = href; } break; }
    }
  }
  // the front page: its headers say whether the site may be framed; where it keeps no map, its links are the block. Its
  // body is read only then, and let go at once otherwise
  const f = await get('https://' + site + '/', 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', until);
  if (f.r) {
    const fr = f.r.ok ? frameOf(f.r.headers, f.u.href) : { frame: null, why: 'its front page answered ' + f.r.status };
    out.frame = fr.frame; out.frameWhy = fr.why;
    if (!got && f.r.ok) { const links = await frontLinks(f, site, home); if (links.urls.length) { got = links; out.from = f.u.href; } }
    else letGo(f.r);
  } else out.frameWhy = 'its front page could not be read: ' + (f.why || 'no answer');
  if (!got) {
    out.block = { _: site + ' — keeps no sitemap where its robots.txt or the usual places would name one, and its front page gave no links on the site to walk. Its front page: ' + out.origin + '/' };
    return out;
  }
  Object.assign(out, { found: true, state: 'read', kind: got.kind, seen: got.seen, elsewhere: got.elsewhere, more: got.more, pages: got.urls.length, maps: got.maps.length });
  const how = got.kind === 'maps' ? (maps.length > 1 ? 'its robots.txt names ' : 'its sitemap is an index of ') + mapsSaid(got.maps.length) + (got.more ? ', the first of more' : '') + ', each read when you go into it'
    : (got.kind === 'links' ? 'the links on its front page, as it keeps no sitemap: ' : 'its pages as its own sitemap lists them: ') + pages(got.urls.length) + (got.more ? ', the first of more' : '');
  out.block = Object.assign({ _: site + ' — ' + how + ', read ' + day(now) + '. Its front page: ' + out.origin + '/' }, placesOf(got));
  return out;
}

/* ── one of its maps, gone into: the places beneath that map's place, its words ending 'sitemap: <its address>' ── */
export async function section(site, href) {
  const now = new Date(), until = Date.now() + BUDGET, name = mapNameOf(href), tail = ', read ' + day(now) + ', from its sitemap: ' + href;
  const out = { site, map: href, found: false, state: 'none', kind: 'none', pages: 0, maps: 0, seen: 0, elsewhere: 0, more: false, read: now.toISOString() };
  const got = await readMap(href, site, new URL(href).hostname, until);
  if (got.refused) return Object.assign(out, { refused: true, state: 'refused', error: got.why });
  if (got.down) return Object.assign(out, { state: 'down', error: got.why, block: name + ' — did not answer just now' + tail });
  if (got.missing) return Object.assign(out, { error: got.why, block: name + ' — names nothing that could be read' + tail });
  Object.assign(out, { kind: got.kind, seen: got.seen, elsewhere: got.elsewhere, more: got.more, pages: got.urls.length, maps: got.maps.length });
  const n = got.kind === 'maps' ? got.maps.length : got.urls.length;
  if (!n) return Object.assign(out, { block: name + ' — lists nothing on ' + site + tail });
  out.found = true; out.state = 'read';
  const said = got.kind === 'maps' ? 'an index of ' + mapsSaid(n) + (got.more ? ', the first of more' : '') + ', each read when you go into it' : pages(n) + (got.more ? ', the first of more' : '');
  out.block = Object.assign({ _: name + ' — ' + said + tail }, placesOf(got));
  return out;
}

const one = (v) => (Array.isArray(v) ? v[0] : v);
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return res.status(405).json({ error: 'GET only' }); }
  const q = req.query || {}, site = siteOf(one(q.site) || '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!site) return res.status(400).json({ error: 'a site is named by its address, such as example.com' });
  let map = '';
  if (one(q.map) !== undefined) {
    map = mapAsked(one(q.map), site);
    if (!map) return res.status(400).json({ error: 'that is not one of ' + site + "'s maps", site });
  }
  let out;
  try { out = map ? await section(site, map) : await read(site); }
  catch {
    out = map ? { site, map, found: false, state: 'down', block: mapNameOf(map) + ' — could not be read just now, from its sitemap: ' + map }
      : { site, origin: 'https://' + site, found: false, state: 'down', frame: null, block: { _: site + ' — could not be read just now. Its front page: https://' + site + '/' } };
  }
  if (out.refused) { res.setHeader('Vercel-CDN-Cache-Control', 'max-age=3600'); return res.status(400).json({ error: out.error, site }); }
  res.setHeader('Vercel-CDN-Cache-Control', out.found ? 'max-age=3600, stale-while-revalidate=86400' : out.state === 'down' ? 'max-age=60' : 'max-age=900, stale-while-revalidate=3600');
  return res.status(200).json(out);
}
