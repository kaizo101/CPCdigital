# CPCdigital — Tester-Formulare

Stand: 30.07.2026

Diese Vorlagen können als Markdown, E-Mail oder Grundlage für ein
Online-Formular verwendet werden. Es werden keine Klarnamen oder Kontaktdaten
benötigt. Vor jedem Test wird nur der zur Rolle passende Bogen ausgegeben.

Direkt verwendbare, vollständig lokale Umsetzungen mit Autosave,
Textdatei-Export und optionalem Smartphone-Teilen liegen unter
[`testing/forms/`](testing/forms/README.md). Sie laden keine externen
Ressourcen und übertragen keine Antworten.

## Gemeinsamer Testkopf

> CPCdigital ist eine Entwicklungsversion eines nichtkommerziellen
> Open-Source-Pokerspiels ohne Echtgeld. Dieser Test prüft einen klar
> abgegrenzten Teil des Projekts und ist keine Bewertung eines fertigen
> Produkts. Es werden keine Nutzungsdaten automatisch übertragen.

- Datum:
- optionales Kürzel:
- CPCdigital-Version/Commit:
- Oberfläche: ☐ Electron ☐ Browser-Demo ☐ Android
- Betriebssystem und Version:
- Gerät:
- Bildschirmgröße und Ausrichtung:
- Eingabe: ☐ Maus/Tastatur ☐ Touch ☐ Sonstiges:
- trat während des Starts oder Spiels ein technischer Fehler auf? ☐ Nein ☐ Ja:

---

## Formular A — NLHE-Full-Ring-Bot-Realismus

### Testauftrag

Bitte spiele möglichst ohne Debug-Anzeigen und ohne Kenntnis der
Bot-Archetypen:

- Variante: NLHE
- Tisch: Full Ring
- Startstack: 100 BB
- Auto-Rebuy: an
- Ziel: mindestens 100, möglichst 200 Hände

Es geht nicht darum, möglichst viel zu gewinnen. Beobachte, ob Gegner
wiedererkennbar, in sich schlüssig und glaubwürdig wirken.

### Session

- gespielte Hände:
- ungefähre Testdauer:
- Session vollständig beendet? ☐ Ja ☐ Nein, Grund:
- technische Störungen, die das Spielgefühl beeinflusst haben:

### Gegnereindruck

1. Welche zwei oder drei Gegner sind dir besonders aufgefallen? Beschreibe
   jeweils ihr Verhalten, ohne ihnen einen vorgegebenen Spielertyp zuordnen zu
   müssen.

   - Gegner 1:
   - Gegner 2:
   - Gegner 3:

2. Waren Gegner anhand ihrer Entscheidungen voneinander unterscheidbar?

   ☐ 1 gar nicht ☐ 2 ☐ 3 teilweise ☐ 4 ☐ 5 deutlich

3. Blieb das Verhalten einzelner Gegner über die Session hinweg in sich
   schlüssig?

   ☐ 1 gar nicht ☐ 2 ☐ 3 teilweise ☐ 4 ☐ 5 sehr

4. Wie glaubwürdig wirkten die folgenden Bereiche?

| Bereich | 1 = unglaubwürdig | 2 | 3 | 4 | 5 = glaubwürdig | Beispiel/Bemerkung |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Preflop-Auswahl | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Bet- und Raise-Größen | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Reaktion auf Position | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Reaktion auf Stack und Pot | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Postflop-Lines über mehrere Streets | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Reaktion auf Aggression | ☐ | ☐ | ☐ | ☐ | ☐ | |
| Entscheidungszeiten | ☐ | ☐ | ☐ | ☐ | ☐ | |

5. Welche Aktionen oder Muster wirkten vorhersehbar, wiederholt oder
   eindeutig „botartig“?

6. Gab es Gegner, die sich im Laufe der Session sichtbar angepasst oder anders
   verhalten haben? Woran hast du das festgemacht?

7. Wirkte das Spiel fair, also ohne den Eindruck, dass Gegner versteckte
   Informationen nutzen? ☐ Ja ☐ Nein ☐ Unsicher

   Begründung oder auffällige Hand:

8. Was war die glaubwürdigste Beobachtung der Session?

9. Was sollte als Erstes verbessert werden?

### Gesamturteil

- Bot-Realismus insgesamt:
  ☐ 1 ☐ 2 ☐ 3 ☐ 4 ☐ 5
- Würdest du freiwillig eine weitere 200-Hand-Session spielen?
  ☐ Ja ☐ Nein ☐ Vielleicht
- Warum?

Für jede besonders auffällige Entscheidung bitte zusätzlich den
[Hand-/Fehlerblock](#hand--oder-fehlerblock) ausfüllen.

---

## Formular B — Usability für Pokerneulinge

### Testauftrag

Bitte führe die Aufgaben zunächst ohne Erklärung aus und denke dabei laut.
Die beobachtende Person hilft erst, wenn du ausdrücklich nicht weiterkommst.
Danach werden Blinds, Hole Cards, Board, Pot und Aktionen kurz erklärt und die
blockierten Aufgaben erneut versucht.

Dieser Test bewertet nicht dein Pokerwissen.

### Aufgaben ohne Einführung

| Aufgabe | selbst geschafft | mit Hilfe | nicht geschafft | Beobachtung |
|---|:---:|:---:|:---:|---|
| Eine neue Partie einrichten und starten | ☐ | ☐ | ☐ | |
| Die eigenen Karten finden | ☐ | ☐ | ☐ | |
| Den eigenen Chipstand finden | ☐ | ☐ | ☐ | |
| Pot und Gemeinschaftskarten erkennen | ☐ | ☐ | ☐ | |
| Erkennen, wer gerade handeln muss | ☐ | ☐ | ☐ | |
| Verfügbare Aktionen finden | ☐ | ☐ | ☐ | |
| Eine Bet-/Raise-Größe einstellen | ☐ | ☐ | ☐ | |
| Eine Hand im Replay öffnen | ☐ | ☐ | ☐ | |
| Zurück zum Setup gelangen | ☐ | ☐ | ☐ | |

### Verständnis

1. Was dachtest du, bedeuten die folgenden Elemente?

   - Zahl am eigenen Sitz:
   - Zahl in der Tischmitte:
   - Zahl oder Chips vor einem Gegner:
   - hervorgehobener Sitz:
   - Slider/Eingabefeld in der Actionbar:

2. Welche Begriffe, Symbole oder Farben waren unklar?

3. An welcher Stelle wusstest du am längsten nicht weiter?

4. Was hast du angeklickt oder berührt, obwohl du eine andere Wirkung erwartet
   hast?

5. Welche wichtige Information war schwer zu finden oder zu lesen?

### Nach kurzer Einführung

- Welche zuvor blockierten Aufgaben waren danach klar?
- Was blieb trotz Erklärung missverständlich?
- Fühlte sich die Bedienung anschließend:
  ☐ sehr schwierig ☐ schwierig ☐ okay ☐ einfach ☐ sehr einfach
- Was sollte als Erstes verbessert werden?

---

## Formular C — Allgemeiner Beta- und Fehlertest

### Testziel

- Was wolltest du ausprobieren?
- Variante: ☐ NLHE ☐ PLO
- Tisch: ☐ Heads-up ☐ 6-max ☐ Full Ring ☐ Sonstiger:
- Blinds und Startstack:
- ungefähr gespielte Hände:

### Gesamteindruck

- Was hat ohne Erklärung gut funktioniert?
- Was war schwer zu verstehen oder zu bedienen?
- Gab es etwas, das du erwartet, aber nicht gefunden hast?
- Wichtigste gewünschte Verbesserung:

### Technischer Befund

- Kategorie:
  ☐ Absturz/Start ☐ Pokerregel/Aktion ☐ Botverhalten
  ☐ Layout/Bedienung ☐ Replay/History ☐ gespeicherte Daten ☐ Sonstiges
- kurze Zusammenfassung:
- Schritte zum Reproduzieren:
  1.
  2.
  3.
- erwartetes Verhalten:
- tatsächliches Verhalten:
- Häufigkeit:
  ☐ einmalig ☐ gelegentlich ☐ jedes Mal
- tritt es nach Neustart erneut auf? ☐ Ja ☐ Nein ☐ Nicht geprüft
- Handnummer/Replay:
- beigefügt:
  ☐ Screenshot ☐ Video ☐ Hand-History ☐ Replay ☐ Debug-Export

Sicherheitsprobleme, Secrets und Zugangsdaten bitte nicht öffentlich eintragen,
sondern gemäß [SECURITY.md](SECURITY.md) vertraulich melden.

---

## Formular D — UI- und Tischdesign-Bewertung

Dieses Formular erst nach dem TableSurface- und TableGeometry-Umbau in 0.9.0
verwenden; für eine plattformübergreifende Bewertung ist der abgeschlossene
0.9.1-Stand der empfohlene Zeitpunkt.

### Unbeeinflusster Ersteindruck

Vor der detaillierten Kriterienliste mindestens 15–20 Hände spielen:

- Welches Element wurde beim ersten Blick zuerst wahrgenommen?
- Was war sofort visuell verständlich?
- Was musste gesucht, genauer gelesen oder erraten werden?
- Welche drei Begriffe beschreiben die Oberfläche spontan?

### Beobachtbare UI-Kriterien

- Hero, aktive Person, Board, Pot und Gewinner eindeutig erkennbar
- Hole Cards und Bets zweifelsfrei den jeweiligen Pods zugeordnet
- Kartenränge, Suits, Stacks und Beträge bei normalem Abstand lesbar
- keine Überlagerungen, abgeschnittenen Inhalte oder auslaufenden Symbole
- verfügbare, inaktive und gesperrte Controls klar unterscheidbar
- Spiel und Replay verwenden dieselbe visuelle Geometrie

### Tisch und Größenverhältnisse

- Tischsilhouette: zu rund, stimmig, zu spitz oder zu langgezogen
- Rail: zu dünn, stimmig oder zu massiv
- Pseudo-3D-Wirkung: zu flach, stimmig oder zu stark
- Felt bleibt für Bets, Pot, Board und Ergebnisdarstellung nutzbar
- Pods, Avatare, Hero-Karten, Cardbacks, Board und Actionbar jeweils:
  zu klein, passend oder zu groß

### Subjektive Gestaltung

Dieser Block wird getrennt von konkreten UI-Problemen ausgewertet:

- visuelle Qualität und Eigenständigkeit, jeweils 1–5
- stärkster und schwächster UI-Bereich
- einzelne visuelle Änderung mit dem größten erwarteten Effekt

Die direkt verwendbare Umsetzung liegt in
[`testing/forms/ui-evaluation.html`](testing/forms/ui-evaluation.html).

---

## Hand- oder Fehlerblock

Dieser Block wird nur für konkrete auffällige Hände oder UI-Fehler zusätzlich
ausgefüllt.

- CPCdigital-Version/Commit:
- Oberfläche, Gerät und Betriebssystem:
- Variante und Tischgröße:
- Handnummer:
- betroffener Spieler/Bot:
- Street: ☐ Preflop ☐ Flop ☐ Turn ☐ River ☐ Showdown
- Ausgangslage in einem Satz:
- beobachtete Aktion oder Fehler:
- warum war dies auffällig beziehungsweise was wurde erwartet?
- zuverlässig reproduzierbar? ☐ Ja ☐ Nein ☐ Unbekannt
- Anlage: ☐ Replay ☐ Hand-History ☐ Screenshot ☐ Video ☐ Debug-Export

> Achtung: Ein Session-Debug-Export enthält private Bot-Karten und interne
> Entscheidungsdaten. Er wird nie automatisch übertragen und sollte nur bewusst
> sowie nicht in einem öffentlichen Issue geteilt werden.
