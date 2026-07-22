# Entwicklerdokumentation

## Quick-Start

```bash
npm install
npm run dev          # Vite + Electron
npm test             # 228 Tests in ~1.5s
npm run build        # Client + Engine + Electron bauen
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
└── electron/src/         Desktop-Wrapper (main, preload)
```

### Wichtige Dateien

| Datei | Zeilen | Verantwortung |
|-------|--------|---------------|
| `session/LocalGameRunner.ts` | 907 | Game-Loop, Bot-Management, Event-Capture |
| `session/bot-rebuy-manager.ts` | 241 | Rebuys, Replacements, Leave-on-Bust |
| `session/hand-replay.ts` | 310 | Replay-Builder, PokerStars-Formatierer |
| `bot-action-scoring.ts` | 521 | Fold/Check/Call/Raise/All-In-Scoring |
| `bot-action-modifiers.ts` | 291 | Persönlichkeit, Stack, Tilt-Modifier |
| `bot-decision-metrics.ts` | 238 | SPR, Pot-Odds, Bet-Sizing |
| `bot-params.ts` | 433 | Zentralisierte Tuning-Konstanten |
| `bot-pipeline.ts` | 95 | Decision-Pipeline (Variant→Scoring→Auswahl) |
| `nlhe-hand-evaluation.ts` | 719 | Hand-Kategorien, Draws, Vulnerability |
| `bot-identities.ts` | 247 | Identity-Generator, Rebuy-Policies |
| `bot-habits.ts` | 271 | 12 Habits mit archetyp-spezifischen Präferenzen |
| `poker-engine/src/game.ts` | 1050 | Engine: State Machine, Betting, Showdown |

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

### Game-Loop

```
Setup → startHand() → postBlinds() → scheduleBotAction()
  → Bot entscheidet → applyAction() → syncChips() → notify()
  → nächster Spieler oder checkHandEnd()
  → Ergebnis anzeigen → finishHandPresentation()
  → setTimeout → startHand() (nächste Hand)
```

## Kalibrierung

Die Bot-Kalibrierung (VPIP, PFR, 3-Bet) wird mit `npx tsx packages/client/src/simulation.ts` gemessen. Standard: 10.000 Hände pro Format × 3 Formate × 4 Archetypen = 120.000 Hände, Laufzeit ~5 Minuten.

Für statistisch signifikante Vergleiche zwischen Releases (p < 0.05, ±1%-Punkt) werden ~50.000 Hände pro Format benötigt. Das entspricht 600.000 Händen und ~15 Minuten Laufzeit. Ein solcher Lauf sollte vor jedem Minor-Release (v0.7.0, v0.8.0) durchgeführt werden.

Die Ergebnisse werden in `calibration/` versioniert abgelegt.

### Stichprobengrößen

| Zweck | Hände/Format | Total | Laufzeit |
|-------|-------------|-------|----------|
| Dev (schnell) | 3.000 | 36k | ~90s |
| Dev (Standard) | 10.000 | 120k | ~5min |
| Pre-Release | 50.000 | 600k | ~25min |

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

- `npm test` führt 228 Tests in ~1.5s aus (Vitest)
- Testdateien liegen neben den Source-Dateien (`*.test.ts`)
- Engine-Tests separat in `packages/poker-engine/`
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

## Bekannte Limitationen

- **Scoring ist additiv**: Beiträge werden summiert, kein Clamping zwischen Schichten. Ein extremer Habit (+30) kann alle anderen Modifier überschreiben.
- **Keine GTO-Basis**: Alle Entscheidungen basieren auf Heuristiken, nicht auf spielfheoretischen Berechnungen. Das ist gewollt (Casual statt Solver).
- **Reads nur gegen Bots trainiert**: Die Read-Systeme lernen aus Bot-Verhalten, nicht aus menschlichem Spiel.
- **Persistenter Roster**: Bot-Identities werden in localStorage gespeichert. Nach Browser-Daten-Löschung wird ein neuer Roster generiert.
- **Electron-only Replay-Fenster**: Separate BrowserWindows funktionieren nur in Electron. Im Browser fällt das Replay auf ein Overlay zurück.
