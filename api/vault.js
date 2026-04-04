/**
 * Vault — BYOK key management + Claude proxy.
 *
 * Stores API keys as httpOnly cookies (invisible to JavaScript).
 * Routes by `service` field: set-keys, check-keys, clear-keys, claude.
 * Cookie prefix: hsu_ (happyseaurchin)
 */

const ALLOWED_ORIGINS = [
  'https://happyseaurchin.com',
  'https://www.happyseaurchin.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.some(a => origin.startsWith(a))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const cookies = {};
  for (const pair of raw.split(';')) {
    const eq = pair.indexOf('=');
    if (eq > 0) cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return cookies;
}

function cookieFlags(req) {
  const isSecure = !req.headers.host?.includes('localhost');
  return `HttpOnly; SameSite=Lax; Path=/api; Max-Age=31536000${isSecure ? '; Secure' : ''}`;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { service, ...body } = req.body || {};
  const flags = cookieFlags(req);

  // ── set-keys ──
  if (service === 'set-keys') {
    const stored = [];
    const cookies = [];
    for (const [name, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.length > 0) {
        cookies.push(`hsu_${name}=${value}; ${flags}`);
        stored.push(name);
      }
    }
    if (stored.length === 0) return res.status(400).json({ error: 'No keys provided' });
    res.setHeader('Set-Cookie', cookies);
    return res.status(200).json({ success: true, stored });
  }

  // ── check-keys ──
  if (service === 'check-keys') {
    const cookies = parseCookies(req);
    const available = Object.keys(cookies)
      .filter(k => k.startsWith('hsu_'))
      .map(k => k.slice(4));
    return res.status(200).json({ available });
  }

  // ── clear-keys ──
  if (service === 'clear-keys') {
    const cookies = parseCookies(req);
    const clearFlags = flags.replace(/Max-Age=\d+/, 'Max-Age=0');
    const clears = Object.keys(cookies)
      .filter(k => k.startsWith('hsu_'))
      .map(k => `${k}=; ${clearFlags}`);
    if (clears.length > 0) res.setHeader('Set-Cookie', clears);
    return res.status(200).json({ success: true, cleared: clears.length });
  }

  // ── claude proxy ──
  if (service === 'claude') {
    const cookies = parseCookies(req);
    const apiKey = process.env.VAULT_KEY_CLAUDE || cookies.hsu_claude;
    if (!apiKey) return res.status(401).json({ error: 'No API key. Save one via the vault first.' });

    const isStream = body.stream === true;
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });

      if (isStream && response.ok) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
        return res.end();
      } else {
        const data = await response.json();
        return res.status(response.status).json(data);
      }
    } catch (err) {
      return res.status(500).json({ error: 'Proxy error: ' + err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown service: ' + service });
}
