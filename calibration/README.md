# Calibration History

Kalibrierungsergebnisse pro Release als Vergleichsbasis.

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

Deck- und Entscheidungs-Seeds werden für jede Hand separat aus Profil, Format
und Handnummer abgeleitet; der Dealer rotiert dabei explizit. Eine Änderung,
die einen Runout früher oder später beendet, verändert deshalb nicht mehr die
Karten oder den Zufallsstrom aller nachfolgenden Hände. Sessionzustände bleiben
bewusst erhalten, damit echte strategische Folgewirkungen weiterhin sichtbar
sind.

## Herkunft und Status der Zielkorridore

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

- [v0.8.2 — Foundation-Snapshot nach Kontext-, Auswahl- und Diagnostikumbau](v0.8.2-foundation-300-hand.json)
- [v0.8.1 — bestandenes Release-Gate und finale Rohwerte](v0.8.1-release-gate.md)
- [v0.8.0 — Format-Isolation und strukturelle NLHE-/PLO-Baseline](v0.8.0.md)
- [v0.7.8 — NLHE-C-Bet-Metrik und Regression](v0.7.8.md)
- [v0.7.8 — PLO-Abschluss nach Metrik-Audit](plo-nit-kalibrierung.md)
- [v0.7.9 — Opponent-Evidenz und Metrikschema v2](v0.7.9.md)
- [v0.7.6 — PLO-Baseline](v0.7.6.md)
