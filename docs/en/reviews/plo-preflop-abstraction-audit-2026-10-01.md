# Audit: PLO4 Preflop Hand Abstraction

> German original: [Audit: PLO4-Preflop-Handabstraktion](../../de/reviews/plo-preflop-abstraktion-audit-2026-10-01.md)

As of: 1 October 2026 · **baseline audit and limited PLO4 preflop pilot; no
approval as a calibrated strategy**

The calibration figures below belong to the respective pilot state. After the
later postflop follow-up fixes, the combined 300-hand comparison reports a
formal drift error; the current state is documented in the
[PLO postflop addendum](plo-postflop-session-2026-10-01.md).

## Question and Boundary

Is the current classification of the 270,725 possible PLO4 starting hands fine
enough that the bots recognise different *reasons* for a playable hand? The
audit assesses the representation, not the optimal action of a single hand.
Identical categories alone prove no misplay; differing categories do not yet
prove a good strategy. NLHE findings, PLO5, Omaha Hi-Lo and third-party solver
frequencies are not transferred to PLO4 High.

## Sources and Permissible Conclusion

- **L7:** Li/Huang, [*Abstraction Agent*, arXiv:2609.04303v1](https://arxiv.org/html/2609.04303v1),
  Section 5 "Cross-game settings", Section 6 "Cross-game portability",
  Appendices A/B/E/H. The authors reduce 270,725 raw PLO4 hands via suit
  isomorphism to 16,432 representatives and group these into 30 clusters on
  the basis of several features. Appendix E names pair/rank strength,
  suit/flush potential, straight connectivity, four-card coordination and nut
  potential. **Boundary:** in PLO only the plausibility of the
  features/clusters is inspected; no exploitability or human decision quality
  is measured. The quantitative improvements of the paper come from NLHE turn
  endgames and a different game. Neither "30" nor LLM-generated scores are
  validated for CPCdigital.
- **P1 (practical source):** Upswing Poker,
  [*Pot Limit Omaha Preflop Guide: Raising First In*](https://upswingpoker.com/wp-content/uploads/2020/04/PLO-Preflop-Guide-RFI-v4-UpswingPoker.pdf),
  PDF pages 3–6. The guide separates hand classes, double-/single-suited/rainbow,
  gap classes and position; according to page 4 the RFI ranges were derived
  with Monker Solver and a specific rake structure. **Boundary:** raising
  first in only, no human sample, no template for calling/3-bet frequencies,
  archetypes or our stakes.

**Our derivation:** these sources justify a test of whether the hand features
are *present separately in the bot and can be used when needed*. They justify
neither a direct solver policy nor a target corridor. A bot that feels human
must react to its own assessment, which is limited depending on skill; it
should not first decide optimally and then randomly insert "mistakes".

## Current Data Flow in the Code

1. `packages/client/src/omaha-hand-evaluation.ts` (`preflopAssess`) maps
   pairs, high cards, suit shape, connectivity and danglers onto **one**
   `strength` number. Format-dependent thresholds turn this into one of six
   buckets (`weak` to `premium`). Further fields such as `drawQuality` and
   `nutPotential` are calculated, but the preflop `nutPotential` is only
   `strong` or `medium`; `drawTypes` remain empty.
2. `packages/client/src/bot-category-scores.ts` (`getPloPreflopAction`)
   maps archetype, rough situation (`unopened`, `facing-open`,
   `facing-3bet`), bucket and table format to a preference. The function
   receives neither the four cards nor the exact position, stack depth or the
   individual structural features. Other parts of the bot pipeline
   additionally take position and risk into account; **the table is not the
   whole decision**.
3. Tests in `omaha-hand-evaluation.test.ts` cover selected suit and category
   examples; newly added are relational tests for suit isomorphism, nut versus
   king-high suit and rundown versus dangler.
   `bot-category-scores.test.ts` checks individual table cells. The full
   contrast run described below deliberately remains **diagnostic**: the same
   action choice for different hands is not yet an automatic test failure
   without a justified target decision.

## Reproduced Sample Comparison

Determined directly via `omahaVariantEvaluator.evaluate()` and
`getPloPreflopAction()`; PLO4, 6-max, TAG, without reads or personality. The
preference is **not** the final bot action.

| Starting hand | Strength | Bucket | `nutPotential` / `drawQuality` | Unopened / Facing Open / Facing 3-Bet |
|---|---:|---|---|---|
| A♠ A♥ 7♦ 2♣ (AA with weak side cards, rainbow) | 47 | good | strong / 1 | raise / call / call |
| K♠ Q♥ J♦ T♣ (high rundown, rainbow) | 47 | good | strong / 3 | raise / call / call |
| T♠ 9♥ 8♦ 7♣ (medium rundown, rainbow) | 36 | good | strong / 3 | raise / call / call |
| A♠ A♥ A♦ 2♣ (three aces in the hand) | 41 | good | strong / 1 | raise / call / call |
| A♠ K♠ Q♥ J♥ (high rundown, double-suited) | 71 | strong | strong / 5 | raise / raise / call |
| A♠ 2♠ 3♥ 4♥ (wheel rundown, double-suited) | 59 | strong | strong / 5 | raise / raise / call |

The first pair is the clear **representation conflict**: exactly the same main
score and table path despite pair strength versus four-card connectivity. The
other rows show that even a differing score within a bucket receives the same
table preference. For `AAA2` the coarse `nutPotential: strong` on the sole
basis of at least two aces is a point to check; it is not yet evidence that
every later action is wrong. Likewise `A234` versus `AKQJ` is not a claimed
unambiguous ranking: nut and domination risk depend on the context.

## Full Pipeline: Controlled Counter-Check

After the table comparison, a reproducible comparison now runs through
`createBotContext()` → variant evaluation → `decideBotDecision()` with skill
perception, all action scores, personality modifiers, weighted selection and
legalisation. The [diagnostic script](../../../scripts/plo-preflop-contrast.ts)
uses **legal PLO4 preflop states** generated by `PokerGame` with public action
history. Only the four *own* cards are replaced as controlled counter-factors;
the hidden opponent cards are not evaluated. It is therefore a decision test,
not a full hand history test. Invocation:

```sh
node --import tsx scripts/plo-preflop-contrast.ts
node --import tsx scripts/plo-preflop-contrast.ts --jsonl
node --import tsx scripts/plo-preflop-contrast.ts --format=full-ring --seed=a
node --import tsx scripts/plo-preflop-contrast.ts --format=heads-up --seed=b
```

The matrix covers four archetypes, skill 20/50/100, 40/100 BB and five
situations: UTG/BTN unopened, BTN/BB versus a UTG open and UTG after its own
open versus a CO 3-bet. Per contrast pair these are **120 identical public
contexts**; in total 2,400 decisions for 20 hands. Traits, game seeds and
decision seed are fixed. The stated single action is therefore **not an action
frequency**.

| Contrast pair (120 contexts each) | Differing action vectors¹ | Different action type | Different action type **or** raise size |
|---|---:|---:|---:|
| `AA72r` / `KQJTr` | **0** | **0** | **0** |
| `AA72r` / `AA72ssNut` | 120 | 46 | 84 |
| `AA72ssNut` / `AA72ssLow` | 36 | **0** | **0** |
| `AA72ssNut` / `AA72ds` | 120 | 6 | 6 |
| `AA72r` / `AAA2r` | 120 | 2 | 2 |
| `AKQJr` / `AKQJssNut` | 120 | 42 | 82 |
| `AKQJssNut` / `AKQJssKing` | 120 | **0** | **0** |
| `AKQJssNut` / `AKQJds` | 114 | 6 | 6 |
| `AKQJds` / `AKQJdsIso` | **0** | **0** | **0** |
| `AKQJssNut` / `AKQJtriple` | 120 | 0 | 0 |
| `AKQJtriple` / `AKQJmono` | 120 | 40 | 82 |
| `AKQJds` / `AKQ2ds` | 120 | 6 | 6 |
| `KQJTr` / `KQJ2r` | 120 | 64 | 70 |
| `AKQJds` / `A234ds` | 120 | 6 | 6 |
| `AA72r` / `AAJJds` | 120 | 58 | 110 |
| `A732r` / `K832mono` | 120 | 2 | 2 |

¹ Action vector = utilities, intents, selection eligibility and offered raise
size. `ssNut` means single-suited with an ace-high suit, `ssLow` single-suited
with a 7-high suit, `ssKing` single-suited with a king-high suit. `AKQJdsIso`
is merely a renaming of the suits of `AKQJds`. The catalogue with **exact
cards** is in the diagnostic script.

The new pairs separate the causes: the switch rainbow → single-suited also
changes the action type frequently for `AA72` and `AKQJ`; the current model
thus recognises coarse suit structure. With **identical ranks and the same
single-suited shape**, however, the selection remains the same in all 120
contexts, whether the suit is ace-high or lower (`AA72`, `AKQJ`). The score
partly distinguishes these cases (e.g. `AA72ssNut` strength 59 versus
`AA72ssLow` 55), but not consistently the action. The suit-isomorphic control
case is, as expected, identical in all 120 contexts. A clear
rundown-vs.-dangler contrast (`KQJT` versus `KQJ2` rainbow) changes the action
type 64 times; within the `strong` bucket `AKQJ` versus `AKQ2` double-suited
differs in the action type only six times. **None of these counters is a
target poker frequency.**

### Format and Seed Counter-Check

The script was additionally run in Full Ring and heads-up with the seeds
`base`, `a` and `b`. Full Ring has the same five controlled situations as
6-max (120 comparisons per hand pair and seed); heads-up has button open, big
blind defence and button versus 3-bet (72 comparisons).

| Contrast pair | 6-max: different action type, seeds base/a/b | Full Ring: different action type, seeds base/a/b | Heads-up: different action type, seeds base/a/b |
|---|---|---|---|
| `AA72r` / `KQJTr` | **0/0/0 of 120** | **0/0/0 of 120** | **0/0/0 of 72** |
| `AA72ssNut` / `AA72ssLow` | 0/0/2 of 120 | 0/0/2 of 120 | 4/6/2 of 72 |
| `AKQJssNut` / `AKQJssKing` | 0/2/2 of 120 | 0/2/2 of 120 | 0/0/0 of 72 |
| `AKQJds` / `AKQJdsIso` | **0/0/0 of 120** | **0/0/0 of 120** | **0/0/0 of 72** |

Thus the **complete equal rating of `AA72r`/`KQJTr`** persists across 936
paired format/seed contexts. The nut suit contrasts affect scores, but only
occasionally the action type; the exact counters are seed- and
format-dependent. This is neither a statistical estimate of the bot frequency
nor proof of an optimal ranking. The suit isomorphism control remains stable.

Example TAG, skill 100, 100 BB: `AA72r` and `KQJTr` have fold/call/raise
utility **7.12 / 27.44 / 70.39** in UTG unopened and raise to 0.06; in button
unopened **7.12 / 27.44 / 85.39** and raise to 0.05. Versus a UTG open on the
button the values are **14.12 / 43.44 / 51.39** with a raise to 0.14; in the
big blind versus the same open **3.66 / 53.90 / 45.39** with a call. Versus a
3-bet after their own UTG open they are **12.60 / 53.96 / 28.39** with a call.
Position/action thus changes the total score, but **not the difference between
these two hand structures**. At skill 20 and 50 as well as for the other
archetypes/stack depths the equality of the pair is preserved.

This is a **demonstrated loss of information**, not a statement about whether
`AA72r` must necessarily be folded and `KQJTr` raised in one of these spots.
Source L7 measures no action quality in PLO. Without a PLO-specific reference
and counter-examples, a hard hand ranking or a new frequency would be
impermissible.

## Precise Gaps of the Baseline

| Finding | Why it is relevant | What is open before a fix |
|---|---|---|
| Several quality dimensions collapse into one bucket in front of the preflop table. | Equivalent total scores can hide different playability and nut potentials. | Check in which situations the difference actually justifies a different action or only a differently weighted action. |
| `nutPotential` is almost binary preflop; `drawQuality` essentially counts usable suits and adjacent rank pairs. | This explains hands such as `AAA2` and `AA72` only roughly and does not reliably separate high/low rundowns by dominatable potential. | Validate feature definitions with the exactly-two-hole-cards rule and suitable counter-examples; do not output uncalibrated "nut" labels as truth. |
| The preflop table knows the table format, but not the concrete position, effective stack or exact previous line. | An RFI from early position and from the button takes the same category path; further context factors do exist downstream, however. | Check the total decision score with controlled position/stack/action pairs before the table is extended. |
| The evaluated PLO paper source does not validate clusters quantitatively for PLO. | Adopting the 30 clusters would be unjustified complexity. | Test own interpretability, pairwise separation sharpness, deterministic stability and effect on play. |

## Design Option for Approval: Explainable PLO4 Features

**Status at the time of the baseline audit: proposal.** The limited pilot is
documented separately below. L7 motivates several separate dimensions; the
following concrete data fields and steps are **our derivation**, not formulas
or action frequencies taken over directly from the paper.

1. A pure, PLO4-specific feature function describes the four cards without
   opponent knowledge or solver lookup: `pairStructure` (pair height, second
   pairing, trips/quads, side card synergy), `suitStructure` (rainbow,
   single-/double-/triple-suited, monotone and the height of the actually
   usable two same-suit hole cards), `straightStructure` (different rank
   windows, gaps and the top end of the straight), `coordination` (how many
   of the four cards are involved in jointly playable two-card combinations)
   as well as cautiously named `nutMakingPotential`. The latter is **not a
   computed nut probability** and must not appear as such in the debug
   report. All suit/straight rules must respect the exactly-two-hole-cards
   requirement; three/four cards of the same suit are not two/three
   independent flush chances.
2. The objective features are kept separate from a *perceived* version.
   Visible cards remain visible for every bot; skill limits the interpretation
   of their relationships, not the information itself. A low-skill bot may,
   for example, recognise AA or "two suits" and still assess coordinated side
   cards or domination risk wrongly. Archetype and mental state are separate
   axes. Before concrete skill thresholds it is checked whether the existing
   `analysisSkillWeight` mechanism fits; every newly set threshold must be
   tested at/under/above the boundary value and at skill 100, without an
   unintended jump.
3. The existing category can be retained for now as a coarse baseline. Only
   the *perceived* features may later influence small, situation-dependent
   PLO preflop factors: position, open/3-bet, effective stack and number of
   players determine **which** feature is relevant. Thus neither a global hand
   ranking nor a solver RFI frequency is translated directly into decisions.
   Variant-neutral data structures are not overloaded with PLO fields alien
   to NLHE; the PLO part remains in its own module/profile.

**Acceptance before connecting to the score:** suit-isomorphic hands deliver
the same features and decision scores; `AA72r` and `KQJTr` deliver
distinguishable structure profiles; ace-high versus lower suit potential is
visible in the profile, even if a low skill hardly uses it strategically. In
at least one justified, identical high-skill context the `AA72`/`KQJT` contrast
must also become recognisable in the *decision score* — without stipulating
that different actions must always be chosen. Exact PLO rules, the legal
action space and suit isomorphism remain invariants. Only afterwards A/B
against unchanged seeds, all formats/archetypes, raw calibration values and a
manual plausibility check. Numerical weights and thresholds belong in a
separate change proposal with counter-examples, not quietly into this audit.

## Historical Change Plan of the Baseline Audit

1. **Done for the diagnostic catalogue:** besides AA with/without coordinated
   side cards, high/medium/wheel rundowns, trips and monotones, hands with
   identical ranks and different suit shapes, nut versus non-nut suit, suit
   isomorphism and controlled danglers are now included.
2. **Done for all three formats:** full pipeline compared with early/late/blind
   positions, 40/100 BB, matching preflop situations, four archetypes, three
   skill values and three seeds. Before a strategy intervention, still define
   boundary values for the *newly proposed* features and their concrete
   counter-examples. An identical result is a diagnosis, not an automatic
   test failure.
3. **Proposed at the time; pilot state below:** the feature vector and its
   perception/score boundary are set out above. Before implementation, approve
   counter-examples and measurable acceptance criteria for individual
   situation-dependent effects; do not copy a cluster count from L7 or a
   solver frequency.
4. Evaluate changes afterwards with targeted boundary/relation and seed tests
   as well as calibration and a manual plausibility check. Re-check existing
   correct formats/archetypes; target corridors remain guardrails.

**Not part of this audit:** repair of other action intent or postflop findings.
Such changes require their own test and change report, so that their effect is
not mixed with the preflop abstraction.

## Limited Implementation Pilot (1 October 2026)

The pilot keeps `strength`, category and archetype preflop table unchanged.
`plo-preflop-features.ts` additionally provides a PLO4-specific profile:
highest pair height, number of different ranks, suit shape, highest card per
**actually usable** suit (at least two hole cards), ace-high usable suits and
the flag "four different ranks in a five-card straight window". This is
neither equity nor a nut probability. The profile fields are deliberately
separate, not a new global score.

So far only two interpreted features reach the action scores: four-card
coordination and the ace-high usable suit. `bot-skill-perception.ts` blends in
their *interpretation* continuously: coordination up to and including skill 40
with weight 0, at skill 100 with 1; nut suit up to and including skill 50 with
0, at skill 100 with 1. Own cards are not hidden. Boundaries 39/40/41,
49/50/51 and 100 are tested; a jump at the threshold is not intended.
`bot-action-scoring.ts` consumes exclusively the perceived profile.

The **preliminary local weights**, no paper or solver values, are in
`plo-preflop-strategy.ts`: only in later position and with an effective stack
of more than 40 BB does the effect rise linearly up to 100 BB. In an unopened
pot a raise receives up to +3 for coordination and +1 per ace-high usable
suit. Against exactly one open a call receives up to +4 respectively +2. Early
position, blinds, 3-bet spots, ≤40 BB, all-ins and NLHE receive no direct
factor; limps/cold calls that have already occurred exclude these pilot
spots. Without public action analysis no "unopened" spot is assumed. There is
**no** new mandatory action or frequency table. L7/P1 motivate the feature
selection; neither these weights nor the skill/stack boundaries are
empirically evidenced by the sources.

### Controlled Effect and Regression

With the fixed contrast catalogue (seed `base`) the decision vector for
`AA72r`/`KQJTr` now differs in 14/120 6-max, 14/120 Full Ring and 6/72 heads-up
contexts instead of 0 in each case previously. The action type differs in
4/120, 3/120 and 0/72 respectively; a different action in every spot is
neither intended nor permissible as proof of quality. The suit-isomorphic
`AKQJds`/`AKQJdsIso` remains at 0 differences in all three formats. The seeds
`a` and `b` confirm for all three formats the difference of the first pair and
the unchanged suit isomorphism; the exact chosen action remains, as expected,
seed-dependent. For TAG/skill 100/100 BB on the 6-max button the raise score
of `KQJTr` rises by just under 3 points relative to the unchanged `AA72r`;
UTG, blind defence and the 3-bet spot remain identical for this pair.

Client tests: 485 passed, 1 existing todo; TypeScript check green. The
**unchanged** 300-hand calibration snapshot is green: 24 combinations,
4 warnings, 0 errors, 0 structural violations. In particular PLO Nit/Full Ring
turn C-bet remains at 5/11 (45.45 %), although this raw value lies outside the
non-binding target corridor of 32–40 %. An earlier, broader pilot version
without the exclusion of limp/cold call spots produced 4/10 (40.00 %) and made
the snapshot formally fail at the 5 percentage point boundary. That was a
consequence of changed hand histories, not a direct turn factor; the narrower
spot definition resolves the regression without changing baseline or turn
logic.

In the additional deterministic 1,000-hand counter-run for PLO Nit/Full Ring
turn C-bet is 38.9 % (14/36) without the pilot and 36.8 % (14/38) with the
**final** pilot; both lie within the previous corridor. WTSD is conspicuous in
both runs: 32.7 % (309/944) without, 33.4 % (319/956) with the pilot against a
target of 22–28 %. That remains a separate PLO diagnosis, no reason to move
the corridor for the pilot. Both runs have zero structural violations.

**Status:** implemented, reversible pilot in the working tree, no release
approval. Before a release it needs further calibration with an independent
seed and a manual plausibility check; the existing PLO WTSD outliers remain to
be triaged separately. The historical baseline figures above are retained as a
before comparison.

### Post-Validation: PLO Nit with Two 3,000-Hand Seeds

The small 1,000-hand sample was not stable evidence for systematically high
Nit WTSD. The same working tree was measured with the base seed and the
independent salt `plo-preflop-confirmation-20261001` over **3,000 hands per
format** each. The rates below are observations, not new target values; the
corresponding corridors are in the simulator.

| Format | WTSD base | WTSD independent seed | AF base | AF independent seed |
|---|---:|---:|---:|---:|
| Full Ring | 871/2837 = 30.7 % | 755/2878 = 26.2 % | 1237/350 = 3.53 | 1268/329 = 3.85 |
| 6-max | 698/2583 = 27.0 % | 769/2687 = 28.6 % | 1086/233 = 4.66 | 1152/280 = 4.11 |
| Heads-up | 376/1322 = 28.4 % | 284/1344 = 21.1 % | 667/142 = 4.70 | 720/131 = 5.50 |

With the base seed Full Ring exceeds the WTSD corridor of 22–28 %, but with
the independent seed it lies within it. 6-max and heads-up also switch sides
of the corridor. A global Nit call discount could not be derived from this.
In the Full Ring showdown breakdown **check-downs** are the biggest difference
(648 base vs. 519 independent), while call-downs are 104 vs. 119. The WTSD
difference must therefore not simply be interpreted as "too many calls". AF is
high in several Nit cells; that remains visible as a separate, initially
diagnostic topic.

The measurement uses existing showdown path and preservation diagnostics; the
separate structural 300-hand gate was green at the time of this pilot. Before
a postflop fix, concrete hand histories and a distinction between passively
checked-down pots, sensible pot control and genuine misdecisions would be
necessary. The PLO preflop pilot is not changed for this.

An additional 1,000-hand run with the same independent seed over **all twelve
PLO archetype/format cells** had 0 invalid action fallbacks, 0 non-short open
shoves and 0 uncommitted deep shoves everywhere. Nit WTSD was 25.9 % (246/949)
Full Ring, 26.9 % (241/895) 6-max and 23.6 % (110/466) heads-up, each within
the corridor. Other WTSD observations point the other way: TAG 6-max 35.8 %
(603/1685) and heads-up 33.5 % (404/1206) above target 22–32 %, LAG 6-max
25.3 % (544/2151) below target 28–34 % and Calling Station heads-up 46.8 %
(856/1830) above target 28–45 %. The remaining WTSD cells lay within their
respective corridor. This short confirmation seed replaces neither the 10k
release calibration nor a hand-by-hand check.

`npm run test:stakes` passes with the pilot for NLHE and PLO at proportional
blinds `0,01/0,02` and `10/20`; the new stack axis normalised in BB does not
violate this invariant.
