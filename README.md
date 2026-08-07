# CPCdigital

Eine primär für den Desktop entwickelte Offline-Poker-App: Singleplayer-Poker gegen glaubwürdige Bots, ohne Echtgeld, Konto, Server oder Internetverbindung. Ein nativer Android-Debug-Prototyp ergänzt die Desktop-App als frühes mobiles Entwicklungsziel.

Das Projekt befindet sich in früher Entwicklung. Der aktuelle Release ist **v0.7.9** und bietet No-Limit Texas Hold'em und Pot-Limit Omaha High mit glaubwürdigen Bots, variant-spezifischer Handbewertung, kalibrierten Archetypen, Auto-Rebuys und Hand-Replays. Weitere Varianten und die spätere Lernplattform sind in der [Roadmap](ROADMAP.md) beschrieben.

## Leitgedanken

- **Offline First:** Das Spiel läuft vollständig lokal in Electron oder aus dem gebündelten Android-WebView.
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
- 44 individuelle Bot-Identitäten mit Namen und wiedererkennbaren Gewohnheiten;
  40 davon besitzen eigene Porträts, die übrigen verwenden Initialen
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
- Auto-Rebuys sowie archetypabhängige Cash-outs mit Ersatz-Bots; sehr große
  Gewinnerstacks verlassen den Tisch spätestens am persönlichen Limit bis
  800 BB
- grafisches Hand-Replay mit Step-Through, Autoplay, Session-Navigation und lokalem Archiv der letzten 200 Hände
- PokerStars-kompatible Hand-History (Export pro Hand oder alle geladenen Hände)
- 7-stufige Handbewertung mit Board-Kontext (Premium bis Air)
- variantenabhängige Board-Verschlechterungserkennung und Protection-Betting für NLHE und PLO
- ReadTyp: Gegner-Bet-Sizing-Analyse mit kanonischer Pot-Fraktion und aktionsabhängiger Abweichungsreaktion
- Stack- und positionsabhängiges Raise-Sizing
- nativer Android-Debug-Prototyp mit Capacitor, Landscape-Vollbild und kompakter Touch-Actionbar

Noch nicht als stabiler Funktionsumfang enthalten sind weitere Pokervarianten, persistente Sessionstatistiken, Tutorials, Analysen, Online-Multiplayer oder eine veröffentlichungsreife Android-App. Maßgeblich dafür ist die [Roadmap](ROADMAP.md).

Die offizielle **[Browser-Demo](https://kaizo101.github.io/CPCdigital/)** wird
direkt aus diesem öffentlichen Repository über GitHub Pages gebaut. Die frühere
URL im Repository
[cpcdigital-demo](https://github.com/kaizo101/cpcdigital-demo) bleibt vorerst als
Weiterleitung und zur Bewahrung ihrer Historie bestehen.

Die Browser-Demo bietet auf Smartphones nur einen funktionalen, rudimentären
Fallback. Die weitergehende mobile Optimierung findet im nativen
Android-Prototyp statt; eine PWA und vollständige Feature-Parität der mobilen
Webseite sind nicht vorgesehen.

## Voraussetzungen

- Node.js 24 LTS (entsprechend [`.nvmrc`](.nvmrc); Node.js 26 wird derzeit nicht unterstützt)
- npm
- eine Desktop-Umgebung, in der Electron ausgeführt werden kann
- optional für Android: Android Studio mit SDK 36 und ein Gerät oder Emulator

## Lokale Entwicklung

Abhängigkeiten reproduzierbar installieren:

```bash
npm ci
```

Das Repository erlaubt die für Electron, esbuild und die nativen
Server-Abhängigkeiten benötigten Install-Skripte über eine versionsgebundene
`allowScripts`-Policy. Wurde Electron zuvor mit einer nicht unterstützten
Node-Version oder blockierten Install-Skripten unvollständig installiert,
zunächst Node.js 24 aktivieren, `node_modules/electron` entfernen und
`npm install` erneut ausführen.

Vite und Electron im Entwicklungsmodus starten:

```bash
npm run dev
```

### Android-Debug-Prototyp

Das native Projekt liegt eingecheckt unter `android/`. Nach Änderungen am
Client werden Build und Capacitor-Assets synchronisiert und das Projekt in
Android Studio geöffnet:

```bash
npm run android:sync
npm run android:open
```

Alternativ baut und startet `npm run android:run` direkt auf einem verbundenen
Gerät oder Emulator. Der vollständige lokale Check einschließlich
`assembleDebug` läuft mit:

```bash
npm run android:check
```

Der Gradle-Wrapper verwendet nach Möglichkeit die Java-Runtime von Android
Studio, da die systemweite Java-26-Runtime mit dem Android-Build derzeit nicht
kompatibel ist. Web-Builds und Gradle-Ausgaben werden nur generiert und nicht
eingecheckt.

Der Android-Stand ist ein Debug-Prototyp ohne Release-Signierung oder
Veröffentlichungspipeline. Setup und Tisch sind auf Landscape ausgelegt. Der
HandReplayer ist funktional, seine Tischgeometrie wirkt auf kleinen Displays
aber noch zu klein und gequetscht; die responsive Überarbeitung ist für
v0.9.1 geplant.

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

Den gebauten Client anschließend in den vier unterstützten Referenz-Viewports
mit Chrome/Chromium prüfen:

```bash
npm run test:responsive
```

Unter Linux kann die gebaute Offline-App außerdem über das vorhandene Startskript gestartet werden:

```bash
./start.sh
```

Ein fertiges plattformspezifisches Installationspaket gehört noch nicht zum aktuellen Entwicklungsstand.

## Projektstruktur

```text
.
├── packages/
│   ├── client/          React-Oberfläche und aktuelle Bot-Decision-Engine
│   ├── poker-engine/    Pokerregeln, State Machine, Events und Replays
│   ├── shared/          gemeinsam verwendete Typen
│   ├── electron/        Desktop-Wrapper
│   └── server/          ruhender Online-Prototyp für eine mögliche v2-Integration
└── android/             nativer Capacitor-Debug-Prototyp
```

Die laufende Offline-App importiert oder benötigt das Server-Paket nicht. Es bleibt bewusst als ruhender Prototyp für eine mögliche v2-Integration im Repository; bis dahin ist es weder Produktionspfad noch Teil des v1-Releaseumfangs.

Der Server startet absichtlich nicht ohne ein mindestens 32 Byte langes
`JWT_SECRET` und bindet standardmäßig nur an `127.0.0.1`. Eine lokale
Beispielkonfiguration steht in [`.env.example`](.env.example). Ein Secret lässt
sich beispielsweise mit `openssl rand -hex 32` erzeugen. Weitere Hinweise zu
Netzwerkgrenzen und vertraulichen Meldungen stehen in
[`SECURITY.md`](SECURITY.md).

## Projektdokumentation

- [Roadmap](ROADMAP.md) — geplante Entwicklungsphasen und langfristige Vision
- [Changelog](CHANGELOG.md) — tatsächlich veröffentlichte Änderungen je Version
- [Entwicklerdokumentation](DEV.md) — Architektur, Kalibrierung, Debugging
- [Test- und Distributionsstrategie](TESTING_STRATEGY.md) — Teststufen, Rollen und Release-Kommunikation
- [Tester-Formulare](TESTER_FORMS.md) — Vorlagen sowie lokale [HTML-Formulare](testing/forms/README.md) für Realismus-, Usability-, UI- und Betatests
- [Beitragsrichtlinien](CONTRIBUTING.md) — Rechte und Lizenzierung eingereichter Beiträge
- [Sicherheitsrichtlinie](SECURITY.md) — unterstützte Stände und vertrauliche Meldungen

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

Dieses Repository ist die offizielle Quellcodebasis der
[GitHub-Pages-Demo](https://kaizo101.github.io/CPCdigital/). Das frühere
Demo-Repository bleibt für seine historische Revision eigenständig unter
`AGPL-3.0-only` lizenziert und verweist auf diesen Stand.

## Hinweis

CPCdigital ist ein Spiel- und Lernprojekt ohne Echtgeldfunktion. Der aktuelle Stand ist eine Entwicklungsversion und noch kein fertiges Produkt.
