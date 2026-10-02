# Audit: Information Flow of the Opponent Reads

> German original: [Audit: Informationsfluss der Gegner-Reads](../../de/reviews/gegner-reads-informationsfluss-audit-2026-09-30.md)

Status: Diagnosis of 30 September 2026; check the findings against current code.

As of: 30 September 2026 · **Audit with a subsequent data hygiene fix; no new bot strategy**

## Observation up to the Decision

| Stage | Actually available in the code | Limit |
|---|---|---|
| Engine | `getPublicHandHistory()` delivers public actions; `CardsRevealed` only at showdown, not on a win without showdown. | Concealed opponent cards remain private until an actual disclosure (`packages/poker-engine/src/game.ts`). |
| Current decision | `createBotContext()` records own hole cards, public state, legal actions and only blind/action events of the current hand. | No opponent hole cards; the new PLO test checks this with four own cards (`bot-context.ts`). |
| Persistent reads | `observeOpponentHistory()` processes new `PlayerActed` events per bot and hand via a cursor. VPIP, aggression, fold read and bet sizes are stored. | `CardsRevealed` is currently ignored; even a shown showdown yields no card-related read (`bot-opponent-observation.ts`). |
| Current opponent range | `analyzeStreetAction()` collects public hand lines/positions; `estimateOpponentRanges()` derives a coarse score from them. | The paired-board/card-removal heuristic is explicitly **NLHE-only**. PLO currently uses only generic action/position signals here (`bot-range-estimation.ts`). |
| Bot valuation | `applySkillPerception()` dampens position, board and card-removal signals, among others; after the previous fix the modifiers also receive this context. | Persistent sizing tells have their own skill and sample gate, not the general `shouldActOnRead` gate. |

## Findings, Sorted by Impact

1. **No proven hole card leak.** The engine does not reveal opponent cards
   before the showdown, the bot context does not carry them, and ranges use
   public lines plus own cards. NLHE and PLO 4-card boundaries are tested
   separately. This is a positive finding, not a statement about whether the
   estimated ranges are strategically good.
2. **Fixed – forced actions distorted reads.** `forceFold()` produces a public
   `PlayerActed` with `source: 'forced'`. The observer now ignores such events
   for VPIP, aggression, fold read and sizing; the event cursor nevertheless
   still advances. The decision is public, but is no voluntary behaviour
   evidence. The exact effect on older session results was not measured
   retrospectively.
3. **Fixed – "Fold-to-Bet" had a wrong denominator.**
   Previously an open raise without a demanded call (`toCall = 0`) also
   increased `no-fold`. Now fold and continued play only count at
   `toCall > 0`, that is, in an actual facing-bet situation. The value is not
   used directly by `bot-action-scoring.ts` for action bonuses; the cleaned-up
   `effectiveObservations` can, however, indirectly change the read confidence
   and thus other adjustments.
4. **Design gap, no rule violation – revealed cards are not learned.**
   At the showdown, `CardsRevealed` is legally public, after a fold without
   showdown it is correctly missing. The observer currently uses both cases
   only via actions, not via revealed hand categories. A possible extension
   must treat NLHE two-card and PLO four-card hand evaluation **separately**;
   no concrete rule or rate follows from this audit.
5. **Check point – two read gates.** General opponent statistics become
   strategically effective only after `shouldActOnRead()` and a later confidence
   check. Sizing tells, in contrast, read the persistent raw read directly, with
   their own gate (skill ≥30, at least three sizing observations). That is not
   automatically an error, but it should be documented as a deliberate product
   rule with boundary value tests. In particular to be checked: whether the bet
   just observed is subtracted from the historical mean exactly once in the
   comparison.
6. **PLO-specific evidence gap.** The generic hand line range also applies in
   PLO; the NLHE paired-board heuristic is deliberately **not** applied there. A
   PLO-specific board/nut/redraw range interpretation does not yet exist in this
   module. That is a later strategy decision, no reason to copy NLHE parameters.

## Showdown Cards: Skill Boundary for a Later Extension

The data hygiene fix introduces **no** read from revealed cards. `CardsRevealed`
remains public for all bots, but `observeOpponentHistory()` still does not
evaluate it. The user note is recorded as a requirement for the next strategic
block: visibility is not the same as interpretability. Low-skill bots should
not automatically use a revealed hand as a reliable opponent read. Whether and
how strongly a bot derives a tendency from it must depend on its skill and
additionally take sample/confidence into account; a single hand is not a
perfect profile. A hard jump at a skill threshold would only make sense with
an explicit rationale; otherwise the influence starts at zero at the threshold
and rises steadily. No threshold or score effect has been determined yet.

Before an implementation, hand context and variant rules are to be separated:
Only genuinely disclosed hole cards after the showdown are permissible, never
concealed cards or a win without showdown. NLHE two-card and PLO four-card hand
categories must not be transferred onto one another; reads need a variant
context. Tests should in particular check below/at/above the skill boundary,
with several showdowns as well as without showdown, that no information
prematurely or from a foreign variant enters a decision. Only then adaptive
calibration; no silent shift of the target corridors.

## Verification

At the audit: targeted tests for context, observer, ranges, street analysis and
read state 50 passed, among them PLO 4-card privacy and NLHE-vs.-PLO
paired-board isolation. Engine hand history: 6 passed; client suite: 459 passed,
1 existing TODO. After the data hygiene fix: two new observer regression tests
and the entire `npm test` suite with 616 passed tests, 1 existing TODO.
TypeScript check passed; `npm run test:stakes` passed for NLHE/PLO. The
deterministic 300-hand calibration comparison over 24 combinations reported
0 errors and 2 warnings against the old snapshot: NLHE LAG Full Ring Turn-C-Bet
38.10 → 42.86 % (already present before this fix) and PLO LAG Full Ring
Fold-to-C-Bet 35.58 → 39.81 % (new in the comparison). With only 300 hands per
combination this is a regression signal, no proof of a permanently wrong target
range. A subsequent targeted 3k run for PLO LAG Full Ring yielded Fold-to-C-Bet
47.1 % (target 38–46 %), 3-Bet 16.72 % (8–16 %), Turn-C-Bet
44.2 % (45–54 %) and AF 1.77 (2.0–4.2); WTSD lay unrounded minimally below
28 %. These deviations are observed, **not** causally attributed to the read
fix. The baseline snapshot was not changed.

### Control Comparison: PLO LAG Full Ring, Deterministically 3k Hands

For narrowing down the cause, in each case **only one** of the two most recent
corrections was temporarily reverted; all other local changes, seeds and
parameters remained the same. Both corrections were restored afterwards.

| Metric | Target | Both fixes active | Without read hygiene fix | Without perception limit fix |
|---|---:|---:|---:|---:|
| 3-Bet | 8–16 % | 16.72 % | 16.69 % | 16.72 % |
| Fold-to-C-Bet | 38–46 % | 47.1 % | 46.4 % | 47.0 % |
| Turn-C-Bet | 45–54 % | 44.2 % | 44.2 % | 44.2 % |
| AF | 2.0–4.2 | 1.77 | 1.75 | 1.77 |

Thus the four deviations did not arise from one of the two most recent fixes.
The read correction shifts Fold-to-C-Bet in this run by about +0.7 percentage
points, but does not explain the fundamental finding. WTSD lies directly at the
28 % lower bound (1345/4806 = 27.99 % with both fixes) and is not interpreted as
an independent structural problem.

A further **check note, no confirmed bug**: The PLO LAG position table shows,
in the same run, VPIP 45.30 % in early position and 29.22 % in late position.
The PLO preflop strategy table takes archetype, hand category, betting situation
and format into account, but no position; a late player meets a previous open
more often. That could co-cause the reversal, but is not proven from the
aggregated numbers alone. Before a score calibration, opportunities separated
by position **and** situation would be the more sensible next diagnostic point.
The low AF stems primarily from the non-PFA share (1.12 compared to PFA 4.24),
not from missing preflop initiative.
