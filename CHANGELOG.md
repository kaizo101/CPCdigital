# Changelog

Alle wichtigen veröffentlichten Änderungen an CPC-Offline werden in dieser Datei dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), und das Projekt verwendet semantische Versionsnummern. Geplante Funktionen stehen ausschließlich in der [Roadmap](ROADMAP.md).

## [Unreleased]

Noch keine veröffentlichten Änderungen.

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

[Unreleased]: https://github.com/kaizo101/cpc-offline/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/kaizo101/cpc-offline/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kaizo101/cpc-offline/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kaizo101/cpc-offline/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kaizo101/cpc-offline/releases/tag/v0.2.0
