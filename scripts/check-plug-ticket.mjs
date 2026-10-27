// The plug service's ticket check, offline (ways:plug 8.8; lane plug.2): the beach mocked as global fetch, each grain
// as the ticket machine leaves it, read by scripts/plug-ticket.mjs as the payway's verifier reads a ticket.
//   node scripts/check-plug-ticket.mjs
import { FEE, pairOf, ticketFor, feeOf, boundTo } from './plug-ticket.mjs';

const NOW = new Date('2026-10-27T18:00:00Z');
const BLOCKS = {};
// a ticket as the machine issues it: one side reached by the issuer, its envelope at that side's underscore
function sold(maker, envelope, revoked) {
  const side = FEE.issuer < maker ? '1' : '2';
  BLOCKS['grain:' + pairOf(FEE.issuer, maker)] = { _: 'Ticket: ' + FEE.product + ' for ' + maker, [side]: revoked ? { _: envelope, 1: revoked } : { _: envelope }, 9: { [side]: FEE.issuer } };
}
const ticket = (o = {}) => '[ticket face=author scope=' + (o.scope || FEE.scope) + ' expires=' + (o.expires || '2126-10-03T18:00:00Z') + (o.nonce === null ? '' : ' nonce=' + (o.nonce || 'n-ann')) + ']';
sold('ann', ticket());
sold('Bea', ticket({ nonce: 'n-bea', expires: '2026-10-01T00:00:00Z' }));
sold('cy', ticket({ nonce: 'n-cy' }), '[ticket-revoked at=2026-10-27T12:00:00Z reason=refund]');
sold('dee', ticket({ nonce: 'n-dee', scope: 'frame:brackenfoot' }));
sold('eve', ticket({ nonce: null }));
BLOCKS['grain:' + pairOf(FEE.issuer, 'fay')] = { _: 'Ticket: arcade-plug for fay', 2: { _: ticket({ nonce: 'n-fay' }) }, 9: { 2: 'someone-else' } };
globalThis.fetch = async (url) => {
  const b = BLOCKS[new URL(url).searchParams.get('block')];
  return { status: b ? 200 : 404, ok: !!b, json: async () => b };
};

let pass = true;
const check = (label, ok, detail) => { if (!ok) pass = false; console.log(`  ${ok ? '✓' : '✗'} ${label}` + (ok ? '' : '\n      ' + JSON.stringify(detail))); };

console.log('\nthe grain a ticket stands on');
check('pair ids as bsp-mcp derives them: the genus-hatch ticket of 9 July 2026 stands at grain:c92625404e5214f3', pairOf('hatch-tickets', 'happyseaurchin') === 'c92625404e5214f3' && pairOf('happyseaurchin', 'hatch-tickets') === 'c92625404e5214f3');

console.log('\na ticket in the maker\'s name, read as the payway\'s verifier reads one');
let t = await ticketFor('ann', NOW);
check('a ticket the machine issued, for this product, not run out: paid, its sale named', t.ok && t.nonce === 'n-ann' && t.grain === 'grain:' + pairOf(FEE.issuer, 'ann') && t.side === '2', t);
t = await ticketFor('Bea', NOW);
check('a capital sorts before the issuer, so the issuer holds side 2 and a handle is read as typed', !t.ok && t.side === '2' && /ran out/.test(t.why), t);
t = await ticketFor('cy', NOW);
check('a refunded ticket, revoked beneath its envelope, does not pay', !t.ok && /revoked/.test(t.why), t);
t = await ticketFor('dee', NOW);
check('a ticket for another product (a seat) does not pay for a plug', !t.ok && /frame:brackenfoot/.test(t.why), t);
t = await ticketFor('eve', NOW);
check('a ticket naming no sale cannot be bound to a game', !t.ok && /no sale/.test(t.why), t);
t = await ticketFor('fay', NOW);
check('a grain the issuer did not reach is no ticket', !t.ok && /not reached by/.test(t.why), t);
t = await ticketFor('gus', NOW);
check('no grain at all: not paid, and it says where it would stand', !t.ok && /not on the beach/.test(t.why) && t.grain === 'grain:' + pairOf(FEE.issuer, 'gus'), t);

console.log('\none ticket plugs one game, bound on the shelf');
const shelf = [
  { game: 'cairn', fee: 'free — the kit\'s proof' },
  { game: 'kites', fee: 'ticket n-ann · grain:' + pairOf(FEE.issuer, 'ann') + ':2' },
  { game: 'moths' },
];
check('a game already paid for keeps its fee line, so a new version needs no other ticket', feeOf(shelf, 'kites').startsWith('ticket n-ann ') && feeOf(shelf, 'cairn').startsWith('free') && feeOf(shelf, 'moths') === '' && feeOf(shelf, 'new') === '');
check('a ticket that plugged one game is spent for any other', boundTo(shelf, 'n-ann', 'owls') === 'kites' && boundTo(shelf, 'n-ann', 'kites') === '' && boundTo(shelf, 'n-other', 'owls') === '');

console.log('\n  ' + (pass ? 'all pass' : 'FAILED') + '\n');
process.exit(pass ? 0 : 1);
