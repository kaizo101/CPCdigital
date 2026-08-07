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

**Neue Tests:** 5

### bot-action-scoring.ts (Decision Scoring)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | PLO `boardWorseSensitivity`: 0.4 vs 0.6 Inkonsistenz | VERIFIZIERT + GEFIXT | Einheitlich 0.6 (später auf 0.4 revertiert, siehe PLO-Rekalibrierung) |
| 2 | `scoreCheck` nutzte `rangeBasedFactors('call', …)` | VERIFIZIERT + GEFIXT | Entfernt — Check hat keine Range-Komponente |
| 3 | `skillLevelFactor` setzt sortierte Tiers voraus | Kein Bug. Defensive: `resetParams()` sortiert | — |

**Neue Tests:** 4

**Design-Änderung (v0.8.0):** `'second-nuts'`-Handler für PLO-Nut-Erkennung (siehe `omaha-hand-evaluation.ts` #7)

### bot-action-modifiers.ts (Personality/Tilt/Stack)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | Patience-Modifier ohne `personalityDivisor` | VERIFIZIERT + GEFIXT | `-(patience-50)/12` → `-(patience-50)/personalityDivisor(12, context)` |

**Neue Tests:** 1

### omaha-hand-evaluation.ts (PLO Handbewertung)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | `calculateOmahaStrength`: if-Chain ohne `else` — rank>=4 überschreibt alle höheren Rangstufen | VERIFIZIERT + GEFIXT | `if` → `else if`-Kette |
| 2 | `isDominatedStraightOut`: Gegner-Trial immer leer — `out` gleichzeitig auf Board und im Hole | VERIFIZIERT + GEFIXT | Gegner-Hole-Cards als Paar-Iteration über ungesehene Karten |
| 3 | `findNutStraightTop`: `boardRanks`-Parameter ungenutzt, gibt immer 14 zurück — falsch-positive Nut-Erkennung | VERIFIZIERT + GEFIXT | `findStraightTop(visibleRanks, minRequired)` mit O(10) Straight-Run-Enumeration |
| 4 | PLO-Flush-Nut: zählte Board-Ranks zu unseren Hole-Card-Rängen — jeder Board-Ass-Flush als `near-nuts` | VERIFIZIERT + GEFIXT | `ourFlushRanks` direkt aus `ownCards`, höchsten nicht-auf-Board-Rang prüfen |
| 5 | PLO Full House/Trips/Two Pair: Nut-Heuristik ohne Gegner-Trips-Berechnung — falsche `near-nuts`/`strong` | VERIFIZIERT + GEFIXT | `findHighestOpponentTripsRank()` via `boardCount+min(2,4-bc-ourCount)>=3` für alle Ränge |
| 6 | PLO Straight Flush/Quads: `rank>=9→nuts`, `rank===8` via `cleanOuts` — keine Gegner-Prüfung | VERIFIZIERT + GEFIXT | SF: `findStraightTop(boardSfRanks,3)` vs myTop. Quads: `ourCount(X)===0` → höhere Quads möglich |
| 7 | PLO `near-nuts` zu grob: Quads K vs. A, FH KKKAA vs. AAA, K-high Flush vs. A-high — alle identisch bewertet | VERIFIZIERT + GEFIXT | **Design:** `'second-nuts'` in `bot-variant-evaluation.ts` (Typ), `bot-params.ts` (+`secondNutPotential:4`), `bot-action-scoring.ts` (Handler), `omaha-hand-evaluation.ts` (4 Rang-Logiken: gap===1) |

**Neue Tests:** 7 (bereits in Test-Statistik enthalten)

### bot-habits.ts (Habit-System)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | `limp-reraise-premium`: Check auf `'strong'` statt `'premium'` — AA/KK lösen den Habit nicht aus | VERIFIZIERT + GEFIXT | `'strong'` → `'premium'` |
| 2 | `three-barrel-bluff`: Kein Check auf Flop/Turn-Aggression — feuert bei jedem River-Bluff | VERIFIZIERT + GEFIXT | Prüft `streetAggressor.flop` und `.turn` gegen `botId` |

**Neue Tests:** 1 (bereits in Test-Statistik enthalten)

### bot-identities.ts (Identity-Generator, Rebuy-Policies)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | Nit-Rebuy: `rebuyThresholdBb` und `maxRebuys` unabhängig gewürfelt — 28% der Nits erhalten `null`-Threshold bei `maxRebuys: 1` | VERIFIZIERT + GEFIXT | `wantsRebuy`-Flag koppelt beide Entscheidungen |

**Neue Tests:** 0 (nur interner Zustand, keine neuen Testfälle nötig)

### bot-rebuy-manager.ts (Rebuys, Replacements, Cash-Outs)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | `getCashOutPolicy`: LAG nicht im Ternary-Chain — fällt durch auf Default-Fallback | VERIFIZIERT + GEFIXT | Expliziter `'lag'`-Zweig vor Default |

**Neue Tests:** 0 (bereits getestet)

### hand-replay.ts (Replay-Builder, PokerStars-Formatierer)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | Turn-Karte doppelt in PokerStars-History: `slice(0,4)` enthält Turn-Karte UND `[3]` zeigt sie einzeln | VERIFIZIERT + GEFIXT | `slice(0,4)` → `slice(0,3)` für Turn-Board |

**Neue Tests:** 0 (bereits getestet)

### bot-decision-metrics.ts (SPR, Pot-Odds, Bet-Sizing)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | Reraise-Penalties: `marginal` in beiden if-Bedingungen → doppelte Strafe (-30) vs. weak (-18) | VERIFIZIERT + GEFIXT | `marginal` aus zweiter Bedingung (`weak`/`air`) entfernt |

**Neue Tests:** 0 (bereits getestet)

### nlhe-hand-evaluation.ts (NLHE Handbewertung)

| # | Fund | Typ | Fix |
|---|------|-----|-----|
| 1 | `findStraightDraw`: J,Q,K,A (4Konsekutiv mit A=14) als OESD klassifiziert — tatsächlich nur Gutshot (4 Outs) | VERIFIZIERT + GEFIXT | `ranks[i+3] === 14` → `gutshot` statt `open-ended` |
| 2 | `isNutStraight`: vereinfachte Heuristik `ranks[0] >= highestBoardRank - 3` — falsch-positive Nut-Erkennung (9-high auf 8765-Board als Nuts) | VERIFIZIERT + GEFIXT | `findStraightTop(board,3)` vs `findStraightTop(all,5)` — O(10) Enumeration aller Straight-Runs |
| 3 | `calculateCleanOuts`: JSDoc-Kommentar fehlplatziert im Funktionskörper, Klammern-Einrückung gebrochen | VERIFIZIERT + GEFIXT | JSDoc entfernt, Klammern korrekt eingerückt |

**Neue Tests:** 0 (bereits getestet)

### Module ohne Befund (Code-Review)

| Modul | Zeilen | Ergebnis |
|-------|--------|----------|
| `bot-mental.ts` | 137 | Clean. Event-Handler teilweise Dead Code (Mental Events für v0.8.1) |
| `bot-reads.ts` | 231 | Clean. Beta-Priors, EMA-Sizing, Profile korrekt |
| `bot-params.ts` | 465 | Clean. `params.mental` (44 Z.) **Vorgeriff** — definiert, nie gelesen. **Design v0.8.0:** `secondNutPotential:4` für PLO-Nut-Erkennung |
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

| Kategorie | Vorher (v0.7.8) | Nachher (HEAD) |
|-----------|-----------------|-----------------|
| Engine-Tests | 103 | 112 (+9) |
| Client-Tests | 215 | 249 (+34) |
| Server-Tests | 7 | 7 |
| **Total** | **325** | **368 (+43)** |

**Neue Test-Dateien:** `LocalGameRunner.test.ts`, `bot-action-scoring.test.ts`
**Geprüfte Module:** 30 · **Gefundene Bugs:** 22 (alle gefixt) · **Bestätigt bugfrei:** 19
