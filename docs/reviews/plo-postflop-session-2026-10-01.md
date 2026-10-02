# PLO-Postflop-Nachtrag: gepaarte Boards in Session S20261001T181155928Z

Stand: 01.10.2026 · **gezielter Fix, keine allgemeine PLO-Kalibrierungsfreigabe**

## Befund und Abgrenzung

Die manuelle 33-Hand-Session und ihr passender Debugexport wurden anhand
der gemeinsamen Session-ID abgeglichen. Der zuerst übermittelte Debugexport
aus August gehörte nicht zu dieser Session und wurde nicht als Evidenz benutzt.

- **Hand #10:** Elins K-T ist auf `2-J-9-Q-2` die höchste mögliche
  Straight, aber wegen möglicher Full Houses/Vierlinge nicht die Nuts.
  Check (41 Punkte) schlägt Bet (34,8). Bei Calling Station, Skill 31,
  ist das verpasster möglicher Value, kein nachgewiesener Regelbug.
- **Hand #24:** Tessa hält auf `Q-Q-J-K-A` die höchste Straight. Das
  gepaarte Drei-Herz-Board lässt Flush und Full House zu; Nele zeigt
  Letzteres. Der River-Call benötigt rund 30 % Gewinnchance. Gegen die
  passive Gegnerin ist er fraglich, aber eine einzelne Low-Skill-Entscheidung
  beweist keinen systematischen Call-Fehler.
- **Hand #26:** Auf `K-2-2-2` ist Heros Q-Q ein Full House, weil in PLO
  exakt zwei Hole Cards und drei Boardkarten spielen. Elin, Nele und
  Tessa haben ohne eigene Zwei nur Drilling Zweien mit Kickern. Die Engine
  wertet diese Hände korrekt als Drilling; der Pot von 3,82 ist konsistent.
  Die Botabstraktion markierte jedoch alle drei als `good`, obwohl ihr
  objektives Nut-Potenzial `weak` war. Die Low-Skill-Wahrnehmung setzte
  dieses Potenzial auf `medium`; `plo-spr-strategy` behandelte schon
  `good + medium` als starke Commit-Hand. Elins River-Shove bekam deshalb
  +12 „strong/nut equity“ und +12 generischen Low-SPR-Bonus. Tessas
  River-„All-in“ war technisch ein Call mit dem Reststack, kein Raise.

Hand #8 ist ein weiterer Hinweis auf die grobe Drilling-Bewertung, aber
ein Bet mit schwachem Drilling nach gegnerischem Check ist nicht für sich
allein fehlerhaft und wird nicht als eigener Bug gezählt.

## Umsetzung

1. Drilling, der nur aus drei gleichen **Boardkarten** und zwei privaten
   Kickern besteht, erhält in PLO die Kategorie `marginal` statt `good`.
   Ein privates Paar auf demselben Board bleibt korrekt ein Full House.
2. Die höchste Straight ist auf gepaartem **oder** Drei-Flush-Board nur
   `medium` Nut-Potenzial; bei beiden Gefahren `weak`. Auf einem sauberen
   Board bleibt die bisherige Einstufung erhalten. Die kategorische
   Vereinfachung für Skill < 50 bleibt ausdrücklich bestehen.
3. In der PLO-SPR-Commit-Zone genügt `good + medium` nicht mehr für
   „strong/nut equity“. `good` benötigt mindestens `strong` Nut-Potenzial;
   bereits `strong` eingestufte Made Hands und Premium-Draws behalten
   ihren bisherigen Pfad. Der generische Low-SPR-Faktor wurde nicht
   pauschal entfernt.

Regressionstests decken alle drei gegnerischen Hände aus #26, Heros Q-Q,
die Straight-Boards aus #10/#24, eine saubere Kontroll-Straight sowie
die exakten Skill-Grenzen 49/50/100 ab. Im kombinierten
Skill-/Scoring-Test mit Elins Riverkontext liegt Check nach dem Fix vor
Shove; die falsche Commit-Begründung erscheint nicht mehr. Das ist ein
kontrollierter Entscheidungsfall, keine deterministische Reproduktion der
gesamten historischen Session mit identischem Zustand und Zufallsstrom.

## Kalibrierungsfolgen

Vor dem bewusst aktualisierten 300-Hand-Entwicklungssnapshot meldete
der Driftvergleich neun Warnungen und zwei Fehler, aber **keine**
strukturellen Invariantenverletzungen:

| Kombination/Metrik | alte Baseline | neuer 300-Hand-Lauf | Rohwert neu |
|---|---:|---:|---:|
| PLO Nit Heads-up, AF | 9,86 | 11,33 | 68 aggressive Aktionen / 6 Calls |
| PLO Calling Station 6-max, Turn-C-Bet | 27,27 % | 20,59 % | 7 / 34 Gelegenheiten |

Die ältere Baseline enthielt nur Raten; ihre ursprünglichen Zähler sind
nicht rekonstruierbar. Ein ergänzender 1.000-Hand-Lauf ergab beim Nit
Heads-up AF 6,11 (232/38) und bei Calling Station 6-max Turn-C-Bet
22,13 % (27/122). Letzteres liegt weiterhin unter der diagnostischen
Zielspanne 25–32 %, ist aber kein Struktur- oder Regelverstoß. Weder
Scoring noch Korridore wurden deshalb auf die Stichprobe hingetunt.

Nach Sichtung wurde `calibration/v0.8.2-foundation-300-hand.json` als
**Entwicklungsbaseline** neu erzeugt. Die Datei enthält jetzt zusätzlich
Rohzähler/Nenner und Zielbereiche. Der unveränderte 300-Hand-Vergleich
läuft danach mit 24 Kombinationen, null Warnungen und null Fehlern.
Die Baseline ist kein Releasebericht; für eine Freigabe bleiben größere,
unabhängige Läufe und die übrigen 0.8.2-Gates nötig.

## Verifikation

- 124 gezielte Tests für PLO-Bewertung, SPR und Entscheidungspipeline grün.
- Client-Typecheck grün; vollständige Client-Suite 489 Tests grün,
  ein bestehendes Todo.
- Stake-Invarianz für NLHE/PLO bei `0,01/0,02` und `10/20` grün.
- 300-Hand-Kalibrierungsregression nach Baseline-Review grün.

Ausstehend: Bei der nächsten kurzen PLO-Probe besonders Triple-Boards,
Straights auf gepaarten Drei-Flush-Boards und Calling-Station-Turn-C-Bets
beobachten; keine starre 100-Hand-Pflicht aus diesem Befund ableiten.

## Nachtrag: Durchsicht aller 33 Hände und enger Folgefix

Die anschließende vollständige Durchsicht der Session ergab drei weitere,
reproduzierbare Logikpunkte. Dies sind keine neuen Regeln für alle PLO-Spots:

- Bei mehreren Made Hands der Kategorie `good` (u. a. #4, #13, #20, #21,
  #33) bezeichnete die Aggressionslogik eine Value-Bet als `bluff`.
  Das beeinflusst auch nachgelagerte Bluff- und Habit-Modifikatoren.
  PLO-`good`-Made-Hands erhalten nun Value-Intent; Draw-only-Hände bleiben
  Semi-Bluffs.
- In #4 callten drei Gegner auf `K-K-7` eine große C-Bet mit schwachen
  Händen ohne Draw oder saubere Outs. Die Defense-Boni wurden trotzdem
  wie für realisierbare Equity vergeben. Ein erster allgemeinerer
  Abschwächungsversuch verschob Fold-to-CBet teils um rund 15 Prozentpunkte
  und wurde verworfen. Der danach auf gepaarte Boards begrenzte Ansatz
  hatte zunächst eine zu hohe Call/Pot-Schwelle; der zweite Session-Nachtrag
  unten dokumentiert die Korrektur. Der weitere Call in #8 wurde nicht
  pauschal umklassifiziert und bleibt ein Beobachtungspunkt.
- In #7 hielt Nele eine Straight auf einem ungepaarten Board ohne
  Flush-Gefahr und checkte den River behind. Die bevorzugte Betsize wurde
  auf ihren Reststack gekappt; dadurch verschwand der normale Raise-Kandidat
  vollständig, sodass nur Check oder All-in übrig blieben. Für erkannte
  PLO-Straights gibt es in diesem Fall wieder eine legale kleinere Bet.
  Ein enger Value-Faktor auf sicheren Riverboards macht sie auch für
  passive Bots zu einer plausiblen Option. Der Faktor benutzt die
  **wahrgenommene** Hand und das öffentliche Board, nicht das objektive
  Nut-Potenzial. Ein Check bleibt je nach Skill/Personality möglich.

Gezielte Tests decken Value-Intent, Draw- und Board-Gegenproben, die
aktuelle Call/Pot-Grenze sowie die kleine River-Bet bei knappem Reststack ab.
Ein All-in-only-Gegenfall stellt sicher, dass ohne legale Teil-Bet auch
kein künstlicher Value-Anreiz gegen den Check wirkt.
Die vollständige Test-Suite (493 Client-, 148 Engine-, 7 Server-Tests),
Client-Typecheck/Build und Stake-Invarianz sind grün. Die unveränderte
300-Hand-Kalibrierungsbaseline meldet nach dem zweiten Session-Fix acht
Warnungen und zwei formale Driftfehler. Einer davon bleibt PLO Nit
Heads-up Fold-to-CBet 50,00 % (6/12) →
57,14 % (8/14). Die Gelegenheiten selbst haben sich ebenfalls verändert;
der Prozentvergleich beruht also nicht auf denselben zwölf Spots. Eine
separate 3.000-Hand-Probe ergibt 48,8 % (82/168) innerhalb des
diagnostischen Zielkorridors von 45–60 %. Das spricht gegen eine große,
stabile Verschiebung durch diesen Folgefix, beweist aber keine unveränderte
Entscheidungsverteilung. Kein Zielkorridor und keine Baseline wurden an den
Lauf angepasst; der formale 300-Hand-Drift bleibt dokumentiert.

## Zweite Probe: S20261001T194857341Z, zwölf abgeschlossene Hände

Hand #4 erklärt zwei verschiedene Entscheidungen auf `Q♣ T♦ 9♣`:

- **Elin (Calling Station, Skill 31)** callt mit `A♥ 4♥ 2♦ 2♣`, also
  einem kleinen Pocket Pair ohne Draw und ohne saubere Outs, eine C-Bet
  von 0,22 in den Pot von 0,28. Für sie beträgt der Callpreis 30,6 %.
  Der Debugscore Call 66,7 gegen Fold 45,9 enthält +15 C-Bet-Callbonus
  sowie zusammen −19 Fold-Abschlag für angeblich realisierbare Equity.
  Die wahrgenommene Nut-Potenzial-Abweichung (`weak` → `medium`) war
  **nicht** der direkte Auslöser dieser Beiträge.
- **Juno (TAG, Skill 78)** callt danach mit `8♠ 7♥ 7♦ 6♠` bei 23,4 %
  Preis. Karten 6/7/8/J ergeben zwölf nominelle Straight-Turnkarten;
  wegen möglicher höherer Straights bewertet das Modell sie als Bottom
  Wrap mit null *sauberen* Outs. Der Score Call 48,1 gegen Fold 40,6
  enthält bereits Domination-Abschläge. Das ist diskutabel, aber nicht
  derselbe drawlose Fehl-Call. Der River-Check mit Zehn-hoher Straight
  (Check 54, Bet 46,2, Nut-Potenzial `weak`) ist plausibel.

Die übrigen elf vollständigen Hände wurden gesichtet; Hand #13 im JSONL
ist nur ein begonnener Zustand. Die Main-/Side-Pot-Aufteilung in #6 ist
konsistent. Junos Set-Call dort auf monotone Flop/Turn-Textur bleibt ein
separater Grenzfall: neun mögliche Boat-/Quads-Riverkarten gegen etwa
24,4 % Callpreis, aber kein sicherer Regel- oder Bewertungsfehler. Eine
pauschale Änderung auf Basis dieser zwölf Hände wäre nicht begründet.

### Korrigierte Defense-Bedingung

Die erste enge Regel prüfte `toCallPotRatio ≥ 0,5`. Diese Größe ist der
geforderte Call **geteilt durch den Pot, der die gegnerische Bet bereits
enthält**. In Elins beobachtetem Spot sind das 0,22/0,50 = **0,44**,
nicht die ursprüngliche Betgröße 0,22/0,28 ≈ 0,79. Die alte Grenze
verfehlte somit gerade diesen belegten Fall. Das wurde anhand des
Debugexports entdeckt und nicht durch Anpassung eines Zielkorridors.

Die aktuelle Abschwächung gilt nur bei einer echten Flop-C-Bet in PLO,
einer schwachen Made Hand ohne Draw/saubere Outs, mindestens zwei
Gegnern, einem gepaarten **oder** als `wet` erkannten Flop und
`toCallPotRatio ≥ 0,40`. Sie skaliert die drei zusammenwirkenden
Defense-Beiträge auf 25 %; sie erzwingt keinen Fold. Draws wie Junos
Bottom Wrap und billigere Calls behalten die bisherige Behandlung.
Regressionstests prüfen Elins und Junos Gegenfälle sowie exakt 0,3999
und 0,40. Bei unveränderten übrigen Beiträgen würde Elins konkrete
Scorepräferenz von Call auf Fold wechseln; die gewichtete Aktionsauswahl
darf bei niedrigerem Skill weiterhin gelegentlich callen.

Nach diesem Fix bleiben alle 493 Client-, 148 Engine- und 7 Server-Tests,
Client-Build und Stake-Invarianz grün. Die 300-Hand-Regression meldet
acht Warnungen und zwei Driftfehler: neben Nit Heads-up Fold-to-CBet
auch Calling Station 6-max Turn-C-Bet 20,59 % (7/34) → 14,29 % (5/35).
Ein separater größerer 3.000-Hand-Lauf für Calling Station 6-max
ergibt 21,94 % Turn-C-Bet (86/392), nahe beim früheren 1.000-Hand-Wert
22,13 % (27/122). Fold-to-CBet beträgt dort 38,86 % (792/2038), knapp
über dem diagnostischen Korridor 28–38 %. Das ist eine Beobachtung für
weitere Sessions, keine Grundlage für weitere spontane Score-Eingriffe.
Baseline und Zielkorridore blieben unverändert.

### Unabhängiger Kontrollseed und direkter Gegenlauf (02.10.2026)

Mit dem separaten Seed `plo-followup-20261002-independent` wurden zunächst
alle vier PLO-Archetypen in 6-max über je 1.000 Hände geprüft: überall null
Invalid-Action-Fallbacks und null strukturell unzulässige Shoves. Für die
beiden formalen 300-Hand-Driftzellen folgten je 3.000 Hände mit demselben
unabhängigen Seed:

| Zelle/Metrik | Basisseed, aktueller Code | unabhängiger Seed, aktueller Code |
|---|---:|---:|
| Nit Heads-up Fold-to-CBet | 82/168 = 48,8 % | 99/197 = 50,3 % |
| Calling Station 6-max Fold-to-CBet | 792/2038 = 38,9 % | 810/1909 = 42,4 % |
| Calling Station 6-max Turn-C-Bet | 86/392 = 21,9 % | 47/270 = 17,4 % |

Der Nit-Heads-up-300-Hand-Drift ist im größeren Lauf nicht stabil.
Calling Station 6-max liegt hingegen auch mit unabhängigem Seed bei
Fold-to-CBet über und Turn-C-Bet unter den **nicht bindenden** Korridoren.
Das darf nicht als bloßer 300-Hand-Zufall weggewischt werden.

Zur Ursachentrennung lief die Calling-Station-6-max-Zelle mit demselben
unabhängigen Seed und 3.000 Händen noch einmal, wobei **nur** der neue
drawlose Multiway-C-Bet-Abschlag vorübergehend deaktiviert war. Ohne ihn
betrug Fold-to-CBet 789/1909 = 41,3 %, mit ihm 810/1909 = 42,4 %:
21 zusätzliche Folds bzw. +1,1 Prozentpunkte. Turn-C-Bet blieb in beiden
Läufen exakt 47/270 = 17,4 %. Die erhöhte Foldrate bestand also bereits
vor dieser Korrektur; die niedrige Turn-C-Bet wird von ihr nicht verursacht.
Der Diagnoseeingriff wurde sofort zurückgenommen und der produktive Code
mit Tests geprüft.

**Entscheidung für diesen Block:** Der belegte drawlose Fehl-Call erhält
den engen Fix; die verbleibende, größere Calling-Station-Kalibrierung
bleibt als separates Muster zur späteren Ursachenanalyse dokumentiert.
Weder ein globaler Callbonus noch eine Korridor-/Baseline-Änderung wird
aus diesen Aggregaten abgeleitet. Eine weitere manuelle Pflichtsession
folgt daraus nicht automatisch.
