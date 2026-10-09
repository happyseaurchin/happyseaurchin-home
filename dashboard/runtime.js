/* The dashboard's runtime on the open site.
 *
 * keel's Beach dashboard was written for claude.ai's dashboard type, which hands the page a
 * `dash` object: datasets fetched on the reader's own connectors, loaders that shape them,
 * calculations over them, and a redraw whenever data or the width changes. This file is
 * that same small interface, fed instead by the open beach itself — every live source is a
 * plain GET that any browser may make (the beach answers every origin), so the page needs
 * no account, no connector and no key, and nobody pays for a reader beyond the reads.
 *
 *   census    the beach's own index of every block, with birth and last-change stamps — every minute
 *   presence  the presence block: one slot per hand on an o-page or the mirror — every minute
 *   tables    each table's own census, for the pool that last took a voice — when Tables opens, then every five minutes
 *   contributions, register, worlds — keel's snapshot, kept beside this page in dashboard/data/
 *
 * The page's own code (dash.js) declares the loaders and calculations; this file only
 * fetches, keeps state and redraws. */
(function () {
  'use strict';

  var BEACH = 'https://beach.happyseaurchin.com';
  var MINUTE = 60000;

  function getJSON(url) {
    return fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error((url.indexOf(BEACH) === 0 ? 'the beach' : 'the site') + ' answered ' + r.status);
      return r.json().then(function (body) { return { body: body, now: r.headers.get('X-Pscale-Now') }; });
    });
  }
  // the beach stamps every answer: "ISO | sundial address | voicing"
  function stampISO(now) { return now ? String(now).split('|')[0].trim() : null; }
  function snapshot(name) {
    return function () {
      return getJSON('/dashboard/data/' + name + '.json').then(function (x) {
        return { data: x.body.rows || [], meta: [{ label: 'Compiled', value: x.body.compiled ? x.body.compiled.at + ' by ' + x.body.compiled.by : '' }] };
      });
    };
  }

  var SOURCES = {
    census: { every: MINUTE, produce: function () {
      return getJSON(BEACH + '/.well-known/pscale-beach').then(function (x) { return x.body; });
    } },
    presence: { every: MINUTE, produce: function () {
      return getJSON(BEACH + '/.well-known/pscale-beach?block=presence').then(function (x) {
        return { block: x.body, served_at: stampISO(x.now) || new Date().toISOString() };
      });
    } },
    // one census per table surface named in keel's worlds list; the latest-touched pool is its last voice
    tables: { every: 5 * MINUTE, produce: function () {
      return load('worlds').then(function () {
        var list = STATE.worlds.data.filter(function (w) { return /^beach\.happyseaurchin\.com\/w\/[^/]+$/.test(w.address); });
        return Promise.all(list.map(function (w) {
          return getJSON('https://' + w.address + '/.well-known/pscale-beach').then(function (x) {
            var touched = x.body.touched || {}, best = null;
            (x.body.blocks || []).forEach(function (b) {
              if (b.indexOf('pool:') === 0 && touched[b] && (!best || touched[b] > touched[best])) best = b;
            });
            return { table: w.world, last_pool: best, last_voice: best ? touched[best] : null };
          }, function () { return { table: w.world, last_pool: null, last_voice: null, failed: true }; });
        })).then(function (rows) {
          var failed = rows.filter(function (r) { return r.failed; }).length;
          return { data: rows, meta: failed ? [{ label: 'Unreachable', value: failed + ' of ' + rows.length }] : [] };
        });
      });
    } },
    contributions: { produce: snapshot('contributions') },
    register: { produce: snapshot('register') },
    worlds: { produce: snapshot('worlds') }
  };

  var LOADERS = {}, CALCS = {}, STATE = {}, VERSION = {}, MEMO = {}, LISTENERS = [], linked = false;

  function load(id) {
    if (!STATE[id]) {
      STATE[id] = { status: 'loading', data: [], columns: [], meta: [], message: '', refreshing: false, at: 0 };
      VERSION[id] = 0;
      STATE[id].pending = run(id);
      if (SOURCES[id].every) {
        setInterval(function () { if (document.visibilityState === 'visible') run(id); }, SOURCES[id].every);
      }
    }
    return STATE[id].pending;
  }
  function run(id) {
    var st = STATE[id];
    if (st.status === 'ok') { st.refreshing = true; changed(); }
    return Promise.resolve().then(SOURCES[id].produce).then(function (answer) {
      var out = LOADERS[id] ? LOADERS[id]({ answer: answer }) : answer;
      var rows = Array.isArray(out) ? out : (out && Array.isArray(out.data) ? out.data : []);
      st.data = rows;
      st.columns = (out && out.columns) || (rows[0] ? Object.keys(rows[0]) : []);
      st.meta = (out && out.meta) || [];
      st.status = 'ok'; st.message = ''; st.at = Date.now();
    }, function (e) {
      // a failed refresh keeps the last good reading; a failed first read shows as failed
      if (st.status !== 'ok') { st.status = 'error'; st.message = String(e && e.message || e); }
    }).then(function () {
      st.refreshing = false; VERSION[id] += 1; changed();
    });
  }

  function view(st) {
    return { status: st.status, data: st.data, rows: st.data, columns: st.columns, meta: st.meta, message: st.message, refreshing: st.refreshing };
  }
  function data(id) {
    if (CALCS[id]) return calcData(id);
    if (!SOURCES[id]) return { status: 'missing', data: [], rows: [], columns: [], meta: [], message: 'no such source', refreshing: false };
    load(id);
    return view(STATE[id]);
  }
  function calcData(id) {
    var c = CALCS[id], ins = c.inputs.map(data);
    var bad = ins.filter(function (d) { return d.status === 'error' || d.status === 'missing'; })[0];
    if (bad) return { status: 'error', data: [], rows: [], columns: [], meta: [], message: bad.message, refreshing: false };
    if (ins.some(function (d) { return d.status !== 'ok'; })) return { status: 'loading', data: [], rows: [], columns: [], meta: [], message: '', refreshing: false };
    var key = c.inputs.map(function (i) { return CALCS[i] ? MEMO[i] && MEMO[i].key : VERSION[i]; }).join('|');
    if (!MEMO[id] || MEMO[id].key !== key) {
      var out;
      try {
        var result = c.fn.apply(null, ins.map(function (d) { return d.data; }));
        var rows = Array.isArray(result) ? result : [result];
        out = { status: 'ok', data: rows, rows: rows, columns: rows[0] ? Object.keys(rows[0]) : [], meta: [], message: '', refreshing: false };
      } catch (e) {
        out = { status: 'error', data: [], rows: [], columns: [], meta: [], message: String(e && e.message || e), refreshing: false };
      }
      MEMO[id] = { key: key, out: out };
    }
    var o = MEMO[id].out;
    o.refreshing = ins.some(function (d) { return d.refreshing; });
    return o;
  }

  var queued = false;
  function changed() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      LISTENERS.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
    });
  }

  window.dash = {
    loader: function (id, spec) { LOADERS[id] = spec.fn; },
    calc: function (id, spec) { CALCS[id] = { inputs: spec.inputs, fn: spec.fn }; },
    data: data,
    onData: function (fn) { LISTENERS.push(fn); fn(); },
    refresh: function (id) { if (SOURCES[id] && STATE[id]) run(id); },
    // eight series colours, stepped per theme in the page's own stylesheet
    colors: ['1', '2', '3', '4', '5', '6', '7', '8'].map(function (n) { return 'var(--dash-c' + n + ')'; }),
    // a tab chosen is kept in the address, so the link reopens it. The page's own first choice
    // writes nothing: a fragment set while the page is still loading makes the browser scroll
    // to the section of that name, past the title.
    setLink: function (name) {
      if (!linked) { linked = true; return; }
      try { if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name); } catch (e) { /* a framed page may refuse */ }
    },
    params: function () { return {}; }, setParams: function () {}, resetParams: function () {}
  };

  // a redraw when the width changes, as the dashboard type gives one
  var lastW = 0;
  function watchWidth() {
    var root = document.getElementById('dash-root');
    if (!root || !window.ResizeObserver) return;
    new ResizeObserver(function () {
      var w = Math.round(root.clientWidth);
      if (w !== lastW) { lastW = w; changed(); }
    }).observe(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchWidth); else watchWidth();

  // back from another tab: read the live sources again if a minute has passed
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    Object.keys(STATE).forEach(function (id) {
      if (SOURCES[id].every && Date.now() - STATE[id].at > SOURCES[id].every) run(id);
    });
  });
})();
