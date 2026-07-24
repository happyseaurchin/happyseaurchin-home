#!/usr/bin/env node
// render-bubble.mjs — observe a beach scene, compose a prompt, generate ONE still,
// and post it to the beach gallery so the /gallery o-page shows it.
//
// Deliberately dependency-free: the beach is plain CORS HTTP, so this needs NO
// bsp-mcp, NO MCP client, and NO xstream. The ONLY external dependency is an
// image API — your key, your spend — isolated in generateImage() below so you
// can swap OpenAI for Replicate / fal / Google / Stability in ~10 lines.
//
//   Node 18+ (uses global fetch).
//
//   OPENAI_API_KEY=sk-... node scripts/render-bubble.mjs               # renders bubble:gal-1
//   OPENAI_API_KEY=sk-... node scripts/render-bubble.mjs bubble:gal-1  # explicit scene
//
// Env:  BEACH (default https://beach.happyseaurchin.com), STYLE (default style:gal),
//       GALLERY (default gallery:gal), AGENT (default "observer").

const BEACH   = process.env.BEACH   || 'https://beach.happyseaurchin.com';
const SCENE   = process.argv[2]     || process.env.SCENE   || 'bubble:gal-1';
const STYLE   = process.env.STYLE   || 'style:gal';
const GALLERY = process.env.GALLERY || 'gallery:gal';
const AGENT   = process.env.AGENT   || 'observer';

const wk = (block) => `${BEACH.replace(/\/+$/, '')}/.well-known/pscale-beach?block=${encodeURIComponent(block)}`;

async function readBlock(block) {
  const r = await fetch(wk(block), { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`read ${block}: HTTP ${r.status}`);
  return r.json();
}

// ── observe: read the addressed slice — the scene surface + the world's look ──
// A bubble mirrors encounter:gal branch 6; field 3 is FACES (Faze one — what a
// stranger sees). We render the surface only, never SEED/TENSION (Faze two).
function facesOf(scene) {
  const f = scene && scene['3'];
  if (typeof f !== 'string') throw new Error(`${SCENE} has no FACES (field 3)`);
  return f.replace(/^FACES\b[^:]*:\s*/i, '').trim();
}
function lookOf(style) {
  const u = style && typeof style._ === 'string' ? style._ : '';
  return u || 'dark-ages plain, weather-worn; the uncanny stated flat and cold.';
}

// ── compose: FACES + the world's look + the render recipe (Faze one only) ──
function composePrompt(faces, look) {
  return [
    faces,
    `Register: ${look}`,
    'Muted earthen palette — peat-black, bog-brown, moss and fen green, wet grey stone; low overcast or twilight light, no bright colour.',
    'Naturalistic painterly realism, documentary framing, one quiet unsettling detail.',
    'No text or lettering, no modern objects, nothing overtly fantastical.',
  ].join(' ');
}

// ── generate: THE ONE EXTERNAL CALL. Swap this whole function for any provider. ──
// Returns an <img src> value: a data-URI (durable) or a hosted URL (may expire).
async function generateImage(prompt) {
  const key = process.env.OPENAI_API_KEY || process.env.IMAGE_API_KEY;
  if (!key) throw new Error('set OPENAI_API_KEY (or edit generateImage for another provider)');
  // NB: model names/params change — confirm the current one at your provider's docs.
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', n: 1 }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`image API HTTP ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  const item = d.data && d.data[0];
  if (item && item.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item && item.url) return item.url; // some models/params return a (possibly expiring) URL
  throw new Error('image API returned neither b64_json nor url');
}

// ── write: append the entry (raw POST — the beach stamps field 3 = timestamp) ──
async function appendToGallery(entry) {
  const r = await fetch(wk(GALLERY), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ block: GALLERY, content: entry, append: true }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`append ${GALLERY} HTTP ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  return d;
}

(async () => {
  const [scene, style] = await Promise.all([readBlock(SCENE), readBlock(STYLE)]);
  const faces = facesOf(scene);
  const prompt = composePrompt(faces, lookOf(style));
  console.log(`\n${SCENE} → prompt:\n${prompt}\n`);
  const image = await generateImage(prompt);
  const ack = await appendToGallery({
    _: `${SCENE} — ${faces.split(/(?<=[.!?])\s/)[0].slice(0, 120)}`,
    '1': AGENT,
    '2': `${SCENE}:3`,
    '4': image,
  });
  console.log(`posted to ${GALLERY} (slot ${ack.slot}). See https://happyseaurchin.com/gallery\n`);
})().catch((e) => { console.error(`\nError: ${e.message}\n`); process.exit(1); });
