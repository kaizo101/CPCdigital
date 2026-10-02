# Roadmap-Archiv bis 0.8.1

> Englische Fassung: [Roadmap archive through 0.8.1](../../en/plans/roadmap-archive-through-0.8.1.md)

Dieser Stand bewahrt abgeschlossene Meilensteine und damalige offene Punkte.
Offene Checkboxen sind historisch und keine aktuellen Release-Blocker.
Für den aktuellen Plan gilt die [Roadmap](../../../ROADMAP.md).

## Phase 1 — Spielbares Fundament

### 0.1.0 — Offline-Fundament

**Ziel:** Eine vollständig lokal laufende Poker-App als technische Basis.

- [x] Electron-App mit eigenem Fenster
- [x] NLHE gegen Dummy-Bots
- [x] Setup-Screen für Blinds, Chips und Bot-Anzahl
- [x] Pokertisch-UI mit Action-Buttons
- [x] automatischer Start der nächsten Hand
- [x] grundlegendes Komponenten-Refactoring

---

### 0.2.0 — Engine-Härtung und Observability

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

#### Decision Snapshot

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

## Phase 2 — Glaubwürdige Bots

### 0.3.0 — Allgemeine Bot-Architektur

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

#### Bot-Architektur

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

### 0.4.0 — Erste Bot-Persönlichkeiten

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

#### Zielbild

Zwei TAG-Bots sollen dieselbe Grundstrategie besitzen, sich aber dennoch unterscheiden können:

- vorsichtiger Beobachter
- überheblicher Schnellurteiler
- emotional stabiler Grinder
- solider Spieler mit Angst vor großen Pots

---

## Phase 3 — Variantenfähiges Kernspiel

### 0.5.0 — NLHE vollständig spielbar

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

### 0.5.1 — Bugfixes und Balancing

- [x] Queue-Reihenfolge nach All-In/Reraise gefixt (clockwise ab Raiser)
- [x] ReadTyp: Gegner-Bet-Sizing-Tracking (Pot-Fraktion-EMA)
- [x] Reraise-Disziplin postflop (Medium -12, Weak/Air -18, großer Bet -10)
- [x] Raise-Sizing: Short-Stack-Reduktion, Reraise-Faktor 0.75
- [x] Non-Premium-Raises bei ≤20 BB bestraft (-10)
- [x] Parameter-System: `bot-params.ts` zentralisiert ~50 tuning-Knobs
- [x] Auto-Kalibrierer: Random-Search-Optimizer mit Loss-Funktion
- [x] Board-Dangers, Flush-Danger, Reraise-Erkennung, Stack-Management

---

### 0.6.0 — Rebuys, Hand History & Replay

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
- [x] Lesbarer Hand-History-Textexport pro Hand
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

### 0.7.0 — Postflop-Kalibrierung & C-Bet-Fix

**Ziel:** Postflop-Verhalten messbar machen und C-Bet-Rate von 20% auf 47-60% anheben.

#### Numerischer Hand-Score (Hybrid)

- [x] `hand.strength` als numerischer Wert 0-100 mit Draw-Bonus (bis +10)
- [x] Hybrid-Scoring: Kategorie-Basis + Strength-Bonus (kleiner ±5-10 Zusatz) — final, kein Voll-Ersatz geplant

#### Postflop-Kalibrierung

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

#### C-Bet-Analyse & Bugfix

- [x] **"Free card for draw"-Bug**: Bonus galt fälschlich auch für PFA am Flop → entfernt
- [x] **Bluff-C-Bet-Bonus**: +15 für PFA mit Air auf trockenem Board
- [x] **C-Bet-Opportunity**: +12 → +18
- [x] **PFA-Check-Penalty**: −30 für Air-Air/Weak (nicht für Good+)
- [x] Session-Evaluator um C-Bet-Patterns erweitert (PFA missed C-Bet, Fold-to-CBet with playable hand)

#### Ergebnis

| Metrik | Vor Fix | Nach Fix |
|--------|---------|----------|
| TAG C-Bet% | 20% | 47-60% |
| AF (alle) | im Soll | im Soll (teils verbessert) |
| Fold-to-CBet | 71-93% | unverändert → eigener Fix für v0.8 |

48 Metriken im Soll (36 Preflop + 12 Postflop). 228 Tests grün.

---

### 0.7.1 — Omaha High

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

### 0.7.2 — WTSD (Postflop-Fold-Verhalten)

**Ziel:** Showdown-Rate senken — Bots folden postflop zu selten.

- [x] Variant-spezifische Category-Scores: `CategoryScoreTable` in `bot-variant-evaluation.ts`
- [x] `VariantEvaluation.categoryScores` → `DecisionContext` → `bot-action-scoring.ts`
- [x] NLHE: Scores identisch mit `params.scoring.handStrength` (keine Regression)
- [x] PLO: `call.medium` 20→8, `call.weak` −5→−8, `call.marginal` 5→0
- [x] TAG PLO WTSD 52%→36%, VPIP 22.4%, PFR 15.2% — 6/6 in Range
- [x] `bot-category-scores.ts` definiert `NLHE_CATEGORY_SCORES` + `PLO_CATEGORY_SCORES`

---

### 0.7.3 — Personality-Tuning (LAG AF / Nit VPIP)

**Ziel:** Inkrementelles Modifier-Tuning — LAG aggressiver, Nit tighter.

- [x] Aggression-Modifier `/4` → `/3.5` (LAG-Raise-Bonus +1.07)
- [x] RiskTolerance-Call `/6` → `/8` (LAG-Call −0.75, Nit-Call +1.04)
- [x] LAG AF 1.60→1.73, Nit WTSD 45→41% (Richtung stimmt, aber noch nicht im Target)
- [x] NLHE ohne Regression

> **Erkenntnis**: Personality-Modifier (±5–10) können Category-Base-Scores (±20–30)
> nicht ausreichend gegensteuern. Inkrementelles Nenner-Tuning stößt an Grenzen.
> Strukturelle Lösung (archetyp-spezifische Score-Tabellen) → v0.7.6.

---

### 0.7.4 — Session-Statistiken

**Ziel:** Live-Feedback während der Session.

- [x] Live-VPIP/PFR/3-Bet in einklappbarer Kopfzeile (Statistik-Button)
- [x] Ergebnis in BB pro Session (grün/rot)
- [x] BB/100 als primäre Vergleichsmetrik
- [x] Session-Log als Text exportieren (Download-Button)
- [x] `session-stats.ts` + `SessionStats.tsx`-Komponente

---

### 0.7.5 — UI-Skalierung & Responsive Layout (teilweise regressiert)

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

### 0.7.6 — PLO-Archetyp-Scores & Positions-Kalibrierung

**Ziel:** PLO-Bots spielen positionsbewusst + Archetyp-Charakteristik korrekt.

#### Iteration 1 — Positions-Fix
- `preflopAssess` ignorierte Position → `positionStrengthAdjust()` eingebaut
- Multi-way: `early: -8, middle: 0, late: +8, blinds: +3`
- HU: `late: +3, blinds: 0`

#### Iteration 2 — Archetyp-spezifische PLO-Category-Scores
- Vier separate Score-Tabellen (TAG/Nit/LAG/CS) in `bot-category-scores.ts`
- Delta-over-TAG-Pattern → nur Abweichungen von TAG explizit
- `PLO_CATEGORY_SCORES` → `getPloScores(archetypeId, isPostflop)`

#### Iteration 3 — Preflop/Postflop getrennt
- CS WTSD 75%→46% durch postflop-Call-Senkung + Check-Senkung
- Nit VPIP 24%→17% durch angehobene Preflop-Marginal-Scores
- LAG VPIP 28%→32% durch reduzierte Fold-Scores
- `BotContext.archetypeId` + `createBotContext`-Parameter ergänzt
- `ploCallScale=0.15` (Patience-Call-Dämpfung) bleibt aktiv

#### Iteration 4 — LAG AF & C-Bet
- LAG AF FR 1.97→**2.49**, C-Bet FR 38%→**40.4%**
- raise.medium 8→15, raise.marginal 0→5, call.medium 3→-1, call.marginal -3→-7
- Erkenntnis: Preflop/Postflop-Split auch für LAG nötig; higher Postflop-Raise-Scores kompensieren VPIP-Verdünnung
- LAG 6-max: AF 2.61, WTSD 26.9% — beide im Ziel

#### Korrektheit, Replays und Sessiondaten

- [x] PLO-Draws über physische ungesehene Karten und exakt 2 Hole Cards + 3 Board Cards bestimmen
- [x] Flush-Draws, Wraps, Wheel-Outs, River-Draws und bereits gemachte Straights korrigieren
- [x] VPIP/PFR/3-Bet einmal pro Spieler und Hand erfassen
- [x] Replay-Stacks, Calls, All-ins, Uncalled Bets, Split-/Side-Pots und Dealer-Seat korrigieren
- [x] Persistentes Replay-Archiv der letzten 200 Hände bereitstellen
- [x] Opponent Reads, Mental Events und Rebuy-RNG korrigieren
- [x] PLO-Pot-Maximum per Tastatur als legales Raise senden
- [x] Engine-Rangfolge und vier PLO-Hole-Cards im Debugexport korrigieren

#### Ergebnisse (10k PLO je Archetyp und Format)

| Archetyp | FR VPIP | FR AF | FR WTSD | 6M VPIP | 6M WTSD |
|----------|---------|-------|---------|---------|---------|
| TAG | 26,05% im Korridor | 3,74 Abweichung | 36,4% im Korridor | 32,00% im Korridor | 35,1% im Korridor |
| Nit | 19,36% im Korridor | 5,75 Abweichung | 46,5% Abweichung | 24,44% im Korridor | 46,0% Abweichung |
| LAG | 34,55% im Korridor | 3,15 im Korridor | 28,4% im Korridor | 41,93% im Korridor | 26,3% im Korridor |
| CS | 45,54% im Korridor | 1,13 im Korridor | 42,2% im Korridor | 44,64% im Korridor | 44,1% im Korridor |

Der deterministische A/B-Lauf gegen den Stand vor der physischen Draw-Korrektur
erreicht 43/72 statt 44/72 Zielkorridoren. Die Gesamtgüte bleibt damit praktisch
gleich, während sich einzelne Treffer verschieben. Deshalb wird die fachlich
korrekte Draw-Auswertung nicht für alte Kalibrierungswerte zurückgedreht.

#### Bekannte Abweichungen

| Metrik | Wert | Target | Grund |
|--------|------|--------|-------|
| TAG 3-Bet / C-Bet | FR 14,71% / 28,9% | 5–11% / 35–55% | Nach korrekter `T`- und Draw-Auswertung gezielt neu kalibrieren |
| TAG AF | 3,74 FR, 4,71 6-max | 1,5–3,5 | Raise-/Call-Verhältnis nach Draw-Korrektur verschoben |
| Nit AF / WTSD | 5,75 / 46,5% FR | 1,5–3,5 / 25–36% | Checked-down und niedrige Call-Rate strukturell trennen |
| LAG C-Bet | 29,0% FR, 36,9% 6-max | 40–60% | Initiative separat von Gesamtaggression kalibrieren |
| HU | archetypabhängig | siehe `simulation.ts` | Benötigt eigene Ranges und Scores in v0.8.0 |

#### Dateien
- `packages/client/src/omaha-hand-evaluation.ts` — `positionStrengthAdjust()`, `getPloScores(isPostflop)`
- `packages/client/src/bot-category-scores.ts` — per-archetype + per-street Score-Tabellen
- `packages/client/src/bot-context.ts` — `archetypeId` in `BotContext` + `createBotContext`-Parameter

> **Identitäten:** Der Roster bleibt bei 44 Einträgen. Wachstum wird nicht mehr
> künstlich an jede Minor-Version gekoppelt, sondern bedarfs- und qualitätsgetrieben
> als fortlaufender Produktstrang behandelt.

---

### 0.7.7 — Stabilisierung nach UI-Rollback

**Ziel:** Die nach dem Rollback belegten Regressionen schließen und die
Entwicklungswerkzeuge sowie die öffentliche Projektbasis vor dem nächsten
Strategiemeilenstein vereinheitlichen.

#### Public Readiness

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

#### Responsive Safety Pass

Bewusst ohne Vorgriff auf die für 0.9.0 geplante TableGeometry-SSOT: Die
Positions-Presets bleiben unverändert; abgesichert werden nur äußeres Layout,
Bedienbarkeit und messbare Viewport-Grenzen.

- [x] Phone-Landscape 844×390 ohne Seat-/Actionbar-Überlagerung
- [x] Portrait-Guard mit verständlichem Hinweis statt defektem Layout
- [x] Desktop 1440×1000 und Tablet 1024×768 mit belastbarem Sicherheitsabstand
- [x] Responsive Component-/Browser-Tests für die vier geprüften Viewports

#### Android-Debug-Prototyp

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
- [x] begrenzten HandReplayer-Zwischenfix für APK-Diagnosen ergänzen: echte
  Header-/Tisch-/Control-Zeilen, verfügbarkeitsbasierte Tischskalierung und
  844×390-Smoke-Coverage für Heads-up, 6-max und 9-max PLO; vollständige
  TableGeometry-/Touch-Migration bleibt in 0.9.1
- [x] Session-Log und vollständiges Debug-JSONL auf Android als Cache-Datei mit
  Content-URI exportieren; nativen Chooser auf echter Hardware verifizieren
- [x] verkürzten Kontrolllauf über NLHE/PLO sowie Heads-up/6-max/Full Ring,
  Zurück-Taste und Resume abschließen

> Gerätelauf und Kontrollmatrix sind im
> [APK-Gerätebericht vom 30.07.2026](../../../testing/apk/2026-07-30-device-inventory.md)
> festgehalten. Der Replayer besitzt inzwischen einen begrenzten
> Landscape-Zwischenfix; seine gemeinsame mobile Tischgeometrie und das
> vollständige Touch-Redesign bleiben bewusst Bestandteil von 0.9.1.

#### Release-Gate

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

### 0.7.8 — PLO 3-Bet-Steuerung & Strategie-Tabelle

**Ziel:** Alle vier PLO-Archetypen in Full Ring und 6-max auf menschlich
plausible VPIP-, PFR-, 3-Bet-, C-Bet-, AF- und WTSD-Korridore kalibrieren.

#### Implementiert

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

#### Ergebnisse (10k PLO)

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

#### Bekannte Abweichungen

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

#### Release-Gate

- [x] 3k-Entwicklungsläufe ohne Invalid-Action-Fallbacks
- [x] 10k-Bestätigungsläufe für alle vier PLO-Archetypen in Full Ring und 6-max ausgeführt
- [x] Nit 6-max nach strukturellem Audit im begrenzten AF-/WTSD-Korridor
- [ ] Heads-up-Kalibrierung (bewusst auf 0.8.0 verschoben)
- [x] NLHE-Regressionstest: Full Ring und 6-max vollständig im Ziel; CS-HU-
  3-Bet-Befund mit 10k bestätigt und auf 0.8.0 verschoben
- [x] 304 Workspace-Unit-Tests grün (194 Client, 103 Engine, 7 Server)
- [x] Kalibrierungsbericht mit finalen 10k-Werten versionieren

---

### 0.7.9 — Bot-Evidenz & Kalibrierungsstabilisierung

**Ziel:** Bestehendes NLHE-/PLO-Verhalten vor der HU-Arbeit strukturell
stabilisieren, ohne Zielkorridore zur Fehlerkaschierung zu verbreitern.

#### Implementiert

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
- Android-Export für Session-Log, Replayer-Text und vollständiges Debug-JSONL
  über Cache-Datei und natives Teilen-/Speichern-Menü ergänzt; Capacitor-App-,
  Filesystem- und Share-Plugins im Workspace explizit registriert
- 40 der 44 stabilen Bot-Identitäten mit eigenen Porträts ausgestattet und
  transitive High-Severity-Abhängigkeiten aktualisiert

#### Release-Gate

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

## Phase 4 — Stabilisierung & Release-Vorbereitung

### 0.8.0 — Kalibrierungs-Stabilisierung

**Ziel:** Die Kalibrierung über alle Archetypen, Varianten und Formate auf ein
belastbares Fundament stellen, bevor neue Strategiepfade und dynamische Gegner
darauf aufbauen.

#### Ergebnis

- [x] PLO-Nut-Potential, Dirty Outs, Board-Changes und Second-Nut-Erkennung
  handrelativ korrigiert; gemeinsame Straight-Erkennung für NLHE und PLO
  abgesichert.
- [x] Kalibrierungsmetriken um Fold-to-CBet und Turn C-Bet erweitert sowie
  Targetkorridore und Score-Tabellen nachvollziehbar neu bewertet.
- [x] Festes Tischformat von der Zahl aktiver Spieler getrennt und
  Heads-up-Strategie explizit von 6-max isoliert.
- [x] Pot-Commitment, Fold-Schwellen und Multiway-Dynamik als strukturelle
  Ursachen statt über einzelne Zielzellen korrigiert.
- [x] 19 randomisierte Engine-Invarianten für NLHE und PLO etabliert und ein
  Review von 30 Modulen abgeschlossen ([historischer Review](../reviews/review-2026-08-07.md)).
- [x] Versionierte 10k-NLHE-/3k-PLO-Baselines für alle Archetypen und Formate
  erzeugt; die noch geplanten Regressionsebenen wurden in 0.8.1 umgesetzt.

Die vollständige Begründung, Rohwerte, bekannte Abweichungen und
Reproduktionsbefehle stehen im
[0.8.0-Kalibrierungsbericht](../../../calibration/v0.8.0.md).

#### Release-Status

**Abgeschlossen.** Format-Isolation, Diagnose, Invarianten und sämtliche 24
Archetyp-/Formatkombinationen wurden freigegeben. Verbleibendes
Postflop-Tuning wurde bewusst nach 0.8.1 verschoben, statt Zielkorridore an
vorübergehende Entscheidungspfade anzupassen.

---

### 0.8.1 — PLO-Strategie & NLHE-Verfeinerung

**Ziel:** PLO-spezifische Score-Lücken schließen und NLHE-Entscheidungstiefe verbessern.

> **Release vom 11.08.2026:** Strategieumfang, Commitment-Grenzen und
> WTSD-Diagnostik sind implementiert. Sämtliche technischen Gates sowie die
> unveränderten NLHE-/PLO-Zielranges sind in den finalen 10k-/3k-Läufen grün.
> Rohwerte und Invarianten stehen im
> [Release-Gate-Report](../../../calibration/v0.8.1-release-gate.md).

#### Umgesetzter Kernumfang

- [x] PLO-Strategie über graduelle SPR-Zonen, Board-Equity-Collapse,
  positionsabhängige Equity-Realisierung und strengere River-Disziplin
  vertieft.
- [x] Nut-, Mixed-, Second- und Bottom-Wraps samt dominierter Outs sowie
  Blocker-, Freeroll- und Reverse-Implied-Odds-Effekten skillabhängig
  differenziert.
- [x] NLHE-Linien um echte Check-Raises, Turn-Double-Barrels, Float-Defense,
  4-Bet-/5-Bet-Stufen und geplante River-Bet-Folds erweitert.
- [x] Freiwilliges Pot-Commitment vom Forced-All-in-Risiko getrennt und beide
  Größen mit expliziten Skill- und Preisgrenzen diagnostizierbar gemacht.
- [x] Deterministische Kalibrierungsregression und Parameter-Validierung als
  zweite und dritte Testebene eingeführt.

Die fachlichen Einzelregeln sind im [Changelog](../../../CHANGELOG.md) beschrieben;
Rohwerte, Grenztests und Freigabeentscheidung stehen im
[0.8.1-Release-Gate-Report](../../../calibration/v0.8.1-release-gate.md).

#### Release-Status

**Abgeschlossen am 11.08.2026.** Alle statischen Zielranges sind in den
10k-Läufen für Full Ring und 6-max sowie den 3k-Heads-up-Läufen grün. Die
technischen Gates, exakten Commitment-Grenzen, WTSD-Pfaddiagnostik und
Skill-Differenzierung wurden mit unveränderten Zielkorridoren freigegeben.

---
