# CPCdigital — Interaktive Tester-Formulare

Die vier HTML-Dateien sind eigenständig, benötigen keinen Build und laden
keine externen Ressourcen:

- [`bot-realism.html`](bot-realism.html) — blinder NLHE-Full-Ring-Spieltest
  mit erst später freigeschalteter informierter Nachbesprechung
- [`novice-usability.html`](novice-usability.html) — beobachteter
  Bedienbarkeitstest in zwei Phasen
- [`ui-evaluation.html`](ui-evaluation.html) — visuelle Hierarchie,
  Tischdesign, Größenverhältnisse und Controls; nach 0.9.0, empfohlen ab 0.9.1
- [`beta-feedback.html`](beta-feedback.html) — allgemeines Beta-Feedback und
  reproduzierbarer Fehlerbericht

## Verwendung

1. Nur die für den jeweiligen Test passende HTML-Datei verschicken.
2. Die testende Person öffnet sie direkt in einem aktuellen Browser.
3. Antworten werden nach Möglichkeit automatisch im lokalen Browser-Speicher
   zwischengespeichert und niemals hochgeladen.
4. Am Ende **Ergebnis herunterladen**, **Antworten kopieren** oder auf
   unterstützten Smartphones **Teilen** wählen.
5. Die erzeugte `.txt`-Datei sowie optionale Hand-Histories, Screenshots oder
   Videos über einen vorher vereinbarten privaten Kanal zurücksenden.

Jede HTML-Datei enthält Styles und JavaScript direkt und kann daher einzeln
weitergegeben werden. Browser können lokalen Speicher für direkt geöffnete
Dateien unterschiedlich behandeln. Der sichtbare Speicherstatus weist darauf
hin; bei längeren Tests sollte vorsichtshalber zwischendurch ein Ergebnis
heruntergeladen werden.

## Datenschutz und Grenzen

- Es gibt keinen Absende-Endpunkt, keine Telemetrie und keine externen
  Schriftarten oder Skripte.
- Die Ergebnisdatei enthält ausschließlich ausgefüllte Felder.
- Anhänge werden nicht in das Formular eingelesen und separat verschickt.
- Ein Session-Debug-Export kann private Bot-Karten und interne
  Entscheidungsdaten enthalten und gehört nicht in öffentliche Issues.
- Sicherheitsprobleme und Zugangsdaten werden entsprechend
  [`SECURITY.md`](../../SECURITY.md) vertraulich gemeldet.

Die Formulare sind absichtlich noch nicht Bestandteil der öffentlichen
GitHub-Pages-Demo. Eine gehostete Verteilung wird erst mit dem jeweiligen
Alpha-/Beta-Checkpoint bewusst entschieden.
