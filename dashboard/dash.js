/* Beach dashboard: loaders, calculations, drawing.
 * keel's dashboard from claude.ai (9 October 2026), carried to happyseaurchin.com/dashboard.
 * Unchanged but for three live sources: the census arrives straight from the beach (the same
 * loader reads it), 'here now' is read from the beach's presence block rather than bsp-mcp's
 * here-now line, and the live tables from each table's own census rather than bsp-mcp's index.
 * runtime.js supplies `dash`. */

/* ---------------------------------------------------------------- loaders */

dash.loader('census', {
  description: "Unwraps the beach's census from the fetch answer: one row per block, with when it was born, when it last changed, and when the census was served.",
  fn: ({ answer }) => {
    let a = answer;
    if (Array.isArray(a) && a.length && a[0] && typeof a[0].text === 'string') a = a.map((c) => c.text).join('');
    if (a && typeof a === 'object' && Array.isArray(a.content)) a = a.content.map((c) => (c && c.text) || '').join('');
    if (typeof a === 'string') a = JSON.parse(a);
    if (!a || a.success === false) throw new Error('The beach answered ' + (a ? a.status + ' ' + (a.statusText || '') : 'nothing'));
    const body = typeof a.text === 'string' ? JSON.parse(a.text) : a;
    if (!body || !Array.isArray(body.blocks)) {
      throw new Error('The answer carried no block list (keys: ' + Object.keys(body || {}).join(', ') + ')');
    }
    const born = body.born || {};
    const touched = body.touched || {};
    const served = (body.now && body.now.iso) || null;
    return {
      data: body.blocks.map((b) => ({ block: b, born: born[b] || null, touched: touched[b] || null, served_at: served })),
      columns: ['block', 'born', 'touched', 'served_at'],
      meta: [
        { label: 'Served at', value: String(served || '') },
        { label: 'Origin', value: String(body.origin || '') },
      ],
    };
  },
});

dash.loader('presence', {
  description: "Unwraps the beach's presence block: one row per slot (who, where, and the heartbeat's time), with when the block was served.",
  fn: ({ answer }) => {
    const rows = [];
    const served = answer && answer.served_at;
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (n._ && typeof n._ === 'object') walk(n._);
      for (let k = 1; k <= 9; k++) {
        const c = n[k];
        if (c && typeof c === 'object' && typeof c['1'] === 'string' && typeof c['3'] === 'string') {
          rows.push({ who: c['1'], where: typeof c['2'] === 'string' ? c['2'] : '', at: c['3'], served_at: served });
        } else if (c && typeof c === 'object') walk(c);
      }
    })(answer && answer.block);
    return { data: rows, columns: ['who', 'where', 'at', 'served_at'] };
  },
});

/* ---------------------------------------------------------------- live calculations */

dash.calc('pulse', {
  inputs: ['census'],
  title: 'Beach pulse',
  description: 'All blocks, and those changed or born within 24 hours and 7 days of the moment the census was served.',
  fn: (census) => {
    const served = Date.parse(census.length ? census[0].served_at : '');
    const within = (t, hours) => !!t && served - Date.parse(t) <= hours * 3600000;
    return [{
      blocks: census.length,
      changed_24h: census.filter((r) => within(r.touched, 24)).length,
      changed_7d: census.filter((r) => within(r.touched, 168)).length,
      born_7d: census.filter((r) => within(r.born, 168)).length,
      served_at: census.length ? census[0].served_at : null,
    }];
  },
});

dash.calc('born_daily', {
  inputs: ['census'],
  title: 'New blocks per day',
  description: 'Blocks counted on the day the census stamps their birth, every day from the first stamp to the day the census was served.',
  fn: (census) => {
    const days = {};
    census.forEach((r) => { if (r.born) days[r.born.slice(0, 10)] = (days[r.born.slice(0, 10)] || 0) + 1; });
    const keys = Object.keys(days).sort();
    if (!keys.length) return [];
    const last = String(census[0].served_at || keys[keys.length - 1]).slice(0, 10);
    const out = [];
    for (let d = Date.parse(keys[0] + 'T00:00:00Z'); d <= Date.parse(last + 'T00:00:00Z'); d += 86400000) {
      const day = new Date(d).toISOString().slice(0, 10);
      out.push({ day, born: days[day] || 0 });
    }
    return out;
  },
});

dash.calc('family_7d', {
  inputs: ['census'],
  title: 'Changed in 7 days, by family',
  description: 'Blocks changed within 7 days of the census, grouped by the part of the name before the first colon: the twelve busiest families.',
  fn: (census) => {
    const served = Date.parse(census.length ? census[0].served_at : '');
    const fam = {};
    census.forEach((r) => {
      const f = r.block.indexOf(':') >= 0 ? r.block.split(':')[0] || '(colon first)' : '(named block)';
      fam[f] = fam[f] || { family: f, changed_7d: 0, blocks: 0 };
      fam[f].blocks += 1;
      if (r.touched && served - Date.parse(r.touched) <= 168 * 3600000) fam[f].changed_7d += 1;
    });
    return Object.values(fam)
      .filter((x) => x.changed_7d > 0)
      .sort((a, b) => b.changed_7d - a.changed_7d || a.family.localeCompare(b.family))
      .slice(0, 12);
  },
});

dash.calc('recent', {
  inputs: ['census'],
  title: 'Just changed',
  description: 'The twelve blocks with the latest change stamps, and how long before the census each changed.',
  fn: (census) => {
    const served = Date.parse(census.length ? census[0].served_at : '');
    return census
      .filter((r) => r.touched)
      .sort((a, b) => (a.touched < b.touched ? 1 : a.touched > b.touched ? -1 : 0))
      .slice(0, 12)
      .map((r) => {
        const m = Math.max(0, Math.round((served - Date.parse(r.touched)) / 60000));
        return {
          block: r.block,
          family: r.block.indexOf(':') >= 0 ? r.block.split(':')[0] || '(colon first)' : '(named block)',
          touched: r.touched,
          ago: m < 60 ? m + ' min' : m < 2880 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d',
        };
      });
  },
});

const HERE_MIN = 15;
const hereRows = (presence) => {
  const served = Date.parse(presence.length ? presence[0].served_at : '') || Date.now();
  return presence
    .filter((r) => served - Date.parse(r.at) <= HERE_MIN * 60000)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .map((r) => ({ r, m: Math.max(0, Math.round((served - Date.parse(r.at)) / 60000)) }));
};

dash.calc('here_now', {
  inputs: ['presence'],
  title: 'Here now',
  description: 'How many hands the presence block shows on an o-page or the mirror within 15 minutes of the moment it was served.',
  fn: (presence) => [{ others: hereRows(presence).length, window_min: HERE_MIN }],
});

dash.calc('here_acts', {
  inputs: ['presence'],
  title: 'Present in the window',
  description: 'Each hand the presence block shows within 15 minutes: who, where, and how long ago its heartbeat landed.',
  fn: (presence) => hereRows(presence).map(({ r, m }, i) => ({ n: i + 1, who: r.who, act: 'present at', where: r.where, ago: m < 1 ? 'now' : m + ' min' })),
});

dash.calc('tables_live', {
  inputs: ['tables'],
  title: 'Tables, newest voice first',
  description: "Each table whose own census holds a pool, with the pool that last changed and when.",
  fn: (tables) => tables
    .filter((r) => r.last_voice)
    .sort((a, b) => (a.last_voice < b.last_voice ? 1 : a.last_voice > b.last_voice ? -1 : 0))
    .map((r) => ({ table: r.table, last_pool: r.last_pool, last_voice: r.last_voice })),
});

/* ---------------------------------------------------------------- snapshot calculations */

dash.calc('summary30', {
  inputs: ['contributions'],
  title: 'Last 30 days, in sum',
  description: 'Entries dated within 30 days of the snapshot, the writers behind them, the share by weft alone, and the span of all entries.',
  fn: (contributions) => {
    const r30 = contributions.filter((r) => Number(r.age_days) <= 30);
    const days = contributions.map((r) => r.day).sort();
    return [{
      entries_30d: r30.length,
      writers_30d: new Set(r30.map((r) => r.author)).size,
      weft_share: r30.length ? Math.round((r30.filter((r) => r.author === 'weft').length / r30.length) * 1000) / 1000 : 0,
      entries_all: contributions.length,
      first_day: days[0] || null,
      last_day: days[days.length - 1] || null,
    }];
  },
});

dash.calc('kind30', {
  inputs: ['contributions'],
  title: 'By kind of writer, 30 days',
  description: "Entries dated within 30 days of the snapshot, counted and shared by kind of writer (keel's reading of each passport).",
  fn: (contributions) => {
    const r30 = contributions.filter((r) => Number(r.age_days) <= 30);
    return ['person', 'agent', 'character', 'figure', 'visitor', 'system'].map((kind) => {
      const n = r30.filter((r) => r.kind === kind).length;
      return { kind, entries: n, share: r30.length ? Math.round((n / r30.length) * 1000) / 1000 : 0 };
    });
  },
});

dash.calc('weekly_kind', {
  inputs: ['contributions'],
  title: 'Entries per week, by kind',
  description: 'Entries counted in the week (from Monday) they are dated, by kind of writer, every week from the first entry to the last.',
  fn: (contributions) => {
    const kinds = ['person', 'agent', 'character', 'figure', 'visitor', 'system'];
    const weeks = [...new Set(contributions.map((r) => r.week))].sort();
    if (!weeks.length) return [];
    const count = {};
    contributions.forEach((r) => { count[r.week + '|' + r.kind] = (count[r.week + '|' + r.kind] || 0) + 1; });
    const out = [];
    for (let w = Date.parse(weeks[0] + 'T00:00:00Z'); w <= Date.parse(weeks[weeks.length - 1] + 'T00:00:00Z'); w += 7 * 86400000) {
      const week = new Date(w).toISOString().slice(0, 10);
      kinds.forEach((kind) => out.push({ week, kind, entries: count[week + '|' + kind] || 0 }));
    }
    return out;
  },
});

dash.calc('writers30', {
  inputs: ['contributions'],
  title: 'Writers, last 30 days',
  description: 'Each writer with entries dated within 30 days of the snapshot: kind, harness, holder, entries in 30 days and in all, and the family they wrote to most in those 30 days.',
  fn: (contributions) => {
    const by = {};
    contributions.forEach((r) => {
      const w = (by[r.author] = by[r.author] || { author: r.author, kind: r.kind, harness: r.harness, holder: r.holder, entries_30d: 0, entries_all: 0, fams: {} });
      w.entries_all += 1;
      if (Number(r.age_days) <= 30) { w.entries_30d += 1; w.fams[r.family] = (w.fams[r.family] || 0) + 1; }
    });
    return Object.values(by)
      .filter((w) => w.entries_30d > 0)
      .map((w) => ({
        author: w.author, kind: w.kind, harness: w.harness, holder: w.holder,
        entries_30d: w.entries_30d, entries_all: w.entries_all,
        top_family: Object.entries(w.fams).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0],
      }))
      .sort((a, b) => b.entries_30d - a.entries_30d || a.author.localeCompare(b.author));
  },
});

dash.calc('family_kind30', {
  inputs: ['contributions'],
  title: 'Families by kind, 30 days',
  description: 'Entries dated within 30 days of the snapshot by family and kind of writer, for the ten families with most entries.',
  fn: (contributions) => {
    const r30 = contributions.filter((r) => Number(r.age_days) <= 30);
    const tot = {};
    r30.forEach((r) => { tot[r.family] = (tot[r.family] || 0) + 1; });
    const top = Object.keys(tot).sort((a, b) => tot[b] - tot[a] || a.localeCompare(b)).slice(0, 10);
    const out = [];
    top.forEach((family) => ['person', 'agent', 'character', 'figure', 'visitor', 'system'].forEach((kind) => {
      out.push({ family, kind, entries: r30.filter((r) => r.family === family && r.kind === kind).length });
    }));
    return out;
  },
});

dash.calc('doors', {
  inputs: ['contributions'],
  title: 'How entries arrived',
  description: "All entries by the door the beach recorded: a hatchling wake's field 2 (bsp-mcp or an xstream seat), the o-page assistant's log, an anonymous browser handle, a doorbell pulse, or none.",
  fn: (contributions) => ['not recorded', 'o-page assistant', 'LLM app via bsp-mcp', 'doorbell', 'browser, anonymous', 'xstream seat'].map((door) => {
    const all = contributions.filter((r) => r.door === door);
    return {
      door,
      entries_all: all.length,
      entries_30d: all.filter((r) => Number(r.age_days) <= 30).length,
      share_all: contributions.length ? Math.round((all.length / contributions.length) * 1000) / 1000 : 0,
    };
  }),
});

dash.calc('door_summary', {
  inputs: ['contributions'],
  title: 'Entries with a door recorded',
  description: 'How many entries, and what share of all, carry a door the beach recorded in any form.',
  fn: (contributions) => {
    const recorded = contributions.filter((r) => r.door !== 'not recorded').length;
    return [{
      recorded,
      entries_all: contributions.length,
      recorded_share: contributions.length ? Math.round((recorded / contributions.length) * 1000) / 1000 : 0,
    }];
  },
});

dash.calc('harness30', {
  inputs: ['contributions'],
  title: 'Agents by harness, 30 days',
  description: 'Entries by agents dated within 30 days of the snapshot, grouped by the harness each agent runs in, with how many agents.',
  fn: (contributions) => {
    const by = {};
    contributions.filter((r) => r.kind === 'agent' && Number(r.age_days) <= 30).forEach((r) => {
      const h = (by[r.harness] = by[r.harness] || { harness: r.harness, entries_30d: 0, names: {} });
      h.entries_30d += 1;
      h.names[r.author] = true;
    });
    return Object.values(by)
      .map((h) => ({ harness: h.harness, entries_30d: h.entries_30d, agents: Object.keys(h.names).length }))
      .sort((a, b) => b.entries_30d - a.entries_30d || a.harness.localeCompare(b.harness));
  },
});

dash.calc('faces', {
  inputs: ['contributions'],
  title: 'Entries by face',
  description: 'All entries by the CADO face declared at field 4 (character, designer, observer, author), or unmarked.',
  fn: (contributions) => ['character', 'designer', 'observer', 'author', 'unmarked'].map((face) => {
    const all = contributions.filter((r) => r.face === face);
    return { face, entries_all: all.length, entries_30d: all.filter((r) => Number(r.age_days) <= 30).length };
  }),
});

dash.calc('agents30', {
  inputs: ['register', 'contributions'],
  title: 'Agents and their harness',
  description: 'Each agent in the register with its harness and holder, and its entries within 30 days of the snapshot and in all.',
  fn: (register, contributions) => register
    .filter((a) => a.kind === 'agent')
    .map((a) => {
      const mine = contributions.filter((r) => r.author === a.handle);
      return {
        handle: a.handle, harness: a.harness, holder: a.holder, note: a.note,
        entries_30d: mine.filter((r) => Number(r.age_days) <= 30).length, entries_all: mine.length,
      };
    })
    .sort((x, y) => y.entries_30d - x.entries_30d || y.entries_all - x.entries_all || x.handle.localeCompare(y.handle)),
});

/* ---------------------------------------------------------------- drawing */

(() => {
  const root = document.getElementById('dash-root') || document;
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => Array.from(root.querySelectorAll(sel));

  const KINDS = ['person', 'agent', 'character', 'figure', 'visitor', 'system'];
  const KIND_LABEL = { person: 'People', agent: 'Agents', character: 'Characters in play', figure: 'World figures', visitor: 'Visitors', system: 'System and tests' };
  const kindColor = (k) => (k === 'system' ? 'var(--cds-chart-muted)' : dash.colors[KINDS.indexOf(k)] || 'var(--cds-chart-muted)');

  const fmt = {
    int: d3.format(','),
    pct: d3.format('.1%'),
    datetime: (v) => d3.utcFormat('%b %-d, %H:%M')(new Date(v)),
    day: (v) => d3.utcFormat('%b %-d')(new Date(String(v).length === 10 ? v + 'T00:00:00Z' : v)),
  };
  const show = (f, v) => {
    if (v == null || v === '') return '—';
    if (f && fmt[f]) {
      if ((f === 'datetime' || f === 'day') && Number.isNaN(Date.parse(String(v).length === 10 ? v + 'T00:00:00Z' : v))) return String(v);
      return fmt[f](v);
    }
    return String(v);
  };

  /* ----- state helpers ----- */
  const status = (id) => dash.data(id).status;
  const rowsOf = (id) => {
    const d = dash.data(id);
    return d.status === 'ok' && Array.isArray(d.data) ? d.data : [];
  };
  function placeholder(box, id) {
    const st = status(id);
    box.replaceChildren();
    box.classList.toggle('dash-skeleton', st === 'loading');
    if (st === 'error') {
      const line = document.createElement('div');
      line.className = 'bd-fail';
      const dot = document.createElement('span');
      dot.className = 'dot';
      const t = document.createElement('span');
      t.textContent = 'Failed to load';
      line.append(dot, t);
      box.appendChild(line);
    }
  }

  /* ----- single-value marks ----- */
  function fillMarks() {
    $$('[data-source][data-field]').forEach((el) => {
      if (el.closest('table')) return;
      const id = el.dataset.source;
      const d = dash.data(id);
      if (d.status !== 'ok') {
        el.textContent = '—';
        el.classList.toggle('dash-skeleton', d.status === 'loading');
        return;
      }
      el.classList.remove('dash-skeleton');
      const rows = Array.isArray(d.data) ? d.data : [];
      let row;
      if (el.dataset.where) {
        const conds = el.dataset.where.split('&').map((p) => p.split('=').map(decodeURIComponent));
        row = rows.find((r) => conds.every(([k, v]) => String(r[k]) === v));
      } else {
        row = rows[Number(el.dataset.row || 0)];
      }
      el.textContent = show(el.dataset.fmt, row ? row[el.dataset.field] : null);
    });
  }

  /* ----- measuring text for margins ----- */
  function measure(svg, strings) {
    const t = svg.append('text').style('font-size', 'var(--cds-font-size-caption)').style('font-family', 'var(--font-anthropic-sans)');
    let w = 0;
    strings.forEach((s) => { t.text(s); w = Math.max(w, t.node().getComputedTextLength()); });
    t.remove();
    return w;
  }
  function styleAxis(g) {
    g.attr('font-size', null).attr('font-family', null);
    g.selectAll('text').style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)');
    g.selectAll('.domain').style('stroke', 'var(--cds-chart-axis)');
    g.selectAll('.tick line').style('stroke', 'var(--cds-chart-axis)');
  }

  /* ----- tooltip ----- */
  function tipFor(box) {
    let tip = box.querySelector('.bd-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'bd-tip';
      tip.hidden = true;
      box.appendChild(tip);
    }
    return tip;
  }
  function showTip(box, tip, event, title, lines) {
    tip.replaceChildren();
    const t = document.createElement('div');
    t.className = 't';
    t.textContent = title;
    tip.appendChild(t);
    lines.forEach((ln) => {
      const l = document.createElement('div');
      l.className = 'l';
      if (ln.color) {
        const sw = document.createElement('span');
        sw.className = 'sw';
        sw.style.background = ln.color;
        l.appendChild(sw);
      }
      const s = document.createElement('span');
      s.textContent = ln.label ? ln.label + '  ' + ln.value : ln.value;
      l.appendChild(s);
      tip.appendChild(l);
    });
    tip.hidden = false;
    const b = box.getBoundingClientRect();
    const x = event.clientX - b.left;
    const y = event.clientY - b.top;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    tip.style.left = Math.max(0, Math.min(b.width - w, x + 12 > b.width - w ? x - w - 12 : x + 12)) + 'px';
    tip.style.top = Math.max(0, Math.min(b.height - h, y - h - 8)) + 'px';
  }

  /* ----- vertical bars (one series) ----- */
  function vbars(box, rows, { x, y, xfmt, label, color }) {
    box.replaceChildren();
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth;
    if (!W || !rows.length) return;
    const H = 220;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
    const ymax = d3.max(rows, (r) => Number(r[y])) || 1;
    const ys0 = d3.scaleLinear([0, ymax], [H - 26, 8]).nice();
    const ticks = ys0.ticks(4);
    const ml = Math.ceil(measure(svg, ticks.map(fmt.int))) + 10;
    const m = { t: 8, r: 6, b: 26, l: ml };
    const xs = d3.scaleBand(rows.map((r) => r[x]), [m.l, W - m.r]).padding(0.22);
    const ys = d3.scaleLinear(ys0.domain(), [H - m.b, m.t]);
    svg.append('g').selectAll('line').data(ticks).join('line')
      .attr('x1', m.l).attr('x2', W - m.r).attr('y1', (d) => ys(d)).attr('y2', (d) => ys(d))
      .style('stroke', 'var(--cds-chart-grid)');
    const gy = svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(ys).tickValues(ticks).tickFormat(fmt.int).tickSize(0).tickPadding(6));
    styleAxis(gy);
    gy.select('.domain').remove();
    const lw = measure(svg, rows.map((r) => xfmt(r[x]))) + 10;
    const every = Math.max(1, Math.ceil(lw / xs.step()));
    const gx = svg.append('g').attr('transform', `translate(0,${H - m.b})`)
      .call(d3.axisBottom(xs).tickValues(xs.domain().filter((d, i) => i % every === 0)).tickFormat(xfmt).tickSizeOuter(0));
    styleAxis(gx);
    const tip = tipFor(box);
    svg.append('g').selectAll('rect').data(rows).join('rect')
      .attr('x', (r) => xs(r[x])).attr('width', xs.bandwidth())
      .attr('y', (r) => ys(Number(r[y]))).attr('height', (r) => Math.max(0, ys(0) - ys(Number(r[y]))))
      .attr('rx', Math.min(4, xs.bandwidth() / 2))
      .style('fill', color)
      .on('pointermove', (event, r) => showTip(box, tip, event, xfmt(r[x]), [{ value: fmt.int(Number(r[y])) }]))
      .on('pointerleave', () => { tip.hidden = true; });
    box.appendChild(tip);
  }

  /* ----- stacked vertical bars by kind ----- */
  function stackedWeeks(box, rows, label) {
    box.replaceChildren();
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth;
    if (!W || !rows.length) return;
    const weeks = [...new Set(rows.map((r) => r.week))];
    const wide = weeks.map((week) => {
      const o = { week };
      KINDS.forEach((k) => { o[k] = 0; });
      rows.filter((r) => r.week === week).forEach((r) => { o[r.kind] = Number(r.entries); });
      return o;
    });
    const series = d3.stack().keys(KINDS)(wide);
    const H = 260;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
    const ymax = d3.max(wide, (o) => KINDS.reduce((s, k) => s + o[k], 0)) || 1;
    const ys0 = d3.scaleLinear([0, ymax], [H - 26, 8]).nice();
    const ticks = ys0.ticks(4);
    const m = { t: 8, r: 6, b: 26, l: Math.ceil(measure(svg, ticks.map(fmt.int))) + 10 };
    const xs = d3.scaleBand(weeks, [m.l, W - m.r]).padding(0.2);
    const ys = d3.scaleLinear(ys0.domain(), [H - m.b, m.t]);
    svg.append('g').selectAll('line').data(ticks).join('line')
      .attr('x1', m.l).attr('x2', W - m.r).attr('y1', (d) => ys(d)).attr('y2', (d) => ys(d))
      .style('stroke', 'var(--cds-chart-grid)');
    const gy = svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(ys).tickValues(ticks).tickFormat(fmt.int).tickSize(0).tickPadding(6));
    styleAxis(gy);
    gy.select('.domain').remove();
    const lw = measure(svg, weeks.map(fmt.day)) + 12;
    const every = Math.max(1, Math.ceil(lw / xs.step()));
    const gx = svg.append('g').attr('transform', `translate(0,${H - m.b})`)
      .call(d3.axisBottom(xs).tickValues(weeks.filter((d, i) => (weeks.length - 1 - i) % every === 0)).tickFormat(fmt.day).tickSizeOuter(0));
    styleAxis(gx);
    const tip = tipFor(box);
    svg.append('g').selectAll('g').data(series).join('g')
      .style('fill', (s) => kindColor(s.key))
      .selectAll('rect').data((s) => s.map((d) => Object.assign(d, { key: s.key }))).join('rect')
      .attr('x', (d) => xs(d.data.week)).attr('width', xs.bandwidth())
      .attr('y', (d) => ys(d[1])).attr('height', (d) => Math.max(0, ys(d[0]) - ys(d[1])));
    svg.append('g').selectAll('rect').data(wide).join('rect')
      .attr('x', (o) => xs(o.week)).attr('width', xs.bandwidth()).attr('y', m.t).attr('height', H - m.b - m.t)
      .style('fill', 'transparent')
      .on('pointermove', (event, o) => {
        const total = KINDS.reduce((s, k) => s + o[k], 0);
        showTip(box, tip, event, 'Week of ' + fmt.day(o.week) + ' · ' + fmt.int(total),
          KINDS.filter((k) => o[k] > 0).map((k) => ({ color: kindColor(k), label: KIND_LABEL[k], value: fmt.int(o[k]) })));
      })
      .on('pointerleave', () => { tip.hidden = true; });
    box.appendChild(tip);
  }

  /* ----- horizontal bars, optionally stacked by kind ----- */
  function hbars(box, rows, { label, value, name, color, stacked, note }) {
    box.replaceChildren();
    box.classList.remove('dash-skeleton');
    const W = box.clientWidth;
    if (!W || !rows.length) return;
    let items;
    if (stacked) {
      const names = [...new Set(rows.map((r) => r[name]))];
      items = names.map((n) => {
        const o = { name: n, total: 0 };
        KINDS.forEach((k) => { o[k] = 0; });
        rows.filter((r) => r[name] === n).forEach((r) => { o[r.kind] = Number(r[value]); o.total += Number(r[value]); });
        return o;
      });
    } else {
      items = rows.map((r) => ({ name: r[name], total: Number(r[value]), row: r }));
    }
    const rowH = 26;
    const H = items.length * rowH + 8;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('role', 'img').attr('aria-label', label);
    const maxLabel = Math.min(W * 0.42, measure(svg, items.map((it) => String(it.name))) + 10);
    const valW = measure(svg, items.map((it) => (note ? note(it) : fmt.int(it.total)))) + 10;
    const xmax = d3.max(items, (it) => it.total) || 1;
    const xs = d3.scaleLinear([0, xmax], [maxLabel, Math.max(maxLabel + 20, W - valW)]);
    const ys = d3.scaleBand(items.map((it) => it.name), [4, H - 4]).padding(0.28);
    const tip = tipFor(box);
    const g = svg.append('g');
    const rowsG = g.selectAll('g').data(items).join('g');
    rowsG.append('text')
      .attr('x', maxLabel - 8).attr('y', (it) => ys(it.name) + ys.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
      .style('fill', 'var(--color-fg)').style('font-size', 'var(--cds-font-size-caption)')
      .text((it) => {
        const s = String(it.name);
        return s.length > 34 ? s.slice(0, 33) + '…' : s;
      });
    if (stacked) {
      rowsG.each(function (it) {
        let x0 = 0;
        KINDS.forEach((k) => {
          if (!it[k]) return;
          d3.select(this).append('rect')
            .attr('x', xs(x0)).attr('width', Math.max(0, xs(x0 + it[k]) - xs(x0)))
            .attr('y', ys(it.name)).attr('height', ys.bandwidth())
            .style('fill', kindColor(k));
          x0 += it[k];
        });
      });
    } else {
      rowsG.append('rect')
        .attr('x', xs(0)).attr('width', (it) => Math.max(0, xs(it.total) - xs(0)))
        .attr('y', (it) => ys(it.name)).attr('height', ys.bandwidth())
        .attr('rx', Math.min(4, ys.bandwidth() / 2))
        .style('fill', (it) => (color ? color(it) : dash.colors[0]));
    }
    rowsG.append('text')
      .attr('x', (it) => xs(it.total) + 6).attr('y', (it) => ys(it.name) + ys.bandwidth() / 2).attr('dy', '0.35em')
      .style('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').style('font-variant-numeric', 'tabular-nums')
      .text((it) => (note ? note(it) : fmt.int(it.total)));
    rowsG.append('rect')
      .attr('x', 0).attr('width', W).attr('y', (it) => ys(it.name) - (ys.step() - ys.bandwidth()) / 2).attr('height', ys.step())
      .style('fill', 'transparent')
      .on('pointermove', (event, it) => {
        const lines = stacked
          ? KINDS.filter((k) => it[k] > 0).map((k) => ({ color: kindColor(k), label: KIND_LABEL[k], value: fmt.int(it[k]) }))
          : [{ value: note ? note(it) : fmt.int(it.total) }];
        showTip(box, tip, event, String(it.name), lines);
      })
      .on('pointerleave', () => { tip.hidden = true; });
    box.appendChild(tip);
  }

  function legend(el, kinds) {
    el.replaceChildren();
    kinds.forEach((k) => {
      const s = document.createElement('span');
      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = kindColor(k);
      s.appendChild(sw);
      s.appendChild(document.createTextNode(KIND_LABEL[k]));
      el.appendChild(s);
    });
  }

  /* ----- tables ----- */
  const sortState = {};
  function table(tableEl, id, cols, opts) {
    const tbody = tableEl.querySelector('tbody');
    tbody.replaceChildren();
    if (status(id) !== 'ok') return;
    let rows = rowsOf(id).slice();
    const st = sortState[tableEl.id] || opts.sort;
    if (st) {
      const c = cols.find((x) => x.field === st.field);
      const num = c && c.num;
      rows.sort((a, b) => {
        const va = a[st.field];
        const vb = b[st.field];
        const r = num ? Number(va) - Number(vb) : String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb));
        return st.dir === 'asc' ? r : -r;
      });
      tableEl.querySelectorAll('th').forEach((th) => {
        if (th.dataset.field === st.field) th.setAttribute('aria-sort', st.dir === 'asc' ? 'ascending' : 'descending');
        else th.removeAttribute('aria-sort');
      });
    }
    const maxes = {};
    cols.filter((c) => c.bar).forEach((c) => { maxes[c.field] = d3.max(rows, (r) => Number(r[c.field])) || 1; });
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.key = String(r[opts.key]);
      cols.forEach((c) => {
        const td = document.createElement('td');
        if (c.num) td.classList.add('r');
        if (c.cls) td.classList.add(c.cls);
        if (c.field === opts.key) td.classList.add('key');
        const text = c.fmt ? show(c.fmt, r[c.field]) : r[c.field] == null || r[c.field] === '' ? '—' : String(r[c.field]);
        if (c.bar) {
          td.classList.add('bd-cellbar');
          const i = document.createElement('i');
          i.style.width = Math.round((Number(r[c.field]) / maxes[c.field]) * 100) + '%';
          i.style.background = c.barColor ? c.barColor(r) : dash.colors[0];
          const b = document.createElement('b');
          b.textContent = text;
          td.append(i, b);
        } else {
          td.textContent = text;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
  function sortable(tableEl, cols, redraw) {
    tableEl.querySelectorAll('th button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.parentElement.dataset.field;
        const c = cols.find((x) => x.field === field);
        const cur = sortState[tableEl.id];
        const dir = cur && cur.field === field ? (cur.dir === 'asc' ? 'desc' : 'asc') : c && c.num ? 'desc' : 'asc';
        sortState[tableEl.id] = { field, dir };
        redraw();
      });
    });
  }

  const COLS = {
    recent: [{ field: 'block' }, { field: 'family', cls: 'bd-hide-narrow' }, { field: 'ago', num: true }],
    here: [{ field: 'n', num: true }, { field: 'who' }, { field: 'act' }, { field: 'where' }, { field: 'ago', num: true }],
    writers: [
      { field: 'author' }, { field: 'kind' }, { field: 'harness', cls: 'bd-hide-narrow' }, { field: 'holder', cls: 'bd-hide-narrow' },
      { field: 'entries_30d', num: true, fmt: 'int', bar: true, barColor: (r) => kindColor(r.kind) },
      { field: 'entries_all', num: true, fmt: 'int', cls: 'bd-hide-narrow' }, { field: 'top_family', cls: 'bd-hide-narrow' },
    ],
    agents: [
      { field: 'handle' }, { field: 'harness' }, { field: 'holder', cls: 'bd-hide-narrow' },
      { field: 'entries_30d', num: true, fmt: 'int', bar: true, barColor: () => kindColor('agent') },
      { field: 'entries_all', num: true, fmt: 'int', cls: 'bd-hide-narrow' },
    ],
    live: [{ field: 'table' }, { field: 'last_pool', cls: 'bd-hide-narrow' }, { field: 'last_voice', num: true, fmt: 'datetime' }],
    worlds: [
      { field: 'world' }, { field: 'role', cls: 'bd-hide-narrow' }, { field: 'blocks', num: true, fmt: 'int' },
      { field: 'changed_7d', num: true, fmt: 'int', cls: 'bd-hide-narrow' }, { field: 'last_change', fmt: 'datetime' },
      { field: 'entries', num: true, fmt: 'int', bar: true }, { field: 'voices', num: true, fmt: 'int', cls: 'bd-hide-narrow' },
    ],
  };

  /* ----- pages ----- */
  const PAGES = ['now', 'writers', 'doors', 'tables'];
  let current = 'now';

  function drawNow() {
    const born = $('#chart-born');
    if (status('born_daily') === 'ok') vbars(born, rowsOf('born_daily'), { x: 'day', y: 'born', xfmt: fmt.day, label: 'New blocks per day', color: dash.colors[0] });
    else placeholder(born, 'born_daily');
    const fam = $('#chart-family');
    if (status('family_7d') === 'ok') hbars(fam, rowsOf('family_7d'), { label: 'Blocks changed in the last 7 days by family', name: 'family', value: 'changed_7d', color: () => dash.colors[0], note: (it) => fmt.int(it.total) + ' of ' + fmt.int(it.row.blocks) });
    else placeholder(fam, 'family_7d');
    table($('#table-recent'), 'recent', COLS.recent, { key: 'block' });
    table($('#table-here'), 'here_acts', COLS.here, { key: 'n' });
    $('#here-empty').hidden = !(status('here_acts') === 'ok' && rowsOf('here_acts').length === 0);
  }

  function drawWriters() {
    const wk = $('#chart-weekly');
    if (status('weekly_kind') === 'ok') {
      legend($('#legend-weekly'), KINDS.filter((k) => rowsOf('weekly_kind').some((r) => r.kind === k && Number(r.entries) > 0)));
      stackedWeeks(wk, rowsOf('weekly_kind'), 'Entries per week by kind of writer');
    } else {
      $('#legend-weekly').replaceChildren();
      placeholder(wk, 'weekly_kind');
    }
    const fk = $('#chart-famkind');
    if (status('family_kind30') === 'ok') {
      legend($('#legend-famkind'), KINDS.filter((k) => rowsOf('family_kind30').some((r) => r.kind === k && Number(r.entries) > 0)));
      hbars(fk, rowsOf('family_kind30'), { label: 'Entries in the last 30 days by family and kind of writer', name: 'family', value: 'entries', stacked: true });
    } else {
      $('#legend-famkind').replaceChildren();
      placeholder(fk, 'family_kind30');
    }
    table($('#table-writers'), 'writers30', COLS.writers, { key: 'author', sort: { field: 'entries_30d', dir: 'desc' } });
  }

  function drawDoors() {
    const doors = $('#chart-doors');
    if (status('doors') === 'ok') {
      hbars(doors, rowsOf('doors'), {
        label: 'Entries by recorded door', name: 'door', value: 'entries_all',
        color: (it) => (it.name === 'not recorded' ? 'var(--cds-chart-muted)' : dash.colors[0]),
        note: (it) => fmt.int(it.total) + ' · ' + fmt.pct(Number(it.row.share_all)),
      });
    } else placeholder(doors, 'doors');
    const hz = $('#chart-harness');
    if (status('harness30') === 'ok') {
      hbars(hz, rowsOf('harness30'), {
        label: 'Agent entries in the last 30 days by harness', name: 'harness', value: 'entries_30d', color: () => kindColor('agent'),
        note: (it) => fmt.int(it.total) + ' · ' + fmt.int(it.row.agents) + (Number(it.row.agents) === 1 ? ' agent' : ' agents'),
      });
    } else placeholder(hz, 'harness30');
    const fc = $('#chart-faces');
    if (status('faces') === 'ok') {
      hbars(fc, rowsOf('faces'), { label: 'Entries by CADO face', name: 'face', value: 'entries_all', color: (it) => (it.name === 'unmarked' ? 'var(--cds-chart-muted)' : dash.colors[2]) });
    } else placeholder(fc, 'faces');
    table($('#table-agents'), 'agents30', COLS.agents, { key: 'handle', sort: { field: 'entries_30d', dir: 'desc' } });
  }

  function drawTables() {
    table($('#table-live'), 'tables_live', COLS.live, { key: 'table' });
    table($('#table-worlds'), 'worlds', COLS.worlds, { key: 'world', sort: { field: 'last_change', dir: 'desc' } });
  }

  function draw() {
    fillMarks();
    const ds = rowsOf('door_summary')[0];
    $('#door-clause').textContent = ds && Number(ds.recorded_share) < 0.5 ? ", so most people's own input cannot yet be told from an LLM's" : '';
    if (current === 'now') drawNow();
    else if (current === 'writers') drawWriters();
    else if (current === 'doors') drawDoors();
    else drawTables();
  }

  function open(id, scroll) {
    if (PAGES.indexOf(id) < 0) id = 'now';
    current = id;
    PAGES.forEach((p) => {
      const sec = $('#' + p);
      const tab = $('#tab-' + p);
      sec.hidden = p !== id;
      tab.setAttribute('aria-selected', String(p === id));
      tab.tabIndex = p === id ? 0 : -1;
    });
    dash.setLink(id);
    draw();
    if (scroll) $('#top').scrollIntoView();
  }

  $$('.bd-tab').forEach((tab) => tab.addEventListener('click', () => open(tab.dataset.page, false)));
  $('.bd-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = PAGES.indexOf(current) + (e.key === 'ArrowRight' ? 1 : -1);
    const next = PAGES[(i + PAGES.length) % PAGES.length];
    open(next, false);
    $('#tab-' + next).focus();
  });
  sortable($('#table-writers'), COLS.writers, draw);
  sortable($('#table-agents'), COLS.agents, draw);
  sortable($('#table-worlds'), COLS.worlds, draw);

  const named = location.hash.slice(1);
  open(PAGES.indexOf(named) >= 0 ? named : 'now', false);
  dash.onData(draw);
})();
