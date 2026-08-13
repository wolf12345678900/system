/* ══════════════════════════════════════════════════════════════════
   views.js — die einzelnen Ansichten
   ══════════════════════════════════════════════════════════════════ */

import {
  STATS, TITLES, TITLE_BY_ID, SKILLS, JOBS, SYS, EX_BY_ID, JOB_CHANGE_LEVEL,
} from './content.js';
import * as E from './engine.js';
import { dayKey, shiftKey, daysBetween } from './state.js';
import {
  esc, $, $$, win, bar, gauge, fmtNum, fmtMMSS, fmtDate, toast,
  openOverlay, closeOverlay, confirmBox,
} from './ui.js';
import { sfx } from './audio.js';
import { lineChart, barChart, radarChart } from './charts.js';

/* ══ AWAKENING ════════════════════════════════════════════════════ */

const awk = { step: 0, name: '', pushups: 10, situps: 12, squats: 15, run: 1 };

export function renderAwakening(S, A) {
  const el = $('#view-awakening');
  const steps = [stepAccept, stepName, stepTest('pushups'), stepTest('situps'),
                 stepTest('squats'), stepRun, stepResult];
  el.innerHTML = steps[awk.step](S, A);
  wireAwakening(S, A, el);
}

function stepAccept() {
  return `
    <div style="height:14vh"></div>
    ${win('System', `
      <p class="sys-quote" style="margin-bottom:22px">${esc(SYS.playerGranted)}</p>
      <div class="btn-row">
        <button class="btn btn--ghost" data-act="decline">Ablehnen</button>
        <button class="btn btn--primary" data-act="accept">Akzeptieren</button>
      </div>`)}
    <p class="center label" style="margin-top:18px">Das System sucht sich seinen Spieler selbst.</p>`;
}

function stepName() {
  return `
    <div style="height:8vh"></div>
    ${win('Registrierung', `
      <p class="sys-text" style="margin-bottom:18px">
        Wie soll das System dich nennen?
      </p>
      <div class="field">
        <label for="awkName">Spielername</label>
        <input class="input" id="awkName" maxlength="18" placeholder="PLAYER" autocomplete="off"
               value="${esc(awk.name)}">
      </div>
      <button class="btn btn--primary" data-act="next">Weiter</button>`)}`;
}

const TEST_META = {
  pushups: { label: 'Liegestütze', en: 'Push-Ups',
    text: 'Mach so viele saubere Liegestütze am Stück, wie du schaffst. Wenn die Form bricht, ist Schluss — trag die Zahl ein.' },
  situps:  { label: 'Sit-ups', en: 'Sit-Ups',
    text: 'So viele Sit-ups am Stück wie möglich. Zügig, aber kontrolliert.' },
  squats:  { label: 'Kniebeugen', en: 'Squats',
    text: 'So viele Kniebeugen am Stück wie möglich. Mindestens bis Oberschenkel parallel.' },
};

function stepTest(id) {
  return () => {
    const m = TEST_META[id];
    return `
      <div class="quest-banner" style="padding-top:6vh">
        <p>Awakening Test</p>
        <h1>${esc(m.en)}</h1>
      </div>
      ${win('Messung', `
        <p class="sys-text" style="margin-bottom:20px">${esc(m.text)}</p>
        <div class="field">
          <label>${esc(m.label)} — maximale Wiederholungen</label>
          <div class="stepper">
            <button type="button" data-step="-1">−</button>
            <input class="input" id="awkVal" type="number" inputmode="numeric" min="0" max="500" value="${awk[id]}">
            <button type="button" data-step="1">+</button>
          </div>
        </div>
        <button class="btn btn--primary" data-act="next">Eintragen</button>
        <div class="spacer"></div>
        <button class="btn btn--ghost" data-act="back">Zurück</button>`)}
      <p class="center label" style="margin-top:14px">Ehrlich messen. Das System baut darauf auf.</p>`;
  };
}

function stepRun() {
  return `
    <div class="quest-banner" style="padding-top:6vh">
      <p>Awakening Test</p>
      <h1>Endurance</h1>
    </div>
    ${win('Messung', `
      <p class="sys-text" style="margin-bottom:20px">
        Wie viele Kilometer schaffst du aktuell am Stück, ohne stehen zu bleiben?
        Zügiges Gehen zählt genauso — es geht um deine Basis, nicht um dein Tempo.
      </p>
      <div class="field">
        <label>Distanz am Stück (km)</label>
        <div class="stepper">
          <button type="button" data-step="-0.5">−</button>
          <input class="input" id="awkVal" type="number" inputmode="decimal" step="0.5" min="0.5" max="42" value="${awk.run}">
          <button type="button" data-step="0.5">+</button>
        </div>
      </div>
      <button class="btn btn--primary" data-act="next">Auswerten</button>
      <div class="spacer"></div>
      <button class="btn btn--ghost" data-act="back">Zurück</button>`)}`;
}

function stepResult(S) {
  // Vorschau auf Basis der Testwerte, ohne den Zustand schon zu verändern
  const preview = { ...S, level: 1, baseline: {
    pushups: awk.pushups, situps: awk.situps, squats: awk.squats, run: awk.run } };
  const goals = {
    pushups: E.goalForReps(preview, 'pushups'),
    situps: E.goalForReps(preview, 'situps'),
    squats: E.goalForReps(preview, 'squats'),
    run: E.goalForRun(preview),
  };
  return `
    <div class="quest-banner" style="padding-top:5vh">
      <p>Auswertung</p>
      <h1>${esc(SYS.playerBecame)}</h1>
    </div>
    ${win('Deine erste Daily Quest', `
      <div class="obj-list">
        <div class="obj"><span class="obj__check">✓</span><div class="obj__body"><div class="obj__name">Liegestütze</div></div><span class="obj__count">${goals.pushups}</span></div>
        <div class="obj"><span class="obj__check">✓</span><div class="obj__body"><div class="obj__name">Sit-ups</div></div><span class="obj__count">${goals.situps}</span></div>
        <div class="obj"><span class="obj__check">✓</span><div class="obj__body"><div class="obj__name">Kniebeugen</div></div><span class="obj__count">${goals.squats}</span></div>
        <div class="obj"><span class="obj__check">✓</span><div class="obj__body"><div class="obj__name">Laufen</div></div><span class="obj__count">${fmtNum(goals.run, 'km')} km</span></div>
      </div>
      <div class="divider"></div>
      <p class="sys-text">
        Mit jedem Level wächst dieses Ziel, bis du bei der vollen Original-Quest ankommst:
        <b style="color:var(--cyan)">100 / 100 / 100 und 10 km</b> auf Level ${E.CAP_LEVEL}.
      </p>`, { cls: 'sys-window--accent' })}
    ${win('Startwerte', `
      <p class="sys-text" style="margin-bottom:14px">
        Du beginnst auf Level 1 — wie jeder Player. Deine Testergebnisse bestimmen
        nur, wie schwer die erste Quest ausfällt.
      </p>
      <button class="btn btn--primary" data-act="finish">System aktivieren</button>
      <div class="spacer"></div>
      <button class="btn btn--ghost" data-act="back">Werte korrigieren</button>`)}`;
}

function wireAwakening(S, A, el) {
  const go = (n) => { awk.step = n; sfx.window(); renderAwakening(S, A); };

  el.querySelector('[data-act="accept"]')?.addEventListener('click', () => go(1));
  el.querySelector('[data-act="decline"]')?.addEventListener('click', () => {
    sfx.deny();
    toast('Refusal is not an option for the Player.', { kind: 'danger', sound: null });
  });

  const valEl = el.querySelector('#awkVal');
  el.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.step);
    const cur = Number(valEl.value) || 0;
    const next = Math.max(0, Math.round((cur + d) * 10) / 10);
    valEl.value = next;
    sfx.tap();
  }));

  el.querySelector('[data-act="back"]')?.addEventListener('click', () => go(Math.max(0, awk.step - 1)));

  el.querySelector('[data-act="next"]')?.addEventListener('click', () => {
    if (awk.step === 1) {
      awk.name = el.querySelector('#awkName').value.trim();
      return go(2);
    }
    const v = Number(valEl.value);
    if (!Number.isFinite(v) || v < 0) { sfx.deny(); return; }
    const keys = { 2: 'pushups', 3: 'situps', 4: 'squats', 5: 'run' };
    const key = keys[awk.step];
    awk[key] = key === 'run' ? Math.max(0.5, v) : Math.max(0, Math.round(v));
    go(awk.step + 1);
  });

  el.querySelector('[data-act="finish"]')?.addEventListener('click', () => {
    E.applyAwakening(S, awk.name, awk);
    A.afterAwakening();
  });
}

/* ══ STATUS ═══════════════════════════════════════════════════════ */

export function renderStatus(S, A) {
  const el = $('#view-status');
  const rank = E.rankFor(S.level);
  const need = E.xpNeeded(S.level);
  const title = TITLE_BY_ID[S.title];
  const hpMax = 100 + S.stats.vit * 10;
  const mpMax = 10 + S.stats.int * 5;
  const fatHigh = S.fatigue >= 60;

  const q = S.today;
  const questLine = q?.done
    ? '<span style="color:var(--green)">Abgeschlossen</span>'
    : q?.kind === 'penalty'
      ? '<span style="color:var(--red)">Penalty Zone aktiv</span>'
      : `${Math.round(E.questPercent(q) * 100)} % erledigt`;

  el.innerHTML = `
    ${S.pendingPenalty && !q?.done ? penaltyBanner() : ''}
    ${E.jobQuestAvailable(S) ? jobBanner() : ''}

    ${win('Status', `
      <div class="status-head">
        <div class="status-level">
          <small>LEVEL</small>
          <b id="lvlNum">${S.level}</b>
        </div>
        <div class="status-meta">
          <div><span>Name</span><span>${esc(S.player.name)}</span></div>
          <div><span>Job</span><span>${esc(JOBS[S.job].name)}</span></div>
          <div><span>Titel</span><span style="color:var(--gold)">${esc(title?.name || '—')}</span></div>
          <div><span>Rang</span><span>${rank.label}</span></div>
        </div>
      </div>
      ${gauge('Erfahrung', S.xp, need)}
      ${gauge('HP', hpMax, hpMax, 'bar--hp')}
      ${gauge('MP', mpMax, mpMax, 'bar--mp')}
      <div class="gauge">
        <div class="gauge__head">
          <span class="label">Fatigue</span>
          <b class="num">${Math.round(S.fatigue)} / 100</b>
        </div>
        ${bar(S.fatigue / 100, `bar--fatigue ${fatHigh ? 'is-high' : ''}`)}
      </div>
      ${fatHigh ? `<p class="label" style="margin-top:8px;color:var(--gold)">
        ${S.fatigue >= 85 ? 'Kritisch — das System schaltet auf Erholung um.'
                          : 'Erhöht — das System hat dein Tagesziel gedrosselt.'}</p>` : ''}
    `, { meta: `Serie ${S.streak}` })}

    ${win('Statuswerte', `
      <div class="stat-list">
        ${STATS.map((st) => `
          <div class="stat">
            <span class="stat__name" style="--sc:${st.color}">${esc(st.name)}</span>
            <span class="stat__val" data-stat-val="${st.id}">${S.stats[st.id]}</span>
            <button class="stat__plus" data-add="${st.id}" ${S.points > 0 ? '' : 'disabled'}
                    aria-label="${esc(st.name)} erhöhen">+</button>
          </div>`).join('')}
      </div>
      <div class="points-left ${S.points ? '' : 'is-zero'}">
        <span>Freie Punkte</span>
        <b data-points>${S.points}</b>
      </div>
      ${S.points > 0 ? '<p class="label" style="margin-top:10px">Punkte lassen sich nicht zurücknehmen.</p>' : ''}
    `, { meta: rank.key + '-Rang' })}

    ${win('Heutige Quest', `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px">
        <div style="min-width:0">
          <div style="font-size:14px">${esc(q?.name || '—')}</div>
          <div class="label" style="margin-top:3px">${questLine}</div>
        </div>
      </div>
      ${q && !q.done ? bar(E.questPercent(q)) : ''}
      <div class="spacer"></div>
      <button class="btn" data-go="quest">
        ${q?.done ? 'Quest ansehen' : 'Zur Quest'}
      </button>`)}

    ${win('Titel', `
      <div class="card-grid">
        ${TITLES.map((t) => {
          const owned = S.titles.includes(t.id);
          const active = S.title === t.id;
          return `
            <button class="card ${owned ? '' : 'is-locked'} ${active ? 'is-active' : ''}"
                    data-title="${t.id}" ${owned ? '' : 'disabled'}>
              <span class="card__icon">${esc(t.icon)}</span>
              <span class="card__body">
                <span class="card__name">${esc(t.name)}</span>
                <span class="card__desc">${owned ? esc(t.desc) : esc(t.how)}</span>
              </span>
              <span class="card__tag">${active ? 'Aktiv' : owned ? 'Wählen' : 'Gesperrt'}</span>
            </button>`;
        }).join('')}
      </div>`, { meta: `${S.titles.length} / ${TITLES.length}` })}

    ${win('Skills', S.skills.length ? `
      <div class="card-grid">
        ${SKILLS.filter((s) => S.skills.includes(s.id)).map((s) => `
          <div class="card">
            <span class="card__icon">${esc(s.icon)}</span>
            <span class="card__body">
              <span class="card__name">${esc(s.name)}</span>
              <span class="card__desc">${esc(s.desc)}</span>
            </span>
          </div>`).join('')}
      </div>
      ${SKILLS.filter((s) => !S.skills.includes(s.id) && !s.job).length ? `
        <div class="divider"></div>
        <p class="label">Als Nächstes</p>
        <div class="card-grid" style="margin-top:8px">
          ${SKILLS.filter((s) => !S.skills.includes(s.id) && !s.job).slice(0, 2).map((s) => `
            <div class="card is-locked">
              <span class="card__icon">${esc(s.icon)}</span>
              <span class="card__body">
                <span class="card__name">${esc(s.name)}</span>
                <span class="card__desc">${esc(s.desc)}</span>
              </span>
              <span class="card__tag">Lv ${s.level}</span>
            </div>`).join('')}
        </div>` : ''}
    ` : `<p class="sys-text">Noch keine Skills. Der erste wartet auf Level ${SKILLS[0].level}.</p>`)}
  `;

  // Statuspunkte verteilen
  el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
    if (S.points <= 0) return;
    const id = b.dataset.add;
    S.points -= 1;
    S.stats[id] += 1;
    sfx.tap();
    el.querySelector(`[data-stat-val="${id}"]`).textContent = S.stats[id];
    el.querySelector('[data-points]').textContent = S.points;
    if (S.points === 0) {
      el.querySelectorAll('.stat__plus').forEach((x) => (x.disabled = true));
      el.querySelector('.points-left').classList.add('is-zero');
    }
    A.save();
  }));

  el.querySelectorAll('[data-title]').forEach((b) => b.addEventListener('click', () => {
    S.title = b.dataset.title;
    sfx.unlock();
    A.save();
    A.render();
  }));

  el.querySelector('[data-go="quest"]')?.addEventListener('click', () => A.setView('quest'));
  el.querySelector('[data-act="penalty"]')?.addEventListener('click', () => A.setView('quest'));
  el.querySelector('[data-act="jobquest"]')?.addEventListener('click', () => A.startJobQuest());
}

function penaltyBanner() {
  return win('Warnung', `
    <p class="sys-quote glitch" data-text="PENALTY ZONE" style="font-size:20px;letter-spacing:0.1em;margin-bottom:12px">PENALTY ZONE</p>
    <p class="sys-text" style="margin-bottom:16px">
      Du hast eine Daily Quest versäumt. Die Strafquest muss abgearbeitet werden,
      bevor der normale Ablauf weitergeht.
    </p>
    <button class="btn btn--danger" data-act="penalty">Penalty Zone betreten</button>`,
    { cls: 'sys-window--danger' });
}

function jobBanner() {
  return win('Job Change Quest', `
    <p class="sys-quote" style="margin-bottom:14px">${esc(SYS.jobChangeIntro)}</p>
    <button class="btn btn--primary" data-act="jobquest">Quest annehmen</button>`,
    { cls: 'sys-window--accent' });
}

/* ══ QUEST ════════════════════════════════════════════════════════ */

const wo = { active: false, idx: 0, rest: 0, timer: null };

export function renderQuest(S, A) {
  const el = $('#view-quest');
  const q = S.today;
  if (!q) { el.innerHTML = win('Quest', '<p class="sys-text">Keine aktive Quest.</p>'); return; }

  if (q.kind === 'jobchange') return renderJobQuest(S, A, el);
  if (wo.active && !q.done) return renderWorkout(S, A, el);

  const pct = E.questPercent(q);
  const doneCount = q.items.filter((i) => i.progress >= i.goal).length;

  el.innerHTML = `
    <div class="quest-banner">
      <p>${esc(q.subtitle)}</p>
      <h1${q.kind === 'penalty' ? ' class="glitch" data-text="' + esc(q.name) + '"' : ''}>${esc(q.name)}</h1>
    </div>

    ${q.done ? win('Abgeschlossen', `
      <p class="sys-quote" style="margin-bottom:14px">${esc(SYS.questComplete)}</p>
      <p class="sys-text">Die nächste Quest kommt mit dem Tageswechsel.</p>`,
      { cls: 'sys-window--accent' }) : ''}

    ${win('Ziele', `
      <div class="obj-list">
        ${q.items.map((i, n) => objRow(i, n)).join('')}
      </div>
      ${q.reduced ? `<p class="label" style="margin-top:12px;color:var(--gold)">
        Wegen erhöhter Erschöpfung gedrosselt.</p>` : ''}`,
      { meta: `${doneCount} / ${q.items.length}` })}

    ${win('Belohnung', rewardList(S, q))}

    ${q.kind === 'penalty' ? `
      <div class="warn-line">
        Diese Quest ersetzt heute die Daily Quest. Erst wenn sie erledigt ist,
        verlässt du die Penalty Zone. Die Serie beginnt danach neu bei 1.
      </div>` : `
      <div class="warn-line">${esc(SYS.dailyWarning)}</div>`}

    <div class="spacer"></div>
    ${q.done ? '' : `
      <button class="btn btn--primary" data-act="start">
        ${pct > 0 ? 'Training fortsetzen' : 'Training starten'}
      </button>
      <div class="spacer"></div>
      <button class="btn btn--ghost" data-act="manual">Werte direkt eintragen</button>`}
  `;

  el.querySelectorAll('[data-obj]').forEach((b) => b.addEventListener('click', () => {
    openLogger(S, A, b.dataset.obj);
  }));

  el.querySelector('[data-act="start"]')?.addEventListener('click', () => {
    wo.active = true;
    wo.idx = q.items.findIndex((i) => i.progress < i.goal);
    if (wo.idx < 0) wo.idx = 0;
    sfx.window();
    A.render();
  });

  el.querySelector('[data-act="manual"]')?.addEventListener('click', () => {
    const first = q.items.find((i) => i.progress < i.goal) || q.items[0];
    openLogger(S, A, first.id);
  });
}

function objRow(i, n) {
  const done = i.progress >= i.goal;
  const pct = i.goal ? i.progress / i.goal : 0;
  return `
    <button class="obj ${done ? 'is-done' : ''}" data-obj="${i.id}">
      <span class="obj__check">✓</span>
      <span class="obj__body">
        <span class="obj__name">${esc(i.name)}</span>
        ${done ? '' : `<span class="obj__bar">${bar(pct)}</span>`}
      </span>
      <span class="obj__count">${fmtNum(i.progress, i.unit)} / ${fmtNum(i.goal, i.unit)}${i.unit === 'km' ? ' km' : ''}</span>
    </button>`;
}

function rewardList(S, q) {
  const e = E.effects(S);
  const pts = q.kind === 'penalty' ? 1 : 3 + e.points;
  const rows = [
    'Status Recovery — volle Regeneration',
    `+${pts} Statuspunkte`,
    'Erfahrung entsprechend deiner Leistung',
  ];
  if (q.kind === 'penalty') rows.push('Austritt aus der Penalty Zone');
  if (e.xp > 1) rows.push(`Titelbonus: +${Math.round((e.xp - 1) * 100)} % Erfahrung`);
  if (S.streak > 0) rows.push(`Serienbonus: +${Math.min(50, S.streak * 2)} % Erfahrung`);
  return `<div class="quest-reward">${rows.map((r) => `<div>${esc(r)}</div>`).join('')}</div>`;
}

/* ── Eintrag-Dialog für eine einzelne Übung ───────────────────────── */

function openLogger(S, A, itemId) {
  const q = S.today;
  const item = q.items.find((i) => i.id === itemId);
  if (!item) return;
  const isDec = item.unit === 'km';
  const suggested = isDec ? Math.max(0.5, item.goal - item.progress)
                          : Math.max(1, Math.min(E.setSize(S, item.id, item.goal), item.goal - item.progress) || 5);

  openOverlay(win(item.name, `
    <p class="sys-text" style="margin-bottom:16px">${esc(item.hint || '')}</p>
    <div class="gauge">
      <div class="gauge__head">
        <span class="label">Fortschritt</span>
        <b class="num">${fmtNum(item.progress, item.unit)} / ${fmtNum(item.goal, item.unit)} ${esc(item.unit)}</b>
      </div>
      ${bar(item.goal ? item.progress / item.goal : 0)}
    </div>
    <div class="field" style="margin-top:16px">
      <label>Eintragen (${esc(item.unit)})</label>
      <div class="stepper">
        <button type="button" data-step="${isDec ? -0.5 : -1}">−</button>
        <input class="input" id="logVal" type="number" inputmode="${isDec ? 'decimal' : 'numeric'}"
               step="${isDec ? 0.5 : 1}" min="0" value="${isDec ? suggested : Math.round(suggested)}">
        <button type="button" data-step="${isDec ? 0.5 : 1}">+</button>
      </div>
    </div>
    ${item.sets.length ? `<div class="set-log">${item.sets.map((s) =>
      `<span class="set-chip">${fmtNum(s, item.unit)}</span>`).join('')}</div>` : ''}
    <div class="spacer"></div>
    <button class="btn btn--primary" data-act="log">Eintragen</button>
    <div class="spacer"></div>
    <div class="btn-row">
      <button class="btn btn--ghost" data-act="undo" ${item.sets.length ? '' : 'disabled'}>Letzten löschen</button>
      <button class="btn btn--ghost" data-act="close">Schließen</button>
    </div>`));

  const ov = $('#overlay');
  const val = ov.querySelector('#logVal');
  ov.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.step);
    val.value = Math.max(0, Math.round(((Number(val.value) || 0) + d) * 10) / 10);
    sfx.tap();
  }));
  ov.querySelector('[data-act="close"]').onclick = () => closeOverlay();
  ov.querySelector('[data-act="undo"]').onclick = () => {
    E.undoSet(S, itemId); A.save(); closeOverlay(); A.render();
  };
  ov.querySelector('[data-act="log"]').onclick = () => {
    const v = Number(val.value);
    if (!Number.isFinite(v) || v <= 0) { sfx.deny(); return; }
    logAmount(S, A, itemId, v);
    closeOverlay();
  };
}

/** Zentraler Eintrag: Fortschritt buchen, prüfen ob Quest fertig ist. */
function logAmount(S, A, itemId, amount) {
  const item = E.addProgress(S, itemId, amount);
  if (!item) return;
  const justDone = item.progress >= item.goal && item.progress - amount < item.goal;
  if (justDone) sfx.objective(); else sfx.tap();
  A.save();

  if (E.isQuestComplete(S.today)) {
    A.finishQuest();
  } else {
    A.render();
  }
}

/* ── Geführter Workout-Modus ──────────────────────────────────────── */

function renderWorkout(S, A, el) {
  const q = S.today;
  const item = q.items[wo.idx];
  if (!item) { wo.active = false; return renderQuest(S, A); }

  const pct = item.goal ? Math.min(1, item.progress / item.goal) : 0;
  const R = 62, C = 2 * Math.PI * R;
  const left = Math.max(0, item.goal - item.progress);
  const sug = item.unit === 'km'
    ? Math.max(0.5, Math.round(left * 2) / 2)
    : Math.max(1, Math.min(E.setSize(S, item.id, item.goal), Math.ceil(left)));

  const quick = item.unit === 'km' ? [1, 2, 5] : [
    Math.max(1, Math.round(sug * 0.5)), sug, Math.round(sug * 1.5),
  ];

  el.innerHTML = `
    ${wo.rest > 0 ? restPanel() : ''}

    ${win(`${q.subtitle} — ${wo.idx + 1} / ${q.items.length}`, `
      <div class="wo">
        <div class="wo__step">${esc(item.en || item.name)}</div>
        <div class="wo__name">${esc(item.name)}</div>

        <div class="wo-ring">
          <svg viewBox="0 0 150 150">
            <circle class="ring-bg" cx="75" cy="75" r="${R}"/>
            <circle class="ring-fg" cx="75" cy="75" r="${R}"
                    stroke-dasharray="${C.toFixed(1)}"
                    stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"
                    transform="rotate(-90 75 75)"/>
          </svg>
          <div class="wo-ring__center">
            <div class="wo__big">${fmtNum(item.progress, item.unit)}<small>/${fmtNum(item.goal, item.unit)}</small></div>
            <div class="wo__sub">${esc(item.unit)}</div>
          </div>
        </div>

        <p class="wo__hint">${esc(item.hint || '')}</p>
      </div>

      ${item.progress >= item.goal ? `
        <p class="center" style="color:var(--green);font-size:13px;margin-bottom:12px">Ziel erreicht.</p>
      ` : `
        <div class="rep-pad">
          ${quick.map((n) => `<button data-quick="${n}">+${fmtNum(n, item.unit)}</button>`).join('')}
        </div>
        <button class="btn btn--primary" data-act="custom">Andere Zahl eintragen</button>
      `}

      ${item.sets.length ? `<div class="set-log">${item.sets.map((s, n) =>
        `<span class="set-chip ${n === item.sets.length - 1 ? 'is-new' : ''}">${fmtNum(s, item.unit)}</span>`).join('')}</div>` : ''}
    `)}

    <div class="btn-row">
      <button class="btn btn--ghost" data-act="prev" ${wo.idx === 0 ? 'disabled' : ''}>Zurück</button>
      <button class="btn btn--ghost" data-act="next" ${wo.idx >= q.items.length - 1 ? 'disabled' : ''}>Nächste Übung</button>
    </div>
    <div class="spacer"></div>
    <button class="btn btn--ghost" data-act="exit">Übersicht</button>
  `;

  el.querySelectorAll('[data-quick]').forEach((b) => b.addEventListener('click', () => {
    logSet(S, A, item.id, Number(b.dataset.quick));
  }));
  el.querySelector('[data-act="custom"]')?.addEventListener('click', () => openLogger(S, A, item.id));
  el.querySelector('[data-act="prev"]')?.addEventListener('click', () => { wo.idx -= 1; stopRest(); A.render(); });
  el.querySelector('[data-act="next"]')?.addEventListener('click', () => { wo.idx += 1; stopRest(); A.render(); });
  el.querySelector('[data-act="exit"]')?.addEventListener('click', () => { wo.active = false; stopRest(); sfx.window(); A.render(); });
  el.querySelector('[data-act="skipRest"]')?.addEventListener('click', () => { stopRest(); A.render(); });
  el.querySelectorAll('[data-rest]').forEach((b) => b.addEventListener('click', () => {
    wo.rest = Math.max(5, wo.rest + Number(b.dataset.rest));
    sfx.tap();
    $('#restVal').textContent = fmtMMSS(wo.rest);
  }));
}

function restPanel() {
  return win('Satzpause', `
    <div class="center">
      <div class="wo__big" id="restVal" style="font-size:52px">${fmtMMSS(wo.rest)}</div>
      <div class="wo__sub" style="margin-bottom:14px">Atmen. Dann weiter.</div>
    </div>
    <div class="btn-row">
      <button class="btn btn--ghost btn--sm" data-rest="-15">−15 s</button>
      <button class="btn btn--ghost btn--sm" data-rest="15">+15 s</button>
    </div>
    <div class="spacer"></div>
    <button class="btn" data-act="skipRest">Pause überspringen</button>`,
    { cls: 'sys-window--accent' });
}

function logSet(S, A, itemId, amount) {
  const item = E.addProgress(S, itemId, amount);
  if (!item) return;
  A.save();

  if (E.isQuestComplete(S.today)) {
    stopRest();
    sfx.objective();
    A.finishQuest();
    return;
  }

  if (item.progress >= item.goal) {
    sfx.objective();
    const q = S.today;
    const nextIdx = q.items.findIndex((i, n) => n > wo.idx && i.progress < i.goal);
    wo.idx = nextIdx >= 0 ? nextIdx : q.items.findIndex((i) => i.progress < i.goal);
    stopRest();
    A.render();
    return;
  }

  sfx.tap();
  startRest(S, A, item.unit === 'km' ? 0 : 60);
}

function startRest(S, A, seconds) {
  stopRest();
  if (seconds <= 0) { A.render(); return; }
  wo.rest = seconds;
  A.render();
  wo.timer = setInterval(() => {
    wo.rest -= 1;
    const el = document.getElementById('restVal');
    if (el) el.textContent = fmtMMSS(wo.rest);
    if (wo.rest === 3 || wo.rest === 2 || wo.rest === 1) sfx.tick();
    if (wo.rest <= 0) {
      stopRest();
      sfx.restOver();
      A.render();
    }
  }, 1000);
}

export function stopRest() {
  clearInterval(wo.timer);
  wo.timer = null;
  wo.rest = 0;
}

export function exitWorkout() {
  wo.active = false;
  stopRest();
}

/* ── Job Change Quest (AMRAP) ─────────────────────────────────────── */

const jq = { timer: null, endsAt: 0 };

function renderJobQuest(S, A, el) {
  const q = S.today;
  const left = Math.max(0, Math.round((jq.endsAt - Date.now()) / 1000));
  const running = jq.endsAt > Date.now();

  el.innerHTML = `
    <div class="quest-banner">
      <p>Job Quest</p>
      <h1>Job Change Quest</h1>
    </div>

    ${win('Auftrag', `
      <p class="sys-quote" style="margin-bottom:16px">${esc(SYS.jobChangeIntro)}</p>
      <p class="sys-text">
        ${q.durationMin} Minuten. So viele vollständige Runden wie möglich.
        Jede abgeschlossene Runde zählt.
      </p>
      <div class="divider"></div>
      <div class="obj-list">
        ${q.circuit.map((c) => `
          <div class="obj">
            <span class="obj__check">✓</span>
            <span class="obj__body"><span class="obj__name">${esc(c.name)}</span></span>
            <span class="obj__count">${c.reps}</span>
          </div>`).join('')}
      </div>`, { cls: 'sys-window--accent' })}

    ${win('Fortschritt', `
      <div class="center">
        <div class="wo__big">${running ? fmtMMSS(left) : `${q.durationMin}:00`}</div>
        <div class="wo__sub" style="margin-bottom:16px">verbleibend</div>
        <div class="wo__big" style="font-size:44px;color:var(--gold)">${q.rounds}</div>
        <div class="wo__sub" style="margin-bottom:8px">Runden</div>
      </div>
      <div class="spacer"></div>
      ${running ? `
        <button class="btn btn--primary" data-act="round">Runde abschließen</button>
        <div class="spacer"></div>
        <button class="btn btn--ghost" data-act="stop">Quest beenden</button>
      ` : q.rounds > 0 ? `
        <button class="btn btn--primary" data-act="finish">Quest abschließen</button>
      ` : `
        <button class="btn btn--primary" data-act="begin">Quest beginnen</button>
        <div class="spacer"></div>
        <button class="btn btn--ghost" data-act="later">Später</button>`}`)}
  `;

  el.querySelector('[data-act="begin"]')?.addEventListener('click', () => {
    jq.endsAt = Date.now() + q.durationMin * 60000;
    sfx.window();
    clearInterval(jq.timer);
    jq.timer = setInterval(() => {
      if (Date.now() >= jq.endsAt) {
        clearInterval(jq.timer);
        sfx.alarm();
      }
      A.render();
    }, 1000);
    A.render();
  });

  el.querySelector('[data-act="round"]')?.addEventListener('click', () => {
    q.rounds += 1;
    sfx.objective();
    A.save();
    A.render();
  });

  el.querySelector('[data-act="stop"]')?.addEventListener('click', () => {
    jq.endsAt = 0;
    clearInterval(jq.timer);
    A.render();
  });

  el.querySelector('[data-act="finish"]')?.addEventListener('click', () => {
    clearInterval(jq.timer);
    A.finishJobQuest(q.rounds);
  });

  el.querySelector('[data-act="later"]')?.addEventListener('click', () => A.cancelJobQuest());
}

/* ══ VERLAUF ══════════════════════════════════════════════════════ */

const statsTab = { cur: 'volume' };

export function renderStats(S, A) {
  const el = $('#view-stats');
  const t = E.totals(S);
  const hist = [...S.history].sort((a, b) => a.date.localeCompare(b.date));

  el.innerHTML = `
    ${win('Bilanz', `
      <div class="kpi-grid">
        <div class="kpi"><b>${S.streak}</b><span>Serie</span></div>
        <div class="kpi"><b>${S.bestStreak}</b><span>Beste Serie</span></div>
        <div class="kpi"><b>${S.totalQuests}</b><span>Quests</span></div>
      </div>
      <div class="spacer"></div>
      <div class="kpi-grid">
        <div class="kpi"><b>${t.reps.toLocaleString('de-DE')}</b><span>Wdh gesamt</span></div>
        <div class="kpi"><b>${String(t.km).replace('.', ',')}</b><span>km gesamt</span></div>
        <div class="kpi"><b>${S.penaltiesCleared}</b><span>Penalty klar</span></div>
      </div>`)}

    ${win('Statuswerte', radarChart(
      STATS.map((s) => S.stats[s.id]),
      STATS.map((s) => s.name.slice(0, 3).toUpperCase()),
      STATS.map((s) => s.color)))}

    <div class="tabs">
      <button data-tab="volume" class="${statsTab.cur === 'volume' ? 'is-active' : ''}">Volumen</button>
      <button data-tab="run" class="${statsTab.cur === 'run' ? 'is-active' : ''}">Laufen</button>
      <button data-tab="level" class="${statsTab.cur === 'level' ? 'is-active' : ''}">Level</button>
    </div>

    ${win(chartTitle(), chartBody(hist))}

    ${win('Kalender', heatmap(S), { meta: 'letzte 16 Wochen' })}
  `;

  el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    statsTab.cur = b.dataset.tab;
    sfx.tap();
    A.render();
  }));
}

function chartTitle() {
  return { volume: 'Wiederholungen pro Tag', run: 'Kilometer pro Tag', level: 'Levelverlauf' }[statsTab.cur];
}

function chartBody(hist) {
  const last = hist.slice(-30);
  if (!last.length) return '<p class="sys-text">Noch keine abgeschlossenen Tage.</p>';
  const lbl = (d) => d.slice(8) + '.' + d.slice(5, 7);

  if (statsTab.cur === 'volume') {
    const pts = last.map((h) => ({
      label: lbl(h.date),
      value: Object.entries(h.progress || {}).reduce((a, [id, v]) =>
        a + (id === 'run' || id === 'walk' || id === 'stretch' || id === 'plank' ? 0 : v), 0),
    }));
    return barChart(pts);
  }
  if (statsTab.cur === 'run') {
    const pts = last.map((h) => ({
      label: lbl(h.date),
      value: (h.progress?.run || 0) + (h.progress?.walk || 0),
    }));
    return barChart(pts, { color: 'var(--c-vit)' });
  }
  const pts = last.map((h) => ({ label: lbl(h.date), value: h.level || 1 }));
  return lineChart(pts);
}

function heatmap(S) {
  const today = dayKey(Date.now(), S.settings.resetHour);
  const byDate = Object.fromEntries(S.history.map((h) => [h.date, h]));
  const days = 112;
  let cells = '';
  for (let i = days - 1; i >= 0; i--) {
    const key = shiftKey(today, -i);
    const h = byDate[key];
    let l = '0';
    if (h?.done) l = h.kind === 'penalty' ? 'p' : '2';
    else if (h) l = '1';
    if (key === today) l = h?.done ? (h.kind === 'penalty' ? 'p' : '2') : l;
    cells += `<i data-l="${l}" ${key === today ? 'data-l2="t"' : ''} title="${fmtDate(key)}"></i>`;
  }
  return `
    <div class="heat">${cells}</div>
    <div class="legend">
      <span><i style="background:rgba(255,255,255,0.05)"></i>nichts</span>
      <span><i style="background:rgba(90,216,255,0.28)"></i>angefangen</span>
      <span><i style="background:rgba(90,216,255,0.6)"></i>geschafft</span>
      <span><i style="background:rgba(255,59,78,0.55)"></i>Penalty</span>
    </div>`;
}

/* ══ EINSTELLUNGEN ════════════════════════════════════════════════ */

export function renderSettings(S, A) {
  const el = $('#view-settings');
  const st = S.settings;

  el.innerHTML = `
    ${win('System', `
      <div class="switch-row">
        <div><strong>Klänge</strong><small>Systemtöne bei Meldungen und Level-Ups.</small></div>
        <button class="switch" role="switch" aria-checked="${st.sound}" data-set="sound"></button>
      </div>
      <div class="switch-row">
        <div><strong>Erinnerungen</strong><small>Benachrichtigung zur festen Uhrzeit — funktioniert nur, solange die App im Hintergrund geöffnet bleibt.</small></div>
        <button class="switch" role="switch" aria-checked="${st.notify}" data-set="notify"></button>
      </div>
      <div class="field" style="margin-top:16px">
        <label for="setTime">Erinnerung um</label>
        <input class="input" id="setTime" type="time" value="${esc(st.notifyTime)}">
      </div>
      <div class="field">
        <label for="setReset">Tageswechsel</label>
        <select class="input" id="setReset">
          <option value="0" ${st.resetHour === 0 ? 'selected' : ''}>Mitternacht (00:00)</option>
          <option value="3" ${st.resetHour === 3 ? 'selected' : ''}>03:00 — für Nachtmenschen</option>
          <option value="4" ${st.resetHour === 4 ? 'selected' : ''}>04:00 — für Nachtmenschen</option>
        </select>
        <small>Bestimmt, wann die Daily Quest zurückgesetzt wird und der Countdown endet.</small>
      </div>`)}

    ${win('Spieler', `
      <div class="field">
        <label for="setName">Name</label>
        <input class="input" id="setName" maxlength="18" value="${esc(S.player.name)}">
      </div>
      <div class="divider"></div>
      <p class="label" style="margin-bottom:10px">Referenzwerte (bester Einzelsatz)</p>
      <div class="stack">
        ${['pushups', 'situps', 'squats'].map((id) => `
          <div class="switch-row">
            <div><strong>${esc(EX_BY_ID[id].name)}</strong><small>Bestimmt die Satzgröße im geführten Modus.</small></div>
            <input class="input" style="width:84px;height:40px;text-align:center" type="number"
                   min="1" max="300" value="${S.baseline[id]}" data-base="${id}">
          </div>`).join('')}
        <div class="switch-row">
          <div><strong>Laufbasis</strong><small>Kilometer am Stück.</small></div>
          <input class="input" style="width:84px;height:40px;text-align:center" type="number"
                 min="0.5" max="42" step="0.5" value="${S.baseline.run}" data-base="run">
        </div>
      </div>`)}

    ${win('Daten', `
      <p class="sys-text" style="margin-bottom:14px">
        Alles liegt ausschließlich auf diesem Gerät. Lege regelmäßig ein Backup an —
        wird die App gelöscht oder der Speicher geleert, ist der Fortschritt weg.
      </p>
      <div class="btn-row">
        <button class="btn" data-act="export">Backup sichern</button>
        <button class="btn" data-act="import">Backup laden</button>
      </div>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      <div class="spacer"></div>
      <p class="label" style="margin:8px 0">Falls das Sichern als Datei nicht klappt</p>
      <div class="btn-row">
        <button class="btn btn--ghost btn--sm" data-act="copy">Als Text kopieren</button>
        <button class="btn btn--ghost btn--sm" data-act="paste">Text einfügen</button>
      </div>
      <div class="divider"></div>
      <button class="btn btn--ghost" data-act="reset">Alles zurücksetzen</button>`)}

    ${win('Über', `
      <p class="sys-text">
        Nach dem Systemkonzept aus <b>Solo Leveling</b> von Chugong (Webtoon: DUBU / REDICE Studio).
        Die Daily Quest „The Preparation To Become Powerful" — 100 Liegestütze, 100 Sit-ups,
        100 Kniebeugen, 10 km — ist das Endziel dieser App auf Level ${E.CAP_LEVEL}.
      </p>
      <div class="divider"></div>
      <p class="label">Version 1.0 · lokal gespeichert · offline nutzbar</p>`)}
  `;

  el.querySelectorAll('[data-set]').forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.set;
    const next = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(next));
    A.setSetting(key, next);
  }));

  el.querySelector('#setTime').addEventListener('change', (e) => A.setSetting('notifyTime', e.target.value));
  el.querySelector('#setReset').addEventListener('change', (e) => A.setSetting('resetHour', Number(e.target.value)));
  el.querySelector('#setName').addEventListener('change', (e) => {
    S.player.name = (e.target.value.trim().slice(0, 18) || 'PLAYER').toUpperCase();
    A.save(); A.paintChrome();
  });

  el.querySelectorAll('[data-base]').forEach((inp) => inp.addEventListener('change', () => {
    const id = inp.dataset.base;
    const v = Number(inp.value);
    if (!Number.isFinite(v) || v <= 0) return;
    S.baseline[id] = id === 'run' ? v : Math.round(v);
    A.save();
    toast('Referenzwert übernommen. Wirkt ab der nächsten Quest.', { sound: 'tap' });
  }));

  el.querySelector('[data-act="export"]').onclick = () => A.exportBackup();
  el.querySelector('[data-act="copy"]').onclick = () => A.copyBackup();
  el.querySelector('[data-act="paste"]').onclick = () => A.pasteBackup();
  el.querySelector('[data-act="import"]').onclick = () => el.querySelector('#importFile').click();
  el.querySelector('#importFile').onchange = (e) => {
    if (e.target.files[0]) A.importBackup(e.target.files[0]);
  };
  el.querySelector('[data-act="reset"]').onclick = async () => {
    const ok = await confirmBox('Warnung',
      'Der gesamte Fortschritt wird gelöscht — Level, Statuswerte, Titel und der komplette Verlauf. Das lässt sich nicht rückgängig machen.',
      { yes: 'Endgültig löschen', danger: true });
    if (ok) A.hardReset();
  };
}
