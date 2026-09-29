# Offline-Kern: Review- und Korrektheitsnachtrag (29.09.2026)

## Geltungsbereich

Dieser Nachtrag behandelt die lokale NLHE-/PLO-Engine und den
`LocalGameRunner`. Das ruhende Serverpaket ist ausdrücklich nicht Teil der
fachlichen Prüfung oder der Änderungen. Er ergänzt das historische
[REVIEW.md](../REVIEW.md), ersetzt dessen damaligen Versionsstand aber nicht.

Die Prüfung verwendete gezielte Reproduktionen, deterministische und
randomisierte Handabläufe, unabhängige Showdown-Vergleiche sowie die
bestehenden Workspace-, Stake- und Kalibrierungsprüfungen. Die Ergebnisse
beweisen keine allgemeine Fehlerfreiheit; insbesondere ersetzen sie keine
vollständige formale Verifikation aller Wettsequenzen.

## Bestätigte Befunde und Korrekturen

| Bereich | Reproduzierter Fehler oder Risiko | Korrektur und Absicherung |
|---|---|---|
| Uncontested Pot | Ein nicht gecallter Raise wurde als Potgewinn statt als Rückgabe des eigenen Einsatzes verbucht. | Vor der Auszahlung wird der uncallte Anteil zurückgegeben. Test prüft `UncalledBetReturned`, Award und Endstacks. |
| Verwaister Side-Pot | Nach dem späteren Fold aller Spieler eines oberen Pot-Layers konnte ein Shortstack den fremden Side-Pot erhalten oder der Showdown mit „no eligible players“ abbrechen. | Der Layer geht an seinen zuletzt noch spielberechtigten Beitragszahler; Fold-Reihenfolge kommt aus der Handhistorie. Drei- und Vier-Spieler-Reproduktionen prüfen getrennte Awards und Chiperhaltung. |
| Handende im lokalen Runner | Verschachtelte synchrone Bot-Fehlerbehandlung konnte dieselbe Hand zweimal in Session-Stats verbuchen. | Eine handnummerbezogene Einmal-Schranke wird vor den Handend-Effekten gesetzt und bei Setup/Cleanup zurückgesetzt; Regression injiziert einen Bot-RNG-Fehler. |
| Eingabegrenzen | Zur Laufzeit unbekannte Action-Typen, Bruchteile von Cents und ein zu großer PLO-Tisch konnten erst nach Zustandsänderung bzw. beim Austeilen auffallen. | Frühe Validierung vor Mutation und vor Handstart; Tests prüfen auch, dass Zustand und Historie bei Ablehnung unverändert bleiben. |
| Sitz- und Dealerordnung | Die Engine konnte Array-Reihenfolge mit physischer Sitzreihenfolge verwechseln; Entfernen/Umsetzen eines Sitzes konnte den Dealer-Anker verschieben. | Spieler werden nach `seatIndex` geordnet; Dealer und bevorzugter Erstdealer werden beim Umsetzen/Entfernen über ihre Identität bzw. den physischen Nachfolger aufgelöst. |
| Konfigurationsalias | Nachträgliche Mutation des übergebenen Konfigurationsobjekts konnte Blinds der Engine beeinflussen. | Die Engine hält eine eigene Konfigurationskopie; Test mutiert das ursprüngliche Objekt. |

Die isolierten Diagnose-Checks fanden bei 800 unabhängigen
NLHE-/PLO-Showdown-Vergleichen keine abweichende Handwertung. 400
deterministische gültige Zufallshände endeten ohne Chipverlust oder Stillstand;
bei 147 Uncontested-Händen wurde zuvor jedoch der oben genannte
Rückgabe-/Award-Fehler sichtbar. Nach der Side-Pot-Korrektur endeten 300
zusätzliche Force-Fold-Abläufe ohne Stillstand, Chipverlust oder abweichende
Award-Summe. Diese Stichproben sind ergänzende Evidenz, keine Beweisführung.

## Verifikation und verbleibende Grenzen

- Workspace-Tests und Build bestanden; Stake-Invarianz für NLHE und PLO
  bestanden; der deterministische 300-Hand-Kalibrierungs-Smoke bestand alle
  24 Kombinationen ohne Warnung oder Fehler.
- Die bekannte Vite-Warnung zum großen Client-Chunk bleibt ein separates
  Build-/Strukturthema, kein Fehler dieses Korrektheitsblocks.
- `PublicGameState.sidePots` wird während der laufenden Hand weiterhin nicht
  als Live-Aufschlüsselung gepflegt. Die finale Pot-Abrechnung nutzt die
  Beitragsdaten; falls UI oder spätere Verbraucher Live-Side-Pots brauchen,
  benötigt das ein eigenes Zustandsmodell und eigene Tests.
- Weitere Bot-Heuristiken, besonders PLO-Draw-/Nut-Wahrnehmung und die
  Aktionauswahl, sind nicht mit diesem Engine-Nachtrag als korrekt erklärt.
  Sie werden als separater, reproduzierbarer Block geprüft.
- Ein absichtlich fehlerhafter Beobachter/Export-Callback kann weiterhin
  außerhalb der Bot-Fehlerbehandlung scheitern. Für normale gültige Zustände
  wurde das nicht als Produktionsfehler reproduziert; Recovery-Grenzen sind
  ein eigenes Integrationsthema für 0.8.3.

Keine Zielkorridore, Kalibrierungs-Snapshots oder Serverpfade wurden geändert.
