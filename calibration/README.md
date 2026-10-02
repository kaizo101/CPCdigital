# Calibration History

Kalibrierungsergebnisse pro Release als Vergleichsbasis.

## Release-Gate: Pflichtmessung, keine Korridor-Pflicht

Vor einem botrelevanten Release werden deterministische NLHE-/PLO-Läufe für
alle betroffenen Archetypen und Formate durchgeführt und mit Version/Commit,
Handzahl, Seed-Verfahren, Metrikdefinition sowie Rohzählern und Nennern
dokumentiert. Zielkorridore sind **diagnostische Leitplanken**: Ein Wert
außerhalb des Korridors beendet den Lauf nicht automatisch. Kleine Abweichungen
werden begründet akzeptiert oder als Beobachtung notiert; große, systematische
oder spielerisch auffällige Abweichungen erfordern eine Ursachenprüfung und
eine explizite Release-Entscheidung. Korridore werden nicht passend zum Lauf
geändert.

**Blockierend** bleiben ungültige Aktionen, verletzte Metrik-/Showdown-
Invarianten (einschließlich Widersprüchen zwischen Rate und Rohzählern),
nicht endliche Messwerte und die gesicherten Deep-Shove-Fälle.
Eine Rate ohne Gelegenheit (Nenner 0) ist `n/a`, nicht 0 % oder ein
Korridorverstoß; AF ohne Calls ist ebenfalls nicht auswertbar. Der
300-Hand-Snapshot ist ein separater Drift-Alarm: Nach beabsichtigten
Strategieänderungen wird ein Fehler analysiert und die Baseline erst nach
Review bewusst aktualisiert, nicht durch Aufweichen der Zielkorridore.

Die Berichte enthalten je nach Release:

- VPIP, PFR, 3-Bet, C-Bet, AF und WTSD für die kalibrierten Archetypen und Formate
- deterministische Entwicklungs- und 10.000-Hand-Bestätigungsläufe
- die verwendete Metrikdefinition sowie begründete Änderungen an Zielkorridoren
- strukturelle Invarianten wie Invalid Actions, Deep-Stack-Open-Shoves und
  uncommitted Deep-Shoves
- anschließende 100–150-Hände-Web-Probe-Sessions mit Triage auffälliger Hände
- die Reproduktion über `npm run calibrate:bots`

Der kurze Layer-2-Regressionslauf wird mit `npm run test:calibration`
ausgeführt. Er simuliert deterministisch 300 Hände für alle 24 Kombinationen
aus NLHE/PLO, vier Archetypen und drei Formaten und vergleicht sie mit dem
[v0.8.2-Foundation-Snapshot](v0.8.2-foundation-300-hand.json). Abweichungen von mehr als 2
Prozentpunkten werden gemeldet, mehr als 5 Prozentpunkte sowie strukturelle
Verstöße schlagen fehl. Für den nichtprozentualen Aggressionsfaktor gelten
0,2 als Warn- und 0,5 als Fehlergrenze.

`npm run test:stakes` vergleicht zusätzlich deterministische NLHE- und
PLO-6-max-Läufe bei proportional identischen `0,01/0,02`- und
`10/20`-Tischen mit jeweils 100 BB. Bei gleicher Identität, Skillstufe und
Situation müssen die normalisierten Statistiken und strukturellen Invarianten
übereinstimmen. Unterschiedliche reale Stacktiefen oder Chip-Units bleiben
bewusst außerhalb dieser Invariante.

Der Snapshot wird nicht während eines normalen Tests verändert. Nach einer
bewusst freigegebenen strategischen Änderung kann er mit
`npm run calibrate:baseline` neu erzeugt und anschließend im Diff geprüft
werden.

### Maschinenprüfbarer Releasebericht

`npm run calibrate:release -- --output calibration/evidence/<eindeutiger-name>.json`
führt standardmäßig 10.000 Hände je Kombination für NLHE und PLO aus. Die
Ausgabedatei muss neu sein (kein Überschreiben). `--hands N` ist nur für
Entwicklung und Smoke-Läufe vorgesehen. Ein vorhandener Bericht wird mit
`npm run calibrate:release -- --validate <pfad>` erneut geprüft.

Der Bericht enthält App-Version, Commit, Dirty-Worktree-Status, Zeitpunkt,
Metrikschema, Handzahl, Seed-Salts sowie alle 24 Varianten-/Archetyp-/Format-
Kombinationen mit Kennzahlen, Zielbereichen und Rohzählern/Nennern. Die
Validierung verlangt genau diese 24 Kombinationen, plausible Rohwerte,
strukturelle Invarianten und alle vorgesehenen Bestätigungsläufe. Der kurze
300-Hand-Snapshot bleibt eine separate Regression und wird dadurch nicht
ersetzt.

Eine zweite, unabhängige Seed-Serie wird **nur** für Kombinationen gestartet,
in denen mindestens eine Zielmetrik außerhalb des Korridors liegt oder eine
Metrik weniger als 50 Gelegenheiten hat (einschließlich Nenner 0). Die
Bestätigung verwendet dieselbe Handzahl und dokumentiert die betroffenen
Metriken samt vollständigen Rohwerten. Sie entscheidet nicht automatisch über
eine Freigabe: Persistenz, Stichprobengröße und Spielwirkung werden im
Releasebericht fachlich triagiert. Ein Bericht aus einem schmutzigen Worktree
ist als solcher markiert und vor einer Freigabe einem Commit zuzuordnen.

Deck- und Entscheidungs-Seeds werden für jede Hand separat aus Profil, Format
und Handnummer abgeleitet; der Dealer rotiert dabei explizit. Eine Änderung,
die einen Runout früher oder später beendet, verändert deshalb nicht mehr die
Karten oder den Zufallsstrom aller nachfolgenden Hände. Sessionzustände bleiben
bewusst erhalten, damit echte strategische Folgewirkungen weiterhin sichtbar
sind.

## Herkunft und Status der Zielkorridore

Forschungsarbeiten, Datengrundlagen und deren bisheriger Prüfstatus stehen im
[Literatur- und Evidenzregister](../docs/de/concepts/literatur-und-evidenz.md). Dort
aufgeführte Arbeiten ändern für sich genommen keinen Zielkorridor.

Die hinterlegten Zielkorridore (VPIP, PFR, 3-Bet, C-Bet, AF, WTSD etc.) sind
keine empirisch exakten Einzelwerte, sondern eine plausibilitätsgeprüfte
Synthese aus öffentlich diskutierter Poker-Literatur, Forenwissen und
wiederholtem Abgleich über mehrere KI-Modelle. Vergleichende Bewertungen durch
KI-Modelle dienen dabei ausschließlich der Plausibilitätsprüfung und ersetzen
keine belastbare Quelle oder fachliche Begründung.

Die Korridore beanspruchen nicht, „die eine richtige“ Zahl für einen Archetyp
zu treffen — bei einem Thema wie Poker-Statistiken gibt es diese ohnehin nicht:
Der plausible Wertebereich für beispielsweise LAG-VPIP hängt stark von Stakes,
Ära, Format und Spielerpool ab. Insbesondere die PLO-Theorie hat sich in den
letzten zwei Jahrzehnten bei Aggression, Range-Konstruktion und
3-Bet-Häufigkeiten spürbar verschoben.

Die Korridore sind deshalb als **aktuelle, begründbare Einschätzung**, nicht als
zeitlose Wahrheit zu verstehen. Sie sind explizit nicht in Stein gemeißelt.

### Wann sich ein Korridor ändert

Änderungsvorschläge sind willkommen, folgen aber einer klaren Eingangshürde,
damit aus einer Meinungsverschiedenheit ein bewertbarer Vorschlag statt einer
offenen Debatte wird. Ein Änderungsvorschlag sollte enthalten:

1. **Eine nachvollziehbare Begründung** — eine Quelle, ein Rechenweg oder ein
   plausibles Argument, nicht nur ein Eindruck („fühlt sich zu tight/loose
   an“).
2. **Eine konkrete Zielgröße** — welcher Korridor soll sich wie stark in
   welche Richtung verschieben, nicht nur „das stimmt nicht“.
3. **Idealerweise einen Pull Request**, der Begründung und vorgeschlagene
   Werte zusammen enthält, damit die Änderung wie jeder andere Beitrag
   bewertet werden kann.

Wie im Hauptteil dieser Dokumentation beschrieben, werden Korridoränderungen
nie still an einzelne Laufergebnisse angepasst, sondern im jeweiligen
Kalibrierungsbericht explizit begründet und dokumentiert — unabhängig davon, ob
der Anstoß aus einem eigenen Fund oder einem externen Vorschlag stammt.

Ein Regression-Snapshot ist dabei kein Zielkorridor, sondern dokumentiert einen
konkreten Softwarestand. Eine Abweichung davon begründet für sich weder eine
Strategie- noch eine Korridoränderung. Vor jeder Anpassung ist außerdem zu
prüfen, ob sich lediglich Definition oder Nenner der betroffenen Metrik
verändert haben.

### Was das nicht bedeutet

Diese Offenheit ist keine Einladung zu endlosen Grundsatzdebatten ohne
Entscheidung. Vorschläge ohne nachvollziehbare Begründung oder konkrete
Zielgröße werden nicht aufgenommen. Die Maintainer-Entscheidung im Rahmen
dieses Projekts bleibt final.

## Berichte

- [v0.8.2 — Checkpoint der gewählten Flop→Turn-Linie und Drift-Eingrenzung](v0.8.2-flop-turn-line-checkpoint.md)
- [v0.8.2 — Sessiondiagnose: Shove-Tiefensicherung und Calling-Station-C-Bet-Defense](v0.8.2-session-diagnostics-2026-08-12.md)
- [v0.8.2 — Foundation-Snapshot nach Kontext-, Auswahl- und Diagnostikumbau](v0.8.2-foundation-300-hand.json)
- [v0.8.1 — bestandenes Release-Gate und finale Rohwerte](v0.8.1-release-gate.md)
- [v0.8.0 — Format-Isolation und strukturelle NLHE-/PLO-Baseline](v0.8.0.md)
- [v0.7.8 — NLHE-C-Bet-Metrik und Regression](v0.7.8.md)
- [v0.7.8 — PLO-Abschluss nach Metrik-Audit](plo-nit-kalibrierung.md)
- [v0.7.9 — Opponent-Evidenz und Metrikschema v2](v0.7.9.md)
- [v0.7.6 — PLO-Baseline](v0.7.6.md)
