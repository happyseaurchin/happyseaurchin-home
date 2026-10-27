/* The plug service's fee (ways:plug 8.8; lane plug.2, 27 Oct 2026): five pounds a game, David's word ('£5 for us to do
 * the plug and play', spine:game-arcade 1.1168), paid with a ticket from the beach's ticket machine, the product
 * arcade-plug, bought in the maker's own name. The ticket is a grain between the maker's handle and the product's
 * issuer, arcade-plug-tickets, read here as the payway's own verifier reads one (pscale://payway 5.4): the grain stands,
 * its issuer's side was reached by the issuer and holds a [ticket …] envelope for this product's scope, not run out,
 * with no [ticket-revoked …] beneath it (a refund writes one). The shelf, games/list.json, binds each ticket to the one
 * game it plugged, so one ticket plugs one game. Shared by scripts/plug-game.mjs, which plugs nothing without a ticket
 * or David's word that a game is free, and scripts/check-plug-ticket.mjs, which checks this offline.
 *
 *   ticketFor(maker, now)      → { ok, grain, side, nonce, expires } or { ok: false, grain, side, why }
 *   feeOf(list, game)          the fee line the shelf already holds for a game ('' if none)
 *   boundTo(list, nonce, game) the other game a ticket already plugged ('' if none) */
import { createHash } from 'node:crypto';

export const FEE = {
  words: 'five pounds a game',
  product: 'arcade-plug',
  issuer: 'arcade-plug-tickets',
  scope: 'frame:arcade-plug',
  share: 'https://genus-tickets-production.up.railway.app/share/arcade-plug',
};
const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';

// pair_id as bsp-mcp derives it (src/locks.ts pairId): sha256 of the two handles sorted and joined with '|', 16 hex;
// the lex-smaller handle holds side 1
export const pairOf = (a, b) => createHash('sha256').update([a, b].sort().join('|')).digest('hex').slice(0, 16);
const sideOf = (handle, partner) => (handle < partner ? '1' : '2');

export async function ticketFor(maker, now = new Date()) {
  const grain = 'grain:' + pairOf(FEE.issuer, maker), side = sideOf(FEE.issuer, maker);
  const no = (why) => ({ ok: false, grain, side, why });
  const r = await fetch(BEACH + '?block=' + encodeURIComponent(grain), { headers: { Accept: 'application/json' } });
  if (r.status === 404) return no('no ticket stands in ' + maker + '\'s name: ' + grain + ' is not on the beach');
  if (!r.ok) throw new Error('the beach answered ' + r.status + ' for ' + grain);
  const g = await r.json();
  if (!g || !g['9'] || g['9'][side] !== FEE.issuer) return no(grain + ' was not reached by ' + FEE.issuer);
  const held = g[side], text = typeof held === 'string' ? held : held && typeof held._ === 'string' ? held._ : '';
  const m = /^\[ticket\s+([^\]]*)\]$/.exec(text.trim());
  if (!m) return no('no ticket on ' + grain + ':' + side);
  const f = {};
  for (const [, k, v] of m[1].matchAll(/([a-zA-Z][\w-]*)=(\S+)/g)) f[k] = v;
  if (f.scope !== FEE.scope) return no('the ticket on ' + grain + ' is for ' + f.scope + ', not ' + FEE.scope);
  if (!(Date.parse(f.expires || '') > now.getTime())) return no('the ticket on ' + grain + ' ran out at ' + f.expires);
  if (held && typeof held === 'object' && '123456789'.split('').some((d) => String(held[d] || '').startsWith('[ticket-revoked')))
    return no('the ticket on ' + grain + ' was revoked, as a refund revokes it');
  if (!f.nonce) return no('the ticket on ' + grain + ' names no sale');
  return { ok: true, grain, side, nonce: f.nonce, expires: f.expires };
}

// a ticket on the shelf reads 'ticket <nonce> · grain:<pair>:<side>'; a game David let through, 'free — <where he said so>'
export const feeOf = (list, game) => String((list.find((g) => g.game === game) || {}).fee || '');
export const boundTo = (list, nonce, game) =>
  (list.find((g) => g.game !== game && String(g.fee || '').startsWith('ticket ' + nonce + ' ')) || {}).game || '';
