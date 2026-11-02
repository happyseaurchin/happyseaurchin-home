/**
 * /api/string — the String's one small GET-only function (function:string 5): what a shared link says
 * about itself, and what a share's own address says before anything on the page has run.
 *
 *   GET /api/string?url=<a link standing on the String>
 *       { url, site, title, text, author, when, image, x: { id, media } }, each only where the thing gives it
 *   GET /api/string?page=<address or handle>     (the rewrite from /string/<address>, /string/<handle>)
 *       the page itself, its title and preview saying this share or this person
 *
 * WhatsApp shows the title and picture a page gives without running it, so a share's link needs its preview
 * in the page as served (the-string 1.1115). And a browser cannot read another site's card, so the sites
 * that publish one are read here: oEmbed where the site offers it (X, YouTube, Vimeo, Spotify, SoundCloud),
 * else the Open Graph tags at the head of the page. It reads as itself, under its own name, and takes what
 * the site gives: X gives a server the post's words and author but no picture, so the page shows a post with
 * a picture in X's own embed, in the reader's browser.
 *
 * IT NEVER BECOMES A FETCHER FOR ANY ADDRESS (the-string 1.1113): it reads a link only while that link stands
 * on the String, signed by someone in their own mirror; each address on the way is looked up and refused if
 * it is not on the public internet; only a few clipped strings come back, never what was fetched. Nothing is
 * stored: the CDN keeps one copy of each card and page, so a crowd from a shared link costs one read.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lookup } from 'node:dns/promises';
import { mirrorsOf } from './mirrors.js';

const SITE = 'https://happyseaurchin.com';
const AGENT = 'happyseaurchin-string/1.0 (+https://happyseaurchin.com/string)';
const ADDRESS = /^\d{10}(\.\d{1,9})?$/, HANDLE = /^[A-Za-z0-9_][A-Za-z0-9_ -]{0,31}$/;
const MOST_READ = 400000;   // bytes of a page read at most, looking for the end of its head
export const dns = { lookup };   // a check swaps this; nothing else does

const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => String(s || '').replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] !== '#') return ENTITY[e.toLowerCase()] || m;
  const n = /^#x/i.test(e) ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
});
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
/* a picture is shown from where it stands, in the reader's browser: https only, since the page is */
function picture(v, base) {
  if (!v) return '';
  try {
    const u = new URL(v, base);
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.protocol === 'https:' && u.href.length <= 1000 ? u.href : '';
  } catch { return ''; }
}

/* ── the public internet only ── */
export function isPublicAddress(ip) {
  const v = String(ip).toLowerCase().replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) {
    const [a, b] = v.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)));
  }
  return !(v === '::' || v === '::1' || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || /^ff/.test(v));
}
async function mayRead(u) {
  if (!/^https?:$/.test(u.protocol) || (u.port && u.port !== '80' && u.port !== '443') || u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes('.') ||
    /\.(local|localhost|internal|intranet|lan|home|test|invalid|onion)$/.test(host)) return false;
  try {
    const all = await dns.lookup(host, { all: true });
    return all.length > 0 && all.every((a) => isPublicAddress(a.address));
  } catch { return false; }
}

/* ── what a site publishes ── */
async function oembed(endpoint) {
  const r = await fetch(endpoint, { headers: { 'User-Agent': AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
  return r.ok ? r.json() : null;
}
const PUBLISHED = [
  [/^(youtube\.com|music\.youtube\.com|youtu\.be)$/, 'https://www.youtube.com/oembed?format=json&url='],
  [/^vimeo\.com$/, 'https://vimeo.com/api/oembed.json?url='],
  [/^open\.spotify\.com$/, 'https://open.spotify.com/oembed?url='],
  [/^soundcloud\.com$/, 'https://soundcloud.com/oembed?format=json&url=']
];
/* X's card: the post's own words out of its blockquote; a pic.twitter.com link in them says a picture or film goes with it */
function xCard(o, id) {
  const html = String((o && o.html) || ''), p = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  const body = p ? p[1] : '';
  const words = decode(body.replace(/<br\s*\/?>/gi, '\n').replace(/<a\b[^>]*>\s*pic\.(?:twitter|x)\.com[^<]*<\/a>/gi, '').replace(/<[^>]+>/g, ''))
    .replace(/https?:\/\/t\.co\/\S+/g, '').trim();
  const when = /([A-Z][a-z]+ \d{1,2}, \d{4})<\/a>\s*<\/blockquote>/.exec(html);
  return {
    author: clip(o && o.author_name, 80), handle: clip(String((o && o.author_url) || '').split('/').pop(), 40),
    text: words.length > 600 ? words.slice(0, 599).trimEnd() + '…' : words,
    when: when ? when[1] : '', x: { id, media: /pic\.(?:twitter|x)\.com\//i.test(body) }
  };
}
/* the head of a page: its Open Graph tags, else its twitter: tags, else its title */
function headCard(head, base) {
  const meta = {};
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    const a = {};
    for (const m of tag.matchAll(/([a-z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) a[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : m[3];
    const k = String(a.property || a.name || '').toLowerCase();
    if (k && a.content && !(k in meta)) meta[k] = decode(a.content);
  }
  const t = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const by = meta.author || meta['article:author'] || '';
  const card = {
    title: clip(meta['og:title'] || meta['twitter:title'] || (t ? decode(t[1]) : ''), 200),
    text: clip(meta['og:description'] || meta['twitter:description'] || meta.description, 320),
    image: picture(meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || meta['twitter:image:src'] || '', base),
    author: /^https?:/i.test(by) ? '' : clip(by, 80)
  };
  if (meta['og:site_name']) card.site = clip(meta['og:site_name'], 60);
  return card;
}
/* a page, read as far as the end of its head, through at most three redirects, each address looked at first */
async function pageCard(url) {
  let u = new URL(url), r = null;
  for (let hop = 0; hop < 4; hop++) {
    if (!(await mayRead(u))) return null;
    r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': AGENT, Accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(5000) });
    const to = r.status >= 300 && r.status < 400 ? r.headers.get('location') : '';
    if (!to) break;
    try { if (r.body) await r.body.cancel(); } catch {}
    u = new URL(to, u); r = null;
  }
  if (!r || !r.ok) { try { if (r && r.body) await r.body.cancel(); } catch {} return null; }
  const type = String(r.headers.get('content-type') || '').toLowerCase();
  if (type.startsWith('image/')) { try { if (r.body) await r.body.cancel(); } catch {} return { image: picture(u.href) }; }
  if (!type.includes('html') || !r.body) { try { if (r.body) await r.body.cancel(); } catch {} return null; }
  const reader = r.body.getReader(), text = new TextDecoder();
  let head = '', read = 0;
  while (read < MOST_READ && !/<\/head>/i.test(head)) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.length; head += text.decode(value, { stream: true });
  }
  try { await reader.cancel(); } catch {}
  return headCard(head, u);
}
export async function cardOf(url) {
  const host = new URL(url).hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
  const card = { url, site: host };
  if (host === 'x.com' || host === 'twitter.com') {
    const m = /^\/([^/]+)\/status(?:es)?\/(\d+)/.exec(new URL(url).pathname);
    if (!m) return card;
    const o = await oembed('https://publish.x.com/oembed?omit_script=1&dnt=true&url=' + encodeURIComponent('https://x.com/' + m[1] + '/status/' + m[2])).catch(() => null);
    return o ? Object.assign(card, { site: 'x.com' }, xCard(o, m[2])) : card;
  }
  for (const [re, at] of PUBLISHED) {
    if (!re.test(host)) continue;
    const o = await oembed(at + encodeURIComponent(url)).catch(() => null);
    if (o) return Object.assign(card, { title: clip(o.title, 200), author: clip(o.author_name, 80), image: picture(o.thumbnail_url || '') });
  }
  const page = await pageCard(url).catch(() => null);
  return page ? Object.assign(card, page) : card;
}
const hasCard = (c) => !!(c.title || c.text || c.image);

/* ── a share, by its address ── */
function lineAt(mirror, address) {
  let n = mirror;
  for (const d of address.replace('.', '')) { if (!n || typeof n !== 'object') return ''; n = n[d === '0' ? '_' : d]; }
  while (n && typeof n === 'object') { if (!('_' in n)) return ''; n = n._; }
  return typeof n === 'string' ? n.trim() : '';
}
/* the line 'SHARE <url> — why' or 'SHARE <url> for <handle> — why' at an address, in whichever mirror holds it (function:string 1) */
export function shareAt(mirrors, address) {
  let withdrawn = false;
  for (const by of Object.keys(mirrors || {})) {
    const line = lineAt(mirrors[by], address);
    if (/^WITHDRAWN\b/.test(line)) withdrawn = true;
    const m = /^SHARE\s+(\S+)\s*([\s\S]*)$/i.exec(line);
    if (!m) continue;
    const url = m[1].replace(/^<(.*)>$/, '$1');
    if (!/^https?:\/\//i.test(url)) continue;
    const why = m[2].trim().replace(/^for\s+[A-Za-z0-9_][A-Za-z0-9_ -]{0,40}?\s*(?=[—–]|$)/i, '').replace(/^[—–-]+\s*/, '').trim();
    return { by, url, why };
  }
  return withdrawn ? { withdrawn: true } : null;
}
function standsOnTheString(mirrors, url) {
  const all = JSON.stringify(mirrors || {}), bare = (s) => JSON.stringify(s).slice(1, -1);
  return all.includes(bare('SHARE ' + url)) || all.includes(bare('SHARE <' + url + '>'));
}

/* ── the page, saying what it is before it runs ── */
const THE_STRING = {
  title: 'The String — what people are sharing',
  text: 'Links people bring from anywhere, each with a line of why it caught them, in their own words and their own name.',
  image: SITE + '/assets/string/card.png', url: SITE + '/string'
};
export function withPreview(html, p) {
  const q = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const set = (attr, key, value) => { html = html.replace(new RegExp('<meta ' + attr + '="' + key + '" content="[^"]*">'), () => '<meta ' + attr + '="' + key + '" content="' + q(value) + '">'); };
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + q(p.title) + '</title>');
  set('name', 'description', p.text);
  set('property', 'og:title', p.title);
  set('property', 'og:description', p.text);
  set('property', 'og:image', p.image);
  set('property', 'og:url', p.url);
  return html;
}
async function previewOf(slug) {
  if (HANDLE.test(slug) && !ADDRESS.test(slug)) {
    return { title: slug + '’s string', text: 'What ' + slug + ' is sharing on the String, each link with a line of why it caught them.', image: THE_STRING.image, url: SITE + '/string/' + slug };
  }
  if (!ADDRESS.test(slug)) return THE_STRING;
  const room = await mirrorsOf('string'), url = SITE + '/string/' + slug, s = shareAt(room.mirrors, slug);
  if (!s) return Object.assign({}, THE_STRING, { url });
  if (s.withdrawn) return Object.assign({}, THE_STRING, { title: 'A share withdrawn by its sharer', url });
  const c = await cardOf(s.url).catch(() => ({ site: new URL(s.url).hostname }));
  const what = c.x && c.author ? 'a post by ' + c.author : c.title || c.site.replace(/^www\./, '');
  return { title: s.by + ' shared ' + clip(what, 90), text: clip(s.why, 200) || clip(c.text, 200) || THE_STRING.text, image: c.image || THE_STRING.image, url };
}

/* ── the door ── */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'GET only' });
  const q = req.query || {};
  if (q.page != null) {
    const slug = String(q.page);
    let page = '', p = THE_STRING, cached = 'max-age=300, stale-while-revalidate=3600';
    try { page = readFileSync(join(process.cwd(), 'string.html'), 'utf8'); }
    catch (e) { return res.status(500).send('the page could not be read'); }
    try { p = await previewOf(slug); } catch (e) { cached = 'max-age=30'; }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Vercel-CDN-Cache-Control', cached);
    return res.status(200).send(withPreview(page, p));
  }
  const url = String(q.url || '');
  if (!/^https?:\/\/\S{3,1500}$/i.test(url)) return res.status(400).json({ error: 'give a url, or a page' });
  try {
    const room = await mirrorsOf('string');
    if (!standsOnTheString(room.mirrors, url)) {
      res.setHeader('Vercel-CDN-Cache-Control', 'max-age=15');
      return res.status(404).json({ error: 'that link is not on the String' });
    }
    const card = await cardOf(url);
    /* a card keeps for hours and is served while the next is read; a site that gave nothing is asked again soon */
    res.setHeader('Vercel-CDN-Cache-Control', hasCard(card) ? 'max-age=21600, stale-while-revalidate=604800' : 'max-age=600');
    return res.status(200).json(card);
  } catch (e) {
    return res.status(502).json({ error: 'the String could not be read: ' + String(e && e.message ? e.message : e).slice(0, 200) });
  }
}
