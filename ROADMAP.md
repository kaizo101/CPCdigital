# CPC-Offline — Roadmap

**Offline Poker App · Electron Desktop · Single-Player gegen glaubwürdige Bots · später Lern- und Trainingsplattform für Pokervarianten**

---

## Vision

CPC-Offline soll ein zugänglicher Ort sein, an dem Spieler bekannte und seltene Pokervarianten ohne Echtgeld, Wartezeiten oder chaotische öffentliche Tische ausprobieren können.

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

- [ ] allgemeines `BotContext` ohne versteckte Informationen
- [ ] Betgröße, Pot Odds, effektiven Stack und SPR in die Bewertung der Aktionen einbeziehen
- [ ] Stack- und Sizing-Sensitivität mit vergleichbaren Entscheidungsszenarien testen
- [ ] Trennung von Variantenevaluation und Decision Engine
- [ ] Bewertung aller legalen Aktionen über Utility Scores
- [ ] Gründe und Einflussfaktoren zu jedem Action Score erfassen
- [ ] Skill als Wahrnehmungs- und Bewertungsungenauigkeit modellieren
- [ ] Personality, Mental State, Reads und Memory trennen
- [ ] gewichtete Auswahl zwischen plausiblen Aktionen
- [ ] globale Zufallsfehler durch nachvollziehbare Fehlbewertungen ersetzen
- [ ] künstliche Reaktionszeit von tatsächlicher Rechenzeit trennen
- [ ] Debug Inspector für Kontext, Scores und Entscheidungsgründe

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

- [ ] TAG als Referenzbot stabilisieren
- [ ] Nit
- [ ] Calling Station
- [ ] Maniac
- [ ] Skill und Persönlichkeit frei kombinierbar machen
- [ ] Session-Varianz innerhalb eines Archetyps
- [ ] individuelle Tilt-Reaktionen
- [ ] unterschiedliche Beobachtungsfähigkeit
- [ ] Reads mit Stichprobengröße und Konfidenz
- [ ] falsche und überhastete Reads ermöglichen
- [ ] Bot-Gewohnheiten statt nur VPIP-/Aggressionsregler
- [ ] Balancing über längere Test-Sessions

### Zielbild

Zwei TAG-Bots sollen dieselbe Grundstrategie besitzen, sich aber dennoch unterscheiden können:

- vorsichtiger Beobachter
- überheblicher Schnellurteiler
- emotional stabiler Grinder
- solider Spieler mit Angst vor großen Pots

---

# Phase 3 — Variantenfähiges Kernspiel

## 🎯 0.5.0 — NLHE vollständig spielbar

**Ziel:** Die erste Variante dient als Referenz für Community-Card-Poker und No Limit.

- [ ] positionsabhängige Preflop-Situationen
- [ ] Hand- und Board-Assessment
- [ ] relative Handstärke statt nur Handkategorie
- [ ] Draws, Outs, Blocker und Verwundbarkeit
- [ ] Postflop-Initiative und Action History
- [ ] Range-Schätzungen in vereinfachter Form
- [ ] No-Limit-Bet-Sizing
- [ ] Multiway-Entscheidungen
- [ ] glaubwürdige Bot-Lines über mehrere Streets
- [ ] umfassende Tests und Bot-Test-Sessions

---

## 🎯 0.6.0 — Omaha High

**Ziel:** Pot Limit und variantenspezifische Handregeln testen.

- [ ] exakt zwei Hole Cards und drei Board Cards verwenden
- [ ] Omaha-spezifische Hand-Evaluation
- [ ] Pot-Limit-Minimum und -Maximum korrekt berechnen
- [ ] Draw-Dichte und Nut-Potenzial bewerten
- [ ] Omaha-spezifischer Variant Context
- [ ] Bots auf stärkere Draws und häufigere Multiway-Pots anpassen
- [ ] NLHE- und Omaha-Logik ohne Duplizierung betreiben

Omaha dient als Architekturtest dafür, dass die Decision Engine allgemein bleibt und nur die Variantenevaluation ausgetauscht wird.

---

## 🎯 0.7.0 — 2-7 Single Draw als Varianten-Proof

**Ziel:** Früh prüfen, ob die Architektur auch außerhalb von Community-Card-Spielen funktioniert.

- [ ] 2-7-Lowball-Handrangfolge
- [ ] Draw-Phase und Kartentausch
- [ ] Pat- und Draw-Status
- [ ] Roughness und Smoothness
- [ ] Anzahl gezogener Karten als öffentliche Information
- [ ] Draw-spezifische Action History
- [ ] erste einfache Snowing- und Bluffcatch-Logik
- [ ] Bots mit variantenspezifischem Wissen
- [ ] grundlegende Regelhinweise in der UI

Triple Draw folgt erst, wenn Single Draw stabil ist.

---

# Phase 4 — Spielkomfort und v1.0

## 🎯 0.8.0 — Hand History, Replay und Sessiondaten

**Ziel:** Hände nachvollziehen und die spätere Learning-Schicht vorbereiten.

- [ ] persistente Hand History
- [ ] Hand-Replayer Schritt für Schritt
- [ ] Filter nach Variante, Session, Bot und Potgröße
- [ ] Session-Stats: Hände, Gewinn/Verlust, VPIP, PFR und Aggression
- [ ] variantenspezifische Statistiken
- [ ] interessante Entscheidungen automatisch markieren
- [ ] Bot-Entscheidungsgründe im Debug-Modus anzeigen
- [ ] Export und Import von Sessions
- [ ] gespeicherte Hände für spätere Analysen stabil versionieren
- [ ] PokerStars-artiges Dealer-/Sessionlog links unten aus den strukturierten Hand-Events darstellen

---

## 🎯 0.9.0 — UX, Polish und Plattformstabilität

**Ziel:** Die App soll sich wie ein fertiges Casual-Spiel anfühlen.

- [ ] Animationen für Karten und Chips
- [ ] Sound-Effekte und Lautstärkeeinstellungen
- [ ] verständliche Anzeige von Setzrunde und Spielphase
- [ ] Min-/Max-Bet direkt in der Oberfläche
- [ ] optional kompakte Regelhinweise
- [ ] Touch-freundliche Bedienelemente vorbereiten
- [ ] Bot-Namen, Avatare und erkennbare Tischidentität
- [ ] Session-Setup mit Variante, Bots und Schwierigkeitsmix
- [ ] Performance und lange Sessions testen
- [ ] Barrierefreiheit und skalierbare UI

---

## 🎯 1.0.0 — Stable Core Release

**Ziel:** Ein stabiles Offline-Pokerspiel und belastbares Fundament für die Learning-Erweiterung.

### Enthalten

- [ ] NLHE vollständig spielbar
- [ ] Omaha High vollständig spielbar
- [ ] 2-7 Single Draw als erste seltene Variante
- [ ] mehrere unterscheidbare Bot-Persönlichkeiten
- [ ] Skill, Reads und Mental State
- [ ] vollständige Hand History und Replay
- [ ] Decision Records und erklärbare Bot-Scores
- [ ] robuste Engine- und Bot-Tests
- [ ] stabiles Desktop-Packaging
- [ ] Dokumentation für Architektur und Variantenmodule

### Packaging

- [ ] Windows
- [ ] Linux / AppImage
- [ ] macOS, soweit Build-Umgebung verfügbar

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

**Ziel:** Konkrete Situationen ähnlich wie bei Schachaufgaben trainieren.

- [ ] feste Grundlagenrätsel
- [ ] Fold-, Call-, Raise- und Bet-Sizing-Aufgaben
- [ ] Draw- und Pat-Entscheidungen
- [ ] Range- und Read-Aufgaben
- [ ] Fehler in einer Hand finden
- [ ] mehrstufige Hände nachspielen
- [ ] Schwierigkeitsgrade
- [ ] Bewertung mit Abstufungen statt nur richtig/falsch
- [ ] persönliche Rätsel aus eigenen Sessions generieren

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

## 🎯 1.8.0 — Android

- [ ] Capacitor-Setup
- [ ] Touch-Optimierung
- [ ] Android-spezifische Navigation
- [ ] APK- und Release-Pipeline

## Später

- Razz
- Seven Card Stud
- Stud Hi-Lo
- Mixed Games
- Tournament-Modus
- Short Deck
- weitere Draw-Varianten
- optionaler lokaler Multiplayer
- Online-Multiplayer nur als langfristige Option

---

# Technische Struktur

```text
packages/
├── client/              React UI
├── poker-engine/        Regeln, State Machine, Commands und Events
├── variant-modules/     NLHE, Omaha, 2-7 Draw usw.
├── bots/                Decision Engine, Personality, Reads und Mental State
├── analysis/            Decision Records, Replay und spätere Session-Analyse
├── knowledge/           Wiki-, Tutorial- und Rätselinhalte
├── shared/              gemeinsame Typen
└── electron/            Desktop-Wrapper
```

Die Pakete `analysis` und `knowledge` müssen vor v1.0 noch keine vollständige Benutzeroberfläche besitzen. Ihre Datenmodelle und Schnittstellen sollten jedoch früh berücksichtigt werden.

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
