#!/usr/bin/env node
// render-bubble.mjs — observe a beach scene, compose a prompt, generate ONE still,
// and post it to the beach gallery so the /gallery o-page shows it.
//
// Deliberately dependency-free: the beach is plain CORS HTTP, so this needs NO
// bsp-mcp, NO MCP client, and NO xstream. The ONLY external dependency is an
// image API — your key, your spend — isolated in generateImage() below.
//
//   Node 18+ (uses global fetch).
//
//   # Gemini ("nano banana" = gemini-2.5-flash-image) — the default:
//   GEMINI_API_KEY=... node scripts/render-bubble.mjs bubble:gal-1
//
//   # or OpenAI, if you set OPENAI_API_KEY instead:
//   OPENAI_API_KEY=sk-... node scripts/render-bubble.mjs bubble:gal-1
//
// Env:  BEACH (default https://beach.happyseaurchin.com), STYLE (default style:gal),
//       GALLERY (default gallery:gal), AGENT (default "observer"),
//       GEMINI_MODEL (default gemini-2.5-flash-image).

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

// ── generate: THE ONE EXTERNAL CALL. Returns an <img src> value: a data-URI. ──
// Gemini first (GEMINI_API_KEY), else OpenAI (OPENAI_API_KEY). Swap freely.
async function generateImage(prompt) {
  const gkey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (gkey) {
    // "nano banana". If Google has moved the model/shape, the thrown response
    // below shows exactly what came back — paste it and it's a one-line fix.
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gkey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}: ${JSON.stringify(d).slice(0, 500)}`);
    const parts = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const part = parts.find((p) => (p.inlineData && p.inlineData.data) || (p.inline_data && p.inline_data.data));
    const inline = part && (part.inlineData || part.inline_data);
    if (inline && inline.data) return `data:${inline.mimeType || inline.mime_type || 'image/png'};base64,${inline.data}`;
    throw new Error(`Gemini returned no image part. Response: ${JSON.stringify(d).slice(0, 500)}`);
  }

  const okey = process.env.OPENAI_API_KEY || process.env.IMAGE_API_KEY;
  if (okey) {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${okey}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', n: 1 }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${JSON.stringify(d).slice(0, 500)}`);
    const item = d.data && d.data[0];
    if (item && item.b64_json) return `data:image/png;base64,${item.b64_json}`;
    if (item && item.url) return item.url;
    throw new Error('OpenAI returned neither b64_json nor url');
  }

  throw new Error('set GEMINI_API_KEY (nano banana) or OPENAI_API_KEY');
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
