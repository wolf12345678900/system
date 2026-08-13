/* ══════════════════════════════════════════════════════════════════
   audio.js — Systemklänge, vollständig synthetisch erzeugt.
   Keine Audiodateien: funktioniert offline und braucht kein Laden.
   ══════════════════════════════════════════════════════════════════ */

let ctx = null;
let enabled = true;
let master = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
  return ctx;
}

export function setEnabled(on) {
  enabled = !!on;
}

/** Beim ersten Tippen entsperren — Browser blockieren Audio sonst. */
export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

function tone({ freq, dur = 0.16, type = 'sine', gain = 0.5, delay = 0, sweep = null, detune = 0 }) {
  if (!enabled) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweep) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t0 + dur);
  osc.detune.value = detune;

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.3, gain = 0.25, delay = 0, cutoff = 900, q = 1 }) {
  if (!enabled) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = cutoff;
  filt.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;

  src.connect(filt).connect(g).connect(master);
  src.start(t0);
}

/* ── Klangbibliothek ──────────────────────────────────────────────── */

/** Das charakteristische Aufploppen eines Systemfensters. */
export const sfx = {
  window() {
    tone({ freq: 880, dur: 0.1, type: 'triangle', gain: 0.28, sweep: 1760 });
    tone({ freq: 1320, dur: 0.16, type: 'sine', gain: 0.18, delay: 0.04 });
    noise({ dur: 0.12, gain: 0.06, cutoff: 3000 });
  },

  /** Systemmeldung / Benachrichtigung. */
  ping() {
    tone({ freq: 1245, dur: 0.09, type: 'sine', gain: 0.3 });
    tone({ freq: 1661, dur: 0.22, type: 'sine', gain: 0.24, delay: 0.07 });
  },

  /** Ein Satz wurde eingetragen. */
  tap() {
    tone({ freq: 660, dur: 0.06, type: 'square', gain: 0.14 });
    tone({ freq: 990, dur: 0.09, type: 'sine', gain: 0.16, delay: 0.03 });
  },

  /** Ein Questziel ist erfüllt. */
  objective() {
    [880, 1108, 1318].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.24, delay: i * 0.06 }));
  },

  /** Quest abgeschlossen. */
  complete() {
    [659, 830, 988, 1319].forEach((f, i) =>
      tone({ freq: f, dur: 0.34, type: 'triangle', gain: 0.26, delay: i * 0.085 }));
    noise({ dur: 0.5, gain: 0.05, cutoff: 2200, delay: 0.1 });
  },

  /** Level-Up — aufsteigendes Arpeggio mit Nachhall-Ton. */
  levelUp() {
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((f, i) =>
      tone({ freq: f, dur: 0.42, type: 'triangle', gain: 0.3, delay: i * 0.075 }));
    tone({ freq: 2093, dur: 1.4, type: 'sine', gain: 0.2, delay: 0.5 });
    tone({ freq: 1046, dur: 1.6, type: 'sine', gain: 0.14, delay: 0.5 });
    noise({ dur: 0.9, gain: 0.07, cutoff: 4000, delay: 0.42 });
  },

  /** Titel oder Skill erhalten. */
  unlock() {
    tone({ freq: 1568, dur: 0.2, type: 'sine', gain: 0.24 });
    tone({ freq: 2093, dur: 0.5, type: 'sine', gain: 0.2, delay: 0.1 });
    tone({ freq: 1046, dur: 0.6, type: 'triangle', gain: 0.14, delay: 0.1 });
  },

  /** Penalty Zone — tiefer, bedrohlicher Einschlag. */
  penalty() {
    tone({ freq: 140, dur: 1.5, type: 'sawtooth', gain: 0.3, sweep: 42 });
    tone({ freq: 88, dur: 2.0, type: 'square', gain: 0.16, sweep: 36, delay: 0.06 });
    noise({ dur: 1.6, gain: 0.2, cutoff: 380, q: 6 });
    tone({ freq: 1400, dur: 0.06, type: 'square', gain: 0.12, delay: 0.3 });
    tone({ freq: 900, dur: 0.05, type: 'square', gain: 0.1, delay: 0.42 });
  },

  /** Warnung, wenn die Zeit knapp wird. */
  alarm() {
    for (let i = 0; i < 3; i++) {
      tone({ freq: 740, dur: 0.13, type: 'square', gain: 0.2, delay: i * 0.24 });
      tone({ freq: 555, dur: 0.13, type: 'square', gain: 0.18, delay: i * 0.24 + 0.11 });
    }
  },

  /** Timer-Tick in der Satzpause. */
  tick() {
    tone({ freq: 1200, dur: 0.04, type: 'sine', gain: 0.12 });
  },

  /** Pause vorbei. */
  restOver() {
    [880, 1320].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.3, delay: i * 0.13 }));
  },

  /** Fehlerhafte Eingabe. */
  deny() {
    tone({ freq: 220, dur: 0.16, type: 'square', gain: 0.18, sweep: 130 });
  },
};
