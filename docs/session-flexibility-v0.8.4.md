# v0.8.4 — Session-Flexibilität und Tisch-QoL

Dieses Dokument konkretisiert den Funktionsumfang der in der
[Roadmap](../ROADMAP.md) zusammengefassten Version 0.8.4.

## Session-Setup

- Hero-Name im Setup wählbar machen statt dauerhaft `You` zu verwenden.
- Individuelle Starting-Stacks pro Bot unterstützen.
- Buy-in-Grenzen zwischen 40 und 250 BB konfigurierbar machen.
- Variante und Schwierigkeitsmix gemeinsam im Session-Setup wählen.

## Vorgewählte Aktionen und Clock

- Eine zentrale `pendingHeroAction`-Pipeline einführen und jede vorgewählte
  Aktion bei Zugbeginn erneut gegen den aktuellen Betting Context validieren.
- Zunächst ausschließlich sichere Pre-Selections anbieten: `Check`,
  `Check/Fold`, `Fold` und betragsgebundenes `Call`. Ungültig gewordene
  Auswahlen werden gelöscht; `Call any` und automatische Raises bleiben
  ausgeschlossen.
- Optionale Clock-Profile `Entspannt`, `Standard` und `Schnell` vorbereiten.
  Ein Timeout checkt kostenlos oder foldet, investiert aber nie automatisch
  Chips.
- Clock bei Hintergrund, Gerätesperre und kontrollierter App-Pause anhalten.
  Warnungen, Timebank und Timeout-Quelle müssen replayfähig sein.

## Informationen am Tisch

- **All-in-Equity:** Sobald alle verbleibenden Spieler all-in sind und keine
  Aktion mehr aussteht, Gewinn- und Splitwahrscheinlichkeiten vor dem Runout
  anzeigen. NLHE- und PLO-Regeln werden mit deterministischen Referenzhänden
  abgesichert.
- **Aktuelle Made Hand:** Optional die derzeit beste Hand des Heros am Tisch
  und im Replayer benennen. NLHE verwendet die beste Fünf-Karten-Kombination,
  PLO zwingend exakt zwei Hole Cards und drei Board Cards. Die Anzeige bleibt
  beschreibend und enthält weder Draw-/Equitywerte noch Empfehlungen.
- **Diagnosefähige Hand-ID:** Zusätzlich zur sessionlokalen Nummer eine
  sessionsübergreifend eindeutige, seed-neutrale und kopierbare ID am Tisch,
  im Replayer und in Exporten anzeigen. Nach Handabschluss verknüpft der
  Debugexport sie mit Variante, Tischkonfiguration, Bot-Identitäten,
  Startzuständen und geschütztem Reproduktionsschlüssel beziehungsweise
  kanonischem Snapshot. Die sichtbare ID darf keine unbekannten Karten
  ableitbar machen.

## Bot-Stacks und Sitzwechsel

- Aus der persönlichen BB-Policy abgeleitete Rebuy-Zielstacks auf eine
  sinnvolle, zur Chip-Unit passende Geldstufe aufrunden, ohne den
  Rebuy-Trigger abzusenken. Beträge wie `$1,14` vermeiden und die Rundung in
  Replay sowie Sessionstatistik konsistent erfassen.
- Die vorhandene `rebuyWhenShortBb`-Policy gemeinsam mit Deep-Stack-Cash-out
  zwischen Händen modellieren und im Debugexport sichtbar machen.
- Schwellen, Rebuy-Limits und Ersatzspieler-Sequenzen deterministisch testen.
  Beim Aussetzen wegen zu vieler BB wird der tatsächlich ausgecashte Stack
  angezeigt statt der Sitz fälschlich mit `0,00` zu beschriften.

## Bot-Identitäten

Neue Identitäten, Wiederholungssteuerung, stakeübergreifende Pools,
Variantenkompetenz und spätere Spielernotizen folgen dem zentralen Dokument
[Bot-Dynamik, Stake-Roster und Spielernotizen](bot-dynamics-roster-and-notes.md).
0.8.4 implementiert keine starre Quote und keinen separaten Roster pro
Variante.

## Release-Gate

- Integrationstest für Setup → mehrere Hände → Rebuy beziehungsweise
  Cash-out und Ersatzspieler.
- Sequenztests für Pre-Selection nach Check, Bet und Reraise sowie für
  Clock-/Resume-Randfälle auf Desktop und Android.
- Equity-, Made-Hand- und Hand-ID-Anzeigen bleiben rein informativ und
  verändern weder Enginezustand noch Botentscheidungen oder deterministische
  Replays.
