#!/usr/bin/env node
// build-zeitgeist.js — the topic tree of the zeitgeist family, spine:zeitgeist, and the plan it deepens along,
// both from IPTC Media Topics, the subject vocabulary the news industry tags its stories with (© IPTC, CC BY 4.0).
// A person's voice on what is going on stands in their own mirror, zeitgeist:<handle>, at the address of the topic
// it is about, and the fold at that address reads them together.
//
//   node scripts/build-zeitgeist.js <mediatopic.json> [out-dir] [--layers N]
//
// <mediatopic.json> is IPTC's own export: https://cv.iptc.org/newscodes/mediatopic/?format=json&lang=x-all
// (first built from the release of 2 July 2026). Writes three files:
//   zeitgeist.spine.json  the tree cut to its first N layers (default 1, the nine sections): what is founded.
//   zeitgeist.plan.json   the whole tree, every IPTC term in use at its address: where the spine will deepen.
//   zeitgeist.index.json  every IPTC code with its planned address. A voice or a report tagged with a code
//                         stands at the deepest open ancestor of that address: 4 while only the sections are
//                         open, 4.871 once artificial intelligence is.
//
// The tree deepens downward only, into negative pscale beneath the sections, and only where voices need it: a
// topic opens its next layer, copied from the plan, when more people stand at it than one reading can hold
// together. An address therefore only ever lengthens (4, 4.8, 4.87, 4.871), and a voice already standing at a
// shorter one stays true as the ancestor of the finer ones (function:zeitgeist 2).
//
// Three rules make IPTC's tree a pscale block, and nothing else is added:
//   1. NINE SECTIONS at the root, this tree's own, each holding one or more of IPTC's seventeen top terms.
//   2. BENEATH, IPTC's own terms in the order of their codes, which is the order IPTC made them, so a term a
//      later release adds takes the next free digit and no address moves. Retired terms are left out.
//   3. NINE AT MOST. Where a term holds ten to seventeen, the first eight stand in place and the rest stand
//      together at 9; where it holds more, they stand in parts of nine (parts of parts past eighty-one), the
//      way an accumulator counts. A part names everything it holds, so a walker chooses without opening it.
// Each node reads 'TITLE — what it covers [medtop:code]': the title in capitals and the code in brackets for
// minds walking the block, which a page leaves out for people (tree 9.3).

const fs = require('fs');
const path = require('path');

const SECTIONS = [
  { title: 'POLITICS AND GOVERNMENT', line: 'elections, governments and their policies, international relations, campaigners and dissenters.', tops: ['11000000'] },
  { title: 'CONFLICT, CRIME AND JUSTICE', line: 'war, unrest and peace; crime, the police, the courts and the law.', tops: ['16000000', '02000000'] },
  { title: 'ECONOMY, BUSINESS AND WORK', line: 'the economy, markets, companies and what they make; jobs, pay and unions.', tops: ['04000000', '09000000'] },
  { title: 'SCIENCE AND TECHNOLOGY', line: 'research and discovery, the sciences, and technology and engineering, from AI to space.', tops: ['13000000'] },
  { title: 'HEALTH', line: 'illness and treatment, hospitals and care, public health and the people who give it.', tops: ['07000000'] },
  { title: 'ENVIRONMENT, WEATHER AND DISASTERS', line: 'the natural world and the climate, the weather, and disasters, accidents and emergencies.', tops: ['06000000', '17000000', '03000000'] },
  { title: 'SOCIETY, EDUCATION AND RELIGION', line: 'how people live together, from rights, families and migration to welfare; schools and learning; faith and belief.', tops: ['14000000', '05000000', '12000000'] },
  { title: 'CULTURE, LIFESTYLE AND PEOPLE', line: 'the arts, entertainment and the media; leisure and how people live; awards, celebrities and human stories.', tops: ['01000000', '10000000', '08000000'] },
  { title: 'SPORT', line: 'every sport, its events, its people and its business.', tops: ['15000000'] },
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function main() {
  const args = process.argv.slice(2);
  const li = args.indexOf('--layers');
  const layers = li >= 0 ? Number(args.splice(li, 2)[1]) : 1;
  const [src, outDir = '.'] = args;
  if (!src || !(layers >= 1)) { console.error('usage: node scripts/build-zeitgeist.js <mediatopic.json> [out-dir] [--layers N]'); process.exit(1); }
  const iptc = JSON.parse(fs.readFileSync(src, 'utf8'));
  const [y, m, d] = String(iptc.dateReleased || '').slice(0, 10).split('-').map(Number);
  const released = d + ' ' + MONTHS[m - 1] + ' ' + y;
  const byCode = new Map(iptc.conceptSet.map(c => [c.qcode, c]));
  const active = c => c && !c.retired;
  const num = q => Number(q.split(':')[1]);
  const kidsOf = c => (c.narrower || []).map(q => byCode.get(q)).filter(active).sort((a, b) => num(a.qcode) - num(b.qcode));
  const label = c => (c.prefLabel['en-GB'] || c.prefLabel['en-US'] || c.qcode).trim();
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const text = c => {
    const def = clean(c.definition && (c.definition['en-GB'] || c.definition['en-US']));
    return label(c).toUpperCase() + (def ? ' — ' + def : '') + ' [' + c.qcode + ']';
  };

  const index = {};
  let terms = 0, groups = 0, depth = 0;
  const labelsIn = node => node.label ? [node.label] : node.items.flatMap(labelsIn);

  // build a concept's subtree as a plain description first, so the nine-at-most rule can see whole lists
  const describe = c => ({ concept: c, label: label(c), items: kidsOf(c).map(describe) });
  // the nine-at-most rule (rule 3): a part's own path names it, PART 2 or PART 1.3
  const nine = (base, items, prefix = '') => {
    if (items.length <= 9) return items;
    if (!prefix && items.length <= 17) return [...items.slice(0, 8), { group: base + ': MORE', base, prefix: '', items: items.slice(8) }];
    let size = 1;
    while (size * 9 < items.length) size *= 9;
    const parts = [];
    for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
    return parts.map((p, i) => {
      const own = (prefix ? prefix + '.' : '') + (i + 1);
      return { group: base + ', PART ' + own, base, prefix: own, items: p };
    });
  };
  const emit = (desc, addr) => {
    depth = Math.max(depth, addr.length);
    if (desc.group) {
      groups++;
      const node = { _: desc.group + ' — ' + labelsIn(desc).join(' · ') };
      nine(desc.base, desc.items, desc.prefix).forEach((d, i) => { node[i + 1] = emit(d, [...addr, i + 1]); });
      return node;
    }
    terms++;
    index[desc.concept.qcode] = { address: at(addr), label: desc.label };
    const kids = nine(desc.label.toUpperCase(), desc.items);
    if (!kids.length) return text(desc.concept);
    const node = { _: text(desc.concept) };
    kids.forEach((d, i) => { node[i + 1] = emit(d, [...addr, i + 1]); });
    return node;
  };

  const plan = {
    _: 'ZEITGEIST — what the world is talking about, as a tree of topics where anyone’s voice on what is going on ' +
      'stands in their own mirror, at the address of the topic it is about. Read the tree in one call and say at the ' +
      'most specific open topic the words are about. It opens at one layer, nine sections, and deepens only where ' +
      'voices need it, along IPTC Media Topics, the vocabulary the news industry tags its stories with (© IPTC, ' +
      'CC BY 4.0, release of ' + released + '), so an address only ever lengthens and nothing moves. [function:zeitgeist]',
  };
  SECTIONS.forEach((s, i) => {
    const tops = s.tops.map(t => byCode.get('medtop:' + t));
    if (tops.some(t => !active(t))) throw new Error('section ' + (i + 1) + ' names a retired or missing top term');
    const addr = [i + 1];
    const node = { _: s.title + ' — ' + s.line + ' [' + tops.map(t => t.qcode).join(' · ') + ']' };
    if (tops.length === 1) {
      terms++;
      index[tops[0].qcode] = { address: at(addr), label: label(tops[0]) };
      nine(s.title, describe(tops[0]).items).forEach((d, j) => { node[j + 1] = emit(d, [...addr, j + 1]); });
    } else {
      tops.forEach((t, j) => { node[j + 1] = emit(describe(t), [...addr, j + 1]); });
    }
    plan[i + 1] = node;
  });

  const reachable = iptc.conceptSet.filter(active).length;
  if (terms !== reachable) throw new Error('placed ' + terms + ' of ' + reachable + ' active terms');
  const cut = (node, n) => typeof node === 'string' ? node
    : n <= 0 ? node._
    : Object.fromEntries(Object.entries(node).map(([k, v]) => [k, k === '_' ? v : cut(v, n - 1)]));
  const spine = cut(plan, layers);

  fs.mkdirSync(outDir, { recursive: true });
  const write = (name, value) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 1) + '\n');
  write('zeitgeist.spine.json', spine);
  write('zeitgeist.plan.json', plan);
  write('zeitgeist.index.json', { released, source: iptc.uri, licence: iptc.licenceLink, rule: 'a voice or a report tagged with a code stands at the deepest open ancestor of its address', codes: index });
  const kb = v => Math.round(Buffer.byteLength(JSON.stringify(v)) / 1024 * 10) / 10;
  console.log('IPTC release of ' + released + ' · plan: ' + terms + ' terms, ' + groups + ' groups, deepest address ' + depth +
    ' digits, ' + kb(plan) + ' KB · spine open to ' + layers + ' layer' + (layers > 1 ? 's' : '') + ': ' + kb(spine) + ' KB');
}

// an address as the say verb takes it on a floor-1 spine: the first digit, then the point, then the rest
function at(addr) { return addr.length === 1 ? String(addr[0]) : addr[0] + '.' + addr.slice(1).join(''); }

main();
