# Audit: Informationsfluss der Gegner-Reads

> Englische Fassung: [Audit: Information Flow of the Opponent Reads](../../en/reviews/opponent-reads-information-flow-audit-2026-09-30.md)

Status: Diagnose vom 30.09.2026; Befunde gegen aktuellen Code prüfen.

Stand: 30.09.2026 · **Audit mit anschließendem Datenhygiene-Fix; keine neue Botstrategie**

## Beobachtung bis Entscheidung

| Stufe | Im Code tatsächlich verfügbar | Grenze |
|---|---|---|
| Engine | `getPublicHandHistory()` liefert öffentliche Aktionen; `CardsRevealed` erst beim Showdown, nicht beim Gewinn ohne Showdown. | Verdeckte gegnerische Karten bleiben bis zu einer tatsächlichen Offenlegung privat (`packages/poker-engine/src/game.ts`). |
| Aktuelle Entscheidung | `createBotContext()` nimmt eigene Hole Cards, öffentlichen Zustand, Legal Actions und nur Blind-/Aktionsereignisse der laufenden Hand auf. | Keine gegnerischen Hole Cards; der neue PLO-Test prüft dies mit vier eigenen Karten (`bot-context.ts`). |
| Persistente Reads | `observeOpponentHistory()` verarbeitet neue `PlayerActed`-Ereignisse pro Bot und Hand über einen Cursor. VPIP, Aggression, Fold-Read und Betgrößen werden gespeichert. | `CardsRevealed` wird derzeit ignoriert; selbst ein gezeigter Showdown liefert keinen kartenbezogenen Read (`bot-opponent-observation.ts`). |
| Aktuelle Gegner-Range | `analyzeStreetAction()` sammelt öffentliche Handlinien/Positionen; `estimateOpponentRanges()` leitet daraus einen groben Score ab. | Die Paired-Board-/Card-Removal-Heuristik ist ausdrücklich **NLHE-only**. PLO nutzt hier bisher nur generische Aktions-/Positionssignale (`bot-range-estimation.ts`). |
| Botwertung | `applySkillPerception()` dämpft u. a. Positions-, Board- und Card-Removal-Signale; nach dem vorigen Fix bekommen auch Modifikatoren diesen Kontext. | Persistente Sizing-Tells haben einen eigenen Skill- und Stichprobengate, nicht den allgemeinen `shouldActOnRead`-Gate. |

## Befunde, nach Auswirkung sortiert

1. **Kein nachgewiesenes Hole-Card-Leck.** Die Engine offenbart gegnerische
   Karten vor Showdown nicht, der Bot-Kontext führt sie nicht mit, und Ranges
   verwenden öffentliche Linien plus eigene Karten. NLHE- und PLO-4-Karten-
   Grenzen sind separat getestet. Dies ist ein positiver Befund, keine Aussage
   darüber, ob die geschätzten Ranges strategisch gut sind.
2. **Behoben – erzwungene Aktionen verfälschten Reads.** `forceFold()` erzeugt
   ein öffentliches `PlayerActed` mit `source: 'forced'`. Der Observer ignoriert
   solche Ereignisse jetzt für VPIP, Aggression, Fold-Read und Sizing; der
   Ereignis-Cursor rückt trotzdem weiter. Die Entscheidung ist öffentlich,
   aber keine freiwillige Verhaltensevidenz. Der genaue Effekt auf ältere
   Sessionergebnisse ist nicht rückwirkend gemessen.
3. **Behoben – „Fold-to-Bet“ hatte einen falschen Nenner.**
   Bisher erhöhte auch ein Open-Raise ohne geforderten Call (`toCall = 0`)
   `no-fold`. Jetzt zählen Fold und Weiterplay nur bei `toCall > 0`, also einer
   tatsächlichen Facing-Bet-Gelegenheit. Der Wert wird von
   `bot-action-scoring.ts` nicht direkt für Aktionsboni verwendet; die
   bereinigten `effectiveObservations` können die Read-Konfidenz und damit
   andere Anpassungen aber indirekt verändern.
4. **Designlücke, kein Regelverstoß – gezeigte Karten werden nicht gelernt.**
   Beim Showdown sind `CardsRevealed` legal öffentlich, nach einem Fold ohne
   Showdown fehlen sie korrekt. Der Observer nutzt beide Fälle bisher nur
   über Aktionen, nicht über gezeigte Handklassen. Ein möglicher Ausbau muss
   NLHE-Zwei-Karten- und PLO-Vier-Karten-Handbewertung **getrennt** behandeln;
   keine konkrete Regel oder Rate folgt aus diesem Audit.
5. **Prüfpunkt – zwei Read-Gates.** Allgemeine Gegnerstatistiken werden erst
   nach `shouldActOnRead()` und späterer Konfidenzprüfung strategisch wirksam.
   Sizing-Tells lesen dagegen den persistenten Raw-Read direkt, mit eigenem
   Gate (Skill ≥30, mindestens drei Sizing-Beobachtungen). Das ist nicht
   automatisch ein Fehler, sollte aber als bewusste Produktregel mit
   Grenzwerttests dokumentiert werden. Besonders zu prüfen: ob die gerade
   beobachtete Bet beim Vergleich genau einmal aus dem historischen Mittel
   herausgerechnet wird.
6. **PLO-spezifische Evidenzlücke.** Die generische Handlinien-Range gilt auch
   in PLO; die NLHE-Paired-Board-Heuristik wird dort gerade **nicht**
   angewandt. Eine PLO-eigene Board-/Nut-/Redraw-Range-Interpretation existiert
   in diesem Modul noch nicht. Das ist eine spätere Strategieentscheidung,
   kein Anlass, NLHE-Parameter zu kopieren.

## Showdown-Karten: Skill-Grenze für einen späteren Ausbau

Der Datenhygiene-Fix führt **keinen** Read aus gezeigten Karten ein.
`CardsRevealed` bleibt für alle Bots öffentlich, aber `observeOpponentHistory()`
verwertet es weiterhin nicht. Der Nutzerhinweis ist als Anforderung für den
nächsten strategischen Block festgehalten: Sichtbarkeit ist nicht gleich
Interpretationsfähigkeit. Niedrig geskillte Bots sollen eine gezeigte Hand
nicht automatisch als belastbaren Gegner-Read verwenden. Ob und wie stark ein
Bot daraus eine Tendenz ableitet, muss von seinem Skill abhängen und zusätzlich
Stichprobe/Konfidenz berücksichtigen; eine einzelne Hand ist kein perfektes
Profil. Ein harter Sprung bei einer Skill-Schwelle wäre nur bei ausdrücklicher
Begründung sinnvoll; sonst beginnt der Einfluss an der Schwelle bei null und
steigt stetig. Noch keine Schwelle oder Scorewirkung ist festgelegt.

Vor einer Umsetzung sind Handkontext und Variantenregeln zu trennen: Nur
wirklich offengelegte Hole Cards nach Showdown sind zulässig, nie verdeckte
Karten oder ein Gewinn ohne Showdown. NLHE-Zwei-Karten- und PLO-Vier-Karten-
Handklassen dürfen nicht aufeinander übertragen werden; Reads benötigen einen
Variantenkontext. Tests sollen insbesondere unter/an/über der Skill-Grenze,
mit mehreren Showdowns sowie ohne Showdown prüfen, dass keine Information
vorzeitig oder variantenfremd in eine Entscheidung gelangt. Erst danach
adaptive Kalibrierung; keine stillschweigende Verschiebung der Zielkorridore.

## Verifikation

Beim Audit: gezielte Tests für Kontext, Observer, Ranges, Street-Analyse und
Read-State 50 bestanden, darunter PLO-4-Karten-Privatsphäre und
NLHE-vs.-PLO-Paired-Board-Isolation. Engine-Hand-History: 6 bestanden;
Client-Suite: 459 bestanden, 1 bestehendes TODO. Nach dem Datenhygiene-Fix:
zwei neue Observer-Regressionstests und gesamte `npm test`-Suite mit 616
bestandenen Tests, 1 bestehendem TODO. TypeScript-Prüfung bestanden;
`npm run test:stakes` bestanden für NLHE/PLO. Der deterministische
300-Hand-Kalibrierungsvergleich über 24 Kombinationen meldete 0 Fehler und
2 Warnungen gegenüber dem alten Snapshot: NLHE LAG Full Ring Turn-C-Bet
38,10 → 42,86 % (schon vor diesem Fix vorhanden) und PLO LAG Full Ring
Fold-to-C-Bet 35,58 → 39,81 % (neu im Vergleich). Bei nur 300 Händen pro
Kombination ist das ein Regressionssignal, kein Beleg für eine dauerhaft
falsche Zielrange. Ein anschließender gezielter 3k-Lauf für PLO LAG Full Ring ergab
Fold-to-C-Bet 47,1 % (Ziel 38–46 %), 3-Bet 16,72 % (8–16 %), Turn-C-Bet
44,2 % (45–54 %) und AF 1,77 (2,0–4,2); WTSD lag ungerundet minimal unter
28 %. Diese Abweichungen sind beobachtet, **nicht** kausal dem Read-Fix
zugeordnet. Der Baseline-Snapshot wurde nicht verändert.

### Kontrollvergleich: PLO LAG Full Ring, deterministisch 3k Hände

Für die Ursacheneingrenzung wurde jeweils **nur eine** der zwei jüngsten
Korrekturen temporär zurückgenommen; alle anderen lokalen Änderungen, Seeds
und Parameter blieben gleich. Beide Korrekturen wurden danach wiederhergestellt.

| Metrik | Ziel | Beide Fixes aktiv | Ohne Read-Hygiene-Fix | Ohne Wahrnehmungsgrenzen-Fix |
|---|---:|---:|---:|---:|
| 3-Bet | 8–16 % | 16,72 % | 16,69 % | 16,72 % |
| Fold-to-C-Bet | 38–46 % | 47,1 % | 46,4 % | 47,0 % |
| Turn-C-Bet | 45–54 % | 44,2 % | 44,2 % | 44,2 % |
| AF | 2,0–4,2 | 1,77 | 1,75 | 1,77 |

Damit sind die vier Abweichungen nicht durch einen der beiden jüngsten Fixes
entstanden. Die Read-Korrektur verschiebt Fold-to-C-Bet in diesem Lauf um
etwa +0,7 Prozentpunkte, erklärt aber nicht den grundsätzlichen Befund.
WTSD liegt direkt an der 28-%-Untergrenze (1345/4806 = 27,99 % bei beiden
Fixes) und wird nicht als eigenständiges Strukturproblem interpretiert.

Ein weiterer **Prüfhinweis, kein bestätigter Bug**: Die PLO-LAG-Positionstabelle
zeigt im selben Lauf VPIP 45,30 % in früher und 29,22 % in später Position.
Die PLO-Preflop-Strategietabelle berücksichtigt Archetyp, Handkategorie,
Betting-Situation und Format, aber keine Position; ein später Spieler trifft
häufiger auf ein vorheriges Open. Das könnte die Umkehr mitverursachen, ist
aus den aggregierten Zahlen allein jedoch nicht bewiesen. Vor einer
Score-Kalibrierung wären positions- **und** situationsgetrennte Opportunities
der sinnvollere nächste Diagnosepunkt. Der niedrige AF stammt vor allem aus
dem Non-PFA-Anteil (1,12 gegenüber PFA 4,24), nicht aus fehlender
Preflop-Initiative.
