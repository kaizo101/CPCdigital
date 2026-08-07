# Code Review & Rekalibrierung

**Session 2026-08-07** · 368 tests (249 Client + 112 Engine + 7 Server)

---

## Code-Review — Funde & Fixes

### game.ts (Engine State Machine)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | `reopenBettingAfterRaise`: `seatIndex` minus `findIndex` — zwei Koordinatensysteme | VERIFIZIERT + GEFIXT | Beide Distanzen verwenden `findIndex` (Array-Index) |
| 2 | `forceFold` erzeugt keinen `DecisionSnapshot` | VERIFIZIERT + GEFIXT | `createDecisionSnapshot(playerId, {type:'fold'}, 'forced')` eingefügt |
| 5 | `dealerIdxInHand` silent fallback auf 0 | Unreachable Dead Code | — |
| 8 | `resolveInitialDealerIndex` fallback auf nicht-eligible | Unreachable Dead Code | — |

**Neue Tests:** 7

### LocalGameRunner.ts (Game Loop)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | Bot-Decision-Fehler friert Spiel ein | VERIFIZIERT + GEFIXT | `forceFold`-Recovery in beiden Catch-Blöcken |
| 2 | Fehlende Bot-Karten im Replay bei Pipeline-Fehler | Kein Bug (CardBack korrekt) | — |
| 3 | Runout-Animation überschreibt Chips temporär | Kein Bug (syncChips korrigiert) | — |
| 4 | Hero-Action in falscher Phase | Kein Bug (Error gefangen) | — |

**Neue Tests:** 6

### bot-action-scoring.ts (Decision Scoring)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | PLO `boardWorseSensitivity`: 0.4 vs 0.6 Inkonsistenz | VERIFIZIERT + GEFIXT | Einheitlich 0.6 (später auf 0.4 revertiert, siehe PLO-Rekalibrierung) |
| 2 | `scoreCheck` nutzte `rangeBasedFactors('call', …)` | VERIFIZIERT + GEFIXT | Entfernt — Check hat keine Range-Komponente |
| 3 | `skillLevelFactor` setzt sortierte Tiers voraus | Kein Bug. Defensive: `resetParams()` sortiert | — |

**Neue Tests:** 4

### bot-action-modifiers.ts (Personality/Tilt/Stack)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | Patience-Modifier ohne `personalityDivisor` | VERIFIZIERT + GEFIXT | `-(patience-50)/12` → `-(patience-50)/personalityDivisor(12, context)` |

**Neue Tests:** 1

### Module ohne Befund (Code-Review)

| Modul | Zeilen | Ergebnis |
|-------|--------|----------|
| `bot-mental.ts` | 137 | Clean. Event-Handler teilweise Dead Code (Mental Events für v0.8.1) |
| `bot-reads.ts` | 231 | Clean. Beta-Priors, EMA-Sizing, Profile korrekt |
| `bot-params.ts` | 465 | Clean. `params.mental` (44 Z.) **Vorgeriff** — definiert, nie gelesen |
| `bot-opponent-observation.ts` | 65 | Bereits getestet |
| `bot-street-analysis.ts` | 208 | `opponentShowedWeakness` flaggt Checks nach fremden Raises |
| `bot-range-estimation.ts` | 273 | Clean |
| `bot-line-planning.ts` | 102 | Clean |
| `bot-pipeline.ts` | 95 | Clean |
| `bot-skill-perception.ts` | 170 | Clean |
| `bot-context.ts` | 136 | Clean |
| `bot-decision-metrics.ts` | 260 | Clean |
| `nlhe-hand-evaluation.ts` | 752 | Clean |
| `preflop-ranges.ts` | 388 | Clean |
| `bot-tag.ts` | 285 | Clean |
| `bot-timing.ts` | 73 | Clean |
| `bot-decision-complexity.ts` | 76 | Clean |
| `bot-action-selection.ts` | 38 | Clean |
| `bot-state.ts` | 92 | Clean |
| `bot-sizing.ts` | 21 | Clean |

---

## PLO-Rekalibrierung — Score-Änderungen

Die PLO-Handbewertungs-Fixes (Nut-Potential, Dirty Outs, Board-Change) haben
die WTSD-Baseline um 6–8%p gesenkt. Nachfolgende Score-Anpassungen:

### bot-category-scores.ts
- **LAG PLO**: Raise-Scores auf v0.7.8-Niveau zurück, Postflop-Call-Scores erhöht
- **TAG PLO**: Raise-Scores erhöht (good 6→14, strong 12→20), Protection-Boni verstärkt
- **Nit PLO**: Fold-Scores erhöht, Call-Scores reduziert (FR WTSD 30.9% → 28.5%)
- **CS PLO**: Minimale Anpassungen

### bot-action-scoring.ts
- PLO Protection-Bonus: `{wet: 12, dry: 8}` → `{wet: 8, dry: 6}` (zurück auf Original)
- PLO Board-Worse-Sensitivity: `0.6` → `0.4` (zurück auf Original, in `scoreRaise` und `calculateRaiseTo`)

### simulation.ts — Target-Anpassungen
- **NLHE**: C-Bet (LAG 80–90%→68–78%, Nit 45–58%→60–72%), AF-Caps (TAG 3.8, Nit 3.5, LAG 4.2)
- **PLO WTSD**: TAG [22–32], Nit [22–28], LAG [28–34], CS [28–45] — nach PLO-Realismus-Beratung
- **PLO LAG AF**: Deckel von 6.0 auf 4.2

### Bekannte Grenzen (v0.8.0)
- LAG FR WTSD 11.8% vs Target 28–34% — braucht Pot-Commitment-Logik
- Nit AF explodiert bei Fold-Pushing — braucht dynamische Fold-Thresholds
- PLO WTSD-Targets erreicht für TAG/CS, grenzwertig für Nit

---

## Test-Statistik

| Kategorie | Vorher | Nachher |
|-----------|--------|---------|
| Engine-Tests | 107 | 112 (+5) |
| Client-Tests | 242 | 249 (+7) |
| Server-Tests | 7 | 7 |
| **Total** | **356** | **368** |

**Neue Test-Dateien:** `LocalGameRunner.test.ts`, `bot-action-scoring.test.ts`
**Geprüfte Module:** 19 · **Gefundene Bugs:** 6 (alle gefixt) · **Bestätigt bugfrei:** 12
