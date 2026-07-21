# Entwicklerdokumentation

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
