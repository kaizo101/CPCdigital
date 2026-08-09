# CPCdigital — Roadmap

**Offline Poker App · Electron Desktop · Single-Player gegen glaubwürdige Bots · später Lern- und Trainingsplattform für Pokervarianten**

---

## Vision

CPCdigital soll ein zugänglicher Ort sein, an dem Spieler bekannte und seltene Pokervarianten ohne Echtgeld, Wartezeiten oder chaotische öffentliche Tische ausprobieren können.

Der erste Schwerpunkt liegt auf einem stabilen, unterhaltsamen Singleplayer-Pokerspiel mit glaubwürdigen Bots. Ab Version 1.0 wird darauf eine Lernschicht aufgebaut: Wiki, Tutorials, Session-Analysen und Poker-Rätsel anhand konkreter Hände.

## Kernprinzipien

- **Offline First** — kein Server und kein Internet notwendig
- **Glaubwürdige Bots** — Persönlichkeiten, Reads, Gewohnheiten und mentale Zustände
- **Fair Play** — Bots sehen nur Informationen, die auch ein realer Spieler kennen könnte
- **Variantenfähige Architektur** — Community-Card-, Draw- und später Stud-Spiele
- **Erklärbare Entscheidungen** — Bot-Aktionen und Spielerentscheidungen sollen später analysierbar sein
- **Learning-ready, nicht Learning-first** — Lernoberflächen kommen später, die notwendigen Daten werden von Anfang an erfasst
- **Casual statt Solver** — Spielspaß und menschlich wirkende Gegner sind wichtiger als GTO-Perfektion
- **Open Source & faire Weiterverwendung** — transparente Forks und
  AGPL-konforme kommerzielle Nutzung bleiben erlaubt; unattribuierte,
  verschleierte oder proprietär vereinnahmte Kopien sollen nachvollziehbar
  erkennbar sein

## Wiederkehrendes Kalibrierungs- und Verhaltens-Gate

Nach Änderungen an Ranges, Action-Scores, Persönlichkeitsfaktoren oder
Kalibrierungsmetriken gehören künftig vier Prüfstufen zum jeweiligen Release:

1. gezielte Szenario- und Regressionstests für die geänderte Logik
2. deterministische Entwicklungsläufe und dokumentierte 10k-Release-Läufe
   für die betroffenen Varianten, Archetypen und Tischformate
3. eine interaktive Probe-Session von mindestens 100–150 Händen in der
   Web-Version, damit wiederkehrende Linien, Stack-Risiko und die subjektive
   Erkennbarkeit der Archetypen geprüft werden
4. Triage auffälliger Hände gegen Decision Scores beziehungsweise einen
   Session-Debug-Export; strukturelle Fehler werden nicht durch breitere
   Zielkorridore kaschiert

---

# Phase 1 — Spielbares Fundament

## ✅ 0.1.0 — Offline-Fundament

**Ziel:** Eine vollständig lokal laufende Poker-App als technische Basis.

- [x] Electron-App mit eigenem Fenster
- [x] NLHE gegen Dummy-Bots
- [x] Setup-Screen für Blinds, Chips und Bot-Anzahl
- [x] Pokertisch-UI mit Action-Buttons
- [x] automatischer Start der nächsten Hand
- [x] grundlegendes Komponenten-Refactoring

---

## ✅ 0.2.0 — Engine-Härtung und Observability

**Ziel:** Die Engine wird zur stabilen Grundlage für Bots, Replays, Analysen und weitere Varianten.

- [x] Legal Actions vollständig durch die Engine bestimmen
- [x] vollständigen Betting Context bereitstellen: Pot inklusive aktueller Street-Bets, To Call, Betgröße relativ zum Pot, Min Raise und Max Raise
- [x] eigenen und effektiven Stack sowie SPR für jede Entscheidung korrekt bestimmen
- [x] Pot-Odds-Berechnung und Betting Context mit gezielten Szenariotests absichern
- [x] korrekte Min-Raise-, All-in- und Reopen-Logik
- [x] Side Pots und Split Pots umfassend testen
- [x] vollständige Action History als Events speichern
- [x] deterministische Hand-Replays ermöglichen
- [x] seedbaren RNG für Tests und reproduzierbare Sessions einführen
- [x] Decision Snapshots für jeden Spielerzug speichern
- [x] öffentliche und private Informationen sauber trennen
- [x] variantenneutrale Phasen- und Betting-Struktur definieren
- [x] Unit- und Integrationstests für zentrale Betting-Sonderfälle

### Decision Snapshot

Jede Entscheidung sollte mindestens festhalten:

- sichtbarer Spielzustand
- eigene Karten
- legale Aktionen
- Pot, To Call, Min Raise und Max Raise
- Position und effektiver Stack
- bisherige Action History
- gewählte Aktion
- später optional: Handbewertung, Reads und Action Scores

Diese Daten dienen zunächst dem Debugging und Replay. Später bilden sie die Grundlage für Session-Analysen und persönliche Rätsel.

---

# Phase 2 — Glaubwürdige Bots

## 🎯 0.3.0 — Allgemeine Bot-Architektur

**Ziel:** Bots entscheiden über ein gemeinsames, erklärbares Utility-System.

- [x] allgemeines `BotContext` ohne versteckte Informationen
- [x] Betgröße, Pot Odds, effektiven Stack und SPR in die Bewertung der Aktionen einbeziehen
- [x] Stack- und Sizing-Sensitivität mit vergleichbaren Entscheidungsszenarien testen
- [x] Trennung von Variantenevaluation und Decision Engine
- [x] Bewertung aller legalen Aktionen über Utility Scores
- [x] Gründe und Einflussfaktoren zu jedem Action Score erfassen
- [x] Skill als Wahrnehmungs- und Bewertungsungenauigkeit modellieren
- [x] Personality, Mental State, Reads und Memory trennen
- [x] gewichtete Auswahl zwischen plausiblen Aktionen
- [x] globale Zufallsfehler durch nachvollziehbare Fehlbewertungen ersetzen
- [x] künstliche Reaktionszeit von tatsächlicher Rechenzeit trennen und situationsabhängig modellieren
- [x] Debug Inspector für Kontext, Scores und Entscheidungsgründe

### Bot-Architektur

```text
PokerPlayer
 ├── Personality       konstant, mit Session-Varianz
 ├── Skill             konstant, bestimmt Bewertungsqualität
 ├── MentalState       dynamisch: Tilt, Confidence, Patience, Momentum
 ├── Reads             subjektive Einschätzungen mit Unsicherheit
 ├── SessionMemory     beobachtete Hände und relevante Ereignisse
 └── DecisionEngine    allgemeine Utility-basierte Aktionswahl
```

---

## 🎯 0.4.0 — Erste Bot-Persönlichkeiten

**Ziel:** Mehrere klar unterscheidbare, aber nicht starre Gegner.

- [x] TAG als Referenzbot über seedbare Full-Ring-, 6-max- und Heads-up-Kalibrierungen stabilisieren
- [x] Nit
- [x] Calling Station
- [x] LAG
- [x] Maniac als seltene extreme LAG-Ausprägung statt eigenständiger Grundstrategie
- [x] Skill und Persönlichkeit frei kombinierbar machen
- [x] Session-Varianz innerhalb eines Archetyps
- [x] Archetypen pro Session seedbar mischen und vor Wiederholungen gleichmäßig verteilen
- [x] `BotIdentity` mit Name, `avatarKey` und stabilen Grundtendenzen getrennt von Archetyp und Skill modellieren
- [x] versionierten deterministischen Identity-Generator mit einer ersten 32-Bot-Testpopulation aufbauen
- [x] Infrastructure für Generation, Persistenz und Session-Auswahl (Roster-Grundlage seit v0.4 stabil)
- [x] persistenten lokalen Bot-Roster mit über mehrere Sessions wiederkehrenden Identitäten aufbauen

> **Roster-Erweiterung (44→ca. 64):** Läuft inkrementell und qualitätsgetrieben.
> Neue Identitäten werden ergänzt, wenn Session-Wiederholungen oder fehlende
> Charakterprofile einen konkreten Bedarf zeigen; es gibt keine Quote pro Release.
> Ziel sind später ungefähr 24–30 geeignete, überlappende Identitäten je
> Stake-Band statt vollständig getrennter Pools.
- [x] Identitäts-Seed, Session-Varianz und Hand-/Decision-RNG getrennt und reproduzierbar verwenden
- [x] wiedererkennbare Gewohnheiten ermöglichen, ohne Entscheidungen vollständig vorhersehbar zu machen
- [x] Archetyp und Skill nicht durch Namen oder offen sichtbare Kategorien verraten
- [x] individuelle Tilt-Reaktionen
- [x] unterschiedliche Beobachtungsfähigkeit
- [x] Reads mit Stichprobengröße und Konfidenz
- [x] falsche und überhastete Reads ermöglichen
- [x] Bot-Gewohnheiten statt nur VPIP-/Aggressionsregler
- [x] Balancing über längere Test-Sessions

### Zielbild

Zwei TAG-Bots sollen dieselbe Grundstrategie besitzen, sich aber dennoch unterscheiden können:

- vorsichtiger Beobachter
- überheblicher Schnellurteiler
- emotional stabiler Grinder
- solider Spieler mit Angst vor großen Pots

---

# Phase 3 — Variantenfähiges Kernspiel

## ✅ 0.5.0 — NLHE vollständig spielbar

**Ziel:** Die erste Variante dient als Referenz für Community-Card-Poker und No Limit.

- [x] positionsabhängige Preflop-Situationen
- [x] Hand- und Board-Assessment
- [x] relative Handstärke statt nur Handkategorie
- [x] Draws, Outs, Blocker und Verwundbarkeit
- [x] Postflop-Initiative und Action History
- [x] Range-Schätzungen in vereinfachter Form
- [x] No-Limit-Bet-Sizing (inkl. skill-basierter Sizing-Fehler)
- [x] Multiway-Entscheidungen
- [x] glaubwürdige Bot-Lines über mehrere Streets (Line-Commitment-System)
- [x] umfassende Tests und Bot-Test-Sessions

---

## ✅ 0.5.1 — Bugfixes und Balancing

- [x] Queue-Reihenfolge nach All-In/Reraise gefixt (clockwise ab Raiser)
- [x] ReadTyp: Gegner-Bet-Sizing-Tracking (Pot-Fraktion-EMA)
- [x] Reraise-Disziplin postflop (Medium -12, Weak/Air -18, großer Bet -10)
- [x] Raise-Sizing: Short-Stack-Reduktion, Reraise-Faktor 0.75
- [x] Non-Premium-Raises bei ≤20 BB bestraft (-10)
- [x] Parameter-System: `bot-params.ts` zentralisiert ~50 tuning-Knobs
- [x] Auto-Kalibrierer: Random-Search-Optimizer mit Loss-Funktion
- [x] Board-Dangers, Flush-Danger, Reraise-Erkennung, Stack-Management

---

## 🎯 0.6.0 — Rebuys, Hand History & Replay

**Ziel:** Bot-Rebuys mit Persönlichkeit, reproduzierbare Hand-Replays für Debugging und Analyse.

- [x] Rebuy-Policy pro Identity ausgewürfelt, nicht Archetyp-Fest (Threshold 10–90 BB)
- [x] Auto-Rebuy nach Hand-Ende wenn Chips unter Threshold
- [x] Leave-on-Bust: Nits (~60%) verlassen Tisch, LAGs nie
- [x] Ersatz-Bot nach zufällig 2–6 Händen Pause (frische Identity aus Roster)
- [x] Sofort-Ersatz wenn Tisch sonst stirbt (nur noch 1 Spieler)
- [x] Setup-Toggle "Auto-Rebuy & Ersatz-Bots"
- [x] `syncChips` synchronisiert isSittingOut
- [x] deterministisches Hand-Replay aus Decision-Snapshots + Engine-Seed
- [x] Replay-UI: Step-Forward, Step-Backward, Tisch-Ansicht, Text-History
- [x] PokerStars-Style Hand-History-Export pro Hand
- [x] Autoplay-Funktion im Replayer
- [x] Session-Navigation: alle Hände der Session durchblätterbar (◀▶)
- [x] Hand-Kategorien: 7 Stufen (premium > strong > good > medium > marginal > weak > air) mit Board-Kontext
- [x] Preflop-Reraising-Disziplin (kein Blind-Eskalieren mit marginalen Händen)
- [x] Pot-zu-Gewinner-Visualisierung (Pot springt auf 0, Chips beim Gewinner)
- [x] separates Replay-Fenster (Electron: BrowserWindow via IPC + localStorage, Browser: Overlay-Fallback)
- [x] "Letzte Hand wiederholen"-Button (↻ in der Kopfleiste)
- [x] Session-übergreifende Hand-History (localStorage, max 200 Hände)
- [x] Hand-Filter nach Pot-Größe (≥ X BB)
- [x] Bot-Entscheidungsgründe im Replay (Scores, Beiträge, Hand-Kategorie)
- [x] `LocalGameRunner` splitten (Rebuy-Manager in `bot-rebuy-manager.ts` ausgelagert)
- [x] Session-Ordner (`session/`) eingeführt

> **Retrospektive** — v0.6.0 hat 19 Features in einem Release gebündelt. Besser wären 3 Minor-Releases gewesen:
> `v0.5.2` Rebuys · `v0.5.3` Replay · `v0.5.4` 7-Kategorien. Ab v0.7 wird jedes Release auf **ein Thema** fokussiert.

---

## 🎯 0.7.0 — Postflop-Kalibrierung & C-Bet-Fix

**Ziel:** Postflop-Verhalten messbar machen und C-Bet-Rate von 20% auf 47-60% anheben.

### Numerischer Hand-Score (Hybrid)

- [x] `hand.strength` als numerischer Wert 0-100 mit Draw-Bonus (bis +10)
- [x] Hybrid-Scoring: Kategorie-Basis + Strength-Bonus (kleiner ±5-10 Zusatz) — final, kein Voll-Ersatz geplant

### Postflop-Kalibrierung

- [x] **C-Bet %**: PFA wettet Flop / C-Bet-Chancen (pro Position)
- [x] **Fold-to-CBet %**: Fold auf C-Bet / C-Bet gesehen
- [x] **AF (Aggression Factor)**: (Bet+Raise)/Call postflop
- [x] **WTSD %**: Hands to showdown / hands seen flop
- [x] **W$SD %**: Won at showdown / went to showdown
- [x] Targets pro Archetyp definiert (TAG/Nit/LAG/CS, C-Bet + AF)
- [x] Game-Loop um PFA-Tracking und Postflop-Zählung erweitert
- [x] `printStats` gibt Postflop-Metriken aus
- [x] Kalibrierungsfehler zählen Postflop-Metriken mit
- [x] **Long-Run**: 50k Hände pro Format validiert (alle 48 Metriken im Soll)

### C-Bet-Analyse & Bugfix

- [x] **"Free card for draw"-Bug**: Bonus galt fälschlich auch für PFA am Flop → entfernt
- [x] **Bluff-C-Bet-Bonus**: +15 für PFA mit Air auf trockenem Board
- [x] **C-Bet-Opportunity**: +12 → +18
- [x] **PFA-Check-Penalty**: −30 für Air-Air/Weak (nicht für Good+)
- [x] Session-Evaluator um C-Bet-Patterns erweitert (PFA missed C-Bet, Fold-to-CBet with playable hand)

### Ergebnis

| Metrik | Vor Fix | Nach Fix |
|--------|---------|----------|
| TAG C-Bet% | 20% | 47-60% |
| AF (alle) | im Soll | im Soll (teils verbessert) |
| Fold-to-CBet | 71-93% | unverändert → eigener Fix für v0.8 |

48 Metriken im Soll (36 Preflop + 12 Postflop). 228 Tests grün.

---

## ✅ 0.7.1 — Omaha High

**Ziel:** Pot-Limit und variantenspezifische Hand-Eval testen.

- [x] Omaha-Hand-Evaluation (exakt 2 Hole + 3 Board) — `evaluateOmahaHand` mit 60 Kombinationen
- [x] Pot-Limit-Berechnung (Max-Raise = Pot + 2×Call, bereits in Engine)
- [x] Omaha-spezifischer Variant Context — `omaha-hand-evaluation.ts` als `VariantEvaluator`
- [x] Bot-Strategie: Draw-Dichte (Flush-Draw, Wrap-Outs), Nut-Potential, Vulnerability, Preflop-Assessment (Double-Suited, Connectedness, High-Card-Points)
- [x] NLHE- und Omaha-Logik ohne Duplizierung — gemeinsames `VariantEvaluator`-Interface, getrennte Implementierungen
- [x] Variant-Selector im SetupScreen (Texas ↔ Omaha)
- [x] Type-System: `[Card, Card]` → `Card[]` in 58 Stellen (shared, engine, client)
- [x] `findWinnerIndices` dispatched nach Hole-Card-Anzahl
- [x] PlayerSeat rendert dynamisch 2–4 Karten
- [x] TableScreen zeigt "PLO" statt "NLHE"
- [x] Kalibrierung: 12 Archetyp-Formate, TAG VPIP 30.8% / PFR 14.8% / AF 2.89 / WTSD 33.4% (6/6 im Ziel)
- [x] `weightedChoice`-Fallback fixt (best-action statt blind-fold)
- [x] Aggression-Modifier `/5` → `/4` (LAG-Raise-Bonus von +6 → +7.5)

---

## ✅ 0.7.2 — WTSD (Postflop-Fold-Verhalten)

**Ziel:** Showdown-Rate senken — Bots folden postflop zu selten.

- [x] Variant-spezifische Category-Scores: `CategoryScoreTable` in `bot-variant-evaluation.ts`
- [x] `VariantEvaluation.categoryScores` → `DecisionContext` → `bot-action-scoring.ts`
- [x] NLHE: Scores identisch mit `params.scoring.handStrength` (keine Regression)
- [x] PLO: `call.medium` 20→8, `call.weak` −5→−8, `call.marginal` 5→0
- [x] TAG PLO WTSD 52%→36%, VPIP 22.4%, PFR 15.2% — 6/6 in Range
- [x] `bot-category-scores.ts` definiert `NLHE_CATEGORY_SCORES` + `PLO_CATEGORY_SCORES`

---

## ✅ 0.7.3 — Personality-Tuning (LAG AF / Nit VPIP)

**Ziel:** Inkrementelles Modifier-Tuning — LAG aggressiver, Nit tighter.

- [x] Aggression-Modifier `/4` → `/3.5` (LAG-Raise-Bonus +1.07)
- [x] RiskTolerance-Call `/6` → `/8` (LAG-Call −0.75, Nit-Call +1.04)
- [x] LAG AF 1.60→1.73, Nit WTSD 45→41% (Richtung stimmt, aber noch nicht im Target)
- [x] NLHE ohne Regression

> **Erkenntnis**: Personality-Modifier (±5–10) können Category-Base-Scores (±20–30)
> nicht ausreichend gegensteuern. Inkrementelles Nenner-Tuning stößt an Grenzen.
> Strukturelle Lösung (archetyp-spezifische Score-Tabellen) → v0.7.6.

---

## ✅ 0.7.4 — Session-Statistiken

**Ziel:** Live-Feedback während der Session.

- [x] Live-VPIP/PFR/3-Bet in einklappbarer Kopfzeile (📊-Button)
- [x] Ergebnis in BB pro Session (grün/rot)
- [x] BB/100 als primäre Vergleichsmetrik
- [x] Session-Log-Export (PokerStars-Format, Download-Button)
- [x] `session-stats.ts` + `SessionStats.tsx`-Komponente

---

## ⚠️ 0.7.5 — UI-Skalierung & Responsive Layout (teilweise regressiert)

**Ziel:** Grundgerüst für skalierbares Layout — Desktop, Tablet, Phone-Landscape.

- [x] Cards: Clamp-Minimum reduziert (36/50 px statt 46/64 px)
- [x] Action Buttons: `minHeight` 74→56 px, `fontSize` 18→16 px
- [x] Touch: Long-Press (600 ms) öffnet das Rebuy-Menü
- [x] Short-Stack-Rebuy: Bot-Zombies mit 0,5 BB verhindert
- [ ] **Teilweise:** Actionbar-Abstand auf Desktop und Tablet vorhanden, aber sehr knapp
- [ ] **Teilweise:** `max-height: 450px`-Regeln vorhanden, Phone-Landscape bleibt jedoch unbenutzbar
- [ ] Echten Portrait-Hinweis beziehungsweise Orientation-Guard implementieren
- [ ] Tisch, Hero-Seat und Actionbar auf 844×390 ohne Überlagerung darstellen
- [ ] Table-Shell-Berechnung als einzige nachvollziehbare Geometriequelle konsolidieren

> **Rollback-Audit vom 29.07.2026:** 1440×1000 ist nutzbar, 1024×768 knapp,
> 844×390 überlagert mehrere Seats und 390×844 besitzt keinen Portrait-Guard.
> Die frühere Behauptung „abgeschlossen“ sowie die dokumentierte 470-px-Formel
> entsprechen dem aktuellen Code nicht mehr. Die offenen Punkte gehen in v0.7.7
> und die geometrische Neufassung in v0.9.0.

---

## ✅ 0.7.6 — PLO-Archetyp-Scores & Positions-Kalibrierung

**Ziel:** PLO-Bots spielen positionsbewusst + Archetyp-Charakteristik korrekt.

### Iteration 1 — Positions-Fix
- `preflopAssess` ignorierte Position → `positionStrengthAdjust()` eingebaut
- Multi-way: `early: -8, middle: 0, late: +8, blinds: +3`
- HU: `late: +3, blinds: 0`

### Iteration 2 — Archetyp-spezifische PLO-Category-Scores
- Vier separate Score-Tabellen (TAG/Nit/LAG/CS) in `bot-category-scores.ts`
- Delta-over-TAG-Pattern → nur Abweichungen von TAG explizit
- `PLO_CATEGORY_SCORES` → `getPloScores(archetypeId, isPostflop)`

### Iteration 3 — Preflop/Postflop getrennt
- CS WTSD 75%→46% durch postflop-Call-Senkung + Check-Senkung
- Nit VPIP 24%→17% durch angehobene Preflop-Marginal-Scores
- LAG VPIP 28%→32% durch reduzierte Fold-Scores
- `BotContext.archetypeId` + `createBotContext`-Parameter ergänzt
- `ploCallScale=0.15` (Patience-Call-Dämpfung) bleibt aktiv

### Iteration 4 — LAG AF & C-Bet
- LAG AF FR 1.97→**2.49**, C-Bet FR 38%→**40.4%**  
- raise.medium 8→15, raise.marginal 0→5, call.medium 3→-1, call.marginal -3→-7
- Erkenntnis: Preflop/Postflop-Split auch für LAG nötig; higher Postflop-Raise-Scores kompensieren VPIP-Verdünnung
- LAG 6-max: AF 2.61, WTSD 26.9% — beide im Ziel

### Korrektheit, Replays und Sessiondaten

- [x] PLO-Draws über physische ungesehene Karten und exakt 2 Hole Cards + 3 Board Cards bestimmen
- [x] Flush-Draws, Wraps, Wheel-Outs, River-Draws und bereits gemachte Straights korrigieren
- [x] VPIP/PFR/3-Bet einmal pro Spieler und Hand erfassen
- [x] Replay-Stacks, Calls, All-ins, Uncalled Bets, Split-/Side-Pots und Dealer-Seat korrigieren
- [x] Persistentes Replay-Archiv der letzten 200 Hände bereitstellen
- [x] Opponent Reads, Mental Events und Rebuy-RNG korrigieren
- [x] PLO-Pot-Maximum per Tastatur als legales Raise senden
- [x] Engine-Rangfolge und vier PLO-Hole-Cards im Debugexport korrigieren

### Ergebnisse (10k PLO je Archetyp und Format)

| Archetyp | FR VPIP | FR AF | FR WTSD | 6M VPIP | 6M WTSD |
|----------|---------|-------|---------|---------|---------|
| TAG | 26,05% ✅ | 3,74 ⚠️ | 36,4% ✅ | 32,00% ✅ | 35,1% ✅ |
| Nit | 19,36% ✅ | 5,75 ⚠️ | 46,5% ⚠️ | 24,44% ✅ | 46,0% ⚠️ |
| LAG | 34,55% ✅ | 3,15 ✅ | 28,4% ✅ | 41,93% ✅ | 26,3% ✅ |
| CS | 45,54% ✅ | 1,13 ✅ | 42,2% ✅ | 44,64% ✅ | 44,1% ✅ |

Der deterministische A/B-Lauf gegen den Stand vor der physischen Draw-Korrektur
erreicht 43/72 statt 44/72 Zielkorridoren. Die Gesamtgüte bleibt damit praktisch
gleich, während sich einzelne Treffer verschieben. Deshalb wird die fachlich
korrekte Draw-Auswertung nicht für alte Kalibrierungswerte zurückgedreht.

### Bekannte Abweichungen

| Metrik | Wert | Target | Grund |
|--------|------|--------|-------|
| TAG 3-Bet / C-Bet | FR 14,71% / 28,9% | 5–11% / 35–55% | Nach korrekter `T`- und Draw-Auswertung gezielt neu kalibrieren |
| TAG AF | 3,74 FR, 4,71 6-max | 1,5–3,5 | Raise-/Call-Verhältnis nach Draw-Korrektur verschoben |
| Nit AF / WTSD | 5,75 / 46,5% FR | 1,5–3,5 / 25–36% | Checked-down und niedrige Call-Rate strukturell trennen |
| LAG C-Bet | 29,0% FR, 36,9% 6-max | 40–60% | Initiative separat von Gesamtaggression kalibrieren |
| HU | archetypabhängig | siehe `simulation.ts` | Benötigt eigene Ranges und Scores in v0.8.0 |

### Dateien
- `packages/client/src/omaha-hand-evaluation.ts` — `positionStrengthAdjust()`, `getPloScores(isPostflop)`
- `packages/client/src/bot-category-scores.ts` — per-archetype + per-street Score-Tabellen
- `packages/client/src/bot-context.ts` — `archetypeId` in `BotContext` + `createBotContext`-Parameter

> **Identitäten:** Der Roster bleibt bei 44 Einträgen. Wachstum wird nicht mehr
> künstlich an jede Minor-Version gekoppelt, sondern bedarfs- und qualitätsgetrieben
> als fortlaufender Produktstrang behandelt.

---

## ✅ 0.7.7 — Stabilisierung nach UI-Rollback

**Ziel:** Die nach dem Rollback belegten Regressionen schließen und die
Entwicklungswerkzeuge sowie die öffentliche Projektbasis vor dem nächsten
Strategiemeilenstein vereinheitlichen.

### Public Readiness

- [x] AGPL-, Beitrags- und Sicherheitsdokumentation einchecken
- [x] Server ohne JWT-Fallback, standardmäßig lokale Bindung und private Datenbankrechte
- [x] Authentifizierung für History- und Statistik-Endpunkte ergänzen
- [x] CI, Dependabot, Dependency Review, CodeQL und gegatetes Pages-Deployment vorbereiten
- [x] Demo-Sync bis zum Cutover auf eine öffentliche Positivliste begrenzen
- [x] formellen Secret-Scan über die vollständige Git-Historie dokumentieren
- [x] Hauptrepository nach finaler Inhaltsprüfung öffentlich schalten
- [x] Pages auf das Hauptrepository umstellen und altes Demo-Repository weiterleiten
- [x] Secret Scanning und Push Protection nach dem Visibility-Wechsel aktivieren
- [x] initiale CodeQL-Funde durch Rate Limits für Auth-, History- und Statistik-Routen schließen

### Responsive Safety Pass

Bewusst ohne Vorgriff auf die für 0.9.0 geplante TableGeometry-SSOT: Die
Positions-Presets bleiben unverändert; abgesichert werden nur äußeres Layout,
Bedienbarkeit und messbare Viewport-Grenzen.

- [x] Phone-Landscape 844×390 ohne Seat-/Actionbar-Überlagerung
- [x] Portrait-Guard mit verständlichem Hinweis statt defektem Layout
- [x] Desktop 1440×1000 und Tablet 1024×768 mit belastbarem Sicherheitsabstand
- [x] Responsive Component-/Browser-Tests für die vier geprüften Viewports

### Android-Debug-Prototyp

Der native Stand dient zunächst dem schnellen Test auf echten Smartphones. Er
ist weder ein öffentliches APK-Release noch ein v1.0-Release-Gate; die
Browser-Demo bleibt mobil bewusst auf einen funktionalen Fallback begrenzt.

- [x] Capacitor 8, eingechecktes `android/`-Projekt und reproduzierbare
  Sync-, Open-, Run- und Gradle-Check-Skripte
- [x] Landscape-Vollbild mit Systemleisten-, Safe-Area-, Display-Cutout-,
  Zurück-Taste- und Resume-Handling
- [x] einfache vollflächige Setup-Maske und kompakte native Touch-Actionbar
- [x] Android-spezifische Lesbarkeit für Board und Hero-Hole-Cards verbessern
- [x] bekannte obere Karten-Clips mit einer begrenzten Sicherheitskorrektur
  schließen, ohne die spätere TableGeometry vorwegzunehmen
- [x] Web, Phone-Portrait, kompaktes Landscape und Desktop/Tablet per
  `matchMedia` statt User-Agent-Heuristik trennen
- [x] ersten qualitativen APK-Lauf auf echter Hardware durchführen,
  Unstimmigkeiten sammeln und nach 0.7.7-Blocker versus
  0.9.0-Geometriearbeit priorisieren
- [x] Android-HandReplayer reproduzieren: Funktion bestätigt, gequetschte
  mobile Geometrie nach 0.9.1 verschoben; Hand- und Sessionexport inzwischen
  über das native Android-Teilen-/Speichern-Menü verfügbar
- [x] Session-Log und vollständiges Debug-JSON auf Android als Cache-Datei mit
  Content-URI exportieren; nativen Chooser auf echter Hardware verifizieren
- [x] verkürzten Kontrolllauf über NLHE/PLO sowie Heads-up/6-max/Full Ring,
  Zurück-Taste und Resume abschließen

> Gerätelauf und Kontrollmatrix sind im
> [APK-Gerätebericht vom 30.07.2026](testing/apk/2026-07-30-device-inventory.md)
> festgehalten. Der Replayer ist funktional, seine mobile Tischgeometrie bleibt
> jedoch bewusst Bestandteil von 0.9.1.

### Release-Gate

- [x] qualitative APK-Bestandsaufnahme durchführen und Befunde in
  0.7.7-Blocker versus spätere TableGeometry-/UX-Arbeit einordnen
- [x] Android-HandReplayer als funktional, aber geometrisch noch nicht
  releasefähig einordnen; nativen Datei-Export ergänzen und das vollständige
  Touch-/Geometrie-Redesign nach 0.9.1 verschieben
- [x] Bestehende Client-, Responsive- und Android-Debug-Builds erneut
  erfolgreich ausführen
- [x] verkürzte Varianten-, Format- und Lifecycle-Matrix auf echter Hardware
  abschließen

---

## ✅ 0.7.8 — PLO 3-Bet-Steuerung & Strategie-Tabelle

**Ziel:** Alle vier PLO-Archetypen in Full Ring und 6-max auf menschlich
plausible VPIP-, PFR-, 3-Bet-, C-Bet-, AF- und WTSD-Korridore kalibrieren.

### Implementiert

- **PLO-Preflop-Strategie-Tabelle** (`PLO_PREFLOP_STRATEGY`): Archetyp-,
  situations- und handkategorieabhängige preferred action für alle 4 Archetypen
  (TAG/Nit/LAG/CS). Fehlende Kategorien werden als Fold-Präferenz behandelt;
  die Category Scores bleiben weiterhin Teil der Entscheidung.
- **PLO-skalierte Strategie-Matrix** in `preflopStrategyFactors()`: Für PLO
  werden abgeschwächte Werte verwendet (raise→raise=12, call→call=10,
  call→raise=0, fold→raise=-20). NLHE-Pfad unverändert.
- **Bot-Tag-Integration**: `preflopRangeAction` wird für PLO über
  `getPloPreflopAction()` befüllt (vorher `undefined`).
- **LAG-Korrektur**: facing-open good→call statt raise, facing-3bet good→fold
  (reduziert überhöhte 3-Bets ohne VPIP zu drücken).
- **CS-Korrektur**: unopened medium→call entfernt (CS VPIP von 56% auf 45%
  gesenkt).
- **Nit-FR-Korrektur**: `good`-Cold-Calls reduziert; VPIP 24,9%→21,7%.
- **Nit-6-max-Korrektur**: eigene Preflop-Scores plus `raise-or-call`-Mix für
  `good` und `call-or-fold`-Mix für `medium` gegen ein Open; die breitere,
  gemischte Postflop-Range senkt AF/WTSD ohne globale Postflop-Eingriffe.
- **Metrik-Audit**: WTSD zählt jetzt alle Flop-Teilnehmer im Nenner, passive
  All-ins zählen bei AF als Calls, und spätere Backraise-Gelegenheiten fließen
  korrekt in den 3-Bet-Nenner ein.
- **Kalibrierungsfilter**: `CALIB_PROFILE` und `CALIB_FORMAT` erlauben gezielte
  Entwicklungs- und Bestätigungsläufe.

### Ergebnisse (10k PLO)

| Archetyp | Format | VPIP | PFR | 3-Bet | AF | WTSD | C-Bet |
|----------|--------|------|-----|-------|----|------|-------|
| Nit | FR | 21,67% | 13,16% | 3,31% | 3,12 | 35,0% | 42,0% |
| Nit | 6-max | 25,43% | 16,69% | 4,78% | 3,64 | 37,7% | 45,1% |
| TAG | FR | 32,57% | 16,27% | 8,36% | 2,21 | 32,2% | 44,0% |
| TAG | 6-max | 38,03% | 21,41% | 8,10% | 2,91 | 33,6% | 46,0% |
| LAG | FR | 36,61% | 18,72% | 12,89% | 2,06 | 24,1% | 50,8% |
| LAG | 6-max | 45,43% | 24,66% | 13,90% | 2,31 | 27,7% | 53,2% |
| CS | FR | 45,62% | 5,92% | 0,59% | 1,09 | 36,6% | 40,1% |
| CS | 6-max | 46,40% | 9,77% | 1,35% | 1,95 | 43,9% | 38,0% |

### Bekannte Abweichungen

- Für Full Ring und 6-max bestehen keine offenen Zielabweichungen.
- Der finale Nit-6-max-Korridor ist nach dem Metrik-Audit bewusst auf AF
  1,5–4,0 und WTSD 25–38 begrenzt; die zwischenzeitlich breiteren Werte 4,5/40
  wurden verworfen.
- Heads-up bleibt für 0.8.0 vorgemerkt. Der NLHE-Regressionslauf nach dem
  Metrik-Audit bestätigt dabei einen konkreten offenen Punkt: Calling Station
  HU erreicht bei 10k Händen 1,79% 3-Bet (63/3512 Opportunities) statt des
  bisherigen Korridors von 2–13%. Verhalten und Target bleiben in 0.7.8
  bewusst unverändert.
- Die NLHE-C-Bet-Metrik und ihre Targets sind separat in
  `calibration/v0.7.8.md` abgeschlossen.

### Release-Gate

- [x] 3k-Entwicklungsläufe ohne Invalid-Action-Fallbacks
- [x] 10k-Bestätigungsläufe für alle vier PLO-Archetypen in Full Ring und 6-max ausgeführt
- [x] Nit 6-max nach strukturellem Audit im begrenzten AF-/WTSD-Korridor
- [ ] Heads-up-Kalibrierung (bewusst auf 0.8.0 verschoben)
- [x] NLHE-Regressionstest: Full Ring und 6-max vollständig im Ziel; CS-HU-
  3-Bet-Befund mit 10k bestätigt und auf 0.8.0 verschoben
- [x] 304 Workspace-Unit-Tests grün (194 Client, 103 Engine, 7 Server)
- [x] Kalibrierungsbericht mit finalen 10k-Werten versionieren

---

## ✅ 0.7.9 — Bot-Evidenz & Kalibrierungsstabilisierung

**Ziel:** Bestehendes NLHE-/PLO-Verhalten vor der HU-Arbeit strukturell
stabilisieren, ohne Zielkorridore zur Fehlerkaschierung zu verbreitern.

### Implementiert

- aggressive Betgrößen in Session, Street-Analyse und Reads auf eine gemeinsame
  Pot-Fraktion normiert; passive All-in-Calls ausgeschlossen
- Line-, langfristige Gegner- und Sizing-Evidenz aktionsabhängig
  zusammengeführt; Reaktion auf kleine Bets an die eigene Aggressionsneigung
  gekoppelt
- semantisch falsches, ungenutztes `iAmInPosition`-Feld entfernt; eine echte
  Positionsberechnung wird erst bei einem konkreten Scoring-Verbraucher mit
  Seat-/Button-Kontext eingeführt
- PLO-spezifische Board-Verschlechterung für Flush-, Pairing- und
  Straight-Fenster ergänzt; Protection-Score und Raise-Sizing angeschlossen
- PLO-Reaktionsstärke wegen häufigerer Boardwechsel separat dosiert und
  Calling-Station-Flop-/Turn-/River-Defense nach Traces strukturell kalibriert
- PLO-Preflop-Handqualität strukturell neu aufgebaut: echte Suit-Shapes statt
  Triple-Suit-als-Double-Suit, Unique-Rank-/Wheel-Connectivity ohne Paar-Bonus,
  Paarqualität, Nut-Suits und Dangler; Kategorie unabhängig von Position und
  vorheriger Action
- Omaha-Showdownvergleich innerhalb gleicher Handkategorien korrigiert und mit
  dem Q-Q-2-2-gegen-9-9-2-2-Fall aus Hand #68 reihenfolgeunabhängig getestet
- PLO-Flop, -Turn und -River getrennt aufgelöst; verwundbare Made Hands erhalten
  vor dem River dosierte Protection, LAG-All-ins wurden zugunsten normaler
  Pressure-Raises reduziert
- Opponent-Read-Beobachtung zwischen echter Session und Simulation vereinheitlicht
- Kalibrierungsmetrik-Schema v2 mit zentralem Hand-Accumulator,
  Golden-Hand-Tests und Zählerinvarianten eingeführt
- Calling-Station-Skills über Generator v3 deterministisch auf das Low-Tier
  15–49 begrenzt und bestehende Roster identitätsstabil migriert
- Deep-Stack-Open-Shoves und uncommitted All-ins durch explizite
  Stack-/Commitment-Grenzen aus der regulären Raise-Auswahl genommen
- Deep-Stack-Open-Shoves über 40 BB und uncommitted Deep-Shoves als eigene
  Kalibrierungsinvarianten sichtbar gemacht; jeder Treffer lässt den Lauf
  fehlschlagen. Auch der Raise-to-Max-Legalisierungspfad respektiert die Sperre
- NLHE-Calling-Stations behalten ihre geringe Bluffinitiative, werden bei
  Value-Bets mit Made Hands aber nicht mehr doppelt durch Passivität bestraft
- NLHE-Sticky-Calls nehmen über Flop, Turn und River ab; drawlose schwache Hände
  reagieren auf wiederholten Street-Druck und fehlenden Showdown Value. PLO
  bleibt bei seinen separat kalibrierten Street-Tabellen
- archetypabhängiges Cash-out zwischen Händen ergänzt: Basisschwellen von
  240–480 BB werden individuell durch die Risikoneigung verschoben, spätestens
  am persönlichen Hard-Limit bis 800 BB wird ausgecasht; Ersatz-Bots steigen
  mit dem normalen Startstack ein
- Live-Sitz beim Bot-Austausch vollständig mit Name, Avatar und Engine-Spieler
  synchronisiert
- Android-Bot-Debug per fünf schnellen Berührungen der Versionsanzeige
  touchfähig und persistent schaltbar gemacht; `Strg+D` bleibt der
  Desktop-Shortcut
- Android-Export für Session-Log, Replayer-Text und vollständiges Debug-JSON
  über Cache-Datei und natives Teilen-/Speichern-Menü ergänzt; Capacitor-App-,
  Filesystem- und Share-Plugins im Workspace explizit registriert
- 40 der 44 stabilen Bot-Identitäten mit eigenen Porträts ausgestattet und
  transitive High-Severity-Abhängigkeiten aktualisiert

### Release-Gate

- [x] unveränderte Targets statt Korridorerweiterungen beibehalten
- [x] deterministische 10k-Läufe für alle vier Archetypen in NLHE und PLO,
  jeweils Full Ring und 6-max, ohne Invalid-Action-Fallbacks
- [x] weder Deep-Stack-Open-Shoves über 40 BB noch uncommitted Deep-Shoves in
  allen 16 Release-Läufen
- [x] Heads-up unverändert auf v0.8.0 begrenzt
- [x] Workspace-Tests, Produktionsbuild und High-Severity-Audit erfolgreich
- [x] Kalibrierungsbericht `calibration/v0.7.9.md` versioniert
- [x] NLHE-6-max-Probesession über 100 Hände mit der aktuellen 0.7.9-APK
  triagiert; keine neuen Deep-Open-Shoves oder mehrstreetigen schwachen
  Call-downs, Preflop-Reraise-Eskalation als struktureller Folgebefund für
  0.8.1 dokumentiert
- [x] PLO-6-max-Vorher-Probesession nach 80 Händen beendet und vollständig
  triagiert: 100% Raised Pots, überzeichnete TAG-/LAG-Opens, passive
  Top-Set-Line in Hand #70 und falsche Potzuteilung in Hand #68 identifiziert
- [x] daraus abgeleitete Engine-, Preflop-, Protection- und All-in-Korrekturen
  implementiert; alle unveränderten PLO-Targets erneut über 10k bestätigt
- [ ] kurze PLO-6-max-Post-Fix-Kontrollsession mit Debugexport abschließen;
  der erste APK-Lauf wurde nach acht Händen per ADB gerettet und bestand das
  Gate wegen der Nut-Straight-/Flush-Transition in Hand #8 noch nicht.
  Besonders Raised-Pot-Anteil, Made-Hand-Neubewertung nach Draw-Completion,
  Top-Set-Protection und korrekte Showdowns prüfen
- [ ] finalen 0.7.9-Push erst nach dieser Post-Fix-Kontrollsession

---

# Phase 4 — Stabilisierung & Release-Vorbereitung

## 🎯 0.8.0 — Kalibrierungs-Stabilisierung

**Ziel:** Die Kalibrierung über alle Archetypen, Varianten und Formate auf ein
belastbares Fundament stellen, bevor neue Strategiepfade und dynamische Gegner
darauf aufbauen.

### PLO-Handbewertung & Rekalibrierung

- [x] PLO-Nut-Potential handrelativ: Flush-Top-Card, FH-Trips-Rank, Straight-Position, Set-Rank, Two-Pair-Ranks
- [x] PLO-Dirty-Outs: Board-Pair-Filter, Straight-Domination via Gegner-Simulation, Flush-Dominanz via Board/Hole-Vergleich
- [x] PLO-Board-Change handrelativ: Pair hilft Sets/TwoPair/FH, Flush-Card ungefährlich für Flush-Halter
- [x] PLO-Score-Tabellen rekalibriert: LAG-Raise zurück auf v0.7.8, TAG-Raise erhöht, Nit-Fold erhöht, Protection-Boni auf Original
- [x] NLHE/PLO-Targets nach Realismus-Kriterien aktualisiert (C-Bet, AF-Caps, WTSD für PLO)
- [x] Neue Kalibrierungsmetriken: Fold-to-CBet und Turn C-Bet mit Target-Korridoren
- [x] **PLO-Nut-Erkennung `'second-nuts'`**: Zwischenstufe zwischen `'near-nuts'`
  und `'strong'` (Quads-K-vs-A, FH-KKKAA-vs-AAA, K-high-Flush-vs-A-high).
  `secondNutPotential:4` dämpft Aggression bei zweitbesten Händen.
- [x] **`findStraightTop`**: O(10)-Enumeration aller 10 Straight-Runs für NLHE
  und PLO — ersetzt defekte Heuristiken, korrekte Nut-Straight-Erkennung.
- [x] **Code-Review**: 30 Module, 22 Bugs gefixt, 19 bugfrei; 368 Tests
  ([REVIEW.md](REVIEW.md))

### Test-Infrastruktur

- [x] **Layer 1 — Invariant-Based Smoke Suite** ([Details](#layer-1--invariant-based-smoke-suite-ci-jeder-commit)):
  Chip-Konservierung, Dealer-Rotation, kein negativer Stack, Pot-Konsistenz, Queue-Integrität —
  19 randomisierte NLHE-/PLO-Szenarien mit je 1.000 Händen
- [ ] **0.8.1 / Layer 2 — Kalibrierungs-Regression**: 300-Hand-Smoke mit
  Baseline-Vergleich, Abweichung > 2 %p → Warnung, > 5 %p → Build-Fehler
- [ ] **0.8.1 / Layer 3 — Parameter-Validierung**: Score-Tabellen-Konsistenz,
  Clamp-Gültigkeit, Skill-Tier-Sortierung, All-in-Strafen negativ

### Strukturelle Score-Lücken

#### 🔴 Priority 1 — Direkter Kalibrierungs-Impact

- [x] **Pot-Commitment-Logik**: Ab callCommitment ≥ 0.4 Fold-Scores überschreiben.
  Behebt LAG FR WTSD 11.8% vs Target 28–34%. Höchster Einzeleffekt auf Kalibrierung.
- [x] **Dynamische Fold-Thresholds**: Fold-Scores als Funktion von Street, SPR und
  Gegner-Aggression. Behebt Nit AF-Explosion (AF 6.6 statt 3.5) und universell
  zu hohes Fold-to-CBet (78-84% vs. 30-68%).
- [x] **Multiway-Dynamik**: `activeOpponents` graduell statt binär ≥3. Multiway-Penalty
  für C-Bet, 3-Bet, Value-Raises. Senkt PLO-C-Bet-Überaggression und verbessert
  Fold-to-CBet in Multiway-Pots. Preflop-Ranges nach Gegnerzahl skalieren.
- [x] **TAG 6m AF-Tuning**: AF stabil bei 3.65 (Target 1.5–3.5). Nur Parameter — kein
  Algorithmus-Aufwand.

### HU-Kalibrierung

HU ist spielbar, besitzt eigene Targets und wird nicht mehr aus 6-max-
Entscheidungstabellen abgeleitet. Die exakte Postflop-Kalibrierung folgt nach
den Strategieänderungen von 0.8.1, die adaptive Validierung nach 0.8.2.

- [x] HU-spezifische Preflop-Ranges validieren und nachjustieren (Anker in `preflop-ranges.ts` vorhanden)
- [x] NLHE Calling Station: 3-Bet-Frequenz und Target nach korrigiertem
  Opportunity-Nenner prüfen (v0.7.8-Baseline: 1,79%, 63/3512 bei 10k)
- [x] Postflop-Linien für HU-Dynamik (C-Bet-Frequenz, Float-Resistenz, Bluff-Rate)
- [x] HU-Kalibrierung: bestehende Targets in `simulation.ts` schärfen (alle 4 Archetypen, NLHE + PLO)
- [x] Integrationstests für Format-Isolation und explizite HU-Tabellenauswahl
- [x] Strukturelle Baseline: NLHE 10k und PLO 3k für alle vier Archetypen
- [ ] 0.8.1: finale 10k-Postflop-Validierung für NLHE und PLO

### Release-Gate

- [x] Code-Review abgeschlossen: 30 Module, 22 Bugs gefixt, 19 bugfrei ([REVIEW.md](REVIEW.md))
- [x] Festes Tabellenformat (`tableSize`) von aktiven Spielern im Pot getrennt;
  ein Full-Ring-Pot kann nach Folds keine 6-max-/HU-Boni mehr erhalten
- [x] PLO-HU-Score- und Preflop-Tabellen explizit von 6-max entkoppelt
- [x] Kalibrierungsreport mit Rohnennern sowie AF nach Street, Rolle und Drucksituation
- [x] Vorher-Baseline vollständig dokumentiert: 20 NLHE- und 42 PLO-Zielabweichungen
- [x] Post-Isolation-Baseline: NLHE 10k und PLO 3k, jeweils alle Archetypen und Formate
- [x] 0 Invalid-Action-Fallbacks, 0 Deep-Stack-Open-Shoves und
  0 uncommitted Deep-Shoves
- [x] Layer 1-Invarianten-Tests grün für NLHE und PLO (19 Tests)

Das frühere All-green-Gate wird nicht durch weichere Targets ersetzt. Exaktes
Postflop-Tuning wird bewusst nach den SPR-, Board-, River-, Float- und
Barrel-Änderungen von 0.8.1 durchgeführt. Finale adaptive Preflop-/HU-
Validierung folgt nach 0.8.2. So werden keine 0.8.0-Konstanten auf
Entscheidungspfade kalibriert, die in den beiden Folgereleases ersetzt werden.

---

## 🎯 0.8.1 — PLO-Strategie & NLHE-Verfeinerung

**Ziel:** PLO-spezifische Score-Lücken schließen und NLHE-Entscheidungstiefe verbessern.

### PLO-Strategie

- [ ] **SPR-Zonen (PLO)**: Graduelle SPR-Skalierung statt binär ≤3. SPR 1-3 →
  Nut-or-Fold, SPR 4-8 → Protection-heavy, SPR 8-15 → Draw-heavy. Fundamentale
  PLO-Strategie-Variable, aktuell nur +12/−8 bei SPR≤3.
- [ ] **PLO-Board-Dynamics**: `boardGotWorse` boolean → Equity-Collapse-Multiplikator.
  Gepaarter River bricht Flush/Straight-Value drastisch, Monotone-Board kollabiert
  Non-Flush-Hände. Jede Turn-/River-Karte in PLO verändert die Equity-Landschaft.
- [ ] **PLO-River-Disziplin**: PLO-spezifische Call-Down-Verstärkung. Kein Bluff-Catch
  ohne Blocker am River, Board-Pair oder 3rd-Flush → drastischer Fold-Malus.
  PLO-River-Calling-Range muss enger sein als NLHE.
- [ ] **PLO-Positionshebel**: IP-Checkbonus, OOP-Fold-Malus, Freerolling-Modell.
  In PLO realisiert IP dünne Redraws kostenlos, OOP wird auf Completern ausgeblufft.
- [ ] **PLO-Wrap-Kombinatorik**: Bottom-Wrap vs. Nut-Wrap unterscheiden. `wrap-8+`/`wrap-13+`
  erkannt, aber kein Unterschied zwischen Nut-Outs und 2nd/3rd-Outs. Bottom-Wrap-Player
  wird von jedem höheren Wrap gefreerollt.

### NLHE-Verfeinerung & Infrastruktur

- [ ] **Layer 2 — Kalibrierungs-Regression**: deterministischer 300-Hand-Smoke,
  Abweichung > 2 %p als Warnung und > 5 %p als Fehler
- [ ] **Layer 3 — Parameter-Validierung**: Score-Tabellen, Clamps,
  Skill-Tier-Reihenfolge und All-in-Strafen prüfen

- [ ] **Skill-Gating**: Neue Analyse-Tiefe als Feature-Flags mit `skillGate`-Schwellen.
  Skill-20-Nit: nur Outs-Zahl. Skill-90-TAG: Nut-Wrap vs. Bottom-Wrap. Bestehendes
  Muster: `sizingTell.skillGate: 30`.
- [ ] **Blocker-Logik**: `blockerValue` postflop für Flush-Nut, Straight-Nut und
  Value-Bets nutzen. PLO postflop aktuell immer 0 — 4 Hole Cards = massives
  Blocker-Potenzial.
- [ ] **Implied Odds**: Dynamisch statt statisch +7. Kopplung an Gegner-Stack,
  Draw-Nut-Potential und Anzahl aktiver Gegner.
- [ ] **Check-Raise-Respekt**: Call/Fold-Malus bei Gegner-Check-Raise. Intentionales
  Check-Raise-Line-Planning für beide Varianten.
- [ ] **NLHE Turn-Double-Barrel**: Neues Habit. Bot soll nach Flop-C-Bet auf Blank-Turns
  weiter feuern können — nicht nur am River (`three-barrel-bluff`).
- [ ] **NLHE Float-Defense**: Gegnerische Float-Pattern erkennen. Gegner callt Flop-C-Bet,
  bettet Turn → Pattern-Detection + Defensiv-Scoring.
- [ ] **Preflop 4-Bet/5-Bet**: `facing-3bet` abgedeckt, darüber nur generischer Reraise-
  Penalty. 4-Bet/5-Bet-Modell mit Stack-Commitment, Range-Polarisierung, Fold-to-5-Bet.
- [ ] **NLHE Bet-Fold-Lines**: Street-übergreifende Entscheidungsplanung. "Bette River
  für Value, folde auf Raise" statt isolierter Street-Entscheidungen.

### Release-Gate

- [ ] 3k-Entwicklungsläufe + 10k-Release-Läufe für alle vier Archetypen in NLHE und PLO,
  Full Ring und 6-max — die statische 0.8.0-Baseline ist nach den Score-Änderungen
  neu zu validieren und postflop auf die unveränderten Zielranges zu kalibrieren
- [ ] HU-Kalibrierung: 8 Kombinationen (NLHE + PLO) innerhalb der geschärften Targets
- [ ] 0 Invalid-Action-Fallbacks, 0 Deep-Stack-Open-Shoves
- [ ] Skill-Gating-Smoke: Low-Skill-Bot (20) und High-Skill-Bot (90) zeigen messbar
  unterschiedliches Entscheidungsverhalten in denselben Szenarien

---

## 🎯 0.8.2 — Dynamische Gegner & Anti-Exploit

**Ziel:** Bots lernen aus Gegnerverhalten, passen sich dynamisch an und zeigen
glaubwürdige emotionale Reaktionen — ohne in Solver-Bots oder berechenbare
Muster zu verfallen.

### Adaptive Reads & Ranges

- [ ] Range-Präferenzen und Selection-Gates für 4-Bet-/5-Bet-Ketten so
  staffeln, dass generische `strong`-, Positions- und SPR-Boni eine klare
  Fold-Präferenz nicht mit marginalen Händen strukturell überstimmen
- [ ] Button-/Cutoff-Opens, Steal-Gelegenheiten und Blind-Defense nach Gegner
  und Position mit Stichprobe sowie Konfidenz beobachten
- [ ] strategische Skill-Anpassung von emotionaler Überreaktion trennen:
  skillige Bots verteidigen kontrolliert, schwächere Bots können Druck spät,
  falsch oder gegnerspezifisch frustriert beantworten

### Skill-Modell

- [ ] Skill als Richtung für Erkennung, Anpassungsqualität, Tilt-Regulation
  und Erholungsdauer verwenden, ohne Archetypen in Solver-Bots zu verwandeln
- [ ] Skillmodell für spätere Variantenfamilien vorbereiten: stabiler
  `generalSkill` für übertragbare Fähigkeiten plus deterministisch korrelierte
  `variantProficiency` für NLHE, PLO, Draw und Stud

### Mental Events & Zustände

- [ ] `params.mental` an `bot-mental.ts` anschließen (Werte hartkodiert, Params definiert aber nie gelesen)
- [ ] reale Mental Events für Bad Beat, Cooler, Bluff caught, erfolgreichen
  Bluff und Suckout erkennen; Event-Schwere und Decay fachlich testen
- [ ] gegnerspezifische Frustration und Momentum als begrenzte, abklingende
  Scoring-Evidenz anschließen statt nur Debugzustand zu bleiben
- [ ] temporäre Zustände mit Hysterese/Decay zur archetypischen Grundlinie
  zurückführen; keine permanenten Range-Umschaltungen nach Einzelereignissen

### Feature-Tests

- [ ] Szenariotests für großes Open versus echte kleine 3-Bet sowie
  postflop Bet/Raise/3-Bet/4-Bet mit getrennten Range-, Sizing- und
  Commitment-Reaktionen
- [ ] Sequenztests für wiederholte Steals: High-Skill-Defense versus
  Low-Skill-Überreaktion, gegnerspezifischer Frust und Rückkehr zur Grundlinie
- [ ] Sessiontests für sichtbare, aber nicht permanente Tilt-/Confidence-
  Phasen sowie Invarianten gegen neue marginale Deep-Stack-Eskalationen

### Kalibrierungs-Gate

- [ ] **Baseline-Modus:** Archetypen ohne adaptive Reads, Frust und Momentum
  bleiben innerhalb der festen VPIP/PFR/3-Bet/Postflop-Zielranges
- [ ] **Adaptiver Modus:** Sequenz- und Sessiontests prüfen gerichtete,
  begrenzte Deltas statt jede dynamische Sitzung gegen dieselben statischen
  Korridore zu zwingen
- [ ] Finale NLHE-/PLO-Validierung für Full Ring, 6-max und Heads-up

---

## 🎯 0.8.3 — Refactoring & Code-Qualität

**Ziel:** Code-Basis konsolidieren, aufräumen und Lizenz-Formalia vor dem
großen UI-Release abschließen.

### Refactoring

- [ ] `game.ts` splitten: Showdown-Logik, Player-Management und Betting-Round jeweils in eigene Dateien
- [ ] `LocalGameRunner.ts` splitten: verbleibende Zuständigkeiten nach v0.8.0 entflechten
- [ ] Veraltete Bot-Dateien aufräumen (`bot.ts`, doppelte Helfer)
- [ ] Bet-Level aktionsbasiert modellieren: Preflop `unopened`, Open, 3-Bet,
  4-Bet+ aus der tatsächlichen Raise-Anzahl statt aus einer 4-BB-Sizinggrenze
  ableiten; ungewöhnlich große Opens und kleine 3-Bets korrekt unterscheiden
- [ ] Postflop pro Street die echte Bet-/Raise-/Reraise-Stufe zählen und
  steigende Vorsicht für 3-Bet/4-Bet-Pots anwenden; die bisherige binäre
  Reraise-Erkennung und Check-Raise-Sonderbehandlung darin zusammenführen
- [ ] Ruhendes `server`-Paket klar vom v1-Buildpfad getrennt halten und v2-Schnittstellenannahmen dokumentieren
- [ ] Prettier-Konfiguration als separaten mechanischen Commit einführen
- [ ] Dokumentierte Format- und Lint-Befehle ergänzen

### Integrationstests

- [ ] Integrationstests: Engine + LocalGameRunner als durchgehende Pipeline (Hand von Blinds bis Showdown)
- [ ] Randfall-Tests: Empty-State (0 Spieler), Bust-zu-Ende, schnelle Neustarts

### Lizenzklarheit & Herkunftsnachweis

- [ ] Zentrale Bot- und Engine-Dateien mit maschinenlesbaren
  `SPDX-FileCopyrightText`- und `SPDX-License-Identifier`-Hinweisen versehen
- [ ] Zukünftige Release-Tags kryptografisch signieren und die lokale
  Verifikation knapp dokumentieren; den veröffentlichten Tag `v0.7.7` nicht
  nachträglich umschreiben
- [ ] Pro Release ein leichtgewichtiges Bot-Provenance-Manifest aus exakten
  Dateihashes und normalisierten Token-/AST-Fingerprints erzeugen, damit auch
  umbenannte oder umformatierte Teilkopien lokal vergleichbar bleiben
- [ ] Veröffentlichte Releases unabhängig bei Software Heritage archivieren
  und den jeweiligen inhaltsbasierten SWHID dokumentieren
- [ ] Kurzen Monitoring- und Beweissicherungsleitfaden für charakteristische
  öffentliche Codefragmente, verdächtige Repositories und
  AGPL-Compliance-Fälle festhalten

> Diese Maßnahmen richten sich nicht gegen transparente Forks oder
> AGPL-konforme kommerzielle Nutzung. Es entstehen weder Telemetrie noch
> Phone-home-Logik, Obfuskation, absichtlicher Dead Code oder ein verstecktes
> Laufzeit-Wasserzeichen. Ziel ist ein proportionaler Herkunftsnachweis gegen
> automatisierte, unattribuierte Übernahmen, keine lückenlose Überwachung des
> Internets.

---

## 🎯 0.8.4 — Session-Flexibilität

**Ziel:** Mehr Kontrolle über die Session.

- [ ] Hero-Name im Setup wählbar (statt immer „You“)
- [ ] Individuelle Starting-Stacks pro Bot
- [ ] Konfigurierbare Buy-in-Grenzen (40–250 BB)
- [ ] Session-Setup mit Variante + Schwierigkeitsmix
- [ ] zentrale `pendingHeroAction`-Pipeline für vorgewählte Aktionen einführen;
  bei Zugbeginn immer erneut gegen den aktuellen Betting Context validieren
- [ ] sichere Pre-Selections `Check`, `Check/Fold`, `Fold` und
  betragsgebundenes `Call` anbieten; ungültig gewordene Auswahlen löschen und
  zunächst weder `Call any` noch automatische Raises zulassen
- [ ] optionale Clock-Profile `Entspannt`, `Standard` und `Schnell` technisch
  vorbereiten; Timeout checkt kostenlos oder foldet, investiert aber niemals
  automatisch Chips
- [ ] Clock bei Hintergrund, Gerätesperre und kontrollierter App-Pause
  anhalten; Warnungen, Timebank und Timeout-Quelle replayfähig erfassen
- [ ] Integrationstests für Session-Flow (Setup → mehrere Hände → Rebuy)
- [ ] Sequenztests für Pre-Selection nach Check, Bet und Reraise sowie für
  Clock-/Resume-Randfälle auf Desktop und Android

### Fortlaufend: Bot-Identitäten

- Neue Identitäten nur ergänzen, wenn Namen, Avatare, Traits und Wiedererkennbarkeit gemeinsam geprüft sind.
- Keine feste Quote pro Minor-Version; Session-Abwechslung und Wiederholungsrate bestimmen den Bedarf.
- Global zunächst ungefähr 64 Identitäten anstreben; pro 6-max-Session in der
  Regel ein bis zwei bekannte und drei bis vier neue oder länger nicht
  gesehene Gegner auswählen.
- Wiederholungs-Cooldown und stakeübergreifende Pool-Überlappung vorbereiten;
  Ersatzspieler bevorzugt aus in der Session noch nicht gesehenen Identitäten ziehen.
- Einen gemeinsamen variantenübergreifenden Roster behalten und daraus
  überlappende Varianten-Pools nach persönlicher Affinität und Kompetenz
  bilden; keine vollständig getrennten Identitätswelten erzeugen.
- Dieselbe Identität nie gleichzeitig an mehreren offenen Tischen einsetzen;
  spätere Spezialisten dürfen Haupt- und Nebenvarianten mit unterschiedlichen,
  aber korrelierten Skillwerten besitzen.
- Persistenzmigrationen und deterministische Seeds bleiben Release-Gates für Roster-Änderungen.

---

## 🎯 0.8.5 — Persistenz & Recovery

**Ziel:** Lokale Nutzerdaten vor v1 kontrolliert laden, migrieren und bei
Fehlern wiederherstellbar behandeln, statt beschädigte Einträge still zu
verwerfen oder ungefragt durch Defaults zu ersetzen.

- [ ] Gemeinsame versionierte Persistenzschicht für Roster, Replay-Archiv und
  Einstellungen definieren
- [ ] Gespeicherte Daten vor der Nutzung strukturell validieren und
  Migrationen als deterministische, separat getestete Schritte ausführen
- [ ] Beschädigte oder unbekannte Daten nicht still überschreiben; Recovery
  mit verständlicher Meldung, Diagnoseexport und bewusstem Reset anbieten
- [ ] Vollständigen lokalen Datenexport für Diagnose und Sicherung vor einem
  Reset bereitstellen
- [ ] Speicherfehler wie ungültiges JSON, unbekannte Schema-Version,
  Quota-Überschreitung und nicht verfügbares `localStorage` testen
- [ ] Roster, Replays und Einstellungen bleiben über unterstützte Upgrades
  erhalten; eine laufende Hand oder Session wird nicht wiederaufgenommen

---

## 🎯 0.8.6 — UI-Fundament

**Ziel:** Komponenten, Styles und Tests für den großen Tischumbau vorbereiten,
ohne vor 0.9.0 eine zweite sichtbare Geometrie einzuführen.

- [ ] `PokerTable` sowie responsive Tisch-Styles aus `TableScreen` entkoppeln
- [ ] Verantwortlichkeiten von TableSurface, TableStage, Pods, Karten, Bets,
  Board, Pot und Controls als Komponenten- und Layer-Grenzen festlegen
- [ ] Styling-Spike: Tailwind an einer repräsentativen UI-Komponente gegen
  CSS-Klassen und Design-Tokens evaluieren und die Entscheidung vor 0.9.0
  dokumentieren
- [ ] Component-Tests für PokerTable, PlayerSeat, ActionButtons und
  HandReplayer als Ausgangsbasis ergänzen
- [ ] Referenz-Viewports und visuelle Abnahme-Checkpoints für den 0.9-Umbau
  festhalten
- [ ] Geführte Alpha mit klar abgegrenzten Rollen und den Vorlagen der
  [Teststrategie](TESTING_STRATEGY.md) vorbereiten; keine breite Bewerbung als
  fertiges Produkt

---

## 🎯 0.9.0 — TableSurface & TableGeometry

**Ziel:** Eine gemeinsame visuelle und mathematische Tischbasis statt
Hardcode-Presets. Die Tischschale wird zuerst als normierte Oberfläche
festgelegt; TableGeometry, Pods, Karten und Bets verwenden anschließend
dieselben Zonen als SSOT.

### Iteration 1 — TableSurface

- [ ] Präsentationales React-SVG mit echter Ellipse und festem
  Zielverhältnis um 1,75:1 statt gestreckter Stadion-/Kapselform erstellen
- [ ] Pseudo-3D-Schichtung aus sichtbarer Unterkante, dunkler Leder-Rail,
  innerer Naht und gedecktem grünem Filz umsetzen
- [ ] Betting-Line nur als optionales, sehr dezentes Skin-Detail behandeln;
  Bet-Positionen dürfen nicht von ihrer Sichtbarkeit abhängen
- [ ] Silhouette, Rail-Stärke und Materialwirkung vor der Integration separat
  für Desktop und Android-Landscape visuell abnehmen

### Iteration 2 — TableGeometry SSOT

- [ ] Normierte Surface-, Seat-, Card- und Bet-Ellipsen mit gemeinsamem
  Mittelpunkt und nachvollziehbaren Insets definieren
- [ ] SVG und Positionsberechnung aus denselben Geometriewerten ableiten,
  damit keine zweite visuelle Geometriequelle entsteht
- [ ] Heads-up, 6-max und Full Ring aus der Geometrie berechnen statt
  getrennte Seat-/Bet-/Button-Presets zu pflegen

### Iteration 3 — Pod-Docking und Karten

- [ ] Pods waagerecht und überwiegend außerhalb des Felts anordnen; das Felt
  bleibt für Bets, Pot, Board und Ergebnisdarstellung frei
- [ ] Avatarzentrum als stabilen Docking-Punkt verwenden; Podkörper auf linker
  und rechter Tischhälfte gespiegelt vom Tisch weg wachsen lassen
- [ ] Hole Cards aufrecht hinter dem jeweiligen Pod platzieren und teilweise
  verdecken; feste Bühnen-Sicherheitszonen ersetzen sitzspezifische
  Clipping-Korrekturen
- [ ] Bets entlang der unsichtbaren inneren Bet-Ellipse eindeutig dem
  jeweiligen Spieler zuordnen

### Release-Gate

- [ ] NLHE und PLO mit Heads-up, 6-max und Full Ring ohne Pod-, Karten- oder
  Bet-Überlagerungen in den Desktop-Referenzmaßen
- [ ] Automatisierte Geometrietests für Symmetrie, Bounding Boxes,
  Bet-Zuordnung und stabile Reihenfolge
- [ ] Visuelle Freigabe nach TableSurface und Pod-Docking statt ausschließlich
  am Ende des Gesamtumbaus

---

## 🎯 0.9.1 — Responsive UI & Replay

**Ziel:** Die gemeinsame Tischgeometrie auf alle unterstützten Oberflächen und
den HandReplayer übertragen.

- [ ] Desktop-, Tablet- und Android-Abstände, Header-Kompression und
  Table-Shell-Formel aus derselben Geometriequelle ableiten
- [ ] Phone-Landscape: Actionbar-Usability, sichtbaren Slider und kompakte
  Buttons auf Basis der Android-Prototyperkenntnisse finalisieren
- [ ] HandReplayer auf dieselbe TableSurface und TableGeometry umstellen
- [ ] **Replayer-Touch**: Android-Overlay und kleine Browser-Screens mit
  größeren Controls und geeigneten Touch-Gesten zuverlässig bedienbar machen
- [ ] Browser-Mobile bleibt ein funktionaler Fallback; keine PWA und keine
  vollständige Parität mit dem nativen Android-Layout

### Release-Gate

- [ ] NLHE und PLO mit Heads-up, 6-max und Full Ring auf Desktop, Tablet und
  Android-Landscape ohne Pod-, Karten-, Bet- oder Control-Überlagerungen
- [ ] Viewport- und Geräte-Matrix gegen abgeschnittene Inhalte, falsche
  Bet-Zuordnung sowie Abweichungen zwischen Spiel und Replay
- [ ] Visuelle Freigabe der finalen Plattformkomposition
- [ ] Browser-Demo als öffentliche Beta mit bekannten Einschränkungen,
  rollenbezogenen Formularen und getrennten Kanälen für Bugs und Eindrücke
  ausweisen

---

## 🎯 0.9.2 — Naming, Branding & Controls

**Ziel:** Endgültige Projektidentität und ein eigenständiges Erscheinungsbild
statt PokerStars-Optik festlegen, bevor Release Candidate, Packaging und
breitere Kommunikation beginnen.

- [ ] **Naming-Checkpoint**: „CPCdigital“ ausdrücklich als bisherigen
  Arbeitstitel prüfen und den endgültigen Projekt-/Produktnamen vor dem
  Release Candidate festlegen
- [ ] Kandidat **CheckBack** anhand der dokumentierten Stärken, Kollisionen und
  Verfügbarkeitsprüfungen bewerten ([Naming-Notizen](docs/product-naming.md))
- [ ] Auffindbarkeit, Verwechslungsrisiken, Repository-/Domain-Namen sowie
  technische Bezeichner wie Paket- und App-IDs vor einer Umbenennung gemeinsam
  bewerten
- [ ] Finalen Namen konsistent in UI, Dokumentation, Paketmetadaten,
  Repository-Beschreibung und Distributionshinweisen anwenden
- [ ] Schlanke Marken- und Forkrichtlinie erst für die endgültige Identität
  formulieren: Herkunftsnennung erlauben, offizielle Zugehörigkeit nicht
  vortäuschen und AGPL-Rechte nicht einschränken
- [ ] Unaufdringlichen „Über / Lizenz / Quellcode“-Hinweis mit Copyright,
  AGPL-Lizenz und offiziellem Repository in die Anwendung integrieren
- [ ] **Branding-Review**: Action-Buttons von PokerStars-Rot auf das endgültige
  Projektfarbschema umstellen
- [ ] 4-Color-Deck-Option (alternative Kartendarstellung)
- [ ] BB-Anzeige-Modus (Stacks, Bets, Pot in Big Blinds)
- [ ] Währungswahl um "Keine" erweitern (nur Zahlen, kein €/$)
- [ ] Min-/Max-Bet direkt in der Oberfläche anzeigen
- [ ] Session-Log (PokerStars-Dealer-Stil, einklappbar links unten)

---

## 🎯 0.9.3 — Essenzielles visuelles und akustisches Feedback

**Ziel:** Vor v1 eindeutiges, dezentes Spielgefühl schaffen, ohne Engine oder
Replay von einer komplexen Animationspipeline abhängig zu machen.

- [ ] Rein präsentationale CSS-Animationen für Deal/Reveal, Bet-/Pot-Änderung,
  aktiven Spieler und Gewinner
- [ ] Animationen dürfen Eingabe, Engine-Fortschritt und deterministisches
  Replay nicht steuern oder blockieren
- [ ] Dezente offline erzeugte Web-Audio-Sounds für Karten, Chips und
  Handabschluss; keine Musik und keine Stimmen
- [ ] Persistenter globaler Mute-Schalter und konservative Standardlautstärke
- [ ] `prefers-reduced-motion` respektieren und alle Zustände auch ohne
  Animation eindeutig darstellen

---

## 🎯 0.9.4 — Hardening, Accessibility & UI-Testing

**Ziel:** Fehlerfälle, Desktop-Sicherheitsgrenzen, Performance und
Bedienbarkeit vor dem Packaging gezielt absichern.

- [ ] React-ErrorBoundary mit lokaler Recovery-Ansicht, Neustart,
  Setup-Rückkehr und kopierbarem Diagnosebericht statt leerem Screen
- [ ] Unbehandelte Fehler und Promise-Rejections ausschließlich lokal für den
  Diagnoseexport erfassen; keine Telemetrie oder automatische Übertragung
- [ ] Electron-Renderer mit Sandbox und Content Security Policy härten sowie
  Navigation, externe Links und IPC-Eingaben auf erlaubte Fälle begrenzen
- [ ] Vollständigen Spiel-Smoke ohne Netzwerkverbindung für den gebauten
  Client und Electron durchführen
- [ ] Performance-Test für lange Sessions (>500 Hände) mit UI-Komponenten
- [ ] Render-Tests für neue UI-Komponenten (TableGeometry, Animationen)
- [ ] responsive Test-Matrix (Desktop, Tablet, Phone-Landscape)
- [ ] native Android-Matrix für Cutouts, Systemleisten, Zurück-Taste,
  Resume-Verhalten und unterstützte Displaygrößen
- [ ] Tastatursteuerung, Fokusführung, Kontrast und Reduced-Motion prüfen

---

## 🎯 0.9.5 — Packaging-Smoke & Release Candidate

**Ziel:** Den Kandidaten für v1.0 auf den tatsächlich unterstützten
Desktop-Plattformen bauen und mit einer schlanken, hobbyprojektgerechten
Abschlusskontrolle prüfen.

- [ ] Windows-Paket und Linux-AppImage aus dem versionierten Quellstand bauen
- [ ] Beide Pakete auf einer sauberen Umgebung installieren beziehungsweise
  starten und Setup, NLHE, PLO sowie Replay ohne Netzwerkverbindung prüfen
- [ ] Lizenztext, Copyright-, Drittanbieter- und Source-Hinweise in beiden
  Distributionswegen bereitstellen
- [ ] Paketinhalt auf lokale Entwicklungsdaten, Secrets und unnötige
  Server-Artefakte prüfen
- [ ] Unterstützte Systeme, Installationsweg und bekannte Einschränkungen
  knapp dokumentieren
- [ ] Windows- und Linux-Artefakte als öffentliche Vorabversion mit
  strukturiertem Fehlerformular gegen reale Installationen prüfen
- [ ] Release-Candidate taggen und nach dem vollständigen Gate bis v1.0
  inhaltlich unverändert lassen

> Checksummen können mit geringem Aufwand ergänzt werden, blockieren v1 aber
> nicht. Code-Signierung, Auto-Updates, bitgenau reproduzierbare Builds,
> SBOM-/Provenance-Pipelines und eine breite Distributionsmatrix sind für den
> nichtkommerziellen Erstrelease ausdrücklich kein Pflichtumfang.

---

## 🎯 1.0.0 — Stable Core Release

**Ziel:** Ein stabiles Offline-Pokerspiel mit NLHE und PLO sowie belastbarem
Fundament für spätere Lern- und Variantenmodule.

### Enthalten

- [x] NLHE vollständig spielbar
- [x] Omaha High vollständig spielbar
- [x] 4 unterscheidbare Bot-Archetypen mit Personality, Skill, Reads, Mental State
- [x] vollständige Hand History und Replay
- [x] Decision Records und erklärbare Bot-Scores
- [x] Session-Statistiken (Live-VPIP/PFR, BB/100)
- [ ] stabiles Desktop-Packaging
- [ ] Dokumentation für Architektur und Variantenmodule

### Release-Gates

- [ ] Keine bekannten kritischen Engine-, Replay- oder Datenintegritätsfehler
- [ ] NLHE- und PLO-Kalibrierung auf der dokumentierten 10k-Release-Stufe
- [ ] Desktop-, Tablet- und unterstütztes Landscape-Layout bestehen die responsive Testmatrix
- [ ] Migrationen für Roster, Replays und Sessiondaten sind rückwärtsverträglich getestet
- [ ] Beschädigte lokale Daten und UI-Laufzeitfehler führen zu einer
  verständlichen Recovery statt stillem Datenverlust oder leerem Screen
- [ ] Electron-Sandbox, CSP, Navigation, externe Links und IPC bestehen die
  dokumentierten Sicherheitsprüfungen
- [ ] Server-Paket ist nachweislich kein Laufzeitbestandteil des Offline-v1-Builds
- [ ] Endgültiger Projektname und Außenauftritt sind vor Packaging und
  breiterer Distribution konsistent festgelegt
- [ ] Offene Blocker aus geführter Alpha, Browser-Beta und öffentlichem
  Release-Candidate sind behoben oder nachvollziehbar außerhalb des
  v1-Umfangs eingeordnet
- [ ] Der geprüfte 0.9.5-Release-Candidate wird ohne funktionale Änderungen als
  v1.0.0 veröffentlicht

### Packaging

- [ ] Windows
- [ ] Linux / AppImage

Der Android-Prototyp bleibt ein Entwicklungsziel und blockiert v1.0 nicht. Eine
signierte APK/AAB sowie öffentliche Distribution werden erst nach der
UI-Stabilisierung separat entschieden.

### Nach v1.0 verschoben

- **2-7 Draw Family** — Single Draw und Triple Draw als gemeinsamer Architekturstrang
- **Stud Light** (Architektur-Proof offene Karten) — Teil der späteren Stud-Familie

---

# Phase 5 — Meta-Game

## 🎯 1.0.1 — Bankroll-System

**Ziel:** Spielgeld kriegt Wert durch Konsequenz. Gutes Bankroll-Management führt zum
Aufstieg, schlechtes zum Abstieg. Kurze Stacks und "eh egal, ist nur Spielgeld" werden
durch Guardrails verhindert.

### Konzept

Der Setup-Screen bekommt einen Modus-Toggle:

| Modus | Stakes | Buy-in | Rebuys | Bankroll |
|-------|--------|--------|--------|----------|
| **Training** (Status quo) | Frei wählbar | Startstack = 100 BB | Unbegrenzt, Auto | Kein Tracking |
| **Bankroll** (1.0.1) | Guardrail (20 BI min) | 60–100 BB | 1×/Hand, von BR abgezogen | Persistent, Auf-/Abstieg |

Training ist die Sandbox: neue Varianten ausprobieren, Strategien testen, ohne Konsequenzen.
Bankroll ist der Ernstfall: jedes Buy-in zählt, jeder Rebuy kostet, schlechtes BRM → Abstieg.
Session-Stats (VPIP/PFR/BB aus 0.7.4) laufen in beiden Modi.

- **Start-Bankroll**: Fester, aber variantenspezifischer Betrag aus dem
  jeweiligen Risikoprofil. Kein freies Wählen — der Spieler startet mit genug
  Tiefe für die Varianz der gewählten Variante.
- **Stake-Leiter**:

  | Stake | Blinds | Buy-in (60–100 BB) | Aufstieg ab | Abstieg unter |
  |-------|--------|---------------------|-------------|---------------|
  | NL2  | 0.01/0.02 | €1.20–2.00 | €80 (40 BI) | €40 (20 BI) |
  | NL5  | 0.02/0.05 | €3.00–5.00 | €200 | €100 |
  | NL10 | 0.05/0.10 | €6.00–10.00 | €400 | €200 |
  | NL25 | 0.10/0.25 | €15.00–25.00 | €1.000 | €500 |
  | NL50 | 0.25/0.50 | €30.00–50.00 | €2.000 | €1.000 |

- **Guardrails**: Spieler KANN auf höhere Stakes springen, aber nur wenn die
  Bankroll das Minimum (20 BI für den Ziel-Stake) deckt. Der Stake-Button ist
  ausgegraut, Tooltip: "Du brauchst mindestens €X für NL50". Keine Short-Stack-
  Option — Buy-in immer 60–100 BB.

- **Rebuy**: 1× pro Hand möglich, Betrag wird von der Bankroll abgezogen.
  Buy-in-Betrag frei wählbar innerhalb der Range (60–100 BB). Kein Auto-Rebuy.

- **Auf-/Abstieg**: Automatisch. 40 BI für den nächsthöheren Stake erreicht → Aufstieg.
  Unter 20 BI gefallen → Abstieg mit Meldung.

- **Getrennte Bankrolls**: NLHE und PLO separat — verschiedene Spiele, verschiedene
  Bankrolls. Der Spieler kann in NLHE auf NL25 sein und in PLO auf NL5.

- **Variantenspezifisches Risikoprofil**: Eine universelle Zahl von Buy-ins
  gilt nicht für alle Spiele. PLO erhält wegen engerer Equities, häufigerer
  Multiway-Pots und größerer Pots höhere Start-, Aufstiegs- und
  Abstiegsreserven als NLHE. Fixed-Limit-Familien werden später in Big Bets
  statt in 100-BB-Buy-ins geführt; Turniere verwenden eigene Tournament-Buy-ins.

  | Variantenfamilie | Vorläufige Startreserve | Aufstieg | Abstieg |
  |------------------|--------------------------|----------|---------|
  | NLHE | ca. 40 Buy-ins | 40–50 BI des Ziel-Stakes | unter 20–25 BI |
  | PLO | ca. 60–80 Buy-ins | 60–80 BI des Ziel-Stakes | unter 35–40 BI |
  | Fixed Limit | noch offen, in Big Bets | empirisch kalibrieren | empirisch kalibrieren |

  Diese Werte sind Designkorridore, keine finalen Regeln. Maßgeblich werden
  simulierte Bankrollverläufe mit CPCdigitals tatsächlichen Bot-Winrates,
  Varianz, Tischformaten und Rake-Modell.

- **Stakeabhängige Gegnerpools**: Stakes wählen keine Aktion direkt, sondern
  gewichten geeignete Identitäten und den Skill der aktuellen Variante.
  Benachbarte Stake- und Varianten-Pools überlappen sich. Auf Micros bleiben
  alle Archetypen verfügbar; Calling Stations werden mit steigenden Stakes
  seltener und fehlen auf hohen Stakes. Höhere Stakes erhöhen vor allem
  Qualität und Dynamik der Anpassung, nicht solverartige Perfektion.

- **Action Clock**: Stake-Bänder dürfen ein passendes Clock-Profil vorschlagen,
  aber keinen unveränderlichen Bedienungsdruck erzwingen. Training kann ohne
  Zeitlimit laufen; Bankroll startet mit `Standard`, höhere Stakes können
  `Schnell` vorauswählen. Timeout führt ausschließlich zu Check oder Fold.

- **Game Over**: Bankroll unter 1 BI für NL2 → zurück zum Setup mit der Option
  neu zu starten. Session-Stats bleiben erhalten (Lessons Learned).

- [ ] variantenspezifische Start-Bankroll im Setup
- [ ] Stake-Selector mit Guardrails (ausgegraut wenn Bankroll zu niedrig)
- [ ] Buy-in-Slider (60–100 BB) im Setup + Rebuy-Dialog
- [ ] Bankroll-Tracking persistent über Sessions
- [ ] versioniertes `VariantBankrollProfile` mit Einheit, regulärem Buy-in,
  Startreserve sowie Auf-/Abstiegsgrenzen pro Variantenfamilie definieren
- [ ] beim erstmaligen Freischalten einer Variantenfamilie eine eigene
  Startbankroll auf deren niedrigstem Stake anlegen; Gewinne anderer Varianten
  schalten keine hohen Stakes der neuen Variante frei
- [ ] Risk-of-Ruin- und Bankrollverlaufs-Simulationen für NLHE und PLO über
  mehrere plausible Nutzer-Winrates ausführen und Designkorridore kalibrieren
- [ ] Fixed-Limit-Bankroll in Big Bets und spätere Turnierbankroll in
  Tournament-Buy-ins ohne gemeinsame 100-BB-Annahme modellieren
- [ ] Aufstiegs-/Abstiegs-Benachrichtigung
- [ ] BB/100 und Bankroll in der Session-Stats-Kopfleiste
- [ ] versionierte Stake-/Skill-Profile und gewichtete Archetypenverteilung
- [ ] überlappende Identity-Pools für benachbarte Stakes mit stabilen
  Archetypen und plausiblen persönlichen Skillkorridoren
- [ ] Variantenaffinität und effektiven Variantenskill bei Tischbesetzung,
  Stake-Zulassung und Ersatzspielern berücksichtigen
- [ ] Kalibrierungs- und Probesession-Gates nach Stake-/Skillband ergänzen
- [ ] Clock-Profil pro Modus und Stake vorbelegen, aber als
  Accessibility-/Komfortoption änderbar lassen

---

## 🎯 1.0.2 — Globale Statistiken

**Ziel:** Session-übergreifendes Tracking mit Filterung und Vergleich.

- [ ] Persistente, versionierte Globalstatistik (Sessions, WTSD, W$SD, BB/100)
- [ ] Filter nach Variante, Tischgröße, Stakes, Zeitraum
- [ ] Single- und Multitable-Sessions getrennt filtern und vergleichbar machen
- [ ] BB/100 als primäre Vergleichsmetrik pro Stake
- [ ] Bankroll-Verlauf als Graph (optional, minimal)

---

## 🎯 1.0.3 — Wiederkehrende Gegner & Spielernotizen

**Ziel:** Beobachtung über mehrere Sessions belohnen, ohne stabile Bots in eine
endliche Sammlung dauerhaft gelöster Profile zu verwandeln.

- [ ] freie Notiz und wenige optionale manuelle Tags an die stabile
  `BotIdentity.id` binden
- [ ] Notizen am Tisch und aus dem Replayer bearbeiten; Datum, Stake und
  optionale Handreferenz sowie die gespielte Variante speichern
- [ ] Notizen in die versionierte lokale Persistenz sowie Export/Backup
  aufnehmen
- [ ] keine automatische Archetyp-/Skill-Bestätigung, kein Roster-Fortschritt
  und zunächst kein automatisches HUD einführen
- [ ] chronologische, stakebezogene Beobachtungen unterstützen, damit Reads
  aktualisiert statt als endgültige Lösung abgehakt werden
- [ ] grobe faire Erinnerung wiederkehrender Bots an den Nutzer prüfen, damit
  Wiedererkennung nicht ausschließlich einseitig zugunsten des Menschen wirkt
- [ ] Notizfunktion erst freigeben, wenn strategische und mentale Bot-Dynamik
  ausreichend angeschlossen und per Probesession belegt ist

Das detaillierte Konzept einschließlich Rostergröße, Stake-Gewichten,
Anti-Exploit-Grenzen und Akzeptanzkriterien steht in
[Bot-Dynamik, Stake-Roster und Spielernotizen](docs/bot-dynamics-roster-and-notes.md).

---

## 🎯 1.0.4 — Optionales Multitabling

**Ziel:** Erfahrenen Spielern mehrere parallele Tische erlauben, ohne den
beobachtungsorientierten Einstieg, das Bankrollsystem oder die mobile
Bedienbarkeit zu beschädigen.

### Produktgrenzen

- [ ] Single Table bleibt Standard und ist in Einsteiger-Lernpfaden sowie
  geführten Übungen verbindlich
- [ ] Multitabling erst nach einer fortgeschrittenen Lektion oder über eine
  ausdrücklich aktivierte Expertenoption freischalten; nicht allein an einen
  Stake-Aufstieg koppeln
- [ ] zunächst höchstens zwei parallele Tische auf Desktop zulassen; vier
  Tische erst nach UX-, Performance- und Probesession-Evidenz prüfen
- [ ] Android wegen Bildschirmgröße zunächst auf einen Tisch begrenzen
- [ ] Pre-Selections, sichere Auto-Actions, Action-Clock und Fokusmeldungen als
  technische Voraussetzungen behandeln
- [ ] jede Bot-Identität darf nur an einem gleichzeitig laufenden Tisch sitzen
  und wird aus dem passenden Stake-Pool gezogen
- [ ] Buy-ins und Rebuys aller offenen Tische atomar gegen die verfügbare
  Bankroll buchen; gebundenes Gesamtrisiko sichtbar anzeigen
- [ ] unabhängige Runner, Hand Histories, Replays und Session-Enden pro Tisch
  ohne vermischte Aktionen oder Timer modellieren
- [ ] Tisch mit anstehender Hero-Aktion klar hervorheben; keine automatische
  strategische Entscheidungshilfe ergänzen
- [ ] Statistiken und Session-Analyse nach Anzahl paralleler Tische auswerten,
  damit geringere Entscheidungsqualität und Winrate sichtbar werden

Multitabling ist eine freiwillige fortgeschrittene Spielweise, kein höherer
Schwierigkeitsgrad und keine Voraussetzung für Bankrollfortschritt. Die
zugehörige Learning-Lektion muss vor der regulären Freigabe vorhanden sein.

---

# Phase 6 — Learning Layer

> Die Learning-Schicht ist das, was CPCdigital von anderen Poker-Apps unterscheidet.
> Jede neue Variante profitiert sofort von Wiki, Tutorials und Analyse.
> Die Daten sind seit v0.2 vorhanden — die UI-Schicht kommt jetzt.

## 🎯 1.1.0 — Wiki und Glossar

**Ziel:** Eine gemeinsame Wissensbasis für Regeln, Begriffe und Grundlagen.

- [ ] variantenspezifische Regelübersichten
- [ ] Handrangfolgen
- [ ] Glossar für Pokerbegriffe
- [ ] grundlegende Strategiekonzepte
- [ ] typische Anfängerfehler
- [ ] Beispiele mit konkreten Händen
- [ ] Querverweise zwischen verwandten Begriffen
- [ ] kontextbezogene Links aus Tisch, Replay und Analyse

---

## 🎯 1.2.0 — Tutorial-Modus

**Ziel:** Spieler schrittweise vom Regelverständnis zum freien Spiel führen.

- [ ] interaktive Grundregel-Tutorials
- [ ] geführte Beispielhände
- [ ] Erklärung der aktuellen Setzrunde
- [ ] Erklärung erlaubter Aktionen und Bet-Limits
- [ ] Draw- und Showdown-Tutorials
- [ ] optionale Strategiehinweise
- [ ] Lernpfade pro Variante
- [ ] Einsteiger-, Standard- und Puristen-Hilfestufe
- [ ] fortgeschrittene Multitabling-Lektion zu Aufmerksamkeit,
  Entscheidungszeit, Pre-Selections, Gesamt-Bankrollrisiko und sinkender
  Qualität eigener Reads
- [ ] kontrollierte Vergleichsübung mit einem gegenüber zwei Tischen und
  anschließender Auswertung von Entscheidungszeit und Fehlern

---

## 🎯 1.3.0 — Session-Analyse anhand konkreter Hände

**Ziel:** Entscheidungen statt bloßer Ergebnisse erklären.

- [ ] wenige interessante Hände pro Session auswählen
- [ ] Entscheidungssicht und Ergebnissicht trennen
- [ ] relevante Faktoren zum Entscheidungszeitpunkt anzeigen
- [ ] gute Entscheidungen trotz schlechtem Ergebnis hervorheben
- [ ] schlechte Entscheidungen trotz gewonnenem Pot erklären
- [ ] knappe und gegnerabhängige Spots kennzeichnen
- [ ] alternative Aktionen verständlich einordnen
- [ ] übertragbare Lektion pro Beispielhand
- [ ] passende Wiki-Begriffe verlinken
- [ ] keine falsche GTO-Exaktheit vortäuschen

### Analyseformat

```text
Was ist passiert?
→ Welche Informationen waren bekannt?
→ Welche Faktoren waren entscheidend?
→ Wie ist die Aktion einzuordnen?
→ Welche Alternativen gab es?
→ Was lässt sich daraus lernen?
```

---

## 🎯 1.4.0 — Poker-Rätsel

**Ziel:** Konkrete Situationen trainieren — inspiriert von existierenden Puzzle-Apps,
aber mit tieferer Erklärungsschicht statt nur "richtig/falsch".

- [ ] feste Grundlagenrätsel (Preflop, Postflop, Bet-Sizing)
- [ ] Fold-, Call-, Raise- und All-in-Entscheidungen
- [ ] Draw- und Pat-Entscheidungen
- [ ] Range- und Read-Aufgaben
- [ ] Fehler in einer Hand finden
- [ ] mehrstufige Hände nachspielen
- [ ] Schwierigkeitsgrade
- [ ] **Erklärungsschicht**: Warum ist Aktion X besser als Y? Welche Faktoren waren entscheidend?
- [ ] persönliche Rätsel aus eigenen Sessions generieren

---

# Phase 7 — Mehr Varianten

> Neue Varianten bauen auf den existierenden Architektur-Grundlagen auf
> und profitieren direkt von Wiki, Tutorials und Rätseln aus Phase 6.

### Variantenübergreifende Bot-Kompetenz

- [ ] Für jede neue Variantenfamilie eigenes `variantProficiency` und
  `variantAffinity` ergänzen, ohne Identität, Grundpersönlichkeit und
  allgemeinen Skill neu auszulosen
- [ ] Archetypen in die strategische Sprache der Variante übersetzen statt
  NLHE-Aktionslogik zu übertragen
- [ ] Gegner-Reads und Spielernotizen mit Variantenkontext persistieren; eine
  grobe allgemeine Reputation darf identitätsgebunden bleiben
- [ ] den globalen Roster bei Bedarf um geprüfte Draw-/Stud-Spezialisten
  erweitern; die nahe Zielgröße von ungefähr 64 ist kein dauerhaftes Hard-Limit
- [ ] Kalibrierung und Probesessions pro Varianten-, Skill-, Stake- und
  Tischformat-Kombination planen

## 🎯 1.5.0 — 2-7 Draw Family

**Ziel:** Draw-Poker nach dem stabilen v1-Kern als zusammenhängendes
Variantenmodul einführen, zunächst Single Draw und darauf aufbauend Triple Draw.

- [ ] 2-7-Lowball-Handrangfolge
- [ ] `DrawPhaseDefinition`, Kartentausch und Draw-History in der Engine
- [ ] 2-7 Single Draw mit No-Limit-Setzstruktur
- [ ] `VariantEvaluator` für Draw-Qualität, Discards, Pat und Snowing
- [ ] anschließend Triple Draw mit drei Draws und vier Fixed-Limit-Setzrunden
- [ ] mehrstufige Pat-/Draw-/Bluff-Strategien für Bots
- [ ] Regelhinweise, Tutorial- und Rätselmaterial

---

## 🎯 1.5.1 — Omaha Hi-Lo

**Ziel:** Direkte Erweiterung von Omaha High (0.7.1) — Split-Pot mit Low-Qualifier.

- [ ] High-/Low-Auswertung (A-5 Lowball)
- [ ] Qualifier-Regeln (8-or-better)
- [ ] Split- und Quarter-Pot-Logik
- [ ] Low-Draw- und Scoop-Bewertung
- [ ] Bot-Strategie: Two-Way-Hands, Scoop-Potential

---

## 🎯 1.6.0 — Badugi

**Ziel:** Dritte Draw-Variante mit fundamental anderem Hand-Ranking.

- [ ] Badugi-Handrangfolge (4 Karten, verschiedene Farben, keine Pairs)
- [ ] Draw-Regeln (1–4 Karten tauschen, 3 Ziehrunden)
- [ ] Pat-Signale und Snowing
- [ ] botseitige Draw- und Blufflogik

---

## 🎯 1.7.0 — Stud-Familie (Razz + Seven Card Stud)

**Ziel:** Stud-Spiele als eigene Kategorie — offene Karten im `BotContext`.

- [ ] Razz (A-5 Lowball, 7 Cards, keine Draws)
- [ ] Seven Card Stud (High, 7 Cards, offene Karten)
- [ ] `BotContext` um `visibleOpponentCards` erweitert
- [ ] Ante-, Bring-in- und Street-Logik (3rd–7th Street)
- [ ] Vereinfachte Bot-AI für Stud als erster Architektur-Proof

---

# Phase 8 — Plattformen & Multiplayer

## 🎯 1.8.0 — Android-Distribution (optional)

Die technische Grundlage und der lokale Debug-Workflow bestehen seit v0.7.7.
Nach der UI- und Gerätevalidierung aus v0.9.0–v0.9.4 wird entschieden, ob daraus
ein öffentlich vertriebener Android-Client entsteht. Der Prototyp darf
unabhängig davon als internes Testziel weiterlaufen.

- [ ] unterstützte Smartphones, Tablets, Tischformate und Varianten festlegen
- [ ] App-Icons, Splashscreen, Berechtigungen und Produktionskonfiguration
  abschließen
- [ ] signierte APK/AAB reproduzierbar bauen und Upgrade-Pfad testen
- [ ] AGPL-konforme Source-, Lizenz- und Drittanbieterhinweise im
  Distributionsweg bereitstellen
- [ ] GitHub Release, alternativen Store oder Play Store bewusst auswählen

> Eine PWA ist nicht vorgesehen. Geometriearbeit bleibt in 0.9.0,
> Touch-Integration in 0.9.1 und die native Geräte-/Lifecycle-Matrix in 0.9.4.

---

## 🎯 1.9.0 — Table Rules & Multiplayer-Readiness

**Ziel:** Sonderregeln als allgemeine, deterministische Engine-Erweiterungen vorbereiten.

- [ ] allgemeines `TableRules`-Framework getrennt von Variantenregeln definieren
- [ ] Kompatibilitätsprüfung zwischen Pokervariante, Betting-Struktur und Sonderregel
- [ ] Pflichtbeiträge, übersprungene Phasen, zusätzliche Boards sowie Bonusabrechnungen modellieren
- [ ] Main- und Side-Pots bei mehreren Boards beziehungsweise zusätzlichen Auszahlungen korrekt abrechnen
- [ ] Sonderregeln vollständig in Hand History, Decision Snapshots und deterministischen Replays erfassen
- [ ] protokollneutrale Zustimmungs-, Timeout- und Ablehnungs-Events für spätere Spielerentscheidungen vorbereiten
- [ ] Single-Board Bomb Pot als erster offline testbarer Proof

### Freigabe ab v2.x

- Sonderregeln in Lobbys beziehungsweise Tisch-Setups für echte Spieler auswählbar machen
- Run It Twice, Bomb Pots und 7-2-Game/Bounty im Multiplayer
- Online-Multiplayer frühestens ab v2.0 und weiterhin nur als langfristige Option

---

## Später / Unerforscht

Diese Themen sind notiert, aber weder priorisiert noch im Scope einer bestimmten Version.
Sie können in zukünftige Phasen einsortiert oder verworfen werden.

| Thema | Kategorie | Notizen |
|-------|-----------|---------|
| Short Deck (6+) | Variante | Community-Card, 36-Karten-Deck, angepasste Hand-Ranks |
| Stud Hi-Lo | Variante | Erweiterung von 1.7.0 |
| Mixed Games (HORSE) | Variante | Rotation mehrerer Varianten, Session-Format |
| Tournament-Modus | Spielmodus | Blinds steigen, Payout-Struktur, ICM |
| Lokaler Multiplayer | Plattform | Hot-Seat, gleicher Rechner |

---

# Technische Struktur

```text
packages/
├── client/src/                    aktuell flach, langfristig:
│   ├── session/                   ✓ LocalGameRunner, Rebuys, Replay, Export
│   ├── components/                ✓ PokerTable, PlayerSeat, Cards
│   ├── screens/                   ✓ SetupScreen, TableScreen
│   └── utils/                     ✓ format, positions
├── poker-engine/                  ✓ Regeln, State Machine, Hand-Evaluator
├── shared/                        ✓ gemeinsame Typen
├── electron/                      ✓ Desktop-Wrapper (main, preload)
├── server/                        ruhender Online-Prototyp für eine mögliche v2-Integration
│
│   # Zielarchitektur (noch nicht umgesetzt):
├── variant-modules/               NLHE, Omaha, 2-7 Draw, Stud (je eigener Ordner)
├── bots/                          Decision Engine, Personality, Reads, Mental State
├── analysis/                      Decision Records, Replay, Session-Analyse
└── knowledge/                     Wiki-, Tutorial- und Rätselinhalte
```

---

# Wichtigste Änderung gegenüber der alten Roadmap

Die App bleibt bis Version 1.0 primär ein stabiles Singleplayer-Pokerspiel. Sie wird aber bereits so gebaut, dass jede Entscheidung später erklärt, wiederholt und als Lerninhalt verwendet werden kann.

```text
Vor v1.0:
spielen, Bots testen, Hände speichern, Entscheidungen nachvollziehbar machen

Ab v1.0:
erklären, trainieren, analysieren und persönliche Rätsel erzeugen
```

## Leitgedanke

> Erst ein gutes Pokerspiel bauen. Dabei aber keine Daten oder Architekturentscheidungen verlieren, die später für eine gute Lernplattform notwendig sind.
