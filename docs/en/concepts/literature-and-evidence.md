# Literature and Evidence for Bot Behaviour

> German original: [Literatur und Evidenz für Botverhalten](../../de/concepts/literatur-und-evidenz.md)

As of: 1 October 2026 · **Working register; bounded PLO4 preflop pilot, no
calibrated strategy or target value release**

This register makes traceable which external works motivate a design
question, what they actually investigate, and which concrete decision or check
follows from them for CPCdigital. Research work on strong poker is not an
automatic specification for bots that feel human. A source replaces neither
reproduced hands nor tests, and is not issued as evidence for a different
poker variant.

## Reading rule

- **Screened** means here: title, metadata and abstract checked; the full text
  and its methodology have not yet been systematically evaluated.
- **Full text evaluated** requires a check of method, attempts and limits with
  a section/page reference. **Only the abstract accessible** is a separate
  evidence level; no detailed claims about the method follow from it.
- **Transferable?** is a hypothesis to be checked, not an already confirmed
  implementation decision. Before a change, the exact location in the full
  text, the limits of the study, a test case and the affected files belong in
  the respective diagnostic or change report.
- Sources for **behavioural principles**, **measurement methods** and
  **numerical target corridors** are kept separate. In particular, the
  following NLHE works do not provide empirical PLO target values.
- Objective card and rule checking remains in the engine. The bot decision,
  by contrast, should emerge from legally available, skill-dependent perceived
  information, uncertain reads and limited personality/mental effects. An
  objective finding in the debug export is not an additional knowledge channel
  of the bot.

**Adoption from L1–L7:** L7 now motivates the *separate recording* of
PLO4 preflop features in the
[implementation pilot](../reviews/plo-preflop-abstraction-audit-2026-10-01.md#limited-implementation-pilot-1-october-2026).
Neither the cluster count nor the formula, action frequency, skill threshold
or score weight come from L7. The fallback to the perception stage reproduced
in the [perception limit audit](../reviews/bot-perception-limit-audit-2026-09-30.md)
is a local code finding and is not retrospectively attributed to a paper. As
soon as a source actually justifies a change, the change report links source,
statement, counter-examples, tests and A/B result.

## Research work

| ID | Source and area investigated | Possible use for us | Status and limit |
|---|---|---|---|
| L1 | Southey et al., *Bayes' Bluff: Opponent Modelling in Poker*, UAI 2005; [author full text](https://webdocs.cs.ualberta.ca/~mbowling/papers/05uai.pdf), [arXiv:1207.1411](https://arxiv.org/abs/1207.1411). Heads-up **limit** Texas Hold'em and simplified Leduc Hold'em. | Keep observed actions and presumed opponent cards/strategy separate; do not upgrade weak evidence to certainty. Candidates: `bot-range-estimation.ts`, `bot-skill-perception.ts`. | **Full text evaluated**, see the L1 finding below. Neither NLHE/PLO bet sizing nor PLO hand strengths or target corridors can be derived. |
| L2 | Burch et al., *AIVAT: A New Variance Reduction Technique for Agent Evaluation in Imperfect Information Games*, [arXiv:1612.06915](https://arxiv.org/abs/1612.06915), 2016/2017. Evaluation of agents on heavily noisy poker results. | Make counter-runs with identical conditions, raw counters and uncertainty informative; first check whether more extensive variance reduction is necessary. Candidate: `simulation.ts`. | Abstract screened; full text open. The AIVAT procedure has not been decided upon for implementation and does not measure human-likeness. |
| L3 | Bina, Chen and Milgram, *A Model of Expert Decision Making in Post-Flop Betting in Poker*, [HFES 2008](https://doi.org/10.1177/154193120805200449). According to the abstract, observations and interviews on the mental models of experienced poker players. | Hypothesis: examine own hand line, opponent picture and presumed external effect separately and coherently across streets. Candidates: `bot-street-analysis.ts`, `bot-line-planning.ts`. | **Only the abstract accessible**; the publisher marks the full text as restricted access. The variant investigated cannot be determined reliably from the abstract. No section/method or action rate claim. |
| L4 | Teófilo and Reis, *Identifying Players' Strategies in No Limit Texas Hold'em Poker through the Analysis of Individual Moves*, [arXiv:1301.5943](https://arxiv.org/abs/1301.5943), 2013. Player types based on observed actions and their frequency. | Also check archetypes in NLHE for distinguishability on conditional decisions instead of only on global VPIP/AF values. | Abstract screened; full text open. Dataset and clusters are not automatically our four archetypes; no PLO transfer without a check. |
| L5 | Haaf et al., *Rational AI: A comparison of human and AI responses to triggers of economic irrationality in poker*, [arXiv:2111.07295](https://arxiv.org/abs/2111.07295), 2021. Comparison of human and AI reactions to wins/losses on the basis of Hold'em data. | Examine mental effects as limited, event-dependent behaviour changes with recovery. Candidate: `bot-mental.ts`. | Abstract screened; full text open. No evidence for PLO tilt strengths or for a blanket random error. |
| L6 | St. Germain and Tenenbaum, *Decision-making and thought processes among poker players*, [High Ability Studies 2011](https://doi.org/10.1080/13598139.2011.576084). According to the abstract 45 persons in three skill groups, 60 simulated **NLHE** hands using a think-aloud procedure. | Examine as a candidate for the skill-dependent selection of relevant situational cues and decisions on later streets. | **Only the abstract accessible**; full text access and method details open. No PLO finding and no numerical skill threshold. |
| L7 | Li and Huang, *Abstraction Agent*, [arXiv:2609.04303v1](https://arxiv.org/html/2609.04303v1), 2026. Information Abstraction; among others **PLO4 High preflop**, plus quantitative experiments for NLHE turn endgames and another game. | Candidate for separate PLO preflop features instead of a sole strength bucket: pair/rank quality, suit/flush potential, straight connectivity, four-card coordination and nut potential. Diagnosis and methodological limit in the [PLO preflop abstraction audit](../reviews/plo-preflop-abstraction-audit-2026-10-01.md). | **Full text evaluated for the PLO sections** (section 5 "Cross-game settings", section 6 "Cross-game portability", appendices A/B/E/H). 270,725 raw combinations are reduced by suit isomorphism to 16,432 representatives and there to 30 clusters. **No exploitability and no human playing quality are measured for PLO**; cluster count, LLM scores and action frequencies are not an adoption recommendation. Preprint, no PLO strategy verified by us. |

## PLO-specific practical source (not research work)

| ID | Source and area | Use and limit |
|---|---|---|
| P1 | Upswing Poker, [*Pot Limit Omaha Preflop Guide: Raising First In*](https://upswingpoker.com/wp-content/uploads/2020/04/PLO-Preflop-Guide-RFI-v4-UpswingPoker.pdf), 2020, pp. 3–6: hand classes, suit patterns, gap classes, position and solver-derived RFI charts for PLO4. | Independent practical PLO4 comparison for features and position-dependent *open* scenarios. No peer review, no human sample, no evidence for calls/3-bets or for our microstakes/bot archetypes. The numerical solver ranges are adopted neither as policy nor as target corridors. |

**Current decision status:** L7 and P1 motivate the selection of
PLO4-specific feature axes. The concrete profile definitions, skill boundaries
and small preflop score factors are local hypotheses of the linked pilot, not
adopted source values. No solver policy, bucket count or target corridor has
been adopted. The local 300-hand calibration snapshot exists; a release
approval of the pilot is pending.

## First full-text finding: L1 and access limit of L3

**L1 – actually investigated.** Section 2 (PDF pp. 1–2) describes two
players, fixed bet/raise amounts and a raise limit. The experiments in
sections 6–7 (PDF pp. 6–8) use Leduc as well as Texas Hold'em with opponents
drawn from priors, static, and 200 hands per trial. This is neither a no-limit
nor a pot-limit trial and no test of human credibility. The authors themselves
call the assumption of static, mutually independent strategies unrealistic
(section 3.1, PDF p. 3). In the larger Texas game, 200 hands could according
to section 7.2 (PDF p. 8) even be too few for a focused opponent estimate. We
therefore adopt neither their learning rate nor their model parameters as bot
values.

**L1 – robust principle.** Section 2 (PDF p. 2) separates card chance, hidden
opponent cards and unknown opponent strategy. In sections 3.3–3.4
(PDF pp. 3–4) showdowns deliver different information than folded hands: on a
fold the opponent cards remain hidden and are accounted for in the model via
possible card distributions. The "informed prior" in section 5 (PDF p. 6) is
an expert assumption, not an empirical corridor dataset. Section 7 (PDF p. 7)
also shows that a model without suitable prior assumptions can escalate into
misleading opponent pictures. **Our derivation**, not an implementation
specification from the paper: a bot must not "know" a concrete opponent hand
from a fold and should not derive any certain statement about a narrow range
from few observations.

**Separate application.** For **NLHE**, only this information principle is a
plausible criterion; multiway pots, free bet sizes, position and stack depth
must be checked independently. For **PLO four-card** hands it also applies
that opponent hole cards remain hidden after a fold, but all card
combinations, range abstractions, draw/nut evaluations and pot-limit betting
decisions require PLO-specific models and tests. No NLHE threshold, hand
class, prior distribution or target figure is adopted 1:1.

**PLO evidence gap:** L7 deals with PLO4 preflop abstraction but not with
human reads or postflop decision paths and provides no quantitative PLO
strategy validation. A PLO-specific primary piece of evidence is to be checked
separately for variant, sample and research objective before concrete PLO
strategy rules. L1 continues to support only the general information limit.

**L3 – provisional.** The
[publisher entry](https://doi.org/10.1177/154193120805200449) makes only the
abstract freely available. This reports on mental models of opponents, active
situation and one's own effect on opponents. Whether the study investigates
NLHE or PLO, how large the sample is and which concrete decision rules were
found cannot be derived from it reliably. Until a legitimately accessible full
text is available, hand-line coherence remains an **own test hypothesis**, not
an implementation rule evidenced by L3.

**Check cases before any strategy intervention:**

1. **Variant-spanning information limit:** After a fold without showdown the
   deciding bot knows neither the opponent cards nor an exact hand class; at
   showdown the hand actually shown may be observed. Test this separately for
   NLHE and PLO.
2. **NLHE-specific:** Check whether a few new actions change an opponent read
   implausibly strongly; a sequence across flop/turn/river must not suddenly
   rest on hole cards never shown. Multiway and bet-sizing cases are additional
   test cases of their own. A permissible rate of change would first have to
   be justified on the basis of our bot goals.
3. **PLO-specific:** Test the same information limit with four-card hands and
   an exactly-two-hole-cards evaluation; derive PLO draw/nut information only
   from PLO-specific perception that is accessible to the skill. Investigate
   pot-limit sizing and PLO ranges separately.
4. **Local code finding, independent of L1/L3:** The earlier fallback of
   `applyPersonalityModifiers` to objective hand/draw information is
   reproduced in the [audit](../reviews/bot-perception-limit-audit-2026-09-30.md)
   separately for NLHE and PLO and has since been corrected. This is a local
   code correction, not a strategy change derived from a paper.

## Data bases for target corridors

| ID | Source | Suitability and open check |
|---|---|---|
| D1 | [A Dataset of Poker Hand Histories, Zenodo](https://zenodo.org/records/17136841), dataset description, 2025. | A public example for raw hand histories; the large subsets described are Hold'em and partly historical competition data. Not approved as a direct PLO reference or as today's casual player pool. Content, rights, duplicates and comparability would have to be checked before use. |

For every proposed target corridor the following will in future be recorded
separately: variant and format, stakes/era/player pool, metric definition with
numerator and denominator, sample size, dispersion/uncertainty, archetype
assignment as well as licence and origin of the data. Self-play values are
**test results of the bot**, not independent evidence for human target values.
If no comparable data source exists, the corridor explicitly remains
preliminary. Existing target corridors are not changed by this register.

## Next evaluation step

1. L1 is evaluated with variant and method limits; L7 is evaluated only for
   PLO4 preflop abstraction and does not yet justify any strategy change. For
   L3, only continue with lawful full text access; otherwise search for an
   openly accessible primary study on human hand-line decisions and evaluate
   it separately; L6 is an NLHE candidate but likewise only accessible as an
   abstract. A PLO4 primary source on **human reads or decision paths** is
   being searched for separately. L2, L4 and L5 follow only in the case of the
   corresponding measurement, archetype or mental question. For the PLO preflop
   question, first work through the linked abstraction audit and its
   comparison cases. Per work, adopt only verifiable statements with
   page/section reference and transfer limit.
2. Keep the corrected perception limit protected against regression in later
   strategy work; new downstream modifiers must not use objective values
   unnoticed as bot knowledge.
3. The current
   [opponent read audit](../reviews/opponent-reads-information-flow-audit-2026-09-30.md)
   separates information limit, read data hygiene and strategic gaps. Test the
   opponent-read scenarios still open for NLHE and PLO separately; compare
   against unchanged seeds, raw metrics and formats that are already correct.
4. Only after a separate data audit submit proposals for target corridors with
   concrete sources and effects for approval.
