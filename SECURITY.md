# Sicherheitsrichtlinie

## Unterstützte Versionen

CPCdigital befindet sich in früher Entwicklung. Sicherheitskorrekturen werden
für den aktuellen Stand auf `master` und, soweit praktikabel, für den neuesten
Release bereitgestellt. Ältere Versionen erhalten keine garantierten Updates.

## Sicherheitsproblem vertraulich melden

Bitte veröffentliche vermutete Sicherheitslücken, Zugangsdaten oder private
Spieldaten nicht in einem öffentlichen Issue.

Nutze stattdessen eine
[private GitHub-Sicherheitsmeldung](https://github.com/kaizo101/CPCdigital/security/advisories/new).
Beschreibe nach Möglichkeit:

- betroffene Version oder Commit
- reproduzierbare Schritte
- erwartete und tatsächliche Auswirkungen
- bekannte Voraussetzungen oder mögliche Gegenmaßnahmen

Zugangsdaten oder personenbezogene Testdaten bitte nur in minimal notwendigem
Umfang übermitteln.

## Sicherheitsgrenzen

Der v1-Produktpfad ist eine lokale Offline-Anwendung ohne Konto, Echtgeld,
öffentlichen Server oder erforderliche Netzwerkverbindung.

`packages/server` ist ein ruhender Prototyp für eine mögliche v2-Integration.
Er ist nicht als produktionsreif dokumentiert und wird nicht durch die
GitHub-Pages-Demo ausgeführt. Wer ihn lokal startet, muss mindestens
`JWT_SECRET`, `CLIENT_ORIGIN` und einen geeigneten `DB_PATH` setzen. Der Server
bindet ohne explizite Konfiguration ausschließlich an `127.0.0.1`.

Die GitHub-Pages-Demo ist ein statischer Build. Sie speichert Spielstände,
Replays und Einstellungen ausschließlich im Browser und betreibt keine
serverseitige Benutzerverwaltung.

## Keine Echtgeldfunktion

CPCdigital verarbeitet keine Einsätze, Auszahlungen oder Zahlungsdaten. Fehler,
die ausschließlich ein Echtgeldsystem voraussetzen, liegen außerhalb des
aktuellen Funktionsumfangs; Hinweise auf unerwartete Netzwerk- oder
Zahlungsintegration sind dennoch ausdrücklich erwünscht.
