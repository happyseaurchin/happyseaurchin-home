// /api/sitemap checked offline: every site mocked as global fetch, the name lookup swapped (string.js's, which the guard
// reads), the handler called as Vercel calls it. A site's robots.txt names its maps, an index's maps are read in turn and
// a gzipped one opened; the block is the site's own pages, their paths' segments its rungs, a crowd past nine nested nine
// to a node; pages on another site and maps on a site not its own are passed by; a private address, and a redirect to one,
// are refused; a site with no map, and one that does not answer, say so in the block's own words.
//   node scripts/check-sitemap.mjs
import { gzipSync } from 'node:zlib';

const urlset = (urls) => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  urls.map((u) => '  <url><loc>' + u + '</loc><image:image><image:loc>https://img.example.net/x.jpg</image:loc></image:image></url>').join('\n') + '\n</urlset>';
const index = (maps) => '<?xml version="1.0"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + maps.map((m) => '<sitemap><loc>' + m + '</loc></sitemap>').join('') + '</sitemapindex>';
const A = 'https://alpha.example.org', AW = 'https://www.alpha.example.org';
const posts = Array.from({ length: 37 }, (_, i) => AW + '/blog/post-' + (i + 1));
const SITES = {
  [A + '/robots.txt']: { body: 'User-agent: *\nAllow: /\nSitemap: ' + AW + '/sitemap_index.xml\nsitemap: https://cdn.other.net/x.xml\nSitemap: https://static.alpha.example.org/s.xml\n' },
  [AW + '/sitemap_index.xml']: { body: index([AW + '/pages.xml', AW + '/posts.xml.gz', 'https://cdn.other.net/y.xml']) },
  [AW + '/pages.xml']: { body: urlset([AW + '/', AW + '/about-us', AW + '/minimal', AW + '/minimal/substrate', AW + '/minimal/coding', AW + '/en/us/products/widget.html',
    'https://other.net/x', AW + '/about-us/', AW + '/search?q=x&amp;p=2', AW + '/caf%C3%A9-menu']) },
  [AW + '/posts.xml.gz']: { body: gzipSync(urlset(posts)), type: 'application/x-gzip' },
  ['https://static.alpha.example.org/s.xml']: { body: urlset(['https://static.alpha.example.org/logo']) },
  ['https://beta.example.org/robots.txt']: { status: 404, body: 'not here' },
  ['https://beta.example.org/sitemap.xml']: { body: 'https://beta.example.org/one\nhttps://beta.example.org/two\nnot an address\nhttps://beta.example.org/one/three\n', type: 'text/plain' },
  ['https://gamma.example.org/robots.txt']: { body: 'User-agent: *\nDisallow:\n' },
  ['https://gamma.example.org/sitemap.xml']: { status: 404, body: '' },
  ['https://gamma.example.org/sitemap_index.xml']: { status: 200, body: '<html><body>a soft not-found page</body></html>', type: 'text/html' },
  ['https://hop.example.org/robots.txt']: { status: 301, location: 'https://intranet.example.org/robots.txt' },
  ['https://big.example.org/robots.txt']: { body: 'Sitemap: https://big.example.org/all.xml' },
  ['https://big.example.org/all.xml']: { body: urlset(Array.from({ length: 2500 }, (_, i) => 'https://big.example.org/p/' + i)) },
  ['https://cdata.example.org/robots.txt']: { body: 'Sitemap: https://cdata.example.org/m.xml' },
  ['https://cdata.example.org/m.xml']: { body: '<urlset><url><loc><![CDATA[https://cdata.example.org/a-b?x=1&y=2]]></loc></url><url><loc>\n  https://cdata.example.org/plain  \n</loc></url></urlset>' },
  ['https://moved.example.org/robots.txt']: { status: 301, location: 'https://www.moved.example.org/robots.txt' },
  ['https://www.moved.example.org/robots.txt']: { body: 'Sitemap: https://www.moved.example.org/m.xml' },
  ['https://www.moved.example.org/m.xml']: { body: urlset(['https://www.moved.example.org/here']) }
};
const asked = [];
globalThis.fetch = async (url, init) => {
  const s = String(url); asked.push(s);
  if (init && init.redirect !== 'manual') throw new Error('a fetch that would follow redirects by itself: ' + s);
  if (s.startsWith('https://down.example.org/')) throw new TypeError('fetch failed');
  const r = SITES[s];
  if (!r) return new Response('nothing here', { status: 404 });
  const headers = { 'content-type': r.type || 'application/xml' };
  if (r.location) headers.location = r.location;
  return new Response(r.body === undefined ? '' : r.body, { status: r.status || 200, headers });
};
const str = await import('../api/string.js');
str.dns.lookup = async (host) => [{ address: /^(intranet|inner)\./.test(host) ? '10.0.0.8' : '93.184.216.34' }];
const { default: handler, siteOf, mapOf, mapsNamedIn, nameOf } = await import('../api/sitemap.js');
const call = async (query, method) => {
  const r = { code: 0, headers: {}, body: null };
  const res = { setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return res; }, json(d) { r.body = d; return res; } };
  await handler({ method: method || 'GET', query }, res);
  return r;
};
let bad = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : ' — ' + JSON.stringify(extra).slice(0, 600))); if (!cond) bad++; };
const at = (b, addr) => { let n = b; for (const d of String(addr).replace('.', '').split('')) { n = n && typeof n === 'object' ? n[d] : undefined; } return n; };
const words = (n) => (n && typeof n === 'object' ? n._ : n);
const digitsOf = (n) => Object.keys(n || {}).filter((k) => /^[1-9]$/.test(k));

ok('a site named as it is typed', siteOf('Alpha.Example.ORG.') === 'alpha.example.org' && siteOf('https://www.example.com/any/where?x') === 'www.example.com' && siteOf('example.co.uk') === 'example.co.uk');
ok('not a site: an address, a port, a name on no internet, a user', ['10.0.0.1', 'localhost', 'foo.local', 'ex.com:8080', 'https://u:p@ex.com', '', 'a b.com', 'ftp://ex.com', '-x.com'].every((v) => siteOf(v) === ''));
ok('robots.txt names its maps, in order', JSON.stringify(mapsNamedIn('Sitemap: a\n sitemap :b\nSITEMAP:a\nUser-agent: *')) === '["a","b"]');
ok('a map of pages, an index of maps, plain lines', mapOf(urlset(['https://x.org/a'])).locs.join() === 'https://x.org/a' && !mapOf(urlset(['https://x.org/a'])).index && mapOf(index(['https://x.org/m.xml'])).index && mapOf('https://x.org/a\nhttps://x.org/b').locs.length === 2);
ok('an image’s own address is no page', mapOf(urlset(['https://x.org/a'])).locs.length === 1);
ok('a segment’s own words', nameOf('about-us') === 'About us' && nameOf('widget.html') === 'Widget' && nameOf('caf%C3%A9-menu') === 'Café menu' && nameOf('?q=x') === '?q=x');

let r = await call({ site: 'alpha.example.org' });
const B = r.body && r.body.block;
ok('alpha: read, from its robots’ index, its www twin’s maps', r.code === 200 && r.body.found && r.body.state === 'read' && r.body.maps.includes(AW + '/sitemap_index.xml') && r.body.maps.includes(AW + '/posts.xml.gz'), r.body && r.body.maps);
ok('alpha: a map on another site is never read', !asked.some((a) => a.includes('cdn.other.net')), asked);
ok('alpha: a map beneath its own name is read, its pages on another host passed by', asked.includes('https://static.alpha.example.org/s.xml') && r.body.elsewhere === 2, r.body && r.body.elsewhere);
ok('alpha: every page kept once (45 of the 48 its maps list: one doubled, two on other hosts)', r.body.pages === 45 && r.body.seen === 48, { pages: r.body.pages, seen: r.body.seen });
ok('alpha: the top says whose, how many, and its front page', /^alpha\.example\.org — its pages as its own sitemap lists them: 45 pages, read \d{1,2} \w+ 20\d\d\. Its front page: https:\/\/alpha\.example\.org\/$/.test(words(B)), words(B));
ok('alpha: a page’s words are its name and its address', words(at(B, '1')) === 'About us — ' + AW + '/about-us', words(at(B, '1')));
ok('alpha: a page with pages beneath it holds them', words(at(B, '2')) === 'Minimal — ' + AW + '/minimal' && words(at(B, '2.1')) === 'Substrate — ' + AW + '/minimal/substrate' && words(at(B, '2.2')) === 'Coding — ' + AW + '/minimal/coding', [words(at(B, '2')), words(at(B, '2.1'))]);
ok('alpha: a run of folders with one way down is one rung', words(at(B, '3')) === 'En / Us / Products / Widget — ' + AW + '/en/us/products/widget.html', words(at(B, '3')));
ok('alpha: a query is a rung of its own, folded with the folder that is its one way down', words(at(B, '4')) === 'Search / ?q=x&p=2 — ' + AW + '/search?q=x&p=2', words(at(B, '4')));
ok('alpha: letters unescaped in a name, kept in the address', words(at(B, '5')) === 'Café menu — ' + AW + '/caf%C3%A9-menu', words(at(B, '5')));
const blog = at(B, '6');
ok('alpha: a folder that is no page says how many stand beneath it', words(blog) === 'Blog — 37 pages beneath', words(blog));
ok('alpha: a crowd past nine nested nine to a node', digitsOf(blog).length === 5 && words(at(B, '6.1')) === 'Post 1 … Post 9 — 1 to 9 of 37' && words(at(B, '6.4')) === 'Post 28 … Post 36 — 28 to 36 of 37' && digitsOf(at(B, '6.1')).length === 9, digitsOf(blog));
ok('alpha: the crowd’s last, alone, stands as itself', words(at(B, '6.5')) === 'Post 37 — ' + AW + '/blog/post-37' && words(at(B, '6.12')) === 'Post 2 — ' + AW + '/blog/post-2', [words(at(B, '6.5')), words(at(B, '6.12'))]);
ok('alpha: every digit a digit, never past nine', (function walk(n) { if (!n || typeof n !== 'object') return true; const ks = Object.keys(n).filter((k) => k !== '_'); return ks.every((k) => /^[1-9]$/.test(k)) && ks.every((k) => walk(n[k])); })(B));
ok('alpha: kept an hour at the CDN, a day while the next is read', r.headers['Vercel-CDN-Cache-Control'] === 'max-age=3600, stale-while-revalidate=86400', r.headers);
ok('alpha: nothing comes back but the block and what was read', JSON.stringify(Object.keys(r.body).sort()) === JSON.stringify(['block', 'elsewhere', 'found', 'maps', 'more', 'origin', 'pages', 'read', 'seen', 'site', 'state']) && !JSON.stringify(r.body).includes('img.example.net'), Object.keys(r.body));

r = await call({ site: 'beta.example.org' });
ok('beta: no robots, a map of plain lines at /sitemap.xml', r.body.found && r.body.pages === 3 && words(at(r.body.block, '1')) === 'One — https://beta.example.org/one' && words(at(r.body.block, '1.1')) === 'Three — https://beta.example.org/one/three', r.body);

asked.length = 0;
r = await call({ site: 'gamma.example.org' });
ok('gamma: no map anywhere it would be, and the block says so', r.code === 200 && !r.body.found && r.body.state === 'none' && /keeps no sitemap/.test(words(r.body.block)) && /Its front page: https:\/\/gamma\.example\.org\/$/.test(words(r.body.block)) && /max-age=900/.test(r.headers['Vercel-CDN-Cache-Control']), r.body);
ok('gamma: the two well-known places tried, and no other', asked.length === 3 && asked.includes('https://gamma.example.org/sitemap.xml') && asked.includes('https://gamma.example.org/sitemap_index.xml'), asked);

asked.length = 0;
r = await call({ site: 'inner.example.org' });
ok('a site on no public address is refused, and never read', r.code === 400 && !asked.length, r);
asked.length = 0;
r = await call({ site: 'hop.example.org' });
ok('a redirect to a private address is not followed', r.code === 400 && !asked.some((a) => a.includes('intranet')), r);

r = await call({ site: 'big.example.org' });
ok('big: two thousand pages kept, and the top says there are more', r.body.pages === 2000 && r.body.more === true && /2000 pages, the first of more/.test(words(r.body.block)), { pages: r.body.pages, more: r.body.more });
ok('big: still every digit a digit', (function walk(n) { if (!n || typeof n !== 'object') return true; const ks = Object.keys(n).filter((k) => k !== '_'); return ks.every((k) => /^[1-9]$/.test(k)) && ks.every((k) => walk(n[k])); })(r.body.block));

r = await call({ site: 'cdata.example.org' });
ok('a <loc> in CDATA, and one with space round it', r.body.pages === 2 && JSON.stringify(r.body.block).includes('https://cdata.example.org/a-b?x=1&y=2') && words(at(r.body.block, '2')) === 'Plain — https://cdata.example.org/plain', r.body.block);

r = await call({ site: 'moved.example.org' });
ok('a site whose robots moves to its www twin is read there', r.body.found && r.body.origin === 'https://www.moved.example.org' && /Its front page: https:\/\/www\.moved\.example\.org\/$/.test(words(r.body.block)), r.body);

r = await call({ site: 'down.example.org' });
ok('a site that does not answer: the block says so, asked again in a minute', r.code === 200 && r.body.state === 'down' && /did not answer just now/.test(words(r.body.block)) && r.headers['Vercel-CDN-Cache-Control'] === 'max-age=60', r);

r = await call({ site: 'not a site' });
ok('a site that is not a name is asked for plainly', r.code === 400 && /such as example\.com/.test(r.body.error), r);
r = await call({ site: 'alpha.example.org' }, 'POST');
ok('GET only', r.code === 405, r);

console.log(bad ? bad + ' FAILED' : 'all passed');
process.exit(bad ? 1 : 0);
