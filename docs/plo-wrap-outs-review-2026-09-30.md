# PLO-Wrap-Outs und Flush-Dominierung (30.09.2026)

## Reproduzierte Fälle

- `9♠ 6♠ 2♣` mit `T♥ 8♣ 7♦ K♥`: 13 physische Karten
  vervollständigen einen Straight, aber vier davon bringen die dritte
  Board-Spade. Ohne zwei eigene Spades ist die Straight gegen jeden
  legalen gegnerischen Flush geschlagen. Die Hand besitzt neun statt
  13 saubere Straight-Outs und ist ein `mixed-wrap`, kein `nut-wrap`.
- `K♠ Q♠ 2♦` mit `J♥ T♣ 9♦ 8♣`: Verglichen mit dem gleichrangigen
  Rainbow-Board fallen `A♠` und `9♠` aus den zuvor sieben sauberen
  Straight-Outs; fünf bleiben. Die rohe Wrap-Größe bleibt unverändert.
- `Q♠ J♠ 9♠` mit `A♠ K♠ 8♥ 7♥`: Der Bot hält bereits einen Flush.
  Gewöhnliche T-Karten machen zwar einen Straight, verbessern aber die
  bestehende Hand nicht. Nur `T♠` ergibt einen Nut-Straight-Flush und
  bleibt als ein Clean Out erhalten.

## Korrektur und Grenze

Straight-Outs auf einem Board mit mindestens drei Karten einer Farbe
werden nicht mehr als sauber gezählt, wenn der Bot nur eine Straight
hält. Ein eigener Flush wird über den separaten Flush-Out-Pfad behandelt;
ein tatsächlicher Nut-Straight-Flush bleibt auch im Straight-Pfad gültig.
Dieselbe Abgrenzung bestimmt nun die Wrap-Qualität. Bereits gemachte
Flushes werden wie Full Houses und Vierlinge nicht mehr durch schwächere
Straight-Draws aufgewertet; echte Nut-Straight-Flush-Redraws bleiben
zählbar.

Die Änderung trennt rohe physische Straight-Outs von sauberen Outs. Sie
behauptet keine exakte All-in-Equity und modelliert weder gegnerische
Ranges noch alle Full-House-/Flush-Gegenzüge. Zielkorridore bleiben
unverändert.

## Kalibrierungs-Gegenprobe

Der erste deterministische 300-Hand-Regressionstest gegen den alten
Foundation-Snapshot meldete zehn Warnungen und fünf Fehler, ausschließlich
bei PLO-Metriken. Vor allem Turn-C-Bet und Heads-up-Raten besitzen bei nur
300 Händen kleine Nenner: Nit Heads-up sprang beispielsweise von 25 % auf
0 % Turn-C-Bet. Eine solche Differenz allein beweist keine entsprechende
langfristige Verschiebung.

Deshalb wurden die auffälligen Profile mit denselben Seeds auf dem letzten
Commit vor diesem Fix (`dca37af`) und auf dem korrigierten Stand über je
3.000 Hände verglichen:

| Profil | Metrik | Vorher | Nachher |
|---|---|---:|---:|
| Nit Heads-up | Fold-to-C-Bet | 47,1 % | 49,4 % |
| Nit Heads-up | Turn-C-Bet | 49,0 % | 45,8 % |
| Nit Heads-up | AF | 4,51 | 4,73 |
| LAG Full Ring | Fold-to-C-Bet | 46,0 % | 46,3 % |
| LAG Full Ring | Turn-C-Bet | 45,0 % | 44,2 % |
| LAG Full Ring | AF | 1,74 | 1,75 |

Der vollständige neue 3k-PLO-Lauf hatte keine Invalid-Action-Fallbacks.
Er enthält weiterhin einzelne Zielkorridor-Ausreißer, etwa TAG Heads-up
3-Bet (28,52 % bei Ziel 10–20 %) und LAG Full-Ring-AF (1,75 bei Ziel
2,0–4,2). Für LAG Full Ring zeigt der A/B-Vergleich, dass dieser AF-Ausreißer
bereits vor dem Fix bestand; für andere Abweichungen ist die Ursache hier
nicht isoliert. Sie bleiben sichtbare Kalibrierungsaufgaben und werden nicht
durch Anpassungen der Zielkorridore verdeckt.

Der bewusst veränderte 0.8.2-Foundation-Snapshot wurde anschließend
mechanisch neu erzeugt. Im Diff änderten sich nur PLO-Metriken, keine
NLHE-Einträge, Invarianten oder Zielkorridore. Der Snapshot dokumentiert
den neuen Softwarestand und ist keine neue Poker-Zielsetzung.
