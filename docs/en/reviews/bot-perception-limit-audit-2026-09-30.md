# Audit: Perception Limit of the Bot Decision

> German original: [Audit: Wahrnehmungsgrenze der Botentscheidung](../../de/reviews/bot-wahrnehmungsgrenze-audit-2026-09-30.md)

Status: Diagnosis of 30 September 2026; check the findings against current code.

As of: 30 September 2026 · Perception limit corrected, regression checked

## Finding

Before the fix, `decideAction` produced a skill-dependent context with
`applySkillPerception(context)`. `scoreActions` received that context;
afterwards `applyPersonalityModifiers` again received the original objective
`context` (`packages/client/src/bot-pipeline.ts`). The debug export already
kept the two perspectives separate, the score pipeline did not yet do so
consistently.

Two deterministic tests in `bot-pipeline.test.ts` evidence the previous
information backflow and now check the corrected behaviour:

| Variant | Perception at test skill | Call modifier before (objective) | Afterwards (perceived) |
|---|---|---:|---:|
| NLHE, Skill 0 | Flush draw is missed (`drawTypes = []`) | +3.75 | +1.875 |
| PLO 4 cards, Skill 20 | Wrap quality and then draw are missed (`drawTypes = []`) | +1.4423 | +0.7212 |

The difference arose in `bot-action-modifiers.ts`: `isDeadAir` read the
objective draw status and did **not** halve the personality influence for
perceived air. These are deliberately constructed pipeline inputs with legal
actions, not full hand evaluation integration tests and not claims about the
frequency of such hands in live play. The numbers are score contributions, not
probabilities or measured action rates.

## Correction and Remaining Design Questions

- `applyPersonalityModifiers` now receives the same perceived context as
  `scoreActions`. This includes the downstream habits, short stack factors, line
  commitment and bet-fold modifiers.
- `deriveStateUpdates` receives it as well. An NLHE river test guards this: for
  the same legal bet action the bet-fold marker is only set if the required
  hand strength was perceived. Skill 100 serves as a control case. PLO does not
  use this NLHE-specific plan.
- `applySkillPerception` changes strength, draws, outs, pot odds and opponent
  ranges, among other things, but currently not the hand category or board
  texture. Whether these coarse terms should become skill-dependent as well is
  a **design question**, not a bug proven from these tests.
- Legal actions, game phase, public board cards and chip amounts remain
  unchanged in the perception context. Objective hand evaluation and opponent
  ranges remain separately available in the `DecisionResult` for diagnostics.

## Not Yet Part of This Fix

- A redefinition of the skill-dependent hand category, board texture or
  opponent history. This requires its own, variant-specific design rationale.
- An adjustment of personality, target corridors or calibration snapshot. NLHE
  and PLO strategy rules remain separate.
- A manual play session or a full 10k/3k release gate.

## Verification After the Fix

`npm run test -w @cpc/client -- --run src/bot-pipeline.test.ts`:
63 tests passed. Entire client suite: 457 passed, 1 existing TODO.
Client build including the TypeScript check successful.

`npm run test:calibration`: 24 combinations, 0 errors, 1 warning:
NLHE/LAG/Full Ring turn C-bet 38.10 → 42.86 per cent (+4.76 percentage points).
The snapshot was not changed. `npm run test:stakes` confirms the blind scaling
invariant for NLHE and PLO. Build warnings about the Vite config and a
>500 kB chunk size are independent of this fix.
