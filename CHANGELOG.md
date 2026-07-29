# Changelog

Alle wichtigen veröffentlichten Änderungen an CPCdigital werden in dieser Datei dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), und das Projekt verwendet semantische Versionsnummern. Geplante Funktionen stehen ausschließlich in der [Roadmap](ROADMAP.md).

## [Unreleased]

## [0.7.6] — 2026-07-29

### Added

- **Replay-Archiv**: Die letzten 200 lokal gespeicherten Hände sind über die Tischoberfläche erreichbar.
- **Regressionstests**: Tests für PLO-Draws, Session-Statistiken, Replay-Sonderfälle, Mental Events, Pot-Limit-Aktionen und Debug-Exporte ergänzt.

### Changed

- **PLO-Persönlichkeiten**: Positionsabhängige Preflop-Bewertung sowie archetyp- und street-spezifische Score-Tabellen für TAG, Nit, LAG und Calling Station eingeführt.
- **PLO-Draw-Auswertung**: Outs werden über physische ungesehene Karten mit exakt zwei Hole Cards und drei Board Cards ermittelt; Wraps verwenden 8/13 Karten als Schwellen.
- **Opponent Reads**: Bots beobachten nun auch Aktionen anderer Bots und erfassen Aktionen nach dem eigenen Fold.
- **Rebuy-Determinismus**: Ersatz-Identity und Wartezeit verwenden den seedbaren Session-RNG.
- **Session-Replays**: Kein zusätzliches 50-Hand-Limit im Arbeitsspeicher; das persistente Archiv bleibt auf 200 Hände begrenzt.
- **PLO-Kalibrierung**: Deterministischer A/B-Lauf mit 10.000 Händen je Archetyp und Format dokumentiert; die physisch korrekte Draw-Auswertung bleibt trotz verschobener Zieltreffer unverändert.

### Fixed

- **PLO-Flush-Draws**: Ein Hole Card oder Runner-Runner-Möglichkeiten werden nicht mehr als direkter Flush Draw gemeldet; Nut- und Second-Nut-Draws berücksichtigen die tatsächlich verfügbaren Hole Cards.
- **PLO-Straight-Draws**: Omaha-Constraint, Wheel-Outs, bereits gemachte Straights und physische Out-Zählung korrigiert.
- **PLO-Zehnen**: `T` hatte in der Rangwert-Tabelle den Wert 0 und verfälschte Straight-Auswertungen.
- **Session-Statistiken**: VPIP/PFR/3-Bet werden einmal pro Spieler und Hand gezählt; 3-Bet-Gelegenheiten entstehen nur beim ersten Zug gegen genau einen Raise.
- **Replay/Export**: Dealer-Seat, Call-Beträge, Bet/Raise/All-in-Typen, laufende Stacks, Uncalled Bets sowie Split- und Side-Pot-Auszahlungen korrigiert.
- **Mental Events**: Foldende Bots werden anhand ihres eigenen Nettoverlusts statt des gesamten späteren Pots bewertet; Uncalled Bets werden abgezogen.
- **Pot-Limit-Tastaturaktion**: Das Pot-Maximum wird bei legalem Full Raise als `raise` statt als ungültiges `all-in` gesendet.
- **Archivnavigation**: Handnummern dürfen zwischen Sessions doppelt vorkommen, ohne dass die falsche Hand geöffnet wird.
- **Kartenreihenfolge**: `T` wird in Engine-Views korrekt zwischen Bube und Neun sortiert.
- **Session-Debugexport**: Omaha-Entscheidungen enthalten alle vier Hole Cards; kompakte Decision Snapshots sind ohne `any` typisiert.

## [0.7.5] — 2026-07-24

### Added

- **Hero-Bust-Handling**: `startHand()` versucht nach einem Bust alle 2 Sekunden erneut zu starten.
- **Setup-Formate**: Drei direkte Buttons für Heads-up, 6-max und Full Ring ersetzen den Bot-Slider.
- **Touch-Support**: Long-Press (600 ms) öffnet das Rebuy-Menü.

### Changed

- NLHE-Bedenkzeit von 1,8–4,5 s auf 1,2–3,0 s reduziert.
- Session-Stats per Toggle inline in die Kopfzeile verschoben; Bot-Daten bleiben hinter `Ctrl+D`.
- Karten, Action Buttons und Tischabstände für kleinere Displays skaliert.
- Short-Stack-Rebuy-Wahrscheinlichkeit erhöht, damit Bots nicht dauerhaft mit 0,5 BB weiterspielen.
- Formatname ersetzt die generische Spieleranzahl in der Kopfzeile.
- Setup-Label „Starting Chips“ in „Starting Amount“ geändert.

### Fixed

- **BB-Tracking**: Erste Hand wurde nicht gezählt (`heroPrevChips` startete als `null`), Rebuy verfälschte die Bilanz (wurde als Profit gezählt)
- **Runout-Spoiler**: Chips, `isSittingOut` und BB-Stats springen nicht mehr voreilig — warten auf `finishHandPresentation`
- **Replayer-Crash**: `step` out-of-bounds beim Hand-Wechsel (letzter Zug → vorherige Hand)
- **Hero-Rebuy**: `applyPendingRebuys` setzt jetzt `isSittingOut = false` — Hero blieb nach Rebuy auf "Sitting Out" hängen
- **Session-Log-Privacy**: "Dealt to"-Zeilen zeigen nur noch Hero-Karten, nicht Bot-Hole-Cards
- **Bot-Rebuy-Spoiler**: `savedState` wird jetzt VOR `processAutoRebuys` captured — rebuyter Stack nicht während Runout sichtbar
- **Omaha Split-Pot**: `findWinnerIndices` verglich nur Rank (1–9), ignorierte Kicker. Jetzt pokersolver-`Hand.winners()` für korrekten Vergleich
- **Actionbar-Overlap**: Bottom-Padding 130→260px, Table-Shell-Formel an neue Paddings angepasst (320→470)
- **Landscape-Phone**: Media Query `max-height: 450px` verhindert Scrollen, reduziert Paddings

## [0.7.4] — 2026-07-23

### Added

- **Session-Statistiken**: Live-VPIP/PFR/3-Bet für alle Spieler in einklappbarem Panel (📊)
- Session-Ergebnis in BB (grün/rot) und BB/100 in der Kopfleiste
- Session-Log-Export als PokerStars-Text (Download-Button im Stats-Panel)
- `session-stats.ts`: VPIP/PFR/3B-Tracking + BB/100-Berechnung + Session-Log-Generator
- `SessionStats.tsx`: einklappbare Komponente mit Spieler-Tabelle und Export

## [0.7.3] — 2026-07-23

### Changed

- **Personality-Tuning**: Aggression-Modifier `/4` → `/3.5` (LAG-Raise-Bonus +1.07),
  RiskTolerance-Call `/6` → `/8` (LAG-Call −0.75, Nit-Call +1.04)
- TAG PLO: VPIP 22.7% / PFR 15.3% / AF 2.89 / WTSD 34.1% — 6/6 in Range
- Nit PLO: WTSD 45→41% (Richtung stimmt, aber noch über Target)
- LAG PLO: AF 1.60→1.73 (Richtung stimmt, aber noch unter Target)
- CS PLO 6-max: VPIP 60.0% jetzt in Range (war 60.8%)

## [0.7.2] — 2026-07-23

### Changed

- **WTSD-Fix**: Postflop-Showdown-Rate durch variant-spezifische Category-Scores gesenkt
  - `CategoryScoreTable` in `bot-variant-evaluation.ts` definiert
  - `VariantEvaluation.categoryScores` → `DecisionContext.categoryScores` → `bot-action-scoring.ts`
  - NLHE: Scores identisch mit bisherigen `params.scoring.handStrength` (keine Regression)
  - PLO: `call.medium` 20→8, `call.weak` −5→−8, `call.marginal` 5→0 (WTSD 52%→36%)
  - TAG PLO 9-max: 6/6 Metriken im Soll, TAG PLO 6-max: 6/6

### Fixed

- **PLO Bot-Bedenkzeit**: 3–8s → 2–5.5s (Preflop war zu langsam)

## [0.7.1] — 2026-07-23

### Added

- **Omaha High**: vollständig spielbare Pot-Limit-Omaha-Variante
  - Variant-Selector im SetupScreen (No Limit Texas Hold'em / Pot Limit Omaha High)
  - Omaha-Hand-Evaluation: `evaluateOmahaHand` mit 60 2-aus-4+3-aus-5-Kombinationen
  - Engine-Support: 4 Hole Cards, Pot-Limit-Betting, `findWinnerIndices`-Dispatch
  - `omaha-hand-evaluation.ts`: Draw-Dichte (Flush-Draw, Wrap-Outs), Nut-Potential, Preflop-Assessment (Double-Suited, Connectedness)
- **Variant-spezifische Bot-Bedenkzeit**: NLHE 1.8–4.5s (max 12s), PLO 2–5.5s (max 20s)
- **Omaha-Kalibrierung**: 12 Archetyp-Formate, TAG FR VPIP 30.8% / PFR 14.8% / AF 2.89 / WTSD 33.4% (10k Hände)
- **Omaha-UI**: 4-Karten-Layout mit Overlap (−16px), CardBacks passen sich Variante an, Hole-Cards absteigend nach Rank sortiert (A→2)
- **Hand-History-Export**: variantenabhängiger Header ("Omaha Pot Limit" / "Hold'em No Limit")
- **PLO/NLHE-Badge** in der TableScreen-Kopfleiste
- `BettingStructure`-Typ in `betting.ts` ausgelagert, Variants in `variants/` pro Datei
- `formatVariantName()`-Helper, `holeCardCount`-Prop für PlayerSeat/Replay

### Changed

- **Type-System**: `[Card, Card]` → `Card[]` in 58 Stellen (shared, engine, client)
- **Aggression-Modifier**: `/5` → `/4` (LAG NLHE AF 1.45→1.91, TAG unverändert)
- **Bot-Bedenkzeit**: Min 900→1800ms, Max 1800→4500ms, Hard-Max 6000→12000ms (NLHE); PLO separat (s.o.)
- **Calling Station**: Persönlichkeits-Call-Boni bei dead air (kein Pair, keine Draws) auf 50% skaliert
- **Rebuy-Migration**: alte Identities ohne `rebuyPolicy` kriegen beim Laden eine archetyp-echte Policy (nicht mehr pauschal 40 BB)

### Fixed

- **Top Set (Rank 4) in Omaha**: war fälschlich "weak" → jetzt "good" (Lio checkte Top Set auf Q-high-Flop statt zu betten)
- **`detectFlushDanger`**: NLHE-Annahme "1 Hole Card = Flush-Redraw" → jetzt Omaha-aware (braucht 2 Karten derselben Farbe)
- **ActionButtons**: Pot-Limit-All-In-Bug — Button sendet nicht mehr `all-in` wenn `raise` legal ist
- **`weightedChoice`-Fallback**: `fold` nur noch wenn keine andere Aktion legal (vorher blind-fold bei allen negativen Scores)
- **Replay Pot-Anzeige**: Bet-Stacks akkumulierten zu viel (`totalBet` statt `amount`)
- **Export-Menü**: per Portal zu `document.body` gerendert (kein Verdecken durch Footer)
- **Debug-Mode im Replay**: `localStorage.replay-debug` für IPC-Fenster
- **Hand-History-Header**: "PokerStars" → "CPCdigital"

## [0.7.0] — 2026-07-22

### Added

- **Postflop-Kalibrierung**: 5 neue Metriken in `simulation.ts` (C-Bet%, Fold-to-CBet, AF, WTSD, W$SD)
- **C-Bet-Targets**: pro Archetyp und Format (TAG 35-55%, Nit 33-55%, LAG 42-70%, CS 25-45%)
- **PFA-Tracking**: Preflop-Aggressor wird erkannt und C-Bet-Chancen pro Position gezählt
- **`hand.strength`**: numerischer Handstärkewert 0-100 mit Draw-Quality-Bonus (bis +10)
- **Hybrid-Scoring**: Strength-Bonus (±5-10) zusätzlich zum Kategorie-System
- **Bluff-C-Bet-Bonus**: +15 für PFA mit Air auf trockenem Board
- **Session-Evaluator C-Bet-Patterns**: "PFA missed C-Bet", "Folded playable hand to C-Bet"

### Changed

- **C-Bet-Opportunity-Bonus**: von +12 auf +18 erhöht
- **Check-Basiswerte gesenkt**: air +20→+10, weak +20→+10, marginal +15→+8, medium +10→+5
- **Min-Reaktionszeit Bots**: 600ms → 900ms

### Fixed

- **"Free card for draw"-Bug**: Bonus galt fälschlich auch für PFA am Flop (widerspricht C-Bet-Logik)
- **PFA-Check-Penalty**: −30 für Air/Weak am Flop (nicht für Good+)
- **C-Bet% von 20% auf 47-60% angehoben** (TAG 6-max: 20% → 52%)
- **"You wins" → "You win"** in der Ergebnisanzeige

## [0.6.0] — 2026-07-22

### Added

- **Rebuy-System**: Auto-Rebuy bei Bust (pro Identity ausgewürfelt, Threshold 10–90 BB), Leave-on-Bust, Ersatz-Bots mit 2–6 Händen Pause
- **Setup-Toggle**: "Auto-Rebuy & Ersatz-Bots" in der Setup-Maske
- **Hand-Replay**: deterministisches Replay aus Decision Snapshots, Tisch-Ansicht mit Step-Forward/Back, Autoplay
- **Session-Navigation**: alle Hände der Session durchblätterbar (◀▶)
- **PokerStars-Style Hand-History**: Text-Export pro Hand und ganze Session
- **Pot-Filter**: Replay nach Minimum-Pot-Größe filtern (≥ X BB)
- **Session-übergreifende History**: localStorage, max 200 Hände
- **Bot-Entscheidungsgründe**: Scores und Beiträge als Export-Option (debug-only)
- **7-Stufen-Handbewertung**: premium > strong > good > medium > marginal > weak > air mit Board-Kontext
- **Board-Relativierung**: Top Pair ≠ Bottom Pair, Flush/Straight/Full House je nach Board-Gefahr abgestuft
- **Protection-Betting**: Board-Verschlechterungserkennung (Turn bringt drittes Herz → sizing +0.08, scoring +8)
- **Parameter-System**: `bot-params.ts` zentralisiert ~50 tuning-Knobs, Auto-Kalibrierer via Env-Vars
- **Auto-Kalibrierer**: Random-Search-Optimizer mit Loss-Funktion, progressive narrowing
- **Rebuy-Manager**: `bot-rebuy-manager.ts` aus `LocalGameRunner` extrahiert (907 → 241 Zeilen)
- **Session-Ordner**: `session/` für LocalGameRunner, Rebuy-Manager, Session-Evaluator, Hand-Replay

### Changed

- **ReadTyp**: Bots tracken Gegner-Bet-Sizing (Pot-Fraktion-EMA), Abweichungserkennung (>2× Overbet)
- **Raise-Sizing**: Short-Stack-Reduktion (effBb/50), Reraise-Faktor (×0.75), Non-Premium-Raises bei ≤20 BB bestraft
- **Preflop-Reraising**: keine Blind-Eskalation mit marginalen Händen mehr (−35 Penalty)
- **Scoring-Tuning**: call.weak −5, fold.weak +5 (7-Kategorien-System nachgezogen), float-flop-Habit +10→+7
- **Pot-Visualisierung**: Gewinnbetrag erscheint beim Gewinner, Pot springt auf 0
- **Debug-Mode**: BotDebugInspector, Cards-on, Entscheidungs-Export hinter Ctrl+D
- **Route aufräumen**: v0.6 → 19 Punkte (besser verteilt auf v0.5.2–v0.5.4 in Retrospektive)

### Fixed

- **Queue-Reihenfolge**: `reopenBettingAfterRaise` sortiert jetzt clockwise ab Raiser (war Sitz-Index)
- **Hand-History-Format**: Blinds korrekt (via Dealer-Position), Chips ohne /100-Division, Raise-Format "raises to X"
- **All-in-Crash**: Spiel friert nicht mehr wenn nur noch Hero übrig ist (forced replacement)
- **Rebuy-Crash**: fehlendes `rebuyPolicy`-Feld in alten Roster-Identities → Default-Policy-Fallback
- **Replay-Daten**: alle Hole-Cards gespeichert (nicht nur Showdown), Community-Cards kumulieren korrekt

## [0.5.1] — 2026-07-22 (unveröffentlicht, direkt in 0.6.0 aufgegangen)

## [0.4.0] — 2026-07-20

### Added

- Maniac als seltene extreme LAG-Ausprägung (20% der LAG-Identities, +15 auf Aggression/VPIP)
- 12 Habits mit archetyp-spezifischen Präferenzen und Consistency 55–90%
- persistenter lokaler Bot-Roster über localStorage mit wiederkehrenden Identities
- archetyp-spezifische Tilt-Reaktionen (LAG kippt schneller, Nit erholt sich zügiger)
- gewichtete Beobachtungsfähigkeit pro Archetyp (Nit merkt Folds, LAG sieht Aggression)
- Reads mit Stichprobengröße, Konfidenz und verzerrten Priors (Beta-Distribution)
- überhastete Reads: LAG/CS handeln ab 2 Samples, bei Tilt ab 1
- Roster auf 44 Identities erweitert (12 neue für 0.4, Ziel 100+ bis v1.0)
- Session-Debug-Export v2 mit inkrementeller Action-History und dedupliziertem Context
- Mixed-Table-Kalibrierung über alle Archetypen mit BB/100, W$SD und Aggression/Street
- Balance-Simulation mit 7 randomisierten Tischzusammensetzungen

### Changed

- `BotIdentity` um `maniac`-Flag und gefüllte `habitIds` erweitert
- `DecisionContext` um `botHabits` ergänzt, Habits fließen in Action-Scoring ein
- Mentale-Event-Multiplier pro Archetyp eingeführt (LAG 1.3×, CS 0.5×)
- Tilt-/Confidence-/Patience-Modifier pro Archetyp statt uniform
- Session-Bot-Auswahl von strikt balanced auf gewichtete Zufallsverteilung
- `scoreCheck`/`scoreCall`: Trap-Intent nur noch Pre-River oder out-of-Position
- River-Check mit starker Hand erhält −20 Malus in Position
- `slowplay-monsters`-Habit feuert nur noch bei `nuts`, nicht bei `strong`
- Debug-Export auf letzte 5 Hände begrenzt, Contributions zu Strings geflattet
- Versionierung in package.json, README und CHANGELOG auf 0.4.0

### Fixed

- TAG 3-bet Full Ring wieder im Kalibrierungsbereich (12.7% von 13.0%)
- Top-Pair auf River wird nicht mehr fälschlich als Slowplay klassifiziert

## [0.3.1] — 2026-07-19

### Added

- sichtbare Versionsnummer in der App
- Auswahl zwischen Dollar- und Eurodarstellung
- typische Blind-Presets mit automatischem 100-BB-Startstack
- einfacher Rechtsklick-Rebuy auf den konfigurierten Startstack zwischen Händen
- zeitversetztes Aufdecken von Flop, Turn und River bei All-in-Runouts
- zusätzliche Tests für Runout, Sessionverlauf und Betragsformatierung

### Changed

- Aktionsbutton wechselt nun passend zwischen Bet, Raise und All-in
- individuelle Bet- und Raisebeträge lassen sich per Enter bestätigen
- Geldbeträge vermeiden unnötige Dezimalstellen und berücksichtigen die gewählte Währung
- Setup und Tischdarstellung wurden für den Testbetrieb weiter verbessert
- Roadmap um Bot-Identitäten, Sessionanpassungen, Statistiken und spätere Table Rules erweitert

## [0.3.0] — 2026-07-19

### Added

- allgemeiner `BotContext` ohne versteckte Informationen
- Utility Scores und nachvollziehbare Einflussfaktoren für alle legalen Aktionen
- Wahrnehmungs- und Bewertungsungenauigkeit abhängig vom Bot-Skill
- getrennte Zustände für Personality, Mental State, Reads und Session Memory
- gewichtete Auswahl zwischen plausiblen Aktionen
- situationsabhängige Bot-Reaktionszeiten
- Debug Inspector für Kontext, Bewertungen und Entscheidungsgründe
- Variant Registry und getrennte NLHE-Handbewertung als Grundlage weiterer Pokervarianten
- umfangreiche Szenariotests für Botkontext, Pipeline, Skill, Timing und Entscheidungssensitivität

### Changed

- Botentscheidungen berücksichtigen Betgröße, Pot Odds, effektiven Stack und SPR
- bisherige TAG-Logik in eine allgemeine, erklärbare Decision Pipeline überführt
- zufällige Fehler durch nachvollziehbare Wahrnehmungs- und Bewertungsabweichungen ersetzt

## [0.2.1] — 2026-07-19

### Added

- komfortablere Betgrößensteuerung mit Presets, Schieberegler und manueller Eingabe
- zusätzliche Tests für Positionslogik und Betragsformatierung

### Changed

- Setup-Maske, Tischskalierung, Hole Cards und Community Cards für bessere Lesbarkeit überarbeitet
- Raise-Presets an vorausgegangene Raises angepasst
- Darstellung kleiner Blinds und nicht notwendiger Dezimalstellen korrigiert
- Action Panel und Tastaturbedienung stabilisiert

## [0.2.0] — 2026-07-18

### Added

- vollständig lokale Electron-Laufzeit ohne erforderlichen Server
- Engine-bestimmte Legal Actions und vollständiger Betting Context
- korrekte Min-Raise-, All-in-, Reopen-, Side-Pot- und Split-Pot-Logik
- strukturierte Action History als Events
- deterministische Hand-Replays und seedbarer Zufallszahlengenerator
- Decision Snapshots für jeden Spielerzug
- Trennung öffentlicher und privater Spielinformationen
- variantenneutrale Phasen- und Betting-Struktur
- umfassende Unit- und Integrationstests für zentrale Engine-Sonderfälle
- erste lokale NLHE-Bot-Pipeline und Testsimulationen

### Changed

- Projektfokus verbindlich auf Offline-First und Singleplayer bis v1.0 ausgerichtet
- Client in Setup, Tisch, Actions, Karten und lokale Spielsteuerung aufgeteilt

[Unreleased]: https://github.com/kaizo101/CPCdigital/compare/v0.7.6...HEAD
[0.7.6]: https://github.com/kaizo101/CPCdigital/compare/v0.7.5...v0.7.6
[0.7.5]: https://github.com/kaizo101/CPCdigital/compare/v0.7.4...v0.7.5
[0.7.4]: https://github.com/kaizo101/CPCdigital/compare/v0.7.3...v0.7.4
[0.7.3]: https://github.com/kaizo101/CPCdigital/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/kaizo101/CPCdigital/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/kaizo101/CPCdigital/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/kaizo101/CPCdigital/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kaizo101/CPCdigital/compare/v0.4.0...v0.6.0
[0.4.0]: https://github.com/kaizo101/CPCdigital/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/kaizo101/CPCdigital/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kaizo101/CPCdigital/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kaizo101/CPCdigital/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kaizo101/CPCdigital/releases/tag/v0.2.0
