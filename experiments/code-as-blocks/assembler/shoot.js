const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const jobs = [
    ['live', 'https://happyseaurchin.com/proposal/leros-on-the-commons', 'light'],
    ['standard', 'file://' + process.cwd() + '/leros-standard.html', 'light'],
    ['matthew', 'file://' + process.cwd() + '/leros-matthew.html', 'light'],
    ['matthew-dark', 'file://' + process.cwd() + '/leros-matthew.html', 'dark'],
    ['standard-phone', 'file://' + process.cwd() + '/leros-standard.html', 'dark', 390],
  ];
  for (const [name, url, scheme, w] of jobs) {
    const ctx = await b.newContext({ viewport: { width: w || 1100, height: 1500 }, colorScheme: scheme });
    const p = await ctx.newPage();
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => errors.push('load: ' + e.message));
    await p.waitForTimeout(name === 'live' ? 4000 : 800);
    const sideways = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await p.screenshot({ path: name + '.png' });
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    console.log(name.padEnd(15), 'page height', h, 'px', sideways ? '· SIDEWAYS SCROLL' : '', errors.length ? '· errors: ' + errors.join(' | ').slice(0, 160) : '');
    await ctx.close();
  }
  await b.close();
})();
