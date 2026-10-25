// pixels.js page.html … — render each page as written and as reassembled (back/, from reassemble.py),
// with CSS animations and transitions frozen so a moving page compares fairly, and compare the pixels
const { chromium } = require('playwright');
const path = require('path');
const SITE = path.resolve(__dirname, '../..'), BACK = path.resolve(__dirname, 'back');
(async () => {
  const browser = await chromium.launch();
  for (const name of process.argv.slice(2)) {
    const shots = [];
    for (const f of [path.join(SITE, name), path.join(BACK, name)]) {
      const p = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
      await p.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());  // no network: the same inputs both times
      await p.goto('file://' + f);
      await p.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
      await p.waitForTimeout(300);
      shots.push(await p.screenshot({ fullPage: true }));
      await p.close();
    }
    console.log(`${name.padEnd(28)} ${Buffer.compare(shots[0], shots[1]) === 0 ? 'PIXEL-IDENTICAL' : 'DIFFERENT'}`);
  }
  await browser.close();
})();
