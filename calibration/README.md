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
[v0.8.1-Snapshot](v0.8.1-300-hand.json). Abweichungen von mehr als 2
Prozentpunkten werden gemeldet, mehr als 5 Prozentpunkte sowie strukturelle
Verstöße schlagen fehl. Für den nichtprozentualen Aggressionsfaktor gelten
0,2 als Warn- und 0,5 als Fehlergrenze.

Der Snapshot wird nicht während eines normalen Tests verändert. Nach einer
bewusst freigegebenen strategischen Änderung kann er mit
`npm run calibrate:baseline` neu erzeugt und anschließend im Diff geprüft
werden.

Zielkorridore bleiben grundsätzlich stabil. Ändert sich eine fachliche
Metrikdefinition, wird eine notwendige Korridorkorrektur im jeweiligen Bericht
explizit begründet, statt still an einzelne Laufergebnisse angepasst zu werden.

## Berichte

- [v0.8.0 — Format-Isolation und strukturelle NLHE-/PLO-Baseline](v0.8.0.md)
- [v0.7.8 — NLHE-C-Bet-Metrik und Regression](v0.7.8.md)
- [v0.7.8 — PLO-Abschluss nach Metrik-Audit](plo-nit-kalibrierung.md)
- [v0.7.9 — Opponent-Evidenz und Metrikschema v2](v0.7.9.md)
- [v0.7.6 — PLO-Baseline](v0.7.6.md)
