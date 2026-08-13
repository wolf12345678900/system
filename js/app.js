/* ══════════════════════════════════════════════════════════════════
   app.js — Steuerung: Start, Routing, Tageswechsel, Countdown,
   Questabschluss, Benachrichtigungen, Backup.
   ══════════════════════════════════════════════════════════════════ */

import * as St from './state.js';
import * as E from './engine.js';
import { BOOT_LINES, SYS, TITLE_BY_ID, JOBS } from './content.js';
import * as A_ from './audio.js';
import { sfx } from './audio.js';
import {
  $, esc, win, toast, openOverlay, closeOverlay, levelUpScreen,
  startParticles, bootSequence, fmtClock, fmtNum,
} from './ui.js';
import * as V from './views.js';

let S = St.load();
let view = 'status';
let lastAlarm = 0;

/* ── Öffentliche Schnittstelle für die Ansichten ──────────────────── */
const A = {
  save: () => St.save(S),
  render,
  setView,
  paintChrome,
  setSetting,
  finishQuest,
  startJobQuest,
  cancelJobQuest,
  finishJobQuest,
  afterAwakening,
  exportBackup,
  copyBackup,
  pasteBackup,
  importBackup,
  hardReset,
};

/* ── Start ────────────────────────────────────────────────────────── */

async function boot() {
  startParticles();
  A_.setEnabled(S.settings.sound);
  document.addEventListener('pointerdown', A_.unlock, { once: true });

  if (!S.awakened) {
    document.body.classList.add('no-chrome', 'booting');
    V.renderAwakening(S, A);
    document.body.classList.remove('booting');
    return;
  }

  document.body.classList.remove('no-chrome');
  await bootSequence(BOOT_LINES, $('#view-status'));
  document.body.classList.remove('booting');
  $('#topbar').hidden = false;
  $('#navbar').hidden = false;

  handleRollover();
  setView('status');
  startCountdown();
  scheduleReminder();
  registerSW();
}

function afterAwakening() {
  St.saveNow(S);
  document.body.classList.remove('no-chrome');
  $('#view-awakening').hidden = true;
  $('#topbar').hidden = false;
  $('#navbar').hidden = false;
  handleRollover();
  setView('status');
  startCountdown();
  registerSW();

  setTimeout(() => {
    openOverlay(win('System', `
      <p class="sys-quote" style="margin-bottom:16px">${esc(SYS.playerBecame)}</p>
      <p class="sys-quote" style="margin-bottom:20px">${esc(SYS.dailyArrived)}</p>
      <p class="sys-text" style="margin-bottom:20px">${esc(SYS.dailyWarning)}</p>
      <button class="btn btn--primary" data-act="ok">Verstanden</button>`,
      { cls: 'sys-window--accent' }));
    $('#overlay').querySelector('[data-act="ok"]').onclick = () => {
      closeOverlay();
      setView('quest');
    };
  }, 420);
}

/* ── Tageswechsel ─────────────────────────────────────────────────── */

function handleRollover() {
  const events = E.rollover(S);
  St.save(S);

  for (const ev of events) {
    if (ev.type === 'penalty') {
      document.body.classList.add('is-penalty');
      setTimeout(() => {
        sfx.penalty();
        openOverlay(win('Penalty', `
          <p class="sys-quote glitch" data-text="PENALTY ZONE"
             style="font-size:20px;letter-spacing:0.08em;margin-bottom:16px">PENALTY ZONE</p>
          <p class="sys-quote" style="margin-bottom:18px">${esc(SYS.penaltyEnter)}</p>
          <p class="sys-text" style="margin-bottom:20px">
            ${ev.missed > 1 ? `${ev.missed} Tage versäumt. ` : ''}Die Serie steht wieder bei null.
            Arbeite die Strafquest ab, um die Zone zu verlassen.
          </p>
          <button class="btn btn--danger" data-act="ok">Zone betreten</button>`,
          { cls: 'sys-window--danger' }), { sound: false, dismissible: false });
        $('#overlay').querySelector('[data-act="ok"]').onclick = () => {
          closeOverlay();
          setView('quest');
        };
      }, 500);
    }

    if (ev.type === 'restUsed') {
      setTimeout(() => toast(
        "Ruler's Authority hat den versäumten Tag abgefangen. Deine Serie bleibt bestehen.",
        { kind: 'gold', sound: 'unlock' }), 600);
    }

    if (ev.type === 'newQuest') {
      const q = ev.quest;
      document.body.classList.toggle('is-penalty', q.kind === 'penalty');
      if (q.kind === 'recovery') {
        setTimeout(() => toast(SYS.fatigueCritical, { kind: 'gold' }), 900);
      } else if (q.reduced) {
        setTimeout(() => toast(SYS.fatigueHigh, { kind: 'gold' }), 900);
      }
    }
  }

  document.body.classList.toggle('is-penalty', S.today?.kind === 'penalty' && !S.today.done);
}

/* ── Routing ──────────────────────────────────────────────────────── */

function setView(name) {
  if (view === 'quest' && name !== 'quest') V.exitWorkout();
  view = name;
  for (const sec of document.querySelectorAll('.view')) {
    sec.hidden = sec.dataset.view !== name;
  }
  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.nav === name));
  window.scrollTo({ top: 0, behavior: 'instant' });
  render();
}

function render() {
  if (!S.awakened) { V.renderAwakening(S, A); return; }
  paintChrome();
  if (view === 'status') V.renderStatus(S, A);
  else if (view === 'quest') V.renderQuest(S, A);
  else if (view === 'stats') V.renderStats(S, A);
  else if (view === 'settings') V.renderSettings(S, A);
}

function paintChrome() {
  const rank = E.rankFor(S.level);
  const badge = $('#topRank');
  badge.textContent = rank.key;
  badge.dataset.rank = rank.key;
  $('#topPlayer').textContent = S.player.name;
  $('#topTitle').textContent = TITLE_BY_ID[S.title]?.name || '—';
  $('#navQuestDot').hidden = !!S.today?.done;
}

/* ── Countdown ────────────────────────────────────────────────────── */

function startCountdown() {
  const tick = () => {
    const end = St.dayEnd(Date.now(), S.settings.resetHour);
    const left = end - Date.now();
    const box = $('#topTimer');
    const val = $('#countdown');
    if (!val) return;

    if (S.today?.done) {
      val.textContent = 'ERLEDIGT';
      box.classList.remove('is-urgent');
    } else {
      val.textContent = fmtClock(left);
      const urgent = left < 3 * 3600 * 1000;
      box.classList.toggle('is-urgent', urgent);

      // Einmalige Warnung bei 3 h und bei 1 h
      const hrs = left / 3600000;
      for (const mark of [3, 1]) {
        if (hrs < mark && hrs > mark - 0.02 && lastAlarm !== mark) {
          lastAlarm = mark;
          sfx.alarm();
          toast(`Noch ${mark} Stunde${mark > 1 ? 'n' : ''}. ${SYS.dailyWarning}`,
            { kind: 'danger', sound: null, ms: 7000 });
          notify('Daily Quest läuft ab',
            `Noch ${mark} Stunde${mark > 1 ? 'n' : ''} bis zur Penalty Zone.`);
        }
      }
    }

    if (left <= 0) {
      handleRollover();
      render();
    }
  };
  tick();
  setInterval(tick, 1000);
}

/* ── Questabschluss ───────────────────────────────────────────────── */

async function finishQuest() {
  const wasPenalty = S.today?.kind === 'penalty';
  const res = E.completeQuest(S);
  if (!res) { render(); return; }
  St.saveNow(S);
  V.exitWorkout();

  document.body.classList.remove('is-penalty');
  sfx.complete();

  await showSummary(res, wasPenalty);

  for (const lvl of [res.levelsGained].filter((x) => x.length)) {
    await levelUpScreen(lvl, lvl.length * 5);
  }

  for (const t of res.newTitles) {
    toast(`${SYS.titleAcquired} — „${t.name}"`, { kind: 'gold', sound: 'unlock', ms: 6000 });
    await wait(700);
  }
  for (const s of res.newSkills) {
    toast(`${SYS.skillLearned} — ${s.name}`, { kind: 'gold', sound: 'unlock', ms: 6000 });
    await wait(700);
  }

  St.saveNow(S);
  setView('status');
}

function showSummary(res, wasPenalty) {
  return new Promise((resolve) => {
    const q = res.quest;
    const rows = [
      ['Erfahrung', `+${res.xp}`],
      ['Statuspunkte', `+${res.points}`],
      ['Fatigue', `${Math.round(res.fatigueBefore)} → ${Math.round(res.fatigueAfter)}`],
      ['Serie', `${S.streak} Tag${S.streak === 1 ? '' : 'e'}`],
    ];
    openOverlay(win(wasPenalty ? 'Penalty Zone verlassen' : 'Quest abgeschlossen', `
      <p class="sys-quote" style="margin-bottom:18px">
        ${esc(wasPenalty ? SYS.penaltyClear : SYS.questComplete)}
      </p>
      <p class="label" style="margin-bottom:10px">${esc(q.name)}</p>
      <div class="status-meta" style="gap:9px">
        ${rows.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}
      </div>
      <div class="divider"></div>
      <p class="sys-text" style="margin-bottom:18px">${esc(SYS.statRecovery)}</p>
      <button class="btn btn--primary" data-act="ok">Weiter</button>`,
      { cls: wasPenalty ? '' : 'sys-window--accent' }), { dismissible: false, sound: false });
    $('#overlay').querySelector('[data-act="ok"]').onclick = () => { closeOverlay(); resolve(); };
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Job Change Quest ─────────────────────────────────────────────── */

function startJobQuest() {
  S.stashed = S.today;
  S.today = E.buildJobQuest(S, St.dayKey(Date.now(), S.settings.resetHour));
  St.save(S);
  sfx.window();
  setView('quest');
}

function cancelJobQuest() {
  if (S.stashed) S.today = S.stashed;
  S.stashed = null;
  St.save(S);
  setView('status');
}

async function finishJobQuest(rounds) {
  const res = E.finishJobQuest(S, rounds);
  if (S.stashed) S.today = S.stashed;
  S.stashed = null;
  St.saveNow(S);

  sfx.levelUp();
  await new Promise((resolve) => {
    openOverlay(win('Job Change', `
      <p class="sys-quote" style="margin-bottom:16px">${esc(SYS.jobChangeDone)}</p>
      <div class="status-meta" style="gap:9px">
        <div><span>Runden</span><span>${res.rounds}</span></div>
        <div><span>Job</span><span style="color:var(--gold)">${esc(JOBS.shadow_monarch.name)}</span></div>
        <div><span>Bonuspunkte</span><span>+${res.bonus}</span></div>
        <div><span>Skill</span><span>Shadow Extraction</span></div>
      </div>
      <div class="divider"></div>
      <button class="btn btn--primary" data-act="ok">Weiter</button>`,
      { cls: 'sys-window--accent' }), { dismissible: false, sound: false });
    $('#overlay').querySelector('[data-act="ok"]').onclick = () => { closeOverlay(); resolve(); };
  });

  for (const t of res.newTitles) {
    toast(`${SYS.titleAcquired} — „${t.name}"`, { kind: 'gold', sound: 'unlock', ms: 6000 });
    await wait(700);
  }
  setView('status');
}

/* ── Einstellungen ────────────────────────────────────────────────── */

function setSetting(key, value) {
  S.settings[key] = value;
  St.save(S);

  if (key === 'sound') {
    A_.setEnabled(value);
    if (value) { A_.unlock(); sfx.ping(); }
  }
  if (key === 'notify' && value) requestNotify();
  if (key === 'notifyTime') scheduleReminder();
  if (key === 'resetHour') { handleRollover(); render(); }
}

/* ── Benachrichtigungen ───────────────────────────────────────────── */

async function requestNotify() {
  if (!('Notification' in window)) {
    toast('Dieser Browser unterstützt keine Benachrichtigungen.', { kind: 'danger' });
    S.settings.notify = false;
    St.save(S);
    render();
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    S.settings.notify = false;
    St.save(S);
    toast('Benachrichtigungen wurden abgelehnt.', { kind: 'danger' });
    render();
    return;
  }
  toast('Erinnerungen aktiv, solange die App im Hintergrund läuft.', { kind: 'gold' });
  scheduleReminder();
}

function notify(title, body) {
  if (!S.settings.notify) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  try {
    new Notification(title, { body, icon: 'assets/icon-192.png', tag: 'system-quest' });
  } catch { /* manche Browser erlauben das nur über den Service Worker */ }
}

let reminderTimer = null;
function scheduleReminder() {
  clearTimeout(reminderTimer);
  if (!S.settings.notify) return;
  const [h, m] = (S.settings.notifyTime || '18:00').split(':').map(Number);
  const now = new Date();
  const at = new Date();
  at.setHours(h, m, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  reminderTimer = setTimeout(() => {
    if (!S.today?.done) {
      notify('Daily Quest offen', `${S.today?.name || 'The Preparation To Become Powerful'} wartet.`);
    }
    scheduleReminder();
  }, at - now);
}

/* ── Backup ───────────────────────────────────────────────────────── */

async function exportBackup() {
  St.saveNow(S);
  try {
    const how = await St.exportFile(S);
    if (how === 'cancelled') return;
    toast(how === 'shared' ? 'Backup zum Sichern weitergereicht.' : 'Backup wurde heruntergeladen.',
      { kind: 'gold', sound: 'unlock' });
  } catch (err) {
    console.error(err);
    toast('Sichern fehlgeschlagen. Nimm „Als Text kopieren".', { kind: 'danger' });
  }
}

async function copyBackup() {
  St.saveNow(S);
  try {
    const len = await St.exportClipboard(S);
    toast(`Speicherstand kopiert (${len} Zeichen). Sicher ihn in einer Notiz.`,
      { kind: 'gold', sound: 'unlock', ms: 6500 });
  } catch (err) {
    console.error(err);
    toast('Kopieren wurde vom Browser blockiert.', { kind: 'danger' });
  }
}

function pasteBackup() {
  openOverlay(win('Speicherstand einfügen', `
    <p class="sys-text" style="margin-bottom:14px">
      Füge hier den kopierten Text ein. Dein aktueller Fortschritt wird dabei ersetzt.
    </p>
    <textarea class="input" id="pasteBox" rows="5" placeholder="{ … }"
              style="height:120px;padding:12px;font-size:12px;resize:vertical"></textarea>
    <div class="spacer"></div>
    <div class="btn-row">
      <button class="btn btn--ghost" data-act="cancel">Abbrechen</button>
      <button class="btn btn--primary" data-act="ok">Wiederherstellen</button>
    </div>`));
  const ov = $('#overlay');
  ov.querySelector('[data-act="cancel"]').onclick = () => closeOverlay();
  ov.querySelector('[data-act="ok"]').onclick = () => {
    const txt = ov.querySelector('#pasteBox').value.trim();
    try {
      S = St.importText(txt);
      St.saveNow(S);
      A_.setEnabled(S.settings.sound);
      closeOverlay();
      handleRollover();
      setView('status');
      toast('Speicherstand wiederhergestellt.', { kind: 'gold', sound: 'unlock' });
    } catch (err) {
      sfx.deny();
      toast(`Fehlgeschlagen: ${err.message}`, { kind: 'danger', sound: null });
    }
  };
}

async function importBackup(file) {
  try {
    const data = await St.importFile(file);
    S = data;
    St.saveNow(S);
    A_.setEnabled(S.settings.sound);
    handleRollover();
    setView('status');
    toast('Speicherstand geladen.', { kind: 'gold', sound: 'unlock' });
  } catch (err) {
    console.error(err);
    toast(`Import fehlgeschlagen: ${err.message}`, { kind: 'danger' });
  }
}

function hardReset() {
  St.wipe();
  location.reload();
}

/* ── Navigation & Lebenszyklus ────────────────────────────────────── */

document.getElementById('navbar').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-nav]');
  if (!btn) return;
  sfx.tap();
  setView(btn.dataset.nav);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !S.awakened) return;
  const today = St.dayKey(Date.now(), S.settings.resetHour);
  if (S.today?.date !== today) {
    handleRollover();
    render();
  }
});

window.addEventListener('beforeunload', () => St.saveNow(S));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeOverlay();
});

/* ── Service Worker ───────────────────────────────────────────────── */

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return;   // lokal geöffnet: kein SW möglich
  navigator.serviceWorker.register('sw.js').catch((err) =>
    console.warn('Service Worker nicht registriert:', err));
}

boot();
