const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h] of [['document', 900, 1400], ['cards', 1200, 1100], ['slides', 1000, 1300]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + process.cwd() + '/dialects/' + name + '.html');
    await p.screenshot({ path: 'dialects/' + name + '.png' });
    await p.close();
  }
  const p = await b.newPage({ viewport: { width: 1000, height: 1300 } });
  await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
  await p.goto('file://' + require('path').resolve(__dirname, '../../beach-security.html'));
  await p.screenshot({ path: 'dialects/original.png' });
  await b.close();
})();
