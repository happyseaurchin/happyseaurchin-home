// smoke-webllm.mjs — /webllm end to end: a real WebLLM model in headless Chromium, a real beach handler, no live writes.
//
//   (in pscale-beach)  node scripts/local-beach.mjs --dir /tmp/beach --port 8787 --origin localhost:8787
//   (here)             python3 -m http.server 8790
//   NODE_PATH=$(npm root -g) node scripts/smoke-webllm.mjs [--model SmolLM2-360M-Instruct-q4f32_1-MLC] [--shot out.png]
//
// It needs the local beach seeded with a lighthouse block and passport:sandpiper-test (the script seeds both), WebGPU
// in the headless browser (SwiftShader here: slow, f32 builds only) and the network for WebLLM (jsDelivr) and the model
// (Hugging Face, GitHub). The voice comes from the live beach and is only read; the page points at the local beach, so
// every write lands there.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODEL = arg('--model', 'SmolLM2-360M-Instruct-q4f32_1-MLC');
// --stub: a stand-in engine answers (a tool call, then a streamed reply), so the page's turn is proven where no GPU runs a
// model in time; the tool call goes to the real bsp-mcp, a read of the live beach's lighthouse
const STUB = process.argv.includes('--stub');
const SHOT = arg('--shot', '');
const SITE = arg('--site', 'http://localhost:8790');
const BEACH = arg('--beach', 'http://localhost:8787');
const NAME = arg('--name', 'sandpiper-test');
const WIRE = BEACH + '/.well-known/pscale-beach';

let passed = 0, failed = 0;
function ok(name, cond, extra) { if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.error('  ✗ ' + name + (extra ? ' — ' + extra : '')); } }
const post = (body) => fetch(WIRE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
const get = (q) => fetch(WIRE + '?' + q).then((r) => (r.ok ? r.json() : null));

await post({ block: 'lighthouse', content: { _: 'The compass for this test beach.', 1: 'The people: passports stand here.', 2: 'The first trace: leave a mark.' } });
await post({ block: 'passport:' + NAME, content: { _: 'Sandpiper is a test walker who likes tide pools and keeps notes on crabs.', 1: 'Offers: notes on crabs.', 2: 'Needs: a second pair of eyes.' } });
const before = await get('block=soft-llm-convos:' + NAME);
const engagementsBefore = before ? Object.keys(before).filter((k) => /^[1-9]$/.test(k)).length : 0;

// --disable-gpu-watchdog: SwiftShader computes on the CPU, slowly enough that Chrome's watchdog otherwise takes the device
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-gpu-watchdog', '--disable-gpu-process-crash-limit'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: SHOT ? 2 : 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.dismiss());
await page.goto(`${SITE}/webllm.html?beach=${encodeURIComponent(BEACH)}&name=${NAME}&model=${encodeURIComponent(MODEL)}`);

await page.waitForFunction(() => document.querySelector('#chips') && /lighthouse/.test(document.querySelector('#chips').textContent) && !/reading…/.test(document.querySelector('#chips').textContent), null, { timeout: 30000 });
ok('the beach is read into the window (lighthouse)', true);
const sys0 = await page.evaluate(() => window.__webllm.systemText());
ok('the window carries the lighthouse lines', /\[1\] The people: passports stand here\./.test(sys0));
ok('the model chosen by the link', (await page.$eval('#model', (s) => s.value)) === MODEL);
ok('being seen is off on a beach whose voice this page does not carry', await page.$eval('#seen', (c) => c.disabled));

// the key, kept wrapped through theme.js siteKeys
await page.check('#remember');
await page.waitForSelector('#key-row:not(.hidden)', { timeout: 5000 });
await page.fill('#key', 'test-key-1');
await page.click('#key-keep');
await page.waitForFunction(() => document.querySelector('#key-row').classList.contains('hidden'), null, { timeout: 10000 });
const plainKey = await page.evaluate(() => Object.keys(localStorage).some((k) => localStorage.getItem(k) === 'test-key-1'));
ok('the key is not kept in plain text', !plainKey);

// the mind
let loadSay = '';
if (STUB) {
  await page.evaluate(() => {
    const said = 'Hello from the stand-in. The beach says you keep notes on crabs.';
    window.__webllm.use({
      chat: { completions: { create: async (req) => {
        window.__asked = (window.__asked || []).concat([req]);
        if (req.response_format && req.response_format.type === 'structural_tag') {
          return { choices: [{ message: { content: '<tool_call>\n{"name": "bsp", "arguments": {"agent_id": "https://beach.happyseaurchin.com", "block": "lighthouse", "pscale_attention": 0, "content": "MUST NOT PASS"}}\n</tool_call>' } }] };
        }
        return (async function* () { for (const w of said.split(' ')) yield { choices: [{ delta: { content: w + ' ' } }] }; })();
      } } }
    }, 'stand-in');
  });
  await page.check('#tools');
  loadSay = 'is loaded and running (stand-in)';
} else {
  const t0 = Date.now();
  await page.click('#load');
  await page.waitForFunction(() => !document.querySelector('#send').disabled || /did not load/.test(document.querySelector('#mind-say').textContent), null, { timeout: 15 * 60000 });
  loadSay = await page.$eval('#mind-say', (e) => e.textContent);
  ok('the model loads on this device', /is loaded and running/.test(loadSay), loadSay);
  console.log(`    loaded in ${Math.round((Date.now() - t0) / 1000)} s`);
}

if (/is loaded and running/.test(loadSay)) {
  await page.fill('#text', 'What does the beach say about me?');
  const t1 = Date.now();
  await page.click('#send');
  await page.waitForFunction(() => { const m = [...document.querySelectorAll('.msg.mind')].pop(); return m && !document.querySelector('#send').disabled && m.querySelector('.text').textContent !== '…'; }, null, { timeout: 15 * 60000 });
  const reply = await page.evaluate(() => [...document.querySelectorAll('.msg.mind')].pop().querySelector('.text').textContent);
  console.log(`    replied in ${Math.round((Date.now() - t1) / 1000)} s: ${JSON.stringify(reply.slice(0, 200))}`);
  ok('the mind answers', reply && reply !== '…' && !/could not answer/.test(reply), reply);
  await page.waitForFunction(() => { const m = [...document.querySelectorAll('.msg.mind')].pop(); return m && m.querySelector('.after') && /kept|not kept/.test(m.querySelector('.after').textContent); }, null, { timeout: 30000 });
  const after = await page.evaluate(() => [...document.querySelectorAll('.msg.mind')].pop().querySelector('.after').textContent);
  if (STUB) {
    ok('its own reach: a tool call made at the real bsp-mcp', /called bsp lighthouse/.test(after), after);
    const asked = await page.evaluate(() => window.__asked.map((r) => r.messages[0].content));
    const final = asked[asked.length - 1];
    ok('what bsp-mcp returned is laid into the window before it answers', /what it read for this turn, through bsp-mcp/.test(final) && /\[disc @ pscale 0/.test(final) && /compass/i.test(final));
    ok('a write field the model was not given never reaches the server', !/MUST NOT PASS/.test(final));
  }
  ok('the turn is kept where the mirror keeps it', new RegExp('kept at soft-llm-convos:' + NAME + ' \\d+\\.1').test(after), after);
  const raw = await get('block=soft-llm-convos:' + NAME);
  const engagementsAfter = raw ? Object.keys(raw).filter((k) => /^[1-9]$/.test(k)).length : 0;
  ok('a new engagement stands on the beach', engagementsAfter === engagementsBefore + 1, `${engagementsBefore} → ${engagementsAfter}`);
  const newest = raw && raw[String(engagementsAfter)];
  ok('in the mirror\'s own shape ({_, 1, 2, 3, 4})', newest && typeof newest._ === 'string' && newest['1'] && newest['2'] === '' && newest['4'] === 'character' && /What does the beach say about me\?/.test(newest._));

  // a fresh page is a fresh session: the memory comes back into the window
  await page.reload();
  await page.waitForFunction((n) => document.querySelector('#chips').textContent.includes('soft-llm-convos:' + n), NAME, { timeout: 30000 });
  const sys1 = await page.evaluate(() => window.__webllm.systemText());
  ok('after a reload the window carries the conversation back', /this conversation so far/.test(sys1) && /What does the beach say about me\?/.test(sys1));
  if (SHOT) {
    await page.fill('#add-block', 'passport:' + NAME);
    await page.click('#add');
    await page.waitForFunction((n) => document.querySelector('#chips').textContent.includes('passport:' + n) && !/reading…/.test(document.querySelector('#chips').textContent), NAME, { timeout: 20000 });
  }
}
ok('no page errors', errors.length === 0, errors.join(' | '));
if (SHOT) await page.screenshot({ path: SHOT, fullPage: true });
await browser.close();
console.log(`\nwebllm smoke: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
