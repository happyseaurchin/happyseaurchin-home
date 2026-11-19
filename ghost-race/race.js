/* Ghost Race — the page (27 Oct 2026, lane ghost-race.1): the canvas, the touch, and the beach.
 *
 * The engine is ./engine.js, the circuit and the car in whole numbers. The beach is reached only through the
 * plug the page's two tags load (beachGame, the beach's button/game.js, and the voice it writes through):
 * today() for the day's address, top() for the board, re-run here by verify so only a run that finishes
 * counts, result() to put a time on the board, room() and note() for the room, wave() for who came when.
 * The ghosts are the board's own runs, re-run on this phone and drawn beside the car step by step. */
import * as E from './engine.js';

const $ = (id) => document.getElementById(id);
const PAGE = 'https://happyseaurchin.com/ghost-race';
const params = new URLSearchParams(location.search);
const reduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function put(k, v) { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) {} }
const clean = (s) => (window.cleanHandle ? window.cleanHandle(s) : String(s || '').replace(/[^a-z0-9_\s-]/gi, '').replace(/\s+/g, ' ').trim()).slice(0, 32);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plug = () => window.beachGame || null;
const myName = () => clean((window.beachVoice && window.beachVoice.name && window.beachVoice.name()) || get('ghost-race:name') || '');
const ORD = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const dateWords = (addr) => { const d = E.dayDate(addr); return d ? d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : addr; };
const SHAPE_WORDS = { wide: 'a wide loop', free: 'an odd-shaped loop', narrow: 'a long, thin loop' };

// ── what this phone keeps: the look, the sound, its tries and best on each day, who brought it ──
const SKINS = [{ id: 'car', name: 'Car' }, { id: 'boat', name: 'Boat' }];
let skin = SKINS.some((s) => s.id === get('ghost-race:skin')) ? get('ghost-race:skin') : 'car';
document.documentElement.setAttribute('data-skin', skin);
const soundOn = () => get('ghost-race:sound') !== 'off';
const allGhosts = () => get('ghost-race:ghosts') !== 'one';
if (params.get('from') && !get('ghost-race:from')) put('ghost-race:from', clean(params.get('from')));

// ── the day and its circuit ──
let TODAY = '', DAY = '', C = null, BEACH = false;
let mode = 'ready';                     // ready → race → done
let car = null, toggles = [], hold = false, armed = false, idx = 0, acc = 0, last = 0, lap = 1, tries = 0;
let ghosts = [], chosen = null, rows = [], finished = null, keptSlot = '', trail = [], showAll = false, mine = null;
const reran = new Map();                // a proof re-run once, with its track kept for drawing it

/* a run's line on the board says the time its run takes: only then, and only if it re-runs to a finish on
 * this day's circuit, does it count. The plug drops whatever this answers false. */
function rerunOf(proof) {
  if (!reran.has(proof)) reran.set(proof, E.rerun(proof, { address: DAY, circuit: C, keep: true }));
  return reran.get(proof);
}
function verify(p) {
  const r = rerunOf(p.proof || '');
  const m = /^\s*FINISHED\s+(\d+(?:\.\d+)?)\s*s\b/i.exec(p.line || '');
  return !!(r.ok && m && (+m[1]).toFixed(2) === r.time);
}

// ── drawing ──
const cv = $('game'), ctx = cv.getContext('2d');
let dpr = 1, view = null, bg = null, K = {};
function colours() {
  const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
  K = { night: v('--night'), track: v('--track'), edge: v('--edge'), glow: v('--edge-glow'), you: v('--you'), ghost: v('--ghost'),
    buzz: v('--buzz'), words: v('--words'), dim: v('--dim'), mark: v('--mark'), kerb: v('--kerb') };
}
/* the circuit fills the screen under the strip along the top, turned on its side where that fits it larger
 * (a turn, never a mirror, so every corner is still a right-hander): drawing only, nothing a run reads */
function layout() {
  if (!C) return;
  dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const vw = window.innerWidth, vh = window.innerHeight;
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  const top = document.querySelector('.hud').getBoundingClientRect().bottom + 4, bottom = 10;
  const pad = E.HW + 30000;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of C.points) { x0 = Math.min(x0, q[0] - pad); x1 = Math.max(x1, q[0] + pad); y0 = Math.min(y0, q[1] - pad); y1 = Math.max(y1, q[1] + pad); }
  const bw = x1 - x0, bh = y1 - y0, aw = vw - 16, ah = Math.max(80, vh - top - bottom);
  const up = Math.min(aw / bw, ah / bh), side = Math.min(aw / bh, ah / bw), turned = side > up * 1.12, s = turned ? side : up;
  if (turned) {
    const ox = (vw - bh * s) / 2, oy = top + (ah - bw * s) / 2;
    view = { s, m: [0, -s, s, 0, ox - y0 * s, oy + x1 * s] };
  } else {
    const ox = (vw - bw * s) / 2, oy = top + (ah - bh * s) / 2;
    view = { s, m: [s, 0, 0, s, ox - x0 * s, oy - y0 * s] };
  }
  buildBg();
  placeBrief();
}
/* the card that says the move stands where it hides neither the start line nor the car on it */
function placeBrief() {
  const b = $('brief');
  if (!view || b.hidden) return;
  const [sx, sy] = toScreen(C.points[0][0], C.points[0][1]);
  b.classList.remove('top');
  b.style.setProperty('--brief-top', (document.querySelector('.hud').getBoundingClientRect().bottom + 8) + 'px');
  const covers = () => { const r = b.getBoundingClientRect(); return sx > r.left - 40 && sx < r.right + 40 && sy > r.top - 50 && sy < r.bottom + 20; };
  if (covers()) { b.classList.add('top'); if (covers()) b.classList.remove('top'); }
}
function toScreen(x, y) { const m = view.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
function inWorld(g) { const m = view.m; g.setTransform(m[0] * dpr, m[1] * dpr, m[2] * dpr, m[3] * dpr, m[4] * dpr, m[5] * dpr); }
function trackPath() {
  const p = new Path2D();
  C.points.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  p.closePath();
  return p;
}
function buildBg() {
  if (!C || !view) return;
  colours();
  bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
  const g = bg.getContext('2d');
  g.fillStyle = K.night; g.fillRect(0, 0, bg.width, bg.height);
  inWorld(g);
  const path = trackPath();
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = K.glow; g.lineWidth = 2 * E.HW + 40000; g.stroke(path);
  g.strokeStyle = K.edge; g.lineWidth = 2 * E.HW + 9000; g.stroke(path);
  g.strokeStyle = K.track; g.lineWidth = 2 * E.HW - 3000; g.stroke(path);
  g.setLineDash([26000, 34000]); g.strokeStyle = K.mark; g.lineWidth = 2600; g.stroke(path); g.setLineDash([]);
  // the line, chequered across the track
  const p0 = C.points[0], p1 = C.points[1], sq = (2 * E.HW) / 8;
  g.save(); g.translate(p0[0], p0[1]); g.rotate(Math.atan2(p1[1] - p0[1], p1[0] - p0[0]));
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? K.kerb : K.night; g.fillRect((j - 1) * sq, -E.HW + i * sq, sq, sq); }
  g.restore();
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
/* a car, or a boat: whichever the skin draws, at the run's own place and heading */
function vehicle(x, y, hx, hy, colour, alpha) {
  ctx.save(); inWorld(ctx); ctx.translate(x, y); ctx.rotate(Math.atan2(hy, hx)); ctx.globalAlpha = alpha;
  if (skin === 'boat') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(-17000, -8000); ctx.lineTo(-34000, -15000); ctx.lineTo(-34000, 15000); ctx.lineTo(-17000, 8000); ctx.fill();
    ctx.fillStyle = colour;
    ctx.beginPath(); ctx.moveTo(24000, 0); ctx.quadraticCurveTo(10000, -12000, -18000, -10000); ctx.lineTo(-18000, 10000); ctx.quadraticCurveTo(10000, 12000, 24000, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; rr(ctx, -9000, -5000, 10000, 10000, 2500); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for (const [wx, wy] of [[-15000, -13000], [-15000, 9500], [8000, -13000], [8000, 9500]]) ctx.fillRect(wx, wy, 8000, 3500);
    ctx.fillStyle = colour; rr(ctx, -20000, -10000, 40000, 20000, 6000); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; rr(ctx, 1500, -7000, 9000, 14000, 2500); ctx.fill();
  }
  ctx.restore();
}
function tag(x, y, text, colour, alpha) {
  const [sx, sy] = toScreen(x, y);
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = alpha;
  ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = colour; ctx.textAlign = 'center';
  ctx.fillText(text, sx, sy - 12);
  ctx.restore();
}
function paint() {
  if (!bg) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  if (trail.length) { ctx.save(); inWorld(ctx); ctx.fillStyle = K.mark; for (const p of trail) ctx.fillRect(p[0] - 2600, p[1] - 2600, 5200, 5200); ctx.restore(); }
  const at = mode === 'ready' ? 0 : mode === 'done' && finished ? finished.steps : idx;
  for (const g of ghosts) {
    if (!showAll && !g.main && !g.mine) continue;
    const k = Math.min(at, g.steps), T = g.track, past = at > g.steps;
    const a = (g.main ? 0.62 : g.mine ? 0.45 : 0.3) * (past ? 0.35 : 1);
    vehicle(T.xs[k], T.ys[k], T.hxs[k], T.hys[k], g.mine ? K.you : K.ghost, a);
    // named while it races: at the start and the finish every car stands on the line, and the strip names them
    if ((g.main || g.mine) && mode === 'race' && !past && at > 30) tag(T.xs[k], T.ys[k], g.mine ? 'your best' : g.name, g.mine ? K.you : K.ghost, Math.min(1, a + 0.3));
  }
  if (car) {
    vehicle(car.x, car.y, car.hx, car.hy, K.you, 1);
    if (car.pause > 0) {
      const [sx, sy] = toScreen(car.x, car.y);
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = K.buzz; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx, sy, reduce.matches ? 14 : 10 + (30 - car.pause) * 0.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }
  $('time').textContent = E.timeWords(at);
}

// ── the race ──
function sub(text) { $('sub').textContent = text; }
function readyWords() {
  return (DAY === TODAY ? 'Today’s circuit: ' : dateWords(DAY) + '’s circuit: ') + SHAPE_WORDS[C.shape] + ' with ' + E.circuitWords(C) + '.';
}
function ready(short) {
  mode = 'ready'; car = C ? E.start(C) : null; idx = 0; trail = []; finished = null; hold = false; armed = false; keptSlot = '';
  if (relay) relayout();
  pointers.clear(); keys.clear();
  $('end').hidden = true;
  $('brief').hidden = false; $('brief').classList.toggle('short', !!short);
  if (C) sub(readyWords());
  placeBrief();
}
function go() {
  if (!C || mode !== 'ready') return;
  mode = 'race'; car = E.start(C); toggles = []; hold = false; armed = false; idx = 0; acc = 0; trail = []; lap = 1; finished = null; keptSlot = '';
  tries = +(get('ghost-race:tries:' + DAY) || 0) + 1; put('ghost-race:tries:' + DAY, tries);
  $('brief').hidden = true;
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  audio(); sound('go');
  sub('Lap 1 of ' + E.LAPS);
}
function tick() {
  const steer = armed && pressed();          // the press that starts the race does not steer: it starts it
  if (steer !== hold) { hold = steer; toggles.push(idx); }
  E.step(C, car, hold);
  idx++;
  if (car.crashed) { sound('crash'); buzz(70); flash(true); }
  else if (car.scrape && idx % 6 === 0) sound('scrape');
  if (!car.pause && flashing) flash(false);
  if (hold && !reduce.matches) { trail.push([car.x, car.y]); if (trail.length > 120) trail.shift(); }
  const now = E.lapOf(C, car);
  if (now !== lap && !car.done) { lap = now; sound('lap'); sub('Lap ' + lap + ' of ' + E.LAPS + (car.crashes ? ' · ' + car.crashes + (car.crashes === 1 ? ' crash' : ' crashes') : '')); }
  if (car.done) finish();
  else if (idx >= E.MAX_STEPS) outOfTime();
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = last ? t - last : 0; last = t;
  if (mode === 'race' && !open()) {
    acc += Math.min(dt, 250);
    let n = 0;
    while (acc >= 1000 / E.RATE && n < 8 && mode === 'race') { tick(); acc -= 1000 / E.RATE; n++; }
    if (n === 8) acc = 0;
  }
  paint();
}
function finish() {
  mode = 'done';
  const proof = E.encode(DAY, car.steps, toggles), check = E.rerun(proof, { address: DAY, circuit: C, keep: true });
  finished = { steps: car.steps, time: E.timeWords(car.steps), proof, ok: check.ok, crashes: car.crashes };
  if (check.ok) {
    reran.set(proof, check);
    const best = E.decode(get('ghost-race:best:' + DAY) || '');
    if (!best || car.steps < best.steps) put('ghost-race:best:' + DAY, proof);
  }
  sound('finish'); buzz([30, 40, 30]); flash(false);
  sub('Finished');
  if (relay) relayout();
  setGhosts(); showEnd();
}
function outOfTime() {
  mode = 'done'; finished = null; flash(false);
  sub('Out of time');
  $('end-time').textContent = 'Out of time';
  $('end-line').textContent = 'Three minutes is the most a race can take. The next one starts the moment you tap.';
  $('end-rank').textContent = ''; $('keep').hidden = true; $('keep-state').textContent = ''; $('made').hidden = true; $('challenge').hidden = true;
  $('end').hidden = false;
}

// ── the touch, the keys and the mouse: one move, holding ──
const pointers = new Set(), keys = new Set();
const pressed = () => pointers.size > 0 || keys.size > 0;
function released() { if (mode === 'race' && !armed && !pressed()) armed = true; }
const open = () => !$('board').hidden || !$('look').hidden || !$('end').hidden;
cv.addEventListener('pointerdown', (e) => {
  if (open() || (e.pointerType === 'mouse' && e.button !== 0)) return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  pointers.add(e.pointerId);
  if (mode === 'ready') go();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(ev, (e) => { if (pointers.delete(e.pointerId)) released(); });
cv.addEventListener('contextmenu', (e) => e.preventDefault());
const KEYS = new Set([' ', 'Spacebar', 'Enter', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft']);
const typing = (e) => { const t = e.target; return !!t && (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName) || t.isContentEditable); };
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeAll(); return; }
  if (!KEYS.has(e.key) || typing(e) || open()) return;
  e.preventDefault();
  if (e.repeat) return;
  keys.add(e.key);
  if (mode === 'ready') go();
});
window.addEventListener('keyup', (e) => { if (keys.delete(e.key)) released(); });
window.addEventListener('blur', () => { pointers.clear(); keys.clear(); released(); });
document.addEventListener('visibilitychange', () => { last = 0; acc = 0; if (document.hidden) { pointers.clear(); keys.clear(); released(); } });

// ── sound and vibration, both off with one switch ──
let actx = null;
function audio() { if (!soundOn() || actx) return; try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
function tone(f, d, type, gain) {
  if (!actx || !soundOn()) return;
  try {
    const t = actx.currentTime, o = actx.createOscillator(), v = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); v.gain.setValueAtTime(gain, t); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(v); v.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
  } catch (e) {}
}
function sound(kind) {
  if (kind === 'go') tone(523, 0.12, 'square', 0.04);
  else if (kind === 'lap') { tone(660, 0.1, 'triangle', 0.07); setTimeout(() => tone(880, 0.12, 'triangle', 0.07), 90); }
  else if (kind === 'crash') tone(85, 0.32, 'sawtooth', 0.11);
  else if (kind === 'scrape') tone(190, 0.05, 'square', 0.02);
  else if (kind === 'finish') [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.08), i * 110));
}
function buzz(p) { if (soundOn() && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }
let flashing = false;
function flash(on) { flashing = on; $('flash').classList.toggle('hidden', !on); }

// ── the ghosts: the day's fastest runs of other players, a link's challenge, and this phone's own best ──
function setGhosts() {
  const me = myName(), list = [];
  if (chosen) list.push(Object.assign({}, chosen, { main: true }));
  for (const r of rows) {
    if (list.filter((g) => !g.mine).length >= 5) break;
    if ((me && r.name === me) || !r.proof || (chosen && r.proof.slot === chosen.slot)) continue;
    const run = rerunOf(r.proof.text || '');
    if (run.ok) list.push({ name: r.name, steps: run.steps, time: run.time, track: run.track, main: !list.length, slot: r.proof.slot });
  }
  const own = get('ghost-race:best:' + DAY);
  if (own) { const run = rerunOf(own); if (run.ok) list.push({ name: 'your best', steps: run.steps, time: run.time, track: run.track, mine: true }); }
  ghosts = list; showAll = allGhosts();
  const main = list.find((g) => g.main), more = list.filter((g) => !g.main && !g.mine).length;
  const line = $('ghostline');
  if (main) line.innerHTML = (chosen ? 'Racing <b>' + esc(main.name) + '</b>’s challenge, ' : 'Racing <b>' + esc(main.name) + '</b>, the fastest on this circuit, ') + esc(main.time) + ' s' + (showAll && more ? ', and ' + more + ' more' : '') + '.';
  else line.textContent = BEACH ? 'Nobody has a time on this circuit yet: yours can be the ghost everyone races.' : 'The beach can’t be reached just now, so no ghost: the race still runs.';
}

// ── the finish: the time, the board, a name ──
function rankWords() {
  const better = rows.filter((r) => r.score < +finished.time && r.name !== myName()).length;
  const n = rows.filter((r) => r.name !== myName()).length + 1;
  return n === 1 ? 'Nobody else has a time on this circuit yet.' : better === 0 ? 'Fastest of ' + n + ' on this circuit.' : 'That’s ' + ORD(better + 1) + ' of ' + n + ' on this circuit.';
}
function showEnd() {
  $('end-time').textContent = finished.time + ' s';
  const main = ghosts.find((g) => g.main);
  let line = (tries === 1 ? '1st try' : ORD(tries) + ' try') + (DAY === TODAY ? ' today' : ' on this circuit');
  if (finished.crashes) line += ', ' + finished.crashes + (finished.crashes === 1 ? ' crash' : ' crashes');
  if (main) {
    const d = finished.steps - main.steps, s = E.timeWords(Math.abs(d));
    line += '. ' + (d < 0 ? s + ' s faster than ' + main.name + '’s ghost' : d > 0 ? s + ' s behind ' + main.name + '’s ghost' : 'dead level with ' + main.name + '’s ghost');
  }
  $('end-line').textContent = line + '.';
  $('end-rank').textContent = rankWords();
  $('keep').hidden = !(finished.ok && plug());
  $('keep-btn').disabled = false;
  $('who').value = myName();
  $('keep-state').textContent = plug() ? '' : 'The beach can’t be reached just now, so this time stays on this phone.';
  $('made').hidden = true; $('challenge').hidden = true; $('share-note').textContent = '';
  $('end').hidden = false;
}
async function keep() {
  const g = plug();
  if (!g || !finished || !finished.ok) return;
  const name = clean($('who').value);
  $('keep-btn').disabled = true; $('keep-state').textContent = 'Putting it on the board…';
  const r = await g.result({ at: DAY, line: 'FINISHED ' + finished.time + 's', proof: finished.proof, name: name || undefined, tries: String(tries), from: get('ghost-race:from') || undefined });
  if (!r || !r.ok) {
    $('keep-btn').disabled = false;
    $('keep-state').textContent = r && r.quiet ? 'Not kept: the key for that name wasn’t given.' : 'That didn’t reach the beach: ' + ((r && r.error) || 'no answer') + '.';
    return;
  }
  keptSlot = r.slot || ''; put('ghost-race:name', r.name); $('who').value = r.name; $('note-who').value = r.name;
  /* the fold is read once for a crowd and kept a few seconds, so the board shows this time at once and the
   * fold catches up */
  if (r.said) mine = { day: DAY, name: r.name, row: { name: r.name, line: 'FINISHED ' + finished.time + 's', score: +finished.time, proof: { room: 'pool:ghost-race', slot: keptSlot, text: finished.proof, tries: String(tries) } } };
  $('keep').hidden = true;
  $('keep-state').textContent = r.said ? 'Your time is on the board as ' + r.name + '.' : 'Kept in the room as ' + r.name + '; your best on this circuit still stands on the board.';
  const made = g.made();
  if (made) {
    const m = $('made');
    m.innerHTML = 'This phone made you a name, <b>' + esc(made.name) + '</b>, and a key, <code>' + esc(made.key) + '</code>. Both are kept on this phone; note the key to race as ' + esc(made.name) + ' on another.';
    m.hidden = false;
  }
  $('challenge').hidden = !keptSlot;
  refreshBoard(true);
  if (g.present) g.present(true).catch(() => {});
}
async function share(url, text, where) {
  try {
    if (navigator.share) { await navigator.share({ title: 'Ghost Race', text, url }); where.textContent = ''; return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); where.textContent = 'The link is copied: ' + url; }
  catch (e) { where.textContent = 'Send them this link: ' + url; }
}

// ── the board, the wave, the room, other days ──
async function refreshBoard(fresh) {
  const g = plug();
  if (!g) { $('board-sum').textContent = 'The beach can’t be reached just now, so there is no board and no ghost; the race still runs.'; return; }
  const b = await g.top({ at: DAY, n: 200, verify, fresh: !!fresh });
  if (!b || !b.ok) { $('board-sum').textContent = 'The board can’t be read just now: ' + ((b && b.error) || 'no answer') + '.'; return; }
  rows = b.top;
  if (mine && mine.day === DAY) {
    const at = rows.findIndex((r) => r.name === mine.name);
    if (at < 0 || rows[at].score > mine.row.score) { if (at >= 0) rows.splice(at, 1); rows.push(mine.row); rows.sort((a, b) => a.score - b.score); }
  }
  setGhosts(); drawBoard();
}
function drawBoard() {
  const list = $('board-list'), me = myName(), cut = $('board-more').getAttribute('aria-expanded') === 'true' ? rows.length : 5;
  list.textContent = '';
  rows.slice(0, cut).forEach((r, i) => {
    const li = document.createElement('li');
    if (me && r.name === me) li.className = 'me';
    const t = r.proof && r.proof.tries ? (r.proof.tries === '1' ? '1st try' : r.proof.tries + ' tries') : '';
    li.innerHTML = '<span class="rank">' + (i + 1) + '</span><span class="name" data-name="' + esc(r.name) + '">' + esc(r.name) + '</span>' +
      '<span class="t">' + esc((+r.score).toFixed(2)) + ' s' + (t ? '<span class="tries">' + esc(t) + '</span>' : '') + '</span>';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'plain'; btn.textContent = 'Race';
    btn.setAttribute('aria-label', 'Race ' + r.name + '’s ghost');
    btn.addEventListener('click', () => pick(r));
    if (me && r.name === me) btn.style.visibility = 'hidden';
    li.appendChild(btn);
    list.appendChild(li);
  });
  const more = $('board-more');
  more.hidden = rows.length <= 5;
  more.textContent = more.getAttribute('aria-expanded') === 'true' ? 'Show the top five' : 'Show all ' + rows.length;
  $('board-title').textContent = DAY === TODAY ? 'Today’s board' : dateWords(DAY) + '’s board';
  $('board-sum').textContent = rows.length
    ? rows.length + (rows.length === 1 ? ' player' : ' players') + ' on this circuit, each one’s best, every run re-run on this phone before it counts.'
    : 'Nobody has a time on this circuit yet. The first is yours to make.';
  if (window.nameLinks) window.nameLinks(list);
}
function pick(r) {
  if (!r.proof) return;
  const run = rerunOf(r.proof.text || '');
  if (!run.ok) return;
  chosen = { name: r.name, steps: run.steps, time: run.time, track: run.track, slot: r.proof.slot };
  setGhosts(); closeAll(); if (mode !== 'race') ready(true);
}
async function refreshWave() {
  const g = plug();
  if (!g) return;
  const [w, room] = await Promise.all([g.wave(), g.room({ n: 3000 })]);
  if (!w || !w.ok) { $('wave-line').textContent = 'The wave can’t be read just now.'; return; }
  const lines = (room && room.ok && room.lines) || [], brought = {}, me = myName();
  lines.forEach((x) => { if (x.from && x.name && !brought[x.name]) brought[x.name] = x.from; });
  const ps = w.players, svg = $('wave');
  if (!ps.length) { svg.innerHTML = ''; $('wave-line').textContent = 'Nobody has come yet: the first to put a time on the board starts the wave.'; $('stood').hidden = true; return; }
  const t0 = Date.parse(ps[0].at), t1 = Math.max(Date.parse(ps[ps.length - 1].at), t0 + 60000);
  const part = (p) => (w.parts.spark.includes(p) ? 'spark' : w.parts.flame.includes(p) ? 'flame' : 'tinder');
  const at = ps.map((p, i) => ({ p, x: 14 + (Date.parse(p.at) - t0) / (t1 - t0) * 292, y: 136 - (i + 1) / ps.length * 122 }));
  const where = {}; at.forEach((a) => { where[a.p.name] = a; });
  let s = '<line x1="14" y1="136" x2="306" y2="136" stroke="var(--line)"/>';
  at.forEach((a) => { const b = where[brought[a.p.name]]; if (b) s += '<line x1="' + b.x.toFixed(1) + '" y1="' + b.y.toFixed(1) + '" x2="' + a.x.toFixed(1) + '" y2="' + a.y.toFixed(1) + '" stroke="var(--dim)" stroke-width="0.8" opacity="0.7"/>'; });
  at.forEach((a) => { const c = { tinder: 'var(--dim)', spark: 'var(--you)', flame: 'var(--ghost)' }[part(a.p)];
    s += '<circle cx="' + a.x.toFixed(1) + '" cy="' + a.y.toFixed(1) + '" r="' + (a.p.name === me ? 5 : 3.2) + '" fill="' + c + '"' + (a.p.name === me ? ' stroke="var(--words)" stroke-width="1.2"' : '') + '><title>' + esc(a.p.name) + '</title></circle>'; });
  svg.innerHTML = s;
  const n = (k) => w.parts[k].length;
  $('wave-line').textContent = ps.length + (ps.length === 1 ? ' player' : ' players') + ' so far' + (ps.length >= 3 ? ': the tinder before it caught (' + n('tinder') + '), the spark when people came fastest (' + n('spark') + '), the flame since (' + n('flame') + ').' : '.');
  const i = ps.findIndex((p) => p.name === me), stood = $('stood-list');
  stood.textContent = '';
  if (i >= 0) {
    const say = (t) => { const li = document.createElement('li'); li.textContent = t; stood.appendChild(li); };
    say('You came in the ' + part(ps[i]) + ', the ' + ORD(i + 1) + ' to put a time on the board.');
    if (brought[me]) say(brought[me] + ' brought you.');
    const mine = Object.keys(brought).filter((k) => brought[k] === me);
    say(mine.length ? 'You brought ' + mine.length + ': ' + mine.join(', ') + '.' : 'You haven’t brought anyone yet.');
    const near = [ps[i - 1], ps[i + 1]].filter(Boolean).map((p) => p.name);
    if (near.length) say('Nearest you in the wave: ' + near.join(' and ') + '.');
    if (w.caught) say('It caught at ' + new Date(w.caught).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ', which no single player saw.');
  }
  $('stood').hidden = i < 0;
}
const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso || '')) / 60000); return isNaN(m) ? '' : m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
async function refreshRoom() {
  const g = plug(), list = $('room-list');
  if (!g) return;
  const r = await g.room({ n: 30 });
  list.textContent = '';
  if (!r || !r.ok) { list.innerHTML = '<li>The room can’t be read just now.</li>'; return; }
  if (!r.lines.length) { list.innerHTML = '<li>Nothing said in the room yet.</li>'; return; }
  r.lines.slice().reverse().forEach((x) => {
    const li = document.createElement('li'), d = E.decode(x.proof);
    li.innerHTML = '<b data-name="' + esc(x.name || '') + '">' + esc(x.name || 'a visitor') + '</b> ' +
      (d ? 'raced ' + esc(d.address === TODAY ? 'today’s circuit' : dateWords(d.address)) + ' in ' + esc(E.timeWords(d.steps)) + ' s · <a href="/ghost-race?track=' + d.address + '&ghost=' + encodeURIComponent(x.slot) + '">race it</a>' : esc(x.text)) +
      '<span class="when">' + esc(ago(x.when)) + '</span>';
    list.appendChild(li);
  });
  if (window.nameLinks) window.nameLinks(list);
}
function drawDays() {
  const ul = $('days'), base = E.dayDate(TODAY) || new Date();
  ul.textContent = '';
  for (let i = 0; i < 8; i++) {
    const a = E.dayAddress(new Date(base.getTime() - i * 86400000)), li = document.createElement('li');
    li.innerHTML = (a === DAY ? '<b>' + esc(dateWords(a)) + '</b> · showing' : '<a href="/ghost-race' + (i ? '?track=' + a : '') + '">' + esc(dateWords(a)) + '</a>') + (i === 0 ? ' · today' : '');
    ul.appendChild(li);
  }
}

// ── the sheets ──
function openBoard(focusNotes) {
  pointers.clear(); keys.clear(); released();
  $('board').hidden = false;
  refreshBoard(false); refreshWave(); refreshRoom(); drawDays();
  if (!$('note-who').value) $('note-who').value = myName();
  if (focusNotes) setTimeout(() => $('note-box').focus(), 50);
}
function closeAll() { $('board').hidden = true; $('look').hidden = true; if (mode !== 'done') $('end').hidden = true; }
$('board-btn').addEventListener('click', (e) => { e.currentTarget.blur(); openBoard(false); });
$('board-close').addEventListener('click', () => { $('board').hidden = true; });
$('end-board').addEventListener('click', () => openBoard(false));
$('board-more').addEventListener('click', () => { const m = $('board-more'); m.setAttribute('aria-expanded', m.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'); drawBoard(); });
$('look-btn').addEventListener('click', (e) => { e.currentTarget.blur(); pointers.clear(); keys.clear(); released(); $('look').hidden = false; });
$('look-close').addEventListener('click', () => { $('look').hidden = true; });
$('again-btn').addEventListener('click', (e) => { e.currentTarget.blur(); if (C) ready(true); });
$('again').addEventListener('click', () => ready(true));
$('keep-btn').addEventListener('click', keep);
$('who').addEventListener('keydown', (e) => { if (e.key === 'Enter') keep(); });
$('challenge').addEventListener('click', () => {
  if (!keptSlot) return;
  const name = myName(), url = PAGE + '?track=' + DAY + '&ghost=' + encodeURIComponent(keptSlot) + (name ? '&from=' + encodeURIComponent(name) : '');
  share(url, 'Race my ghost on the Ghost Race circuit: ' + (finished ? finished.time + ' s.' : ''), $('share-note'));
});
$('bring').addEventListener('click', () => {
  const name = myName();
  if (!name) { $('bring-note').textContent = 'Put a time on the board first, so whoever you bring is linked to your name.'; return; }
  share(PAGE + '?from=' + encodeURIComponent(name), 'Come and race on Ghost Race: a new circuit every day.', $('bring-note'));
});
const noteBox = $('note-box'), clearDraft = window.keepDraft ? window.keepDraft(noteBox, 'ghost-race:room') : () => {};
$('note-send').addEventListener('click', async () => {
  const g = plug(), text = noteBox.value.trim();
  if (!g || !text) return;
  $('note-send').disabled = true; $('note-state').textContent = 'Sending…';
  const r = await g.note({ text, name: clean($('note-who').value) || undefined, at: DAY });
  $('note-send').disabled = false;
  if (r && r.ok) { noteBox.value = ''; clearDraft(); $('note-state').textContent = 'Thank you: your note is in the room.'; refreshRoom(); }
  else $('note-state').textContent = 'That didn’t reach the beach: ' + ((r && r.error) || 'no answer') + '.';
});
function drawSkins() {
  const box = $('skins');
  box.textContent = '';
  SKINS.forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'plain'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(k.id === skin)); b.textContent = k.name;
    b.addEventListener('click', () => { skin = k.id; put('ghost-race:skin', skin); document.documentElement.setAttribute('data-skin', skin); drawSkins(); });
    box.appendChild(b);
  });
}
function drawSwitches() {
  $('noise').setAttribute('aria-pressed', String(soundOn())); $('noise').textContent = 'Sound and vibration: ' + (soundOn() ? 'on' : 'off');
  $('ghosts-btn').setAttribute('aria-pressed', String(allGhosts())); $('ghosts-btn').textContent = allGhosts() ? 'Race all of today’s fastest' : 'Race only the fastest';
}
$('noise').addEventListener('click', () => { put('ghost-race:sound', soundOn() ? 'off' : 'on'); drawSwitches(); if (soundOn()) audio(); });
$('ghosts-btn').addEventListener('click', () => { put('ghost-race:ghosts', allGhosts() ? 'one' : 'all'); drawSwitches(); setGhosts(); });
// the light, the dark and the skin redraw the circuit in their colours
new MutationObserver(() => buildBg()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-skin'] });
/* the circuit is laid out under the strip along the top, and never moved while a race is on */
let relay = false;
function relayout() { if (mode === 'race') relay = true; else { relay = false; layout(); } }
window.addEventListener('resize', relayout);
if (window.ResizeObserver) new ResizeObserver(() => { if (view) relayout(); }).observe(document.querySelector('.hud'));

// ── the day, from the beach's clock ──
/* for anyone who asks their device for less motion, the picture of the move holds still, mid-turn */
function stillness() {
  const svg = document.querySelector('.brief .how');
  if (!svg || !svg.pauseAnimations) return;
  if (reduce.matches) { svg.pauseAnimations(); try { svg.setCurrentTime(1.55); } catch (e) {} } else svg.unpauseAnimations();
}
if (reduce.addEventListener) reduce.addEventListener('change', stillness);
async function begin() {
  drawSkins(); drawSwitches(); stillness();
  const g = plug();
  let law = null;
  if (g) law = await Promise.race([g.law(), new Promise((ok) => setTimeout(() => ok(null), 6000))]);
  BEACH = !!(law && law.ok !== false && law.board);
  TODAY = g ? g.today() : E.dayAddress(new Date());
  // a link's ghost: a run kept in the room, raced on its own day's circuit
  let challenge = null;
  if (BEACH && /^\d+$/.test(params.get('ghost') || '')) {
    const room = await g.room({ n: 5000 });
    const hit = room && room.ok ? room.lines.find((x) => x.slot === params.get('ghost')) : null;
    if (hit && E.decode(hit.proof)) challenge = { name: hit.name || 'a visitor', proof: hit.proof, slot: hit.slot };
  }
  const asked = challenge ? E.decode(challenge.proof).address : params.get('track');
  DAY = asked && E.dayDate(asked) && asked <= TODAY ? asked : TODAY;
  C = E.circuit(DAY);
  if (challenge) {
    const run = rerunOf(challenge.proof);
    if (run.ok) chosen = { name: challenge.name, steps: run.steps, time: run.time, track: run.track, slot: challenge.slot };
  }
  layout(); ready(false); setGhosts();
  requestAnimationFrame(frame);
  if (BEACH) refreshBoard(false);
  window.__race = { E, circuit: () => C, day: () => DAY, today: () => TODAY, mode: () => mode, car: () => car, ghosts: () => ghosts, rows: () => rows, finished: () => finished, proofNow: () => (car ? E.encode(DAY, car.steps, toggles) : '') };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', begin); else begin();
