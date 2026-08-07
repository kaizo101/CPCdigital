# Changelog

Alle wichtigen veröffentlichten Änderungen an CPCdigital werden in dieser Datei dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/), und das Projekt verwendet semantische Versionsnummern. Geplante Funktionen stehen ausschließlich in der [Roadmap](ROADMAP.md).

## [0.8.0] — 2026-08-07

### Added

- **Code-Review**: Systematische Prüfung von 30 Modulen (Engine, Game-Loop,
  Scoring, Modifier, Support, Habits, Identities, Replay, Rebuy, NLHE/PLO-Handbewertung).
  22 Bugs gefunden und behoben, 19 Module als bugfrei bestätigt ([REVIEW.md](REVIEW.md)).
- **PLO-Nut-Erkennung verfeinert**: `'second-nuts'`-Stufe zwischen `'near-nuts'`
  und `'strong'` für granulare PLO-Bewertung (Quads-K-vs-A, FH-KKKAA-vs-AAA,
  K-high-Flush-vs-A-high, Straight-Gap). Eigener Scoring-Parameter
  `secondNutPotential: 4` dämpft Aggression bei zweitbesten Händen.
- **PLO-Straight-Flush- & Quads-Nut**: SF prüft höchsten möglichen Straight-Flush
  via Board-Suit-Ranks; Quads erkennen blockierte höhere Ränge via `ourCount`.
- **`findStraightTop`-Algorithmus**: O(10)-Enumeration über alle 10 Straight-Runs
  für NLHE und PLO — ersetzt defekte Heuristiken in `isNutStraight` (NLHE) und
  `findNutStraightTop` (PLO).
- **PLO-Flush-Nut**: Korrekte Hole-vs-Board-Trennung statt Hand-Cards-Minus-Board-Hack;
  höchste nicht-auf-Board-Rang der Flush-Farbe bestimmt Nut-Status.

### Changed

- **PLO-Score-Tabellen rekalibriert**: LAG-Raise-Scores auf v0.7.8-Niveau
  zurück, TAG-Raise-Scores erhöht, Nit-Fold-Scores erhöht, Protection-Boni
  auf Originalwerte zurück, Board-Worse-Sensitivity 0.6→0.4.
- **Kalibrierungs-Targets aktualisiert**: NLHE C-Bet (LAG 80–90→68–78%,
  Nit 45–58→60–72%), NLHE/PLO AF-Caps gesenkt, PLO WTSD-Targets nach
  PLO-Realismus-Kriterien gesetzt (TAG 22–32, Nit 22–28, LAG 28–34, CS 28–45).
- **ROADMAP**: PLO-Nut-Erkennung, `findStraightTop` und Code-Review als abgeschlossene Punkte in v0.8.0 eingetragen.

### Fixed

- **`calculateOmahaStrength`**: if-Chain ohne `else` — alle Rangstufen ≥4 kollabierten in dieselbe Formel (rank 9=72 statt 88).
- **`isDominatedStraightOut`**: Gegner-Trial immer leer — `out` gleichzeitig auf Board und im Hole, Gegner-Prüfung nie ausgeführt.
- **`findNutStraightTop` (PLO)**: `boardRanks`-Parameter nie genutzt, gab immer 14 zurück — falsch-positive Nut-Erkennung bei Straights.
- **PLO-Flush-Nut**: Board-Ass wurde zu unseren Hole-Card-Rängen gezählt — jeder Board-Ass-Flush als `near-nuts`.
- **PLO Full House/Trips/Two Pair**: Nut-Heuristik ohne Gegner-Trips-Berechnung (`boardCount+min(2,4-bc-ourCount)≥3`).
- **`limp-reraise-premium`**: Checkte `'strong'` statt `'premium'` — AA/KK lösten den Habit nicht aus.
- **`three-barrel-bluff`**: Feuerte bei jedem River-Bluff ohne Prüfung auf Flop-/Turn-Aggression.
- **Nit-Rebuy-Policy**: `rebuyThresholdBb` und `maxRebuys` unabhängig gewürfelt — 28% der Nits mit `null`-Threshold bei `maxRebuys:1`.
- **`getCashOutPolicy`**: LAG nicht im Ternary-Chain — fiel durch auf Default-Fallback.
- **Turn-Karte doppelt**: PokerStars-History zeigte Turn-Karte in Board-Segment UND als Einzelkarte.
- **`marginal`-Doppelstrafe**: Reraise-Penalties trafen `marginal` doppelt (−30) vs. `weak` (−18).
- **`findStraightDraw` (NLHE)**: A-high-Wrap (J,Q,K,A) als OESD (8 Outs) statt Gutshot (4 Outs) klassifiziert.
- **`calculateCleanOuts`**: JSDoc-Kommentar fehlplatziert im Funktionskörper, Klammern-Einrückung gebrochen.
- Alle weiteren Bugs aus dem Code-Review (REVIEW.md).

## [0.7.9] — 2026-08-04

### Added

- **Nativer Android-Export**: Session-Logs, Replayer-Hand-Histories und das
  vollständige Debug-JSON werden im App-Cache als echte Datei erzeugt und über
  das Android-Teilen-/Speichern-Menü exportiert. Web und Desktop behalten den
  direkten Browser-Download.
- **Bot-Porträts**: 36 weitere Roster-Identitäten erhalten aus den neuen
  Avatarbögen zugeschnittene und optimierte 512×512-WebP-Porträts. Damit sind
  40 der 44 stabilen Bot-Identitäten bebildert; die übrigen vier verwenden
  weiterhin den Initialen-Fallback.
- **PLO-Board-Delta**: Flush-Vervollständigungen, Board-Paarungen und nach der
  Omaha-3-Board-Regel neu entstehende Straight-Fenster lösen jetzt eine
  variantenabhängig dosierte Protection-Reaktion aus.
- **Kalibrierungsschema v2**: Ein zentraler Hand-Accumulator definiert VPIP,
  PFR, 3-Bet, C-Bet, Fold-to-C-Bet und AF; Golden-Hand-Tests und Invarianten
  sichern unmögliche Zählerrelationen ab.
- **Bot-Cash-outs**: Gewinner verlassen den Tisch nach einer archetypabhängigen
  Mindestdauer ab einer Basisschwelle von 240–480 BB, individuell durch ihre
  Risikoneigung verschoben, und spätestens am persönlichen Hard-Limit bis
  800 BB. Der vorhandene Ersatzmechanismus besetzt den Sitz anschließend wieder
  mit dem normalen Startstack.

### Changed

- **Opponent Evidence**: Line- und Sizing-Signale wirken gemeinsam und
  aktionsabhängig auf Fold, Call und Raise. Kleine Bets werden abhängig von der
  eigenen Aggressionsneigung attackiert, große Abweichungen vorsichtiger
  behandelt.
- **Sessiontreue Kalibrierung**: Simulation und echte lokale Session verwenden
  dieselbe Opponent-Read-Beobachtung. Alle unveränderten Full-Ring- und
  6-max-Targets wurden für NLHE und PLO mit deterministischen 10k-Läufen
  bestätigt; Heads-up bleibt in v0.8.0.
- **PLO Calling Station**: Flop-Defense in Full Ring und 6-max verbreitert und
  die spätere Call-Down-Neigung getrennt kalibriert. Das senkt unplausibel hohe
  Fold-to-C-Bet-Werte, ohne AF- oder WTSD-Korridore zu erweitern.
- **PLO-Preflop-Handqualität**: Suit-Struktur, Nut-Suits, Paare, Rundowns,
  Wheel-Connectivity und Dangler werden unabhängig von Position und vorheriger
  Action bewertet. Triple-/monotone Suits gelten nicht länger als
  double-suited und Paare erzeugen keine fiktive Connectedness.
- **PLO-Format- und Street-Trennung**: Eine gemeinsame absolute Handbewertung
  speist formatspezifische Full-Ring-/6-max-Aktionen sowie getrennte
  Flop-/Turn-/River-Scores. LAG-River-Pressure und Calling-Station-Defense
  bleiben dadurch lokal kalibrierbar, ohne andere Formate mitzuziehen.
- **Calling-Station-Skillprofil**: Dauerhaft loose-passive Identitäten bleiben
  mit einer deterministischen Verteilung von 38 ± 6 vollständig im Low-Tier
  von 15 bis 49. Generator v3 migriert vorhandene CS-Skills, ohne Namen, IDs
  oder individuelle Nicht-CS-Skills neu auszulosen.
- **Manuelle Verhaltensprüfung**: Nach Änderungen an Kalibrierung, Ranges oder
  Action Scores ist zusätzlich zu deterministischen Läufen eine 100–150-Hände-
  Probe-Session mit Hand-Triage als wiederkehrendes Release-Gate dokumentiert.

### Fixed

- **Android-Debugzugang**: Der Bot-Debug-Modus ist im nativen Client nicht
  länger ausschließlich über die Desktop-Tastenkombination `Strg+D`
  erreichbar. Fünf schnelle Berührungen der Versionsanzeige schalten ihn
  touchfähig um; der Zustand bleibt lokal für folgende Sessions gespeichert.
- **Capacitor-Plugin-Sync im Workspace**: Die vom Client verwendeten Plugins
  `App`, `Filesystem` und `Share` werden im Monorepo explizit in den nativen
  Android-Build aufgenommen; zuvor blieb die generierte Plugin-Liste leer.
- **Omaha-Showdownvergleich**: `evaluateOmahaHand()` wählt innerhalb derselben
  Handkategorie jetzt die tatsächlich stärkste Fünf-Karten-Kombination statt
  der zuerst iterierten. Der in der PLO-Probesession sichtbare falsche Sieg von
  9-9-2-2 gegen Q-Q-2-2 ist als reihenfolgeunabhängiger Regressionstest
  abgesichert.
- **PLO-Made-Hand-Protection**: Verwundbare Sets, Straights und Flushes
  erhalten auf Flop und Turn einen eigenen, dosierten Equity-Denial-Impuls;
  der River bleibt davon ausgenommen. Dadurch überschreibt Protection nicht
  deterministisch den Archetyp.
- **PLO-LAG-Commitment**: Nicht-nut-orientierte Preflop- und Postflop-All-ins
  deutlich gedämpft, normale Raises aber beibehalten. Full Ring und 6-max
  besitzen getrennte späte Pressure-/Fold-Gewichte statt einer gemeinsamen
  Kompromisstabelle.

- **Sizing-Normalisierung**: Historische und aktuelle aggressive Aktionen
  werden einheitlich als tatsächlich investierte Chips relativ zum Pot vor der
  Aktion verglichen; die aktuelle Beobachtung wird aus ihrem EMA-Vergleich
  herausgerechnet.
- **Passive All-ins**: Zu kurze All-in-Calls erzeugen weder Aggressions- noch
  Sizing-Evidenz und werden in Reads wie Calls behandelt.
- **VPIP bei Free Checks**: Ein kostenloser Check im Big Blind gilt weder in
  Session-Reads noch in der Kalibrierung als freiwillige Pot-Beteiligung.
- **Bot-Austausch am Tisch**: Name, Avatar, Engine-Spieler und Replayer wechseln
  nun gemeinsam auf die neue Identität; zuvor blieb am Live-Sitz der alte Name
  stehen.
- **Protection-Sizing**: `boardGotWorse` wird an die Raise-Sizing-Berechnung
  weitergereicht; der zuvor wirkungslose `any`-Zugriff ist entfernt.
- **Opponent Reads**: Eine normalerweise passive gegnerische Bet erzeugt nicht
  länger pauschal einen Call-Bonus; Preflop- und Postflop-Reaktionen sind
  unterschiedlich stark dosiert.
- **Deep-Stack-All-ins**: Open-Shoves über 40 BB sowie tiefe, noch nicht
  ausreichend investierte All-ins erhalten harte Commitment-Grenzen, statt als
  normale Raise-Alternative bis 400+ BB auswählbar zu bleiben. Die
  Kalibrierung zählt solche Open-Shoves und uncommitted Deep-Shoves separat und
  schlägt bei jedem Treffer fehl. Normale Raises, die auf den Maximalbetrag
  runden würden, bleiben unterhalb des All-ins, solange der Shove gesperrt ist.
- **NLHE-Calling-Station-Value**: Niedrige Aggression reduziert Value-Bets
  weiterhin, löst für Made Hands aber nicht zusätzlich die Bluff-/Initiative-
  Sperre aus. Der `sticky-postflop`-Einfluss nimmt über die Streets ab;
  wiederholter Druck bestraft drawlose schwache Call-downs auf Turn und River.
  PLO behält seine separat kalibrierten Street-Tabellen.
- **Latentes Positionsfeld**: Das semantisch falsche und ungenutzte
  `iAmInPosition` aus der Street-Analyse entfernt, bevor es versehentlich an
  Scoring angeschlossen werden kann.

### Security

- **Transitive npm-Abhängigkeiten**: `brace-expansion` auf 5.0.9 und
  `socket.io-parser` auf 4.2.7 aktualisiert; der High-Severity-Audit ist damit
  wieder ohne Befund.
- **Electron-Sicherheitsupdate**: Electron innerhalb der kompatiblen 41er-Reihe
  auf 41.10.4 aktualisiert und die Install-Script-Freigabe versionsgenau
  nachgezogen; die am 5. August gemeldeten High-Severity-Advisories sind damit
  behoben.

## [0.7.8] — 2026-08-03

### Added

- **PLO-Preflop-Strategie-Tabelle**: Archetyp, Situation, Handkategorie und
  Tischgröße steuern die bevorzugte Aktion; PLO verwendet dafür eine gegenüber
  NLHE abgeschwächte Strategiegewichtung.
- **Gemischte Nit-6-max-Aktionen**: `raise-or-call` für gute Hände und
  `call-or-fold` für mittlere Hände gegen ein Open verbreitern die Range
  kontrolliert, ohne globale Postflop-Aggression zu manipulieren.
- **Kalibrierungsdiagnostik**: Profil- und Formatfilter sowie optionale Traces
  nach Street, Handkategorie, PFA-Rolle und Bet-Druck ergänzt.
- **Kalibrierungsberichte**: NLHE-C-Bet-Neudefinition, PLO-Metrik-Audit und die
  finalen deterministischen 10k-Werte nachvollziehbar dokumentiert.

### Changed

- **PLO-Kalibrierung abgeschlossen**: TAG, Nit, LAG und Calling Station liegen
  in Full Ring und 6-max über VPIP, PFR, 3-Bet, C-Bet, AF und WTSD innerhalb
  ihrer menschlich plausiblen Zielkorridore.
- **PLO-Archetypen geschärft**: TAG-/LAG-3-Bets, Calling-Station-VPIP und die
  Nit-Ranges für Full Ring und 6-max situationsabhängig kalibriert.
- **NLHE-C-Bet**: Die fachlich präzisere Kennzahl zählt den letzten
  Preflop-Aggressor beim offenen Flop; die Zielkorridore wurden anhand der
  unveränderten deterministischen Baseline neu gesetzt.
- **Metrikabhängige PLO-Ziele**: Kleine Korridorkorrekturen berücksichtigen die
  bereinigten AF-, WTSD- und 3-Bet-Definitionen; die zwischenzeitlich breite
  Nit-6-max-Erweiterung auf AF 4,5 / WTSD 40 wurde verworfen.

### Fixed

- **WTSD-Nenner**: Spieler, die den Flop sehen und später folden, bleiben im
  Nenner; Preflop-All-ins mit automatischem Board-Runout werden korrekt ergänzt.
- **AF bei All-ins**: Zu kurze passive All-in-Calls zählen als Calls statt als
  Bets oder Raises.
- **3-Bet-Opportunities**: Spätere Backraise-Gelegenheiten werden auch nach
  einer vorherigen Aktion des Spielers im Nenner erfasst.
- **Kalibrierungs-Typecheck**: Test-Fixture an die verpflichtende
  `preflopRaiseCount`-Angabe angepasst.

### Known limitations

- **Heads-up-Kalibrierung**: Bleibt vollständig für v0.8.0 vorgesehen. Der
  korrigierte NLHE-Lauf bestätigt für Calling Station HU 1,79% 3-Bet bei 10k
  Händen (63/3512 Opportunities) gegenüber dem bisherigen Korridor von 2–13%;
  Verhalten und Target bleiben in v0.7.8 bewusst unverändert.

## [0.7.7] — 2026-07-30

### Added

- **Lizenzierung**: Quellcode und originale Projektassets unter `AGPL-3.0-only` gestellt; Lizenzumfang, Copyright und Beitragsregeln dokumentiert.
- **Android-Prototyp**: Capacitor 8, ein eingechecktes Android-Projekt und Skripte für Sync, Android Studio, Debug-Deployment und Gradle-Validierung ergänzt.
- **Native Runtime-Schicht**: Web und Android werden ohne User-Agent-Abfrage unterschieden; Android erhält Landscape-Ausrichtung, immersive Systemleisten, Display-Cutout-Unterstützung sowie Resume- und Zurück-Taste-Handling.
- **Lokaler Electron-Start**: Versionsgebundene Freigaben für erforderliche Dependency-Install-Skripte und eine Runtime-Prüfung mit konkreter Reparaturanweisung ergänzt.
- **Demo-Sicherheit**: Öffentlichen Demo-Sync zunächst auf eine Positivliste umgestellt und nach dem Pages-Cutover durch eine statische Weiterleitung auf das Hauptrepository ersetzt.
- **Abhängigkeiten**: Vite/Vitest sowie sicherheitsrelevante transitive Express-/Socket.IO-Abhängigkeiten auf behobene Versionen aktualisiert.
- **Public Readiness**: Sicherheitsrichtlinie, reproduzierbare CI, Dependabot, Dependency Review, CodeQL und ein auf öffentliche Sichtbarkeit begrenztes Pages-Deployment ergänzt; Hauptrepository und offizielle Demo veröffentlicht.
- **Server-Konfigurationstests**: JWT-Secret, Host- und Port-Validierung in die Root-Test-Suite aufgenommen.
- **Responsive-Regressionstests**: Produktionsbuild in Chrome/Chromium für Desktop, Tablet, Phone-Landscape und Phone-Portrait auf sichtbare Karten, Sitze, Aktionen und Viewport-Grenzen abgesichert.
- **Test- und Distributionsstrategie**: Rollenbezogene Alpha-, Beta- und RC-Phasen sowie Feedback-Triage, Datenschutz und geeignete Zeitpunkte für breitere Projektvorstellungen dokumentiert.
- **Lokale Tester-Formulare**: Eigenständige HTML-Bögen für blinden NLHE-FR-Realismus, Neulings-Usability, UI-/Tischdesign und allgemeines Beta-Feedback mit Browser-Autosave, Textdatei-Export, Kopieren und optionalem Smartphone-Teilen ergänzt.

### Changed

- **Mobile Zielsetzung**: Die GitHub-Pages-Demo bleibt ein funktionaler, bewusst rudimentärer Smartphone-Fallback; die weitergehende mobile Bedienung wird im nativen Android-Prototyp entwickelt. Eine PWA ist nicht vorgesehen.
- **Android-Bedienung**: Setup und Tisch nutzen den verfügbaren Landscape-Bildschirm; die Actionbar fasst Hauptaktionen, Betrag, Schrittsteuerung und Slider in einer kompakten Zeile zusammen.
- **Kleine Viewports**: Layout-Modi werden per `matchMedia` aus Breite, Höhe und Ausrichtung bestimmt, sodass geeignete Tablets weiterhin das Desktop-Layout verwenden können.

### Fixed

- **Startskript**: Build und Electron-Start verwenden die definierten npm-Workspace-Skripte und brechen bei Fehlern zuverlässig ab.
- **Responsive Safety Pass**: Actionbar erhält im Phone-Landscape einen eigenen kompakten Bereich, Desktop und Tablet halten Abstand zum Hero-Seat und Portrait zeigt einen verständlichen Querformat-Hinweis.
- **Android-Vollbild**: Weißer Streifen am Kamera-Cutout entfernt und Safe Areas in den nativen Seitenrahmen übernommen.
- **Android-Setup und Tisch**: Zeilenumbruch von „Starting Amount“, zu kleine Hero-/Board-Karten und abgeschnittene Karten der oberen Sitze im Prototyp korrigiert.
- **Android-Geräteaufnahme**: Unlesbaren nativen Blind-Preset-Dialog durch eine vollständig sichtbare app-eigene Auswahl ersetzt, kompakte Statistik direkt über den Metadaten im Header verankert, direktes Touch-Peek gefoldeter Hero-Karten sowie spiegelbildliche Sicherheitsabstände für Dealer-Buttons bei Hero und gegenüberliegendem Bot korrigiert.
- **Android-Actionbar**: Hauptaktionen gleichmäßig aufgeteilt, Slider in einem vertikal zentrierten Rahmen mit grober Skala touch-tauglicher gestaltet und 3-BB/3×-, Pot- und Max-Presets dauerhaft links oberhalb der sichtbaren Actionbar angedockt; die freie Eingabe bleibt als bewusste Sekundäraktion erhalten.
- **Android-Export**: Im WebView nicht verlässlich nutzbare Hand- und Session-Exporte im Debug-Prototyp ausgeblendet.
- **Session-Startdealer**: Der erste Dealer sitzt nicht mehr in jeder Session fest links vom Hero, sondern wird über einen eigenen Zufallsstrom gewählt; gesetzte Session-Seeds bleiben reproduzierbar und folgende Hände rotieren regulär.

### Known limitations

- **Android-HandReplayer**: Die Replay-Funktion ist grundsätzlich vorhanden, Tisch und Bedienelemente wirken auf kleinen Displays jedoch noch zu klein und gequetscht. Die responsive Überarbeitung ist für den gemeinsamen UI-/Replayer-Pass vorgesehen.
- **Android-Distribution**: Es existiert ausschließlich ein lokaler Debug-Prototyp ohne Release-Signierung, Veröffentlichungsprozess oder zugesagte Gerätekompatibilität.

### Security

- **Server-Fail-Closed**: Unsicheren JWT-Default entfernt; der Prototyp startet nur noch mit einem mindestens 32 Byte langen Secret.
- **Lokale Angriffsfläche**: Standardbindung auf `127.0.0.1` begrenzt und History-/Statistik-Endpunkte mit Bearer-Authentifizierung geschützt.
- **Persistenz**: SQLite-Daten, WAL und SHM werden mit privaten Dateirechten erzeugt; Docker-Build-Kontext schließt lokale Secrets, Datenbanken und Arbeitsdateien aus.
- **QA-Zugangsdaten**: Feste Dummy-Passwörter durch pro Prozess generierte Zufallswerte ersetzt.
- **Rate Limits**: Registrierung und Login sowie authentifizierte History- und Statistik-Routen gegen automatisierten Missbrauch und ungebremste Abfragen begrenzt.
- **GitHub-Härtung**: Secret Scanning, Push Protection, Private Vulnerability Reporting, SHA-Pinning für Actions und Schutz von `master` gegen Löschen und Force-Push aktiviert.

## [0.7.6] — 2026-07-29

### Added

- **Replay-Archiv**: Die letzten 200 lokal gespeicherten Hände sind über die Tischoberfläche erreichbar.
- **Regressionstests**: Tests für PLO-Draws, Session-Statistiken, Replay-Sonderfälle, Mental Events, Pot-Limit-Aktionen und Debug-Exporte ergänzt.

### Changed

- **PLO-Persönlichkeiten**: Positionsabhängige Preflop-Bewertung sowie archetyp- und street-spezifische Score-Tabellen für TAG, Nit, LAG und Calling Station eingeführt.
- **PLO-Draw-Auswertung**: Outs werden über physische ungesehene Karten mit exakt zwei Hole Cards und drei Board Cards ermittelt; Wraps verwenden 8/13 Karten als Schwellen.
- **Opponent Reads**: Bots beobachten nun auch Aktionen anderer Bots und erfassen Aktionen nach dem eigenen Fold.
- **Rebuy-Determinismus**: Ersatz-Identity und Wartezeit verwenden den seedbaren Session-RNG.
- **Session-Replays**: Kein zusätzliches 50-Hand-Limit im Arbeitsspeicher; das persistente Archiv bleibt auf 200 Hände begrenzt.
- **PLO-Kalibrierung**: Deterministischer A/B-Lauf mit 10.000 Händen je Archetyp und Format dokumentiert; die physisch korrekte Draw-Auswertung bleibt trotz verschobener Zieltreffer unverändert.

### Fixed

- **PLO-Flush-Draws**: Ein Hole Card oder Runner-Runner-Möglichkeiten werden nicht mehr als direkter Flush Draw gemeldet; Nut- und Second-Nut-Draws berücksichtigen die tatsächlich verfügbaren Hole Cards.
- **PLO-Straight-Draws**: Omaha-Constraint, Wheel-Outs, bereits gemachte Straights und physische Out-Zählung korrigiert.
- **PLO-Zehnen**: `T` hatte in der Rangwert-Tabelle den Wert 0 und verfälschte Straight-Auswertungen.
- **Session-Statistiken**: VPIP/PFR/3-Bet werden einmal pro Spieler und Hand gezählt; 3-Bet-Gelegenheiten entstehen nur beim ersten Zug gegen genau einen Raise.
- **Replay/Export**: Dealer-Seat, Call-Beträge, Bet/Raise/All-in-Typen, laufende Stacks, Uncalled Bets sowie Split- und Side-Pot-Auszahlungen korrigiert.
- **Mental Events**: Foldende Bots werden anhand ihres eigenen Nettoverlusts statt des gesamten späteren Pots bewertet; Uncalled Bets werden abgezogen.
- **Pot-Limit-Tastaturaktion**: Das Pot-Maximum wird bei legalem Full Raise als `raise` statt als ungültiges `all-in` gesendet.
- **Archivnavigation**: Handnummern dürfen zwischen Sessions doppelt vorkommen, ohne dass die falsche Hand geöffnet wird.
- **Kartenreihenfolge**: `T` wird in Engine-Views korrekt zwischen Bube und Neun sortiert.
- **Session-Debugexport**: Omaha-Entscheidungen enthalten alle vier Hole Cards; kompakte Decision Snapshots sind ohne `any` typisiert.

## [0.7.5] — 2026-07-24

### Added

- **Hero-Bust-Handling**: `startHand()` versucht nach einem Bust alle 2 Sekunden erneut zu starten.
- **Setup-Formate**: Drei direkte Buttons für Heads-up, 6-max und Full Ring ersetzen den Bot-Slider.
- **Touch-Support**: Long-Press (600 ms) öffnet das Rebuy-Menü.

### Changed

- NLHE-Bedenkzeit von 1,8–4,5 s auf 1,2–3,0 s reduziert.
- Session-Stats per Toggle inline in die Kopfzeile verschoben; Bot-Daten bleiben hinter `Ctrl+D`.
- Karten, Action Buttons und Tischabstände für kleinere Displays skaliert.
- Short-Stack-Rebuy-Wahrscheinlichkeit erhöht, damit Bots nicht dauerhaft mit 0,5 BB weiterspielen.
- Formatname ersetzt die generische Spieleranzahl in der Kopfzeile.
- Setup-Label „Starting Chips“ in „Starting Amount“ geändert.

### Fixed

- **BB-Tracking**: Erste Hand wurde nicht gezählt (`heroPrevChips` startete als `null`), Rebuy verfälschte die Bilanz (wurde als Profit gezählt)
- **Runout-Spoiler**: Chips, `isSittingOut` und BB-Stats springen nicht mehr voreilig — warten auf `finishHandPresentation`
- **Replayer-Crash**: `step` out-of-bounds beim Hand-Wechsel (letzter Zug → vorherige Hand)
- **Hero-Rebuy**: `applyPendingRebuys` setzt jetzt `isSittingOut = false` — Hero blieb nach Rebuy auf "Sitting Out" hängen
- **Session-Log-Privacy**: "Dealt to"-Zeilen zeigen nur noch Hero-Karten, nicht Bot-Hole-Cards
- **Bot-Rebuy-Spoiler**: `savedState` wird jetzt VOR `processAutoRebuys` captured — rebuyter Stack nicht während Runout sichtbar
- **Omaha Split-Pot**: `findWinnerIndices` verglich nur Rank (1–9), ignorierte Kicker. Jetzt pokersolver-`Hand.winners()` für korrekten Vergleich
- **Actionbar-Overlap**: Bottom-Padding 130→260px, Table-Shell-Formel an neue Paddings angepasst (320→470)
- **Landscape-Phone**: Media Query `max-height: 450px` verhindert Scrollen, reduziert Paddings

## [0.7.4] — 2026-07-23

### Added

- **Session-Statistiken**: Live-VPIP/PFR/3-Bet für alle Spieler in einklappbarem Panel (📊)
- Session-Ergebnis in BB (grün/rot) und BB/100 in der Kopfleiste
- Session-Log-Export als PokerStars-Text (Download-Button im Stats-Panel)
- `session-stats.ts`: VPIP/PFR/3B-Tracking + BB/100-Berechnung + Session-Log-Generator
- `SessionStats.tsx`: einklappbare Komponente mit Spieler-Tabelle und Export

## [0.7.3] — 2026-07-23

### Changed

- **Personality-Tuning**: Aggression-Modifier `/4` → `/3.5` (LAG-Raise-Bonus +1.07),
  RiskTolerance-Call `/6` → `/8` (LAG-Call −0.75, Nit-Call +1.04)
- TAG PLO: VPIP 22.7% / PFR 15.3% / AF 2.89 / WTSD 34.1% — 6/6 in Range
- Nit PLO: WTSD 45→41% (Richtung stimmt, aber noch über Target)
- LAG PLO: AF 1.60→1.73 (Richtung stimmt, aber noch unter Target)
- CS PLO 6-max: VPIP 60.0% jetzt in Range (war 60.8%)

## [0.7.2] — 2026-07-23

### Changed

- **WTSD-Fix**: Postflop-Showdown-Rate durch variant-spezifische Category-Scores gesenkt
  - `CategoryScoreTable` in `bot-variant-evaluation.ts` definiert
  - `VariantEvaluation.categoryScores` → `DecisionContext.categoryScores` → `bot-action-scoring.ts`
  - NLHE: Scores identisch mit bisherigen `params.scoring.handStrength` (keine Regression)
  - PLO: `call.medium` 20→8, `call.weak` −5→−8, `call.marginal` 5→0 (WTSD 52%→36%)
  - TAG PLO 9-max: 6/6 Metriken im Soll, TAG PLO 6-max: 6/6

### Fixed

- **PLO Bot-Bedenkzeit**: 3–8s → 2–5.5s (Preflop war zu langsam)

## [0.7.1] — 2026-07-23

### Added

- **Omaha High**: vollständig spielbare Pot-Limit-Omaha-Variante
  - Variant-Selector im SetupScreen (No Limit Texas Hold'em / Pot Limit Omaha High)
  - Omaha-Hand-Evaluation: `evaluateOmahaHand` mit 60 2-aus-4+3-aus-5-Kombinationen
  - Engine-Support: 4 Hole Cards, Pot-Limit-Betting, `findWinnerIndices`-Dispatch
  - `omaha-hand-evaluation.ts`: Draw-Dichte (Flush-Draw, Wrap-Outs), Nut-Potential, Preflop-Assessment (Double-Suited, Connectedness)
- **Variant-spezifische Bot-Bedenkzeit**: NLHE 1.8–4.5s (max 12s), PLO 2–5.5s (max 20s)
- **Omaha-Kalibrierung**: 12 Archetyp-Formate, TAG FR VPIP 30.8% / PFR 14.8% / AF 2.89 / WTSD 33.4% (10k Hände)
- **Omaha-UI**: 4-Karten-Layout mit Overlap (−16px), CardBacks passen sich Variante an, Hole-Cards absteigend nach Rank sortiert (A→2)
- **Hand-History-Export**: variantenabhängiger Header ("Omaha Pot Limit" / "Hold'em No Limit")
- **PLO/NLHE-Badge** in der TableScreen-Kopfleiste
- `BettingStructure`-Typ in `betting.ts` ausgelagert, Variants in `variants/` pro Datei
- `formatVariantName()`-Helper, `holeCardCount`-Prop für PlayerSeat/Replay

### Changed

- **Type-System**: `[Card, Card]` → `Card[]` in 58 Stellen (shared, engine, client)
- **Aggression-Modifier**: `/5` → `/4` (LAG NLHE AF 1.45→1.91, TAG unverändert)
- **Bot-Bedenkzeit**: Min 900→1800ms, Max 1800→4500ms, Hard-Max 6000→12000ms (NLHE); PLO separat (s.o.)
- **Calling Station**: Persönlichkeits-Call-Boni bei dead air (kein Pair, keine Draws) auf 50% skaliert
- **Rebuy-Migration**: alte Identities ohne `rebuyPolicy` kriegen beim Laden eine archetyp-echte Policy (nicht mehr pauschal 40 BB)

### Fixed

- **Top Set (Rank 4) in Omaha**: war fälschlich "weak" → jetzt "good" (Lio checkte Top Set auf Q-high-Flop statt zu betten)
- **`detectFlushDanger`**: NLHE-Annahme "1 Hole Card = Flush-Redraw" → jetzt Omaha-aware (braucht 2 Karten derselben Farbe)
- **ActionButtons**: Pot-Limit-All-In-Bug — Button sendet nicht mehr `all-in` wenn `raise` legal ist
- **`weightedChoice`-Fallback**: `fold` nur noch wenn keine andere Aktion legal (vorher blind-fold bei allen negativen Scores)
- **Replay Pot-Anzeige**: Bet-Stacks akkumulierten zu viel (`totalBet` statt `amount`)
- **Export-Menü**: per Portal zu `document.body` gerendert (kein Verdecken durch Footer)
- **Debug-Mode im Replay**: `localStorage.replay-debug` für IPC-Fenster
- **Hand-History-Header**: "PokerStars" → "CPCdigital"

## [0.7.0] — 2026-07-22

### Added

- **Postflop-Kalibrierung**: 5 neue Metriken in `simulation.ts` (C-Bet%, Fold-to-CBet, AF, WTSD, W$SD)
- **C-Bet-Targets**: pro Archetyp und Format (TAG 35-55%, Nit 33-55%, LAG 42-70%, CS 25-45%)
- **PFA-Tracking**: Preflop-Aggressor wird erkannt und C-Bet-Chancen pro Position gezählt
- **`hand.strength`**: numerischer Handstärkewert 0-100 mit Draw-Quality-Bonus (bis +10)
- **Hybrid-Scoring**: Strength-Bonus (±5-10) zusätzlich zum Kategorie-System
- **Bluff-C-Bet-Bonus**: +15 für PFA mit Air auf trockenem Board
- **Session-Evaluator C-Bet-Patterns**: "PFA missed C-Bet", "Folded playable hand to C-Bet"

### Changed

- **C-Bet-Opportunity-Bonus**: von +12 auf +18 erhöht
- **Check-Basiswerte gesenkt**: air +20→+10, weak +20→+10, marginal +15→+8, medium +10→+5
- **Min-Reaktionszeit Bots**: 600ms → 900ms

### Fixed

- **"Free card for draw"-Bug**: Bonus galt fälschlich auch für PFA am Flop (widerspricht C-Bet-Logik)
- **PFA-Check-Penalty**: −30 für Air/Weak am Flop (nicht für Good+)
- **C-Bet% von 20% auf 47-60% angehoben** (TAG 6-max: 20% → 52%)
- **"You wins" → "You win"** in der Ergebnisanzeige

## [0.6.0] — 2026-07-22

### Added

- **Rebuy-System**: Auto-Rebuy bei Bust (pro Identity ausgewürfelt, Threshold 10–90 BB), Leave-on-Bust, Ersatz-Bots mit 2–6 Händen Pause
- **Setup-Toggle**: "Auto-Rebuy & Ersatz-Bots" in der Setup-Maske
- **Hand-Replay**: deterministisches Replay aus Decision Snapshots, Tisch-Ansicht mit Step-Forward/Back, Autoplay
- **Session-Navigation**: alle Hände der Session durchblätterbar (◀▶)
- **PokerStars-Style Hand-History**: Text-Export pro Hand und ganze Session
- **Pot-Filter**: Replay nach Minimum-Pot-Größe filtern (≥ X BB)
- **Session-übergreifende History**: localStorage, max 200 Hände
- **Bot-Entscheidungsgründe**: Scores und Beiträge als Export-Option (debug-only)
- **7-Stufen-Handbewertung**: premium > strong > good > medium > marginal > weak > air mit Board-Kontext
- **Board-Relativierung**: Top Pair ≠ Bottom Pair, Flush/Straight/Full House je nach Board-Gefahr abgestuft
- **Protection-Betting**: Board-Verschlechterungserkennung (Turn bringt drittes Herz → sizing +0.08, scoring +8)
- **Parameter-System**: `bot-params.ts` zentralisiert ~50 tuning-Knobs, Auto-Kalibrierer via Env-Vars
- **Auto-Kalibrierer**: Random-Search-Optimizer mit Loss-Funktion, progressive narrowing
- **Rebuy-Manager**: `bot-rebuy-manager.ts` aus `LocalGameRunner` extrahiert (907 → 241 Zeilen)
- **Session-Ordner**: `session/` für LocalGameRunner, Rebuy-Manager, Session-Evaluator, Hand-Replay

### Changed

- **ReadTyp**: Bots tracken Gegner-Bet-Sizing (Pot-Fraktion-EMA), Abweichungserkennung (>2× Overbet)
- **Raise-Sizing**: Short-Stack-Reduktion (effBb/50), Reraise-Faktor (×0.75), Non-Premium-Raises bei ≤20 BB bestraft
- **Preflop-Reraising**: keine Blind-Eskalation mit marginalen Händen mehr (−35 Penalty)
- **Scoring-Tuning**: call.weak −5, fold.weak +5 (7-Kategorien-System nachgezogen), float-flop-Habit +10→+7
- **Pot-Visualisierung**: Gewinnbetrag erscheint beim Gewinner, Pot springt auf 0
- **Debug-Mode**: BotDebugInspector, Cards-on, Entscheidungs-Export hinter Ctrl+D
- **Route aufräumen**: v0.6 → 19 Punkte (besser verteilt auf v0.5.2–v0.5.4 in Retrospektive)

### Fixed

- **Queue-Reihenfolge**: `reopenBettingAfterRaise` sortiert jetzt clockwise ab Raiser (war Sitz-Index)
- **Hand-History-Format**: Blinds korrekt (via Dealer-Position), Chips ohne /100-Division, Raise-Format "raises to X"
- **All-in-Crash**: Spiel friert nicht mehr wenn nur noch Hero übrig ist (forced replacement)
- **Rebuy-Crash**: fehlendes `rebuyPolicy`-Feld in alten Roster-Identities → Default-Policy-Fallback
- **Replay-Daten**: alle Hole-Cards gespeichert (nicht nur Showdown), Community-Cards kumulieren korrekt

## [0.5.1] — 2026-07-22 (unveröffentlicht, direkt in 0.6.0 aufgegangen)

## [0.4.0] — 2026-07-20

### Added

- Maniac als seltene extreme LAG-Ausprägung (20% der LAG-Identities, +15 auf Aggression/VPIP)
- 12 Habits mit archetyp-spezifischen Präferenzen und Consistency 55–90%
- persistenter lokaler Bot-Roster über localStorage mit wiederkehrenden Identities
- archetyp-spezifische Tilt-Reaktionen (LAG kippt schneller, Nit erholt sich zügiger)
- gewichtete Beobachtungsfähigkeit pro Archetyp (Nit merkt Folds, LAG sieht Aggression)
- Reads mit Stichprobengröße, Konfidenz und verzerrten Priors (Beta-Distribution)
- überhastete Reads: LAG/CS handeln ab 2 Samples, bei Tilt ab 1
- Roster auf 44 Identities erweitert (12 neue für 0.4, Ziel 100+ bis v1.0)
- Session-Debug-Export v2 mit inkrementeller Action-History und dedupliziertem Context
- Mixed-Table-Kalibrierung über alle Archetypen mit BB/100, W$SD und Aggression/Street
- Balance-Simulation mit 7 randomisierten Tischzusammensetzungen

### Changed

- `BotIdentity` um `maniac`-Flag und gefüllte `habitIds` erweitert
- `DecisionContext` um `botHabits` ergänzt, Habits fließen in Action-Scoring ein
- Mentale-Event-Multiplier pro Archetyp eingeführt (LAG 1.3×, CS 0.5×)
- Tilt-/Confidence-/Patience-Modifier pro Archetyp statt uniform
- Session-Bot-Auswahl von strikt balanced auf gewichtete Zufallsverteilung
- `scoreCheck`/`scoreCall`: Trap-Intent nur noch Pre-River oder out-of-Position
- River-Check mit starker Hand erhält −20 Malus in Position
- `slowplay-monsters`-Habit feuert nur noch bei `nuts`, nicht bei `strong`
- Debug-Export auf letzte 5 Hände begrenzt, Contributions zu Strings geflattet
- Versionierung in package.json, README und CHANGELOG auf 0.4.0

### Fixed

- TAG 3-bet Full Ring wieder im Kalibrierungsbereich (12.7% von 13.0%)
- Top-Pair auf River wird nicht mehr fälschlich als Slowplay klassifiziert

## [0.3.1] — 2026-07-19

### Added

- sichtbare Versionsnummer in der App
- Auswahl zwischen Dollar- und Eurodarstellung
- typische Blind-Presets mit automatischem 100-BB-Startstack
- einfacher Rechtsklick-Rebuy auf den konfigurierten Startstack zwischen Händen
- zeitversetztes Aufdecken von Flop, Turn und River bei All-in-Runouts
- zusätzliche Tests für Runout, Sessionverlauf und Betragsformatierung

### Changed

- Aktionsbutton wechselt nun passend zwischen Bet, Raise und All-in
- individuelle Bet- und Raisebeträge lassen sich per Enter bestätigen
- Geldbeträge vermeiden unnötige Dezimalstellen und berücksichtigen die gewählte Währung
- Setup und Tischdarstellung wurden für den Testbetrieb weiter verbessert
- Roadmap um Bot-Identitäten, Sessionanpassungen, Statistiken und spätere Table Rules erweitert

## [0.3.0] — 2026-07-19

### Added

- allgemeiner `BotContext` ohne versteckte Informationen
- Utility Scores und nachvollziehbare Einflussfaktoren für alle legalen Aktionen
- Wahrnehmungs- und Bewertungsungenauigkeit abhängig vom Bot-Skill
- getrennte Zustände für Personality, Mental State, Reads und Session Memory
- gewichtete Auswahl zwischen plausiblen Aktionen
- situationsabhängige Bot-Reaktionszeiten
- Debug Inspector für Kontext, Bewertungen und Entscheidungsgründe
- Variant Registry und getrennte NLHE-Handbewertung als Grundlage weiterer Pokervarianten
- umfangreiche Szenariotests für Botkontext, Pipeline, Skill, Timing und Entscheidungssensitivität

### Changed

- Botentscheidungen berücksichtigen Betgröße, Pot Odds, effektiven Stack und SPR
- bisherige TAG-Logik in eine allgemeine, erklärbare Decision Pipeline überführt
- zufällige Fehler durch nachvollziehbare Wahrnehmungs- und Bewertungsabweichungen ersetzt

## [0.2.1] — 2026-07-19

### Added

- komfortablere Betgrößensteuerung mit Presets, Schieberegler und manueller Eingabe
- zusätzliche Tests für Positionslogik und Betragsformatierung

### Changed

- Setup-Maske, Tischskalierung, Hole Cards und Community Cards für bessere Lesbarkeit überarbeitet
- Raise-Presets an vorausgegangene Raises angepasst
- Darstellung kleiner Blinds und nicht notwendiger Dezimalstellen korrigiert
- Action Panel und Tastaturbedienung stabilisiert

## [0.2.0] — 2026-07-18

### Added

- vollständig lokale Electron-Laufzeit ohne erforderlichen Server
- Engine-bestimmte Legal Actions und vollständiger Betting Context
- korrekte Min-Raise-, All-in-, Reopen-, Side-Pot- und Split-Pot-Logik
- strukturierte Action History als Events
- deterministische Hand-Replays und seedbarer Zufallszahlengenerator
- Decision Snapshots für jeden Spielerzug
- Trennung öffentlicher und privater Spielinformationen
- variantenneutrale Phasen- und Betting-Struktur
- umfassende Unit- und Integrationstests für zentrale Engine-Sonderfälle
- erste lokale NLHE-Bot-Pipeline und Testsimulationen

### Changed

- Projektfokus verbindlich auf Offline-First und Singleplayer bis v1.0 ausgerichtet
- Client in Setup, Tisch, Actions, Karten und lokale Spielsteuerung aufgeteilt

[Unreleased]: https://github.com/kaizo101/CPCdigital/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/kaizo101/CPCdigital/compare/v0.7.9...v0.8.0
[0.7.9]: https://github.com/kaizo101/CPCdigital/compare/v0.7.8...v0.7.9
[0.7.8]: https://github.com/kaizo101/CPCdigital/compare/v0.7.7...v0.7.8
[0.7.7]: https://github.com/kaizo101/CPCdigital/compare/v0.7.6...v0.7.7
[0.7.6]: https://github.com/kaizo101/CPCdigital/compare/v0.7.5...v0.7.6
[0.7.5]: https://github.com/kaizo101/CPCdigital/compare/v0.7.4...v0.7.5
[0.7.4]: https://github.com/kaizo101/CPCdigital/compare/v0.7.3...v0.7.4
[0.7.3]: https://github.com/kaizo101/CPCdigital/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/kaizo101/CPCdigital/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/kaizo101/CPCdigital/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/kaizo101/CPCdigital/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kaizo101/CPCdigital/compare/v0.4.0...v0.6.0
[0.4.0]: https://github.com/kaizo101/CPCdigital/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/kaizo101/CPCdigital/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kaizo101/CPCdigital/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kaizo101/CPCdigital/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kaizo101/CPCdigital/releases/tag/v0.2.0
