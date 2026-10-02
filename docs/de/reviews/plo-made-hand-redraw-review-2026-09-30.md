# PLO-Draw-Outs hinter starken Made Hands (30.09.2026)

Status: historischer Review- und Korrektheitsstand vom 30.09.2026.

## Reproduzierter Befund

Die bisherige Draw-Analyse zählte Karten, die einen Straight oder Flush
ermöglichen, auch dann als `cleanOuts`, wenn der Bot bereits ein stärkeres
Full House hielt. Auf `A♠ A♦ 2♠` mit `A♥ 2♥ K♠ J♠` meldete sie neun
Flush-Outs und einen Nut-Flush-Draw. Keine dieser Flush-Karten verbessert
jedoch das bestehende Full House.

Der Gegenfall ist wichtig: Auf `A♠ A♦ K♠` mit `A♥ K♥ Q♠ J♠` hält der Bot
ebenfalls ein Full House. `T♠` ermöglicht aber mit genau zwei privaten und
drei Boardkarten einen Royal Flush. Von zuvor zwölf pauschal gezählten
Outs bleibt damit genau dieses eine echte Nut-Straight-Flush-Out übrig.

## Korrektur

Bei Full House oder Vierling werden gewöhnliche Straight-/Flush-Draws nicht
mehr als Verbesserungen ausgegeben. Für noch nicht fertige Boards werden
potenzielle Straight-Flush-Redraws mit der exakten Omaha-Handwertung
durchgespielt; nur tatsächlich mögliche Nut-Straight-Flushes zählen als
`cleanOuts`. Sie erhalten keinen generischen `drawTypes`-Eintrag, weil
dieser in der Action-Logik einen bereits starken Made Hand fälschlich als
Draw-/Semi-Bluff-Hand behandeln könnte. Das Feld `cleanOuts` bleibt für den
objektiven Verbesserungsfall verfügbar.

Zusätzlich vergleichen vier deterministische Oracle-Tests die gemeldete
Straight- bzw. Flush-Draw-Existenz auf jeweils 25 Flop- und Turnzuständen
mit allen physisch möglichen nächsten Karten. Für die untersuchten 100
Zustände gab es keine Abweichung. Diese Stichprobe ist kein Beweis für alle
Kartenkombinationen.

Workspace-Tests, Build und Stake-Invarianz bestanden. Die bestehende
300-Hand-Kalibrierungsregression bestand alle 24 Kombinationen ohne
Warnungen oder Fehler; Zielkorridore und Snapshot blieben unverändert.
