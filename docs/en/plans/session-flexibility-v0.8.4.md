# v0.8.4 — Session flexibility and table QoL

Status: planning state under the previous version number; re-scoping open.

This document specifies the feature scope of version 0.8.4, which is
summarised in the [roadmap](../../../ROADMAP.md).

## Session setup

- Make the hero name selectable in the setup instead of permanently using
  `You`.
- Support individual starting stacks per bot.
- Make the buy-in limits between 40 and 250 BB configurable.
- Choose variant and difficulty mix together in the session setup.
- Restrict the blind selection to the maintained presets. Remove the
  `Freie Eingabe` entry and the separate number fields for small and big blind
  on desktop and Android; the starting stack or respectively later buy-in
  remains configurable separately from that. Selection, validation and stored
  options may then no longer presuppose an unreachable custom blind state.

## Preselected actions and clock

- Introduce a central `pendingHeroAction` pipeline and revalidate every
  preselected action against the current betting context at the start of the
  turn.
- Initially offer only safe pre-selections: `Check`, `Check/Fold`, `Fold` and
  amount-dependent `Call`. Selections that have become invalid are deleted;
  `Call any` and automatic raises remain excluded.
- Prepare the optional clock profiles `Entspannt`, `Standard` and `Schnell`. A
  timeout checks for free or folds, but never automatically commits chips.
- Stop the clock on background, device lock and controlled app pause.
  Warnings, time bank and timeout source must be replayable.

## Information at the table

- **All-in equity:** As soon as all remaining players are all-in and no action
  is pending, display win and split probabilities before the runout. NLHE and
  PLO rules are secured with deterministic reference hands.
- **Current made hand:** Optionally name the currently best hand of the hero
  at the table and in the replayer. NLHE uses the best five-card combination,
  PLO mandatorily exactly two hole cards and three board cards. The display
  remains descriptive and contains neither draw/equity values nor
  recommendations.
- **Diagnostic hand ID:** In addition to the session-local number, display a
  cross-session unique, seed-neutral and copyable ID at the table, in the
  replayer and in exports. After the hand ends, the debug export links it to
  variant, table configuration, bot identities, initial states and a protected
  reproduction key or respectively canonical snapshot. The visible ID must not
  make unknown cards derivable.

## Bot stacks and seat changes

- Round up rebuy target stacks derived from the personal BB policy to a
  sensible monetary level that fits the chip unit, without lowering the rebuy
  trigger. Avoid amounts like `$1,14` and record the rounding consistently in
  the replay and in the session statistics.
- Model the existing `rebuyWhenShortBb` policy together with deep stack cash
  out between hands and make it visible in the debug export.
- Test thresholds, rebuy limits and replacement player sequences
  deterministically. When sitting out due to too few BB, the actually cashed
  out stack is displayed instead of incorrectly labelling the seat with
  `0,00`.

## Bot identities

New identities, repetition control, cross-stake pools, variant competence and
later player notes follow the central document
[Bot dynamics, stake roster and player notes](../concepts/bot-dynamics-roster-and-notes.md).
0.8.4 implements neither a rigid quota nor a separate roster per variant.

## Release gate

- Integration test for setup → several hands → rebuy or respectively cash out
  and replacement players.
- Sequence tests for pre-selection after check, bet and reraise as well as for
  clock/resume edge cases on desktop and Android.
- Equity, made-hand and hand ID displays remain purely informative and change
  neither engine state nor bot decisions or deterministic replays.
