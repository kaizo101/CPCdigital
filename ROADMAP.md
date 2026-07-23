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

### Erkenntnisse für v0.8.0

- **Fold-to-CBet zu hoch** (71-93%): eigenständiger Mechanismus, nicht durch C-Bet verursacht. Wird in v0.8.0 gezielt analysiert.
- **WTSD zu hoch** (50-70%): eigenes Problem, gleiche Methodik wie Fold-to-CBet.
- **Hybrid-Scoring bleibt final**: Kategorien + Strength-Bonus, kein Voll-Ersatz nötig.

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

## 🎯 0.7.2 — WTSD (Postflop-Fold-Verhalten)

**Ziel:** Showdown-Rate senken — Bots folden postflop zu selten.

- **Problem**: Alle Archetypen sehen zu viele Showdowns (TAG PLO 6-max: 39.9%,
  Target 28–38%). "Medium"-Hände callen postflop zu oft (Category-Base: +20).
- **Ansatz**: Variant-spezifische Category-Scores. PLO "medium" call=+5 statt
  NLHE +20. NLHE-Tabelle bleibt unangetastet, PLO bekommt konservativere Werte.
- **Umsetzung**: `GameVariant`-Konfiguration um Category-Score-Tabelle erweitern.
  `bot-action-scoring.ts` liest Scores aus Variant-Konfig statt globalem Param.
- **Hebel**: Alle Archetypen, größter struktureller Einzelfix.

---

## 🎯 0.7.3 — Personality-Tuning (LAG AF / Nit VPIP)

**Ziel:** Archetypen spielen ihre Rolle — LAG aggressiver, Nit tighter.

- **Problem**: LAG AF zu niedrig (PLO 1.45, Target 2.5+), Nit VPIP zu hoch
  (PLO 27.8%, Target 14–22%). Category-Base-Scores dominieren Personality.
- **Ansatz**: Aufbauend auf 0.7.2 — die variant-spezifischen Category-Scores
  erlauben pro Archetyp unterschiedliche Fold/Call/Raise-Basen. LAG kriegt
  höhere Raise-Base, Nit höhere Fold-Base.
- **Hebel**: 2 Archetypen, nutzt die in 0.7.2 geschaffene Infrastruktur.

---

## 🎯 0.7.4 — Session-Statistiken

**Ziel:** Live-Feedback während der Session.

- [ ] Live-VPIP/PFR/3-Bet in einklappbarer Kopfzeile
- [ ] Ergebnis in BB pro Session
- [ ] BB/100 als primäre Vergleichsmetrik
- [ ] PokerStars-Sessionlog aus Hand-Events

---

## 🎯 0.7.5 — UI-Skalierung & Responsive Layout

**Ziel:** Auf Tablets und kleinen Bildschirmen testbar — mehr Dev-Bandbreite.

- [ ] **Actionleiste**: verdeckt auf Desktop untere Spieler-Sitze → in Tisch-Layout integrieren oder kollabierbar machen
- [ ] **Table-Shell**: `aspect-ratio` statt fester `vh`-Berechnung, füllt verfügbaren Platz
- [ ] **PlayerSeat**: Schriftgrößen, Avatar, Chip-Anzeige mit `clamp()` skalieren
- [ ] **Cards**: Größen für kleine Viewports optimieren
- [ ] **Setup-Screen**: Inputs und Layout für schmale Bildschirme
- [ ] **Replayer**: Steuerung auf kleinen Screens bedienbar
- [ ] **Touch**: Rechtsklick-Rebuy durch Long-Press oder sichtbaren Button ersetzen
- [ ] **Hochformat-Tablet**: Layout bricht nicht auseinander
- [ ] **PlayerSeat-Positionierung**: Padding zur Tischkante, Kollisionsvermeidung

> Tablet läuft im Browser (GitHub Pages) — keine APK nötig.

---

## 🎯 0.7.6 — Personality-Refactoring (LAG / Nit)

**Ziel:** Archetypen spielen konsistent ihre Rolle — LAG aggressiver, Nit tighter.

- **Problem**: Personality-Modifier (±5–10) zu schwach gegen Category-Base-Scores (±20–30).
  v0.7.3 (Aggression /3.5) war nur inkrementell — LAG AF 1.60→1.73 (Target 2.5+),
  Nit WTSD 45%→41% (Target 25–36%). Die Gap bleibt strukturell.
- **Ansatz**: Archetyp-spezifische Modifier-Multiplier oder Category-Score-Overrides.
  Nicht mehr gemeinsame Nenner teilen, sondern pro Archetyp definieren:
  LAG kriegt Raise-Base +15, Nit kriegt Fold-Base +15, etc.
- **Umsetzung**: `bot-action-modifiers.ts` um `ArchetypeModifiers` erweitern,
  die über die bestehenden Personality-Werte hinausgehen. Alternativ:
  pro Archetyp eigene `CategoryScoreTable`-Overrides.
- **Hebel**: LAG AF, LAG PFR, Nit WTSD — 8–10 rote Metriken in PLO.

---

# Phase 4 — Neue Variante & Komfort

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

- **Stud Light** (Architektur-Proof offene Karten) — technische Vorarbeit für Razz/Stud, kein Consumer-Feature
- **Globale Statistiken** (Session-übergreifend, Filter nach Variante/Stakes) — braucht mehrere Sessions als Datenbasis

---

# Phase 5 — Learning Layer ab v1.x

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

**Ziel:** Konkrete Situationen trainieren — inspiriert von existierenden Puzzle-Apps, aber mit tieferer Erklärungsschicht statt nur "richtig/falsch".

- [ ] feste Grundlagenrätsel (Preflop, Postflop, Bet-Sizing)
- [ ] Fold-, Call-, Raise- und All-in-Entscheidungen
- [ ] Draw- und Pat-Entscheidungen
- [ ] Range- und Read-Aufgaben
- [ ] Fehler in einer Hand finden
- [ ] mehrstufige Hände nachspielen
- [ ] Schwierigkeitsgrade
- [ ] **Erklärungsschicht**: Warum ist Aktion X besser als Y? Welche Faktoren waren entscheidend?
  - Nicht nur "falsch", sondern "zu passiv — du hast Top Pair auf trockenem Board, ein Bet von 60% Pot
    hätte Value generiert, während der Check deinem Gegner eine Free Card gibt"
  - Verweis auf relevante Wiki-Begriffe und Strategiekonzepte
  - Alternative Aktionen mit Erklärung, warum sie schlechter sind
- [ ] persönliche Rätsel aus eigenen Sessions generieren
- [ ] Orientierung an etablierten Poker-Puzzle-Apps (UX-Flow, Schwierigkeitskurve), aber mit eigenem CPC-Lernansatz

---

# Weitere Varianten und Plattformen

## 🎯 1.5.0 — 2-7 Triple Draw

- [ ] drei Draw- und vier Setzrunden
- [ ] Fixed-Limit-Struktur
- [ ] Draw-History über mehrere Runden
- [ ] angepasste Bot-Strategien
- [ ] Tutorial- und Rätselmaterial

## 🎯 1.6.0 — Omaha Hi-Lo

- [ ] High-/Low-Auswertung
- [ ] Qualifier-Regeln
- [ ] Split- und Quarter-Pot-Logik
- [ ] Low-Draw- und Scoop-Bewertung

## 🎯 1.7.0 — Badugi

- [ ] Badugi-Handrangfolge
- [ ] Draw-Regeln
- [ ] Pat-Signale und Snowing
- [ ] botseitige Draw- und Blufflogik

## 🎯 1.8.0 — Android (optional, Ausrichtung offen)

Die Smartphone-Darstellung von Poker ist auf kleinen Bildschirmen eine große UX-Herausforderung.
Ob die APK ein vollständiges Spiel, ein reiner Lernclient oder nur Tablet-optimiert bleibt, wird nach v0.9.2 entschieden.

- [ ] Capacitor-Setup und APK-Pipeline
- [ ] entweder: Phone-Layout (radial, Overlay-Aktionen, nur Querformat)
- [ ] oder: beschnittene Version (z.B. max 6-max, keine komplexen Varianten) — Spiel auf Phone möglich, aber mit Einschränkungen
- [ ] oder: APK streichen, Fokus auf Browser (GitHub Pages)

> Touch-Optimierung und responsive UI werden bereits in v0.7.4 (Scaling) und v0.9.2 (Tablet) behandelt.

## 🎯 1.9.0 — Table Rules und Multiplayer-Readiness

**Ziel:** Sonderregeln werden als allgemeine, deterministische Engine-Erweiterungen vorbereitet.

- [ ] allgemeines `TableRules`-Framework getrennt von Variantenregeln definieren
- [ ] Kompatibilitätsprüfung zwischen Pokervariante, Betting-Struktur und Sonderregel
- [ ] Pflichtbeiträge, übersprungene Phasen, zusätzliche Boards sowie Bonusabrechnungen modellieren
- [ ] Main- und Side-Pots bei mehreren Boards beziehungsweise zusätzlichen Auszahlungen korrekt abrechnen
- [ ] Sonderregeln vollständig in Hand History, Decision Snapshots und deterministischen Replays erfassen
- [ ] protokollneutrale Zustimmungs-, Timeout- und Ablehnungs-Events für spätere Spielerentscheidungen vorbereiten
- [ ] betroffene Sonderregeln im `BotContext` sichtbar machen
- [ ] Single-Board Bomb Pot als erster offline testbarer Proof
- [ ] Schnittstellen für 7-2-Game/Bounty und Run It Twice vorbereiten

### Freigabe ab v2.x

- Sonderregeln in Lobbys beziehungsweise Tisch-Setups für echte Spieler auswählbar machen
- Run It Twice mit Zustimmung aller beteiligten Spieler, Timeouts und Disconnect-Regeln umsetzen
- Bomb Pots und 7-2-Game/Bounty mit synchronisierter Abrechnung im Multiplayer freigeben
- Online-Multiplayer frühestens ab v2.0 und weiterhin nur als langfristige Option behandeln

## Später

- Razz
- Seven Card Stud (vollständige AI, aufbauend auf v0.7.3 Stud Light)
- Stud Hi-Lo
- Mixed Games
- Tournament-Modus
- Short Deck
- weitere Draw-Varianten
- optionaler lokaler Multiplayer
- weitere Multiplayer-Sonderformen nach stabiler v2.x-Infrastruktur

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
