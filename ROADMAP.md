# CPCdigital — Roadmap

**Offline Poker App · Electron Desktop · Single-Player gegen glaubwürdige Bots · später Lern- und Trainingsplattform für Pokervarianten**

**Stand:** 0.8.1 ist veröffentlicht, 0.8.2 ist in Arbeit. Spätere
Versionsnummern beschreiben Planung, keine Release-Zusage.

---

## Vision

CPCdigital soll ein zugänglicher Ort sein, an dem Spieler bekannte und seltene Pokervarianten ohne Echtgeld, Wartezeiten oder chaotische öffentliche Tische ausprobieren können.

Der erste Schwerpunkt liegt auf einem stabilen, unterhaltsamen Singleplayer-Pokerspiel mit glaubwürdigen Bots. Ab Version 1.0 wird darauf eine Lernschicht aufgebaut: Wiki, Tutorials, Session-Analysen und Poker-Rätsel anhand konkreter Hände.

## Kernprinzipien

- **Offline First** — kein Server und kein Internet notwendig
- **Glaubwürdige Bots** — Persönlichkeiten, Reads, Gewohnheiten und mentale Zustände
- **Fair Play** — Bots sehen nur Informationen, die auch ein realer Spieler kennen könnte
- **Variantenfähige Architektur** — Community-Card-, Draw- und später Stud-Spiele
- **Erklärbare Entscheidungen** — Bot-Aktionen und Spielerentscheidungen sollen später analysierbar sein
- **Learning-ready, nicht Learning-first** — Lernoberflächen kommen später, die notwendigen Daten werden von Anfang an erfasst
- **Casual statt Solver** — Spielspaß und menschlich wirkende Gegner sind wichtiger als GTO-Perfektion
- **Open Source & faire Weiterverwendung** — transparente Forks und
  AGPL-konforme kommerzielle Nutzung bleiben erlaubt; unattribuierte,
  verschleierte oder proprietär vereinnahmte Kopien sollen nachvollziehbar
  erkennbar sein

## Wiederkehrendes Kalibrierungs- und Verhaltens-Gate

Nach Änderungen an Ranges, Action-Scores, Persönlichkeitsfaktoren oder
Kalibrierungsmetriken gehören künftig vier Prüfstufen zum jeweiligen Release:

1. gezielte Szenario- und Regressionstests für die geänderte Logik
2. deterministische Entwicklungsläufe und dokumentierte 10k-Release-Läufe
   für die betroffenen Varianten, Archetypen und Tischformate
   mit Rohzählern/Nennern; Zielkorridore sind Diagnose, kein automatisches
   Release-Verbot. Größere oder systematische Ausreißer erfordern begründete
   Triage und eine explizite Freigabeentscheidung. Ein prüfbarer Releasebericht
   bestätigt Korridor-Ausreißer und Metriken mit unter 50 Gelegenheiten auf
   einem unabhängigen Seed
3. eine interaktive Probe-Session von mindestens 100–150 Händen in der
   Web-Version, damit wiederkehrende Linien, Stack-Risiko und die subjektive
   Erkennbarkeit der Archetypen geprüft werden
4. Triage auffälliger Hände gegen Decision Scores beziehungsweise einen
   Session-Debug-Export; strukturelle Fehler werden nicht durch breitere
   Zielkorridore kaschiert

Ungültige Aktionen, verletzte Invarianten, nicht endliche Messwerte und die
abgesicherten Deep-Shove-Fälle bleiben harte Blocker. Ein Snapshot-Drift ist
ein separater Review-Anlass; beabsichtigte Änderungen erhalten erst danach
eine neue Baseline.

## Leseregel für Versionsblöcke

Die Roadmap beschreibt pro Version Ziel, Kernumfang und gegebenenfalls das
Release-Gate. Konkrete Formeln, Dateigrenzen, Rohwerte und abgeschlossene
Diagnoseverläufe stehen in
verlinkten Scope-, Kalibrierungs- oder Releaseberichten beziehungsweise im
Changelog. So bleibt hier auf einen Blick erkennbar, was abgeschlossen ist und
was für die nächste Freigabe tatsächlich noch fehlt.

---

## Rückblick bis 0.8.1

Die abgeschlossenen Meilensteine von 0.1.0 bis 0.8.1 stehen im
[Roadmap-Archiv](docs/plans/roadmap-archiv-bis-0.8.1.md). Maßgeblich für
veröffentlichte Änderungen bleibt der [Changelog](CHANGELOG.md);
Kalibrierungs-Rohwerte und Freigabeberichte liegen unter
[calibration/](calibration/README.md).

---

## Phase 4 — Stabilisierung & Release-Vorbereitung

### 0.8.2 — Bot-Foundation & Stabilisierung

**Ziel des geplanten Zwischenrelease:** Die bereits umgesetzten Engine-,
Wahrnehmungs-, Diagnose- und ersten Dynamikbausteine auf einem geprüften Stand
abschließen. Seit dem Scope-Freeze vom 02.10.2026 kommen vor dem Release keine
weiteren Bot-Features hinzu. Die offenen Dynamik- und Mental-Features unten
sind **nicht** Voraussetzung für diesen Cut; ihre Versionszuordnung wird vor
dem Release separat bereinigt. Das Release-Gate bleibt verbindlich.

#### Abgeschlossene Foundation

- [x] Objektiven Hand-, Board-, Positions- und Gegnerkontext bis zur Auswahl
  erhalten und davon eine stetig skillgewichtete Wahrnehmung ableiten.
- [x] Preflop-Rollen, echte Aggressionsstufen, C-Bet-Once-Semantik und
  Paired-Board-Hierarchie samt kontextabhängiger gegnerischer Range
  regressionsgetestet.
- [x] Aktionskandidaten kanonisiert, Auswahlgrenzen instrumentiert und
  auffällige uncommitted Shoves sowie extreme Calling-Station-Defense gezielt
  abgesichert.
- [x] Session-Debugexport v4, kompakte Android-Ausgabe, lesbare Handhistory
  mit stabilen Session-/Handreferenzen und Stake-Invarianz fertiggestellt.
- [x] Caller-berechtigten Pot für Pot Odds, SPR und Call/Pot-Verhältnis
  eingeführt; River-Protection und Hero-Rebuy-Bilanz regressionsgetestet.

Details stehen im [Changelog](CHANGELOG.md) und im
[0.8.2-Sessiondiagnosebericht](calibration/v0.8.2-session-diagnostics-2026-08-12.md).
Der nachträgliche Offline-Engine-Korrektheitsblock ist im
[Review-Nachtrag vom 29.09.2026](docs/reviews/offline-core-review-2026-09-29.md)
getrennt dokumentiert; der Server bleibt ausgeklammert.

#### Umgesetzter Funktionsschnitt und nachgelagerte Dynamik

- [x] Tiefe 4-Bet-/5-Bet-Ketten nach tatsächlicher Aggressionsstufe absichern,
  damit generische Boni keine klare Fold-Präferenz strukturell überstimmen.
- [x] Erste Anti-Steal-Basis: Öffentliche, ungeöffnete Button-/Cutoff-
  Gelegenheiten pro Gegner und Position zählen; Blind-Reaktion erst mit
  ausreichender Stichprobe, Skill-Gewichtung und spielbarer Range zulassen.
- [ ] Button-/Cutoff-Steals und Blind-Defense gegner-, positions-, stichproben-
  und konfidenzabhängig beobachten und beantworten; als nächstes
  Erfolg/Misserfolg und Gegenanpassung über mehrere Hände prüfen.
- [x] Erster Flop→Turn-Linienschnitt: Gewählte Bluff-/Semi-Bluff-Bet statt
  einer nachträglich erfundenen Absicht im Handgedächtnis halten; selektiv
  fortsetzen oder mit Debuggrund abbrechen, ohne All-in-Anreiz.
- [ ] Street-übergreifende Handlinien: Die tatsächlich gewählte Absicht
  (Value, Protection, Semi-Bluff, Bluff, Pot-Control) für die laufende Hand
  merken und am Turn/River anhand von Board, öffentlicher Gegnerreaktion und
  Kosten fortsetzen, umplanen oder begründet aufgeben. NLHE/PLO getrennt
  bewerten; kein automatisches Durchbarreln wegen bereits investierter Chips.
  Weitere Mehr-Street-Tests und Debuggründe für Planwechsel ergänzen;
  insbesondere Value-/Protection-/Pot-Control-Linien und River-Fortsetzung
  sind noch offen.
- [ ] Strategische Anpassung klar von emotionaler Überreaktion trennen;
  Skill steuert Erkennung, Qualität, Regulation und Erholung, ohne Archetypen
  zu Solver-Bots zu glätten.
- [ ] Öffentlich gezeigte Showdownkarten nur als skill-, stichproben- und
  variantenabhängige Evidenz für spätere Gegner-Reads verwenden; niedriger
  Skill darf sie ignorieren (siehe [Informationsfluss-Audit](docs/reviews/gegner-reads-informationsfluss-audit-2026-09-30.md)).
- [ ] `generalSkill` und deterministisch korrelierte
  `variantProficiency` als Grundlage für spätere Variantenfamilien
  vorbereiten.
- [ ] `params.mental` tatsächlich verwenden und Bad Beat, Cooler, erkannte
  Bluffs, erfolgreiche Bluffs und Suckouts als gewichtete Mental Events
  anschließen.
- [ ] Frustration, Momentum, Tilt und Confidence begrenzen und mit
  Hysterese/Decay zuverlässig zur archetypischen Grundlinie zurückführen.

Das fachliche Zielbild und die Reihenfolge sind ausführlich unter
[Bot-Dynamik, Stake-Roster und Spielernotizen](docs/concepts/bot-dynamics-roster-and-notes.md)
dokumentiert.

#### Release-Gate für den 0.8.2-Cut

- [ ] Die vier formalen Meldungen der 300-Hand-Foundation-Regression mit
  Rohnennern und gezielten Gegenproben triagieren; den Snapshot nur nach
  bewusster Review-Entscheidung aktualisieren, nicht still passend machen.
- [ ] PLO Calling Station 6-max separat triagieren: Im unabhängigen
  3.000-Hand-Lauf liegen Fold-to-CBet bei 810/1909 (42,4 %) und
  Turn-C-Bet bei 47/270 (17,4 %). Der enge Fix für drawlose Multiway-Calls
  erklärt davon nur 21 zusätzliche Folds (+1,1 Prozentpunkte) und keine
  Turn-C-Bet-Änderung. Vor dem Release die betroffenen Handlinien und ihre
  Spielwirkung prüfen; weder global nachjustieren noch allein wegen der
  nicht bindenden Zielkorridore blockieren
  ([Diagnose und Gegenlauf](docs/reviews/plo-postflop-session-2026-10-01.md)).
- [ ] Finale NLHE-/PLO-Validierung für Full Ring, 6-max und Heads-up mit
  strukturellen Invarianten und dokumentierten Rohzählern; kurze Web-,
  Electron- und Android-Smokes auf dem Release-Kandidaten.

#### Nachgelagertes Dynamik-Gate (nicht Teil des 0.8.2-Cuts)

- [ ] Szenario-, Sequenz- und Sessiontests trennen Betstufen, wiederholte
  Steals, High-Skill-Defense, Low-Skill-Überreaktion und Rückkehr zur
  Grundlinie; marginale Deep-Stack-Eskalationen bleiben ausgeschlossen.
- [ ] Im Baseline-Modus werden Archetypen ohne adaptive Reads und Mental
  Events gegen die Zielkorridore geprüft; Ausreißer werden mit Rohnennern
  dokumentiert und nach Größe, Wiederholbarkeit und Spielwirkung triagiert,
  nicht automatisch als Release-Fehler gewertet.
- [ ] Im adaptiven Modus werden gerichtete, begrenzte Deltas statt statischer
  Einzelwerte geprüft.

---

### 0.8.3 — Refactoring & Code-Qualität

**Ziel:** Code-Basis konsolidieren, aufräumen und Lizenz-Formalia vor dem
großen UI-Release abschließen.

#### Refactoring

- [ ] Engine, Bot-Scoring, Sessionrunner/-export und Simulation entlang klarer
  fachlicher Modulgrenzen teilen; bestehende öffentliche Fassaden und Formate
  bleiben kompatibel.
- [ ] Tisch-, Replay-, Export- und Overlay-Orchestrierung aus den großen
  UI-Komponenten lösen, ohne vor 0.9 sichtbare Geometrieänderungen einzuführen.
- [ ] Gemeinsame Handanalyse-Helfer nur für tatsächlich identische NLHE-/PLO-
  Regeln extrahieren und veraltete Bot-Dateien sowie doppelte Helfer entfernen.
- [ ] Bet-Level aus der tatsächlichen Raise-Folge statt einer Sizinggrenze
  ableiten und damit große Opens von kleinen 3-Bets korrekt unterscheiden.
- [ ] Buildpfade und Entwicklerwerkzeuge bereinigen: ruhendes Serverpaket von
  v1 trennen sowie Format- und Lintkonfiguration dokumentiert einführen.
- [ ] Nach der Modultrennung den Bot-Datenfluss samt Informationsgrenzen und
  die Betrags-/Zustandskonventionen der Engine für Beitragende dokumentieren.

Die vorgesehenen Datei- und Schnittstellengrenzen sind im
[0.8.3-Refactoring-Scope](docs/plans/refactoring-v0.8.3.md) festgehalten.

#### Integrationstests

- [ ] Engine und `LocalGameRunner` als Pipeline von Blinds bis Showdown sowie
  Empty-State, Bust-zu-Ende und schnelle Neustarts testen.
- [ ] Große Bot-Tests nach den neuen Modulgrenzen teilen, ohne Regressionen zu
  verbreitern oder lediglich zu verschieben.
- [ ] Jeden Umbau als getrennten, verhaltensneutralen Commit absichern:
  Workspace-Tests, Build und Stake-Invarianz grün; Kalibrierungs-Snapshot exakt
  identisch statt nur innerhalb der Toleranzen.

#### Lizenzklarheit & Herkunftsnachweis

- [ ] SPDX-Hinweise für zentrale Bot-/Engine-Dateien und signierte zukünftige
  Release-Tags samt lokaler Verifikation einführen.
- [ ] Leichtgewichtiges Provenance-Manifest, Software-Heritage-Archivierung
  und einen proportionalen AGPL-Beweissicherungsleitfaden etablieren – ohne
  Telemetrie, Obfuskation oder Laufzeit-Wasserzeichen.

Abgrenzung und genaue Artefakte stehen ebenfalls im
[0.8.3-Refactoring-Scope](docs/plans/refactoring-v0.8.3.md#public-readiness-und-herkunftsnachweis).

---

### 0.8.4 — Session-Flexibilität

**Ziel:** Mehr Kontrolle über die Session.

#### Session-Setup und Aktionen

- [ ] Hero-Name, individuelle Bot-Stacks, Buy-in-Grenzen von 40–250 BB sowie
  Variante und Schwierigkeitsmix im Setup konfigurierbar machen; Blinds nur
  noch über gepflegte Presets statt `Freie Eingabe` wählen.
- [ ] Sichere Pre-Selections über eine zentral validierte
  `pendingHeroAction`-Pipeline anbieten; zunächst keine automatischen Raises
  oder ungebundenen Calls.
- [ ] Optionale Clock-Profile mit sicherem Check/Fold-Timeout sowie Pause bei
  Hintergrund, Gerätesperre und kontrolliertem App-Resume einführen.

#### Tisch-QoL und Diagnose

- [ ] All-in-Gewinn-/Splitwahrscheinlichkeiten und die aktuelle Made Hand für
  NLHE und PLO regelkonform, deterministisch getestet und ohne
  Handlungsempfehlung anzeigen.
- [ ] Eine sessionsübergreifend eindeutige, seed-neutrale Hand-ID am Tisch, im
  Replayer und in Exporten mit einem geschützten Reproduktionsbezug verbinden.

#### Bot-Stack-Lifecycle

- [ ] Rebuy-Zielstacks auf sinnvolle Geldstufen runden und Short-Stack-Rebuy,
  Deep-Stack-Cash-out, Limits sowie Ersatzspieler als gemeinsamen
  Zwischen-Hand-Flow modellieren.
- [ ] Beim Cash-out den tatsächlichen Stack statt `0,00` anzeigen und alle
  Übergänge in Replay, Sessionstatistik und Debugexport konsistent erfassen.

#### Release-Gate

- [ ] Setup → mehrere Hände → Rebuy/Cash-out und Ersatzspieler als
  durchgehenden Sessionflow testen.
- [ ] Pre-Selection- sowie Clock-/Resume-Sequenzen auf Desktop und Android
  absichern.
- [ ] Informationsanzeigen verändern weder Enginezustand noch Botentscheidung
  oder deterministisches Replay.

Der vollständige Funktionsumfang steht im
[0.8.4-Scopedokument](docs/plans/session-flexibility-v0.8.4.md). Fortlaufende
Roster-, Wiederholungs- und Variantenregeln bleiben zentral unter
[Bot-Dynamik, Stake-Roster und Spielernotizen](docs/concepts/bot-dynamics-roster-and-notes.md)
dokumentiert.

---

### 0.8.5 — Persistenz & Recovery

**Ziel:** Lokale Nutzerdaten vor v1 kontrolliert laden, migrieren und bei
Fehlern wiederherstellbar behandeln, statt beschädigte Einträge still zu
verwerfen oder ungefragt durch Defaults zu ersetzen.

- [ ] Gemeinsame versionierte Persistenzschicht für Roster, Replay-Archiv und
  Einstellungen definieren
- [ ] Gespeicherte Daten vor der Nutzung strukturell validieren und
  Migrationen als deterministische, separat getestete Schritte ausführen
- [ ] Beschädigte oder unbekannte Daten nicht still überschreiben; Recovery
  mit verständlicher Meldung, Diagnoseexport und bewusstem Reset anbieten
- [ ] Vollständigen lokalen Datenexport für Diagnose und Sicherung vor einem
  Reset bereitstellen
- [ ] Speicherfehler wie ungültiges JSON, unbekannte Schema-Version,
  Quota-Überschreitung und nicht verfügbares `localStorage` testen
- [ ] Roster, Replays und Einstellungen bleiben über unterstützte Upgrades
  erhalten; eine laufende Hand oder Session wird nicht wiederaufgenommen

---

### 0.8.6 — UI-Fundament

**Ziel:** Komponenten, Styles und Tests für den großen Tischumbau vorbereiten,
ohne vor 0.9.0 eine zweite sichtbare Geometrie einzuführen.

- [ ] `PokerTable` sowie responsive Tisch-Styles aus `TableScreen` entkoppeln
- [ ] Verantwortlichkeiten von TableSurface, TableStage, Pods, Karten, Bets,
  Board, Pot und Controls als Komponenten- und Layer-Grenzen festlegen
- [ ] Styling-Spike: Tailwind an einer repräsentativen UI-Komponente gegen
  CSS-Klassen und Design-Tokens evaluieren und die Entscheidung vor 0.9.0
  dokumentieren
- [ ] Component-Tests für PokerTable, PlayerSeat, ActionButtons und
  HandReplayer als Ausgangsbasis ergänzen
- [ ] Referenz-Viewports und visuelle Abnahme-Checkpoints für den 0.9-Umbau
  festhalten
- [ ] Geführte Alpha mit klar abgegrenzten Rollen und den Vorlagen der
  [Teststrategie](testing/TESTING_STRATEGY.md) vorbereiten; keine breite Bewerbung als
  fertiges Produkt

---

### 0.9.0 — TableSurface & TableGeometry

**Ziel:** Eine gemeinsame visuelle und mathematische Tischbasis statt
Hardcode-Presets. Die Tischschale wird zuerst als normierte Oberfläche
festgelegt; TableGeometry, Pods, Karten und Bets verwenden anschließend
dieselben Zonen als SSOT.

#### Iteration 1 — TableSurface

- [ ] Präsentationales React-SVG mit echter Ellipse und festem
  Zielverhältnis um 1,75:1 statt gestreckter Stadion-/Kapselform erstellen
- [ ] Pseudo-3D-Schichtung aus sichtbarer Unterkante, dunkler Leder-Rail,
  innerer Naht und gedecktem grünem Filz umsetzen
- [ ] Betting-Line nur als optionales, sehr dezentes Skin-Detail behandeln;
  Bet-Positionen dürfen nicht von ihrer Sichtbarkeit abhängen
- [ ] Silhouette, Rail-Stärke und Materialwirkung vor der Integration separat
  für Desktop und Android-Landscape visuell abnehmen

#### Iteration 2 — TableGeometry SSOT

- [ ] Normierte Surface-, Seat-, Card- und Bet-Ellipsen mit gemeinsamem
  Mittelpunkt und nachvollziehbaren Insets definieren
- [ ] SVG und Positionsberechnung aus denselben Geometriewerten ableiten,
  damit keine zweite visuelle Geometriequelle entsteht
- [ ] Heads-up, 6-max und Full Ring aus der Geometrie berechnen statt
  getrennte Seat-/Bet-/Button-Presets zu pflegen

#### Iteration 3 — Pod-Docking und Karten

- [ ] Pods waagerecht und überwiegend außerhalb des Felts anordnen; das Felt
  bleibt für Bets, Pot, Board und Ergebnisdarstellung frei
- [ ] Avatarzentrum als stabilen Docking-Punkt verwenden; Podkörper auf linker
  und rechter Tischhälfte gespiegelt vom Tisch weg wachsen lassen
- [ ] Hole Cards aufrecht hinter dem jeweiligen Pod platzieren und teilweise
  verdecken; feste Bühnen-Sicherheitszonen ersetzen sitzspezifische
  Clipping-Korrekturen
- [ ] Bets entlang der unsichtbaren inneren Bet-Ellipse eindeutig dem
  jeweiligen Spieler zuordnen

#### Release-Gate

- [ ] NLHE und PLO mit Heads-up, 6-max und Full Ring ohne Pod-, Karten- oder
  Bet-Überlagerungen in den Desktop-Referenzmaßen
- [ ] Automatisierte Geometrietests für Symmetrie, Bounding Boxes,
  Bet-Zuordnung und stabile Reihenfolge
- [ ] Visuelle Freigabe nach TableSurface und Pod-Docking statt ausschließlich
  am Ende des Gesamtumbaus

---

### 0.9.1 — Responsive UI & Replay

**Ziel:** Die gemeinsame Tischgeometrie auf alle unterstützten Oberflächen und
den HandReplayer übertragen.

- [ ] Desktop-, Tablet- und Android-Abstände, Header-Kompression und
  Table-Shell-Formel aus derselben Geometriequelle ableiten
- [ ] Phone-Landscape: Actionbar-Usability, sichtbaren Slider und kompakte
  Buttons auf Basis der Android-Prototyperkenntnisse finalisieren
- [ ] HandReplayer auf dieselbe TableSurface und TableGeometry umstellen
- [ ] **Replayer-Touch**: Android-Overlay und kleine Browser-Screens mit
  größeren Controls und geeigneten Touch-Gesten zuverlässig bedienbar machen
- [ ] Browser-Mobile bleibt ein funktionaler Fallback; keine PWA und keine
  vollständige Parität mit dem nativen Android-Layout

#### Release-Gate

- [ ] NLHE und PLO mit Heads-up, 6-max und Full Ring auf Desktop, Tablet und
  Android-Landscape ohne Pod-, Karten-, Bet- oder Control-Überlagerungen
- [ ] Viewport- und Geräte-Matrix gegen abgeschnittene Inhalte, falsche
  Bet-Zuordnung sowie Abweichungen zwischen Spiel und Replay
- [ ] Visuelle Freigabe der finalen Plattformkomposition
- [ ] Browser-Demo als öffentliche Beta mit bekannten Einschränkungen,
  rollenbezogenen Formularen und getrennten Kanälen für Bugs und Eindrücke
  ausweisen

#### Sprach- und Dokumentations-Checkpoint vor englischsprachiger Projektvorstellung

Nicht als technischer Blocker für 0.9.1, aber vor einer breiteren Vorstellung
auf englischsprachigen Plattformen wie Reddit:

- [ ] Öffentlich relevante Dokus zusätzlich auf Englisch anbieten: README mit
  aktuellem Stand und Einschränkungen, Einstieg für Installation/Tests,
  aktuelle Roadmap und Release-Hinweise sowie Beitrags- und Sicherheitswege.
- [ ] Deutsche und englische Einstiege gegenseitig verlinken und die
  inhaltliche Übereinstimmung bei Änderungen prüfen. Historische Audits und
  Kalibrierungsberichte bleiben zunächst in ihrer Originalsprache; bei
  öffentlicher Bezugnahme eine kurze englische Einordnung ergänzen.
- [ ] Die nutzerrelevante Oberfläche auf Deutsch und Englisch anbieten:
  insbesondere Start-/Setup-Screen, Tischaktionen und Statusmeldungen,
  Replay, Sessionstatistiken, Exportdialoge und verständliche Fehlermeldungen.
- [ ] Dafür eine schlanke i18n-Struktur mit zentralen Übersetzungsschlüsseln,
  Sprachwahl, Fallback und passenden Zahlen-/Datumsformaten prüfen. Interne
  IDs, Spielregeln und maschinenlesbare Debug-Exporte bleiben sprachunabhängig;
  ein konkretes Framework wird erst bei der Umsetzung ausgewählt.

---

### 0.9.2 — Naming, Branding & Controls

**Ziel:** Endgültige Projektidentität und ein eigenständiges Erscheinungsbild
statt einer an fremde Plattformen angelehnten Optik festlegen, bevor Release
Candidate, Packaging und breitere Kommunikation beginnen.

- [ ] **Naming-Checkpoint**: „CPCdigital“ ausdrücklich als bisherigen
  Arbeitstitel prüfen und den endgültigen Projekt-/Produktnamen vor dem
  Release Candidate festlegen
- [ ] Kandidat **CheckBack** anhand der dokumentierten Stärken, Kollisionen und
  Verfügbarkeitsprüfungen bewerten ([Naming-Notizen](docs/concepts/product-naming.md))
- [ ] Auffindbarkeit, Verwechslungsrisiken, Repository-/Domain-Namen sowie
  technische Bezeichner wie Paket- und App-IDs vor einer Umbenennung gemeinsam
  bewerten
- [ ] Finalen Namen konsistent in UI, Dokumentation, Paketmetadaten,
  Repository-Beschreibung und Distributionshinweisen anwenden
- [ ] Schlanke Marken- und Forkrichtlinie erst für die endgültige Identität
  formulieren: Herkunftsnennung erlauben, offizielle Zugehörigkeit nicht
  vortäuschen und AGPL-Rechte nicht einschränken
- [ ] Unaufdringlichen „Über / Lizenz / Quellcode“-Hinweis mit Copyright,
  AGPL-Lizenz und offiziellem Repository in die Anwendung integrieren
- [ ] **Branding-Review**: Action-Buttons vom bisherigen Rot auf das endgültige
  Projektfarbschema umstellen
- [ ] 4-Color-Deck-Option (alternative Kartendarstellung)
- [ ] BB-Anzeige-Modus (Stacks, Bets, Pot in Big Blinds)
- [ ] Währungswahl um "Keine" erweitern (nur Zahlen, kein €/$)
- [ ] Min-/Max-Bet direkt in der Oberfläche anzeigen
- [ ] Session-Log (kompakter Dealer-Log-Stil, einklappbar links unten)

---

### 0.9.3 — Essenzielles visuelles und akustisches Feedback

**Ziel:** Vor v1 eindeutiges, dezentes Spielgefühl schaffen, ohne Engine oder
Replay von einer komplexen Animationspipeline abhängig zu machen.

- [ ] Rein präsentationale CSS-Animationen für Deal/Reveal, Bet-/Pot-Änderung,
  aktiven Spieler und Gewinner
- [ ] Animationen dürfen Eingabe, Engine-Fortschritt und deterministisches
  Replay nicht steuern oder blockieren
- [ ] Dezente offline erzeugte Web-Audio-Sounds für Karten, Chips und
  Handabschluss; keine Musik und keine Stimmen
- [ ] Persistenter globaler Mute-Schalter und konservative Standardlautstärke
- [ ] `prefers-reduced-motion` respektieren und alle Zustände auch ohne
  Animation eindeutig darstellen

---

### 0.9.4 — Hardening, Accessibility & UI-Testing

**Ziel:** Fehlerfälle, Desktop-Sicherheitsgrenzen, Performance und
Bedienbarkeit vor dem Packaging gezielt absichern.

- [ ] React-ErrorBoundary mit lokaler Recovery-Ansicht, Neustart,
  Setup-Rückkehr und kopierbarem Diagnosebericht statt leerem Screen
- [ ] Unbehandelte Fehler und Promise-Rejections ausschließlich lokal für den
  Diagnoseexport erfassen; keine Telemetrie oder automatische Übertragung
- [ ] Electron-Renderer mit Sandbox und Content Security Policy härten sowie
  Navigation, externe Links und IPC-Eingaben auf erlaubte Fälle begrenzen
- [ ] Vollständigen Spiel-Smoke ohne Netzwerkverbindung für den gebauten
  Client und Electron durchführen
- [ ] Performance-Test für lange Sessions (>500 Hände) mit UI-Komponenten
- [ ] Render-Tests für neue UI-Komponenten (TableGeometry, Animationen)
- [ ] responsive Test-Matrix (Desktop, Tablet, Phone-Landscape)
- [ ] native Android-Matrix für Cutouts, Systemleisten, Zurück-Taste,
  Resume-Verhalten und unterstützte Displaygrößen
- [ ] Tastatursteuerung, Fokusführung, Kontrast und Reduced-Motion prüfen

---

### 0.9.5 — Packaging-Smoke & Release Candidate

**Ziel:** Den Kandidaten für v1.0 auf den tatsächlich unterstützten
Desktop-Plattformen bauen und mit einer schlanken, hobbyprojektgerechten
Abschlusskontrolle prüfen.

- [ ] Windows-Paket und Linux-AppImage aus dem versionierten Quellstand bauen
- [ ] Beide Pakete auf einer sauberen Umgebung installieren beziehungsweise
  starten und Setup, NLHE, PLO sowie Replay ohne Netzwerkverbindung prüfen
- [ ] Lizenztext, Copyright-, Drittanbieter- und Source-Hinweise in beiden
  Distributionswegen bereitstellen
- [ ] Paketinhalt auf lokale Entwicklungsdaten, Secrets und unnötige
  Server-Artefakte prüfen
- [ ] Unterstützte Systeme, Installationsweg und bekannte Einschränkungen
  knapp dokumentieren
- [ ] Windows- und Linux-Artefakte als öffentliche Vorabversion mit
  strukturiertem Fehlerformular gegen reale Installationen prüfen
- [ ] Release-Candidate taggen und nach dem vollständigen Gate bis v1.0
  inhaltlich unverändert lassen

> Checksummen können mit geringem Aufwand ergänzt werden, blockieren v1 aber
> nicht. Code-Signierung, Auto-Updates, bitgenau reproduzierbare Builds,
> SBOM-/Provenance-Pipelines und eine breite Distributionsmatrix sind für den
> Erstrelease ohne eigene Monetarisierung ausdrücklich kein Pflichtumfang.

---

### 1.0.0 — Stable Core Release

**Ziel:** Ein stabiles Offline-Pokerspiel mit NLHE und PLO sowie belastbarem
Fundament für spätere Lern- und Variantenmodule.

#### Enthalten

- [x] NLHE vollständig spielbar
- [x] Omaha High vollständig spielbar
- [x] 4 unterscheidbare Bot-Archetypen mit Personality, Skill, Reads, Mental State
- [x] vollständige Hand History und Replay
- [x] Decision Records und erklärbare Bot-Scores
- [x] Session-Statistiken (Live-VPIP/PFR, BB/100)
- [ ] stabiles Desktop-Packaging
- [ ] Dokumentation für Architektur und Variantenmodule

#### Release-Gates

- [ ] Keine bekannten kritischen Engine-, Replay- oder Datenintegritätsfehler
- [ ] NLHE- und PLO-Kalibrierung auf der dokumentierten 10k-Release-Stufe
- [ ] Desktop-, Tablet- und unterstütztes Landscape-Layout bestehen die responsive Testmatrix
- [ ] Migrationen für Roster, Replays und Sessiondaten sind rückwärtsverträglich getestet
- [ ] Beschädigte lokale Daten und UI-Laufzeitfehler führen zu einer
  verständlichen Recovery statt stillem Datenverlust oder leerem Screen
- [ ] Electron-Sandbox, CSP, Navigation, externe Links und IPC bestehen die
  dokumentierten Sicherheitsprüfungen
- [ ] Server-Paket ist nachweislich kein Laufzeitbestandteil des Offline-v1-Builds
- [ ] Endgültiger Projektname und Außenauftritt sind vor Packaging und
  breiterer Distribution konsistent festgelegt
- [ ] Offene Blocker aus geführter Alpha, Browser-Beta und öffentlichem
  Release-Candidate sind behoben oder nachvollziehbar außerhalb des
  v1-Umfangs eingeordnet
- [ ] Der geprüfte 0.9.5-Release-Candidate wird ohne funktionale Änderungen als
  v1.0.0 veröffentlicht

#### Packaging

- [ ] Windows
- [ ] Linux / AppImage

Der Android-Prototyp bleibt ein Entwicklungsziel und blockiert v1.0 nicht. Eine
signierte APK/AAB sowie öffentliche Distribution werden erst nach der
UI-Stabilisierung separat entschieden.

#### Nach v1.0 verschoben

- **2-7 Draw Family** — Single Draw und Triple Draw als gemeinsamer Architekturstrang
- **Stud Light** (Architektur-Proof offene Karten) — Teil der späteren Stud-Familie

---

## Phase 5 — Meta-Game

### 1.0.1 — Bankroll-System

**Ziel:** Spielgeld kriegt Wert durch Konsequenz. Gutes Bankroll-Management führt zum
Aufstieg, schlechtes zum Abstieg. Kurze Stacks und "eh egal, ist nur Spielgeld" werden
durch Guardrails verhindert.

#### Kernumfang

- [ ] Trainings- und Bankroll-Modus mit persistenten, je Variante getrennten
  Bankrolls und Buy-in-/Rebuy-Regeln.
- [ ] Variantenspezifische Stake- und Risikoprofile anhand simulierter
  Bankrollverläufe prüfen; Auf- und Abstieg mit Guardrails absichern.
- [ ] Stakeabhängige, überlappende Gegnerpools und Skillbänder sowie
  anpassbare Action-Clock-Voreinstellungen einführen.
- [ ] Recovery bei verbrauchter Bankroll und verständliche Statusanzeigen
  für Rebuys, Stakes und Sessionergebnis ergänzen.

Vorläufige Beträge, Tabellen, offene Modellierungsfragen und die vollständige
Aufgabenliste stehen im [Bankroll-Konzept](docs/plans/bankroll-v1.0.1.md).

---

### 1.0.2 — Globale Statistiken

**Ziel:** Session-übergreifendes Tracking mit Filterung und Vergleich.

- [ ] Persistente, versionierte Globalstatistik (Sessions, WTSD, W$SD, BB/100)
- [ ] Filter nach Variante, Tischgröße, Stakes, Zeitraum
- [ ] Single- und Multitable-Sessions getrennt filtern und vergleichbar machen
- [ ] BB/100 als primäre Vergleichsmetrik pro Stake
- [ ] Bankroll-Verlauf als Graph (optional, minimal)

---

### 1.0.3 — Wiederkehrende Gegner & Spielernotizen

**Ziel:** Beobachtung über mehrere Sessions belohnen, ohne stabile Bots in eine
endliche Sammlung dauerhaft gelöster Profile zu verwandeln.

- [ ] freie Notiz und wenige optionale manuelle Tags an die stabile
  `BotIdentity.id` binden
- [ ] Notizen am Tisch und aus dem Replayer bearbeiten; Datum, Stake und
  optionale Handreferenz sowie die gespielte Variante speichern
- [ ] Notizen in die versionierte lokale Persistenz sowie Export/Backup
  aufnehmen
- [ ] keine automatische Archetyp-/Skill-Bestätigung, kein Roster-Fortschritt
  und zunächst kein automatisches HUD einführen
- [ ] chronologische, stakebezogene Beobachtungen unterstützen, damit Reads
  aktualisiert statt als endgültige Lösung abgehakt werden
- [ ] grobe faire Erinnerung wiederkehrender Bots an den Nutzer prüfen, damit
  Wiedererkennung nicht ausschließlich einseitig zugunsten des Menschen wirkt
- [ ] Notizfunktion erst freigeben, wenn strategische und mentale Bot-Dynamik
  ausreichend angeschlossen und per Probesession belegt ist

Das detaillierte Konzept einschließlich Rostergröße, Stake-Gewichten,
Anti-Exploit-Grenzen und Akzeptanzkriterien steht in
[Bot-Dynamik, Stake-Roster und Spielernotizen](docs/concepts/bot-dynamics-roster-and-notes.md).

---

### 1.0.4 — Optionales Multitabling

**Ziel:** Erfahrenen Spielern mehrere parallele Tische erlauben, ohne den
beobachtungsorientierten Einstieg, das Bankrollsystem oder die mobile
Bedienbarkeit zu beschädigen.

#### Produktgrenzen

- [ ] Single Table bleibt Standard und ist in Einsteiger-Lernpfaden sowie
  geführten Übungen verbindlich
- [ ] Multitabling erst nach einer fortgeschrittenen Lektion oder über eine
  ausdrücklich aktivierte Expertenoption freischalten; nicht allein an einen
  Stake-Aufstieg koppeln
- [ ] zunächst höchstens zwei parallele Tische auf Desktop zulassen; vier
  Tische erst nach UX-, Performance- und Probesession-Evidenz prüfen
- [ ] Android wegen Bildschirmgröße zunächst auf einen Tisch begrenzen
- [ ] Pre-Selections, sichere Auto-Actions, Action-Clock und Fokusmeldungen als
  technische Voraussetzungen behandeln
- [ ] jede Bot-Identität darf nur an einem gleichzeitig laufenden Tisch sitzen
  und wird aus dem passenden Stake-Pool gezogen
- [ ] Buy-ins und Rebuys aller offenen Tische atomar gegen die verfügbare
  Bankroll buchen; gebundenes Gesamtrisiko sichtbar anzeigen
- [ ] unabhängige Runner, Hand Histories, Replays und Session-Enden pro Tisch
  ohne vermischte Aktionen oder Timer modellieren
- [ ] Tisch mit anstehender Hero-Aktion klar hervorheben; keine automatische
  strategische Entscheidungshilfe ergänzen
- [ ] Statistiken und Session-Analyse nach Anzahl paralleler Tische auswerten,
  damit geringere Entscheidungsqualität und Winrate sichtbar werden

Multitabling ist eine freiwillige fortgeschrittene Spielweise, kein höherer
Schwierigkeitsgrad und keine Voraussetzung für Bankrollfortschritt. Die
zugehörige Learning-Lektion muss vor der regulären Freigabe vorhanden sein.

---

## Phase 6 — Learning Layer

> Die Learning-Schicht ist das, was CPCdigital von anderen Poker-Apps unterscheidet.
> Jede neue Variante profitiert sofort von Wiki, Tutorials und Analyse.
> Die Daten sind seit v0.2 vorhanden — die UI-Schicht kommt jetzt.

### 1.1.0 — Wiki und Glossar

**Ziel:** Eine gemeinsame Wissensbasis für Regeln, Begriffe und Grundlagen.

- [ ] variantenspezifische Regelübersichten
- [ ] Handrangfolgen
- [ ] Glossar für Pokerbegriffe
- [ ] grundlegende Strategiekonzepte
- [ ] typische Anfängerfehler
- [ ] Beispiele mit konkreten Händen
- [ ] Querverweise zwischen verwandten Begriffen
- [ ] kontextbezogene Links aus Tisch, Replay und Analyse

---

### 1.2.0 — Tutorial-Modus

**Ziel:** Spieler schrittweise vom Regelverständnis zum freien Spiel führen.

- [ ] interaktive Grundregel-Tutorials
- [ ] geführte Beispielhände
- [ ] Erklärung der aktuellen Setzrunde
- [ ] Erklärung erlaubter Aktionen und Bet-Limits
- [ ] Draw- und Showdown-Tutorials
- [ ] optionale Strategiehinweise
- [ ] Lernpfade pro Variante
- [ ] Einsteiger-, Standard- und Puristen-Hilfestufe
- [ ] fortgeschrittene Multitabling-Lektion zu Aufmerksamkeit,
  Entscheidungszeit, Pre-Selections, Gesamt-Bankrollrisiko und sinkender
  Qualität eigener Reads
- [ ] kontrollierte Vergleichsübung mit einem gegenüber zwei Tischen und
  anschließender Auswertung von Entscheidungszeit und Fehlern

---

### 1.3.0 — Session-Analyse anhand konkreter Hände

**Ziel:** Entscheidungen statt bloßer Ergebnisse erklären.

- [ ] wenige interessante Hände pro Session auswählen
- [ ] Entscheidungssicht und Ergebnissicht trennen
- [ ] relevante Faktoren zum Entscheidungszeitpunkt anzeigen
- [ ] gute Entscheidungen trotz schlechtem Ergebnis hervorheben
- [ ] schlechte Entscheidungen trotz gewonnenem Pot erklären
- [ ] knappe und gegnerabhängige Spots kennzeichnen
- [ ] alternative Aktionen verständlich einordnen
- [ ] übertragbare Lektion pro Beispielhand
- [ ] passende Wiki-Begriffe verlinken
- [ ] keine falsche GTO-Exaktheit vortäuschen

#### Analyseformat

```text
Was ist passiert?
→ Welche Informationen waren bekannt?
→ Welche Faktoren waren entscheidend?
→ Wie ist die Aktion einzuordnen?
→ Welche Alternativen gab es?
→ Was lässt sich daraus lernen?
```

---

### 1.4.0 — Poker-Rätsel

**Ziel:** Konkrete Situationen trainieren — inspiriert von existierenden Puzzle-Apps,
aber mit tieferer Erklärungsschicht statt nur "richtig/falsch".

- [ ] feste Grundlagenrätsel (Preflop, Postflop, Bet-Sizing)
- [ ] Fold-, Call-, Raise- und All-in-Entscheidungen
- [ ] Draw- und Pat-Entscheidungen
- [ ] Range- und Read-Aufgaben
- [ ] Fehler in einer Hand finden
- [ ] mehrstufige Hände nachspielen
- [ ] Schwierigkeitsgrade
- [ ] **Erklärungsschicht**: Warum ist Aktion X besser als Y? Welche Faktoren waren entscheidend?
- [ ] persönliche Rätsel aus eigenen Sessions generieren

---

## Phase 7 — Mehr Varianten

> Neue Varianten bauen auf den existierenden Architektur-Grundlagen auf
> und profitieren direkt von Wiki, Tutorials und Rätseln aus Phase 6.

### Variantenübergreifende Bot-Kompetenz

- [ ] Für jede neue Variantenfamilie eigenes `variantProficiency` und
  `variantAffinity` ergänzen, ohne Identität, Grundpersönlichkeit und
  allgemeinen Skill neu auszulosen
- [ ] Archetypen in die strategische Sprache der Variante übersetzen statt
  NLHE-Aktionslogik zu übertragen
- [ ] Gegner-Reads und Spielernotizen mit Variantenkontext persistieren; eine
  grobe allgemeine Reputation darf identitätsgebunden bleiben
- [ ] den globalen Roster bei Bedarf um geprüfte Draw-/Stud-Spezialisten
  erweitern; die nahe Zielgröße von ungefähr 64 ist kein dauerhaftes Hard-Limit
- [ ] Kalibrierung und Probesessions pro Varianten-, Skill-, Stake- und
  Tischformat-Kombination planen

### 1.5.0 — 2-7 Draw Family

**Ziel:** Draw-Poker nach dem stabilen v1-Kern als zusammenhängendes
Variantenmodul einführen, zunächst Single Draw und darauf aufbauend Triple Draw.

- [ ] 2-7-Lowball-Handrangfolge
- [ ] `DrawPhaseDefinition`, Kartentausch und Draw-History in der Engine
- [ ] 2-7 Single Draw mit No-Limit-Setzstruktur
- [ ] `VariantEvaluator` für Draw-Qualität, Discards, Pat und Snowing
- [ ] anschließend Triple Draw mit drei Draws und vier Fixed-Limit-Setzrunden
- [ ] mehrstufige Pat-/Draw-/Bluff-Strategien für Bots
- [ ] Regelhinweise, Tutorial- und Rätselmaterial

---

### 1.5.1 — Omaha Hi-Lo

**Ziel:** Direkte Erweiterung von Omaha High (0.7.1) — Split-Pot mit Low-Qualifier.

- [ ] High-/Low-Auswertung (A-5 Lowball)
- [ ] Qualifier-Regeln (8-or-better)
- [ ] Split- und Quarter-Pot-Logik
- [ ] Low-Draw- und Scoop-Bewertung
- [ ] Bot-Strategie: Two-Way-Hands, Scoop-Potential

---

### 1.6.0 — Badugi

**Ziel:** Dritte Draw-Variante mit fundamental anderem Hand-Ranking.

- [ ] Badugi-Handrangfolge (4 Karten, verschiedene Farben, keine Pairs)
- [ ] Draw-Regeln (1–4 Karten tauschen, 3 Ziehrunden)
- [ ] Pat-Signale und Snowing
- [ ] botseitige Draw- und Blufflogik

---

### 1.7.0 — Stud-Familie (Razz + Seven Card Stud)

**Ziel:** Stud-Spiele als eigene Kategorie — offene Karten im `BotContext`.

- [ ] Razz (A-5 Lowball, 7 Cards, keine Draws)
- [ ] Seven Card Stud (High, 7 Cards, offene Karten)
- [ ] `BotContext` um `visibleOpponentCards` erweitert
- [ ] Ante-, Bring-in- und Street-Logik (3rd–7th Street)
- [ ] Vereinfachte Bot-AI für Stud als erster Architektur-Proof

---

## Phase 8 — Plattformen & Multiplayer

### 1.8.0 — Android-Distribution (optional)

Die technische Grundlage und der lokale Debug-Workflow bestehen seit v0.7.7.
Nach der UI- und Gerätevalidierung aus v0.9.0–v0.9.4 wird entschieden, ob daraus
ein öffentlich vertriebener Android-Client entsteht. Der Prototyp darf
unabhängig davon als internes Testziel weiterlaufen.

- [ ] unterstützte Smartphones, Tablets, Tischformate und Varianten festlegen
- [ ] App-Icons, Splashscreen, Berechtigungen und Produktionskonfiguration
  abschließen
- [ ] signierte APK/AAB reproduzierbar bauen und Upgrade-Pfad testen
- [ ] AGPL-konforme Source-, Lizenz- und Drittanbieterhinweise im
  Distributionsweg bereitstellen
- [ ] GitHub Release, alternativen Store oder Play Store bewusst auswählen

> Eine PWA ist nicht vorgesehen. Geometriearbeit bleibt in 0.9.0,
> Touch-Integration in 0.9.1 und die native Geräte-/Lifecycle-Matrix in 0.9.4.

---

### 1.9.0 — Table Rules & Multiplayer-Readiness

**Ziel:** Sonderregeln als allgemeine, deterministische Engine-Erweiterungen vorbereiten.

- [ ] allgemeines `TableRules`-Framework getrennt von Variantenregeln definieren
- [ ] Kompatibilitätsprüfung zwischen Pokervariante, Betting-Struktur und Sonderregel
- [ ] Pflichtbeiträge, übersprungene Phasen, zusätzliche Boards sowie Bonusabrechnungen modellieren
- [ ] Main- und Side-Pots bei mehreren Boards beziehungsweise zusätzlichen Auszahlungen korrekt abrechnen
- [ ] Sonderregeln vollständig in Hand History, Decision Snapshots und deterministischen Replays erfassen
- [ ] protokollneutrale Zustimmungs-, Timeout- und Ablehnungs-Events für spätere Spielerentscheidungen vorbereiten
- [ ] Single-Board Bomb Pot als erster offline testbarer Proof

#### Freigabe ab v2.x

- Sonderregeln in Lobbys beziehungsweise Tisch-Setups für echte Spieler auswählbar machen
- Run It Twice, Bomb Pots und 7-2-Game/Bounty im Multiplayer
- Online-Multiplayer frühestens ab v2.0 und weiterhin nur als langfristige Option

---

## Später / Unerforscht

Diese Themen sind notiert, aber weder priorisiert noch im Scope einer bestimmten Version.
Sie können in zukünftige Phasen einsortiert oder verworfen werden.

| Thema | Kategorie | Notizen |
|-------|-----------|---------|
| Short Deck (6+) | Variante | Community-Card, 36-Karten-Deck, angepasste Hand-Ranks |
| Stud Hi-Lo | Variante | Erweiterung von 1.7.0 |
| Mixed Games (HORSE) | Variante | Rotation mehrerer Varianten, Session-Format |
| Tournament-Modus | Spielmodus | Blinds steigen, Payout-Struktur, ICM |
| Lokaler Multiplayer | Plattform | Hot-Seat, gleicher Rechner |
