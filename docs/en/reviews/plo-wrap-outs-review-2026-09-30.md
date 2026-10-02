# PLO Wrap-Around Outs and Flush Domination (30 September 2026)

Status: historical review and correctness state of 30 September 2026.

## Reproduced Cases

- `9♠ 6♠ 2♣` with `T♥ 8♣ 7♦ K♥`: 13 physical cards complete a straight, but
  four of them bring the third spade on the board. Without two own spades the
  straight is beaten by every legal opponent flush. The hand has nine instead of
  13 clean straight outs and is a `mixed-wrap`, not a `nut-wrap`.
- `K♠ Q♠ 2♦` with `J♥ T♣ 9♦ 8♣`: Compared with the equal-ranking rainbow board
  `A♠` and `9♠` fall out of the previously seven clean straight outs; five
  remain. The raw wrap size stays unchanged.
- `Q♠ J♠ 9♠` with `A♠ K♠ 8♥ 7♥`: The bot already holds a flush. Ordinary ten
  cards do indeed make a straight, but they do not improve the existing hand.
  Only `T♠` yields a nut straight flush and is retained as one clean out.

## Correction and Limit

Straight outs on a board with at least three cards of one suit are no longer
counted as clean when the bot only holds a straight. An own flush is handled
via the separate flush out path; an actual nut straight flush remains valid
also in the straight path. The same delimitation now determines the wrap
quality. Already made flushes, like full houses and quads, are no longer
upgraded by weaker straight draws; real nut straight flush redraws remain
countable.

The change separates raw physical straight outs from clean outs. It claims no
exact all-in equity and models neither opponent ranges nor all full house/flush
counterplays. Target corridors remain unchanged.

## Calibration Counter-Check

The first deterministic 300-hand regression test against the old foundation
snapshot reported ten warnings and five errors, exclusively for PLO metrics.
Above all turn C-bet and heads-up rates have small denominators with only 300
hands: Nit heads-up jumped, for example, from 25 % to 0 % turn C-bet. Such a
difference alone proves no corresponding long-term shift.

Therefore the conspicuous profiles were compared with the same seeds on the
last commit before this fix (`dca37af`) and on the corrected state over 3,000
hands each:

| Profile | Metric | Before | Afterwards |
|---|---|---:|---:|
| Nit Heads-up | Fold-to-C-Bet | 47.1 % | 49.4 % |
| Nit Heads-up | Turn-C-Bet | 49.0 % | 45.8 % |
| Nit Heads-up | AF | 4.51 | 4.73 |
| LAG Full Ring | Fold-to-C-Bet | 46.0 % | 46.3 % |
| LAG Full Ring | Turn-C-Bet | 45.0 % | 44.2 % |
| LAG Full Ring | AF | 1.74 | 1.75 |

The complete new 3k PLO run had no invalid action fallbacks. It still contains
individual target corridor outliers, such as TAG heads-up 3-Bet (28.52 % at a
target of 10–20 %) and LAG full ring AF (1.75 at a target of 2.0–4.2). For LAG
Full Ring the A/B comparison shows that this AF outlier already existed before
the fix; for other deviations the cause is not isolated here. They remain
visible calibration tasks and are not hidden by adjustments of the target
corridors.

The deliberately changed 0.8.2 foundation snapshot was then regenerated
mechanically. In the diff only PLO metrics changed, no NLHE entries, invariants
or target corridors. The snapshot documents the new software state and is not a
new poker objective.
