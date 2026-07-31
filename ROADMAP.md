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

> **Roster-Erweiterung (44→80+):** Läuft inkrementell und qualitätsgetrieben.
> Neue Identitäten werden ergänzt, wenn Session-Wiederholungen oder fehlende
> Charakterprofile einen konkreten Bedarf zeigen; es gibt keine Quote pro Release.
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
  mobile Geometrie nach 0.9.1 verschoben und nicht nutzbaren Export im
  Android-Prototyp ausgeblendet
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
  releasefähig einordnen; funktionslosen Android-Export ausblenden und
  vollständiges Touch-/Geometrie-Redesign nach 0.9.1 verschieben
- [x] Bestehende Client-, Responsive- und Android-Debug-Builds erneut
  erfolgreich ausführen
- [x] verkürzte Varianten-, Format- und Lifecycle-Matrix auf echter Hardware
  abschließen

---

## ✅ 0.7.8 — PLO 3-Bet-Steuerung & Strategie-Tabelle

**Ziel:** TAG- und LAG-3-Bet in FR/6-max in den Zielkorridor bringen, ohne
globale Aggression zu senken oder VPIP/PFR zu verschieben.

### Implementiert

- **PLO-Preflop-Strategie-Tabelle** (`PLO_PREFLOP_STRATEGY`): Archetyp-,
  situations- und handkategorieabhängige preferred action für alle 4 Archetypen
  (TAG/Nit/LAG/CS). Fehlende Einträge geben keine Strategiesteuerung → Bot
  entscheidet nach Category Scores.
- **PLO-skalierte Strategie-Matrix** in `preflopStrategyFactors()`: Für PLO
  werden abgeschwächte Werte verwendet (raise→raise=12, call→call=10,
  call→raise=0, fold→raise=-20). NLHE-Pfad unverändert.
- **Bot-Tag-Integration**: `preflopRangeAction` wird für PLO über
  `getPloPreflopAction()` befüllt (vorher `undefined`).
- **LAG-Korrektur**: facing-open good→call statt raise, facing-3bet good→fold
  (reduziert überhöhte 3-Bets ohne VPIP zu drücken).
- **CS-Korrektur**: unopened medium→call entfernt (CS VPIP von 56% auf 45%
  gesenkt).

### Ergebnisse (10k PLO)

| Archetyp | Format | 3-Bet | Ziel | VPIP | PFR | AF | WTSD |
|----------|--------|-------|------|------|-----|-----|------|
| TAG | FR | **8.62%** ✅ | 5–11% | 32.5% ⚠️ | 16.2% ✅ | 3.26 ✅ | 32.7% ✅ |
| TAG | 6-max | **8.46%** ✅ | 7–13% | 38.2% ⚠️ | 21.4% ✅ | 4.14 ⚠️ | 33.3% ✅ |
| LAG | FR | **13.13%** ✅ | 8–16% | 36.5% ✅ | 18.7% ✅ | 2.31 ⚠️ | 27.1% ✅ |
| LAG | 6-max | **14.66%** ✅ | 9–18% | 45.2% ✅ | 24.8% ✅ | 2.73 ✅ | 25.2% ⚠️ |
| Nit | FR | **3.05%** ✅ | 3–7% | 24.7% ⚠️ | 13.0% ✅ | 9.47 ❌ | 41.5% ❌ |
| CS | FR | **1.07%** ✅ | 1–7% | 45.3% ✅ | 5.9% ✅ | 1.27 ✅ | 40.7% ✅ |

### Bekannte Abweichungen

| Metrik | Wert | Target | Grund |
|--------|------|--------|-------|
| Nit AF / WTSD | 9.47 / 41.5% FR | 1.5–3.5 / 25–36% | Prä-existierendes Postflop-Score-Problem; Strategie-Tabelle greift nur preflop |
| TAG VPIP | 32.5% FR, 38.2% 6-max | 22–32% / 28–38% | Leicht über Target, aber nah an v0.7.6-Baseline (26%) mit 3k-Varianz |
| HU | archetypabhängig | siehe `simulation.ts` | Für 0.8.0 vorgemerkt |
| NLHE C-Bet | TAG 65.4%, LAG 86.5% FR | 35–55% / 45–70% | Prä-existierend, nicht Teil dieses Fixes |

### Release-Gate

- [x] 3k-Entwicklungsläufe ohne Invalid-Action-Fallbacks
- [x] 10k-Bestätigungslauf für alle vier PLO-Archetypen und drei Formate
- [x] NLHE-Regressionstest (3k, alle Archetypen im Ziel)
- [x] 178 Unit-Tests grün
- [ ] Kalibrierungsbericht versionieren (Zwischenstand dokumentiert)

---

# Phase 4 — Stabilisierung & Release-Vorbereitung

## 🎯 0.8.0 — HU-Strategie (Heads-up)

**Ziel:** Heads-up-Verhalten messbar verbessern. Kalibrierungs-Targets existieren bereits in `simulation.ts`, die tatsächlichen Werte weichen aber ab — Diagnose aus der 0.7.1-Kalibrierung.

- [ ] HU-spezifische Preflop-Ranges validieren und nachjustieren (Anker in `preflop-ranges.ts` vorhanden)
- [ ] Postflop-Linien für HU-Dynamik (C-Bet-Frequenz, Float-Resistenz, Bluff-Rate)
- [ ] HU-Kalibrierung: bestehende Targets in `simulation.ts` schärfen (alle 4 Archetypen, NLHE + PLO)

### Release-Gate

- [ ] Integrationstests für HU-Szenarien
- [ ] 3k-Entwicklungsläufe ohne Invalid-Action-Fallbacks
- [ ] 10k-Release-Lauf für alle vier Archetypen in NLHE und PLO

---

## 🎯 0.8.1 — Technische Schuld & Testabdeckung

**Ziel:** Code-Basis konsolidieren und Testlücken schließen vor dem großen UI-Release.

### Refactoring

- [ ] `game.ts` splitten: Showdown-Logik, Player-Management und Betting-Round jeweils in eigene Dateien
- [ ] `LocalGameRunner.ts` splitten: verbleibende Zuständigkeiten nach v0.8.0 entflechten
- [ ] Veraltete Bot-Dateien aufräumen (`bot.ts`, doppelte Helfer)
- [ ] Ruhendes `server`-Paket klar vom v1-Buildpfad getrennt halten und v2-Schnittstellenannahmen dokumentieren
- [ ] Prettier-Konfiguration als separaten mechanischen Commit einführen
- [ ] Dokumentierte Format- und Lint-Befehle ergänzen

### Tests

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

## 🎯 0.8.2 — Session-Flexibilität

**Ziel:** Mehr Kontrolle über die Session.

- [ ] Hero-Name im Setup wählbar (statt immer „You“)
- [ ] Individuelle Starting-Stacks pro Bot
- [ ] Konfigurierbare Buy-in-Grenzen (40–250 BB)
- [ ] Session-Setup mit Variante + Schwierigkeitsmix
- [ ] Integrationstests für Session-Flow (Setup → mehrere Hände → Rebuy)

### Fortlaufend: Bot-Identitäten

- Neue Identitäten nur ergänzen, wenn Namen, Avatare, Traits und Wiedererkennbarkeit gemeinsam geprüft sind.
- Keine feste Quote pro Minor-Version; Session-Abwechslung und Wiederholungsrate bestimmen den Bedarf.
- Persistenzmigrationen und deterministische Seeds bleiben Release-Gates für Roster-Änderungen.

---

## 🎯 0.8.3 — Persistenz & Recovery

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

## 🎯 0.8.4 — UI-Fundament

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

- **Start-Bankroll**: Fixer Betrag (z.B. €200 = 40 BI für NL5). Kein freies Wählen —
  der Spieler startet mit genug Tiefe, um echtes Poker zu spielen.
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

- **Game Over**: Bankroll unter 1 BI für NL2 → zurück zum Setup mit der Option
  neu zu starten. Session-Stats bleiben erhalten (Lessons Learned).

- [ ] Start-Bankroll (fix €200) im Setup
- [ ] Stake-Selector mit Guardrails (ausgegraut wenn Bankroll zu niedrig)
- [ ] Buy-in-Slider (60–100 BB) im Setup + Rebuy-Dialog
- [ ] Bankroll-Tracking persistent über Sessions
- [ ] Aufstiegs-/Abstiegs-Benachrichtigung
- [ ] BB/100 und Bankroll in der Session-Stats-Kopfleiste

---

## 🎯 1.0.2 — Globale Statistiken

**Ziel:** Session-übergreifendes Tracking mit Filterung und Vergleich.

- [ ] Persistente, versionierte Globalstatistik (Sessions, WTSD, W$SD, BB/100)
- [ ] Filter nach Variante, Tischgröße, Stakes, Zeitraum
- [ ] BB/100 als primäre Vergleichsmetrik pro Stake
- [ ] Bankroll-Verlauf als Graph (optional, minimal)

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
