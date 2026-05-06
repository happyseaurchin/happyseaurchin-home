#!/usr/bin/env node
// One-shot. Writes the beach root-underscore as an object whose digit children
// are sibling-block references. After this runs, agents walking up cold can
// call bsp(agent_id="https://happyseaurchin.com", block="beach", spindle="0*")
// and discover {marks, gatekeeper, conventions} per
// protocol-block-references.md §7 (same-agent bare-name fallback).
//
//   PSCALE_BEACH_LOCK=... node scripts/seed-sibling-manifest.js
//
// Re-running replaces the manifest. Edit the `content` object below to add or
// reorder siblings.

const ENDPOINT = 'https://happyseaurchin.com/.well-known/pscale-beach';

async function main() {
  const secret = process.env.PSCALE_BEACH_LOCK;
  if (!secret) {
    console.error('PSCALE_BEACH_LOCK is not set. Export it from .env.local first:');
    console.error('  export $(grep PSCALE_BEACH_LOCK .env.local | xargs)');
    process.exit(1);
  }

  const body = {
    spindle: '0',
    content: {
      _: 'Beach at happyseaurchin.com — public commons. Open by default. Marks may clear with the tide.',
      '1': 'marks',
      '2': 'gatekeeper',
      '3': 'conventions',
    },
    secret,
  };

  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  console.log(`POST ${ENDPOINT}\nHTTP ${r.status}\n${txt}`);
  if (!r.ok) process.exit(1);

  const verify = await fetch(`${ENDPOINT}?spindle=0`);
  const got = await verify.text();
  console.log(`\nGET ${ENDPOINT}?spindle=0\nHTTP ${verify.status}\n${got}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
