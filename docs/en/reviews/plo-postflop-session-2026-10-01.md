# PLO Postflop Addendum: Paired Boards in Session S20261001T181155928Z

As of: 1 October 2026 · **targeted fix, no general PLO calibration release**

## Finding and Delimitation

The manual 33-hand session and its matching debug export were reconciled via
the shared session ID. The debug export initially submitted from August did
not belong to this session and was not used as evidence.

- **Hand #10:** On `2-J-9-Q-2` Elin's K-T is the highest possible straight,
  but not the nuts because of possible full houses/quads. Check (41 points)
  beats bet (34.8). For a Calling Station with skill 31 that is potentially
  missed value, not a proven rules bug.
- **Hand #24:** On `Q-Q-J-K-A` Tessa holds the highest straight. The paired
  three-hearts board allows a flush and a full house; Nele shows the latter.
  The river call needs about 30 % equity. Against the passive opponent it is
  questionable, but a single low-skill decision does not prove a systematic
  calling error.
- **Hand #26:** On `K-2-2-2` hero's Q-Q is a full house, because in PLO
  exactly two hole cards and three board cards play. Elin, Nele and Tessa
  without an own two only have three of a kind, twos, with kickers. The engine
  evaluates these hands correctly as three of a kind; the pot of 3.82 is
  consistent. The bot abstraction, however, marked all three as `good`,
  although their objective nut potential was `weak`. The low-skill perception
  set this potential to `medium`; `plo-spr-strategy` already treated
  `good + medium` as a strong commit hand. Elin's river shove therefore
  received +12 "strong/nut equity" and a +12 generic low-SPR bonus. Tessa's
  river "all-in" was technically a call with the remaining stack, not a raise.

Hand #8 is a further indication of the coarse three-of-a-kind evaluation, but
a bet with a weak three of a kind after an opponent check is not erroneous on
its own and is not counted as a separate bug.

## Implementation

1. A three of a kind that consists only of three equal **board cards** and two
   private kickers gets the category `marginal` instead of `good` in PLO. An
   own pair on the same board correctly remains a full house.
2. On a paired **or** three-flush board the highest straight is only `medium`
   nut potential; with both dangers present it is `weak`. On a clean board the
   previous classification is retained. The categorical simplification for
   skill < 50 explicitly remains.
3. In the PLO SPR commit zone `good + medium` is no longer sufficient for
   "strong/nut equity". `good` requires at least `strong` nut potential; made
   hands already classified as `strong` and premium draws keep their existing
   path. The generic low-SPR factor was not removed across the board.

Regression tests cover all three opponent hands from #26, hero's Q-Q, the
straight boards from #10/#24, a clean control straight as well as the exact
skill boundaries 49/50/100. In the combined skill/scoring test with Elin's
river context, check comes before shove after the fix; the incorrect commit
justification no longer appears. This is a controlled decision case, not a
deterministic reproduction of the entire historic session with identical state
and random stream.

## Calibration Consequences

Before the deliberately updated 300-hand development snapshot, the drift
comparison reported nine warnings and two errors, but **no** structural
invariant violations:

| Combination/metric | old baseline | new 300-hand run | new raw value |
|---|---:|---:|---:|
| PLO Nit heads-up, AF | 9.86 | 11.33 | 68 aggressive actions / 6 calls |
| PLO Calling Station 6-max, turn c-bet | 27.27 % | 20.59 % | 7 / 34 opportunities |

The older baseline contained only rates; its original counters are not
reconstructable. An additional 1,000-hand run yielded a Nit heads-up AF of 6.11
(232/38) and, for Calling Station 6-max turn c-bet, 22.13 % (27/122). The
latter is still below the diagnostic target range of 25–32 %, but is not a
structural or rules violation. Neither scoring nor corridors were therefore
tuned to the sample.

After the review, `calibration/v0.8.2-foundation-300-hand.json` was regenerated
as the **development baseline**. The file now additionally contains raw
counters/denominators and target ranges. The unchanged 300-hand comparison
then runs with 24 combinations, zero warnings and zero errors. The baseline is
not a release report; a release still requires larger, independent runs and the
remaining 0.8.2 gates.

## Verification

- 124 targeted tests for PLO evaluation, SPR and the decision pipeline green.
- Client typecheck green; full client suite 489 tests green, one existing todo.
- Stake invariance for NLHE/PLO at `0,01/0,02` and `10/20` green.
- 300-hand calibration regression green after the baseline review.

Outstanding: with the next short PLO probe, particularly watch triple boards,
straights on paired three-flush boards and calling-station turn c-bets; do not
derive a rigid 100-hand requirement from this finding.

## Addendum: Review of All 33 Hands and a Narrow Follow-up Fix

The subsequent complete review of the session produced three further
reproducible logic points. These are not new rules for all PLO spots:

- With several made hands of category `good` (among others #4, #13, #20, #21,
  #33) the aggression logic labelled a value bet as `bluff`. This also affects
  downstream bluff and habit modifiers. PLO `good` made hands now receive
  value intent; draw-only hands remain semi-bluffs.
- In #4 three opponents called a large c-bet on `K-K-7` with weak hands
  without a draw or clean outs. The defence bonuses were nevertheless awarded
  as for realisable equity. A first, more general damping attempt shifted
  fold-to-cbet partly by around 15 percentage points and was discarded. The
  approach then limited to paired boards initially had too high a call/pot
  threshold; the second session addendum below documents the correction. The
  further call in #8 was not reclassified across the board and remains an
  observation point.
- In #7 Nele held a straight on an unpaired board without flush danger and
  checked the river behind. The preferred bet size was capped at her remaining
  stack; as a result the normal raise candidate disappeared completely, so that
  only check or all-in remained. For detected PLO straights there is once again
  a legal smaller bet in this case. A narrow value factor on safe river boards
  makes them a plausible option even for passive bots. The factor uses the
  **perceived** hand and the public board, not the objective nut potential. A
  check remains possible depending on skill/personality.

Targeted tests cover value intent, draw and board counter-examples, the
current call/pot limit as well as the small river bet with a short remaining
stack. An all-in-only counter-case ensures that without a legal partial bet
there is also no artificial value incentive against the check.
The full test suite (493 client, 148 engine, 7 server tests), client
typecheck/build and stake invariance are green. The unchanged 300-hand
calibration baseline reports after the second session fix eight warnings and
two formal drift errors. One of them remains PLO Nit heads-up fold-to-cbet
50.00 % (6/12) → 57.14 % (8/14). The opportunities themselves have also
changed; the percentage comparison is therefore not based on the same twelve
spots. A separate 3,000-hand probe yields 48.8 % (82/168) within the
diagnostic target corridor of 45–60 %. This argues against a large, stable
shift caused by this follow-up fix, but does not prove an unchanged decision
distribution. No target corridor and no baseline were adapted to the run; the
formal 300-hand drift remains documented.

## Second Probe: S20261001T194857341Z, Twelve Completed Hands

Hand #4 explains two different decisions on `Q♣ T♦ 9♣`:

- **Elin (Calling Station, skill 31)** calls with `A♥ 4♥ 2♦ 2♣`, i.e. a small
  pocket pair without a draw and without clean outs, a c-bet of 0.22 into the
  pot of 0.28. For her the call price is 30.6 %. The debug score call 66.7
  versus fold 45.9 contains a +15 c-bet call bonus as well as together −19
  fold penalty for allegedly realisable equity. The perceived nut-potential
  deviation (`weak` → `medium`) was **not** the direct trigger of these
  contributions.
- **Juno (TAG, skill 78)** then calls with `8♠ 7♥ 7♦ 6♠` at a price of 23.4 %.
  The cards 6/7/8/J yield twelve nominal straight turn cards; because of
  possible higher straights the model evaluates them as a bottom wrap-around
  with zero *clean* outs. The score call 48.1 versus fold 40.6 already contains
  domination penalties. This is debatable, but not the same drawless mis-call.
  The river check with a ten-high straight (check 54, bet 46.2, nut potential
  `weak`) is plausible.

The remaining eleven complete hands were reviewed; hand #13 in the JSONL is
only a started state. The main/side pot split in #6 is consistent. Juno's set
call there on a monotone flop/turn texture remains a separate edge case: nine
possible boat/quads river cards against a call price of about 24.4 %, but no
certain rules or evaluation error. A blanket change on the basis of these
twelve hands would not be justified.

### Corrected Defence Condition

The first narrow rule checked `toCallPotRatio ≥ 0,5`. This quantity is the
required call **divided by the pot that already contains the opponent's
bet**. In Elin's observed spot that is 0.22/0.50 = **0.44**, not the original
bet size 0.22/0.28 ≈ 0.79. The old limit therefore missed precisely this
evidenced case. This was discovered via the debug export and not by adjusting
a target corridor.

The current damping applies only for a genuine flop c-bet in PLO, a weak made
hand without a draw/clean outs, at least two opponents, a paired **or** `wet`
detected flop and `toCallPotRatio ≥ 0,40`. It scales the three interacting
defence contributions to 25 %; it does not force a fold. Draws such as Juno's
bottom wrap-around and cheaper calls retain the previous treatment. Regression
tests check Elin's and Juno's counter-cases as well as exactly 0.3999
and 0.40. With the remaining contributions unchanged, Elin's concrete score
preference would switch from call to fold; the weighted action selection may
still call occasionally at lower skill.

After this fix all 493 client, 148 engine and 7 server tests, the client build
and stake invariance remain green. The 300-hand regression reports eight
warnings and two drift errors: besides Nit heads-up fold-to-cbet also Calling
Station 6-max turn c-bet 20.59 % (7/34) → 14.29 % (5/35). A separate larger
3,000-hand run for Calling Station 6-max yields 21.94 % turn c-bet (86/392),
close to the earlier 1,000-hand value 22.13 % (27/122). Fold-to-cbet there is
38.86 % (792/2038), just above the diagnostic corridor of 28–38 %. This is an
observation for further sessions, not a basis for further spontaneous score
interventions. Baseline and target corridors remained unchanged.

### Independent Control Seed and Direct Counter-Run (2 October 2026)

With the separate seed `plo-followup-20261002-independent` all four PLO
archetypes in 6-max were first checked over 1,000 hands each: zero
invalid-action fallbacks and zero structurally illegal shoves everywhere. For
the two formal 300-hand drift cells, 3,000 hands each followed with the same
independent seed:

| Cell/metric | base seed, current code | independent seed, current code |
|---|---:|---:|
| Nit heads-up fold-to-cbet | 82/168 = 48.8 % | 99/197 = 50.3 % |
| Calling Station 6-max fold-to-cbet | 792/2038 = 38.9 % | 810/1909 = 42.4 % |
| Calling Station 6-max turn c-bet | 86/392 = 21.9 % | 47/270 = 17.4 % |

The Nit heads-up 300-hand drift is not stable in the larger run. Calling
Station 6-max, on the other hand, is with the independent seed as well above
the fold-to-cbet and below the turn c-bet **non-binding** corridors. This must
not be dismissed as mere 300-hand chance.

For causal separation the Calling Station 6-max cell was run once more with the
same independent seed and 3,000 hands, whereby **only** the new drawless
multiway c-bet penalty was temporarily deactivated. Without it fold-to-cbet was
789/1909 = 41.3 %, with it 810/1909 = 42.4 %: 21 additional folds resp.
+1.1 percentage points. Turn c-bet remained exactly 47/270 = 17.4 % in both
runs. The elevated fold rate therefore already existed before this correction;
the low turn c-bet is not caused by it. The diagnostic intervention was
immediately reverted and the productive code was checked with tests.

**Decision for this block:** the evidenced drawless mis-call gets the narrow
fix; the remaining, larger Calling Station calibration is documented as a
separate pattern for later causal analysis. Neither a global call bonus nor a
corridor/baseline change is derived from these aggregates. A further mandatory
manual session does not follow from this automatically.

### Release Preflight: Turn C-Bet Composition (2 October 2026)

A renewed deterministic 3,000-hand run with the same independent seed on
checkpoint `701ac2f` plus purely diagnostic simulator output confirms
unchanged **47/270 = 17.4 %** turn c-bets and zero structural violations. A
purely diagnostic breakdown of the **actual turn c-bet opportunities** by
objective hand category yields:

| Category | Bets / opportunities |
| --- | ---: |
| Air | 0/2 |
| Weak | 0/51 |
| Marginal | 0/69 |
| Medium | 5/35 |
| Good | 19/89 |
| Strong | 20/21 |
| Premium | 3/3 |

Almost half of the opportunities (122/270) fall to Air/Weak/Marginal, where
skipping the second barrel fits the Calling Station archetype well.
Strong/Premium almost always bet. The remaining question concerns Medium and
Good: the existing PLO 6-max turn barrel factor of the Calling Station is a
blanket `−15` for non-air and thereby favours the check. However, `Good` is in
PLO no statement about current nuts or secure value bets.

Twelve selectively emitted check decisions from the first 1,000 hands of the
identical seed show both: caution on dangerous boards and potentially missed
value. For example, in hand #162 on `J♣ 5♣ 7♣ 4♥` a skill-45 bot checks an
ace-high flush with `A♣ A♦ 8♣ 5♠` (`good`, objectively `near-nuts`); perception
downgrades the nut potential to `medium`. Check is at 53, bet at 43.4 utility;
this contains a `−11` turn barrel and around `−19` passivity contribution to
the bet. In hand #217 a skill-35 bot on `2♠ 6♠ A♥ 9♣` checks a set of aces
with a nut flush draw with `A♠ A♣ 6♣ 3♠` (check 42, bet 21.1). These are
reproducible decision examples, **not** proof that every good hand should bet.

The low aggregate value is therefore neither a pot/metric error nor merely
300-hand chance. At the same time there is a concrete value question that must
be deliberately placed before a release decision: how much nut recognition
and value initiative should a weak Calling Station retain despite its
passivity? Until then the corridor and the turn score remain unchanged; the
selective turn category output is available in the simulator with
`CALIB_TRACE=1`.
