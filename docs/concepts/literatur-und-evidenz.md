# Literatur und Evidenz für Botverhalten

Stand: 01.10.2026 · **Arbeitsregister; begrenzter PLO4-Preflop-Pilot, keine kalibrierte Strategie- oder Zielwertfreigabe**

Dieses Register macht nachvollziehbar, welche externen Arbeiten eine
Designfrage motivieren, was sie tatsächlich untersuchen und welche konkrete
Entscheidung oder Prüfung daraus für CPCdigital folgt. Forschungsarbeiten zu
starkem Poker sind keine automatische Vorgabe für menschlich wirkende Bots.
Eine Quelle ersetzt weder reproduzierte Hände noch Tests und wird nicht als
Beleg für eine andere Pokervariante ausgegeben.

## Leseregel

- **Gesichtet** bedeutet hier: Titel, Metadaten und Abstract geprüft; der
  Volltext und seine Methodik wurden noch nicht systematisch ausgewertet.
- **Volltext ausgewertet** setzt eine Prüfung von Methode, Versuchen und Grenzen
  mit Abschnitts-/Seitennachweis voraus. **Nur Abstract zugänglich** ist eine
  eigene Evidenzstufe; daraus folgen keine Detailbehauptungen über die Methode.
- **Übertragbar?** ist eine zu prüfende Hypothese, keine bereits bestätigte
  Implementierungsentscheidung. Vor einer Änderung gehören die genaue Stelle
  im Volltext, Grenzen der Studie, ein Testfall und die betroffenen Dateien in
  den jeweiligen Diagnose- oder Änderungsbericht.
- Quellen für **Verhaltensprinzipien**, **Messmethoden** und **numerische
  Zielkorridore** werden getrennt. Insbesondere liefern die folgenden
  NLHE-Arbeiten keine empirischen PLO-Zielwerte.
- Objektive Karten- und Regelprüfung bleibt in der Engine. Die Botentscheidung
  soll dagegen aus legal verfügbaren, skillabhängig wahrgenommenen
  Informationen, unsicheren Reads und begrenzten Persönlichkeits-/Mental-
  Effekten entstehen. Ein objektiver Befund im Debugexport ist kein zusätzlicher
  Wissenskanal des Bots.

**Übernahme aus L1–L7:** L7 motiviert inzwischen die *getrennte Erfassung*
von PLO4-Preflop-Merkmalen im
[Implementierungspilot](../reviews/plo-preflop-abstraktion-audit-2026-10-01.md#begrenzter-implementierungspilot-01102026).
Weder Clusterzahl noch Formel, Aktionsfrequenz, Skill-Schwelle oder
Scoregewicht stammen aus L7. Der im
[Wahrnehmungsgrenzen-Audit](../reviews/bot-wahrnehmungsgrenze-audit-2026-09-30.md)
reproduzierte Rückgriff nach der Wahrnehmungsstufe ist ein lokaler Codebefund
und wird nicht nachträglich einem Paper zugeschrieben. Sobald eine Quelle eine
Änderung tatsächlich begründet, verlinkt der Änderungsbericht Quelle, Aussage,
Gegenbeispiele, Tests und A/B-Ergebnis.

## Forschungsarbeiten

| ID | Quelle und untersuchter Bereich | Möglicher Nutzen für uns | Status und Grenze |
|---|---|---|---|
| L1 | Southey et al., *Bayes' Bluff: Opponent Modelling in Poker*, UAI 2005; [Autoren-Volltext](https://webdocs.cs.ualberta.ca/~mbowling/papers/05uai.pdf), [arXiv:1207.1411](https://arxiv.org/abs/1207.1411). Heads-up **Limit** Texas Hold'em und vereinfachtes Leduc Hold'em. | Beobachtete Aktionen und vermutete gegnerische Karten/Strategie getrennt halten; schwache Evidenz nicht zu Gewissheit aufwerten. Kandidaten: `bot-range-estimation.ts`, `bot-skill-perception.ts`. | **Volltext ausgewertet**, siehe L1-Befund unten. Weder NLHE-/PLO-Bet-Sizing noch PLO-Handstärken oder Zielkorridore ableitbar. |
| L2 | Burch et al., *AIVAT: A New Variance Reduction Technique for Agent Evaluation in Imperfect Information Games*, [arXiv:1612.06915](https://arxiv.org/abs/1612.06915), 2016/2017. Bewertung von Agenten bei stark verrauschten Pokerergebnissen. | Gegenläufe mit identischen Bedingungen, Rohzählern und Unsicherheit aussagekräftig gestalten; erst prüfen, ob weitergehende Varianzreduktion nötig ist. Kandidat: `simulation.ts`. | Abstract gesichtet; Volltext offen. Das AIVAT-Verfahren ist nicht zur Implementierung beschlossen und misst nicht Menschlichkeit. |
| L3 | Bina, Chen und Milgram, *A Model of Expert Decision Making in Post-Flop Betting in Poker*, [HFES 2008](https://doi.org/10.1177/154193120805200449). Laut Abstract Beobachtungen und Interviews zu mentalen Modellen erfahrener Pokerspieler. | Hypothese: eigene Handlinie, Gegnerbild und vermutete Außenwirkung getrennt und über Streets kohärent prüfen. Kandidaten: `bot-street-analysis.ts`, `bot-line-planning.ts`. | **Nur Abstract zugänglich**; Verlag kennzeichnet Volltext als zugangsbeschränkt. Die untersuchte Variante ist aus dem Abstract nicht sicher feststellbar. Keine Abschnitts-/Methoden- oder Aktionsratenbehauptung. |
| L4 | Teófilo und Reis, *Identifying Players' Strategies in No Limit Texas Hold'em Poker through the Analysis of Individual Moves*, [arXiv:1301.5943](https://arxiv.org/abs/1301.5943), 2013. Spielertypen anhand beobachteter Aktionen und deren Häufigkeit. | Archetypen in NLHE auch an bedingten Entscheidungen statt nur an globalen VPIP-/AF-Werten auf Unterscheidbarkeit prüfen. | Abstract gesichtet; Volltext offen. Datensatz und Cluster sind nicht automatisch unsere vier Archetypen; keine PLO-Übertragung ohne Prüfung. |
| L5 | Haaf et al., *Rational AI: A comparison of human and AI responses to triggers of economic irrationality in poker*, [arXiv:2111.07295](https://arxiv.org/abs/2111.07295), 2021. Vergleich von menschlichen und KI-Reaktionen auf Gewinne/Verluste anhand von Hold'em-Daten. | Mentale Effekte als begrenzte, ereignisabhängige Verhaltensänderungen mit Erholung prüfen. Kandidat: `bot-mental.ts`. | Abstract gesichtet; Volltext offen. Kein Beleg für PLO-Tilt-Stärken oder einen pauschalen Zufallsfehler. |
| L6 | St. Germain und Tenenbaum, *Decision-making and thought processes among poker players*, [High Ability Studies 2011](https://doi.org/10.1080/13598139.2011.576084). Laut Abstract 45 Personen in drei Skillgruppen, 60 simulierte **NLHE**-Hände mit Laut-Denken-Verfahren. | Als Kandidat für skillabhängige Auswahl relevanter Situationshinweise und Entscheidungen auf späteren Streets prüfen. | **Nur Abstract zugänglich**; Volltextzugang und Methodendetails offen. Kein PLO-Befund und keine numerische Skill-Schwelle. |
| L7 | Li und Huang, *Abstraction Agent*, [arXiv:2609.04303v1](https://arxiv.org/html/2609.04303v1), 2026. Information Abstraction; u. a. **PLO4 High preflop**, daneben quantitative Experimente für NLHE-Turn-Endgames und ein anderes Spiel. | Kandidat für getrennte PLO-Preflop-Merkmale statt eines alleinigen Stärke-Buckets: Paar-/Rangqualität, Suit-/Flush-Potenzial, Straight-Konnektivität, Vier-Karten-Koordination und Nut-Potenzial. Diagnose und methodische Grenze im [PLO-Preflop-Abstraktionsaudit](../reviews/plo-preflop-abstraktion-audit-2026-10-01.md). | **Volltext ausgewertet für PLO-Abschnitte** (Abschnitt 5 „Cross-game settings“, Abschnitt 6 „Cross-game portability“, Anhänge A/B/E/H). 270.725 Rohkombinationen werden nach Suit-Isomorphie zu 16.432 Repräsentanten und dort zu 30 Clustern verdichtet. **Für PLO wird keine Exploitability und keine menschliche Spielqualität gemessen**; Clusterzahl, LLM-Scores und Aktionsfrequenzen sind keine Übernahmeempfehlung. Preprint, keine von uns verifizierte PLO-Strategie. |

## PLO-spezifische Praxisquelle (keine Forschungsarbeit)

| ID | Quelle und Bereich | Nutzen und Grenze |
|---|---|---|
| P1 | Upswing Poker, [*Pot Limit Omaha Preflop Guide: Raising First In*](https://upswingpoker.com/wp-content/uploads/2020/04/PLO-Preflop-Guide-RFI-v4-UpswingPoker.pdf), 2020, S. 3–6: Handklassen, Suit-Muster, Gap-Klassen, Position und solverabgeleitete RFI-Charts für PLO4. | Unabhängiger PLO4-Praxisabgleich für Merkmale und positionsabhängige *Open*-Szenarien. Kein Peer-Review, keine menschliche Stichprobe, kein Beleg für Calls/3-Bets oder unsere Microstakes-/Bot-Archetypen. Die numerischen Solver-Ranges werden weder als Policy noch als Zielkorridore übernommen. |

**Aktueller Entscheidungsstatus:** L7 und P1 motivieren die Auswahl
PLO4-spezifischer Merkmalsachsen. Die konkreten Profildefinitionen,
Skill-Grenzen und kleinen Preflop-Scorefaktoren sind lokale Hypothesen des
verlinkten Pilots, keine übernommenen Quellenwerte. Keine Solver-Policy,
Bucketzahl oder Zielkorridor wurde übernommen. Der lokale 300-Hand-
Kalibrierungs-Snapshot besteht; eine Release-Freigabe des Pilots steht aus.

## Erster Volltextbefund: L1 und Zugangsgrenze von L3

**L1 – tatsächlich untersucht.** Abschnitt 2 (PDF-S. 1–2) beschreibt zwei
Spieler, festgelegte Bet-/Raise-Beträge und ein Raise-Limit. Die Experimente in
Abschnitten 6–7 (PDF-S. 6–8) nutzen Leduc sowie Texas Hold'em mit aus Priors
gezogenen, statischen Gegnern und 200 Händen pro Versuch. Das ist kein
No-Limit- oder Pot-Limit-Versuch und kein Test auf menschliche Glaubwürdigkeit.
Die Autoren nennen die Annahme statischer, voneinander unabhängiger Strategien
selbst unrealistisch (Abschnitt 3.1, PDF-S. 3). Beim größeren Texas-Spiel
könnten 200 Hände laut Abschnitt 7.2 (PDF-S. 8) sogar für eine konzentrierte
Gegnerschätzung zu wenig sein. Deshalb übernehmen wir weder ihre Lernrate noch
ihre Modellparameter als Botwerte.

**L1 – belastbares Prinzip.** Abschnitt 2 (PDF-S. 2) trennt Kartenzufall,
verdeckte gegnerische Karten und unbekannte gegnerische Strategie. In
Abschnitt 3.3–3.4 (PDF-S. 3–4) liefern Showdowns andere Information als
gefaltete Hände: Beim Fold bleiben gegnerische Karten verborgen und werden im
Modell über mögliche Kartenverteilungen berücksichtigt. Der „informed prior“
in Abschnitt 5 (PDF-S. 6) ist eine Expertenannahme, kein empirischer
Korridor-Datensatz. Abschnitt 7 (PDF-S. 7) zeigt außerdem, dass ein Modell ohne
geeignete Vorannahmen sich in irreführende Gegnerbilder hineinsteigern kann.
**Unsere Ableitung**, nicht eine Implementierungsvorgabe des Papers: Ein Bot
darf aus einem Fold keine konkrete gegnerische Hand „wissen“ und sollte aus
wenigen Beobachtungen keine sichere Aussage über eine enge Range ableiten.

**Getrennte Anwendung.** Für **NLHE** ist nur dieses Informationsprinzip
ein plausibler Prüfstein; Multiway-Pots, freie Einsatzgrößen, Position und
Stacktiefe müssen unabhängig geprüft werden. Für **PLO 4-Karten** gilt zwar
ebenfalls, dass gegnerische Hole Cards nach einem Fold verborgen sind, aber
alle Kartenkombinationen, Range-Abstraktionen, Draw-/Nut-Bewertungen und
Pot-Limit-Einsatzentscheidungen benötigen PLO-eigene Modelle und Tests.
Keine NLHE-Schwelle, Handklasse, Prior-Verteilung oder Zielzahl wird 1:1
übernommen.

**Evidenzlücke PLO:** L7 behandelt PLO4-Preflop-Abstraktion, aber keine
menschlichen Reads oder Postflop-Entscheidungswege und liefert keine
quantitative PLO-Strategievalidierung. Ein PLO-spezifischer Primärbeleg ist
vor konkreten PLO-Strategieregeln gesondert auf Variante, Stichprobe und
Untersuchungsziel zu prüfen. L1 trägt weiterhin nur die allgemeine
Informationsgrenze.

**L3 – vorläufig.** Der [Verlagseintrag](https://doi.org/10.1177/154193120805200449)
stellt nur den Abstract frei bereit. Dieser berichtet von mentalen Modellen
für Gegner, aktive Situation und die eigene Wirkung auf Gegner. Ob die Studie
NLHE oder PLO untersucht, wie groß die Stichprobe ist und welche konkreten
Entscheidungsregeln gefunden wurden, lässt sich daraus nicht verlässlich
ableiten. Bis ein rechtmäßig zugänglicher Volltext vorliegt, bleibt die
Handlinien-Kohärenz eine **eigene Testhypothese**, keine durch L3 belegte
Implementierungsregel.

**Prüffälle vor jedem Strategieeingriff:**

1. **Variantenübergreifende Informationsgrenze:** Nach Fold ohne Showdown
   kennt der entscheidende Bot weder die gegnerischen Karten noch eine exakte
   Handklasse; bei Showdown darf die tatsächlich gezeigte Hand beobachtet
   werden. Dies getrennt für NLHE und PLO testen.
2. **NLHE-spezifisch:** Prüfen, ob wenige neue Aktionen einen Gegner-Read
   unplausibel stark ändern; eine Sequenz über Flop/Turn/River darf nicht
   plötzlich auf nie gezeigten Hole Cards beruhen. Multiway- und
   Bet-Sizing-Fälle sind zusätzliche eigene Testfälle. Eine zulässige
   Änderungsrate wäre erst anhand unserer Botziele zu begründen.
3. **PLO-spezifisch:** Dieselbe Informationsgrenze mit Vier-Karten-Händen und
   exakt-zwei-Hole-Cards-Auswertung testen; PLO-Draw-/Nut-Information nur aus
   PLO-eigener, dem Skill zugänglicher Wahrnehmung ableiten. Pot-Limit-Sizing
   und PLO-Ranges gesondert untersuchen.
4. **Lokaler Codebefund, unabhängig von L1/L3:** Der frühere Rückgriff von
   `applyPersonalityModifiers` auf objektive Hand-/Draw-Information ist im
   [Audit](../reviews/bot-wahrnehmungsgrenze-audit-2026-09-30.md) getrennt für NLHE
   und PLO reproduziert und inzwischen korrigiert. Das ist eine lokale
   Codekorrektur, keine aus einem Paper abgeleitete Strategieänderung.

## Datengrundlagen für Zielkorridore

| ID | Quelle | Eignung und offene Prüfung |
|---|---|---|
| D1 | [A Dataset of Poker Hand Histories, Zenodo](https://zenodo.org/records/17136841), Datensatzbeschreibung, 2025. | Ein öffentliches Beispiel für Roh-Handhistories; die großen beschriebenen Teilmengen sind Hold'em und teils historische Wettbewerbsdaten. Nicht als direkte PLO-Referenz oder heutiger Casual-Spielerpool freigegeben. Inhalt, Rechte, Duplikate und Vergleichbarkeit wären vor Nutzung zu prüfen. |

Für jeden vorgeschlagenen Zielkorridor werden künftig getrennt erfasst:
Variante und Format, Stakes/Ära/Spielerpool, Metrikdefinition mit Zähler und
Nenner, Stichprobengröße, Streuung/Unsicherheit, Archetyp-Zuordnung sowie
Lizenz und Herkunft der Daten. Selbstspielwerte sind **Testergebnisse des
Bots**, keine unabhängige Evidenz für menschliche Zielwerte. Fehlt eine
vergleichbare Datenquelle, bleibt der Korridor explizit vorläufig. Bestehende
Zielkorridore ändern sich durch dieses Register nicht.

## Nächster Auswertungsschritt

1. L1 ist mit Varianten- und Methodengrenze ausgewertet; L7 ist nur für
   PLO4-Preflop-Abstraktion ausgewertet und begründet noch keine
   Strategieänderung. Für L3 nur bei
   rechtmäßigem Volltextzugang weitergehen; andernfalls eine offen zugängliche
   Primärstudie zur menschlichen Handlinien-Entscheidung suchen und separat
   auswerten; L6 ist ein NLHE-Kandidat, aber ebenfalls nur als Abstract
   zugänglich. Eine PLO4-Primärquelle zu **menschlichen Reads oder
   Entscheidungswegen** wird separat gesucht. L2, L4
   und L5 folgen nur bei der passenden Mess-, Archetyp- oder Mental-Frage.
   Für die PLO-Preflop-Frage zuerst den verlinkten Abstraktionsaudit und
   seine Vergleichsfälle bearbeiten. Pro Arbeit nur überprüfbare Aussagen mit
   Seiten-/Abschnittsnachweis und Übertragungsgrenze übernehmen.
2. Die korrigierte Wahrnehmungsgrenze bei späteren Strategiearbeiten
   regressionsgeschützt halten; neue nachgelagerte Modifikatoren dürfen
   objektive Werte nicht unbemerkt als Botwissen nutzen.
3. Der aktuelle [Gegner-Read-Audit](../reviews/gegner-reads-informationsfluss-audit-2026-09-30.md)
   trennt Informationsgrenze, Read-Datenhygiene und strategische Lücken.
   Die noch offenen Gegner-Read-Szenarien für NLHE und PLO getrennt testen;
   gegen unveränderte Seeds, Rohmetriken und bereits korrekte Formate
   vergleichen.
4. Erst nach einem separaten Daten-Audit Vorschläge zu Zielkorridoren mit
   konkreten Quellen und Auswirkungen zur Freigabe vorlegen.
