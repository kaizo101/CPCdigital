# CPCdigital — Test-, Feedback- und Distributionsstrategie

Stand: 30.07.2026

## Zweck

CPCdigital soll als nichtkommerzielles Open-Source-Projekt mit hohem
Qualitätsanspruch wachsen. Langfristiges Vorbild ist weniger ein klassisches
kommerzielles Pokerspiel als eine offene, dauerhaft vertrauenswürdige Plattform
im Geist von Lichess: frei zugänglich, ohne Echtgeld, Werbung, Tracking oder
künstliche Bezahlschranken.

Dieses Ziel rechtfertigt saubere technische Grundlagen, aber keine vorschnelle
Release-Infrastruktur um ihrer selbst willen. Vor jedem größeren Aufwand gilt
die Kontrollfrage:

> Welchen realistischen Fehler oder Schaden verhindert dieser Aufwand?

Verhindert er falsche Spielzustände, Datenverlust, Sicherheitsprobleme, einen
leeren Bildschirm oder unbenutzbare Downloads, gehört er zur Absicherung.
Erzeugt er hauptsächlich den Anschein eines großen kommerziellen Projekts,
wird er erst bei tatsächlichem Bedarf umgesetzt.

## Grundsätze

1. **Testauftrag vor Testerzahl:** Wenige passende Tester mit einem klaren
   Auftrag liefern zunächst mehr Erkenntnis als eine breite, unstrukturierte
   Veröffentlichung.
2. **Rollen nicht vermischen:** Pokerrealismus, Bedienbarkeit und technische
   Stabilität werden von unterschiedlichen Personen und mit unterschiedlichen
   Fragen geprüft.
3. **Entwicklungsstand ehrlich benennen:** Alpha, Beta und Release Candidate
   werden samt Zielplattform und bekannten Einschränkungen vor jedem Test
   erklärt.
4. **Beobachtung vor Interpretation:** Konkrete Hände, Arbeitsschritte und
   sichtbare Missverständnisse sind wertvoller als ein allgemeines
   „gut/schlecht“.
5. **Feedback ist kein Mehrheitsentscheid:** Einzelne Rückmeldungen werden
   eingeordnet. Reproduzierbare Fehler sind unmittelbar relevant; subjektive
   Wünsche werden gegen Vision, Roadmap und weitere Beobachtungen abgewogen.
6. **Keine Telemetrie:** CPCdigital überträgt keine Nutzungsdaten automatisch.
   Tester teilen nur bewusst ausgewählte Angaben und Dateien.

## Test- und Veröffentlichungsstufen

| Stufe | Zeitpunkt | Publikum | Hauptziel |
|---|---|---|---|
| Interne QA | fortlaufend | Entwicklung | Regeln, Zustände, Builds, Viewports und Regressionen |
| Geführte Alpha | regulär ab 0.8.4 | persönlich eingeladene Tester | eng begrenzte Fach- oder Usability-Fragen |
| Öffentliche Browser-Beta | ab 0.9.1 | interessierte Öffentlichkeit | Plattformbreite, Verständlichkeit und unbekannte Fehler |
| Release Candidate | 0.9.5 | Desktop-Testgruppe | reale Windows-/Linux-Pakete und Offline-Betrieb |
| Stable Launch | 1.0.0 | breite Öffentlichkeit | belastbarer, klar dokumentierter Erstrelease |

Die Stufen sind Qualitätsfilter, keine Marketingtermine. Ein Versionswechsel
erfolgt nur, wenn das jeweilige Release-Gate der [Roadmap](ROADMAP.md) erfüllt
ist.

### 1. Interne QA

Interne QA bleibt die erste Verteidigungslinie:

- automatisierte Unit-, Integrations-, Komponenten- und Responsive-Tests
- reproduzierbare NLHE- und PLO-Kalibrierungen
- manuelle Desktop-, Browser- und Android-Smokes
- Replay-, Datenmigrations-, Recovery- und Offline-Prüfungen
- gezielte Bestandsaufnahme auf echter Hardware

Externe Tester ersetzen diese Prüfungen nicht. Sie prüfen vor allem Dinge, die
Tests nur eingeschränkt beantworten können: Glaubwürdigkeit, Verständlichkeit
und tatsächliche Bedienbarkeit.

### 2. Geführte Alpha

Die Alpha wird nicht allgemein beworben. Jede Person erhält einen engen
Testauftrag, eine empfohlene Konfiguration, bekannte Einschränkungen und das
passende Formular aus [TESTER_FORMS.md](TESTER_FORMS.md).

Geeignete Rollen:

- **NLHE-Full-Ring-Spieler:** Bot-Realismus, erkennbare Gegnertypen,
  plausible Lines und auffällige Wiederholungen
- **Pokerneuling:** Informationshierarchie, Begriffe und Bedienbarkeit ohne
  unbewusste Fachannahmen
- **UI-Review:** visuelle Hierarchie, Zuordnung, Größenverhältnisse und
  Gestaltung nach abgeschlossenem TableSurface-/TableGeometry-Umbau
- **weitere Homegame-Spieler:** zusätzliche Realismuseindrücke, sofern sie
  verfügbar sind; kein Release-Blocker

### 3. Öffentliche Browser-Beta

Eine breitere Rückmeldung wird erst nach der gemeinsamen TableGeometry und der
responsiven Übertragung auf Spiel und Replay sinnvoll. Zielpunkt ist daher
0.9.1, nicht der aktuelle mobile Prototyp.

Die GitHub-Pages-Demo wird dabei ausdrücklich als Beta bezeichnet. Ein
möglicher Reddit- oder Forenbeitrag ist eine Einladung zu einem klar
beschriebenen Test, keine fertige Produkteinführung. Vor jedem Beitrag werden
die jeweiligen Community-Regeln geprüft; pauschales Crossposting wird
vermieden.

Die Browser-Beta darf den nativen Android-Prototyp nicht falsch versprechen:
Browser-Mobile bleibt ein funktionaler Fallback, während die weitergehende
Phone-Optimierung im nativen Android-Pfad erprobt wird.

### 4. Release Candidate

Mit 0.9.5 werden erstmals die tatsächlichen Windows- und Linux-Artefakte
öffentlich als Vorabversion geprüft. Der Kandidat wird nach bestandenem Gate
inhaltlich eingefroren. Erkenntnisse werden entweder als Blocker behoben und
mit einem neuen Kandidaten erneut geprüft oder nachvollziehbar auf später
verschoben.

### 5. Stable Launch

Erst 1.0.0 ist der geeignete Zeitpunkt für eine breitere Vorstellung des
Projekts. Die Kommunikation sollte klar zeigen:

- was CPCdigital bereits zuverlässig kann
- für wen der Offline-Singleplayer gedacht ist
- welche Grenzen bewusst bestehen
- wie Fehler, Eindrücke und Beiträge gemeldet werden können
- welche langfristige Open-Source-Vision verfolgt wird

## Rollenbezogene Tests

### Bot-Realismus: NLHE Full Ring

Der bekannte NLHE-FR-Tester ist besonders wertvoll für eine blinde
Gegnerbeurteilung. Er soll nicht die allgemeine Plattform, PLO oder mobile
Darstellung abnehmen.

Empfohlenes Szenario:

- NLHE, Full Ring, 100 BB, Auto-Rebuy
- Debug-Modus und sichtbare Bot-Karten ausgeschaltet
- mindestens 100, besser 200 Hände
- Archetypen und interne Bot-Parameter vorher nicht erklären

Der Tester beschreibt zunächst selbst auffällige Gegner. Erst danach werden
seine Beobachtungen mit den tatsächlichen Bot-Identitäten und Archetypen
verglichen. So lässt sich prüfen, ob Unterschiede aus dem Spielverhalten
erkennbar sind und nicht nur aus vorgegebenen Labels.

Ein vorgezogener Fachtest ist bereits nach dem stabilen 0.7.7-Stand sinnvoll,
sofern der Tester Desktop nutzen kann; er dient als qualitative Bot-Baseline
und noch nicht als allgemeine Produkt-Alpha. Bei rein mobiler Nutzung wird bis
0.9.1 gewartet. Ein weiterer Lauf folgt nach größeren Änderungen am
gemeinsamen Bot-Scoring und vor dem Release Candidate.

### Usability: Pokerneuling

Ein Pokerneuling bewertet keine strategische Spielstärke. Er zeigt, welche
Informationen die Oberfläche ohne Vorwissen vermittelt und wo sie
Fachannahmen versteckt.

Der Test erfolgt in zwei Durchgängen:

1. Ohne Erklärung beobachten, welche Elemente und Handlungsoptionen die Person
   selbst erkennt. Lautes Denken ist erwünscht.
2. Eine sehr kurze Erklärung von Blinds, Karten, Board, Pot und Aktionen geben
   und dieselben Kernaufgaben erneut durchführen lassen.

Da Tutorials erst nach v1 geplant sind, darf v1 grundlegende Pokerregeln
voraussetzen. Aktiver Spieler, eigener Stack, Pot, Board, aktuelle Bets und
verfügbare Aktionen müssen trotzdem visuell verständlich bleiben. Dieser Test
ist nach 0.9.2 aussagekräftiger als vor dem Tisch- und Controls-Umbau.

### UI und Tischdesign

Eine externe UI-Bewertung vor 0.9.0 würde überwiegend bereits bekannte
Übergangslösungen bestätigen. Während 0.9.0 erfolgt die visuelle Abnahme von
TableSurface und Pod-Docking deshalb engmaschig intern. Nach abgeschlossenem
0.9.0 kann ein erster struktureller Test stattfinden; der empfohlene
plattformübergreifende Durchlauf folgt nach 0.9.1, wenn Spiel und Replay auf
Desktop, Tablet und Android dieselbe Geometrie verwenden.

Das UI-Formular trennt beobachtbare Probleme wie falsche Bet-Zuordnung,
Clipping oder schwache Zustandskommunikation von subjektivem Geschmack.
Branding, Controls, Animationen und Sounds werden nach 0.9.3 in einem kürzeren
Wiederholungslauf bewertet.

## Mindestangaben für verwertbares Feedback

Jeder technische Befund sollte nach Möglichkeit enthalten:

- CPCdigital-Version oder Commit
- Oberfläche: Electron, Browser-Demo oder Android
- Betriebssystem, Gerät und bei Layoutproblemen Bildschirmgröße/Ausrichtung
- Variante, Tischgröße, Blinds und Startstack
- Handnummer beziehungsweise Replay, sofern betroffen
- konkrete Schritte bis zum Problem
- erwartetes und tatsächliches Verhalten
- Häufigkeit: einmalig, gelegentlich oder zuverlässig reproduzierbar

Screenshots, kurze Videos, Hand-History und Replay sind hilfreich. Der
Session-Debug-Export enthält jedoch auch private Bot-Karten und interne
Entscheidungsdaten. Er darf nur bewusst geteilt und vor einer Veröffentlichung
auf unerwünschte lokale Angaben geprüft werden.

## Triage

Rückmeldungen werden in vier Klassen eingeordnet:

| Klasse | Beispiele | Behandlung |
|---|---|---|
| Blocker | Absturz, ungültige Aktion, Datenverlust, unbenutzbarer Build | vor dem nächsten Release beheben |
| Release-relevant | Zielplattform nicht bedienbar, Replay weicht vom Spiel ab | gegen das aktuelle Release-Gate prüfen |
| Qualitätsbefund | botartige Wiederholung, missverständliche Anzeige, schwache Gewichtung | reproduzieren, bündeln und geplant verbessern |
| Später/außerhalb Scope | Tutorialwunsch vor v1, vollständige Browser-Mobile-Parität | dokumentiert in die passende Phase verschieben |

Ein subjektiver Einzelbefund führt nicht automatisch zu einer Änderung.
Wiederholung, konkrete Beispiele und Übereinstimmung mit der Produktvision
erhöhen sein Gewicht.

## Feedbackkanäle

- **Reproduzierbare Fehler:** GitHub Issue mit technischem Fehlerblock aus
  [TESTER_FORMS.md](TESTER_FORMS.md)
- **Eindrücke und Ideen:** GitHub Discussions, sobald dieser Kanal bewusst
  aktiviert und moderiert wird
- **Sicherheitsprobleme oder Zugangsdaten:** ausschließlich über die in
  [SECURITY.md](SECURITY.md) beschriebene vertrauliche Meldung
- **Geführte Alpha:** das jeweilige Formular direkt an die Entwicklung
  zurückgeben; ein GitHub-Konto ist dafür nicht erforderlich

## Datenschutz und Grenzen

- Keine Klarnamen, E-Mail-Adressen oder sonstigen personenbezogenen Angaben
  sind für einen Test erforderlich.
- Screenshots und Aufzeichnungen werden nur mit Wissen der testenden Person
  erstellt und geteilt.
- CPCdigital enthält keine Echtgeldfunktion. Tests verwenden ausschließlich
  virtuelle Chips.
- Sicherheitsmeldungen und mögliche Secrets gehören nie in öffentliche Issues.
- Debug-Dateien werden nicht automatisch hochgeladen und nur so lange
  aufbewahrt, wie sie für die konkrete Analyse benötigt werden.
