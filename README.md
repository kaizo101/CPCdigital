# CPCdigital

Eine Offline-Poker-App für den Desktop: Singleplayer-Poker gegen glaubwürdige Bots, ohne Echtgeld, Konto, Server oder Internetverbindung.

Das Projekt befindet sich in früher Entwicklung. Der aktuelle Release ist **v0.7.6** und bietet No-Limit Texas Hold'em und Pot-Limit Omaha High mit glaubwürdigen Bots, variant-spezifischer Handbewertung, kalibrierten Archetypen, Auto-Rebuys und Hand-Replays. Weitere Varianten und die spätere Lernplattform sind in der [Roadmap](ROADMAP.md) beschrieben.

## Leitgedanken

- **Offline First:** Das Spiel läuft vollständig lokal in Electron.
- **Glaubwürdige Bots:** Persönlichkeit, Skill, Reads, Gewohnheiten und mentale Zustände sollen unterscheidbare Gegner erzeugen.
- **Fair Play:** Bots erhalten nur Informationen, die auch ein realer Spieler kennen könnte.
- **Casual statt Solver:** Menschlich wirkendes Spiel und Unterhaltung sind wichtiger als vorgetäuschte GTO-Perfektion.
- **Learning-ready:** Hände und Entscheidungen werden so strukturiert erfasst, dass sie später analysiert und wiederholt werden können.

## Aktueller Stand

Derzeit enthalten sind unter anderem:

- No-Limit Texas Hold'em und Pot-Limit Omaha High als lokale Singleplayer-Partie
- Variant-Selector im Setup (NLHE / PLO)
- variant-spezifische Handbewertung: 7-Kategorien NLHE + Omaha mit Draw-Dichte, Wrap-Outs, Nut-Potential
- flexible Tischgröße von Heads-up bis Full Ring
- Setup für Blinds, Startstack und Dollar oder Euro
- Blind-Presets und automatische Anpassung des Standardstacks auf 100 BB
- vollständige Engine-Vorgaben für legale Aktionen, Min-Raises, All-ins und Reopen-Situationen
- Side Pots, Split Pots und schrittweise All-in-Runouts
- strukturierte Action History, Decision Snapshots und deterministische Hand-Replays
- seedbarer Zufallszahlengenerator für reproduzierbare Tests und Sessions
- Trennung öffentlicher und privater Informationen
- vier unterscheidbare Bot-Archetypen: TAG, Nit, LAG und Calling Station
- seltene Maniac-Ausprägung als extreme LAG-Variante
- 44 individuelle Bot-Identitäten mit Namen, Avataren und wiedererkennbaren Gewohnheiten
- Utility-basierte Botentscheidungen mit Pot Odds, Betgröße, effektivem Stack und SPR
- getrennte Modelle für Personality, Skill, Mental State, Reads und Memory
- Street-Analyse mit C-Bet-Erkennung, Range-Schätzung und Multi-Street-Line-Planning
- archetyp-spezifische Tilt-Reaktionen und Beobachtungsfähigkeit
- Reads mit Stichprobengröße, Konfidenz und systematischen Fehlern (Beta-Distribution)
- gewichtete Auswahl plausibler Aktionen und situationsabhängige Reaktionszeiten
- Debug Inspector mit Entscheidungskontext, Action Scores und Gründen
- persistenter lokaler Bot-Roster mit wiederkehrenden Gegnern über Sessions
- einfache Rebuys zwischen Händen sowie verschiedene Bedienungs- und Anzeigeverbesserungen
- kompakter JSON-Debug-Export (v2) für KI-gestützte Analyse
- Mixed-Table-Kalibrierung und Balance-Simulation über alle Archetypen
- Auto-Rebuys mit persönlichkeitsabhängigen Policies und Ersatz-Bots
- grafisches Hand-Replay mit Step-Through, Autoplay, Session-Navigation und lokalem Archiv der letzten 200 Hände
- PokerStars-kompatible Hand-History (Export pro Hand oder alle geladenen Hände)
- 7-stufige Handbewertung mit Board-Kontext (Premium bis Air)
- Board-Verschlechterungserkennung und Protection-Betting
- ReadTyp: Gegner-Bet-Sizing-Analyse mit Abweichungserkennung
- Stack- und positionsabhängiges Raise-Sizing

Noch nicht als stabiler Funktionsumfang enthalten sind weitere Pokervarianten, persistente Sessionstatistiken, Tutorials, Analysen und Online-Multiplayer. Maßgeblich dafür ist die [Roadmap](ROADMAP.md).

Eine öffentliche Demo ohne Server/Secrets gibt es unter **[cpcdigital-demo](https://github.com/kaizo101/cpcdigital-demo)** mit [Live-Deployment auf GitHub Pages](https://kaizo101.github.io/cpcdigital-demo/).

## Voraussetzungen

- eine aktuelle Node.js-LTS-Version
- npm
- eine Desktop-Umgebung, in der Electron ausgeführt werden kann

## Lokale Entwicklung

Abhängigkeiten installieren:

```bash
npm install
```

Vite und Electron im Entwicklungsmodus starten:

```bash
npm run dev
```

## Tests und Build

Alle vorhandenen Workspace-Tests ausführen:

```bash
npm test
```

TAG und Nit reproduzierbar über Full Ring, 6-max und Heads-up kalibrieren:

```bash
npm run calibrate:bots
```

Session-Evaluator mit Root-Cause-Analyse ausführen:

```bash
npx tsx packages/client/src/session/session-evaluator.ts
```

Alle Pakete bauen und den Client dabei typprüfen:

```bash
npm run build
```

Unter Linux kann die gebaute Offline-App außerdem über das vorhandene Startskript gestartet werden:

```bash
./start.sh
```

Ein fertiges plattformspezifisches Installationspaket gehört noch nicht zum aktuellen Entwicklungsstand.

## Projektstruktur

```text
packages/
├── client/          React-Oberfläche und aktuelle Bot-Decision-Engine
├── poker-engine/    Pokerregeln, State Machine, Events und Replays
├── shared/          gemeinsam verwendete Typen
├── electron/        Desktop-Wrapper
└── server/          ruhender Online-Prototyp für eine mögliche v2-Integration
```

Die laufende Offline-App importiert oder benötigt das Server-Paket nicht. Es bleibt bewusst als ruhender Prototyp für eine mögliche v2-Integration im Repository; bis dahin ist es weder Produktionspfad noch Teil des v1-Releaseumfangs.

## Projektdokumentation

- [Roadmap](ROADMAP.md) — geplante Entwicklungsphasen und langfristige Vision
- [Changelog](CHANGELOG.md) — tatsächlich veröffentlichte Änderungen je Version
- [Entwicklerdokumentation](DEV.md) — Architektur, Kalibrierung, Debugging
- [Beitragsrichtlinien](CONTRIBUTING.md) — Rechte und Lizenzierung eingereichter Beiträge

## Lizenz

CPCdigital steht unter der
[GNU Affero General Public License Version 3](LICENSE) (`AGPL-3.0-only`).
Copyright © 2026 Lukas Schäfer.

Der Lizenzumfang umfasst den Quellcode und die für CPCdigital erstellten
Projektassets dieses Repositorys, einschließlich der mit ChatGPT erzeugten
Avatarbilder. Abhängigkeiten und sonstiges Material Dritter behalten ihre
jeweiligen Lizenzen; Details stehen in [NOTICE.md](NOTICE.md).

Wer veränderte Versionen verteilt, muss die Bedingungen der AGPLv3 einschließlich
der Bereitstellung des korrespondierenden Quellcodes erfüllen. Für eine später
über ein Netzwerk angebotene modifizierte Version gilt zusätzlich Abschnitt 13
der AGPLv3.

Die separat veröffentlichte Demo besitzt ein eigenes Repository und wird dort
eigenständig unter `AGPL-3.0-only` mit dem zugehörigen Web-Quellcode angeboten.

## Hinweis

CPCdigital ist ein Spiel- und Lernprojekt ohne Echtgeldfunktion. Der aktuelle Stand ist eine Entwicklungsversion und noch kein fertiges Produkt.
