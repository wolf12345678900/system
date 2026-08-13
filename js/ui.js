/* ══════════════════════════════════════════════════════════════════
   ui.js — Bausteine der Oberfläche
   Systemfenster, Toasts, Overlays, Level-Up-Sequenz, Partikel.
   ══════════════════════════════════════════════════════════════════ */

import { sfx } from './audio.js';

/* ── Kleinkram ────────────────────────────────────────────────────── */

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function fmtNum(n, unit) {
  if (unit === 'km') return (Math.round(n * 10) / 10).toString().replace('.', ',');
  return Math.round(n).toString();
}

export function fmtClock(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

export function fmtMMSS(sec) {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function fmtDate(key) {
  const [y, m, d] = key.split('-');
  return `${d}.${m}.${y}`;
}

/* ── Fenster-Vorlage ──────────────────────────────────────────────── */

export function win(title, body, { cls = '', meta = '' } = {}) {
  return `
    <div class="sys-window ${cls}">
      ${title ? `<div class="win-title">${esc(title)}${meta ? `<small>${esc(meta)}</small>` : ''}</div>` : ''}
      ${body}
    </div>`;
}

export function bar(pct, cls = '') {
  const w = Math.max(0, Math.min(100, pct * 100));
  return `<div class="bar ${cls}"><div class="bar__fill" style="width:${w.toFixed(1)}%"></div></div>`;
}

export function gauge(label, value, max, cls = '', suffix = '') {
  const pct = max ? value / max : 0;
  return `
    <div class="gauge">
      <div class="gauge__head">
        <span class="label">${esc(label)}</span>
        <b class="num">${fmtNum(value)}${suffix} / ${fmtNum(max)}${suffix}</b>
      </div>
      ${bar(pct, cls)}
    </div>`;
}

/* ── Toasts (Systemmeldungen) ─────────────────────────────────────── */

const toastRoot = () => document.getElementById('toasts');

export function toast(text, { title = 'System', kind = '', ms = 4600, sound = 'ping' } = {}) {
  const el = document.createElement('div');
  el.className = `toast ${kind ? `toast--${kind}` : ''}`;
  el.innerHTML = `<b>${esc(title)}</b>${esc(text)}`;
  toastRoot().appendChild(el);
  if (sound && sfx[sound]) sfx[sound]();

  const kill = () => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 320);
  };
  const t = setTimeout(kill, ms);
  el.addEventListener('click', () => { clearTimeout(t); kill(); });
  return el;
}

/* ── Overlay / Modal ──────────────────────────────────────────────── */

let overlayCloser = null;

export function openOverlay(bodyHtml, { dismissible = true, onClose = null, sound = true } = {}) {
  const ov = document.getElementById('overlay');
  ov.innerHTML = `<div class="overlay__box">${bodyHtml}</div>`;
  ov.hidden = false;
  if (sound) sfx.window();

  overlayCloser = onClose;
  ov.onclick = (e) => {
    if (dismissible && e.target === ov) closeOverlay();
  };
  return ov;
}

export function closeOverlay() {
  const ov = document.getElementById('overlay');
  ov.hidden = true;
  ov.innerHTML = '';
  ov.onclick = null;
  const fn = overlayCloser;
  overlayCloser = null;
  if (fn) fn();
}

export function isOverlayOpen() {
  return !document.getElementById('overlay').hidden;
}

/** Ja/Nein-Abfrage im Systemfenster-Look. */
export function confirmBox(title, text, { yes = 'Bestätigen', no = 'Abbrechen', danger = false } = {}) {
  return new Promise((resolve) => {
    openOverlay(win(title, `
      <p class="sys-text" style="margin-bottom:18px">${text}</p>
      <div class="btn-row">
        <button class="btn btn--ghost" data-act="no">${esc(no)}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-act="yes">${esc(yes)}</button>
      </div>`, { cls: danger ? 'sys-window--danger' : '' }), {
      onClose: () => resolve(false),
    });
    const ov = document.getElementById('overlay');
    ov.querySelector('[data-act="yes"]').onclick = () => { closeOverlay(); resolve(true); };
    ov.querySelector('[data-act="no"]').onclick = () => { closeOverlay(); resolve(false); };
  });
}

/* ── Level-Up-Vollbild ────────────────────────────────────────────── */

export function levelUpScreen(levels, gains) {
  return new Promise((resolve) => {
    const el = document.getElementById('levelup');
    const last = levels[levels.length - 1];
    el.innerHTML = `
      <div class="levelup__inner">
        <div class="levelup__rays"></div>
        <div class="levelup__word">LEVEL UP</div>
        <div class="levelup__num">${last}</div>
        <div class="levelup__gains">
          ${levels.length > 1 ? `<div><b>${levels.length}</b> Level auf einmal</div>` : ''}
          <div>Alle Werte <b>+${levels.length}</b></div>
          <div>Freie Statuspunkte <b>+${gains}</b></div>
        </div>
        <div class="levelup__hint">Zum Fortfahren tippen</div>
      </div>`;
    el.hidden = false;
    sfx.levelUp();

    const done = () => {
      el.hidden = true;
      el.innerHTML = '';
      el.onclick = null;
      resolve();
    };
    el.onclick = done;
    setTimeout(() => { if (!el.hidden) el.onclick = done; }, 400);
  });
}

/* ── Partikel im Hintergrund ──────────────────────────────────────── */

export function startParticles() {
  const cv = document.getElementById('particles');
  if (!cv || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, parts = [];

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = cv.width = innerWidth * dpr;
    h = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px';
    cv.style.height = innerHeight + 'px';
    const count = Math.round((innerWidth * innerHeight) / 42000);
    parts = Array.from({ length: Math.min(46, count) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.4 + 0.5) * dpr,
      vy: -(Math.random() * 0.25 + 0.06) * dpr,
      vx: (Math.random() - 0.5) * 0.1 * dpr,
      a: Math.random() * 0.45 + 0.15,
      t: Math.random() * Math.PI * 2,
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    const penalty = document.body.classList.contains('is-penalty');
    const col = penalty ? '255,90,90' : '120,200,255';
    for (const p of parts) {
      p.y += p.vy;
      p.x += p.vx;
      p.t += 0.02;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      const a = p.a * (0.6 + 0.4 * Math.sin(p.t));
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.fillRect(p.x, p.y, p.r, p.r * 3);
    }
    requestAnimationFrame(draw);
  };

  resize();
  addEventListener('resize', resize);
  requestAnimationFrame(draw);
}

/* ── Boot-Sequenz ─────────────────────────────────────────────────── */

export function bootSequence(lines, target) {
  return new Promise((resolve) => {
    target.innerHTML = `<div class="boot"><div class="boot__lines" id="bootLines"></div></div>`;
    const box = document.getElementById('bootLines');
    let i = 0;
    const step = () => {
      if (i >= lines.length) {
        setTimeout(resolve, 340);
        return;
      }
      const d = document.createElement('div');
      d.textContent = `> ${lines[i]}`;
      box.appendChild(d);
      sfx.tick();
      i += 1;
      setTimeout(step, 260);
    };
    step();
  });
}

/* ── Zahlen hochzählen lassen ─────────────────────────────────────── */

export function countUp(el, from, to, ms = 700) {
  const t0 = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
