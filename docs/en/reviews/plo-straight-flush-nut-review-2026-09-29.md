# PLO straight flush: nut potential correction (29 September 2026)

Status: historical review and correctness status from 29 September 2026.

## Reproduced case

On `Q♠ J♠ T♠`, the bot holds `A♠ 9♠ 8♠ 2♦`. Under the PLO rule
"exactly two hole cards and exactly three board cards", its best straight
flush is Q-high (`8♠ 9♠ T♠ J♠ Q♠`). The previous check derived a
theoretical A-high straight flush from the board ranks and reported
`near-nuts`. However, this is blocked by the bot's own `A♠`; for a
K-high straight flush, the opponent is also missing the held `9♠`. In
this specific state, the bot holds the nuts.

## Correction and limits

The nut check searches for every possible opponent straight flush line
exactly three same-suited board cards and two different, actually unseen
hole cards. It determines the highest possible straight flush in that case
and compares it with the bot's own. The same check protects the quad
assessment from overlooking a possible straight flush.

Two tests cover the blocked nuts case and the counter-case with an
unblocked higher straight flush. The nuts test failed before the
correction. Other draw and nut categories and action scores were not
changed; from this, no general release of the entire PLO hand analysis
follows.
