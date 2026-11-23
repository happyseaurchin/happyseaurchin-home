// /api/string checked offline: the beach and every site mocked as global fetch, the name lookup swapped, the handler
// called as Vercel calls it. A link is read only while it stands on the String; X's words come from its oEmbed, a page's
// card from its head; a private address, a redirect to one and a link nobody shared are all refused; a share's page says
// the share in its preview, and a withdrawn one does not.
//   node scripts/check-string.mjs
const BEACH = 'https://beach.happyseaurchin.com/.well-known/pscale-beach';
const nested = (line) => { let n = line; for (let i = 0; i < 10; i++) n = { _: n }; return n; };
const at = (m, addr, line) => { let n = m; const d = addr.replace('.', '').split('').map((c) => (c === '0' ? '_' : c)); d.slice(0, -1).forEach((k) => { n = n[k] = n[k] || {}; }); n[d[d.length - 1]] = line; return m; };
const X = 'https://x.com/someone/status/123?s=19', OG = 'https://example.org/a', BARE = 'https://example.org/bare', HOP = 'https://example.org/hop', YT = 'https://www.youtube.com/watch?v=abc', LOCAL = 'https://intranet.example.org/x';
const ann = nested('MIRROR — ann');
at(ann, '2026421258.111', 'SHARE ' + X + ' — this <caught> me & "stayed"');
at(ann, '2026421258.112', 'SHARE ' + OG + ' for bob — a page');
at(ann, '2026421258.113', 'SHARE ' + BARE + ' — a page with no card');
at(ann, '2026421258.114', 'SHARE ' + HOP + ' — it redirects inward');
at(ann, '2026421258.115', 'SHARE ' + YT + ' — a film');
at(ann, '2026421258.116', 'SHARE ' + LOCAL + ' — inward');
at(ann, '2026421258.117', 'WITHDRAWN');
at(ann, '2026421258.118', 'SHARE https://happyseaurchin.com/string/2026421258.111 for bob — you should see this');
at(ann, '2026421258.119', 'SHARE https://happyseaurchin.com/string/2026421258.117 — gone since');
const BLOCKS = { 'string:ann': ann };
const asked = [];
globalThis.fetch = async (url) => {
  const s = String(url); asked.push(s);
  if (s.startsWith(BEACH)) {
    const u = new URL(s), b = u.searchParams.get('block');
    if (!b) return new Response(JSON.stringify({ blocks: Object.keys(BLOCKS), touched: {}, born: {} }), { status: 200 });
    return BLOCKS[b] ? new Response(JSON.stringify(BLOCKS[b]), { status: 200 }) : new Response('{}', { status: 404 });
  }
  if (s.startsWith('https://publish.x.com/oembed')) {
    if (!s.includes(encodeURIComponent('https://x.com/someone/status/123'))) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify({ author_name: 'Some One', author_url: 'https://x.com/someone',
      html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">A post &amp; its words.<br><br>More <a href="https://t.co/abc">https://t.co/abc</a> <a href="https://t.co/zx">pic.twitter.com/zx</a></p>&mdash; Some One (@someone) <a href="https://x.com/someone/status/123">October 31, 2026</a></blockquote>' }), { status: 200 });
  }
  if (s.startsWith('https://www.youtube.com/oembed')) return new Response(JSON.stringify({ title: 'A film', author_name: 'A Channel', thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg' }), { status: 200 });
  if (s === OG) return new Response('<html><head><title>Fallback</title><meta property="og:title" content="The &amp; title"><meta content="Words of it" property="og:description"><meta property="og:image" content="/pic.jpg"><meta property="og:site_name" content="Example"></head><body>never read</body></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  if (s === BARE) return new Response('<html><head></head></html>', { status: 200, headers: { 'content-type': 'text/html' } });
  if (s === HOP) return new Response('', { status: 302, headers: { location: 'https://intranet.example.org/secret' } });
  throw new Error('a fetch nobody expected: ' + s);
};
const mod = await import('../api/string.js');
const { default: handler, isPublicAddress, withPreview, shareAt, dns } = mod;
dns.lookup = async (host) => [{ address: host.startsWith('intranet') ? '10.0.0.8' : '93.184.216.34' }];
const call = async (query) => {
  const r = { code: 0, headers: {}, body: null };
  const res = { setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return res; }, json(d) { r.body = d; return res; }, send(d) { r.body = d; return res; } };
  await handler({ method: 'GET', query }, res);
  return r;
};
let bad = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (cond ? '' : ' — ' + JSON.stringify(extra))); if (!cond) bad++; };

let r = await call({ url: 'https://nobody.example.org/never-shared' });
ok('a link nobody shared is refused, and never read', r.code === 404 && !asked.some((a) => a.includes('nobody.example.org')), r);

r = await call({ url: X });
ok('X: the post’s words, author, date', r.code === 200 && r.body.text === 'A post & its words.\n\nMore' && r.body.author === 'Some One' && r.body.when === 'October 31, 2026', r.body);
ok('X: a picture in the post is noted, not fetched', r.body.x && r.body.x.id === '123' && r.body.x.media === true && !r.body.image, r.body);

r = await call({ url: OG });
ok('a page: Open Graph, the picture made whole', r.body.title === 'The & title' && r.body.text === 'Words of it' && r.body.image === 'https://example.org/pic.jpg' && r.body.site === 'Example', r.body);
ok('a page: a card keeps for hours', /max-age=21600/.test(r.headers['Vercel-CDN-Cache-Control']), r.headers);

r = await call({ url: BARE });
ok('a page that gives nothing: its site’s name, asked again soon', r.code === 200 && !r.body.title && r.body.site === 'example.org' && /max-age=600/.test(r.headers['Vercel-CDN-Cache-Control']), r);

r = await call({ url: YT });
ok('YouTube: its oEmbed, with its thumbnail', r.body.title === 'A film' && r.body.image === 'https://i.ytimg.com/vi/abc/hqdefault.jpg', r.body);

asked.length = 0;
r = await call({ url: LOCAL });
ok('a private address, even shared, is not read', r.code === 200 && !r.body.title && !asked.includes(LOCAL), r);
asked.length = 0;
r = await call({ url: HOP });
ok('a redirect to a private address is not followed', r.code === 200 && !r.body.title && !asked.some((a) => a.includes('intranet')), r);

ok('public and private addresses told apart', isPublicAddress('93.184.216.34') && isPublicAddress('2606:2800::1') &&
  ['10.0.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1'].every((a) => !isPublicAddress(a)));

ok('a share found at its address, its why and whom', (() => { const s = shareAt({ ann }, '2026421258.112'); return s && s.by === 'ann' && s.url === OG && s.why === 'a page'; })());

const PAGE = '<title>The String — what people are sharing</title>\n<meta name="description" content="x">\n<meta property="og:title" content="x">\n<meta property="og:description" content="x">\n<meta property="og:image" content="x">\n<meta property="og:url" content="x">';
ok('the preview tags are replaced and escaped', (() => { const h = withPreview(PAGE, { title: 'a "b" <c> $& d', text: 't', image: 'i', url: 'u' }); return h.includes('<title>a &quot;b&quot; &lt;c&gt; $&amp; d</title>') && h.includes('<meta property="og:url" content="u">'); })());

/* the page door reads the real string.html, so the tags the preview replaces must stand in it */
process.chdir(new URL('..', import.meta.url).pathname);
r = await call({ page: '2026421258.111' });
ok('a share’s page: the sharer and the post in its title', r.code === 200 && r.body.includes('<title>ann shared a post by Some One</title>') && r.body.includes('<meta property="og:title" content="ann shared a post by Some One">'), r.code);
ok('a share’s page: its why in the preview, escaped', r.body.includes('<meta property="og:description" content="this &lt;caught&gt; me &amp; &quot;stayed&quot;">'));
ok('a share’s page: its own address', r.body.includes('<meta property="og:url" content="https://happyseaurchin.com/string/2026421258.111">'));
r = await call({ page: '2026421258.112' });
ok('a share’s page: the link’s own picture', r.body.includes('<meta property="og:image" content="https://example.org/pic.jpg">') && r.body.includes('<title>ann shared The &amp; title for bob</title>'));
r = await call({ page: '2026421258.117' });
ok('a withdrawn share says only that', r.body.includes('<title>A share withdrawn by its sharer</title>') && r.body.includes('assets/string/card.png'));
r = await call({ page: '2026421258.118' });
ok('a card passed on says who passed it, whose it is and for whom', r.body.includes('<title>ann passed on ann’s share for bob</title>') && r.body.includes('content="you should see this"'), r.body.match(/<title>.*<\/title>/));
r = await call({ page: '2026421258.119' });
ok('a card passed on after it was withdrawn gives away nothing of it', r.body.includes('<title>ann passed on a share</title>') && !r.body.includes('Some One'));
ok('a share for someone is told from its why', (() => { const s = shareAt({ ann }, '2026421258.118'); return s.for === 'bob' && s.why === 'you should see this'; })());
r = await call({ page: 'ann' });
ok('someone’s string', r.body.includes('<title>ann’s string</title>') && r.body.includes('content="https://happyseaurchin.com/string/ann"'));
r = await call({ page: '../../etc' });
ok('anything else is the String itself', r.code === 200 && r.body.includes('<title>The String — what people are sharing</title>'));

/* a members' door: the page served with that beach's own voice and manifest, a preview that says only whose string it is,
   and nothing of the String read for it */
asked.length = 0;
r = await call({ page: '', door: 'salt' });
ok('a members’ door: whose string it is, its home on the community’s own site, and nothing read for it', r.code === 200 && r.body.includes('<title>SALT — the String</title>') && r.body.includes('<meta property="og:url" content="https://www.bringingtheflavour.com/string">') && !asked.length, r.code);
ok('a members’ door: that beach’s own voice, its own manifest, and the door said on the page as served', r.body.includes('<script id="voice" src="https://beach.bringingtheflavour.com/button/voice.js"></script>') && r.body.includes('href="/salt.webmanifest"') && r.body.includes('<html lang="en" class="no-js" data-door="salt">') && !r.body.includes('beach.happyseaurchin.com/button/voice.js'));
r = await call({ page: '', door: '' });
ok('the open String says no door', r.code === 200 && r.body.includes('<html lang="en" class="no-js">') && !r.body.includes(' data-door="'));
r = await call({ page: '2026421258.111', door: 'salt' });
ok('a share’s page at a members’ door says no more than the door, at its home', r.body.includes('<title>SALT — the String</title>') && r.body.includes('content="https://www.bringingtheflavour.com/string/2026421258.111"') && !r.body.includes('Some One') && !asked.length, r.body.match(/<title>.*<\/title>/));
r = await call({ page: 'x', door: 'nowhere' });
ok('a door that is not one', r.code === 404);

/* a members' door's own header (lane salt.app.2, 19 Nov 2026; spine:salt-app 1.1): the door's mark, name, icons and front
   page in the page as served, before any script runs, and its top the page's own wall; theme.js lays neither ＋card nor
   share forward where <html> carries data-door, and its go there keeps to the door's own pages, read from its lighthouse */
r = await call({ page: '', door: 'salt' });
ok('a members’ door wears its own header as served: its mark in the dot’s place, its name, its icons, its front page at the foot',
  r.body.includes('<svg class="door-mark"') && !r.body.includes('<span class="dot"></span>')
  && r.body.includes('<span class="title" id="bar-title"><b>SALT</b><span class="sub"> · the string</span></span>')
  && r.body.includes('<link rel="icon" href="https://www.bringingtheflavour.com/favicon.svg" type="image/svg+xml">')
  && r.body.includes('<link rel="apple-touch-icon" href="https://www.bringingtheflavour.com/apple-touch-icon.png">')
  && r.body.includes('<p id="create-your-own"><a href="https://www.bringingtheflavour.com/">SALT</a></p>'));
ok('a members’ door’s top is the page’s own wall, so no second key-in box is laid over it', r.body.includes('<div id="top" data-pass-wall="https://beach.bringingtheflavour.com"></div>'));
const THEME = (await import('node:fs')).readFileSync(new URL('../theme.js', import.meta.url), 'utf8');
ok('theme.js lays neither ＋card nor share forward at a members’ door, and its go there reads the door’s own lighthouse',
  /function shareAct\(mount\)\{[\s\S]{0,400}hasAttribute\('data-door'\)\) return;/.test(THEME)
  && /function mintAct\(\)\{[\s\S]{0,600}hasAttribute\('data-door'\)\) return;/.test(THEME)
  && /if \(cfg\.door\)\{[\s\S]{0,6000}\?block=lighthouse/.test(THEME));
/* nor Share beside the door (lane share-string.1, 23 Nov 2026): a member's share goes on their own beach's string */
ok('theme.js lays no Share at a members’ door, and Share opens this String’s box with the page’s own address',
  /function sharePill\(\)\{[\s\S]{0,300}hasAttribute\('data-door'\)\) return null;/.test(THEME)
  && /a\.href = '\/string\?add=' \+ encodeURIComponent\(pageToShare\(\)\)/.test(THEME));
/* the quick way in: a card's link to this site carries its sharer, and never at a members' door */
const STRING_PAGE = (await import('node:fs')).readFileSync(new URL('../string.html', import.meta.url), 'utf8');
ok('a card’s link to this site carries ?from=<its sharer>, never at a members’ door, never to another site, never over a from',
  /function outOf\(url, by\)\{\s*if \(MEMBERS \|\| !by \|\| !OURS\.test\(url\) \|\| CARD_LINK\.test\(url\)\) return url;[\s\S]{0,120}searchParams\.has\('from'\)\) return url;/.test(STRING_PAGE)
  && /href="' \+ esc\(outOf\(url, by\)\)/.test(STRING_PAGE));

r = await call({ page: '' });
ok('the open String’s own page is unchanged', r.code === 200 && r.body.includes('beach.happyseaurchin.com/button/voice.js') && r.body.includes('href="/string.webmanifest"')
  && r.body.includes('<span class="dot"></span>') && r.body.includes('<p id="create-your-own"><a href="/">happyseaurchin.com</a></p>') && r.body.includes('<div id="top"></div>'));

console.log(bad ? bad + ' failed' : 'all well');
process.exit(bad ? 1 : 0);
