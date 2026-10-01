# PLO-Vierling: Nut-Potential-Korrektur (29.09.2026)

Status: historischer Review- und Korrektheitsstand vom 29.09.2026.

## Reproduzierter Befund

Die bisherige `assessOmahaNutPotential`-Prüfung stufte jeden theoretisch
höheren Kartenrang als möglichen gegnerischen Vierling ein, solange der Bot
keine Karte dieses Rangs hielt. Sie prüfte nicht, ob das Board mindestens zwei
Karten des höheren Rangs zeigt. Dadurch wurde beispielsweise ein Vierling
Neunen auf `9♠ 9♦ A♣ K♥ 2♠` mit den privaten Karten `9♥ 9♣ Q♦ J♦`
fälschlich als `near-nuts` statt `nuts` bewertet.

## Korrektur

Ein höherer gegnerischer Vierling zählt nun nur bei genau zwei oder drei
Boardkarten seines Rangs und nur dann, wenn der Bot keine der noch nötigen
Karten blockiert. Das respektiert die PLO-Regel „genau zwei Hole Cards und
genau drei Board Cards“. Zusätzlich wird bei einem eigenen Vierling geprüft,
ob aus drei gleichfarbigen Boardkarten und zwei tatsächlich ungesehenen
Hole Cards ein gegnerischer Straight Flush möglich ist. Private Blocker
werden berücksichtigt.

Gezielte Tests decken vier Fälle ab: unmöglicher höherer Vierling, genau ein
möglicher höherer Vierling, tatsächlich möglicher Straight Flush und ein
durch eigene Hole Cards blockierter Straight Flush. Die ersten beiden Tests
schlugen vor der Korrektur fehl.

## Grenzen und Gate

Dies ist eine Korrektur der objektiven PLO-Nut-Wahrnehmung, keine allgemeine
Neukalibrierung der Archetypen. Die übrigen PLO-Handkategorien und
Action-Scores wurden nicht verändert. Workspace-Tests, Build und
Stake-Invarianz bestanden. Die deterministische Kalibrierungsregression
bestand gegen den unveränderten 0.8.2-Snapshot in allen 24 Kombinationen
ohne Warnungen oder Fehler. Die Snapshot-Zielwerte wurden nicht angepasst.

Weitere PLO-Nut-/Draw-Heuristiken bleiben ein eigener Prüfbereich; aus diesem
Vierlingsfall wird keine pauschale Aussage über alle Kategorien abgeleitet.
