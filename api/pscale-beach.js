import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

// ── Pscale Beach v2 + sibling-block extension ──
// Spec: https://github.com/pscale-commons/bsp-mcp-server/blob/main/docs/protocol-pscale-beach-v2.md
// §3.5 (origin/beach/sibling-block distinction) and the companion handoff doc
// docs/happyseaurchin-sibling-blocks-implementation.md.
//
// One endpoint, polyglot dispatch:
//   GET  /.well-known/pscale-beach[?block=<name>][?spindle=<addr>]
//   POST /.well-known/pscale-beach[?block=<name>]
//        body: bsp-mcp standard {spindle, content, secret?, new_lock?, gray?}
//          OR for substrate-prefixed blocks, the substrate action shapes:
//            sed:   {action: "register", declaration, passphrase}
//            grain: {action: "reach",    side, agent_id, partner_agent_id,
//                                        description, my_side_content,
//                                        my_passphrase}
//
// Block-name prefix routes the substrate:
//   "beach" (default)        → ordinary block, whole-block lock at "_"
//   anything else (no prefix)→ ordinary block, whole-block lock at "_"
//   "sed:<collective>"       → site-hosted sed: substrate, per-position locks
//   "grain:<pair_id>"        → site-hosted grain: substrate, per-side locks
//
// Lock salt namespaces match bsp-mcp's src/locks.ts so locks set under one
// client verify under any other.

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN
});

const ORIGIN = 'happyseaurchin.com';
const DEFAULT_BLOCK_NAME = 'beach';

// KV key namespace per block. Old single-block keys (pre-sibling) are
// migrated lazily on first read of the default beach.
function blockKey(name) { return `pscale-beach-v2:block:${name}`; }
function locksKey(name) { return `pscale-beach-v2:locks:${name}`; }

const LEGACY_BLOCK_KEY = 'pscale-beach-v2:block';
const LEGACY_LOCKS_KEY = 'pscale-beach-v2:locks';

function defaultBeach() {
  return {
    _: `Beach at ${ORIGIN} — public commons. Open by default. Marks may clear with the tide.`,
    '1': { _: 'Marks — random stigmergy traces. Each digit is one mark.' }
  };
}

// ── Lock hashing — three salt namespaces matching bsp-mcp src/locks.ts ──

function hashOrdinary(secret, blockName, position) {
  // sha256(passphrase + 'block:' + agent_id + ':' + name + ':' + position)
  const salt = `${secret}block:https://${ORIGIN}:${blockName}:${position}`;
  return createHash('sha256').update(salt).digest('hex');
}

function hashSed(secret, collective, position) {
  // sha256(passphrase + collective + position)
  const salt = `${secret}${collective}${position}`;
  return createHash('sha256').update(salt).digest('hex');
}

function hashGrain(secret, pairId, side) {
  // sha256(passphrase + 'grain:' + pair_id + ':' + side)
  const salt = `${secret}grain:${pairId}:${side}`;
  return createHash('sha256').update(salt).digest('hex');
}

// Lock-key derivation by substrate. For sed:/grain: the spindle's first digit
// names the position; for ordinary blocks the whole-block lock lives at '_'.
function lockKeyForWrite(blockName, spindle) {
  if (blockName.startsWith('sed:') || blockName.startsWith('grain:')) {
    if (!spindle) return '_';
    const firstDigit = String(spindle).replace(/\*$/, '').split('.')[0];
    return firstDigit || '_';
  }
  return '_';
}

function hashByBlockName(blockName, position, secret) {
  if (blockName.startsWith('sed:')) {
    return hashSed(secret, blockName.slice(4), position);
  }
  if (blockName.startsWith('grain:')) {
    return hashGrain(secret, blockName.slice(6), position);
  }
  return hashOrdinary(secret, blockName, position);
}

// ── Storage helpers ──

async function loadBlock(name) {
  const stored = await redis.get(blockKey(name));
  if (stored != null) return stored;
  // Lazy migration: if the default beach is missing, check the legacy key
  // and migrate. Only the default beach gets a default-seed; sibling blocks
  // return null when missing so the caller can return 404.
  if (name === DEFAULT_BLOCK_NAME) {
    const legacy = await redis.get(LEGACY_BLOCK_KEY);
    if (legacy != null) {
      await redis.set(blockKey(name), legacy);
      return legacy;
    }
    return defaultBeach();
  }
  return null;
}

async function saveBlock(name, block) {
  await redis.set(blockKey(name), block);
}

async function loadHashes(name) {
  const stored = await redis.get(locksKey(name));
  if (stored != null) return stored;
  if (name === DEFAULT_BLOCK_NAME) {
    const legacy = await redis.get(LEGACY_LOCKS_KEY);
    if (legacy != null) {
      await redis.set(locksKey(name), legacy);
      return legacy;
    }
  }
  return {};
}

async function saveHashes(name, hashes) {
  await redis.set(locksKey(name), hashes);
}

// ── BSP walk helpers (whole-block replace and point-write at digit address) ──

function writeAt(block, address, value) {
  if (!address) return value;
  const digits = String(address).replace(/\./g, '').replace(/\*$/, '');
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

function blockParam(q) {
  const b = q?.block;
  if (Array.isArray(b)) return b[0] ?? DEFAULT_BLOCK_NAME;
  return b || DEFAULT_BLOCK_NAME;
}

// ── Sed: substrate — atomic position allocation ──
//
// Floor-2 minimum. Valid positions contain digits 1-9 only (no 0). Sequence:
// 11, 12, ..., 19, 21, ..., 99, 111, 112, ..., 999, 1111, ...
function nextValidPosition(positionHashes) {
  let n = 11;
  while (n < 1_000_000) {
    const s = String(n);
    if (!s.includes('0') && !positionHashes[s]) return s;
    n++;
  }
  throw new Error('No valid position found below 1,000,000.');
}

async function handleSedRegister(collective, body) {
  const { declaration, passphrase, shell_ref } = body || {};
  if (!declaration || !passphrase) {
    return { status: 400, body: { error: 'sed register requires {declaration, passphrase}', code: 'invalid_shape' } };
  }
  const blockName = `sed:${collective}`;
  let block = await loadBlock(blockName);
  if (!block) {
    block = { _: `sed: collective ${collective} hosted at ${ORIGIN}` };
  }
  const hashes = await loadHashes(blockName);
  let position;
  try {
    position = nextValidPosition(hashes);
  } catch (e) {
    return { status: 500, body: { error: String(e.message || e), code: 'no_position' } };
  }
  const positionContent = shell_ref ? { _: declaration, '1': shell_ref } : declaration;
  writeAt(block, position, positionContent);
  hashes[position] = hashSed(passphrase, collective, position);
  await saveBlock(blockName, block);
  await saveHashes(blockName, hashes);
  return {
    status: 200,
    body: {
      ok: true,
      position,
      address: `sed:${collective}:${position}`
    }
  };
}

// ── Grain: substrate — symmetric reach/accept ──
//
// pair_id is computed client-side and named in the URL (?block=grain:<pair_id>).
// The site enforces the two-phase state machine with per-side locks.
async function handleGrainReach(pairId, body) {
  const { side, agent_id, partner_agent_id, description, my_side_content, my_passphrase } = body || {};
  if (side !== '1' && side !== '2') {
    return { status: 400, body: { error: 'grain reach requires side="1" or side="2"', code: 'invalid_shape' } };
  }
  if (!agent_id || !my_side_content || !my_passphrase) {
    return { status: 400, body: { error: 'grain reach requires {side, agent_id, partner_agent_id, description, my_side_content, my_passphrase}', code: 'invalid_shape' } };
  }
  const partnerSide = side === '1' ? '2' : '1';
  const blockName = `grain:${pairId}`;
  const existing = await loadBlock(blockName);
  const hashes = await loadHashes(blockName);

  if (!existing) {
    // Establish: write reaching side + reach hint at position 8.
    const block = {
      _: description || '',
      [side]: { _: my_side_content },
      '8': {
        _reach_pending: {
          from: agent_id,
          pair_id: pairId,
          grain_address_yours: `grain:${pairId}:${partnerSide}`,
          grain_address_mine: `grain:${pairId}:${side}`,
          description: description || '',
          reached_at: new Date().toISOString()
        }
      },
      '9': { [side]: agent_id }
    };
    hashes[side] = hashGrain(my_passphrase, pairId, side);
    await saveBlock(blockName, block);
    await saveHashes(blockName, hashes);
    return { status: 200, body: { ok: true, state: 'established', awaiting: partnerSide, pair_id: pairId } };
  }

  // Block exists. Either: partner accept (other side empty) or rewrite of own side.
  if (existing[side] !== undefined) {
    // Own-side rewrite: requires the existing side's secret as my_passphrase.
    const stored = hashes[side];
    if (!stored || hashGrain(my_passphrase, pairId, side) !== stored) {
      return { status: 403, body: { error: `side ${side} is locked`, code: 'lock_required' } };
    }
    existing[side] = { _: my_side_content };
    await saveBlock(blockName, existing);
    return { status: 200, body: { ok: true, state: 'updated', pair_id: pairId } };
  }

  // Partner accept: write the other side, clear position 8, completion.
  existing[side] = { _: my_side_content };
  const existingAgents = (existing['9'] && typeof existing['9'] === 'object') ? existing['9'] : {};
  existing['9'] = { ...existingAgents, [side]: agent_id };
  delete existing['8'];
  hashes[side] = hashGrain(my_passphrase, pairId, side);
  await saveBlock(blockName, existing);
  await saveHashes(blockName, hashes);
  return { status: 200, body: { ok: true, state: 'completed', pair_id: pairId } };
}

// ── Standard bsp-mcp write shape (any block) ──

async function handleStandardWrite(blockName, body) {
  const { spindle = '', content, secret, new_lock } = body || {};
  // Sibling blocks that don't exist yet are created on first write — the
  // handler is permissive about block creation. The default beach already
  // has a seed; sibling blocks start from {} unless content is whole-block.
  const existing = await loadBlock(blockName);
  let block = existing;
  if (block == null) {
    // Allow creation: the body is either a whole-block payload (spindle empty)
    // or a sub-position write that scaffolds the block.
    block = (spindle === '' && content && typeof content === 'object' && !Array.isArray(content))
      ? null  // we'll replace the block entirely below
      : {};
  }
  const hashes = await loadHashes(blockName);
  const lockKey = lockKeyForWrite(blockName, spindle);
  const stored = hashes[lockKey];

  // Lock check for content writes.
  if (content !== undefined && stored) {
    if (!secret) {
      return { status: 403, body: { error: `position "${lockKey}" of "${blockName}" is locked, secret required`, code: 'lock_required' } };
    }
    if (hashByBlockName(blockName, lockKey, secret) !== stored) {
      return { status: 403, body: { error: 'secret does not match', code: 'lock_required' } };
    }
  }

  // Lock-rotation authority.
  if (new_lock !== undefined && stored) {
    if (!secret || hashByBlockName(blockName, lockKey, secret) !== stored) {
      return { status: 403, body: { error: 'lock rotation requires current secret', code: 'lock_required' } };
    }
  }

  if (content !== undefined) {
    if (!spindle) {
      // Whole-block replace.
      block = content;
    } else {
      if (block == null) block = {};
      writeAt(block, String(spindle), content);
    }
    await saveBlock(blockName, block);
  } else if (block == null) {
    // No content and no existing block — nothing to do unless we're locking.
    block = {};
  }

  if (new_lock !== undefined) {
    hashes[lockKey] = hashByBlockName(blockName, lockKey, new_lock);
    await saveHashes(blockName, hashes);
  }

  return { status: 200, body: { ok: true } };
}

// ── HTTP entry ──

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const blockName = blockParam(req.query);

  if (req.method === 'GET') {
    const block = await loadBlock(blockName);
    if (block == null) {
      return res.status(404).json({ error: `block "${blockName}" not found`, code: 'not_found' });
    }
    const spindle = spindleParam(req.query);
    const payload = spindle ? readAt(block, spindle) : block;
    return res.status(200).json(payload);
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    // Substrate-action dispatch (sed:/grain: state machines).
    let result;
    if (blockName.startsWith('sed:') && body.action === 'register') {
      result = await handleSedRegister(blockName.slice(4), body);
    } else if (blockName.startsWith('grain:') && body.action === 'reach') {
      result = await handleGrainReach(blockName.slice(6), body);
    } else {
      // Standard bsp-mcp shape: {spindle, content, secret?, new_lock?, gray?}
      // Works for any block name including substrate-prefixed ones (per-
      // position lock derivation handled by lockKeyForWrite/hashByBlockName).
      result = await handleStandardWrite(blockName, body);
    }
    return res.status(result.status).json(result.body);
  }

  return res.status(405).json({ error: 'Method not allowed', code: 'invalid_shape' });
}
