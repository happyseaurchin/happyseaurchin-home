// /api/sitemap checked offline: every site mocked as global fetch, the name lookup swapped (string.js's, which the guard
// reads), the handler called as Vercel calls it. One file a read: the top reads robots.txt and one map (an index's maps,
// or the several a robots.txt names, standing as places read only when gone into, ?map=, one map a read); a site with no
// map is read the quick way, the links on its front page that stay on the site; the front page's headers say whether the
// site may be shown inside another page. The block is links only, their paths' segments its rungs, a crowd past nine
// nested nine to a node; a private address, a redirect to one, and a ?map= that is not one of the site's maps are refused.
//   node scripts/check-sitemap.mjs
import { gzipSync } from 'node:zlib';

const urlset = (urls) => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  urls.map((u) => '  <url><loc>' + u + '</loc><image:image><image:loc>https://img.example.net/x.jpg</image:loc></image:image></url>').join('\n') + '\n</urlset>';
const index = (maps) => '<?xml version="1.0"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + maps.map((m) => '<sitemap><loc>' + m + '</loc></sitemap>').join('') + '</sitemapindex>';
const A = 'https://alpha.example.org', AW = 'https://www.alpha.example.org';
const posts = Array.from({ length: 37 }, (_, i) => AW + '/blog/post-' + (i + 1));
// a body that comes in pieces, counting the pieces taken, so a read let go early can be seen
const pulled = {};
const pieces = (name, text, size) => () => {
  const all = new TextEncoder().encode(text); let at = 0; pulled[name] = 0;
  return new ReadableStream({ pull(c) { if (at >= all.length) return c.close(); pulled[name]++; c.enqueue(all.slice(at, at + size)); at += size; } });
};
const BIG = urlset(Array.from({ length: 2500 }, (_, i) => 'https://big.example.org/p/' + i));
const GAMMA_FRONT = '<!doctype html><html><head><base href="https://gamma.example.org/"></head><body>' +
  '<a href="/about">About</a> <a class="n" href=\'/blog/first-post\'>One</a> <a href="https://www.gamma.example.org/blog/second-post#top">Two</a>' +
  '<a href="#main">skip</a> <a href="mailto:hi@gamma.example.org">mail</a> <a href="javascript:void(0)">js</a> <a href="/about/">again</a>' +
  '<a href="https://elsewhere.example.net/x">away</a> <a href="//gamma.example.org/search?q=a&amp;b=2">search</a> <a href="/">home</a>' +
  '<a href=contact.html>Contact</a><p>Words on the page that never come back.</p></body></html>';
const SITES = {
  // alpha: its robots.txt names one map, an index on its www twin; the index's maps are places, read only when gone into
  [A + '/robots.txt']: { body: 'User-agent: *\nAllow: /\nSitemap: ' + AW + '/sitemap_index.xml\n' },
  [A + '/']: { status: 301, location: AW + '/' },
  [AW + '/']: { body: pieces('alpha-front', '<!doctype html><html><body>' + '<a href="/x">x</a>'.repeat(4000) + '</body></html>', 512), type: 'text/html', headers: { 'x-frame-options': 'SAMEORIGIN' } },
  [AW + '/sitemap_index.xml']: { body: index([AW + '/pages.xml', AW + '/posts.xml.gz', 'https://cdn.other.net/y.xml', 'https://static.alpha.example.org/s.xml', AW + '/pages.xml']) },
  [AW + '/pages.xml']: { body: urlset([AW + '/', AW + '/about-us', AW + '/minimal', AW + '/minimal/substrate', AW + '/minimal/coding', AW + '/en/us/products/widget.html',
    'https://other.net/x', AW + '/about-us/', AW + '/search?q=x&amp;p=2', AW + '/caf%C3%A9-menu']) },
  [AW + '/posts.xml.gz']: { body: gzipSync(urlset(posts)), type: 'application/x-gzip' },
  ['https://static.alpha.example.org/s.xml']: { body: urlset(['https://static.alpha.example.org/logo', AW + '/from-static']) },
  [AW + '/news-sitemap.xml']: { body: index([AW + '/news-1.xml', AW + '/news-2.xml']) },
  [AW + '/empty-sitemap.xml']: { body: urlset(['https://other.net/only-there']) },
  // beta: no robots.txt, a map of plain lines at /sitemap.xml; its front page lets anyone frame it
  ['https://beta.example.org/robots.txt']: { status: 404, body: 'not here' },
  ['https://beta.example.org/sitemap.xml']: { body: 'https://beta.example.org/one\nhttps://beta.example.org/two\nnot an address\nhttps://beta.example.org/one/three\n', type: 'text/plain' },
  ['https://beta.example.org/']: { body: '<html></html>', type: 'text/html', headers: { 'content-security-policy': "default-src 'self'; frame-ancestors *" } },
  // gamma: no map anywhere, a soft not-found page at the second place; the quick way, its front page's links
  ['https://gamma.example.org/robots.txt']: { body: 'User-agent: *\nDisallow:\n' },
  ['https://gamma.example.org/sitemap.xml']: { status: 404, body: '' },
  ['https://gamma.example.org/sitemap_index.xml']: { body: pieces('gamma-soft', '<!DOCTYPE html><html><body>' + 'a soft not-found page '.repeat(20000) + '</body></html>', 1024), type: 'text/html' },
  ['https://gamma.example.org/']: { body: GAMMA_FRONT, type: 'text/html', headers: { 'x-frame-options': 'DENY' } },
  // several: its robots.txt names three maps (one on another site): those are the places, and none is read
  ['https://several.example.org/robots.txt']: { body: 'Sitemap: https://several.example.org/sitemap-pages.xml\nSitemap: http://several.example.org/food/sitemap.xml\nSitemap: https://cdn.other.net/z.xml\n' },
  ['https://several.example.org/']: { body: '<html></html>', type: 'text/html', headers: { 'content-security-policy': 'frame-ancestors https://happyseaurchin.com', 'x-frame-options': 'DENY' } },
  // big: one map of 2,500 pages, read in pieces and let go once it has named enough
  ['https://big.example.org/robots.txt']: { body: 'Sitemap: https://big.example.org/all.xml' },
  ['https://big.example.org/all.xml']: { body: pieces('big', BIG, 4096) },
  ['https://big.example.org/']: { body: '<html></html>', type: 'text/html' },
  ['https://cdata.example.org/robots.txt']: { body: 'Sitemap: https://cdata.example.org/m.xml' },
  ['https://cdata.example.org/m.xml']: { body: '<urlset><url><loc><![CDATA[https://cdata.example.org/a-b?x=1&y=2]]></loc></url><url><loc>\n  https://cdata.example.org/plain  \n</loc></url></urlset>' },
  ['https://moved.example.org/robots.txt']: { status: 301, location: 'https://www.moved.example.org/robots.txt' },
  ['https://www.moved.example.org/robots.txt']: { body: 'Sitemap: https://www.moved.example.org/m.xml' },
  ['https://www.moved.example.org/m.xml']: { body: urlset(['https://www.moved.example.org/here']) },
  ['https://hop.example.org/robots.txt']: { status: 301, location: 'https://intranet.example.org/robots.txt' },
  // half: its map is read, its front page does not answer, so whether it may be framed is not known
  ['https://half.example.org/robots.txt']: { body: 'Sitemap: https://half.example.org/m.xml' },
  ['https://half.example.org/m.xml']: { body: urlset(['https://half.example.org/a']) }
};
const asked = [];
globalThis.fetch = async (url, init) => {
  const s = String(url); asked.push(s);
  if (init && init.redirect !== 'manual') throw new Error('a fetch that would follow redirects by itself: ' + s);
  if (s.startsWith('https://down.example.org/') || s === 'https://half.example.org/' || s === AW + '/news-2.xml') throw new TypeError('fetch failed');
  const r = SITES[s];
  if (!r) return new Response('nothing here', { status: 404 });
  const headers = Object.assign({ 'content-type': r.type || 'application/xml' }, r.headers || {});
  if (r.location) headers.location = r.location;
  return new Response(typeof r.body === 'function' ? r.body() : r.body === undefined ? '' : r.body, { status: r.status || 200, headers });
};
const str = await import('../api/string.js');
str.dns.lookup = async (host) => [{ address: /^(intranet|inner)\./.test(host) ? '10.0.0.8' : '93.184.216.34' }];
const { default: handler, siteOf, mapOf, mapsNamedIn, nameOf, mapNameOf, mapAsked, linksOf, frameOf } = await import('../api/sitemap.js');
const call = async (query, method) => {
  const r = { code: 0, headers: {}, body: null };
  const res = { setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return res; }, json(d) { r.body = d; return res; } };
  await handler({ method: method || 'GET', query }, res);
  return r;
};
let bad = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : ' — ' + JSON.stringify(extra).slice(0, 700))); if (!cond) bad++; };
const at = (b, addr) => { let n = b; for (const d of String(addr).replace('.', '').split('')) { n = n && typeof n === 'object' ? n[d] : undefined; } return n; };
const words = (n) => (n && typeof n === 'object' ? n._ : n);
const digitsOf = (n) => Object.keys(n || {}).filter((k) => /^[1-9]$/.test(k));
const digitsOnly = (n) => { if (!n || typeof n !== 'object') return true; const ks = Object.keys(n).filter((k) => k !== '_'); return ks.every((k) => /^[1-9]$/.test(k)) && ks.every((k) => digitsOnly(n[k])); };
const settle = () => new Promise((res) => setTimeout(res, 20));

/* the parts */
ok('a site named as it is typed', siteOf('Alpha.Example.ORG.') === 'alpha.example.org' && siteOf('https://www.example.com/any/where?x') === 'www.example.com' && siteOf('example.co.uk') === 'example.co.uk');
ok('not a site: an address, a port, a name on no internet, a user', ['10.0.0.1', 'localhost', 'foo.local', 'ex.com:8080', 'https://u:p@ex.com', '', 'a b.com', 'ftp://ex.com', '-x.com'].every((v) => siteOf(v) === ''));
ok('robots.txt names its maps, in order', JSON.stringify(mapsNamedIn('Sitemap: a\n sitemap :b\nSITEMAP:a\nUser-agent: *')) === '["a","b"]');
ok('a map of pages, an index of maps, plain lines', mapOf(urlset(['https://x.org/a'])).locs.join() === 'https://x.org/a' && !mapOf(urlset(['https://x.org/a'])).index && mapOf(index(['https://x.org/m.xml'])).index && mapOf('https://x.org/a\nhttps://x.org/b').locs.length === 2);
ok('an image’s own address is no page', mapOf(urlset(['https://x.org/a'])).locs.length === 1);
ok('a segment’s own words', nameOf('about-us') === 'About us' && nameOf('widget.html') === 'Widget' && nameOf('caf%C3%A9-menu') === 'Café menu' && nameOf('?q=x') === '?q=x');
const MN = { '/sitemaps/https-index-uk-archive.xml': 'Uk archive', '/food/sitemap.xml': 'Food', '/bitesize/sitemap/sitemapindex.xml': 'Bitesize', '/sitemap.xml': 'Its sitemap', '/sitemap-0.xml': 'Sitemap 0', '/post-sitemap.xml': 'Post', '/sitemaps/news.xml.gz': 'News', '/sitemap.php?page=2': 'Sitemap ?page=2' };
ok('a map’s own words, from its address', Object.entries(MN).every(([p, w]) => mapNameOf('https://x.org' + p) === w), Object.keys(MN).map((p) => mapNameOf('https://x.org' + p)));
ok('a map asked for: on the site’s own name, over https, with a map’s address',
  mapAsked('http://www.alpha.example.org/pages.xml#x', 'alpha.example.org') === AW + '/pages.xml' && mapAsked('https://static.alpha.example.org/s.xml', 'alpha.example.org') === 'https://static.alpha.example.org/s.xml'
  && ['https://cdn.other.net/y.xml', 'https://alpha.example.org/admin?delete=1', 'https://alpha.example.org:8443/sitemap.xml', 'ftp://alpha.example.org/sitemap.xml', '/pages.xml', 'https://u:p@alpha.example.org/sitemap.xml'].every((v) => mapAsked(v, 'alpha.example.org') === ''));
ok('a page’s links: its <base>, http(s) only, fragments dropped, never its words',
  JSON.stringify(linksOf('<base href="/en/"><a href="a">x</a><a class="c" href=\'/b#top\'>y</a><a href=#z>z</a><a href="mailto:q@x">m</a><a href="//s.example/c?x=1&amp;y=2">c</a><a href="javascript:void(0)">j</a>', 'https://s.example/'))
  === JSON.stringify(['https://s.example/en/a', 'https://s.example/b', 'https://s.example/c?x=1&y=2']));
const H = (o) => new Headers(o), P = 'https://s.example/';
const FRAMES = [
  [{}, true], [{ 'x-frame-options': 'DENY' }, false], [{ 'x-frame-options': 'SAMEORIGIN' }, false], [{ 'x-frame-options': 'sameorigin, sameorigin' }, false],
  [{ 'x-frame-options': 'ALLOW-FROM https://a.b' }, true], [{ 'x-frame-options': 'deny, allowall' }, false],
  [{ 'content-security-policy': "frame-ancestors 'self'" }, false], [{ 'content-security-policy': "frame-ancestors 'none'" }, false],
  [{ 'content-security-policy': 'frame-ancestors *' }, true], [{ 'content-security-policy': 'frame-ancestors https:' }, true],
  [{ 'content-security-policy': 'frame-ancestors https://happyseaurchin.com' }, true], [{ 'content-security-policy': 'frame-ancestors *.happyseaurchin.com' }, false],
  [{ 'content-security-policy': 'frame-ancestors happyseaurchin.com', 'x-frame-options': 'DENY' }, true],
  [{ 'content-security-policy': "default-src 'self'", 'x-frame-options': 'DENY' }, false], [{ 'content-security-policy': "default-src 'self'" }, true],
  [{ 'content-security-policy': 'frame-ancestors;' }, false], [{ 'content-security-policy': "frame-ancestors 'self' https://*.google.com" }, false],
  [{ 'content-security-policy': 'frame-ancestors https://happyseaurchin.com:443' }, true], [{ 'content-security-policy': 'frame-ancestors https://happyseaurchin.com:8443' }, false],
  [{ 'content-security-policy': 'frame-ancestors *, frame-ancestors https://other.com' }, false]
];
const wrong = FRAMES.filter(([h, want]) => frameOf(H(h), P).frame !== want);
ok('may it be framed, read as a browser reads its headers (' + FRAMES.length + ' cases)', !wrong.length, wrong);

/* alpha: robots.txt and one map, an index; its maps are the places, none of them read */
asked.length = 0;
let r = await call({ site: 'alpha.example.org' });
const B = r.body && r.body.block;
ok('alpha: robots.txt, then its one map, then the front page (after its redirect), one at a time, and nothing else', r.code === 200 && JSON.stringify(asked) === JSON.stringify([A + '/robots.txt', AW + '/sitemap_index.xml', A + '/', AW + '/']), asked);
ok('alpha: no map read beyond the one (never a chain)', !asked.some((a) => /pages\.xml|posts\.xml|s\.xml$|cdn\.other/.test(a)), asked);
ok('alpha: an index, its maps on its own name the places', r.body.found && r.body.state === 'read' && r.body.kind === 'maps' && r.body.maps === 3 && r.body.pages === 0 && r.body.elsewhere === 1 && r.body.from === AW + '/sitemap_index.xml', r.body);
ok('alpha: the top says whose, what it is, when, and its front page', /^alpha\.example\.org — its sitemap is an index of 3 maps, each read when you go into it, read \d{1,2} \w+ 20\d\d\. Its front page: https:\/\/alpha\.example\.org\/$/.test(words(B)), words(B));
ok('alpha: a map not yet read says its name and its address', words(at(B, '1')) === 'Pages — sitemap: ' + AW + '/pages.xml' && words(at(B, '2')) === 'Posts — sitemap: ' + AW + '/posts.xml.gz' && words(at(B, '3')) === 'S — sitemap: https://static.alpha.example.org/s.xml' && digitsOf(B).length === 3, [words(at(B, '1')), words(at(B, '2')), words(at(B, '3'))]);
ok('alpha: its front page’s headers say no (SAMEORIGIN), read after its redirect to its www twin', r.body.frame === false && /SAMEORIGIN/.test(r.body.frameWhy), r.body);
await settle();
ok('alpha: the front page’s body let go, a map having been found', (pulled['alpha-front'] || 0) <= 2, pulled);
ok('alpha: kept an hour at the CDN, a day while the next is read', r.headers['Vercel-CDN-Cache-Control'] === 'max-age=3600, stale-while-revalidate=86400', r.headers);
ok('alpha: nothing comes back but the block and what was read', JSON.stringify(Object.keys(r.body).sort()) === JSON.stringify(['block', 'elsewhere', 'found', 'frame', 'frameWhy', 'from', 'kind', 'maps', 'more', 'origin', 'pages', 'read', 'seen', 'site', 'state']), Object.keys(r.body));

/* going into one of alpha's maps: that one map, and nothing else */
asked.length = 0;
r = await call({ site: 'alpha.example.org', map: AW + '/pages.xml' });
const S = r.body && r.body.block;
ok('a map gone into: that one file read, and nothing else', r.code === 200 && asked.length === 1 && asked[0] === AW + '/pages.xml', asked);
ok('its pages, kept once, on the site (one doubled, one on another site)', r.body.found && r.body.kind === 'pages' && r.body.pages === 8 && r.body.seen === 10 && r.body.elsewhere === 1, r.body);
ok('its place’s words still end with its address', /^Pages — 8 pages, read \d{1,2} \w+ 20\d\d, from its sitemap: https:\/\/www\.alpha\.example\.org\/pages\.xml$/.test(words(S)), words(S));
ok('a page’s words are its name and its address', words(at(S, '1')) === 'About us — ' + AW + '/about-us', words(at(S, '1')));
ok('a page with pages beneath it holds them', words(at(S, '2')) === 'Minimal — ' + AW + '/minimal' && words(at(S, '2.1')) === 'Substrate — ' + AW + '/minimal/substrate' && words(at(S, '2.2')) === 'Coding — ' + AW + '/minimal/coding', [words(at(S, '2')), words(at(S, '2.1'))]);
ok('a run of folders with one way down is one rung', words(at(S, '3')) === 'En / Us / Products / Widget — ' + AW + '/en/us/products/widget.html', words(at(S, '3')));
ok('a query is a rung of its own, folded with the folder that is its one way down', words(at(S, '4')) === 'Search / ?q=x&p=2 — ' + AW + '/search?q=x&p=2', words(at(S, '4')));
ok('letters unescaped in a name, kept in the address', words(at(S, '5')) === 'Café menu — ' + AW + '/caf%C3%A9-menu', words(at(S, '5')));
ok('nothing comes back but the block and what was read', JSON.stringify(Object.keys(r.body).sort()) === JSON.stringify(['block', 'elsewhere', 'found', 'kind', 'map', 'maps', 'more', 'pages', 'read', 'seen', 'site', 'state']) && !JSON.stringify(r.body).includes('img.example.net'), Object.keys(r.body));
r = await call({ site: 'alpha.example.org', map: AW + '/posts.xml.gz' });
const blog = at(r.body.block, '1');
ok('a gzipped map opened; a folder that is no page says how many stand beneath it', r.body.pages === 37 && words(blog) === 'Blog — 37 pages beneath', words(blog));
ok('a crowd past nine nested nine to a node', digitsOf(blog).length === 5 && words(at(r.body.block, '1.1')) === 'Post 1 … Post 9 — 1 to 9 of 37' && words(at(r.body.block, '1.4')) === 'Post 28 … Post 36 — 28 to 36 of 37' && digitsOf(at(r.body.block, '1.1')).length === 9, digitsOf(blog));
ok('the crowd’s last, alone, stands as itself', words(at(r.body.block, '1.5')) === 'Post 37 — ' + AW + '/blog/post-37' && words(at(r.body.block, '1.12')) === 'Post 2 — ' + AW + '/blog/post-2', [words(at(r.body.block, '1.5')), words(at(r.body.block, '1.12'))]);
ok('every digit a digit, never past nine', digitsOnly(r.body.block));
r = await call({ site: 'alpha.example.org', map: 'https://static.alpha.example.org/s.xml' });
ok('a map beneath its own name keeps the pages on the site, and on its own name', r.body.pages === 2 && JSON.stringify(r.body.block).includes(AW + '/from-static') && JSON.stringify(r.body.block).includes('https://static.alpha.example.org/logo'), r.body);
asked.length = 0;
r = await call({ site: 'alpha.example.org', map: AW + '/news-sitemap.xml' });
ok('a map that is itself an index: its maps the places beneath it, none read', asked.length === 1 && r.body.kind === 'maps' && r.body.maps === 2 && words(at(r.body.block, '1')) === 'News 1 — sitemap: ' + AW + '/news-1.xml' && /^News — an index of 2 maps, each read when you go into it, read .*, from its sitemap: /.test(words(r.body.block)), r.body);
r = await call({ site: 'alpha.example.org', map: AW + '/empty-sitemap.xml' });
ok('a map that lists nothing on the site says so, its address kept at its end', r.code === 200 && !r.body.found && typeof r.body.block === 'string' && /^Empty — lists nothing on alpha\.example\.org, read .*, from its sitemap: https:\/\/www\.alpha\.example\.org\/empty-sitemap\.xml$/.test(r.body.block), r.body);
r = await call({ site: 'alpha.example.org', map: AW + '/news-2.xml' });
ok('a map that does not answer says so, asked again in a minute', r.code === 200 && r.body.state === 'down' && /did not answer just now/.test(r.body.block) && r.headers['Vercel-CDN-Cache-Control'] === 'max-age=60', r);
asked.length = 0;
for (const m of ['https://cdn.other.net/y.xml', 'https://alpha.example.org/admin?delete=1', 'not a map'])
  ok('not one of its maps, refused unread: ' + m, (r = await call({ site: 'alpha.example.org', map: m })).code === 400 && /not one of alpha\.example\.org's maps/.test(r.body.error) && !asked.length, r);
r = await call({ site: 'alpha.example.org', map: 'https://inner.alpha.example.org/sitemap.xml' });
ok('a map on its own name at a private address is refused, and never read', r.code === 400 && !asked.length, { r, asked });

/* beta: no robots.txt, a map of plain lines at /sitemap.xml */
r = await call({ site: 'beta.example.org' });
ok('beta: a map of plain lines at /sitemap.xml', r.body.found && r.body.kind === 'pages' && r.body.pages === 3 && words(at(r.body.block, '1')) === 'One — https://beta.example.org/one' && words(at(r.body.block, '1.1')) === 'Three — https://beta.example.org/one/three' && /^beta\.example\.org — its pages as its own sitemap lists them: 3 pages, read /.test(words(r.body.block)), r.body);
ok('beta: frame-ancestors * lets it be shown inside another page', r.body.frame === true, r.body);

/* gamma: no map; the quick way */
asked.length = 0;
r = await call({ site: 'gamma.example.org' });
const G = r.body && r.body.block;
ok('gamma: robots.txt, the two well-known places, then the front page, in turn, and nothing else', JSON.stringify(asked) === JSON.stringify(['robots.txt', 'sitemap.xml', 'sitemap_index.xml', ''].map((p) => 'https://gamma.example.org/' + p)), asked);
await settle();
ok('gamma: a web page where a map would be is let go at once (a few pieces of hundreds)', (pulled['gamma-soft'] || 0) <= 4, pulled);
ok('gamma: the links on its front page that stay on the site, once each', r.body.found && r.body.kind === 'links' && r.body.pages === 5 && r.body.elsewhere === 1 && r.body.from === 'https://gamma.example.org/', r.body);
ok('gamma: the top says it keeps no sitemap', /^gamma\.example\.org — the links on its front page, as it keeps no sitemap: 5 pages, read .*\. Its front page: https:\/\/gamma\.example\.org\/$/.test(words(G)), words(G));
ok('gamma: laid out as pages are, its www twin’s among them', words(at(G, '1')) === 'About — https://gamma.example.org/about' && words(at(G, '2')) === 'Blog — 2 pages beneath' && words(at(G, '2.2')) === 'Second post — https://www.gamma.example.org/blog/second-post' && words(at(G, '3')) === 'Search / ?q=a&b=2 — https://gamma.example.org/search?q=a&b=2' && words(at(G, '4')) === 'Contact — https://gamma.example.org/contact.html', [words(at(G, '1')), words(at(G, '2')), words(at(G, '3')), words(at(G, '4'))]);
ok('gamma: links only, never the page’s words', !JSON.stringify(r.body).includes('never come back') && !JSON.stringify(r.body).includes('elsewhere.example.net') && !JSON.stringify(r.body).includes('mailto'), r.body);
ok('gamma: DENY, so it is not shown inside another page', r.body.frame === false && /DENY/.test(r.body.frameWhy), r.body);

/* several: robots.txt names several maps */
asked.length = 0;
r = await call({ site: 'several.example.org' });
ok('several: the maps its robots.txt names are the places, none read', asked.length === 2 && r.body.kind === 'maps' && r.body.maps === 2 && r.body.elsewhere === 1 && words(at(r.body.block, '1')) === 'Pages — sitemap: https://several.example.org/sitemap-pages.xml' && words(at(r.body.block, '2')) === 'Food — sitemap: https://several.example.org/food/sitemap.xml' && /^several\.example\.org — its robots\.txt names 2 maps, each read when you go into it, read /.test(words(r.body.block)), { asked, body: r.body });
ok('several: frame-ancestors naming happyseaurchin.com governs, its DENY not read', r.body.frame === true, r.body);

/* big: one map, read until it has named enough */
r = await call({ site: 'big.example.org' });
ok('big: a few hundred pages kept, and the top says there are more', r.body.pages === 500 && r.body.more === true && /500 pages, the first of more/.test(words(r.body.block)), { pages: r.body.pages, more: r.body.more });
ok('big: its map let go once it had named enough', pulled.big > 0 && pulled.big < Math.ceil(BIG.length / 4096) / 2, { pulled: pulled.big, of: Math.ceil(BIG.length / 4096) });
ok('big: still every digit a digit', digitsOnly(r.body.block));

r = await call({ site: 'cdata.example.org' });
ok('a <loc> in CDATA, and one with space round it', r.body.pages === 2 && JSON.stringify(r.body.block).includes('https://cdata.example.org/a-b?x=1&y=2') && words(at(r.body.block, '2')) === 'Plain — https://cdata.example.org/plain', r.body.block);
r = await call({ site: 'moved.example.org' });
ok('a site whose robots moves to its www twin is read there', r.body.found && r.body.origin === 'https://www.moved.example.org' && /Its front page: https:\/\/www\.moved\.example\.org\/$/.test(words(r.body.block)), r.body);
r = await call({ site: 'half.example.org' });
ok('a front page that does not answer: its map read, whether it may be framed not known', r.body.found && r.body.frame === null && /could not be read/.test(r.body.frameWhy), r.body);

asked.length = 0;
r = await call({ site: 'inner.example.org' });
ok('a site on no public address is refused, and never read', r.code === 400 && !asked.length, r);
asked.length = 0;
r = await call({ site: 'hop.example.org' });
ok('a redirect to a private address is not followed', r.code === 400 && !asked.some((a) => a.includes('intranet')), r);
r = await call({ site: 'down.example.org' });
ok('a site that does not answer: the block says so, asked again in a minute', r.code === 200 && r.body.state === 'down' && /did not answer just now/.test(words(r.body.block)) && r.headers['Vercel-CDN-Cache-Control'] === 'max-age=60', r);
r = await call({ site: 'not a site' });
ok('a site that is not a name is asked for plainly', r.code === 400 && /such as example\.com/.test(r.body.error), r);
r = await call({ site: 'alpha.example.org' }, 'POST');
ok('GET only', r.code === 405, r);

console.log(bad ? bad + ' FAILED' : 'all passed');
process.exit(bad ? 1 : 0);
