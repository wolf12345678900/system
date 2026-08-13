/* ══════════════════════════════════════════════════════════════════
   state.js — Datenmodell, Persistenz, Export/Import
   Alles bleibt lokal im Browser. Kein Server, kein Account.
   ══════════════════════════════════════════════════════════════════ */

const SAVE_KEY = 'system.save.v1';
export const SAVE_VERSION = 1;

/* ── Datums-Helfer ────────────────────────────────────────────────── */

/** Tagesschlüssel "YYYY-MM-DD" unter Berücksichtigung der Reset-Stunde. */
export function dayKey(ts = Date.now(), resetHour = 0) {
  const d = new Date(ts);
  d.setHours(d.getHours() - resetHour);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Zeitpunkt, an dem der aktuelle Questtag endet. */
export function dayEnd(ts = Date.now(), resetHour = 0) {
  const d = new Date(ts);
  d.setHours(d.getHours() - resetHour);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  d.setHours(d.getHours() + resetHour);
  return d.getTime();
}

/** Anzahl Tage zwischen zwei Tagesschlüsseln. */
export function daysBetween(a, b) {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const ta = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((tb - ta) / 86400000);
}

/** Tagesschlüssel um n Tage verschieben. */
export function shiftKey(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  const p = (x) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** ISO-Kalenderwoche als "YYYY-Www" — für Ruler's Authority. */
export function weekKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/* ── Startzustand ─────────────────────────────────────────────────── */

export function createState() {
  return {
    version: SAVE_VERSION,
    awakened: false,
    player: { name: 'PLAYER', createdAt: Date.now() },

    level: 1,
    xp: 0,
    points: 0,
    stats: { str: 10, agi: 10, vit: 10, int: 10, sen: 10 },
    fatigue: 0,

    job: 'none',
    title: 'rookie',
    titles: ['rookie'],
    skills: [],

    /* Ergebnisse des Awakening Tests — Basis für das Questvolumen */
    baseline: { pushups: 10, situps: 12, squats: 15, run: 1 },

    streak: 0,
    bestStreak: 0,
    totalQuests: 0,
    penaltiesCleared: 0,
    penaltiesTaken: 0,
    earlyFinishes: 0,
    restUsedWeek: null,
    jobQuestDone: false,

    today: null,          // aktive Quest, siehe engine.buildDaily()
    stashed: null,        // während des Job Change Quests geparkte Tagesquest
    pendingPenalty: false,
    lastActiveDay: null,  // letzter Tag mit abgeschlossener Quest

    history: [],          // { date, kind, goals, progress, done, xp, level }

    settings: {
      sound: true,
      notify: false,
      notifyTime: '18:00',
      resetHour: 0,
      confirmReps: true,
    },
  };
}

/* ── Laden / Speichern ────────────────────────────────────────────── */

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createState();
    const data = JSON.parse(raw);
    return migrate(data);
  } catch (err) {
    console.error('Speicherstand konnte nicht gelesen werden:', err);
    return createState();
  }
}

let saveTimer = null;
export function save(state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Speichern fehlgeschlagen:', err);
    }
  }, 120);
}

export function saveNow(state) {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Speichern fehlgeschlagen:', err);
  }
}

/** Ältere Speicherstände auf das aktuelle Schema heben. */
function migrate(data) {
  const base = createState();
  const merged = {
    ...base,
    ...data,
    stats: { ...base.stats, ...(data.stats || {}) },
    settings: { ...base.settings, ...(data.settings || {}) },
    player: { ...base.player, ...(data.player || {}) },
    baseline: { ...base.baseline, ...(data.baseline || {}) },
  };
  merged.version = SAVE_VERSION;
  if (!Array.isArray(merged.titles)) merged.titles = ['rookie'];
  if (!Array.isArray(merged.skills)) merged.skills = [];
  if (!Array.isArray(merged.history)) merged.history = [];
  return merged;
}

/* ── Export / Import ──────────────────────────────────────────────── */

/**
 * Sichert den Speicherstand.
 * Auf iOS läuft ein normaler Download in der installierten App ins Leere —
 * dort wird stattdessen der Teilen-Dialog benutzt, über den die Datei in
 * „Dateien", iCloud oder einen Chat wandert.
 * Rückgabe: 'shared' | 'downloaded' | 'cancelled'
 */
export async function exportFile(state) {
  const stamp = dayKey(Date.now(), state.settings.resetHour);
  const name = `system-backup-${stamp}.json`;
  const text = JSON.stringify(state, null, 2);
  const blob = new Blob([text], { type: 'application/json' });

  if (navigator.canShare) {
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'THE SYSTEM — Backup' });
        return 'shared';
      }
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // sonst weiter zum Download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

/** Letzte Rettung, wenn weder Teilen noch Download klappt. */
export async function exportClipboard(state) {
  const text = JSON.stringify(state);
  await navigator.clipboard.writeText(text);
  return text.length;
}

/** Speicherstand aus eingefügtem Text wiederherstellen. */
export function importText(text) {
  const data = JSON.parse(text);
  if (typeof data !== 'object' || data === null || !('stats' in data)) {
    throw new Error('Der Text enthält keinen gültigen Speicherstand.');
  }
  return migrate(data);
}

export function importFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (typeof data !== 'object' || data === null || !('stats' in data)) {
          throw new Error('Datei enthält keinen gültigen Speicherstand.');
        }
        resolve(migrate(data));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsText(file);
  });
}

export function wipe() {
  localStorage.removeItem(SAVE_KEY);
}
