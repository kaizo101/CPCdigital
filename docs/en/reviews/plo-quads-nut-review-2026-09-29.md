# PLO quads: nut potential correction (29 September 2026)

Status: historical review and correctness status from 29 September 2026.

## Reproduced finding

The previous `assessOmahaNutPotential` check treated every theoretically
higher card rank as a possible opponent quad as long as the bot did not
hold any card of that rank. It did not check whether the board shows at
least two cards of the higher rank. As a result, a set of nines on
`9♠ 9♦ A♣ K♥ 2♠` with hole cards `9♥ 9♣ Q♦ J♦` was incorrectly
assessed as `near-nuts` instead of `nuts`.

## Correction

A higher opponent quad now only counts if there are exactly two or three
board cards of that rank and only if the bot does not block any of the
cards still required. This respects the PLO rule "exactly two hole cards
and exactly three board cards". In addition, when holding quads, it checks
whether a straight flush for an opponent is possible from three same-suited
board cards and two actually unseen hole cards. Private blockers are taken
into account.

Targeted tests cover four cases: impossible higher quad, exactly one
possible higher quad, actually possible straight flush, and a straight
flush blocked by the bot's own hole cards. The first two tests failed
before the correction.

## Limits and gate

This is a correction to objective PLO nut perception, not a general
recalibration of archetypes. The other PLO hand categories and action
scores were not changed. Workspace tests, build and stake invariance
passed. The deterministic calibration regression passed against the
unchanged 0.8.2 snapshot in all 24 combinations with no warnings or
errors. The snapshot target values were not adjusted.

Further PLO nut/draw heuristics remain a separate area of review; no
general conclusion for all categories is drawn from this quad case.
