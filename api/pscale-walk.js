/**
 * /api/pscale-walk — GET-only proxy to the pscale_blocks Supabase table.
 *
 * Why this exists: the mindflow/filmstrip-3d viewer wants to render live
 * pscale blocks (e.g. `?shelf=thornkeep`). MCP's pscale_walk truncates
 * display at ~150 chars, so snapshots run via MCP lose `_` body text.
 * PostgREST over Supabase returns the full row.
 *
 * Security posture (per other-session audit 2026-04-21):
 *   - pscale_blocks RLS: PERMISSIVE public ALL/true — anyone with the
 *     anon/publishable key can SELECT/INSERT/UPDATE/DELETE.
 *   - Read risk via anon key: none. The key is already in the client
 *     landscape (CLAUDE.md, deployed agents).
 *   - Write risk: the SAME anon key grants writes. This fn is GET-only
 *     (405 on any other method) and keeps the key in server env vars.
 *     Never ship the key to the browser.
 *
 * Env vars (Vercel): SUPABASE_URL, SUPABASE_ANON_KEY
 *
 * Query params:
 *   owner         required — owner_id (e.g. "thornkeep-gm")
 *   name          optional — single block name. Omit to list all blocks
 *                 for the owner (returns a shelf-shaped object).
 *   shelf         optional — comma-separated block names; returns shelf.
 */

const ALLOWED_OWNERS = null;  // set to an array to restrict; null = allow any

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. GET only.' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !KEY) {
    return res.status(500).json({
      error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY env var',
    });
  }

  const { owner, name, shelf } = req.query || {};
  if (!owner) return res.status(400).json({ error: 'owner is required' });
  if (ALLOWED_OWNERS && !ALLOWED_OWNERS.includes(owner)) {
    return res.status(403).json({ error: `owner "${owner}" not allowed` });
  }

  try {
    const names = shelf
      ? String(shelf).split(',').map(s => s.trim()).filter(Boolean)
      : (name ? [String(name)] : null);

    const filterName = names && names.length
      ? `&name=in.(${encodeURIComponent(names.join(','))})`
      : '';

    const url = `${SUPABASE_URL}/rest/v1/pscale_blocks`
      + `?owner_id=eq.${encodeURIComponent(owner)}`
      + `${filterName}`
      + `&select=*`;

    const r = await fetch(url, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
      },
    });
    if (!r.ok) {
      return res.status(r.status).json({ error: `PostgREST ${r.status}`, url });
    }
    const rows = await r.json();
    if (!Array.isArray(rows)) {
      return res.status(502).json({ error: 'Unexpected response', rows });
    }

    // Schema-agnostic: pick the JSONB column — the first row value that's
    // a plain object (not null, not string/number/array/date-ish).
    function pickBlockJson(row) {
      const skipKeys = new Set(['owner_id', 'name', 'created_at', 'updated_at', 'id', 'version']);
      for (const [k, v] of Object.entries(row)) {
        if (skipKeys.has(k)) continue;
        if (v && typeof v === 'object' && !Array.isArray(v)) return v;
      }
      // Fall back: maybe stored as a stringified JSON.
      for (const [k, v] of Object.entries(row)) {
        if (skipKeys.has(k)) continue;
        if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
          try { return JSON.parse(v); } catch {}
        }
      }
      return null;
    }

    // Shelf form (multiple blocks) or single block form.
    if (names === null || names.length > 1 || shelf) {
      const out = {};
      for (const row of rows) {
        const b = pickBlockJson(row);
        if (b && row.name) out[row.name] = b;
      }
      return res.status(200).json(out);
    }

    // Single block.
    const row = rows.find(r => r.name === names[0]) || rows[0];
    if (!row) return res.status(404).json({ error: 'not found' });
    const block = pickBlockJson(row);
    if (!block) return res.status(502).json({ error: 'No JSONB column found in row', row });
    return res.status(200).json(block);
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
