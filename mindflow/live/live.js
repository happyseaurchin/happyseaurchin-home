// mindflow/live — what a talk says, behind the speaker as he talks.
//
// The image cloud (the default): the words and ideas grow as live pictures, placed by Mindflow's rules
// (cloud.js), each idea drawn as a motif lifted from the films (motifs/), and the Mac's Haiku composes
// pictures from them. ?mode=films shows the films instead, one whole film at a time, chosen from the words.
//
//   ?source=wss://<host>   follow the Mac: verso's host (stage mode) hears the phone through whisper,
//                          chooses by keywords and by Haiku, and sends {heard}, {film} and {compose} here
//   ?listen                hear this room through this computer's own microphone (Chrome's speech
//                          recognition), by keywords alone: no key ever lives on this computer
//   ?mode=films            the films, one at a time, instead of the cloud
//   ?hold=30               (films) the least seconds a film stays before a weaker match may replace it
//   ?film=<name>           open on one film (to check it on the projector)
//   ?debug                 show why each film was chosen, or what the cloud holds
//
// A film picked on the phone shows over the cloud for 90 s. Keys: f fullscreen, 0 back to the words
// (the cloud), a back to the chooser.

const params = new URLSearchParams(location.search);
const view = params.get('mode') === 'films' ? 'films' : 'cloud';
const HOLD_MS = (parseFloat(params.get('hold')) || 30) * 1000;
const MANUAL_MS = 90 * 1000;       // a pick from the phone holds the screen this long against the chooser
const STRONG_GAP_MS = 15 * 1000;   // even a strong match waits this long after the last change
const PENDING_MS = 25 * 1000;      // a match the hold kept back still counts this long
const MIN_PLAY_MS = 60 * 1000;     // a film plays at least this long before it may fade to the words ...
const QUIET_MS = 100 * 1000;       // ... once its idea has gone unheard this long
const WINDOW_MS = 30 * 1000;       // the words the keyword chooser weighs
const FADE_S = 12;                 // a mention's weight falls by e every this many seconds

const stage = document.getElementById('stage');
const captionEl = document.getElementById('caption');
const dotEl = document.getElementById('dot');
const startBtn = document.getElementById('start');
const debugEl = document.getElementById('debug');

// ── The catalogue: concepts → films ────────────────────────

let catalogue = { concepts: [], films: {} };
let matchers = [];

function norm(s) {
  return s.toLowerCase().replace(/→/g, ' to ').replace(/[^a-z0-9]+/g, ' ').trim();
}

async function loadCatalogue() {
  try {
    catalogue = await (await fetch('catalogue.json', { cache: 'no-store' })).json();
  } catch (e) {
    console.warn('no catalogue', e);
  }
  matchers = (catalogue.concepts || []).map(c => ({
    films: c.films,
    words: Object.entries(c.words).map(([w, weight]) => ({
      weight,
      re: new RegExp('(^| )' + norm(w).split(' ').join(' ?') + '(s|es)?(?= |$)', 'g'),
    })),
  }));
}

function known(film) {
  return !catalogue.films || !Object.keys(catalogue.films).length || film in catalogue.films;
}

// ── The keyword chooser (?listen; the Mac runs the same one, and Haiku beside it) ──

const heard = [];   // {t, text} — the recent phrases, normalised

function chooseFromWords(phrase) {
  const t = Date.now();
  heard.push({ t, text: norm(phrase) });
  while (heard.length && t - heard[0].t > WINDOW_MS) heard.shift();
  const latest = [];
  const scores = matchers.map(m => {
    let s = 0, last = 0;
    heard.forEach((h, i) => {
      const k = Math.exp(-(t - h.t) / 1000 / FADE_S);
      for (const w of m.words) {
        const n = (h.text.match(w.re) || []).length;
        if (n) { s += n * w.weight * k; if (i === heard.length - 1) last += n * w.weight; }
      }
    });
    latest.push(last);
    return s;
  });
  const order = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]);
  const best = order[0];
  if (best === undefined || scores[best] < 0.6 || !latest[best]) return;   // answer what was just said
  const strong = scores[best] >= 2.2 && scores[best] - (scores[order[1]] || 0) >= 1.0;
  propose({ type: 'film', films: matchers[best].films, strong, why: 'words', phrase, score: +scores[best].toFixed(2) });
}

// ── Keeping it calm: what is shown, and for how long ───────

const shownAt = new Map();          // film → when it was last shown
let cur = { film: null, since: 0, heardAt: 0 };
let manualUntil = 0;
let pending = null;
let lastChange = 0;
let lastProposal = null;

function pickFilm(films) {
  const t = Date.now();
  films = films.filter(known);
  if (!films.length) return null;
  if (cur.film && films.includes(cur.film)) return cur.film;
  const fresh = films.filter(f => !shownAt.has(f) || t - shownAt.get(f) > 10 * 60 * 1000);
  if (fresh.length) return fresh[0];
  return [...films].sort((a, b) => shownAt.get(a) - shownAt.get(b))[0];
}

function propose(p) {
  const t = Date.now();
  lastProposal = Object.assign({ at: t }, p);
  if (view === 'cloud') {                       // the cloud: a pick from the phone shows its film a while; the chooser feeds the cloud
    if (p.why === 'release') { manualUntil = 0; if (cur.film) show(null); }
    else if (p.why === 'manual') { manualUntil = t + MANUAL_MS; if ((p.film || null) !== cur.film) show(p.film || null); }
    else CLOUD.idea(p);
    return;
  }
  if (p.why === 'release') { manualUntil = 0; return; }
  if (p.why === 'manual') {
    manualUntil = t + MANUAL_MS;
    pending = null;
    if ((p.film || null) !== cur.film) show(p.film || null);
    else cur.heardAt = t;
    return;
  }
  if (t < manualUntil) return;
  const film = pickFilm(p.films && p.films.length ? p.films : (p.film ? [p.film] : []));
  if (!film) return;
  if (film === cur.film) { cur.heardAt = t; pending = null; return; }
  const held = t - cur.since;
  if (!cur.film || held >= HOLD_MS || (p.strong && t - lastChange >= STRONG_GAP_MS)) {
    pending = null;
    show(film);
  } else {
    pending = { film, at: t };
  }
}

setInterval(() => {
  const t = Date.now();
  if (view === 'cloud') {
    if (cur.film && t >= manualUntil) show(null);
  } else if (t >= manualUntil) {
    if (pending && t - pending.at > PENDING_MS) pending = null;
    if (pending && cur.film && t - cur.since >= HOLD_MS) {
      const f = pending.film;
      pending = null;
      if (f !== cur.film) show(f);
    } else if (cur.film && t - cur.since >= MIN_PLAY_MS && t - cur.heardAt >= QUIET_MS) {
      show(null);
    }
  }
  if (debugEl.style.display === 'block') showDebug();
}, 1000);

// ── Showing a film: a new frame fades in over the old ──────

let gen = 0;

function show(film) {
  const t = Date.now();
  lastChange = t;
  cur = { film, since: t, heardAt: t };
  if (film) shownAt.set(film, t);
  document.body.classList.toggle('film-on', !!film);
  if (view === 'cloud') CLOUD.visible(!film);
  retarget();
  const my = ++gen;
  const olds = [...stage.children];
  const retire = () => olds.forEach(el => { el.classList.remove('on'); setTimeout(() => el.remove(), 3000); });
  if (!film) { retire(); return; }
  const still = /\.(jpe?g|png|webp)$/i.test(film);
  const el = document.createElement(still ? 'img' : 'iframe');
  el.className = 'film';
  if (!still) { el.setAttribute('tabindex', '-1'); el.setAttribute('aria-hidden', 'true'); }
  el.src = '/animations/' + film + (still ? '' : '.html');
  let done = false;
  const reveal = () => {
    if (done || my !== gen) return;
    done = true;
    el.classList.add('on');
    retire();
  };
  el.addEventListener('load', () => setTimeout(reveal, still ? 100 : 900));
  setTimeout(reveal, 7000);   // a slow load still crossfades
  stage.appendChild(el);
}

// ── The caption: the phrase just said ──────────────────────

let captionTimer = 0;

function caption(text, interim) {
  const ws = text.trim().split(/\s+/);
  captionEl.textContent = ws.length > 18 ? '… ' + ws.slice(-18).join(' ') : text.trim();
  captionEl.classList.toggle('interim', !!interim);
  captionEl.classList.remove('hint');
  captionEl.classList.add('on');
  clearTimeout(captionTimer);
  captionTimer = setTimeout(() => captionEl.classList.remove('on'), 9000);
}

function hint(text) {
  captionEl.textContent = text;
  captionEl.classList.add('on', 'hint');
}

// ── The drift: recent words, in the look of mindflow/basic ─

const STOP_WORDS = new Set([
  'i','me','my','myself','we','our','ours','ourselves','you','your','yours',
  'yourself','yourselves','he','him','his','himself','she','her','hers',
  'herself','it','its','itself','they','them','their','theirs','themselves',
  'what','which','who','whom','this','that','these','those','am','is','are',
  'was','were','be','been','being','have','has','had','having','do','does',
  'did','doing','a','an','the','and','but','if','or','because','as','until',
  'while','of','at','by','for','with','about','against','between','through',
  'during','before','after','above','below','to','from','up','down','in',
  'out','on','off','over','under','again','further','then','once','here',
  'there','when','where','why','how','all','both','each','few','more','most',
  'other','some','such','no','nor','not','only','own','same','so','than',
  'too','very','s','t','can','will','just','don','should','now','d','ll',
  'm','o','re','ve','y','ain','aren','couldn','didn','doesn','hadn','hasn',
  'haven','isn','ma','mightn','mustn','needn','shan','shouldn','wasn',
  'weren','won','wouldn','um','uh','like','yeah','okay','right','well',
  'actually','basically','literally','thing','things','got','get','going',
  'gonna','kind','sort','really','know','think','mean','want','need','say',
  'said','would','could','also','even','much','way','something','just',
  'that\'s','it\'s','i\'m','don\'t','can\'t','let','quite','worked',
  'questioned','developed','share','deep','make','made','take','took',
  'came','come','give','gave','put','still','called','back','another',
  'first','last','great','long','little','old','new','big','part','used',
  'asked','asks','exist','exists','explored','challenged','provides',
  'created','whether','become','becomes','around','always','must',
  'many','might','along','across','through','within','without','every',
  'never','often','perhaps','rather','since','though','however','already',
  'seems','seem','trying','tried','done','went','goes','seen','look',
  'looks','looking','found','help','helps','keeps','kept','left',
  'told','tell','says','set','show','shows','shown','started','start',
  'turned','different','important','possible','sure','enough','able',
  'point','points','fact','case','number','place','world','people',
  'work','year','years','hand','hands','home','life','since','those',
  'you\'re','we\'re','they\'re','there\'s','what\'s','let\'s','i\'ve','we\'ve','isn\'t','doesn\'t'
]);
const PALETTE = ['#5a9bf5','#7ebc8a','#f4c873','#e87c7c','#9b88ce','#6abebe','#f49b7a','#ab8fd0','#7bafc8','#c8a47b','#8bbe7b','#be7b9b'];

const canvas = document.getElementById('drift');
const ctx = canvas.getContext('2d');
const words = new Map();
const sentences = [];
let lastWord = null;
let colorIdx = 0;
let alpha = 1;

function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
addEventListener('resize', () => { resize(); retarget(); });
resize();

function region() {
  const h = innerHeight;
  return document.body.classList.contains('film-on')
    ? { top: h * 0.875, bottom: h * 0.985, alpha: 0.42, max: 24, grow: 3 }   // faint, beneath the caption
    : { top: h * 0.05, bottom: h * 0.79, alpha: 1, max: 72, grow: 8 };       // the words alone
}

function addWords(text) {
  const t = Date.now();
  const toks = text.toLowerCase().replace(/[^\w\s'-]/g, '').split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  if (!toks.length) return;
  sentences.push(toks);
  if (sentences.length > 20) sentences.shift();
  const r = region();
  for (const tok of toks) {
    let w = words.get(tok);
    if (w) {
      w.freq++; w.last = t; w.pulse = 1.3;
    } else {
      const base = lastWord || { x: innerWidth / 2, y: (r.top + r.bottom) / 2 };
      w = { text: tok, freq: 1, x: base.x + (Math.random() - 0.5) * 200, y: base.y + (Math.random() - 0.5) * (r.bottom - r.top) * 0.4,
            vx: 0, vy: 0, tx: base.x, ty: base.y, size: 12, op: 0, color: PALETTE[colorIdx++ % PALETTE.length], last: t, pulse: 1 };
      words.set(tok, w);
    }
    lastWord = w;
  }
  if (words.size > 70) {
    [...words.values()].sort((a, b) => a.last - b.last).slice(0, words.size - 70).forEach(w => words.delete(w.text));
  }
  retarget();
}

function retarget() {
  const r = region();
  const cx = innerWidth / 2, cy = (r.top + r.bottom) / 2;
  const co = new Map();
  for (const s of sentences) {
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
      if (s[i] === s[j]) continue;
      const key = s[i] < s[j] ? s[i] + '|' + s[j] : s[j] + '|' + s[i];
      co.set(key, (co.get(key) || 0) + 1);
    }
  }
  for (const w of words.values()) {
    let tx = 0, ty = 0, n = 0;
    for (const [key, c] of co) {
      const [a, b] = key.split('|');
      const o = a === w.text ? words.get(b) : b === w.text ? words.get(a) : null;
      if (o) { tx += o.x * c; ty += o.y * c; n += c; }
    }
    if (n) { w.tx = (tx / n) * 0.4 + cx * 0.6; w.ty = (ty / n) * 0.4 + cy * 0.6; }
    else { w.tx = w.x * 0.7 + cx * 0.3; w.ty = Math.min(r.bottom, Math.max(r.top, w.y)) * 0.7 + cy * 0.3; }
  }
}

function step() {
  const r = region();
  const t = Date.now();
  const W = innerWidth;
  const arr = [...words.values()];
  for (const w of arr) {
    const age = (t - w.last) / 1000;
    let size = Math.min(r.max, Math.max(12, 12 + w.freq * Math.pow(0.95, age) * r.grow));
    let op = 1;
    if (age > 60) {
      const d = (age - 60) / 120;
      op = Math.max(0.15, 1 - d);
      size = Math.max(10, size * Math.max(0.5, 1 - d * 0.5));
    }
    w.vx += (w.tx - w.x) * 0.0015;
    w.vy += (w.ty - w.y) * 0.0015;
    w.vx *= 0.733; w.vy *= 0.733;
    w.x += w.vx; w.y += w.vy;
    w.op += (op - w.op) * 0.05;
    w.size += (size - w.size) * 0.06;
    if (w.pulse > 1) { w.pulse += (1 - w.pulse) * 0.1; if (w.pulse < 1.01) w.pulse = 1; }
    const half = w.text.length * w.size * 0.32;
    if (w.x < 20 + half) { w.x = 20 + half; w.vx *= -0.5; }
    if (w.x > W - 20 - half) { w.x = W - 20 - half; w.vx *= -0.5; }
    if (w.y < r.top + w.size / 2) w.y += (r.top + w.size / 2 - w.y) * 0.06;          // glide, never jump, into the region
    if (w.y > r.bottom - w.size / 2) w.y += (r.bottom - w.size / 2 - w.y) * 0.06;
  }
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j];
      if (a.op < 0.2 && b.op < 0.2) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const mx = (a.text.length * a.size + b.text.length * b.size) * 0.3 + 8;
      const my = (a.size + b.size) * 0.6 + 4;
      if (Math.abs(dx) < mx && Math.abs(dy) < my) {
        const px = (dx === 0 ? 1 : Math.sign(dx)) * (mx - Math.abs(dx)) * 0.015;
        const py = (dy === 0 ? 1 : Math.sign(dy)) * (my - Math.abs(dy)) * 0.015;
        a.vx -= px; a.vy -= py; b.vx += px; b.vy += py;
      }
    }
  }
  alpha += (r.alpha - alpha) * 0.03;
}

function render() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const w of words.values()) {
    if (w.op < 0.01) continue;
    ctx.font = `${w.size * w.pulse}px 'SF Mono', 'Fira Code', Consolas, monospace`;
    ctx.fillStyle = w.color;
    ctx.globalAlpha = w.op * alpha;
    ctx.fillText(w.text, w.x, w.y);
  }
  ctx.globalAlpha = 1;
}

if (view === 'films') {
  (function animate() {
    step();
    render();
    requestAnimationFrame(animate);
  })();
  setInterval(retarget, 2000);
}

// ── What was heard ─────────────────────────────────────────

function heardPhrase(text) {
  if (!text || !text.trim()) return;
  caption(text);
  if (view === 'cloud') { CLOUD.hear(text); return; }
  addWords(text);
  if (mode === 'listen') chooseFromWords(text);
}

// ── Source 1: the Mac (?source=wss://…) ────────────────────

function setDot(state) {
  dotEl.className = state;
  clearTimeout(setDot.timer);
  if (state === 'live') setDot.timer = setTimeout(() => dotEl.classList.add('quiet'), 10000);
}

function follow(url) {
  let delay = 1000, caughtUp = false;
  const open = () => {
    let ws;
    try { ws = new WebSocket(url); } catch (e) { hint('That source is not a socket address: ' + url); return; }
    ws.onopen = () => { delay = 1000; setDot('live'); ws.send(JSON.stringify({ type: 'screen' })); };
    ws.onmessage = e => {
      let m;
      try { m = JSON.parse(e.data); } catch (err) { return; }
      const kind = m.type || m.event;
      if (kind === 'heard') heardPhrase(m.text);
      else if (kind === 'film') propose(m);
      else if (kind === 'compose') { if (view === 'cloud') CLOUD.compose(m); }
      else if (kind === 'state' && !caughtUp) {
        caughtUp = true;
        (m.recent || []).forEach(view === 'cloud' ? CLOUD.hear : addWords);
        if (m.film) propose(m.film);
        if (m.compose && view === 'cloud') CLOUD.compose(m.compose);
      }
    };
    ws.onclose = () => { setDot('lost'); setTimeout(open, delay); delay = Math.min(delay * 2, 10000); };
    ws.onerror = () => ws.close();
  };
  open();
}

// ── Source 2: this computer's own microphone (?listen) ─────

function listen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { hint('This browser cannot hear: open the page in Chrome, or follow the Mac with ?source=wss://…'); return; }
  let recognition = null, isListening = false;
  const begin = () => {
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = params.get('lang') || 'en-GB';
    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) heardPhrase(transcript);
        else interim += transcript;
      }
      if (interim) caption(interim, true);
    };
    recognition.onerror = event => {
      if (event.error === 'no-speech') return;   // normal, just silence
      console.warn('Speech error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isListening = false;
        setDot('lost');
        hint('The microphone was refused: allow it for this page, then reload.');
      }
    };
    recognition.onend = () => {
      // auto-restart if we're still supposed to be listening
      if (!isListening) return;
      try { recognition.start(); } catch (e) { setTimeout(begin, 400); }
    };
    recognition.start();
    isListening = true;
    setDot('live');
  };
  startBtn.style.display = 'block';
  startBtn.onclick = () => { startBtn.style.display = 'none'; captionEl.classList.remove('on'); begin(); };
  hint('Click Listen, and allow the microphone.');
}

// ── Keys, the cursor, the debug line ───────────────────────

addEventListener('keydown', e => {
  if (e.key === 'f') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
  else if (e.key === '0' || e.key === 'Escape') propose({ why: 'manual', film: null });
  else if (e.key === 'a') propose({ why: 'release' });
});
addEventListener('dblclick', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); });
let idleTimer = 0;
addEventListener('mousemove', () => {
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add('idle'), 3000);
});

function showDebug() {
  const t = Date.now();
  const p = lastProposal;
  if (view === 'cloud') {
    debugEl.textContent = `${mode} · the cloud\n` + CLOUD.debug() +
      (cur.film ? `\nshowing ${cur.film}, picked on the phone, ${Math.max(0, Math.round((manualUntil - t) / 1000))}s more` : '');
    return;
  }
  debugEl.textContent = [
    `${mode} · hold ${HOLD_MS / 1000}s`,
    `showing ${cur.film || '(the words)'} for ${Math.round((t - cur.since) / 1000)}s, its idea last heard ${Math.round((t - cur.heardAt) / 1000)}s ago`,
    manualUntil > t ? `a pick holds it ${Math.round((manualUntil - t) / 1000)}s more` : '',
    pending ? `waiting: ${pending.film}` : '',
    p ? `last match ${Math.round((t - p.at) / 1000)}s ago: ${p.why}${p.strong ? ' strong' : ''}${p.score != null ? ' ' + p.score : ''} → ${p.film || (p.films || []).join(' / ') || '(words)'}${p.phrase ? '\n  "' + p.phrase.slice(-90) + '"' : ''}` : '',
  ].filter(Boolean).join('\n');
}

// ── Start ──────────────────────────────────────────────────

const mode = params.has('source') ? 'source' : params.has('listen') ? 'listen' : 'none';
if (params.has('debug')) debugEl.style.display = 'block';

document.body.classList.add(view);
loadCatalogue().then(() => {
  if (view === 'cloud') CLOUD.start({ canvas: document.getElementById('cloud'), catalogue, stop: STOP_WORDS });
  if (params.get('film')) propose({ why: 'manual', film: params.get('film') });
  if (mode === 'source') follow(params.get('source'));
  else if (mode === 'listen') listen();
  else hint('Follow the Mac with ?source=wss://… or hear this room with ?listen');
});
