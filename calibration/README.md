# Calibration History

Kalibrierungsergebnisse pro Release als Vergleichsbasis.

Die Berichte enthalten je nach Release:

- VPIP, PFR, 3-Bet, C-Bet, AF und WTSD für die kalibrierten Archetypen und Formate
- deterministische Entwicklungs- und 10.000-Hand-Bestätigungsläufe
- die verwendete Metrikdefinition sowie begründete Änderungen an Zielkorridoren
- die Reproduktion über `npm run calibrate:bots`

Zielkorridore bleiben grundsätzlich stabil. Ändert sich eine fachliche
Metrikdefinition, wird eine notwendige Korridorkorrektur im jeweiligen Bericht
explizit begründet, statt still an einzelne Laufergebnisse angepasst zu werden.

## Berichte

- [v0.7.8 — NLHE-C-Bet-Metrik und Regression](v0.7.8.md)
- [v0.7.8 — PLO-Abschluss nach Metrik-Audit](plo-nit-kalibrierung.md)
- [v0.7.6 — PLO-Baseline](v0.7.6.md)
