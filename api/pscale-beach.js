import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

// ── Pscale Beach v2 — see https://github.com/pscale-commons/bsp-mcp-server/blob/main/docs/protocol-pscale-beach-v2.md
// Endpoint serves a single pscale-shaped block. GET returns whole block (or
// ?spindle=<addr> slice). POST applies a bsp()-shaped write.

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const ORIGIN = 'happyseaurchin.com';
const KV_BLOCK_KEY = 'pscale-beach-v2:block';
const KV_HASH_KEY = 'pscale-beach-v2:locks';

function defaultBlock() {
  return {
    _: `Beach at ${ORIGIN} — public commons. Open by default. Marks may clear with the tide.`,
    '1': {
      _: 'Marks — random stigmergy traces. Each digit is one mark.'
    }
  };
}

// Lock salt MUST match bsp-mcp's canonical form so locks set under one MCP
// verify under any other:
//   sha256(secret + "block:" + ownerId + ":" + name + ":" + position)
//   ownerId = "https://happyseaurchin.com", name = "beach", position = "_"
function hashSecret(secret, position) {
  const salt = `${secret}block:https://${ORIGIN}:beach:${position}`;
  return createHash('sha256').update(salt).digest('hex');
}

async function loadBlock() {
  const stored = await redis.get(KV_BLOCK_KEY);
  return stored ?? defaultBlock();
}

async function saveBlock(block) {
  await redis.set(KV_BLOCK_KEY, block);
}

async function loadHashes() {
  return (await redis.get(KV_HASH_KEY)) ?? {};
}

async function saveHashes(hashes) {
  await redis.set(KV_HASH_KEY, hashes);
}

// Walk a pscale digit address. "0" maps to the underscore key. Empty address =
// whole block. Intermediate path objects are created if missing.
function writeAt(block, address, value) {
  if (!address) return value; // whole-block replace
  const digits = String(address).replace(/\./g, '');
  if (!digits) return value;
  let node = block;
  for (let i = 0; i < digits.length - 1; i++) {
    const key = digits[i] === '0' ? '_' : digits[i];
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key];
  }
  const lastDigit = digits[digits.length - 1];
  const lastKey = lastDigit === '0' ? '_' : lastDigit;
  node[lastKey] = value;
  return block;
}

function readAt(block, address) {
  if (!address) return block;
  const digits = String(address).replace(/\./g, '');
  let node = block;
  for (const d of digits) {
    if (!node || typeof node !== 'object') return null;
    const key = d === '0' ? '_' : d;
    node = node[key];
  }
  return node ?? null;
}

function spindleParam(q) {
  const s = q?.spindle;
  if (Array.isArray(s)) return s[0] ?? '';
  return s ?? '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const block = await loadBlock();
    const spindle = spindleParam(req.query);
    const payload = spindle ? readAt(block, spindle) : block;
    return res.status(200).json(payload);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    // pscale_attention and gray are accepted in the body shape per protocol
    // §2.2 but not yet acted upon — v1 supports point/whole-block writes and
    // a single whole-block lock at "_".
    const { spindle = '', content, secret, new_lock } = body;

    const block = await loadBlock();
    const hashes = await loadHashes();

    const lockedAt = '_';
    const stored = hashes[lockedAt];

    if (content !== undefined && stored) {
      if (!secret) {
        return res.status(403).json({ error: 'block is locked, secret required', code: 'lock_required' });
      }
      if (hashSecret(secret, lockedAt) !== stored) {
        return res.status(403).json({ error: 'secret does not match', code: 'lock_required' });
      }
    }

    if (new_lock !== undefined && stored) {
      if (!secret || hashSecret(secret, lockedAt) !== stored) {
        return res.status(403).json({ error: 'lock rotation requires current secret', code: 'lock_required' });
      }
    }

    if (content !== undefined) {
      const updated = writeAt(block, String(spindle), content);
      await saveBlock(updated);
    }

    if (new_lock !== undefined) {
      hashes[lockedAt] = hashSecret(new_lock, lockedAt);
      await saveHashes(hashes);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed', code: 'invalid_shape' });
}
