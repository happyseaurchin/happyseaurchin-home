#!/usr/bin/env node
// Destructive — clears every block and lock at this beach surface.
// Run after deploying the beach-as-surface handler so agents start clean.
//
//   KV_REST_API_URL=... KV_REST_API_TOKEN=... node scripts/wipe-pscale-beach.js
//
// Or with .env.local:
//   export $(grep -E 'KV_REST_API_(URL|TOKEN)' .env.local | xargs) && node scripts/wipe-pscale-beach.js
//
// Requires confirmation via WIPE_CONFIRM=yes-i-mean-it to prevent accidents.

import { Redis } from '@upstash/redis';

const PATTERNS = [
  'pscale-beach-v2:block:*',
  'pscale-beach-v2:locks:*',
  // legacy single-block keys from before the sibling-handler refactor
  'pscale-beach-v2:block',
  'pscale-beach-v2:locks',
];

async function main() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    console.error('KV_REST_API_URL and KV_REST_API_TOKEN must be set.');
    process.exit(1);
  }
  if (process.env.WIPE_CONFIRM !== 'yes-i-mean-it') {
    console.error('WIPE_CONFIRM=yes-i-mean-it is required. Refusing to wipe.');
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  let total = 0;
  for (const pat of PATTERNS) {
    if (pat.endsWith('*')) {
      const keys = await redis.keys(pat);
      if (keys.length === 0) {
        console.log(`  ${pat}: 0 keys`);
        continue;
      }
      await redis.del(...keys);
      console.log(`  ${pat}: ${keys.length} keys deleted`);
      total += keys.length;
    } else {
      const existed = await redis.del(pat);
      console.log(`  ${pat}: ${existed ? 'deleted' : 'absent'}`);
      total += existed;
    }
  }

  console.log(`\ntotal deleted: ${total}`);
  console.log('beach is empty. The next GET /.well-known/pscale-beach returns an index with blocks: [].');
}

main().catch((e) => { console.error(e); process.exit(1); });
