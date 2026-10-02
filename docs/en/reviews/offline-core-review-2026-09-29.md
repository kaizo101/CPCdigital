# Offline Core: Review and Correctness Addendum (29 September 2026)

Status: historical diagnosis and correctness state of 29 September 2026.

## Scope

This addendum covers the local NLHE/PLO engine and the `LocalGameRunner`. The
dormant server package is explicitly not part of the technical review or of the
changes. It supplements the historical [earlier review](review-2026-08-07.md),
but does not replace its version state of the time.

The check used targeted reproductions, deterministic and randomised hand
sequences, independent showdown comparisons as well as the existing workspace,
stake and calibration checks. The results prove no general correctness; in
particular they do not replace a complete formal verification of all betting
sequences.

## Confirmed Findings and Corrections

| Area | Reproduced error or risk | Correction and safeguarding |
|---|---|---|
| Uncontested Pot | An uncalled raise was booked as a pot win instead of a return of one's own bet. | Before the payout the uncalled portion is returned. Test checks `UncalledBetReturned`, award and final stacks. |
| Orphaned side pot | After the later fold of all players of an upper pot layer a short stack could receive the foreign side pot, or the showdown could abort with "no eligible players". | The layer goes to its last still-eligible contributor; the fold order comes from the hand history. Three-player and four-player reproductions check separate awards and chip conservation. |
| End of hand in the local runner | Nested synchronous bot error handling could book the same hand twice into the session stats. | A one-time barrier related to the hand number is set before the hand-end effects and reset during setup/cleanup; the regression injects a bot RNG error. |
| Input boundaries | Action types unknown at runtime, fractions of cents and a too large PLO table could only become apparent after a state change or when dealing, respectively. | Early validation before mutation and before the hand starts; tests also check that state and history remain unchanged on rejection. |
| Seat and dealer order | The engine could confuse array order with physical seat order; removing/moving a seat could shift the dealer anchor. | Players are ordered by `seatIndex`; dealer and preferred first dealer are resolved when moving/removing via their identity or the physical successor, respectively. |
| Configuration alias | Later mutation of the passed configuration object could influence the blinds of the engine. | The engine keeps its own copy of the configuration; test mutates the original object. |

The isolated diagnostic checks found no deviating hand evaluation in 800
independent NLHE/PLO showdown comparisons. 400 deterministic valid random hands
ended without chip loss or standstill; in 147 uncontested hands, however, the
return/award error named above became visible. After the side pot correction 300
additional force-fold sequences ended without standstill, chip loss or a
deviating award sum. These samples are supplementary evidence, not proof.

## Verification and Remaining Limits

- Workspace tests and build passed; stake invariance for NLHE and PLO passed;
  the deterministic 300-hand calibration smoke test passed all 24 combinations
  without warning or error.
- The known Vite warning about the large client chunk remains a separate
  build/structure topic, not an error of this correctness block.
- `PublicGameState.sidePots` is still not maintained during the running hand as
  a live breakdown. The final pot settlement uses the contribution data; if the
  UI or later consumers need live side pots, this requires its own state model
  and its own tests.
- Further bot heuristics, especially PLO draw/nut perception and the action
  selection, are not declared correct by this engine addendum. They are checked
  as a separate, reproducible block.
- A deliberately faulty observer/export callback can still fail outside the bot
  error handling. For normal valid states this was not reproduced as a
  production error; recovery boundaries are a separate integration topic for
  0.8.3.

No target corridors, calibration snapshots or server paths were changed.
