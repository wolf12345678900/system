/* ══════════════════════════════════════════════════════════════════
   content.js — Übungen, Titel, Jobs, Skills, System-Meldungen
   Oberfläche auf Deutsch, System-Popups im Original-Wortlaut.
   ══════════════════════════════════════════════════════════════════ */

/* ── Die vier Kernübungen der Original-Daily-Quest ────────────────── */
export const EXERCISES = [
  {
    id: 'pushups',
    name: 'Liegestütze',
    en: 'Push-Ups',
    unit: 'Wdh',
    target: 100,          // Endziel der Original-Quest
    stat: 'str',
    hint: 'Hände schulterbreit, Körper bleibt eine Linie von Kopf bis Ferse. Brust bis kurz über den Boden, Ellbogen etwa 45° am Körper.',
  },
  {
    id: 'situps',
    name: 'Sit-ups',
    en: 'Sit-Ups',
    unit: 'Wdh',
    target: 100,
    stat: 'vit',
    hint: 'Knie angewinkelt, Füße flach. Aus dem Bauch heraus aufrollen, nicht am Nacken ziehen. Langsam ablegen.',
  },
  {
    id: 'squats',
    name: 'Kniebeugen',
    en: 'Squats',
    unit: 'Wdh',
    target: 100,
    stat: 'agi',
    hint: 'Füße schulterbreit, Gewicht auf der Ferse. Hüfte nach hinten, Brust auf. Mindestens bis Oberschenkel parallel.',
  },
  {
    id: 'run',
    name: 'Laufen',
    en: 'Run',
    unit: 'km',
    target: 10,
    stat: 'vit',
    manual: true,         // wird nach dem Lauf manuell eingetragen
    hint: 'Tempo so, dass du noch in ganzen Sätzen sprechen könntest. Distanz und Zeit trägst du nach dem Lauf hier ein.',
  },
];

export const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/* ── Übungen für Penalty- und Erholungstage ───────────────────────── */
export const PENALTY_EXERCISES = [
  { id: 'burpees',  name: 'Burpees',        en: 'Burpees',       unit: 'Wdh', stat: 'vit',
    hint: 'Aus dem Stand in den Stütz, Liegestütz, hochspringen. Kontrolliert bleiben, auch wenn es brennt.' },
  { id: 'plank',    name: 'Unterarmstütz',  en: 'Plank',         unit: 'Sek', stat: 'str',
    hint: 'Ellbogen unter den Schultern, Po tief, Bauch fest. Kein Durchhängen im unteren Rücken.' },
  { id: 'lunges',   name: 'Ausfallschritte', en: 'Lunges',       unit: 'Wdh', stat: 'agi',
    hint: 'Großer Schritt nach vorn, hinteres Knie Richtung Boden. Oberkörper bleibt aufrecht. Zählt beidseitig.' },
  { id: 'mountain', name: 'Mountain Climbers', en: 'Mountain Climbers', unit: 'Wdh', stat: 'agi',
    hint: 'Im Stütz die Knie abwechselnd zur Brust ziehen. Hüfte bleibt tief, Tempo zügig.' },
];

export const RECOVERY_EXERCISES = [
  { id: 'walk',    name: 'Spaziergang',    en: 'Walk',       unit: 'km',  stat: 'vit',
    hint: 'Lockeres Gehen an der frischen Luft. Kein Tempo, kein Ehrgeiz — das hier ist Regeneration.' },
  { id: 'stretch', name: 'Dehnen',         en: 'Stretching',  unit: 'Min', stat: 'agi',
    hint: 'Jede Position 30–45 Sekunden halten, ruhig weiteratmen. Nie in den Schmerz hinein dehnen.' },
];

/* ── Statuswerte ──────────────────────────────────────────────────── */
export const STATS = [
  { id: 'str', name: 'Strength',     de: 'Kraft',        color: 'var(--c-str)',
    desc: 'Erhöht Kraft, Geschwindigkeit und Angriffskraft.' },
  { id: 'agi', name: 'Agility',      de: 'Beweglichkeit', color: 'var(--c-agi)',
    desc: 'Erhöht Reaktionsgeschwindigkeit und Ausweichrate.' },
  { id: 'vit', name: 'Stamina',      de: 'Ausdauer',      color: 'var(--c-vit)',
    desc: 'Erhöht maximale HP und Regenerationsgeschwindigkeit.' },
  { id: 'int', name: 'Intelligence', de: 'Intelligenz',   color: 'var(--c-int)',
    desc: 'Erhöht maximale MP und MP-Regeneration.' },
  { id: 'sen', name: 'Sense',        de: 'Wahrnehmung',   color: 'var(--c-sen)',
    desc: 'Schärft die fünf Sinne und die Gefahrenwahrnehmung.' },
];

/* ── Hunter-Ränge ─────────────────────────────────────────────────── */
export const RANKS = [
  { key: 'E', min: 1,  label: 'E-Rang',        note: 'Der schwächste Rang. Hier fängt jeder an.' },
  { key: 'D', min: 10, label: 'D-Rang',        note: 'Die Grundlagen sitzen. Der Körper gewöhnt sich.' },
  { key: 'C', min: 20, label: 'C-Rang',        note: 'Solides Mittelfeld. Training ist Routine geworden.' },
  { key: 'B', min: 30, label: 'B-Rang',        note: 'Hier wird es ernst. Volumen auf hohem Niveau.' },
  { key: 'A', min: 40, label: 'A-Rang',        note: 'Selten. Der Job Change Quest wartet.' },
  { key: 'S', min: 50, label: 'S-Rang',        note: 'Die volle Original-Quest: 100/100/100 und 10 km.' },
  { key: 'N', min: 80, label: 'National Level', note: 'Jenseits der Skala.' },
];

/* ── Titel ────────────────────────────────────────────────────────── */
/* effect: xp (Multiplikator), fatigue (Multiplikator), points (Bonuspunkte/Quest) */
export const TITLES = [
  { id: 'rookie', name: 'Rookie Hunter', icon: '·',
    desc: 'Aller Anfang. Du hast das System erweckt.',
    how: 'Von Beginn an verfügbar.', effect: {} },

  { id: 'wolf_assassin', name: 'Wolf Assassin', icon: '⚔',
    desc: '+5 % Erfahrung aus allen Quests.',
    how: '10 Daily Quests abgeschlossen.', effect: { xp: 1.05 } },

  { id: 'conqueror', name: 'Conqueror of Adversity', icon: '✦',
    desc: '+10 % Erfahrung aus allen Quests.',
    how: 'Eine Penalty Zone überstanden.', effect: { xp: 1.10 } },

  { id: 'unbroken', name: 'Unbroken', icon: '◈',
    desc: 'Erschöpfung steigt 8 % langsamer.',
    how: '7 Tage Serie ohne Aussetzer.', effect: { fatigue: 0.92 } },

  { id: 'iron_will', name: 'Iron Will', icon: '⛨',
    desc: 'Erschöpfung steigt 15 % langsamer.',
    how: '30 Tage Serie ohne Aussetzer.', effect: { fatigue: 0.85 } },

  { id: 'relentless', name: 'Relentless', icon: '⟁',
    desc: '+18 % Erfahrung aus allen Quests.',
    how: '100 Tage Serie ohne Aussetzer.', effect: { xp: 1.18 } },

  { id: 'centurion', name: 'Centurion', icon: 'C',
    desc: '+8 % Erfahrung aus allen Quests.',
    how: '100 Wiederholungen einer Übung an einem Tag.', effect: { xp: 1.08 } },

  { id: 'marathoner', name: 'Marathoner', icon: '➤',
    desc: 'Erschöpfung steigt 10 % langsamer.',
    how: '10 km an einem Tag gelaufen.', effect: { fatigue: 0.90 } },

  { id: 'dawn_walker', name: 'Dawn Walker', icon: '☼',
    desc: '+12 % Erfahrung aus allen Quests.',
    how: '10× die Daily Quest vor 9 Uhr abgeschlossen.', effect: { xp: 1.12 } },

  { id: 'shadow_monarch', name: 'Shadow Monarch', icon: '☖',
    desc: '+20 % Erfahrung und +1 Statuspunkt pro Quest.',
    how: 'Den Job Change Quest bestanden.', effect: { xp: 1.20, points: 1 } },
];

export const TITLE_BY_ID = Object.fromEntries(TITLES.map((t) => [t.id, t]));

/* ── Skills (passive Perks, über Level freigeschaltet) ────────────── */
export const SKILLS = [
  { id: 'rulers_authority', name: "Ruler's Authority", icon: '✧', level: 15,
    desc: 'Einmal pro Woche darfst du einen Tag aussetzen, ohne in die Penalty Zone zu geraten.' },
  { id: 'iron_body', name: 'Iron Body', icon: '⛨', level: 20,
    desc: 'Erschöpfung steigt zusätzlich 15 % langsamer.' },
  { id: 'bloodlust', name: 'Bloodlust', icon: '≡', level: 25,
    desc: '+20 % Erfahrung, wenn du die Quest vor 10 Uhr abschließt.' },
  { id: 'stealth', name: 'Stealth', icon: '◇', level: 30,
    desc: 'Penalty Quests fallen 25 % kleiner aus.' },
  { id: 'shadow_extraction', name: 'Shadow Extraction', icon: '☖', level: 0, job: true,
    desc: 'Jede abgeschlossene Quest gibt +2 zusätzliche Statuspunkte.' },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

/* ── Jobs ─────────────────────────────────────────────────────────── */
export const JOBS = {
  none:           { name: 'Keiner',          en: 'None' },
  necromancer:    { name: 'Necromancer',     en: 'Necromancer' },
  shadow_monarch: { name: 'Monarch of Shadows', en: 'The Monarch of Shadows' },
};

export const JOB_CHANGE_LEVEL = 40;

/* ── System-Meldungen im Original-Wortlaut ────────────────────────── */
export const SYS = {
  playerGranted:  'You have acquired the qualifications to be a Player. Will you accept?',
  playerBecame:   'Congratulations on becoming a Player.',
  dailyArrived:   'Daily Quest — [The Preparation To Become Powerful] has arrived.',
  dailyWarning:   'Failure to complete the daily quest will result in an appropriate penalty.',
  questComplete:  'Quest completed. You have received a reward.',
  levelUp:        'You have leveled up!',
  penaltyEnter:   'You have failed the daily quest. You have been transported to the Penalty Zone.',
  penaltyClear:   'You have escaped the Penalty Zone.',
  titleAcquired:  'A new title has been acquired.',
  jobChangeIntro: 'The Job Change Quest will now begin. You will accumulate more points the longer you stay alive. These points are needed to advance to a higher-ranking class.',
  jobChangeDone:  'You have acquired the hidden class: Shadow Monarch.',
  statRecovery:   'Status recovery has been applied.',
  fatigueHigh:    'Excessive fatigue detected. Quest requirements have been reduced.',
  fatigueCritical:'Critical fatigue. A recovery protocol has been issued in place of the daily quest.',
  skillLearned:   'You have learned a new skill.',
};

/* ── Boot-Sequenz beim Start ──────────────────────────────────────── */
export const BOOT_LINES = [
  'SYSTEM INITIALISIERUNG …',
  'SPIELERDATEN WERDEN GELADEN …',
  'QUESTPROTOKOLL WIRD SYNCHRONISIERT …',
  'VERBINDUNG HERGESTELLT.',
];
