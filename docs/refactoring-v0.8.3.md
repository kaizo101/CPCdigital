# v0.8.3 — Refactoring-Scope

Dieses Dokument konkretisiert den technischen Umfang der in der
[Roadmap](../ROADMAP.md) bewusst kompakt gehaltenen Version 0.8.3. Alle
Umbauten bleiben verhaltensneutral und werden in getrennten Commits
durchgeführt.

## Fachliche Modulgrenzen

- `game.ts`: Showdown-Logik, Player-Management und Betting-Round in eigene
  Module trennen.
- `bot-action-scoring.ts`: als kleine öffentliche Fassade erhalten;
  Preflop-, NLHE-Postflop-, PLO-Postflop-, Risiko-/Candidate-Gate- und
  gemeinsame Scoring-Verantwortlichkeiten auslagern. Parameter,
  Auswahlgrenzen und Verhalten bleiben unverändert.
- `LocalGameRunner.ts`: Sessionsteuerung, Replay-/History-Erfassung,
  Bot-Timing und Exportanbindung voneinander trennen.
- `session-debug-record.ts`: Schema, Komprimierung, JSONL-Codec und
  plattformspezifischen Download beziehungsweise Android-Streaming trennen;
  Exportformat v4 und Abwärtskompatibilität bleiben unverändert.
- `simulation.ts`: Kalibrierungsziele/-profile, Simulationslauf,
  Statistik/Invarianten und Reporting trennen, damit Release-Gates nicht mit
  Botstrategie gekoppelt bleiben.
- `TableScreen.tsx`: auf Tisch-Orchestrierung reduzieren und Replay-, Export-
  sowie Overlay-Steuerung in abgegrenzte Hooks oder Komponenten auslagern.
  `ActionButtons.tsx` anschließend nur entlang bestehender Darstellungs-,
  Betrags- und Aktionsgrenzen teilen.

## Tests und gemeinsame Helfer

- Große Bot-Tests entlang der neuen fachlichen Module aufteilen,
  insbesondere `bot-pipeline.test.ts` und `bot-action-scoring.test.ts`;
  Regressionen weder verschieben noch durch breitere Assertions ersetzen.
- NLHE-/PLO-Handevaluation auf tatsächlich gemeinsame Board-, Draw- und
  Made-Hand-Helfer prüfen. Variantenregeln bleiben getrennt, wenn sie nicht
  identisch sind.
- `bot-params.ts` bleibt zusammen, solange die Datei überwiegend deklarative
  Konfiguration enthält; Größe allein ist kein Trennungsgrund.
- Integrationstests für die durchgehende Pipeline Engine →
  `LocalGameRunner` von Blinds bis Showdown ergänzen.
- Empty-State, Bust-zu-Ende und schnelle Sessionneustarts als Randfälle
  absichern.

## Fachlich notwendige Bereinigung

- Bet-Level aktionsbasiert als `unopened`, Open, 3-Bet und 4-Bet+ aus der
  tatsächlichen Raise-Anzahl ableiten statt aus einer 4-BB-Sizinggrenze.
  Ungewöhnlich große Opens und kleine 3-Bets müssen korrekt getrennt werden.
- Veraltete Bot-Dateien wie `bot.ts` und doppelte Helfer entfernen.
- Das ruhende `server`-Paket klar vom v1-Buildpfad getrennt halten und seine
  v2-Schnittstellenannahmen dokumentieren.
- Prettier-Konfiguration in einem separaten mechanischen Commit einführen und
  dokumentierte Format- sowie Lint-Befehle ergänzen.

## Verhaltensneutrales Gate

- Workspace-Tests, Produktionsbuild und Stake-Invarianz bleiben nach jedem
  strukturellen Commit grün.
- Der deterministische Kalibrierungs-Snapshot bleibt exakt identisch; ein
  Ergebnis lediglich innerhalb der Warn- oder Fehlertoleranzen genügt nicht.
- Öffentliche Fassaden, Debugformat v4, Replayarchive und bestehende
  Persistenzdaten bleiben kompatibel.

## Public Readiness und Herkunftsnachweis

- Zentrale Bot- und Engine-Dateien erhalten maschinenlesbare
  `SPDX-FileCopyrightText`- und `SPDX-License-Identifier`-Hinweise.
- Zukünftige Release-Tags werden kryptografisch signiert und die lokale
  Verifikation knapp dokumentiert; der veröffentlichte Tag `v0.7.7` wird
  nicht nachträglich verändert.
- Pro Release entsteht ein leichtgewichtiges Bot-Provenance-Manifest aus
  exakten Dateihashes und normalisierten Token-/AST-Fingerprints.
- Veröffentlichte Releases werden zusätzlich bei Software Heritage
  archiviert und mit ihrem inhaltsbasierten SWHID dokumentiert.
- Ein kurzer Monitoring- und Beweissicherungsleitfaden beschreibt den Umgang
  mit charakteristischen öffentlichen Codefragmenten, verdächtigen
  Repositories und AGPL-Compliance-Fällen.

Diese Maßnahmen richten sich nicht gegen transparente Forks oder
AGPL-konforme kommerzielle Nutzung. Es entstehen weder Telemetrie noch
Phone-home-Logik, Obfuskation, absichtlicher Dead Code oder ein verstecktes
Laufzeit-Wasserzeichen.
