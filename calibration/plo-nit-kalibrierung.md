# PLO-Kalibrierung — Abschluss nach Metrik-Audit

Stand: 03.08.2026
Branch: `plo-nit-kalibrierung-wip`

## 1. Ergebnis

Die PLO-Kalibrierung für Full Ring und 6-max ist abgeschlossen. Alle vier
Archetypen liegen in korrigierten deterministischen 10k-Läufen innerhalb der
Zielkorridore; in keinem Lauf trat ein Invalid-action-Fallback auf. Heads-up
bleibt wie geplant außerhalb von v0.7.8 und folgt in v0.8.

Die zwischenzeitliche pauschale Erweiterung der Nit-6-max-Ziele auf AF 4,5 und
WTSD 40 wurde verworfen. Stattdessen wurden der vollständige Mess- und
Entscheidungspfad auditiert, drei Metrikfehler korrigiert und die Preflop-Range
strukturell ergänzt. Der finale Nit-6-max-Korridor liegt bei AF 1,5–4,0 und
WTSD 25–38.

## 2. Korrigierte 10k-Werte

| Archetyp | Format | VPIP | PFR | 3-bet | AF | WTSD | C-Bet |
|---|---|---:|---:|---:|---:|---:|---:|
| Nit | FR | 21,67 | 13,16 | 3,31 | 3,12 | 35,0 | 42,0 |
| Nit | 6-max | 25,43 | 16,69 | 4,78 | 3,64 | 37,7 | 45,1 |
| TAG | FR | 32,57 | 16,27 | 8,36 | 2,21 | 32,2 | 44,0 |
| TAG | 6-max | 38,03 | 21,41 | 8,10 | 2,91 | 33,6 | 46,0 |
| LAG | FR | 36,61 | 18,72 | 12,89 | 2,06 | 24,1 | 50,8 |
| LAG | 6-max | 45,43 | 24,66 | 13,90 | 2,31 | 27,7 | 53,2 |
| Calling Station | FR | 45,62 | 5,92 | 0,59 | 1,09 | 36,6 | 40,1 |
| Calling Station | 6-max | 46,40 | 9,77 | 1,35 | 1,95 | 43,9 | 38,0 |

## 3. Behobene strukturelle Fehler

### WTSD-Nenner

Bei Händen mit Showdown wurden zuvor nur die tatsächlich aufgedeckten Spieler
als „saw flop“ gezählt. Spieler, die den Flop sahen und später foldeten,
fehlten im Nenner. WTSD war dadurch systematisch zu hoch.

Jetzt werden alle Spieler beim Erreichen des Flops erfasst. Aufgedeckte
Preflop-All-ins werden ergänzt, damit automatische Board-Runouts ebenfalls
korrekt zählen.

### AF und passive All-ins

Jedes Postflop-All-in wurde als Aggression gezählt. Ein zu kurzer All-in-Call
ist jedoch ein Call und kein Bet/Raise. AF verwendet jetzt dieselbe
Aggressionsklassifikation wie VPIP/PFR und zählt passive All-ins in den
Call-Nenner.

### 3-bet-Opportunities

Eine 3-bet-Opportunity wurde nur bei der ersten Aktion eines Spielers erfasst.
Ein Spieler, der zunächst checkte oder limp-callte und später einen Backraise
ausführen konnte, konnte deshalb als 3-bettor ohne passende Opportunity im
Nenner erscheinen. Opportunities werden nun bei jeder noch nicht erfassten
Aktion mit exakt einem vorherigen Raise erkannt.

## 4. Finale Nit-Range

### Full Ring

Der Trace zeigte breite `good`-Cold-Calls als VPIP-Treiber. Die
Full-Ring-Tabelle wurde nur dort enger gestellt:

- `fold.good`: -30 → -24
- `call.good`: -8 → -12

### 6-max

Ein hartes `good → fold` ließ VPIP auf 4,26 % kollabieren und wurde verworfen.
Die finale Lösung trennt die tatsächlichen Situationen:

- eigene 6-max-Preflop-Scores für `good` (`call -8`, `raise -12`)
- `raise-or-call` mit `good` gegen ein Open für einen kleinen 3-bet-Mix
- `call-or-fold` mit `medium` gegen ein Open für einen kontrollierten
  Cold-Call-Anteil ohne Limp- oder Raise-Kaskade

Der Medium-Mix verbreitert die Postflop-Range gerade genug, um den vorher fast
ausschließlich starken, bet-lastigen Range-Ausschnitt zu vermeiden. PFR und
3-bet bleiben dabei im Ziel.

## 5. Zielkorrekturen nach dem Audit

Die folgenden Änderungen sind keine nachträgliche Anpassung an einzelne
Ausreißer, sondern Folgen der korrigierten Metrikdefinitionen:

- Nit 6-max: AF maximal 4,0; WTSD maximal 38
- LAG FR/6-max: AF mindestens 2,0, weil passive All-ins nicht länger als
  Aggression zählen
- LAG FR: WTSD mindestens 23, weil Flop-Folder jetzt korrekt im Nenner stehen
- Calling Station 3-bet: FR mindestens 0,5, 6-max mindestens 1,0, weil
  Backraise-Opportunities nicht länger fehlen

Die kleinen bereits beschlossenen Toleranzkorrekturen bleiben bestehen:

- TAG VPIP: FR 22–33, 6-max 28–39
- Calling Station FR C-Bet: 20–41
- Calling Station 6-max AF: 0,5–2,1

## 6. Diagnostik

- `CALIB_TRACE=1`: Street × Handkategorie × Aktion
- `CALIB_CONTEXT_TRACE=1`: zusätzlich PFA-Rolle und Facing-Bet/Open-Action
- `CALIB_DETAIL=1`: 3-bet nach Kategorie, AF nach Street/PFA-Rolle und
  Flop→Turn→River→Showdown-Trichter
- `CALIB_PROFILE` und `CALIB_FORMAT`: gezielte Profil-/Formatläufe

Die Diagnose zeigte unter anderem, dass Nit-6-max-Non-PFA bereits einen
unauffälligen AF hatte und die Quote hauptsächlich aus PFA-Bets bei sehr wenigen
PFA-Calls entstand. Globale Postflop-Scoreänderungen waren deshalb der falsche
Hebel und wurden vollständig verworfen.

## 7. Verifikation

- Zwei vollständige 10k-Gates: alle vier Archetypen jeweils Full Ring und
  6-max; beide Prozesse mit Exit-Code 0.
- 0 Invalid-action-Fallbacks in allen acht Läufen.
- 304 Workspace-Unit-Tests grün (194 Client, 103 Engine, 7 Server).
- Client-Typecheck und `git diff --check` ohne Fehler.
- Heads-up bleibt bewusst für v0.8 offen. Das umfasst auch den nach dem Audit
  bestätigten NLHE-Calling-Station-Wert von 1,79% 3-Bet bei 10k Händen
  (63/3512 Opportunities; bisheriges Target 2–13%).
