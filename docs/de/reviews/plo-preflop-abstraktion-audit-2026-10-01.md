# Audit: PLO4-Preflop-Handabstraktion

> Englische Fassung: [Audit: PLO4 Preflop Hand Abstraction](../../en/reviews/plo-preflop-abstraction-audit-2026-10-01.md)

Stand: 01.10.2026 · **Baseline-Audit und begrenzter PLO4-Preflop-Pilot; keine Freigabe als kalibrierte Strategie**

Die Kalibrierungszahlen unten gehören zum jeweiligen Pilotstand. Nach den
späteren Postflop-Folgefixes meldet der kombinierte 300-Hand-Vergleich
einen formalen Driftfehler; der aktuelle Stand ist im
[PLO-Postflop-Nachtrag](plo-postflop-session-2026-10-01.md) dokumentiert.

## Frage und Grenze

Ist die aktuelle Einteilung der 270.725 möglichen PLO4-Starthände fein genug,
damit die Bots unterschiedliche *Gründe* für eine spielbare Hand erkennen?
Das Audit bewertet die Repräsentation, nicht die optimale Aktion einer
einzelnen Hand. Gleiche Kategorien beweisen allein keinen Fehlspielzug;
unterschiedliche Kategorien beweisen noch keine gute Strategie. NLHE-Befunde,
PLO5, Omaha Hi-Lo und fremde Solver-Frequenzen werden nicht auf PLO4 High
übertragen.

## Quellen und zulässige Schlussfolgerung

- **L7:** Li/Huang, [*Abstraction Agent*, arXiv:2609.04303v1](https://arxiv.org/html/2609.04303v1),
  Abschnitt 5 „Cross-game settings“, Abschnitt 6 „Cross-game portability“,
  Anhänge A/B/E/H. Die Autoren reduzieren 270.725 PLO4-Rohhände über
  Suit-Isomorphie auf 16.432 Repräsentanten und gruppieren diese anhand
  mehrerer Merkmale in 30 Cluster. Anhang E nennt Paar-/Rangstärke,
  Suit-/Flush-Potenzial, Straight-Konnektivität, Vier-Karten-Koordination
  und Nut-Potenzial. **Grenze:** In PLO wird nur die Plausibilität der
  Merkmale/Cluster inspiziert, keine Exploitability oder menschliche
  Entscheidungsgüte gemessen. Die quantitativen Verbesserungen des Papers
  stammen aus NLHE-Turn-Endgames und einem anderen Spiel. Weder „30“ noch
  LLM-generierte Scores sind für CPCdigital validiert.
- **P1 (Praxisquelle):** Upswing Poker,
  [*Pot Limit Omaha Preflop Guide: Raising First In*](https://upswingpoker.com/wp-content/uploads/2020/04/PLO-Preflop-Guide-RFI-v4-UpswingPoker.pdf),
  PDF-S. 3–6. Der Guide trennt Handklassen, Double-/Single-Suited/Rainbow,
  Gap-Klassen und Position; laut S. 4 wurden die RFI-Ranges mit Monker
  Solver und einer bestimmten Rake-Struktur abgeleitet. **Grenze:** nur
  Raising-first-in, keine menschliche Stichprobe, keine Vorlage für
  Calling-/3-Bet-Frequenzen, Archetypen oder unsere Stakes.

**Unsere Ableitung:** Diese Quellen rechtfertigen einen Test, ob die
Handmerkmale im Bot getrennt *vorliegen und bei Bedarf genutzt werden
können*. Sie rechtfertigen keine direkte Solver-Policy und keinen
Sollkorridor. Ein menschlich wirkender Bot muss auf eine je nach Skill
begrenzte eigene Einschätzung reagieren; er soll nicht zuerst optimal
entscheiden und anschließend zufällig „Fehler“ einbauen.

## Aktueller Datenfluss im Code

1. `packages/client/src/omaha-hand-evaluation.ts` (`preflopAssess`) bildet
   Paare, High Cards, Suit-Form, Konnektivität und Danglers auf **eine**
   `strength`-Zahl ab. Formatabhängige Schwellen machen daraus einen von sechs
   Buckets (`weak` bis `premium`). Weitere Felder wie `drawQuality` und
   `nutPotential` werden berechnet, aber das Preflop-`nutPotential` ist nur
   `strong` oder `medium`; `drawTypes` bleiben leer.
2. `packages/client/src/bot-category-scores.ts` (`getPloPreflopAction`)
   ordnet Archetyp, grober Situation (`unopened`, `facing-open`,
   `facing-3bet`), Bucket und Tischformat einer Präferenz zu. Die Funktion
   bekommt weder die vier Karten noch exakte Position, Stacktiefe oder die
   einzelnen Strukturmerkmale. Andere Teile der Bot-Pipeline berücksichtigen
   Position und Risiko zusätzlich; **die Tabelle ist nicht die ganze
   Entscheidung**.
3. Tests in `omaha-hand-evaluation.test.ts` decken ausgewählte Suit- und
   Kategoriebeispiele ab; neu hinzugekommen sind relationale Tests für
   Suit-Isomorphie, Nut- gegen K-hohen Suit und Rundown gegen Dangler.
   `bot-category-scores.test.ts` prüft einzelne Tabellenzellen. Der unten
   beschriebene vollständige Kontrastlauf bleibt bewusst **diagnostisch**:
   gleiche Aktionswahl verschiedener Hände ist ohne begründete
   Sollentscheidung noch kein automatischer Testfehler.

## Reproduzierter Stichprobenabgleich

Direkt über `omahaVariantEvaluator.evaluate()` und
`getPloPreflopAction()` ermittelt; PLO4, 6-max, TAG, ohne Reads oder
Persönlichkeit. Die Präferenz ist **nicht** die endgültige Botaktion.

| Starthand | Stärke | Bucket | `nutPotential` / `drawQuality` | Unopened / Facing Open / Facing 3-Bet |
|---|---:|---|---|---|
| A♠ A♥ 7♦ 2♣ (AA mit schwachen Sidecards, rainbow) | 47 | good | strong / 1 | raise / call / call |
| K♠ Q♥ J♦ T♣ (hoher Rundown, rainbow) | 47 | good | strong / 3 | raise / call / call |
| T♠ 9♥ 8♦ 7♣ (mittlerer Rundown, rainbow) | 36 | good | strong / 3 | raise / call / call |
| A♠ A♥ A♦ 2♣ (drei Asse in der Hand) | 41 | good | strong / 1 | raise / call / call |
| A♠ K♠ Q♥ J♥ (hoher Rundown, double-suited) | 71 | strong | strong / 5 | raise / raise / call |
| A♠ 2♠ 3♥ 4♥ (Wheel-Rundown, double-suited) | 59 | strong | strong / 5 | raise / raise / call |

Das erste Paar ist der klare **Repräsentationskonflikt**: exakt gleicher
Hauptscore und Tabellenpfad trotz Paarstärke gegen Vier-Karten-
Konnektivität. Die anderen Zeilen zeigen, dass selbst ein unterschiedlicher
Score innerhalb eines Buckets dieselbe Tabellenpräferenz erhält. Bei
`AAA2` ist das grobe `nutPotential: strong` allein wegen mindestens zwei
Assen ein Prüfpunkt; es ist noch kein Beleg, dass jede spätere Aktion falsch
ist. Ebenso ist `A234` gegen `AKQJ` keine behauptete eindeutige Rangordnung:
Nut- und Domination-Risiko hängen vom Kontext ab.

## Vollständige Pipeline: kontrollierte Gegenprobe

Nach dem Tabellenabgleich läuft nun ein reproduzierbarer Vergleich durch
`createBotContext()` → Variantenbewertung → `decideBotDecision()` mit
Skill-Wahrnehmung, allen Aktionsscores, Persönlichkeitsmodifikatoren,
gewichteter Auswahl und Legalisierung. Das [Diagnoseskript](../../../scripts/plo-preflop-contrast.ts)
verwendet von `PokerGame` erzeugte **legale PLO4-Preflop-Zustände** mit
öffentlicher Aktionsgeschichte. Nur die vier *eigenen* Karten werden als
kontrollierte Gegenfaktoren ersetzt; die versteckten Gegnerkarten werden
nicht ausgewertet. Dadurch ist es ein Entscheidungs-, kein vollständiger
Handverlaufstest. Aufruf:

```sh
node --import tsx scripts/plo-preflop-contrast.ts
node --import tsx scripts/plo-preflop-contrast.ts --jsonl
node --import tsx scripts/plo-preflop-contrast.ts --format=full-ring --seed=a
node --import tsx scripts/plo-preflop-contrast.ts --format=heads-up --seed=b
```

Die Matrix deckt vier Archetypen, Skill 20/50/100, 40/100 BB und fünf
Situationen ab: UTG/BTN unopened, BTN/BB gegen UTG-Open und UTG nach
eigenem Open gegen CO-3-Bet. Je Kontrastpaar sind das **120 gleiche
öffentliche Kontexte**; insgesamt 2.400 Entscheidungen für 20 Hände.
Traits, Game-Seeds und Decision-Seed sind fest. Die angegebene Einzelaktion
ist deshalb **keine Aktionsfrequenz**.

| Kontrastpaar (je 120 Kontexte) | Unterschiedliche Aktionsvektoren¹ | Anderer Aktionstyp | Anderer Aktionstyp **oder** Raise-Betrag |
|---|---:|---:|---:|
| `AA72r` / `KQJTr` | **0** | **0** | **0** |
| `AA72r` / `AA72ssNut` | 120 | 46 | 84 |
| `AA72ssNut` / `AA72ssLow` | 36 | **0** | **0** |
| `AA72ssNut` / `AA72ds` | 120 | 6 | 6 |
| `AA72r` / `AAA2r` | 120 | 2 | 2 |
| `AKQJr` / `AKQJssNut` | 120 | 42 | 82 |
| `AKQJssNut` / `AKQJssKing` | 120 | **0** | **0** |
| `AKQJssNut` / `AKQJds` | 114 | 6 | 6 |
| `AKQJds` / `AKQJdsIso` | **0** | **0** | **0** |
| `AKQJssNut` / `AKQJtriple` | 120 | 0 | 0 |
| `AKQJtriple` / `AKQJmono` | 120 | 40 | 82 |
| `AKQJds` / `AKQ2ds` | 120 | 6 | 6 |
| `KQJTr` / `KQJ2r` | 120 | 64 | 70 |
| `AKQJds` / `A234ds` | 120 | 6 | 6 |
| `AA72r` / `AAJJds` | 120 | 58 | 110 |
| `A732r` / `K832mono` | 120 | 2 | 2 |

¹ Aktionsvektor = Utilities, Intents, Auswahlzulässigkeit und angebotene
Raise-Größe. `ssNut` bedeutet Single-Suited mit A-hohem Suit, `ssLow`
Single-Suited mit 7-hohem Suit, `ssKing` Single-Suited mit K-hohem Suit.
`AKQJdsIso` ist lediglich eine Umbenennung der Suits von `AKQJds`.
Der Katalog mit **exakten Karten** steht im Diagnoseskript.

Die neuen Paare trennen die Ursachen: Der Wechsel Rainbow → Single-Suited
ändert bei `AA72` und `AKQJ` häufig auch den Aktionstyp; das jetzige Modell
erkennt also grobe Suit-Struktur. Bei **gleichen Rängen und derselben
Single-Suited-Form** bleibt die Auswahl dagegen in allen 120 Kontexten
gleich, ob der Suit A-hoch oder niedriger ist (`AA72`, `AKQJ`). Der Score
unterscheidet diese Fälle teilweise (z. B. `AA72ssNut` Stärke 59 gegen
`AA72ssLow` 55), aber nicht durchgängig die Aktion. Der Suit-isomorphe
Kontrollfall ist erwartungsgemäß in allen 120 Kontexten identisch.
Ein klarer Rundown-vs.-Dangler-Kontrast (`KQJT` gegen `KQJ2` rainbow)
ändert den Aktionstyp 64-mal; innerhalb des Buckets `strong` unterscheidet
`AKQJ` gegen `AKQ2` double-suited den Aktionstyp nur sechsmal.
**Keiner dieser Zähler ist eine Poker-Sollfrequenz.**

### Format- und Seed-Gegenprobe

Das Skript wurde zusätzlich in Full Ring und Heads-up mit den Seeds
`base`, `a` und `b` ausgeführt. Full Ring hat dieselben fünf kontrollierten
Situationen wie 6-max (120 Vergleiche pro Handpaar und Seed); Heads-up
hat Button-Open, Big-Blind-Defense und Button gegen 3-Bet (72 Vergleiche).

| Kontrastpaar | 6-max: anderer Aktionstyp, Seeds base/a/b | Full Ring: anderer Aktionstyp, Seeds base/a/b | Heads-up: anderer Aktionstyp, Seeds base/a/b |
|---|---|---|---|
| `AA72r` / `KQJTr` | **0/0/0 von 120** | **0/0/0 von 120** | **0/0/0 von 72** |
| `AA72ssNut` / `AA72ssLow` | 0/0/2 von 120 | 0/0/2 von 120 | 4/6/2 von 72 |
| `AKQJssNut` / `AKQJssKing` | 0/2/2 von 120 | 0/2/2 von 120 | 0/0/0 von 72 |
| `AKQJds` / `AKQJdsIso` | **0/0/0 von 120** | **0/0/0 von 120** | **0/0/0 von 72** |

Damit bleibt die **vollständige Gleichbewertung `AA72r`/`KQJTr`** in
936 gepaarten Format-/Seed-Kontexten bestehen. Die Nut-Suit-Kontraste
wirken auf Scores, aber nur vereinzelt auf den Aktionstyp; die exakten
Zähler sind seed- und formatabhängig. Das ist weder eine statistische
Schätzung der Botfrequenz noch ein Beweis für eine optimale Rangfolge.
Die Suit-Isomorphie-Kontrolle bleibt stabil.

Beispiel TAG, Skill 100, 100 BB: `AA72r` und `KQJTr` haben UTG unopened
jeweils Fold/Call/Raise-Utility **7,12 / 27,44 / 70,39** und raisen auf
0,06; am Button unopened **7,12 / 27,44 / 85,39** und raisen auf 0,05.
Gegen UTG-Open am Button liegen die Werte bei **14,12 / 43,44 / 51,39**
mit Raise auf 0,14; im Big Blind gegen dasselbe Open bei
**3,66 / 53,90 / 45,39** mit Call. Gegen eine 3-Bet nach eigenem UTG-Open
liegen sie bei **12,60 / 53,96 / 28,39** mit Call. Die Position/Action
verändert also den Gesamtscore, aber **nicht den Unterschied zwischen
diesen beiden Handstrukturen**. Bei Skill 20 und 50 sowie den anderen
Archetypen/Stacktiefen bleibt die Paar-Gleichheit erhalten.

Das ist ein **nachgewiesener Informationsverlust**, keine Aussage, ob
`AA72r` in einem dieser Spots zwingend gefoldet und `KQJTr` geraist
werden müsste. Die Quelle L7 misst in PLO keine Aktionsgüte. Ohne
PLO-spezifische Referenz und Gegenbeispiele wäre eine harte
Handrangfolge oder neue Frequenz unzulässig.

## Präzise Lücken der Baseline

| Befund | Warum relevant | Was vor einem Fix offen ist |
|---|---|---|
| Mehrere Qualitätsdimensionen kollabieren vor der Preflop-Tabelle in einen Bucket. | Gleichwertige Gesamtpunkte können andere Spielbarkeit und Nut-Potenziale verbergen. | Prüfen, an welchen Situationen der Unterschied tatsächlich eine andere oder nur eine anders gewichtete Aktion rechtfertigt. |
| `nutPotential` ist preflop fast binär; `drawQuality` zählt im Wesentlichen nutzbare Suits und benachbarte Rangpaare. | Das erklärt etwa `AAA2` und `AA72` nur grob und trennt High-/Low-Rundowns nicht zuverlässig nach dominierbarem Potenzial. | Featuredefinitionen mit exakt-zwei-Hole-Card-Regel und geeigneten Gegenbeispielen validieren; keine unkalibrierten „Nut“-Labels als Wahrheit ausgeben. |
| Die Preflop-Tabelle kennt Tischformat, aber nicht konkrete Position, effektiven Stack oder exakte vorherige Linie. | Ein RFI aus früher Position und vom Button hat denselben Kategoriepfad; downstream existieren allerdings weitere Kontextfaktoren. | Gesamten Decision-Score mit kontrollierten Position-/Stack-/Action-Paaren prüfen, bevor die Tabelle erweitert wird. |
| Die ausgewertete PLO-Paperquelle validiert Cluster nicht quantitativ für PLO. | Eine Übernahme der 30 Cluster wäre unbegründete Komplexität. | Eigene Interpretierbarkeit, paarweise Trennschärfe, deterministische Stabilität und Spielwirkung testen. |

## Designoption zur Freigabe: erklärbare PLO4-Merkmale

**Status zum Zeitpunkt des Baseline-Audits: Vorschlag.** Der begrenzte Pilot
ist unten getrennt dokumentiert. L7 motiviert mehrere getrennte
Dimensionen; die folgenden konkreten Datenfelder und Schritte sind **unsere
Ableitung**, keine direkt aus dem Paper übernommenen Formeln oder
Aktionsfrequenzen.

1. Eine reine, PLO4-spezifische Merkmalsfunktion beschreibt die vier Karten
   ohne Gegnerwissen oder Solver-Lookup: `pairStructure` (Paarhöhe, zweite
   Paarung, Trips/Quads, Sidecard-Synergie), `suitStructure` (Rainbow,
   Single-/Double-/Triple-Suited, Monotone und Höhe der tatsächlich nutzbaren
   zwei gleichfarbigen Hole Cards), `straightStructure` (verschiedene
   Rangfenster, Gaps und oberes Straight-Ende), `coordination` (wie viele
   der vier Karten an gemeinsam spielbaren Zweierkombinationen beteiligt
   sind) sowie vorsichtig benanntes `nutMakingPotential`. Letzteres ist
   **keine berechnete Nut-Wahrscheinlichkeit** und darf nicht als solche im
   Debug-Report erscheinen. Alle Suit-/Straight-Regeln müssen die
   exakt-zwei-Hole-Cards-Vorgabe respektieren; drei/vier Karten desselben
   Suits sind nicht zwei/drei unabhängige Flush-Chancen.
2. Die objektiven Merkmale werden getrennt von einer *wahrgenommenen*
   Version gehalten. Sichtbare Karten bleiben für jeden Bot sichtbar;
   Skill begrenzt die Interpretation ihrer Zusammenhänge, nicht die
   Information selbst. Ein niedrig geskillter Bot darf z. B. AA oder „zwei
   Suits“ erkennen und dennoch koordinierte Sidecards oder Domination-Risiko
   falsch einschätzen. Archetyp und Mental-Zustand sind separate Achsen.
   Vor konkreten Skill-Schwellen wird geprüft, ob der bestehende
   `analysisSkillWeight`-Mechanismus passt; jede neu gesetzte Schwelle muss
   an/unter/über dem Grenzwert und bei Skill 100 getestet werden, ohne
   unbeabsichtigten Sprung.
3. Die bestehende Kategorie kann vorerst als grobe Baseline erhalten bleiben.
   Erst die *wahrgenommenen* Merkmale dürfen später kleine,
   situationsabhängige PLO-Preflop-Faktoren beeinflussen: Position,
   Open/3-Bet, effektiver Stack und Spielerzahl bestimmen, **welches**
   Merkmal relevant ist. Damit wird weder eine globale Handrangliste noch
   eine Solver-RFI-Frequenz direkt in Entscheidungen übersetzt.
   Variantenneutrale Datenstrukturen werden nicht mit NLHE-fremden
   PLO-Feldern überladen; der PLO-Teil bleibt in einem eigenen Modul/Profil.

**Akzeptanz vor einer Score-Anbindung:** Suit-isomorphe Hände liefern dieselben
Merkmale und Decision Scores; `AA72r` und `KQJTr` liefern unterscheidbare
Strukturprofile; A-hohes gegen niedriges Suit-Potenzial ist im Profil
sichtbar, selbst wenn ein niedriger Skill es strategisch kaum nutzt. In
mindestens einem begründeten, identischen High-Skill-Kontext muss der
`AA72`/`KQJT`-Kontrast auch im *Decision Score* erkennbar werden — ohne
vorzugeben, dass immer verschiedene Aktionen gewählt werden müssen.
Exakte PLO-Regeln, legaler Aktionsraum und Suit-Isomorphie bleiben
Invarianten. Danach erst A/B gegen unveränderte Seeds, alle Formate/
Archetypen, Kalibrierungsrohwerte und eine manuelle Plausibilitätsprobe.
Numerische Gewichte und Schwellen gehören in einen separaten
Änderungsvorschlag mit Gegenbeispielen, nicht still in diesen Audit.

## Historischer Änderungsplan des Baseline-Audits

1. **Erledigt für den Diagnosekatalog:** Neben AA mit/ohne koordinierte
   Sidecards, hohen/mittleren/Wheel-Rundowns, Trips und Monotone sind jetzt
   Paare mit identischen Rängen und verschiedenen Suit-Formen, Nut- gegen
   Non-Nut-Suit, Suit-Isomorphie und kontrollierten Danglers enthalten.
2. **Erledigt für alle drei Formate:** Vollständige Pipeline mit
   frühen/späten/Blind-Positionen, 40/100 BB, passenden Preflop-Situationen,
   vier Archetypen, drei Skillwerten und drei Seeds verglichen. Vor einem
   Strategieeingriff noch Grenzwerte der *neu vorgeschlagenen* Merkmale
   und deren konkrete Gegenbeispiele festlegen. Gleiches Ergebnis ist
   Diagnose, kein automatischer Testfehler.
3. **Damals vorgeschlagen; Pilotstand unten:** Der Merkmalsvektor und seine
   Wahrnehmungs-/Score-Grenze stehen oben. Vor Implementierung Gegenbeispiele
   und messbare Akzeptanzkriterien für einzelne situationsabhängige Effekte
   freigeben; keine Clusterzahl aus L7 oder Solver-Frequenz kopieren.
4. Änderungen danach mit gezielten Grenz-/Relations- und Seedtests sowie
   Kalibrierung und manueller Plausibilitätsprobe evaluieren. Bestehende
   korrekte Formate/Archetypen gegenprüfen; Zielkorridore bleiben Leitplanken.

**Nicht Teil dieses Audits:** Reparatur anderer Action-Intent- oder
Postflop-Befunde. Solche Änderungen benötigen einen eigenen Test- und
Änderungsbericht, damit ihre Wirkung nicht mit der Preflop-Abstraktion
vermischt wird.

## Begrenzter Implementierungspilot (01.10.2026)

Der Pilot behält `strength`, Kategorie und Archetyp-Preflop-Tabelle unverändert.
`plo-preflop-features.ts` liefert zusätzlich ein PLO4-spezifisches Profil:
höchste Paarhöhe, Zahl verschiedener Ränge, Suit-Form, höchste Karte pro
**tatsächlich nutzbarem** Suit (mindestens zwei Hole Cards), A-hohe nutzbare
Suits und das Kennzeichen „vier verschiedene Ränge in einem Fünfer-
Straight-Fenster“. Das ist weder Equity noch eine Nut-Wahrscheinlichkeit.
Die Profilfelder sind absichtlich getrennt, nicht ein neuer globaler Score.

Nur zwei interpretierte Merkmale erreichen bisher die Aktionsscores:
Vier-Karten-Koordination und A-hoher nutzbarer Suit. `bot-skill-perception.ts`
blendet ihre *Interpretation* stetig ein: Koordination bis einschließlich
Skill 40 mit Gewicht 0, bei Skill 100 mit 1; Nut-Suit bis einschließlich
Skill 50 mit 0, bei Skill 100 mit 1. Eigene Karten werden nicht versteckt.
Grenzen 39/40/41, 49/50/51 und 100 sind getestet; ein Sprung an der Schwelle
ist nicht beabsichtigt. `bot-action-scoring.ts` konsumiert ausschließlich
das wahrgenommene Profil.

Die **vorläufigen lokalen Gewichte**, keine Paper- oder Solver-Werte, stehen
in `plo-preflop-strategy.ts`: Nur in später Position und bei effektiv mehr
als 40 BB steigt die Wirkung linear bis 100 BB. Beim ungeöffneten Pot erhält
ein Raise bis zu +3 für Koordination und +1 je A-hohem nutzbarem Suit. Gegen
genau ein Open erhält ein Call bis zu +4 beziehungsweise +2. Early Position,
Blinds, 3-Bet-Spots, ≤40 BB, All-ins und NLHE erhalten keinen direkten
Faktor; bereits erfolgte Limp-/Cold-Calls schließen diese Pilotspots aus.
Ohne öffentliche Aktionsanalyse wird kein „ungeöffnet“-Spot angenommen.
Es gibt **keine** neue Pflichtaktion oder Frequenztabelle. L7/P1
motivieren die Merkmalswahl; weder diese Gewichte noch Skill-/Stack-Grenzen
werden durch die Quellen empirisch belegt.

### Kontrollierte Wirkung und Regression

Mit dem festen Kontrastkatalog (Seed `base`) differiert der Decision-Vektor
für `AA72r`/`KQJTr` jetzt in 14/120 6-max-, 14/120 Full-Ring- und 6/72
Heads-up-Kontexten statt zuvor jeweils 0. Der Aktionstyp unterscheidet
sich in 4/120, 3/120 bzw. 0/72; eine andere Aktion in jedem Spot ist weder
beabsichtigt noch als Qualitätsbeweis zulässig. Das suit-isomorphe
`AKQJds`/`AKQJdsIso` bleibt in allen drei Formaten bei 0 Unterschieden.
Die Seeds `a` und `b` bestätigen für alle drei Formate die Differenz des
ersten Paares und die unveränderte Suit-Isomorphie; die exakte gewählte
Aktion bleibt erwartungsgemäß seedabhängig.
Für TAG/Skill 100/100 BB auf dem 6-max-Button steigt der Raise-Score von
`KQJTr` relativ zum unveränderten `AA72r` um knapp 3 Punkte; UTG, Blind-
Defense und der 3-Bet-Spot bleiben für dieses Paar identisch.

Client-Tests: 485 bestanden, 1 bestehendes Todo; TypeScript-Prüfung grün.
Der **unveränderte** 300-Hand-Kalibrierungs-Snapshot ist grün: 24
Kombinationen, 4 Warnungen, 0 Fehler, 0 strukturelle Verstöße. Insbesondere
PLO-Nit/Full Ring Turn-C-Bet bleibt bei 5/11 (45,45 %), obwohl dieser
Rohwert außerhalb des nicht bindenden Zielkorridors 32–40 % liegt.
Eine frühere, breiter greifende Pilotfassung ohne Ausschluss von
Limp-/Cold-Call-Spots ergab 4/10 (40,00 %) und ließ den Snapshot formal
an der 5-Prozentpunkte-Grenze scheitern. Das war eine Folge veränderter
Handverläufe, kein direkter Turn-Faktor; die engere Spotdefinition löst
die Regression, ohne Baseline oder Turn-Logik zu ändern.

Im zusätzlichen deterministischen 1.000-Hand-Gegenlauf für PLO-Nit/Full
Ring beträgt Turn-C-Bet 38,9 % (14/36) ohne Pilot und 36,8 % (14/38) mit
dem **finalen** Pilot; beide liegen im bisherigen Korridor. WTSD ist in
beiden Läufen auffällig: 32,7 % (309/944) ohne, 33,4 % (319/956) mit
Pilot gegenüber Ziel 22–28 %. Das bleibt eine separate PLO-Diagnose,
kein Grund, den Korridor für den Pilot zu verschieben. Beide Läufe haben
null strukturelle Verstöße.

**Status:** Implementierter, reversibler Pilot im Arbeitsbaum, keine
Release-Freigabe. Vor einem Release braucht er weitere Kalibrierung mit
unabhängigem Seed und eine manuelle Plausibilitätsprobe; die bestehenden
PLO-WTSD-Ausreißer bleiben separat zu triagieren. Die historischen Baseline-Zahlen oben bleiben als
Vorher-Vergleich erhalten.

### Nachvalidierung: PLO-Nit mit zwei 3.000-Hand-Seeds

Die kleine 1.000-Hand-Stichprobe war kein stabiler Beleg für systematisch
hohen Nit-WTSD. Derselbe Arbeitsbaum wurde mit dem Basisseed und dem
unabhängigen Salt `plo-preflop-confirmation-20261001` über **je 3.000 Hände
pro Format** gemessen. Die Raten unten sind Beobachtungen, keine neuen
Zielwerte; zugehörige Korridore stehen im Simulator.

| Format | WTSD Basis | WTSD unabhängiger Seed | AF Basis | AF unabhängiger Seed |
|---|---:|---:|---:|---:|
| Full Ring | 871/2837 = 30,7 % | 755/2878 = 26,2 % | 1237/350 = 3,53 | 1268/329 = 3,85 |
| 6-max | 698/2583 = 27,0 % | 769/2687 = 28,6 % | 1086/233 = 4,66 | 1152/280 = 4,11 |
| Heads-up | 376/1322 = 28,4 % | 284/1344 = 21,1 % | 667/142 = 4,70 | 720/131 = 5,50 |

Full Ring überschreitet beim Basisseed den WTSD-Korridor 22–28 %, liegt
beim unabhängigen Seed aber darin. 6-max und Heads-up wechseln ebenfalls
die Korridorseite. Ein globaler Nit-Call-Abschlag wäre daraus nicht
ableitbar. In der Full-Ring-Showdown-Zerlegung sind **Check-downs** der
größte Unterschied (648 Basis vs. 519 unabhängig), während Call-downs
104 vs. 119 betragen. Die WTSD-Differenz darf deshalb nicht schlicht als
„zu viele Calls“ interpretiert werden. AF ist in mehreren Nit-Zellen hoch;
das bleibt als separates, zunächst diagnostisches Thema sichtbar.

Die Messung nutzt vorhandene Showdown-Pfad- und Erhaltungsdiagnostik;
das separate strukturelle 300-Hand-Gate war zu diesem Pilotzeitpunkt grün.
Vor einem
Postflop-Fix wären konkrete Handverläufe und eine Unterscheidung zwischen
passiv durchgecheckten Pots, sinnvoller Potkontrolle und echten
Fehlentscheidungen nötig. Der PLO-Preflop-Pilot wird dafür nicht verändert.

Ein ergänzender 1.000-Hand-Lauf mit demselben unabhängigen Seed über
**alle zwölf PLO-Archetyp-/Format-Zellen** hatte überall 0 Invalid-Action-
Fallbacks, 0 Non-short Open-Shoves und 0 Uncommitted-Deep-Shoves. Nit-WTSD
lag bei 25,9 % (246/949) Full Ring, 26,9 % (241/895) 6-max und 23,6 %
(110/466) Heads-up, jeweils im Korridor. Andere WTSD-Beobachtungen sind
gegenläufig: TAG 6-max 35,8 % (603/1685) und Heads-up 33,5 % (404/1206)
über Ziel 22–32 %, LAG 6-max 25,3 % (544/2151) unter Ziel 28–34 % und
Calling Station Heads-up 46,8 % (856/1830) über Ziel 28–45 %. Die übrigen
WTSD-Zellen lagen im jeweiligen Korridor. Dieser kurze Bestätigungsseed
ersetzt weder die 10k-Release-Kalibrierung noch eine Hand-für-Hand-Probe.

`npm run test:stakes` besteht mit dem Pilot für NLHE und PLO bei
proportionalen Blinds `0,01/0,02` und `10/20`; die neue, in BB normierte
Stackachse verletzt diese Invariante nicht.
