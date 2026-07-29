# Entwicklerdokumentation

## Quick-Start

```bash
npm ci
npm run dev          # Vite + Electron
npm test             # 258 Tests
npm run build        # alle Workspaces bauen und Client typprüfen
```

## Architektur-Überblick

### Pakete

```
packages/
├── client/src/           React UI + Bot-AI + Session-Management
│   ├── session/          LocalGameRunner, Rebuys, Replay, Debug-Export
│   ├── components/       PokerTable, PlayerSeat, Cards, HandReplayer
│   ├── screens/          SetupScreen, TableScreen
│   └── utils/            format, positions
├── poker-engine/src/     Regeln, State Machine, Hand-Evaluator
├── shared/src/           Typen (Player, Card, GameState, Events)
├── electron/src/         Desktop-Wrapper (main, preload)
└── server/src/           ruhender Online-Prototyp, nicht Teil des v1-Laufzeitpfads
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

Die Bot-Kalibrierung (VPIP, PFR, 3-Bet, C-Bet, AF und WTSD) wird mit
`npm run calibrate:bots` gemessen. Ohne `CALIB_HANDS` läuft die Release-Stufe mit
10.000 Händen pro Format × 3 Formate × 4 Archetypen.

Für PLO wird `CALIB_VARIANT=omaha-high` gesetzt. Seeds und Handzahl müssen bei
A/B-Vergleichen identisch bleiben. `CALIB_NO_EXIT=1` ist für Diagnoseberichte
geeignet; ein Release-Gate darf Fehlschläge nicht damit ausblenden.

Die Ergebnisse werden in `calibration/` versioniert abgelegt.

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

- `npm test` führt 258 Tests aus (Vitest)
- Testdateien liegen neben den Source-Dateien (`*.test.ts`)
- Client-, Engine- und Server-Konfigurationstests laufen in getrennten Workspaces
- Kalibrierung ist NICHT Teil der Test-Suite (Laufzeit), sondern separates Skript

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

Bis zum öffentlichen Cutover ist das eigenständige Demo-Repository nicht Teil
dieses Repositorys. Es weist `AGPL-3.0-only` separat aus und wird über
`scripts/sync-demo.sh` aus einer expliziten Positivliste erzeugt.

Der künftige direkte Pages-Build liegt in `.github/workflows/pages.yml`. Er
deployt ausschließlich `packages/client/dist`, bettet dieses Repository als
Source-Link ein und läuft nur, wenn GitHub das Repository als öffentlich meldet.

## Public-Release-Checkliste

Vor der Umstellung des Hauptrepositorys auf öffentlich:

1. vollständigen Secret-Scan über Arbeitsbaum und Git-Historie ausführen
2. `npm ci --ignore-scripts`, `npm test`, `npm run build` und `npm audit` prüfen
3. kontrollieren, dass lokale Datenbanken, `.env`-Dateien und Referenzordner nie
   getrackt wurden
4. offene 0.7.7-Release-Gates in der Roadmap abschließen und Release taggen
5. Repository-Sichtbarkeit erst nach expliziter Freigabe ändern
6. Secret Scanning, Push Protection, CodeQL und Pages auf GitHub aktivieren
7. Pages-Bundle auf Version, AGPL-Hinweis und Source-Link prüfen
8. bisheriges Demo-Repository zunächst auf eine Weiterleitung reduzieren und
   erst nach einer Übergangszeit archivieren

Der aktuelle technische Befund ist im
[Public-Readiness-Audit vom 29.07.2026](security/audits/2026-07-29-public-readiness.md)
dokumentiert.

## Bekannte Limitationen

- **Scoring ist additiv**: Beiträge werden summiert, kein Clamping zwischen Schichten. Ein extremer Habit (+30) kann alle anderen Modifier überschreiben.
- **Keine GTO-Basis**: Alle Entscheidungen basieren auf Heuristiken, nicht auf spielfheoretischen Berechnungen. Das ist gewollt (Casual statt Solver).
- **Reads heuristisch kalibriert**: Bots beobachten Hero und andere Bots; echtes menschliches Spielverhalten ist noch nicht validiert.
- **Persistenter Roster**: Bot-Identities werden in localStorage gespeichert. Nach Browser-Daten-Löschung wird ein neuer Roster generiert.
- **Lokales Hand-Archiv**: Die letzten 200 Replays liegen in localStorage und gehen beim Löschen der Browser-Daten verloren.
- **Electron-only Replay-Fenster**: Separate BrowserWindows funktionieren nur in Electron. Im Browser fällt das Replay auf ein Overlay zurück.
- **Ruhender Server-Prototyp**: `packages/server` bleibt bewusst für eine mögliche v2-Integration erhalten, wird aber vom Offline-Client nicht importiert und ist kein v1-Produktionspfad. Seine aktuelle Härtung ersetzt kein Produktions-Sicherheitsaudit.
- **Formatierung**: Eine gemeinsame Prettier-Konfiguration ist noch nicht eingecheckt und wird in v0.7.7 als eigener mechanischer Commit eingeführt.
