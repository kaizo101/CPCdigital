# PLO-Straight-Flush: Nut-Potential-Korrektur (29.09.2026)

Status: historischer Review- und Korrektheitsstand vom 29.09.2026.

## Reproduzierter Fall

Auf `Q♠ J♠ T♠` hält der Bot `A♠ 9♠ 8♠ 2♦`. Nach der PLO-Regel
„genau zwei Hole Cards und genau drei Board Cards“ ist sein bester
Straight Flush Q-high (`8♠ 9♠ T♠ J♠ Q♠`). Die bisherige Prüfung leitete
aus den Board-Rängen einen theoretischen A-high-Straight-Flush ab und
meldete `near-nuts`. Dieser ist aber durch das eigene `A♠` blockiert;
für den K-high-Straight-Flush fehlt dem Gegner das ebenfalls gehaltene
`9♠`. Der Bot hält in diesem konkreten Zustand die Nuts.

## Korrektur und Grenzen

Die Nut-Prüfung sucht für jede mögliche gegnerische Straight-Flush-Linie
exakt drei gleichfarbige Boardkarten und zwei unterschiedliche, tatsächlich
ungesehene Hole Cards. Sie bestimmt den höchsten so möglichen Straight
Flush und vergleicht ihn mit dem eigenen. Dieselbe Prüfung schützt die
Vierlingsbewertung davor, eine mögliche Straight Flush zu übersehen.

Zwei Tests decken den blockierten Nuts-Fall und den Gegenfall mit
unblockiertem höherem Straight Flush ab. Der Nuts-Test schlug vor der
Korrektur fehl. Andere Draw- und Nut-Kategorien sowie Action-Scores wurden
nicht verändert; daraus folgt keine allgemeine Freigabe der gesamten
PLO-Handanalyse.
