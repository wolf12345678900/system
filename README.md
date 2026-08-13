# THE SYSTEM

Eine Trainings-App nach dem Systemkonzept aus **Solo Leveling**.
Du bekommst jeden Tag eine Daily Quest, sammelst Erfahrung, steigst im Level,
verteilst Statuspunkte — und landest in der Penalty Zone, wenn du einen Tag versäumst.

Das Endziel ist die Original-Quest von Sung Jinwoo: **100 Liegestütze, 100 Sit-ups,
100 Kniebeugen und 10 km** — erreicht auf Level 50.

---

## Starten

**Doppelklick auf `START.bat`.**

Das war's — der Server startet und der Browser öffnet sich von selbst. Das
schwarze Fenster muss offen bleiben, solange du die App nutzt. Zum Beenden
`Strg + C` drücken oder das Fenster schließen.

Alternativ von Hand:

```bash
python serve.py
```

Ein Doppelklick auf `index.html` funktioniert **nicht** — die App besteht aus
ES-Modulen, die der Browser nur über einen echten Server lädt. Über `file://`
blockiert er sie und du bekommst eine leere Seite.

**Am Handy (der eigentliche Zweck):** siehe „Online stellen" weiter unten.

---

## Wie es funktioniert

### Awakening Test

Beim ersten Start misst die App deinen Ist-Stand: maximale Wiederholungen bei
Liegestützen, Sit-ups und Kniebeugen sowie die Distanz, die du am Stück schaffst.
Daraus errechnen sich deine Startwerte und dein erstes Quest-Volumen.

Du beginnst immer auf **Level 1** — wie Jinwoo. Der Test bestimmt nur, wie schwer
die erste Quest ausfällt.

### Progression

| Ereignis | Belohnung |
|---|---|
| Level-Up | alle Statuswerte **+1**, dazu **5 freie Punkte** |
| Daily Quest abgeschlossen | **+3 freie Punkte**, Status Recovery, Erfahrung |
| Penalty Quest abgeschlossen | +1 Punkt, Austritt aus der Zone |

Das sind die Originalwerte aus dem Webtoon.

Das Quest-Volumen wächst linear mit deinem Level bis zur vollen Original-Quest
auf Level 50. Beispiel für einen Start bei 12 Liegestützen:

| Level | Rang | Liegestütze | Sit-ups | Kniebeugen | Laufen |
|---|---|---|---|---|---|
| 1 | E | 18 | 30 | 38 | 1,5 km |
| 10 | D | 33 | 43 | 49 | 3 km |
| 25 | C | 62 | 68 | 72 | 5,5 km |
| 40 | A | 83 | 86 | 87 | 8,5 km |
| **50** | **S** | **100** | **100** | **100** | **10 km** |

Jenseits von Level 50 steigt es langsam weiter — über das Original hinaus.

### Fatigue

Der Erschöpfungswert aus Jinwoos Statusfenster ist hier eine echte Mechanik:

- Er steigt mit jedem Training und fällt über Nacht.
- Ab **60** drosselt das System dein Tagesziel automatisch auf 75 %.
- Ab **85** ersetzt ein Erholungsprotokoll (Spaziergang, Dehnen) die Daily Quest.
- **Stamina** senkt den Anstieg und beschleunigt die Erholung.

Dadurch ist es sinnvoll, Punkte in Stamina zu stecken statt alles in Strength zu
kippen: Wer Ausdauer vernachlässigt, trainiert dauerhaft mit gedrosseltem Ziel.

### Penalty Zone

Wird eine Daily Quest nicht bis zum Tageswechsel abgeschlossen, landest du am
Folgetag in der Penalty Zone. Die Oberfläche kippt ins Rote, die Serie fällt auf
null, und statt der Daily Quest musst du die Strafquest *Survival* abarbeiten.
Wer sie besteht, erhält den Titel **Conqueror of Adversity**.

Der Skill **Ruler's Authority** (ab Level 15) fängt einen versäumten Tag pro
Woche ab.

### Titel, Jobs und Skills

Zehn Titel mit echten Boni (Erfahrung, Erschöpfung, Bonuspunkte); immer einer ist
aktiv. Fünf Skills schalten sich über Level frei.

Auf **Level 40** erscheint der **Job Change Quest**: 20 Minuten, so viele Runden
eines Zirkels wie möglich — *„You will accumulate more points the longer you stay
alive."* Wer besteht, wird zum **Monarch of Shadows** und erhält den Skill
*Shadow Extraction*.

---

## Online stellen

Damit die App am Handy läuft, muss sie über HTTPS erreichbar sein
(Service Worker und Homescreen-Installation funktionieren sonst nicht).

**Mit GitHub Pages:**

```bash
git init
git add .
git commit -m "THE SYSTEM"
```

Danach ein leeres Repository auf GitHub anlegen, hochladen und in den
Repository-Einstellungen unter *Pages* als Quelle den `main`-Branch wählen.
Nach ein paar Minuten ist die App unter
`https://<dein-name>.github.io/<repo>/` erreichbar.

**Am Handy installieren:** Link öffnen → Browsermenü → *Zum Startbildschirm
hinzufügen*. Danach startet sie wie eine normale App, im Vollbild und offline.

---

## Deine Daten

Alles liegt im lokalen Speicher (`localStorage`) des jeweiligen Geräts, unter dem
Schlüssel `system.save.v1`. Kein Server, kein Account, keine Übertragung.
Gespeichert wird nach jeder Aktion automatisch.

**Jedes Gerät hat seinen eigenen Speicherstand.** PC und iPhone laufen getrennt,
und auf dem iPhone hat die installierte Homescreen-App einen anderen Speicher als
derselbe Link im Safari-Tab.

**Der Fortschritt geht verloren bei:** gelöschten Browser-/Websitedaten, Privat-
bzw. Inkognito-Modus, gelöschtem Homescreen-Symbol (iOS), einem anderen Browser
oder einer anderen Adresse.

Unter *System → Daten* gibt es deshalb vier Wege:

| | |
|---|---|
| **Backup sichern** | Auf dem iPhone öffnet sich der Teilen-Dialog (→ Dateien, iCloud, Chat), am PC lädt eine JSON-Datei herunter. |
| **Backup laden** | Datei auswählen und wiederherstellen. |
| **Als Text kopieren** | Speicherstand in die Zwischenablage — für eine Notiz oder eine Nachricht an dich selbst. |
| **Text einfügen** | Aus so einem Text wiederherstellen. |

Über Sichern und Laden holst du deinen Fortschritt auch vom PC aufs Handy.
Mach das regelmäßig.

## Updates

Der Service Worker holt Programmcode (`.js`, `.css`, `.html`, Manifest) immer
zuerst aus dem Netz und nutzt den Cache nur, wenn keine Verbindung besteht.
Neue Dateien hochladen genügt also — beim nächsten Start ist die App aktuell.
Bilder kommen weiter aus dem Cache.

Bei größeren Änderungen die Zahl in `CACHE` in `sw.js` hochzählen
(`system-v2` → `system-v3`), dann wird der alte Cache beim nächsten Start
vollständig verworfen.

---

## Aufbau

```
index.html              Grundgerüst und Ansichtscontainer
manifest.webmanifest    PWA-Manifest
sw.js                   Service Worker (Offline-Betrieb)
css/styles.css          Design-System: holografische Fenster, Scanlines, Penalty-Theme
js/
  app.js                Steuerung: Start, Routing, Tageswechsel, Countdown, Backup
  engine.js             Progression: Level, Stats, Questvolumen, Fatigue, Belohnungen
  state.js              Datenmodell, Persistenz, Export/Import, Datumslogik
  content.js            Übungen, Titel, Skills, Jobs, System-Meldungen
  views.js              Awakening, Status, Quest, Workout-Modus, Verlauf, Einstellungen
  ui.js                 Fenster, Toasts, Overlays, Level-Up-Sequenz, Partikel
  audio.js              Systemklänge, synthetisch per Web Audio erzeugt
  charts.js             SVG-Diagramme (Linie, Balken, Netz)
assets/                 Icons
```

Kein Build-Schritt, keine Abhängigkeiten, keine externen Ressourcen.
Bearbeiten und Seite neu laden genügt.

---

## Balance anpassen

Die wichtigsten Stellschrauben stehen in `js/engine.js`:

| Konstante / Funktion | Wirkung |
|---|---|
| `CAP_LEVEL` | Level, auf dem die volle Original-Quest erreicht ist (Standard 50) |
| `xpNeeded()` | Erfahrungskurve pro Level |
| `goalForReps()` / `goalForRun()` | Tagesziele |
| `setSize()` | Satzgröße im geführten Modus |
| `recoveryPerNight()` | nächtliche Erholung |
| `completeQuest()` | Erfahrung, Punkte, Fatigue-Anstieg |

Übungen und Texte liegen in `js/content.js`.

---

*Nach dem Systemkonzept aus «Solo Leveling» von Chugong,
Webtoon-Adaption von DUBU (REDICE Studio). Diese App ist ein privates
Trainingswerkzeug und steht in keiner Verbindung zu den Rechteinhabern.*
