/* ══════════════════════════════════════════════════════════════════
   charts.js — SVG-Diagramme ohne externe Bibliotheken
   ══════════════════════════════════════════════════════════════════ */

import { esc } from './ui.js';

const W = 320, H = 130;
const PAD = { l: 30, r: 6, t: 10, b: 20 };

function niceMax(v) {
  if (v <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function frame(max, unit) {
  const ih = H - PAD.t - PAD.b;
  let g = '';
  for (let i = 0; i <= 2; i++) {
    const y = PAD.t + (ih * i) / 2;
    const val = max - (max * i) / 2;
    g += `<line class="grid-l" x1="${PAD.l}" y1="${y.toFixed(1)}" x2="${W - PAD.r}" y2="${y.toFixed(1)}"/>`;
    g += `<text class="tick" x="${PAD.l - 5}" y="${(y + 3).toFixed(1)}" text-anchor="end">${fmtTick(val)}</text>`;
  }
  return g;
}

function fmtTick(v) {
  if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + 'k';
  return String(Math.round(v * 10) / 10).replace('.', ',');
}

const defs = `
  <defs>
    <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="rgba(90,216,255,0.34)"/>
      <stop offset="100%" stop-color="rgba(90,216,255,0)"/>
    </linearGradient>
  </defs>`;

/** Liniendiagramm mit Flächenverlauf. */
export function lineChart(points, { unit = '', labelEvery = 0 } = {}) {
  if (!points.length) return emptyChart();
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const n = points.length;
  const x = (i) => PAD.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v) => PAD.t + ih - (ih * v) / max;

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${(PAD.t + ih).toFixed(1)} L${x(0).toFixed(1)},${(PAD.t + ih).toFixed(1)} Z`;

  const step = labelEvery || Math.max(1, Math.ceil(n / 5));
  let labels = '';
  points.forEach((p, i) => {
    if (i % step === 0 || i === n - 1) {
      labels += `<text class="tick" x="${x(i).toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(p.label)}</text>`;
    }
  });

  const lastDot = `<circle class="dot" cx="${x(n - 1).toFixed(1)}" cy="${y(points[n - 1].value).toFixed(1)}" r="3.2"/>`;

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${defs}${frame(max, unit)}
    <path class="area" d="${area}"/>
    <path class="line" d="${line}"/>
    ${lastDot}${labels}
  </svg>`;
}

/** Balkendiagramm. */
export function barChart(points, { color = 'var(--cyan)' } = {}) {
  if (!points.length) return emptyChart();
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const n = points.length;
  const slot = iw / n;
  const bw = Math.max(1.5, Math.min(14, slot * 0.62));

  let bars = '';
  points.forEach((p, i) => {
    const h = (ih * p.value) / max;
    const cx = PAD.l + slot * i + slot / 2;
    bars += `<rect class="barc" x="${(cx - bw / 2).toFixed(1)}" y="${(PAD.t + ih - h).toFixed(1)}"
             width="${bw.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}"
             style="fill:${color}"/>`;
  });

  const step = Math.max(1, Math.ceil(n / 5));
  let labels = '';
  points.forEach((p, i) => {
    if (i % step === 0 || i === n - 1) {
      const cx = PAD.l + slot * i + slot / 2;
      labels += `<text class="tick" x="${cx.toFixed(1)}" y="${H - 5}" text-anchor="middle">${esc(p.label)}</text>`;
    }
  });

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${defs}${frame(max)}${bars}${labels}
  </svg>`;
}

function emptyChart() {
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    <text class="tick" x="${W / 2}" y="${H / 2}" text-anchor="middle">Noch keine Daten</text>
  </svg>`;
}

/** Netzdiagramm der fünf Statuswerte. */
export function radarChart(values, labels, colors) {
  const size = 220, c = size / 2, r = 74;
  const n = values.length;
  const max = Math.max(...values, 20) * 1.15;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const d = (v / max) * r;
    return [c + Math.cos(a) * d, c + Math.sin(a) * d];
  };

  let rings = '';
  for (let k = 1; k <= 3; k++) {
    const pts = Array.from({ length: n }, (_, i) => pt(i, (max * k) / 3).map((x) => x.toFixed(1)).join(','));
    rings += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(90,216,255,0.14)" stroke-width="1"/>`;
  }
  let spokes = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(i, max);
    spokes += `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(90,216,255,0.12)" stroke-width="1"/>`;
  }

  const poly = values.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ');
  let dots = '';
  values.forEach((v, i) => {
    const [x, y] = pt(i, v);
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${colors[i]}" stroke="var(--bg-0)" stroke-width="1.5"/>`;
  });

  let text = '';
  labels.forEach((l, i) => {
    const [x, y] = pt(i, max * 1.24);
    const anchor = x < c - 6 ? 'end' : x > c + 6 ? 'start' : 'middle';
    text += `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${anchor}"
              fill="${colors[i]}" font-size="10" font-family="var(--ff-num)" stroke="none">${esc(l)}</text>`;
  });

  return `<svg class="chart" viewBox="0 0 ${size} ${size}" role="img" style="max-width:260px;margin:0 auto">
    ${rings}${spokes}
    <polygon points="${poly}" fill="rgba(90,216,255,0.18)" stroke="var(--cyan)" stroke-width="1.8"
             style="filter:drop-shadow(0 0 6px rgba(90,216,255,0.5))"/>
    ${dots}${text}
  </svg>`;
}
