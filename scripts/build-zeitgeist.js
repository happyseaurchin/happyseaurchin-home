#!/usr/bin/env node
// build-zeitgeist.js — the topic tree of the zeitgeist family, spine:zeitgeist, built from IPTC Media Topics,
// the subject vocabulary the news industry tags its stories with (© IPTC, CC BY 4.0). A person's voice on what
// is going on stands in their own mirror, zeitgeist:<handle>, at the address of the topic it is about; a news
// item on the wire is tagged with the same addresses, so the item and the voices meet at one place.
//
//   node scripts/build-zeitgeist.js <mediatopic.json> [out-dir]
//
// <mediatopic.json> is IPTC's own export: https://cv.iptc.org/newscodes/mediatopic/?format=json&lang=x-all
// (this tree was first built from the release of 2 July 2026). Writes zeitgeist.spine.json, the block, and
// zeitgeist.index.json, every IPTC code with its address, so a feed already tagged with IPTC codes lands
// without anyone choosing.
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
  { tops: ['11000000'] },
  { title: 'CONFLICT, CRIME AND JUSTICE', line: 'war, unrest and peace; crime, the police, the courts and the law.', tops: ['16000000', '02000000'] },
  { title: 'ECONOMY, BUSINESS AND WORK', line: 'the economy, markets, companies and what they make; jobs, pay and unions.', tops: ['04000000', '09000000'] },
  { tops: ['13000000'] },
  { tops: ['07000000'] },
  { title: 'ENVIRONMENT, WEATHER AND DISASTERS', line: 'the natural world and the climate, the weather, and disasters, accidents and emergencies.', tops: ['06000000', '17000000', '03000000'] },
  { title: 'SOCIETY, EDUCATION AND RELIGION', line: 'how people live together, from rights, families and migration to welfare; schools and learning; faith and belief.', tops: ['14000000', '05000000', '12000000'] },
  { title: 'CULTURE, LIFESTYLE AND PEOPLE', line: 'the arts, entertainment and the media; leisure and how people live; awards, celebrities and human stories.', tops: ['01000000', '10000000', '08000000'] },
  { tops: ['15000000'] },
];

function main() {
  const [src, outDir = '.'] = process.argv.slice(2);
  if (!src) { console.error('usage: node scripts/build-zeitgeist.js <mediatopic.json> [out-dir]'); process.exit(1); }
  const iptc = JSON.parse(fs.readFileSync(src, 'utf8'));
  const released = String(iptc.dateReleased || '').slice(0, 10);
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

  const block = {
    _: 'ZEITGEIST — what the world is talking about, as a tree of topics, where anyone’s voice on what is going on ' +
      'stands in their own mirror at the address of the topic it is about. Walk it from the nine sections down, one ' +
      'level at a time, to the most specific topic the words are about, and say there. The topics are IPTC Media ' +
      'Topics, the vocabulary the news industry tags its stories with (© IPTC, CC BY 4.0; this tree from the release ' +
      'of ' + released + ', ' + 'TERMS terms in use). The nine sections are this tree’s own; where a topic holds more ' +
      'than nine, the first eight stand in place and the rest at 9, or past seventeen they stand in parts of nine, ' +
      'and a part names everything it holds. [function:zeitgeist]',
  };
  SECTIONS.forEach((s, i) => {
    const tops = s.tops.map(t => byCode.get('medtop:' + t));
    if (tops.some(t => !active(t))) throw new Error('section ' + (i + 1) + ' names a retired or missing top term');
    const addr = [i + 1];
    if (tops.length === 1) { block[i + 1] = emit(describe(tops[0]), addr); return; }
    const node = { _: s.title + ' — ' + s.line };
    tops.forEach((t, j) => { node[j + 1] = emit(describe(t), [...addr, j + 1]); });
    block[i + 1] = node;
  });
  block._ = block._.replace('TERMS', String(terms));

  const reachable = iptc.conceptSet.filter(active).length;
  if (terms !== reachable) throw new Error('placed ' + terms + ' of ' + reachable + ' active terms');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'zeitgeist.spine.json'), JSON.stringify(block, null, 1) + '\n');
  fs.writeFileSync(path.join(outDir, 'zeitgeist.index.json'), JSON.stringify({ released, source: iptc.uri, licence: iptc.licenceLink, codes: index }, null, 1) + '\n');
  console.log('released ' + released + ' · ' + terms + ' terms · ' + groups + ' groups · deepest address ' + depth + ' digits · ' +
    Math.round(Buffer.byteLength(JSON.stringify(block)) / 1024) + ' KB');
}

// an address as the say verb takes it on a floor-1 spine: the first digit, then the point, then the rest
function at(addr) { return addr.length === 1 ? String(addr[0]) : addr[0] + '.' + addr.slice(1).join(''); }

main();
