/* ══════════════════════════════════════════════════════════════════
   engine.js — Progression, Questgenerierung, Fatigue, Belohnungen
   Original-Werte: Level-Up → alle Stats +1 und 5 freie Punkte,
   abgeschlossene Daily Quest → 3 freie Punkte.
   ══════════════════════════════════════════════════════════════════ */

import {
  EXERCISES, EX_BY_ID, PENALTY_EXERCISES, RECOVERY_EXERCISES,
  RANKS, TITLES, TITLE_BY_ID, SKILLS, JOB_CHANGE_LEVEL,
} from './content.js';
import { dayKey, daysBetween, weekKey, shiftKey } from './state.js';

/* Level, ab dem die Original-Quest (100/100/100 + 10 km) erreicht ist. */
export const CAP_LEVEL = 50;

/* ── Grundformeln ─────────────────────────────────────────────────── */

/** Erfahrung bis zum nächsten Level. */
export function xpNeeded(level) {
  return 60 + 40 * level;
}

/** Fortschritt 0…1 auf dem Weg zur vollen Original-Quest. */
export function progressRatio(level) {
  return Math.min(1, Math.max(0, (level - 1) / (CAP_LEVEL - 1)));
}

export function rankFor(level) {
  let out = RANKS[0];
  for (const r of RANKS) if (level >= r.min) out = r;
  return out;
}

/** Gesammelte Effekte aus aktivem Titel und gelernten Skills. */
export function effects(state) {
  const t = TITLE_BY_ID[state.title]?.effect || {};
  const e = {
    xp: t.xp || 1,
    fatigue: t.fatigue || 1,
    points: t.points || 0,
    hasRest: state.skills.includes('rulers_authority'),
    hasStealth: state.skills.includes('stealth'),
  };
  if (state.skills.includes('iron_body')) e.fatigue *= 0.85;
  if (state.skills.includes('shadow_extraction')) e.points += 2;
  return e;
}

/* ── Questvolumen ─────────────────────────────────────────────────── */

/** Tagesziel einer Wiederholungs-Übung auf dem aktuellen Level. */
export function goalForReps(state, exId) {
  const ex = EX_BY_ID[exId];
  const base = state.baseline[exId] || 10;
  const start = Math.min(ex.target, Math.max(8, Math.round(base * 1.5)));
  const p = progressRatio(state.level);
  let goal = Math.round(start + (ex.target - start) * p);
  if (state.level > CAP_LEVEL) {
    goal = ex.target + Math.min(100, (state.level - CAP_LEVEL) * 2);
  }
  return Math.max(5, goal);
}

/** Tagesziel für den Lauf, in halben Kilometern. */
export function goalForRun(state) {
  const base = state.baseline.run || 1;
  const start = Math.min(10, Math.max(0.5, Math.round(base * 0.8 * 2) / 2));
  const p = progressRatio(state.level);
  let goal = start + (10 - start) * p;
  if (state.level > CAP_LEVEL) goal = 10 + Math.min(5, (state.level - CAP_LEVEL) * 0.1);
  return Math.round(goal * 2) / 2;
}

/**
 * Empfohlene Satzgröße im geführten Modus: 60 % des Referenzwerts, aber
 * immer groß genug, dass das Tagesziel in höchstens sechs Sätzen aufgeht.
 */
export function setSize(state, exId, goal = null) {
  const base = state.baseline[exId] || 10;
  const g = goal ?? goalForReps(state, exId);
  const size = Math.max(base * 0.6, g / 6);
  return Math.max(3, Math.min(Math.round(g), Math.round(size)));
}

/** Wie nah das aktuelle Tagesvolumen am Original-Ziel liegt (0…1). */
function volumeRatio(quest) {
  const reps = quest.items.filter((i) => i.unit === 'Wdh');
  if (!reps.length) return 0.2;
  let sum = 0;
  for (const i of reps) sum += Math.min(1, i.goal / (EX_BY_ID[i.id]?.target || 100));
  return sum / reps.length;
}

/* ── Questaufbau ──────────────────────────────────────────────────── */

function mkItem(def, goal, extra = {}) {
  return {
    id: def.id,
    name: def.name,
    en: def.en,
    unit: def.unit,
    stat: def.stat,
    hint: def.hint,
    manual: !!def.manual,
    goal,
    progress: 0,
    sets: [],
    ...extra,
  };
}

/** Die tägliche Quest — adaptiv, ggf. wegen Erschöpfung gedrosselt. */
export function buildDaily(state, date) {
  const reduce = state.fatigue >= 60 ? 0.75 : 1;
  const items = EXERCISES.map((ex) => {
    if (ex.id === 'run') {
      const g = Math.max(0.5, Math.round(goalForRun(state) * reduce * 2) / 2);
      return mkItem(ex, g);
    }
    const g = Math.max(5, Math.round(goalForReps(state, ex.id) * reduce));
    return mkItem(ex, g);
  });

  return {
    date,
    kind: 'daily',
    name: 'The Preparation To Become Powerful',
    subtitle: 'Daily Quest',
    items,
    reduced: reduce < 1,
    done: false,
    startedAt: null,
    completedAt: null,
  };
}

/** Erholungsprotokoll bei kritischer Erschöpfung. */
export function buildRecovery(state, date) {
  const items = [
    mkItem(RECOVERY_EXERCISES[0], 2),    // 2 km Spaziergang
    mkItem(RECOVERY_EXERCISES[1], 10),   // 10 Minuten Dehnen
  ];
  items[0].manual = true;
  items[1].manual = true;
  return {
    date,
    kind: 'recovery',
    name: 'Recovery Protocol',
    subtitle: 'Erholungsprotokoll',
    items,
    reduced: true,
    done: false,
    startedAt: null,
    completedAt: null,
  };
}

/** Die Strafquest „Survival" in der Penalty Zone. */
export function buildPenalty(state, date) {
  const e = effects(state);
  const scale = (e.hasStealth ? 0.75 : 1) * 0.6;
  const p = progressRatio(state.level);

  // Zwei rotierende Strafübungen, abhängig vom Datum — nie zweimal dasselbe.
  const seed = Number(date.replaceAll('-', '')) % PENALTY_EXERCISES.length;
  const picks = [PENALTY_EXERCISES[seed], PENALTY_EXERCISES[(seed + 1) % PENALTY_EXERCISES.length]];

  const items = picks.map((def) => {
    if (def.unit === 'Sek') {
      const g = Math.round((45 + 135 * p) * scale / 5) * 5;
      return mkItem(def, Math.max(20, g));
    }
    const g = Math.round((25 + 55 * p) * scale);
    return mkItem(def, Math.max(8, g));
  });

  // Plus ein Rest der versäumten Kernarbeit — die Schuld von gestern.
  items.push(mkItem(EX_BY_ID.squats, Math.max(10, Math.round(goalForReps(state, 'squats') * scale))));

  return {
    date,
    kind: 'penalty',
    name: 'Survival',
    subtitle: 'Penalty Zone',
    items,
    reduced: false,
    done: false,
    startedAt: null,
    completedAt: null,
  };
}

/** Job Change Quest: 20 Minuten, so viele Runden wie möglich. */
export function buildJobQuest(state, date) {
  const p = progressRatio(state.level);
  const circuit = [
    { id: 'pushups', name: 'Liegestütze', reps: Math.round(8 + 7 * p) },
    { id: 'situps',  name: 'Sit-ups',     reps: Math.round(8 + 7 * p) },
    { id: 'squats',  name: 'Kniebeugen',  reps: Math.round(12 + 8 * p) },
  ];
  return {
    date,
    kind: 'jobchange',
    name: 'Job Change Quest',
    subtitle: 'Last as long as possible',
    durationMin: 20,
    circuit,
    rounds: 0,
    items: [],
    reduced: false,
    done: false,
    startedAt: null,
    completedAt: null,
  };
}

/* ── Tageswechsel ─────────────────────────────────────────────────── */

/**
 * Prüft, ob seit dem letzten Besuch Tage vergangen sind, archiviert die
 * alte Quest, wendet nächtliche Erholung an und entscheidet über die
 * Penalty Zone. Gibt eine Liste von Ereignissen für die Oberfläche zurück.
 */
export function rollover(state) {
  const events = [];
  const today = dayKey(Date.now(), state.settings.resetHour);

  // Skills nachziehen — etwa nach dem Einspielen eines Backups
  syncSkills(state);

  // Ein Tageswechsel mitten im Job Change Quest: die geparkte Quest zählt
  if (state.today?.kind === 'jobchange' && state.stashed) {
    state.today = state.stashed;
    state.stashed = null;
  }

  if (!state.today) {
    state.today = decideQuest(state, today);
    events.push({ type: 'newQuest', quest: state.today });
    return events;
  }
  if (state.today.date === today) return events;

  const elapsed = Math.max(1, daysBetween(state.today.date, today));
  const prev = state.today;

  // Alte Quest archivieren
  archive(state, prev);

  let missed = 0;
  if (!prev.done && (prev.kind === 'daily' || prev.kind === 'recovery')) missed += 1;
  // Vollständig übersprungene Tage dazwischen
  missed += elapsed - 1;

  // Nächtliche Erholung für jeden vergangenen Tag
  const rec = recoveryPerNight(state);
  state.fatigue = Math.max(0, state.fatigue - rec * elapsed);

  if (missed > 0) {
    const e = effects(state);
    const wk = weekKey(prev.date);
    if (missed === 1 && e.hasRest && state.restUsedWeek !== wk) {
      // Ruler's Authority fängt genau einen Tag pro Woche ab
      state.restUsedWeek = wk;
      events.push({ type: 'restUsed' });
    } else {
      state.streak = 0;
      state.pendingPenalty = true;
      state.penaltiesTaken += 1;
      events.push({ type: 'penalty', missed });
    }
  }

  state.today = decideQuest(state, today);
  events.push({ type: 'newQuest', quest: state.today });
  return events;
}

function archive(state, quest) {
  if (!quest || quest.kind === 'jobchange') return;
  const already = state.history.find((h) => h.date === quest.date);
  const entry = {
    date: quest.date,
    kind: quest.kind,
    done: quest.done,
    level: state.level,
    goals: Object.fromEntries(quest.items.map((i) => [i.id, i.goal])),
    progress: Object.fromEntries(quest.items.map((i) => [i.id, i.progress])),
  };
  if (already) Object.assign(already, entry);
  else state.history.push(entry);
  if (state.history.length > 1200) state.history.splice(0, state.history.length - 1200);
}

/** Welche Quest bekommt der Spieler heute? */
export function decideQuest(state, date) {
  if (state.pendingPenalty) return buildPenalty(state, date);
  if (state.fatigue >= 85) return buildRecovery(state, date);
  return buildDaily(state, date);
}

/**
 * Nächtliche Erholung. Wächst mit Ausdauer und mit der Erschöpfung selbst —
 * ein ausgelaugter Körper erholt sich in Ruhe schneller. Dadurch pendelt der
 * Wert um die Drosselschwelle, statt auf einem Plateau festzuhängen.
 */
export function recoveryPerNight(state) {
  return Math.min(24, 6 + state.stats.vit / 14 + state.fatigue * 0.06);
}

/* ── Fortschritt eintragen ────────────────────────────────────────── */

/** Einen Satz / einen Eintrag zu einer Übung hinzufügen. */
export function addProgress(state, itemId, amount) {
  const q = state.today;
  if (!q) return null;
  const item = q.items.find((i) => i.id === itemId);
  if (!item || amount <= 0) return null;

  item.progress = Math.round((item.progress + amount) * 100) / 100;
  item.sets.push(amount);
  if (!q.startedAt) q.startedAt = Date.now();
  return item;
}

/**
 * Hebt die Referenzwerte anhand des besten Einzelsatzes — aber höchstens
 * um 2 pro Tag. Sonst würde ein einziger Sammeleintrag ("heute 100 am Stück")
 * das Questvolumen sofort nach oben katapultieren.
 */
function raiseBaselines(state, quest) {
  for (const item of quest.items) {
    if (item.unit !== 'Wdh' || !EX_BY_ID[item.id] || !item.sets.length) continue;
    const best = Math.max(...item.sets);
    const cur = state.baseline[item.id] || 0;
    if (best > cur) state.baseline[item.id] = Math.min(best, cur + 2);
  }
}

export function undoSet(state, itemId) {
  const item = state.today?.items.find((i) => i.id === itemId);
  if (!item || !item.sets.length) return null;
  const last = item.sets.pop();
  item.progress = Math.max(0, Math.round((item.progress - last) * 100) / 100);
  return item;
}

export function isQuestComplete(quest) {
  if (!quest) return false;
  if (quest.kind === 'jobchange') return quest.rounds > 0;
  return quest.items.every((i) => i.progress >= i.goal);
}

export function questPercent(quest) {
  if (!quest || !quest.items.length) return 0;
  let sum = 0;
  for (const i of quest.items) sum += Math.min(1, i.goal ? i.progress / i.goal : 0);
  return sum / quest.items.length;
}

/* ── Abschluss & Belohnungen ──────────────────────────────────────── */

/**
 * Schließt die aktuelle Quest ab und vergibt alle Belohnungen.
 * Gibt eine Zusammenfassung für die Abschluss-Anzeige zurück.
 */
export function completeQuest(state) {
  const q = state.today;
  if (!q || q.done) return null;

  const e = effects(state);
  const now = Date.now();
  const hour = new Date(now).getHours();

  q.done = true;
  q.completedAt = now;

  /* Erfahrung */
  let reps = 0, km = 0, mins = 0;
  for (const i of q.items) {
    const counted = Math.min(i.progress, i.goal * 1.5);
    if (i.unit === 'Wdh') reps += counted;
    else if (i.unit === 'km') km += counted;
    else if (i.unit === 'Sek') mins += counted / 60;
    else if (i.unit === 'Min') mins += counted;
  }

  let xp;
  if (q.kind === 'penalty')      xp = 45 + reps / 4 + mins * 6;
  else if (q.kind === 'recovery') xp = 40 + km * 8 + mins * 2;
  else                            xp = 60 + reps / 3 + km * 15;

  const streakBonus = 1 + Math.min(0.5, state.streak * 0.02);
  const earlyBonus = state.skills.includes('bloodlust') && hour < 10 ? 1.2 : 1;
  xp = Math.round(xp * e.xp * streakBonus * earlyBonus);

  /* Statuspunkte — 3 wie im Original, plus Titel-/Skill-Boni */
  let points = 0;
  if (q.kind === 'daily' || q.kind === 'recovery') points = 3 + e.points;
  else if (q.kind === 'penalty') points = 1;

  state.points += points;

  /* Fatigue */
  const before = state.fatigue;
  if (q.kind === 'recovery') {
    state.fatigue = Math.max(0, state.fatigue - 28);
  } else {
    let gain = 10 + 14 * volumeRatio(q);
    if (q.kind === 'penalty') gain *= 0.8;
    if (q.reduced) gain *= 0.6;
    gain *= e.fatigue;
    gain *= 1 - Math.min(0.35, state.stats.vit / 250);
    state.fatigue = Math.min(100, state.fatigue + Math.round(gain));
  }

  /* Serie & Zähler */
  if (q.kind === 'penalty') {
    state.pendingPenalty = false;
    state.penaltiesCleared += 1;
    state.streak = 1;
  } else {
    state.streak += 1;
    state.totalQuests += 1;
    if (hour < 9) state.earlyFinishes += 1;
  }
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.lastActiveDay = q.date;

  /* Level-Ups */
  const levelsGained = [];
  state.xp += xp;
  while (state.xp >= xpNeeded(state.level)) {
    state.xp -= xpNeeded(state.level);
    state.level += 1;
    for (const k of Object.keys(state.stats)) state.stats[k] += 1;
    state.points += 5;
    levelsGained.push(state.level);
  }

  raiseBaselines(state, q);
  const newSkills = syncSkills(state);
  const newTitles = checkTitles(state, q);

  archive(state, q);

  return {
    quest: q, xp, points,
    fatigueBefore: before, fatigueAfter: state.fatigue,
    levelsGained, newTitles, newSkills,
    rank: rankFor(state.level),
  };
}

/** Skills freischalten, die das aktuelle Level erlaubt. */
export function syncSkills(state) {
  const added = [];
  for (const s of SKILLS) {
    if (s.job) continue;
    if (state.level >= s.level && !state.skills.includes(s.id)) {
      state.skills.push(s.id);
      added.push(s);
    }
  }
  return added;
}

/** Titelbedingungen prüfen. */
export function checkTitles(state, quest) {
  const has = (id) => state.titles.includes(id);
  const add = [];
  const give = (id) => { if (!has(id)) { state.titles.push(id); add.push(TITLE_BY_ID[id]); } };

  if (state.totalQuests >= 10) give('wolf_assassin');
  if (state.penaltiesCleared >= 1) give('conqueror');
  if (state.streak >= 7) give('unbroken');
  if (state.streak >= 30) give('iron_will');
  if (state.streak >= 100) give('relentless');
  if (state.earlyFinishes >= 10) give('dawn_walker');
  if (state.jobQuestDone) give('shadow_monarch');

  if (quest) {
    for (const i of quest.items) {
      if (i.unit === 'Wdh' && i.progress >= 100) give('centurion');
      if (i.id === 'run' && i.progress >= 10) give('marathoner');
    }
  }
  return add;
}

/* ── Job Change ───────────────────────────────────────────────────── */

export function jobQuestAvailable(state) {
  return state.level >= JOB_CHANGE_LEVEL && !state.jobQuestDone;
}

/** Schließt den Job Change Quest ab. rounds = geschaffte Runden. */
export function finishJobQuest(state, rounds) {
  state.jobQuestDone = true;
  state.job = 'shadow_monarch';
  if (!state.skills.includes('shadow_extraction')) state.skills.push('shadow_extraction');
  const bonus = Math.max(3, Math.min(30, rounds * 2));
  state.points += bonus;
  const newTitles = checkTitles(state, null);
  return { bonus, rounds, newTitles };
}

/* ── Awakening Test ───────────────────────────────────────────────── */

/**
 * Wertet den Erstest aus: setzt Referenzwerte und Start-Stats.
 * Alle starten auf Level 1 — wie Jinwoo. Nur das Volumen unterscheidet sich.
 */
export function applyAwakening(state, name, test) {
  state.player.name = (name || 'PLAYER').trim().slice(0, 18).toUpperCase() || 'PLAYER';
  state.player.createdAt = Date.now();
  state.baseline = {
    pushups: Math.max(1, Math.round(test.pushups)),
    situps: Math.max(1, Math.round(test.situps)),
    squats: Math.max(1, Math.round(test.squats)),
    run: Math.max(0.5, test.run),
  };
  state.stats = {
    str: 10 + Math.round((test.pushups + test.squats) / 12),
    agi: 10 + Math.round((test.squats + test.situps) / 16),
    vit: 10 + Math.round(test.run * 1.5 + test.situps / 14),
    int: 10,
    sen: 10,
  };
  state.awakened = true;
  state.today = null;
  return state;
}

/* ── Auswertungen für den Verlauf ─────────────────────────────────── */

export function totals(state) {
  let reps = 0, km = 0, days = 0;
  for (const h of state.history) {
    if (!h.done) continue;
    days += 1;
    for (const [id, val] of Object.entries(h.progress || {})) {
      if (id === 'run' || id === 'walk') km += val;
      else if (id !== 'plank' && id !== 'stretch') reps += val;
    }
  }
  // Laufende Quest mitzählen
  const q = state.today;
  if (q && q.done) { /* bereits archiviert */ }
  return { reps: Math.round(reps), km: Math.round(km * 10) / 10, days };
}

export const CONTENT = { EXERCISES, EX_BY_ID, TITLES, SKILLS, RANKS };
