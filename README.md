# CPCdigital

CPCdigital ist eine primär für den Desktop entwickelte Offline-Poker-App:
Singleplayer-Poker gegen glaubwürdige Bots, ohne Echtgeld, Konto, Server oder
Internetverbindung.

Im Mittelpunkt steht menschlich wirkendes Casual-Poker statt vorgetäuschter
Solver-Perfektion. Bots erhalten dabei nur Informationen, die auch ein realer
Spieler kennen könnte.

Der aktuelle Release ist **v0.8.0**. `CPCdigital` ist weiterhin der interne
Arbeitstitel; der endgültige Produktname wird vor dem Release Candidate
festgelegt.

## Highlights

- **Zwei Varianten:** No-Limit Texas Hold'em und Pot-Limit Omaha High
- **Flexible Tische:** Heads-up, 6-max und Full Ring mit einstellbaren Blinds,
  Startstack und Anzeige in Euro oder Dollar
- **Glaubwürdige Gegner:** TAG, Nit, LAG und Calling Station mit
  unterschiedlichen Persönlichkeiten, Skills, Reads und Gewohnheiten
- **Wiederkehrende Identitäten:** 44 Bots mit eigenem Verhalten; 40 besitzen
  individuelle Porträts
- **Nachvollziehbare Hände:** Hand-Replay, lokales Archiv,
  PokerStars-kompatible Hand-History und kompakter Debug-Export
- **Vollständige Pokerregeln:** Side Pots, Split Pots, All-ins, Min-Raises und
  schrittweise Runouts werden durch die gemeinsame Engine verwaltet
- **Reproduzierbares Verhalten:** Seedbare Sessions, strukturierte Decision
  Records und ein optionaler Debug Inspector für Botentscheidungen
- **Mehrere Entwicklungsplattformen:** Electron-Desktop-App, öffentliche
  Browser-Demo und nativer Android-Debug-Prototyp

## Projektstatus

CPCdigital befindet sich in aktiver Entwicklung. Der Schwerpunkt liegt derzeit
auf Bot-Realismus, Kalibrierung und einer stabilen Offline-Spielerfahrung für
NLHE und PLO. Maßgeblich für geplante Arbeiten ist die
[Roadmap](ROADMAP.md); tatsächlich veröffentlichte Änderungen stehen im
[Changelog](CHANGELOG.md).

Die offizielle **[Browser-Demo](https://kaizo101.github.io/CPCdigital/)** wird
direkt aus diesem öffentlichen Repository gebaut. Sie eignet sich zum schnellen
Ausprobieren; Desktop bleibt die primäre Entwicklungsplattform.

### Bekannte Einschränkungen

- Es gibt noch keine fertigen plattformspezifischen Installer oder
  signierten Release-Pakete.
- Bot-Balance und insbesondere komplexe PLO-/Heads-up-Postflop-Situationen
  werden weiter kalibriert.
- Android ist ein unsignierter Landscape-Debug-Prototyp. Ein begrenzter
  Zwischenfix hält den Hand-Replayer im kompakten Landscape lesbar; das
  vollständige responsive Replay- und Touch-Redesign folgt weiterhin mit der
  gemeinsamen Tischgeometrie.
- Die mobile Browseransicht ist nur ein funktionaler Fallback; eine PWA und
  vollständige mobile Feature-Parität sind nicht vorgesehen.
- Persistente Sessionstatistiken, Tutorials, weitergehende Analysen und
  zusätzliche Pokervarianten gehören noch nicht zum stabilen Funktionsumfang.
- Der vorhandene Server ist ein ruhender Prototyp. Online-Multiplayer ist kein
  Bestandteil der aktuellen Offline-App.

Konkrete Fehler und technische Folgebefunde werden nicht dauerhaft in dieser
Liste gepflegt, sondern in Roadmap, Changelog und den jeweiligen Testberichten
dokumentiert.

## Lokale Entwicklung

Vorausgesetzt werden [Node.js 24 LTS](.nvmrc), npm und für die Desktop-App eine
grafische Umgebung mit Electron.

```bash
npm ci
npm run dev
```

Unter Linux kann die gebaute Offline-App alternativ über `./start.sh` gestartet
werden.

Der Android-Prototyp benötigt zusätzlich Android Studio und SDK 36. Der
vollständige Workflow sowie Architektur-, Kalibrierungs- und Debug-Hinweise
stehen in der [Entwicklerdokumentation](DEV.md).

## Tests und Build

```bash
npm test             # alle Workspace-Tests
npm run build        # alle Pakete bauen und den Client typprüfen
npm run test:responsive
```

Der Responsive-Smoke setzt einen vorherigen Client-Build sowie Chrome oder
Chromium voraus. Bot-Kalibrierungen sind wegen ihrer Laufzeit ein separates
Release-Gate; Reproduktion und Baselines stehen im
[Kalibrierungsverzeichnis](calibration/README.md).

## Dokumentation

- [Roadmap](ROADMAP.md) — Entwicklungsphasen und langfristige Vision
- [Changelog](CHANGELOG.md) — veröffentlichte Änderungen je Version
- [Entwicklerdokumentation](DEV.md) — Architektur, Android, Kalibrierung und
  Debugging
- [Kalibrierungsberichte](calibration/README.md) — reproduzierbare Bot-Baselines
- [Test- und Distributionsstrategie](TESTING_STRATEGY.md) — Teststufen,
  Rollen und Release-Kommunikation
- [Tester-Formulare](TESTER_FORMS.md) — Vorlagen für Realismus-, Usability-,
  UI- und Betatests
- [Beitragsrichtlinien](CONTRIBUTING.md) — Beiträge, Rechte und Lizenzierung
- [Sicherheitsrichtlinie](SECURITY.md) — unterstützte Stände und vertrauliche
  Meldungen

## Lizenz

CPCdigital steht unter der
[GNU Affero General Public License Version 3](LICENSE) (`AGPL-3.0-only`).
Copyright © 2026 Lukas Schäfer.

Der Lizenzumfang umfasst den Quellcode und die für CPCdigital erstellten
Projektassets einschließlich der mit ChatGPT erzeugten Avatarbilder.
Abhängigkeiten und Material Dritter behalten ihre jeweiligen Lizenzen; Details
stehen in [NOTICE.md](NOTICE.md).

Wer eine veränderte Version verteilt oder über ein Netzwerk anbietet, muss die
einschlägigen Bedingungen der AGPLv3 einschließlich der Bereitstellung des
korrespondierenden Quellcodes erfüllen.

## Hinweis

CPCdigital ist ein Spiel- und Lernprojekt ohne Echtgeldfunktion. Der aktuelle
Stand ist eine Entwicklungsversion und kein fertiges Produkt.
