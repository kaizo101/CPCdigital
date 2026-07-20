# Changelog

Alle wichtigen veröffentlichten Änderungen an CPCdigital werden in dieser Datei dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), und das Projekt verwendet semantische Versionsnummern. Geplante Funktionen stehen ausschließlich in der [Roadmap](ROADMAP.md).

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


## [Unreleased]

### Added

- versioniertes `BotIdentity`-Modell mit stabilen Namen, Seeds, Skills, Grundtendenzen und Avatar-Schlüsseln
- deterministisch generierte 32-Bot-Testpopulation als erweiterbare Grundlage des späteren Rosters
- erste vier Bot-Avatare mit neutralem Initialen-Fallback für noch nicht bebilderte Identitäten

### Changed

- Projekt und sichtbare App-Bezeichnung von CPC-Offline in CPCdigital umbenannt
- TAG-Ranges auf jede Tischgröße von Heads-up bis Full Ring abgestimmt
- gemeinsame Archetyp-Pipeline eingeführt und Nit, LAG sowie Calling Station als kalibrierte Botprofile ergänzt
- Archetypen pro Session seedbar gemischt und vor Wiederholungen gleichmäßig am Tisch verteilt
- Tischbesetzung und Bot-Kalibrierung von abstrakten Archetypen auf konkrete Identitäten umgestellt
- Preflop-All-in-Runouts mit längeren Pausen zwischen Flop, Turn und River versehen
- versionierten lokalen Session-Debug-Record als JSON-Export ergänzt

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

[Unreleased]: https://github.com/kaizo101/CPCdigital/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/kaizo101/CPCdigital/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/kaizo101/CPCdigital/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kaizo101/CPCdigital/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kaizo101/CPCdigital/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kaizo101/CPCdigital/releases/tag/v0.2.0
