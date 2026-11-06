/* beach-mind.js — the beach for a mind that runs in the browser (WebLLM, or any model a page holds).
 *
 * A model in a browser tab has no memory, no knowledge beyond its weights and nobody to talk to. A beach has
 * all three and no model. This joins them, thinly: every read is the wire's own canonical read
 * (<beach>/.well-known/pscale-beach?block=&spindle=&pscale=), every write a plain POST under the person's own
 * latch, on any beach. No server of ours stands between.
 *
 *   const b = beachMind.beach('https://beach.happyseaurchin.com');
 *   await b.read('lighthouse')                      the disc at pscale 0: every branch's opening line, as text
 *   await b.read('passport:weft', '1')              a spindle: its ancestors, the point and one ring beneath
 *   b.context([{ title, text }, …], 6000)           reads laid into one text that fits a small window
 *   await b.live(15)                                who is live: torus-mirror:* touched in the last 15 minutes
 *   await b.memory(handle, location)                the person's memory, as the mirror keeps it (soft-llm-convos)
 *   await b.remember({ handle, secret, location, face, user, reply })   one turn kept there
 *
 * The memory is xstream's episodic organ, soft-llm-convos:<handle> (bsp-mcp proposals/2026-07-21-soft-llm-convos.md),
 * ported from xstream-bsp src/lib/soft-convos.ts at 9dd369e: re-port, never fork. So a conversation held here is
 * the same thread the mirror reads, and the mirror's is this one's. Its tests are the mirror's own smoke, ported
 * (scripts/check-beach-mind.mjs).
 *
 * xstream's gotchas hold: every GET carries cache: 'no-store' and a ?_t= buster, and never a Cache-Control header,
 * which would make the request non-simple and fail the beach's preflight. */
(function (root) {
  'use strict';

  var WIRE = '/.well-known/pscale-beach';

  /* ── reading: the wire's canonical shapes, laid out as lines a small model can read ── */
  function one(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function semantic(c) {
    if (c == null) return '';
    if (typeof c === 'string') return c;
    if (typeof c === 'object' && typeof c._ === 'string') return c._;
    return '';
  }
  function lineOf(e, pad) {
    var t = one(semantic(e.content));
    return (pad || '') + '[' + e.address + '] ' + (t || '(no content)');
  }
  /** A canonical read (the wire's JSON with ?pscale=) as text: one line per position, address first. */
  function format(c) {
    if (!c || typeof c !== 'object') return '';
    if (c.shape === 'disc') return (c.entries || []).map(function (e) { return lineOf(e); }).join('\n');
    if (c.shape === 'point') {
      var head = c.content == null ? '' : lineOf(c);
      var ring = (c.beneath || []).map(function (e) { return typeof e === 'object' ? lineOf(e, '  ') : '  [' + e + ']'; });
      return [head].concat(ring).filter(Boolean).join('\n');
    }
    if (c.shape === 'path-walk+descent') {
      return (c.path_walk || []).map(function (e) { return lineOf(e); })
        .concat((c.descent || []).map(function (e) { return lineOf(e, '  '); })).join('\n');
    }
    if (c.shape === 'path-walk') return (c.entries || []).map(function (e) { return lineOf(e); }).join('\n');
    if (c.shape === 'star') return format(c.inner);
    return '';
  }
  /** The depth a spindle names, counted as the wire counts it: digits, the decimal point dropped. */
  function digitsOf(spindle) { return String(spindle || '').replace(/[^0-9]/g, '').length; }

  /* ── the mirror's memory: soft-llm-convos, ported from xstream-bsp src/lib/soft-convos.ts ── */
  var CONVO_DEPTH_CAP = 10;
  function convoDate(iso) { return (iso || '').slice(0, 10); }
  function spineSuffix(depth) { return '.' + new Array(Math.max(1, depth) + 1).join('1'); }
  function isBoundary(state, location, today) {
    if (!state) return true;
    if (state.location !== location) return true;
    if (state.date !== today) return true;
    if (state.depth >= CONVO_DEPTH_CAP) return true;
    return false;
  }
  function authorResidue(userMessage, response) {
    var intent = one(userMessage).slice(0, 90), said = one(response).slice(0, 260);
    var r = (said ? intent + ' → ' + said : intent).trim();
    if (r[0] === '{' || r[0] === '[') r = '· ' + r;
    return r || '(no content)';
  }
  function faceTagged(face, residue) { return face ? '[' + face + '] ' + residue : residue; }
  function isNode(n) { return typeof n === 'object' && n !== null && !Array.isArray(n); }
  function walkSpine(node) {
    var out = [], cur = node['1'];
    for (var guard = 0; cur != null && guard < 64; guard++) {
      if (typeof cur === 'string') { if (cur) out.push(cur); break; }
      if (!isNode(cur)) break;
      if (typeof cur._ === 'string' && cur._) out.push(cur._);
      cur = cur['1'];
    }
    return out;
  }
  function floorDepth(rootNode) {
    var f = 1, n = rootNode;
    for (;;) {
      if (!isNode(n)) break;
      var u = n._;
      if (!isNode(u)) break;
      n = u; f += 1;
    }
    return f;
  }
  function collectEngagements(rootNode) {
    var F = floorDepth(rootNode), out = [];
    (function walk(n, depth, path) {
      if (!isNode(n)) return;
      if (depth === F) {
        if (!path || path.charAt(path.length - 1) === '0') return;
        var gist = typeof n._ === 'string' ? n._ : '';
        if (!gist.trim() && n['1'] == null) return;
        out.push({
          addr: parseInt(path, 10), node: n, gist: gist,
          location: typeof n['2'] === 'string' ? n['2'] : '',
          date: typeof n['3'] === 'string' ? convoDate(n['3']) : ''
        });
        return;
      }
      Object.keys(n).forEach(function (k) {
        if (k === '_') walk(n._, depth + 1, path + '0');
        else if (/^[1-9]$/.test(k)) walk(n[k], depth + 1, path + k);
      });
    })(rootNode, 0, '');
    out.sort(function (a, b) { return b.addr - a.addr; });
    return out;
  }
  function containerSummaries(rootNode) {
    var F = floorDepth(rootNode), out = [];
    (function walk(n, depth, path) {
      if (!isNode(n)) return;
      if (depth > 0 && path && path.charAt(path.length - 1) !== '0' && typeof n._ === 'string' && n._.trim()) {
        out.push({ addr: parseInt(path.padEnd(F, '0'), 10), text: n._ });
      }
      if (depth >= F - 1) return;
      Object.keys(n).forEach(function (k) {
        if (k === '_') walk(n._, depth + 1, path + '0');
        else if (/^[1-9]$/.test(k)) walk(n[k], depth + 1, path + k);
      });
    })(rootNode, 0, '');
    out.sort(function (a, b) { return b.addr - a.addr; });
    return out;
  }
  function projectConvos(rootNode, location) {
    var engagements = collectEngagements(rootNode);
    var atLocation = engagements.filter(function (e) { return e.location === location; });
    var current = atLocation[0];
    var summaries = containerSummaries(rootNode);
    return {
      rolling_summary: summaries.length ? summaries[0].text : '',
      current_thread: current ? walkSpine(current.node) : [],
      here_before: atLocation.slice(1).filter(function (e) { return e.gist.trim(); }).slice(0, 5)
        .map(function (e) { return { gist: e.gist, date: e.date }; })
    };
  }
  function formatSoftConvos(v) {
    if (!v) return '';
    if (!v.rolling_summary && v.current_thread.length === 0 && v.here_before.length === 0) return '';
    var lines = [];
    if (v.rolling_summary) { lines.push('long arc (older engagements compressed): ' + v.rolling_summary); lines.push(''); }
    if (v.current_thread.length > 0) {
      lines.push('this conversation so far (oldest first):');
      v.current_thread.forEach(function (r) { lines.push('  · ' + r); });
      lines.push('');
    }
    if (v.here_before.length > 0) {
      lines.push('you have been at this location before:');
      v.here_before.forEach(function (h) { lines.push('  · ' + h.date + ': ' + h.gist); });
    }
    return lines.join('\n').replace(/\s+$/, '');
  }

  /* ── one beach ── */
  function beach(url, opts) {
    var origin = String(url || 'https://beach.happyseaurchin.com').replace(/\/+$/, '');
    var f = (opts && opts.fetch) || root.fetch.bind(root);
    var floors = {}, idx = null, idxAt = 0, states = {};

    function get(params) {
      var q = Object.keys(params).filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); });
      q.push('_t=' + Date.now());
      return f(origin + WIRE + '?' + q.join('&'), { cache: 'no-store' }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (!r.ok) { var e = new Error((j && j.error) || ('the beach answered ' + r.status)); e.status = r.status; e.code = j && j.code; throw e; }
          return j;
        });
      });
    }
    function post(body) {
      return f(origin + WIRE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) { j = j || {}; j.ok = r.ok && j.ok !== false; j.status = r.status; return j; });
        });
    }
    function floorOf(block) {
      if (floors[block]) return Promise.resolve(floors[block]);
      return get({ block: block, pscale: 0 }).then(function (c) { floors[block] = +c.floor || 1; return floors[block]; });
    }
    /** A block as text: the disc at pscale 0 when no spindle is named; else the spindle's path with one ring beneath. */
    function read(block, spindle) {
      if (!spindle) return get({ block: block, pscale: 0 }).then(function (c) { floors[block] = +c.floor || 1; return format(c); });
      return floorOf(block).then(function (F) {
        return get({ block: block, spindle: spindle, pscale: F - digitsOf(spindle) - 1 }).then(format);
      });
    }
    function index(maxAgeMs) {
      if (idx && Date.now() - idxAt < (maxAgeMs == null ? 20000 : maxAgeMs)) return Promise.resolve(idx);
      return get({}).then(function (j) { idx = j; idxAt = Date.now(); return j; });
    }
    /** Who is live: the torus-mirror:* names touched within the window, by the index's touched map (function:torus-mirror 2). */
    function live(minutes) {
      var w = (minutes || 15) * 60000;
      return index(0).then(function (j) {
        var t = (j && j.touched) || {}, now = Date.now(), out = [];
        Object.keys(t).forEach(function (name) {
          if (name.indexOf('torus-mirror:') !== 0) return;
          var at = Date.parse(t[name]);
          if (!isNaN(at) && now - at <= w) out.push({ handle: name.slice('torus-mirror:'.length), touched: t[name], ago: now - at });
        });
        out.sort(function (a, b) { return a.ago - b.ago; });
        return out;
      });
    }
    function memory(handle, location) {
      if (!handle) return Promise.resolve(null);
      return get({ block: 'soft-llm-convos:' + handle }).then(function (raw) {
        return isNode(raw) ? projectConvos(raw, location || '') : null;
      }, function (e) { if (e.status === 404) return projectConvos({}, location || ''); throw e; });
    }
    /** One turn kept as the mirror keeps it: a new engagement opened by append on a boundary, else the current one deepened. */
    function remember(op) {
      if (!op || !op.handle || !op.secret) return Promise.resolve({ ok: false, error: 'no name or key' });
      var block = 'soft-llm-convos:' + op.handle, location = op.location || '', face = op.face || 'character';
      var residue = faceTagged(face, authorResidue(op.user, op.reply));
      var today = convoDate(new Date().toISOString()), state = states[op.handle] || null;
      if (isBoundary(state, location, today)) {
        return post({ block: block, append: true, content: { _: residue, 1: residue, 2: location, 4: face }, secret: op.secret }).then(function (w) {
          if (!w.ok || !w.slot) return { ok: false, error: w.error || 'the beach did not keep it', code: w.code };
          states[op.handle] = { slot: String(w.slot), depth: 1, location: location, date: today };
          return { ok: true, slot: String(w.slot), depth: 1, opened: true };
        });
      }
      var depth = state.depth + 1;
      return post({ block: block, spindle: state.slot + spineSuffix(depth), content: residue, secret: op.secret }).then(function (w) {
        if (!w.ok) return { ok: false, error: w.error || 'the beach did not keep it', code: w.code };
        states[op.handle] = { slot: state.slot, depth: depth, location: state.location, date: state.date };
        return { ok: true, slot: state.slot, depth: depth, opened: false };
      });
    }
    return { origin: origin, read: read, index: index, live: live, memory: memory, remember: remember, get: get, post: post };
  }

  /** Reads laid one after another under their titles, cut to fit a character budget (about four characters a token). */
  function context(parts, budget) {
    var left = budget || 6000, out = [];
    (parts || []).forEach(function (p) {
      if (!p || !p.text || left <= 0) return;
      var head = '## ' + p.title + '\n', body = String(p.text);
      var room = left - head.length - 2;
      if (room <= 40) { left = 0; return; }
      if (body.length > room) body = body.slice(0, room - 1) + '…';
      out.push(head + body);
      left -= head.length + body.length + 2;
    });
    return out.join('\n\n');
  }

  var api = {
    beach: beach, context: context, format: format,
    soft: {
      CONVO_DEPTH_CAP: CONVO_DEPTH_CAP, convoDate: convoDate, spineSuffix: spineSuffix, isBoundary: isBoundary,
      authorResidue: authorResidue, faceTagged: faceTagged, walkSpine: walkSpine, floorDepth: floorDepth,
      collectEngagements: collectEngagements, containerSummaries: containerSummaries,
      projectConvos: projectConvos, formatSoftConvos: formatSoftConvos
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.beachMind = api;
})(typeof window !== 'undefined' ? window : globalThis);
