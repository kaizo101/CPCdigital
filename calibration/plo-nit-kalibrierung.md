# PLO-Kalibrierung — Arbeitsstand (Phase 1–5)

Stand: 31.07.2026
Standort: Branch `plo-nit-kalibrierung-wip` (Code-Freeze + Doku-Erkenntnisse;
`master` bleibt bis zur vollen Verifikation unberührt). Änderungen in:
`bot-category-scores.ts`, `bot-category-scores.test.ts`, `bot-tag.ts`,
`omaha-hand-evaluation.ts`, `simulation.ts` (env-gated `CALIB_TRACE`, wird behalten).

## 1. Ziel

Alle PLO-Archetypen (Nit, TAG, LAG, Calling Station) in allen Formaten in die
Simulations-Targets bringen.

Targets (`PLO_*_FORMATS`, `simulation.ts`):

| Archetyp | Metrik-Range (FR / 6m) |
|---|---|
| Nit | VPIP 14–22 / 18–28 · PFR 8–14 / 10–17 · 3-bet 3–7 / 4–9 · AF 1.5–3.5 · WTSD 25–36 |
| TAG | VPIP 22–32 / 28–38 · PFR 12–20 / 15–24 · 3-bet 5–11 / 7–13 · AF 1.5–3.5 · WTSD 28–38 |
| LAG | VPIP 29–40 / 35–48 · PFR 18–28 / 22–32 · 3-bet 8–16 / 9–18 · AF 2.5–6 · WTSD 26–37 |
| CS | VPIP 32–48 / 42–60 · PFR 5–14 / 7–17 · 3-bet 1–7 / 2–8 · AF 0.5–2 · WTSD 35–48 |
| alle | C-Bet FR 20–40 (CS) bzw. archetypenspezifisch (30–50 / 35–55 / 40–60) |

Phasenplan: 1) Nit Postflop → 2) Nit Preflop/6m → 3) TAG → 4) LAG → 5) C-Bet →
6) 10k-Bestätigung. HU ist durch die `tableSize ≤ 6`-Nebenwirkung mit betroffen,
aber außerhalb des Ziels.

## 2. Code-Änderungen

### `packages/client/src/bot-category-scores.ts`

- `getPloScores(archetypeId, street: PloStreet, tableSize = 9)`: bei
  `tableSize ≤ 6` und `street ≠ 'preflop'` greifen die Six-Max-Overrides
  (`PLO_ARCHETYPE_POSTFLOP_SIX_MAX` / `PLO_ARCHETYPE_TURN_RIVER_SIX_MAX`),
  sonst die Full-Ring-Tabelle. HU (playerCount 2) erbt die Six-Max-Tabellen.
- `plo(overrides, base = PLO_TAG_SCORES)`: optionales `base`-Argument für
  Six-Max-Overrides über der Archetyp-Tabelle.
- `getPloPreflopAction(archetypeId, situation, category, tableSize = 9)`:
  Six-Max-Override merged jetzt **per Situation** über die Full-Ring-Tabelle
  (`sixMax?.[situation] ?? table?.[situation]`), vorher ersetzte die komplette
  Six-Max-Tabelle die FR-Tabelle (`??`). Bug entdeckt beim CS-6m-Eintrag
  (nur `facing-open` → unopened/facing-3bet fielen auf `fold` → VPIP 12 %).
- `PLO_ARCHETYPE_POSTFLOP.tag`: `plo({ call: { marginal: 4, medium: 10, good: -2 } })`
- `PLO_ARCHETYPE_TURN_RIVER.tag`: `plo({ call: { medium: 6, good: 0 } })`
- `PLO_ARCHETYPE_TURN_RIVER.lag`:
  `plo({ call: { marginal: -10, medium: -3 }, raise: { medium: 24, good: 34 } })`
- `PLO_ARCHETYPE_TURN_RIVER_SIX_MAX.lag`:
  `plo({ fold: { marginal: -12, medium: -28 }, call: { marginal: -8, medium: -6 } },
  PLO_ARCHETYPE_TURN_RIVER.lag)`
- CS (Flop-Postflop) hat jetzt **eigene** Raise-Werte (medium/marginal gekürzt);
  CS-Turn/River ist eine eigene explizite Tabelle (vorher Verweis auf die
  Flop-Tabelle), damit Flop-Raises (C-Bet) und T/R-Raises (WTSD-Schutz) getrennt
  tunebar sind.
- CS Six-Max: Preflop `facing-open strong→raise` (3-bet-Boost), Flop
  `call { weak -6, marginal -12, medium 2, good 2 }` (AF-Nenner), T/R
  `fold { weak 20, marginal 22, medium 24 }` + `call { weak -14, medium -6, good -8, strong -14, premium -16 }`
  („call cheap flop, fold expensive turn/river“).
- `PLO_PREFLOP_STRATEGY_SIX_MAX.nit` um `unopened marginal/medium: fold` ergänzt.

### `packages/client/src/omaha-hand-evaluation.ts`

- Postflop-Call-Site übergibt `position.tableSize` an `getPloScores`;
  Street-Ableitung `'flop'`/`'turn-river'`.

### `packages/client/src/bot-tag.ts`

- Call-Site von `getPloPreflopAction` übergibt `botContext.position.tableSize`.

### `packages/client/src/simulation.ts` (Diagnostik, env-gated)

- `decisionTrace` in Stats; bei `CALIB_TRACE=1` zeilenbasierter Trace je Street
  × Hand-Kategorie × Aktion + Trace-Ausgabe in `printStats`.
- **Entscheidung:** `CALIB_TRACE` bleibt (env-gated, ~22 Zeilen) — primärer
  Tuning-Hebel der Phasen 3–5; optionaler Lazy-Init (`??=`) als Cleanup möglich.

### `packages/client/src/bot-category-scores.test.ts`

- 29 Tests (davon 6 für Six-Max-Verhalten, 1 für den Preflop-Merge-Fix).

## 3. Messergebnisse (3k-Läufe, deterministisch)

| Archetyp | Format | VPIP | PFR | 3-bet | AF | WTSD | C-Bet |
|---|---|---|---|---|---|---|---|
| Nit | FR | 24.92 ✗ | 13.06 ✓ | 3.12 ✓ | 3.14 ✓ | 34.1 ✓ | 43.3 ✓ |
| Nit | 6m | 27.45 ✓ | 18.63 ✗ | 3.56 ✗ | 3.76 ✗ | 34.4 ✓ | 43.6 ✓ |
| Nit | HU (o.S.) | 43.05 ✓ | 29.77 ✓ | 2.29 ✗ | 4.34 ✓ | 36.0 ✓ | 47.0 ✓ |
| TAG | FR | 32.55 ✗(0.6) | 16.22 ✓ | 8.58 ✓ | 2.52 ✓ | 36.1 ✓ | 43.2 ✓ |
| TAG | 6m | 37.82 ✓ | 21.49 ✓ | 8.69 ✓ | 3.19 ✓ | 33.0 ✓ | 47.7 ✓ |
| LAG | FR | 36.41 ✓ | 18.84 ✓ | 13.25 ✓ | 2.73 ✓ | 27.3 ✓ | 49.9 ✓ |
| LAG | 6m | 44.96 ✓ | 24.83 ✓ | 14.78 ✓ | 2.76 ✓ | 29.9 ✓ | 53.7 ✓ |
| CS | FR | 45.53 ✓ | 5.91 ✓ | 1.16 ✓ | 1.18 ✓ | 43.1 ✓ | **40.0 ✓** |
| CS | 6m | 46.37 ✓ | 9.78 ✓ | 2.47 ✓ | **2.07 ✗(0.1)** | 47.8 ✓ | 37.8 ✓ |

0 Invalid-action-Fallbacks in allen Läufen.

## 4. Methodische Erkenntnisse (kumulativ)

1. **AF-Formel verifiziert** (`simulation.ts`): `AF = (raise + all-in) / call`
   postflop — Checks zählen NICHT in den Nenner.
2. **WTSD-Treiber**: River-Checkdowns von weak/marginal; Good/Medium-Raises
   beenden Pots und senken WTSD. Raises sind für showdown-lastige Archetypen
   (CS) der WTSD-Schutz.
3. **„Tote Turn-Bets“**: Mehr Flop-Calls von marginal → mehr ungecallte Turn-Bets
   der Gegner → AF-neutral bis leicht steigend.
4. **Determinismus**: Identische Konfiguration → identische Ergebnisse (seeded RNG).
   ABER: Rauschen zwischen Konfigurationen ist klein; CS-6m-AF pendelte bei fast
   gleicher Config zwischen 2.06 und 2.31.
5. **Limp-Kaskade**: `unopened good→call` explodiert im All-Nit-Sim (VPIP 27→39).
   Deshalb: unopened good = raise.
6. **Strategie-Hints sind schwach** (±10–15 vs. Kategorie-Scores ±30–50):
   `marginal: 'fold'` ergab byte-identischen Lauf. Hints sind kein Hebel.
7. **AF-Lever**: Raise-Kürzungen schaden AF bei eigenbetenden Archetypen
   (endogene Call-Gelegenheiten) und treiben WTSD hoch (Pots enden nicht mehr).
   Zuverlässiger Hebel ist der Call-Nenner: „call cheap flop, fold expensive
   turn/river“ (TAG/CS) bzw. Flop-Call-Erhöhung (TAG).
8. **C-Bet-Lever**: C-Bet = Flop-Bet als PFA. Für CS (PFA selten, mit
   good/strong) sind das die Flop-`good/strong`-Raise-Scores; `medium/marginal`-
   Kürzungen griffen nicht. Flop-Raise-Kürzungen migrieren Aggression nur auf
   Turn (C-Bet-Metrik sinkt trotzdem, da nur Flop zählt) → WTSD-Kosten.
9. **WTSD-Decke (CS 6m)**: AF ≤ 2.0 UND WTSD ≤ 48 sind gleichzeitig nicht
   robust erreichbar — jeder AF-Hebel treibt WTSD gegen die Decke. Residuum
   akzeptiert (AF 2.07, im Rauschen).

## 5. Tuning-Verlauf (Auswahl)

- **TAG**: TR-Raise-Cuts verworfen (FR-WTSD 39.0, 6m-AF 4.64). Final:
  Flop-`call {marginal 4, medium 10, good -2}` + TR-`call {medium 6, good 0}`.
  FR 2.52/36.1, 6m 3.19/33.0.
- **LAG**: ohne tableSize-Split widersprüchlich (FR-AF zu tight vs. 6m-WTSD zu
  tight). Final: TR-FR `call {marg -10, medium -3}, raise {medium 24, good 34}`,
  TR-6m `fold {marg -12, medium -28}, call {marg -8, medium -6}` (Overrides über
  FR). FR 2.73/27.3, 6m 2.76/29.9.
- **CS (Phase 5 C-Bet)**: Erst globaler Raise-Cut (alle Streets) → WTSD 48/51
  (Raises sind Pot-Ender!). Dann T/R-Tabelle gesplittet (Originalwerte) + Flop-
  good/strong-Cut → C-Bet 40.0 bei WTSD 43.1/47.8. 6m-AF-Annäherung über
  Flop-Calls + T/R-Folds; 6m-3-bet über `facing-open strong→raise` (dabei
  Merge-Bug gefunden und behoben, §2). T/R-Raise-Cut und Flop-good-Raise-Cut
  als AF-Lever verworfen (WTSD +4.6 bzw. Aggressions-Migration).

## 6. Verifikation

- 29 Tests grün (`bot-category-scores`, `omaha-hand-evaluation`).
- `tsc`: nur vorbestehender Fehler `bot-line-planning.test.ts` (per `git stash`
  als vorbestehend verifiziert).

## 7. Offene Punkte

- **CS 6m AF 2.07** (Ziel ≤ 2.0): Residuum, im Rauschen; WTSD-Decke (47.8/48)
  blockiert weitere AF-Hebel.
- **Nit FR VPIP 24.92** (Ziel ≤ 22) — FR-Preflop nicht angefasst (phase 2.5+).
- **Nit 6m PFR 18.63 / 3-bet 3.56 / AF 3.76** — strukturell blockiert (Kaskade,
  schwache Hints).
- **TAG FR VPIP 32.55** (Ziel ≤ 32) — vorbestehend, Rauschen.
- 10k-Bestätigungslauf (Phase 6) ausstehend.
- **NLHE-C-Bet-Metrik** (Befund 31.07.): committeter Refactor `5ad1ec2`
  (`calibration-metrics.ts`) hat die C-Bet-Zählung geändert (`pfa` = letzter
  Aggressor statt Original-Raiser; Opportunity nur bei `currentBet === 0`).
  NLHE-Verhalten unverändert (VPIP/PFR/AF reproduziert bei 10k), aber C-Bet%
  systematisch höher → 6/12 NLHE-C-Bet-Werte außerhalb der alten Targets.
  **Details + offene Entscheidung (A/B/C): `calibration/v0.7.8.md`.**
- 5 Dateien uncommitted (→ Branch `plo-nit-kalibrierung-wip`, master bleibt
  unberührt); `pictures/` unversioniert (nicht von dieser Arbeit).

## 8. Optionen für die restlichen 6m-Lücken

- **A)** Six-Max-Preflop-Kategorie-Scores (`tableSize` bis `getPloScores`
  durchreichen) — echter Hebel für PFR; „call unopened“ bleibt durch die Kaskade tabu.
- **B)** Neue Situation `facing-limp` in `getPreflopSituation` + Tabellen-Einträge —
  konzeptionell korrekt, berührt aber NLHE (geteilte Funktion) und alle Archetypen.
- **C)** Residuen akzeptieren und mit Phase 6 (10k) abschließen (Empfehlung).
