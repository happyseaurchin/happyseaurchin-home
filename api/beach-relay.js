/**
 * /api/beach-relay — GET-only CORS relay for beach surfaces the browser
 * can't reach directly.
 *
 * Why this exists: mindflow/filmstrip-3d renders whole beach surfaces.
 * The old-world beach (beach.happyseaurchin.com) serves
 * Access-Control-Allow-Origin: * and needs no relay; the biome commons
 * (biome-commons-production.up.railway.app) serves no CORS headers at all,
 * so a browser fetch from happyseaurchin.com is blocked. This fn fetches
 * server-side and re-serves same-origin.
 *
 * Strictly scoped — NOT an open proxy:
 *   - https only
 *   - path must be exactly /.well-known/pscale-beach or /.well-known/biome-beach
 *   - no localhost / IP-literal hosts, redirects refused
 *   - GET only, 8s timeout, body passed through as JSON
 *
 * Query params:
 *   url    required — beach surface URL (query string ignored)
 *   block  optional — forwarded as ?block=<name>
 */

const ALLOWED_PATHS = new Set([
  '/.well-known/pscale-beach',
  '/.well-known/biome-beach',
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. GET only.' });
  }

  const { url, block } = req.query || {};
  if (!url) return res.status(400).json({ error: 'url is required' });

  let target;
  try {
    target = new URL(String(url));
  } catch {
    return res.status(400).json({ error: 'url is not a valid URL' });
  }
  if (target.protocol !== 'https:') {
    return res.status(400).json({ error: 'https only' });
  }
  if (!ALLOWED_PATHS.has(target.pathname)) {
    return res.status(400).json({
      error: 'url path must be /.well-known/pscale-beach or /.well-known/biome-beach',
    });
  }
  const host = target.hostname;
  if (
    host === 'localhost' || host.endsWith('.local') || host.includes('[')
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  ) {
    return res.status(400).json({ error: 'host not allowed' });
  }

  target.search = '';
  if (block) target.searchParams.set('block', String(block));

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(target, {
      headers: { Accept: 'application/json' },
      signal: ctrl.signal,
      redirect: 'error',
    });
    clearTimeout(timer);
    const text = await r.text();
    res.status(r.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: `relay fetch failed: ${e.message || e}` });
  }
}
