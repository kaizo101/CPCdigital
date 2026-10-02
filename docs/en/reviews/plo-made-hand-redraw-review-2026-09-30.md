# PLO draw-outs behind strong made hands (30 September 2026)

Status: historical review and correctness status from 30 September 2026.

## Reproduced finding

The previous draw analysis counted cards that enable a straight or flush
as `cleanOuts` even if the bot already held a stronger full house. On
`A♠ A♦ 2♠` with `A♥ 2♥ K♠ J♠`, it reported nine flush outs and a
nut-flush draw. However, none of these flush cards improve the existing
full house.

The counter-case is important: On `A♠ A♦ K♠` with `A♥ K♥ Q♠ J♠`, the bot
also holds a full house. But `T♠` enables a royal flush with exactly two
hole cards and three board cards. From the twelve previously counted outs,
only this single genuine nut-straight-flush out remains.

## Correction

For full house or quads, ordinary straight/flush draws are no longer
reported as improvements. For boards that are not yet complete, potential
straight-flush redraws are simulated using exact Omaha hand evaluation;
only actually possible nut straight flushes count as `cleanOuts`. They do
not receive a generic `drawTypes` entry, as this could incorrectly treat
an already strong made hand as a draw/semi-bluff hand in the action logic.
The `cleanOuts` field remains available for the objective improvement case.

In addition, four deterministic oracle tests compare the reported straight
and flush draw presence against all physically possible next cards for 25
flop states and 25 turn states each. For the 100 states examined, no
deviations occurred. This sample is not proof for all card combinations.

Workspace tests, build and stake invariance passed. The existing
300-hand calibration regression passed all 24 combinations with no warnings
or errors; target corridors and snapshots remained unchanged.
