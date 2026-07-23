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
- [ ] generierten Roster bis v1.0 auf ungefähr 80–100 Identitäten ausbauen, technisch offen erweiterbar halten (aktuell 44/100)
- [x] persistenten lokalen Bot-Roster mit über mehrere Sessions wiederkehrenden Identitäten aufbauen
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

## ⚠️ 0.7.5 — UI-Skalierung & Responsive Layout (in Arbeit)

**Ziel:** Auf Tablets und Phone-Landscape testbar — Tester-Akquise.

- [x] Landscape-Media-Query (`max-height: 450px`): reduzierte Paddings, kein Scrollen
- [x] Cards: Clamp-Minimum reduziert (36/50px statt 46/64px)
- [x] ActionButtons: minHeight 74→56px, fontSize 18→16
- [x] Touch: Long-Press (600ms) öffnet Rebuy-Menü
- [x] Landscape-Lock: `maximum-scale=1.0, user-scalable=no`
- [x] Actionbar-Overlap: Bottom-Padding 260px, Formel auf 470px umgestellt
- [ ] **Phone-Landscape**: Actionbar noch zu dominant, Slider ausgeblendet → Usability leidet
- [ ] **Replayer**: Steuerung auf kleinen Screens → später
- [ ] Portrait-Modus: bewusst nicht supported (zu schmal für Poker-Layout)

> Desktop und Tablet sind gut spielbar. Phone-Landscape funktioniert, aber die Actionbar
> nimmt noch zu viel Raum ein — muss in einem Folge-Release iteriert werden.

---

## 🎯 0.7.6 — Personality-Refactoring (LAG / Nit)

**Ziel:** Archetypen spielen konsistent ihre Rolle — LAG aggressiver, Nit tighter.

- **Problem**: Personality-Modifier (±5–10) können Category-Base-Scores (±20–30) nicht
  gegensteuern. v0.7.3 (Aggression /3.5) war nur inkrementell — LAG AF 1.60→1.73
  (Target 2.5+), Nit WTSD 45%→41% (Target 25–36%). Die Gap bleibt strukturell.

- **Ansatz**: Archetyp-spezifische Modifier, die als Base-Offset wirken — nicht mehr
  nur Nenner-Tuning an gemeinsamen Formeln. Drei Optionen, sortiert nach Aufwand:

  | Option | Mechanismus | Aufwand |
  |--------|-------------|---------|
  | A: Multiplier | Pro Archetyp ein Skalierungsfaktor auf alle Personality-Modifier. LAG ×1.5, Nit ×2.0 auf Fold-Bonus | Gering (∼10 Zeilen) |
  | B: Base-Offset | Pro Archetyp fester Additiv-Wert auf Raise/Fold/Call. LAG raise +12, Nit fold +12 | Mittel (∼30 Zeilen) |
  | C: Archetyp-Score-Tables | Wie 0.7.2 (Variant-Category-Scores), aber pro Archetyp statt pro Variante. Hat höchste Präzision, aber 4× den Konfigurationsaufwand | Hoch (∼100 Zeilen) |

  Empfehlung: **Option B (Base-Offset)** als erster Versuch. Wenn nicht ausreichend,
  eskaliert zu Option C.

- **Umsetzung**: `bot-action-modifiers.ts` erweitern um `getArchetypeModifiers(id)`.
  Pro Archetyp: `{ raiseBonus: number, foldBonus: number, callBonus: number }`.
  Werte initial aus der v0.7.3-Kalibrierung abgeleitet:
  - TAG: `{ raise: 0, fold: 0, call: 0 }` (Referenz, unverändert)
  - LAG: `{ raise: +12, fold: -8, call: -4 }` (mehr Raises, weniger Calls/Folds)
  - Nit: `{ raise: -4, fold: +12, call: -8 }` (mehr Folds, weniger Calls/Raises)
  - CS: `{ raise: -8, fold: -8, call: +12 }` (mehr Calls, weniger Raises/Folds)

- **Hebel**: LAG AF, LAG PFR, Nit WTSD — 8–10 rote Metriken in PLO. NLHE-Kalibrierung
  muss nach Änderung verifiziert werden (Regression-Check).

---

# Phase 4 — Release-Vorbereitung & neue Variante

## 🎯 0.8.0 — HU-Strategie (Heads-up)

**Ziel:** Heads-up spielt sich fundamental anders als Full-Ring — eigener Pfad.
Bekannte, diagnostizierte Baustelle aus der 0.7.1-Kalibrierung.

- [ ] HU-spezifische Preflop-Ranges (NLHE + PLO)
- [ ] Postflop-Linien für HU-Dynamik (C-Bet-Frequenz, Float-Resistenz)
- [ ] Kalibrierung: HU-Formate für alle Archetypen

---

## 🎯 0.8.1 — 2-7 Single Draw

**Ziel:** Erste Draw-Variante, Architektur-Proof für Kartentausch.

- [ ] 2-7-Lowball-Handrangfolge
- [ ] `DrawPhaseDefinition` in `GameVariant` (Kartenanzahl pro Draw, max Draws)
- [ ] Draw-Phase und Kartentausch in der Engine
- [ ] `VariantEvaluator`: Draw-Qualität, Discard-Empfehlungen, Pat/Snowing
- [ ] Pat/Draw-Status + Snowing-Logik
- [ ] Draw-spezifische Action History
- [ ] Grundlegende Regelhinweise in der UI

---

## 🎯 0.8.2 — Tischkomfort & Branding

**Ziel:** UI-Polish vor dem Release.

- [ ] BB-Anzeige-Modus (Stacks, Bets, Pot in BB)
- [ ] Währungswahl um "Keine" erweitern (nur Zahlen, kein €/$)
- [ ] 4-Color-Deck-Option
- [ ] Min-/Max-Bet direkt in der Oberfläche
- [ ] **Branding-Review**: Action-Buttons von PokerStars-Rot auf CPCdigital-Farbschema

---

## 🎯 0.8.3 — Session-Flexibilität

**Ziel:** Mehr Kontrolle über die Session.

- [ ] Hero-Name im Setup wählbar (statt immer "You")
- [ ] Bot-Avatare: 44 Bilder für alle Identities
- [ ] Individuelle Starting-Stacks pro Bot
- [ ] Konfigurierbare Buy-in-Grenzen (40–250 BB)
- [ ] Session-Setup mit Variante + Schwierigkeitsmix

---

## 🎯 0.8.4 — Präsentation

**Ziel:** Letzter Schliff für v1.0.

- [ ] Animationen (Karten, Chips)
- [ ] Sound-Effekte
- [ ] Performance-Test für lange Sessions

---

## 🎯 1.0.0 — Stable Core Release

**Ziel:** Ein stabiles Offline-Pokerspiel mit 3 Varianten und belastbarem Fundament
für die Learning-Erweiterung.

### Enthalten

- [x] NLHE vollständig spielbar
- [x] Omaha High vollständig spielbar
- [ ] 2-7 Single Draw als erste seltene Variante
- [ ] 4 unterscheidbare Bot-Archetypen mit Personality, Skill, Reads, Mental State
- [ ] vollständige Hand History und Replay
- [ ] Decision Records und erklärbare Bot-Scores
- [ ] Session-Statistiken (Live-VPIP/PFR, BB/100)
- [ ] responsive UI (Tablet, Touch)
- [ ] stabiles Desktop-Packaging
- [ ] Dokumentation für Architektur und Variantenmodule

### Optional (post-1.0)

- [ ] Session-Log (PokerStars-Dealer-Stil, links unten, einklappbar)

### Packaging

- [ ] Windows
- [ ] Linux / AppImage
- [ ] macOS, soweit Build-Umgebung verfügbar

### Nach v1.0 verschoben

- **Stud Light** (Architektur-Proof offene Karten) — jetzt Teil von 1.7.0 (Stud-Familie)

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

## 🎯 1.5.0 — 2-7 Triple Draw

**Ziel:** Direkte Erweiterung von 2-7 Single Draw (0.8.1) — drei Draws statt einem.

- [ ] drei Draw- und vier Setzrunden
- [ ] Fixed-Limit-Struktur
- [ ] Draw-History über mehrere Runden
- [ ] angepasste Bot-Strategien (mehrstufiges Pat/Draw/Bluff)
- [ ] Tutorial- und Rätselmaterial

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
- [ ] Vereinfachte Bot-AI für Stud (aufbauend auf Stud Light aus v0.7.3)

---

# Phase 8 — Plattformen & Multiplayer

## 🎯 1.8.0 — Android (optional, Ausrichtung offen)

Die Smartphone-Darstellung von Poker ist auf kleinen Bildschirmen eine große UX-Herausforderung.
Ob die APK ein vollständiges Spiel, ein reiner Lernclient oder nur Tablet-optimiert bleibt,
wird nach v0.9.2 entschieden.

- [ ] Capacitor-Setup und APK-Pipeline
- [ ] entweder: Phone-Layout (radial, Overlay-Aktionen, nur Querformat)
- [ ] oder: beschnittene Version (z.B. max 6-max, keine komplexen Varianten)
- [ ] oder: APK streichen, Fokus auf Browser (GitHub Pages)

> Touch-Optimierung und responsive UI werden bereits in 0.7.5 (Scaling) und 0.8.4 (Präsentation) behandelt.

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
| Session-Log (Live-Dealer-Text) | UI | PokerStars-Dealer-Stil, einklappbar links unten |

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
├── server/                        älterer Online-Prototyp (ungenutzt)
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
