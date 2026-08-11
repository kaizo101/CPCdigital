# Entwicklerdokumentation

## Quick-Start

Node.js 24 LTS aus [`.nvmrc`](.nvmrc) verwenden; Node.js 26 liegt außerhalb des
unterstützten Bereichs.

```bash
npm ci
npm run dev          # Vite + Electron
npm test             # alle Workspace-Tests
npm run build        # alle Workspaces bauen und Client typprüfen
npm run test:responsive
```

Die versionsgebundene `allowScripts`-Policy in `package.json` erlaubt nur die
benötigten Install-Skripte von Electron, esbuild, bcrypt und better-sqlite3.
Bei Updates dieser Pakete muss die freigegebene Version bewusst mit aktualisiert
werden. `npm run dev` und `./start.sh` prüfen vor dem Start, ob das Electron-Binary
vollständig installiert ist.

## Android-Debug-Workflow

Der Android-Stand ist ein lokaler Capacitor-8-Prototyp, kein Release-Artefakt.
Das native Projekt unter `android/`, `capacitor.config.ts` und die
Runtime-Integration werden versioniert. Kopierte Web-Assets, `local.properties`,
Gradle-Ausgaben und APKs bleiben generiert und werden nicht eingecheckt.

Vorausgesetzt werden Node.js 24, Android Studio, SDK 36 sowie ein per ADB
erreichbares Gerät oder ein Emulator. Der übliche Änderungszyklus ist:

```bash
npm run android:sync    # Client bauen und Web-Assets/Plugins synchronisieren
npm run android:open    # Projekt in Android Studio öffnen
npm run android:run     # alternativ synchronisieren und direkt deployen
npm run android:check   # Sync plus Gradle assembleDebug
```

`scripts/android-gradle.mjs` sucht zuerst
`CPC_ANDROID_JAVA_HOME`, danach die JBR einer über
`CPC_ANDROID_STUDIO_HOME` oder an üblichen Orten gefundenen
Android-Studio-Installation. Das SDK wird über `ANDROID_HOME`,
`ANDROID_SDK_ROOT` oder `~/Android/Sdk` ermittelt. Damit bleibt der Build auch
auf einem System mit inkompatiblem Java 26 reproduzierbar.

Die native Runtime wird in `native-runtime.ts` erkannt. Android läuft in
`sensorLandscape`, blendet die Systemleisten aus, verarbeitet Display-Cutouts
über CSS-Safe-Areas und stellt den immersiven Zustand nach `resume` wieder her.
Die native Zurück-Taste schließt zuerst geöffnete UI-Ebenen und beendet erst
danach die App. Setup und Tisch besitzen einen einfachen Android-spezifischen
Vollbildpfad; die Browser-Demo bleibt davon getrennt ein rudimentärer mobiler
Fallback. Eine PWA ist nicht vorgesehen.

### Abgeschlossene APK-Bestandsaufnahme

Der qualitative Durchlauf und die verkürzte Kontrollmatrix auf echter Hardware
sind abgeschlossen. Geprüft wurden:

1. Setup, Tisch und Actionbar in NLHE und PLO prüfen.
2. Heads-up, 6-max und Full Ring jeweils auf Zuordnung, Überlagerung und
   abgeschnittene Karten oder Bets prüfen.
3. Kamera-Cutout, Systemleisten, native Zurück-Taste sowie App-Wechsel und
   Resume nachvollziehen.
4. Board, Hero-Hole-Cards, obere Pods, Cardbacks, Stack- und Bet-Anzeigen
   fotografisch beziehungsweise per Screenrecording vergleichen.
5. Den funktionalen, aber geometrisch zu kleinen Android-HandReplayer in allen
   Formaten kurz gegenprüfen; sein vollständiges Redesign bleibt in v0.9.1.
6. Befunde als Blocker für 0.7.7, normales mobiles UX-Thema oder
   TableGeometry-Arbeit für 0.9.0 klassifizieren.

Gerätelauf und Kontrollmatrix sind im
[APK-Gerätebericht vom 30.07.2026](testing/apk/2026-07-30-device-inventory.md)
dokumentiert. Er trennt unmittelbar korrigierbare 0.7.7-Fehler von den
bewusst für TableGeometry und Responsive UI zurückgestellten Punkten. Der
Android-Replayer ist soweit beurteilbar funktional; seine zu kleine und
gequetschte Tischgeometrie bleibt für v0.9.1 dokumentiert.

## Architektur-Überblick

### Pakete

```
.
├── packages/
│   ├── client/src/           React UI + Bot-AI + Session-Management
│   │   ├── session/          LocalGameRunner, Rebuys, Replay, Debug-Export
│   │   ├── components/       PokerTable, PlayerSeat, Cards, HandReplayer
│   │   ├── screens/          SetupScreen, TableScreen
│   │   └── utils/            format, positions
│   ├── poker-engine/src/     Regeln, State Machine, Hand-Evaluator
│   ├── shared/src/           Typen (Player, Card, GameState, Events)
│   ├── electron/src/         Desktop-Wrapper (main, preload)
│   └── server/src/           ruhender Online-Prototyp, nicht Teil des v1-Laufzeitpfads
├── android/                  nativer Capacitor-Debug-Prototyp
└── capacitor.config.ts       native App- und Systemleisten-Konfiguration
```

### Wichtige Dateien

| Datei | Zeilen | Verantwortung |
|-------|--------|---------------|
| `session/LocalGameRunner.ts` | 980 | Game-Loop, Bot-Management, Event-Capture |
| `session/bot-rebuy-manager.ts` | 243 | Rebuys, Replacements, Leave-on-Bust |
| `session/hand-replay.ts` | 417 | Replay-Builder, Archiv, PokerStars-Formatierer |
| `bot-action-scoring.ts` | 557 | Fold/Check/Call/Raise/All-In-Scoring |
| `bot-action-modifiers.ts` | 306 | Persönlichkeit, Stack, Tilt-Modifier |
| `bot-decision-metrics.ts` | 239 | SPR, Pot-Odds, Bet-Sizing |
| `bot-params.ts` | 447 | Zentralisierte Tuning-Konstanten |
| `bot-pipeline.ts` | 95 | Decision-Pipeline (Variant→Scoring→Auswahl) |
| `nlhe-hand-evaluation.ts` | 752 | Hand-Kategorien, Draws, Vulnerability |
| `omaha-hand-evaluation.ts` | 432 | PLO-Handbewertung, physische Draw-Outs |
| `bot-identities.ts` | 252 | Identity-Generator, Rebuy-Policies |
| `bot-habits.ts` | 271 | 12 Habits mit archetyp-spezifischen Präferenzen |
| `poker-engine/src/game.ts` | 1059 | Engine: State Machine, Betting, Showdown |

### Entscheidungs-Flow (Bot)

```
1. PokerEngine → getPlayerView(botId) → BotGameView
2. BotGameView + HandHistory → BotContext
3. BotContext → VariantEvaluator.evaluate() → HandAssessment
4. HandAssessment + Context → scoreFold/Check/Call/Raise/AllIn
5. ScoredAction[] → weightedSelection() → chosen action
```

Jede der 5 Scoring-Funktionen durchläuft ~15 Modifier:
```
Base(Hand-Kategorie) + Position + Board-Texture + Gegner-Reads
+ Stack-Tiefe + SPR + Preflop-Strategy + Street-Initiative
+ Range-Estimation + Habits + Mental-State + Line-Planning
→ Utility-Score (0-100)
```

### Eine neue Variante hinzufügen

1. `bot-variant-registry.ts`: Variant registrieren
2. Neue Datei `omaha-hand-evaluation.ts`: `VariantEvaluator` implementieren
   - `evaluate(context)` → `VariantEvaluation { handAssessment, boardTexture }`
   - `handAssessment.category` + `relativeStrength` + `vulnerability` + `drawTypes`
3. Variant-spezifische Phasen in `poker-engine/src/game-variant.ts` definieren
4. UI: Setup-Screen um Variantenauswahl erweitern

Der Bot-Stack (Scoring, Habits, Mental State, Reads) arbeitet auf dem generischen `VariantHandAssessment`-Interface — keine Änderungen nötig.

### Ruhenden Server-Prototyp lokal starten

Der Server gehört nicht zum v1-Laufzeitpfad und wird von `npm run dev` nicht
gestartet. Für eine bewusste lokale Ausführung müssen mindestens ein starkes
JWT-Secret und ein lokaler Datenbankpfad gesetzt werden:

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
export DB_PATH="./.local-data/cpcdigital.db"
npm run dev --workspace @cpc/server
```

Ohne `HOST` bindet der Prozess ausschließlich an `127.0.0.1`. Für eine
Container- oder Netzwerkfreigabe müssen `HOST`, `CLIENT_ORIGIN`, TLS am
vorgeschalteten Proxy und die Persistenz bewusst konfiguriert werden. History-
und Statistik-Endpunkte verlangen einen gültigen Bearer-Token. Die
Beispielvariablen stehen in [`.env.example`](.env.example).

### Game-Loop

```
Setup → startHand() → postBlinds() → scheduleBotAction()
  → Bot entscheidet → applyAction() → syncChips() → notify()
  → nächster Spieler oder checkHandEnd()
  → Ergebnis anzeigen → finishHandPresentation()
  → setTimeout → startHand() (nächste Hand)
```

## Kalibrierung

Die Bot-Kalibrierung (VPIP, PFR, 3-Bet, C-Bet, Fold-to-CBet, Turn C-Bet, AF
und WTSD) wird mit `npm run calibrate:bots` gemessen. Ohne `CALIB_HANDS` läuft
die Release-Stufe mit 10.000 Händen pro Format × 3 Formate × 4 Archetypen.

Für PLO wird `CALIB_VARIANT=omaha-high` gesetzt. Seeds und Handzahl müssen bei
A/B-Vergleichen identisch bleiben. `CALIB_DETAIL=1` ergänzt Rohnenner und die
AF-Aufschlüsselung. `CALIB_PROFILE` und `CALIB_FORMAT` begrenzen gezielte
Entwicklungsläufe. `CALIB_NO_EXIT=1` ist für vollständige Diagnoseberichte
geeignet; ein Release-Gate darf Fehlschläge nicht damit ausblenden.

Die Ergebnisse werden in `calibration/` versioniert abgelegt. Die
formatisolierte Ausgangsbasis ist im [v0.8.0-Bericht](calibration/v0.8.0.md)
dokumentiert.

Der veröffentlichte 0.8.1-Stand ist im
[Release-Gate-Report](calibration/v0.8.1-release-gate.md) festgehalten. Tests,
Build, Responsive-Smoke, Layer-2-Regression, strukturelle Invarianten und alle
unveränderten Zielranges sind grün. Der versionierte 300-Hand-Snapshot gehört
zu genau diesem Release und darf erst nach einer bewusst freigegebenen
Verhaltensänderung erneut erzeugt werden.

Turn C-Bet bezeichnet seit Metrikschema v2 ausschließlich ein echtes Double
Barrel: derselbe Spieler war Preflop-Aggressor und Flop-C-Bettor und eröffnet
einen bislang ungeöffneten Turn. Eine Turn-Bet nach durchgechecktem Flop zählt
nicht als Turn C-Bet.

`npm run test:calibration` führt den deterministischen Layer-2-Smoke für alle
24 Varianten-/Archetyp-/Formatkombinationen aus. Er vergleicht 300 Hände pro
Kombination mit dem versionierten v0.8.1-Snapshot und läuft auch in der CI.
Raten warnen bei mehr als 2 Prozentpunkten Drift und schlagen oberhalb von 5
Prozentpunkten fehl; AF verwendet absolute Grenzen von 0,2 und 0,5.
`npm run calibrate:baseline` aktualisiert die Referenz nur nach einer bewusst
freigegebenen Verhaltensänderung.

Für faire A/B-Vergleiche besitzen einzelne Kalibrierungshände eigene Deck- und
Entscheidungs-Seeds sowie einen explizit aus der Handnummer rotierten Dealer.
Damit bleiben spätere Deals identisch, auch wenn eine Strategieänderung einen
früheren Runout verkürzt. Bot-Sessionzustände werden dagegen absichtlich nicht
zurückgesetzt, sodass reale Folgeeffekte auf Reads und Verhalten messbar
bleiben.

### Stichprobengrößen

| Stufe | Hände/Format | Total | Einsatz |
|-------|-------------:|------:|---------|
| Smoke | 300 | 3.600 | Laufzeitfehler, Invalid Actions, grobe Ausreißer |
| Entwicklung | 3.000 | 36.000 | Richtungsvergleich während gezieltem Tuning |
| Release | 10.000 | 120.000 | reproduzierbarer Bericht vor botrelevanten Releases |
| Bestätigung | 20.000–50.000 | 240.000–600.000 | knappe Grenzen oder statistisch auffällige A/B-Differenzen |

Die Laufzeit hängt stark von Variante und Evaluator ab; physische PLO-Outs sind
deutlich teurer als NLHE. Ein 20k–50k-Lauf ist daher kein pauschales Minor-Release-
Ritual, sondern eine gezielte Bestätigung, wenn 10k keine klare Entscheidung erlaubt.

Beispiel für einen PLO-Smoke-Lauf:

```bash
CALIB_VARIANT=omaha-high CALIB_HANDS=300 CALIB_NO_EXIT=1 npm run calibrate:bots
```

## Parameter-System

`bot-params.ts` zentralisiert ~120 tuning-relevante Konstanten in einem Objekt. Betroffene Kategorien:

- Archetype-Means (12 Parameter)
- Scoring-Gewichte (Fold/Check/Call/Raise/All-In pro Kategorie)
- Betting-Faktoren (Pot-Odds, Sizing, SPR, Reraise-Penalties)
- Preflop-Coverage-Tabellen
- Stack-Depth-Schwellen
- Mental-State-Magnituden

Der Auto-Kalibrierer (`scripts/calibrate.ts`) variiert nur die Archetype-Means. Scoring-Gewichte und Betting-Faktoren werden manuell getunt.

## Bot-Architektur

```text
DecisionContext → VariantEvaluation → HandAssessment
                              → bet-scoring
                              → bet-modifiers
                              → preflop-strategy
                              → street-initiative
                              → range-estimation
                              → habits
                              → mental-state
                              → reads
                              → line-planning
         → DecisionMetrics
         → LegalActions
         → Position

ScoredAction[] → weighted selection → chosen action
```

Jeder Bot durchläuft pro Entscheidung ~15 Modifier-Funktionen, die additive Beiträge zum Utility-Score liefern. Die Aktion mit dem höchsten Score wird gewählt (gewichtete Zufallsauswahl unter plausiblen Alternativen).

## Tests

- `npm test` führt alle Workspace-Tests mit Vitest aus
- `npm run test:calibration` prüft die deterministische 300-Hand-Baseline aller
  24 Botkombinationen; dieser kurze Kalibrierungs-Smoke läuft in der CI
- Testdateien liegen neben den Source-Dateien (`*.test.ts`)
- Client-, Engine- und Server-Konfigurationstests laufen in getrennten Workspaces
- `npm run test:responsive` startet den gebauten Client in Chrome/Chromium und
  prüft 1440×1000, 1024×768, 844×390 und 390×844 auf abgeschnittene Karten,
  Sitze, Actionbar-Überlagerungen und den Portrait-Guard
- Entwicklungs- und Release-Kalibrierungen mit 3k/10k Händen bleiben wegen
  ihrer Laufzeit separate Skripte

Der Responsive-Smoke setzt einen vorherigen Client-Build voraus und verwendet
`CHROME_PATH`, falls Chrome/Chromium nicht an einem üblichen Systempfad liegt.
Mit `CPC_RESPONSIVE_SCREENSHOT_DIR=/ziel` schreibt er zusätzlich je Viewport
einen Screenshot. Er definiert bewusst nur äußere Akzeptanzgrenzen und greift
nicht der für 0.9.0 geplanten TableGeometry-SSOT vor.

### Externe Tests

Externe Tests folgen der
[Test- und Distributionsstrategie](TESTING_STRATEGY.md). Pokerrealismus,
Bedienbarkeit für Neulinge und technische Betatests sind getrennte
Testaufträge mit jeweils eigenem Bogen aus
[TESTER_FORMS.md](TESTER_FORMS.md). Sie ergänzen automatisierte Tests und
Kalibrierungen, ersetzen deren Release-Gates aber nicht.

## Debug-Modus

`Ctrl+D` im Spiel aktiviert den Debug-Modus:
- BotDebugInspector (Entscheidungsdetails, Scores, Reads pro Bot)
- "Cards on" im Replay (alle Hole-Cards sichtbar)
- Entscheidungs-Export im Replay

Der Session-Debug-Export (JSON) enthält den kompletten Spielverlauf inkl. privater Bot-Karten und ist für die Offline-Analyse gedacht.

## Bug-Reproduktion

1. Session-Debug-Export erstellen (Button im Debug-Inspector)
2. Replay der betroffenen Hand öffnen (↻-Button)
3. Mit Step-Through und "Cards on" den Spielverlauf nachvollziehen
4. Bot-Entscheidungsgründe im Debug-Inspector prüfen

## Lizenz und Distribution

Das Repository ist unter `AGPL-3.0-only` lizenziert. Die vollständigen Bedingungen
stehen in [`LICENSE`](LICENSE), Copyright- und Scope-Angaben in
[`NOTICE.md`](NOTICE.md). Beiträge werden gemäß
[`CONTRIBUTING.md`](CONTRIBUTING.md) unter derselben Lizenz angenommen.

Für spätere Binärpakete gilt insbesondere:

- Lizenztext und erforderliche Copyright-Hinweise mit ausliefern
- den exakt zum Binärpaket gehörenden korrespondierenden Quellcode gleichwertig zugänglich machen
- Lizenzen und erforderliche Hinweise gebündelter Drittanbieterkomponenten erhalten
- bei einer modifizierten netzwerkfähigen v2-Version einen gut sichtbaren kostenlosen Source-Zugang bereitstellen

Der direkte Pages-Build liegt in `.github/workflows/pages.yml`. Er deployt
ausschließlich `packages/client/dist` aus `master` und bettet dieses Repository
als Source-Link ein. Die offizielle Demo ist unter
<https://kaizo101.github.io/CPCdigital/> erreichbar.

Das frühere Repository `cpcdigital-demo` liefert nur noch eine statische
Weiterleitung aus. Sein alter Quellstand bleibt in der Git-Historie erhalten;
der vorherige Positivlisten-Sync wurde nach dem erfolgreichen Cutover entfernt.
Eine Archivierung erfolgt erst nach einer angemessenen Übergangszeit.

## Public-Release- und Betriebskontrollen

Der öffentliche Cutover vom 29.07.2026 umfasste:

1. vollständigen Secret-Scan über Arbeitsbaum und Git-Historie
2. `npm ci --ignore-scripts`, `npm test`, `npm run build` und `npm audit`
3. Kontrolle auf getrackte Datenbanken, `.env`-Dateien, Schlüssel und Credentials
4. Secret Scanning, Push Protection, Private Vulnerability Reporting und CodeQL
5. ausschließlich GitHub-eigene, vollständig per Commit-SHA fixierte Actions
6. Schutz von `master` gegen Löschen und Force-Push
7. Prüfung des Pages-Bundles auf Version, AGPL-Hinweis und Source-Link
8. Browserprüfung der Weiterleitung vom früheren Demo-Repository

Für weitere Releases bleiben Tests, Build, Audit, CodeQL und die
variant-spezifischen Kalibrierungsgates verpflichtend. Release-Tags werden erst
nach erfolgreichem Gate auf dem geprüften Release-Commit erstellt und gemeinsam
mit dem zugehörigen Branch veröffentlicht.

Der aktuelle technische Befund ist im
[Public-Readiness-Audit vom 29.07.2026](security/audits/2026-07-29-public-readiness.md)
dokumentiert.

## Bekannte Limitationen

- **Scoring ist additiv**: Beiträge werden summiert, kein Clamping zwischen Schichten. Ein extremer Habit (+30) kann alle anderen Modifier überschreiben.
- **Keine GTO-Basis**: Alle Entscheidungen basieren auf Heuristiken, nicht auf spielfheoretischen Berechnungen. Das ist gewollt (Casual statt Solver).
- **Reads heuristisch kalibriert**: Bots beobachten Hero und andere Bots; echtes menschliches Spielverhalten ist noch nicht validiert.
- **Persistenter Roster**: Bot-Identities werden in localStorage gespeichert. Nach Browser-Daten-Löschung wird ein neuer Roster generiert.
- **Lokales Hand-Archiv**: Die letzten 200 Replays liegen in localStorage und gehen beim Löschen der Browser-Daten verloren.
- **Replay je Plattform**: Separate BrowserWindows funktionieren nur in
  Electron. Browser und Android verwenden ein Overlay; der kompakte
  Android-Landscape-Replayer ist durch einen Zwischenfix wieder nutzbar und im
  Responsive-Smoke für 2-max, 6-max und 9-max abgedeckt. Die gemeinsame
  responsive Überarbeitung folgt weiterhin mit der TableGeometry-SSOT.
- **Android nur als Debug-Prototyp**: Gerätekompatibilität, Release-Signierung, Distribution und vollständige mobile Feature-Parität sind noch nicht zugesagt. Die qualitative Erstaufnahme ist abgeschlossen; die vollständige Varianten-/Format-/Lifecycle-Matrix steht noch aus.
- **Mobile Geometrie**: Sicherheitskorrekturen verhindern die derzeit bekannten oberen Karten-Clips. Eine konsistente Sitz-, Karten- und Bet-Geometrie folgt erst mit der TableGeometry-SSOT in v0.9.0.
- **Ruhender Server-Prototyp**: `packages/server` bleibt bewusst für eine mögliche v2-Integration erhalten, wird aber vom Offline-Client nicht importiert und ist kein v1-Produktionspfad. Seine aktuelle Härtung ersetzt kein Produktions-Sicherheitsaudit.
- **Formatierung**: Eine gemeinsame Prettier-Konfiguration ist noch nicht
  eingecheckt; die mechanische Vereinheitlichung ist für den
  Code-Qualitätsblock in v0.8.3 vorgesehen.
