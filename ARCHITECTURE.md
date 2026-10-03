# Current architecture

This document describes the implemented offline application, not the intended
future module layout. Start with [DEV.md](DEV.md) for commands and workflows,
[CONTRIBUTING.md](CONTRIBUTING.md) for change checks, and [ROADMAP.md](ROADMAP.md)
for planned work. The older [architecture target state](docs/en/plans/architecture-target-state.md)
is historical and must not be read as the current package tree.

## Runtime and ownership

CPCdigital currently runs the game locally. The browser demo, Electron desktop
shell and Capacitor Android prototype all use the same React client and poker
engine. The `server` workspace is a dormant online prototype; it is not in the
offline game path and is not started by `npm run dev`.

| Layer | Owns | Main entry points |
|-------|------|-------------------|
| `packages/shared` | Cross-package game, action and event types | [`src/index.ts`](packages/shared/src/index.ts) |
| `packages/poker-engine` | Authoritative hand state, legal actions, turn order, betting, pots and showdown | [`game.ts`](packages/poker-engine/src/game.ts), [`side-pot.ts`](packages/poker-engine/src/side-pot.ts), [`hand-evaluator.ts`](packages/poker-engine/src/hand-evaluator.ts) |
| `packages/client/src/session` | Offline session orchestration, bot scheduling, rebuys, presentation timing, statistics, replays and exports | [`LocalGameRunner.ts`](packages/client/src/session/LocalGameRunner.ts) |
| `packages/client/src/bot-*` and variant evaluators | Bot context, hand interpretation, reads, skill perception, scoring and action selection | [`bot-context.ts`](packages/client/src/bot-context.ts), [`bot-tag.ts`](packages/client/src/bot-tag.ts), [`bot-pipeline.ts`](packages/client/src/bot-pipeline.ts) |
| `packages/client/src/screens` and `components` | Setup, table, replay and debug presentation | [`App.tsx`](packages/client/src/App.tsx), [`SetupScreen.tsx`](packages/client/src/screens/SetupScreen.tsx), [`TableScreen.tsx`](packages/client/src/screens/TableScreen.tsx) |
| `packages/electron`, `android/` | Desktop and Android hosting of the client | [`main.ts`](packages/electron/src/main.ts), [`capacitor.config.ts`](capacitor.config.ts) |

The engine, not the UI or a bot score, is the final authority on whether an
action is legal and how chips move. `PokerGame` keeps the deck, private cards,
round and hand contributions, folded/all-in sets and betting state internally.
It exposes cloned public state, an actor-specific view and public hand events.
[`GameVariant`](packages/poker-engine/src/game-variant.ts) defines hole-card
count, betting structure and phase order; the engine implements NLHE and PLO
through the corresponding variant definitions.

## One hand through the system

```text
App / SetupScreen
  -> LocalGameRunner.setupTable() and startHand()
  -> PokerGame.startHand(): dealer, deck, cards, blinds, first actor
  -> engine betting context and legal actions
     -> hero: TableScreen action -> runner -> PokerGame.applyAction()
     -> bot: actor view -> BotContext -> bot decision -> runner timer
             -> PokerGame.applyAction()
  -> engine advances actor or street, then settles the hand
  -> runner captures results, replay/debug data and session statistics
  -> presentation delay, rebuy/replacement processing, next hand
```

[`PokerGame.applyAction()`](packages/poker-engine/src/game.ts) validates the
actor and action before advancing the engine. The engine handles betting-round
completion, all-in runouts, uncalled-bet returns, side pots and showdown.
[`LocalGameRunner`](packages/client/src/session/LocalGameRunner.ts) subscribes
the UI to session updates and adds timing and presentation around those engine
transitions. It also holds bot identities, reads, mental state and session
artefacts; these are not poker-rule authority. The UI reads the runner's state
projection and the engine-provided betting context rather than maintaining an
independent legal-action model.

Bot decisions are calculated before their artificial delay. When the timer
fires, the runner checks that the same bot still owns the turn; the engine
validates the action again when it is applied. `cleanup()` and rescheduling
cancel pending timers. This describes the present safeguards, not a guarantee
that every asynchronous edge case has been proved absent.

## Bot information and decision flow

The information boundary is
[`PokerGame.getPlayerView(botId)`](packages/poker-engine/src/game.ts) plus
[`getPublicHandHistory()`](packages/poker-engine/src/game.ts).
[`createBotContext()`](packages/client/src/bot-context.ts) copies only that
bot's own cards, public state, engine-derived betting context, position and
public blind/action events. It rejects calls outside the bot's turn. Other
players' unrevealed cards are not part of this decision context. Session debug
exports can contain private cards for diagnosis, but that export channel is
separate from the bot input.

1. [`bot-tag.ts`](packages/client/src/bot-tag.ts) builds a decision context:
   the registered [variant evaluator](packages/client/src/bot-variant-registry.ts)
   assesses the hand; street history, opponent ranges, preflop range action,
   legal actions and pot/stack metrics provide the remaining inputs.
2. [`bot-pipeline.ts`](packages/client/src/bot-pipeline.ts) applies
   [skill-dependent perception](packages/client/src/bot-skill-perception.ts),
   then [scores actions](packages/client/src/bot-action-scoring.ts), applies
   [personality modifiers](packages/client/src/bot-action-modifiers.ts) and
   makes a [weighted selection](packages/client/src/bot-action-selection.ts).
   Decision diagnostics retain objective and perceived values separately.
3. The bot entry point updates hand memory, converts the selected candidate to
   a legal action, and returns it to the runner. The engine remains the final
   validator. Reads, habits, mental state and line memory influence later
   decisions; a bot does not receive a perfect-information solver output.

### How action scores are composed

The engine first supplies the legal action set; the bot does not score an
arbitrary move. Skill-dependent perception can alter the bot's interpretation
of its available information before scoring. For each candidate,
[`bot-action-scoring.ts`](packages/client/src/bot-action-scoring.ts) adds labelled
rule contributions to `params.scoring.utilityBaseline` and clamps the result
to 0–100. Contributions can reflect hand assessment, price and stack risk,
position, public action history, opponent reads and variant-specific strategy;
not every factor applies to every action or street.

[`bot-action-modifiers.ts`](packages/client/src/bot-action-modifiers.ts) then
adds personality, habit, mental-state and hand-line contributions and clamps
the utility again. It can also make a candidate ineligible for strategic
reasons. Selection considers only eligible candidates with positive utility
within 85% of the best utility, drawing among them with weights proportional
to their utilities; the [selection module](packages/client/src/bot-action-selection.ts)
defines the fallback when none qualify. These utilities compare actions for
this bot in this situation. They are **not** win probabilities, expected chip
values or solver outputs. The labelled contributions in decision diagnostics
show why a candidate gained or lost utility; individual weights remain in the
code and are subject to calibration.

NLHE interpretation lives in
[`nlhe-hand-evaluation.ts`](packages/client/src/nlhe-hand-evaluation.ts);
PLO interpretation lives in
[`omaha-hand-evaluation.ts`](packages/client/src/omaha-hand-evaluation.ts).
Shared scoring code does not make variant-specific assumptions automatically
transferable. The evaluator and its tests must be checked when changing a
rule or adding a variant. The procedural checklist is in
[DEV.md](DEV.md#adding-a-new-variant).

## Session data and platform boundaries

The runner captures a readable hand history and replay data separately from
the fuller JSONL debug export. The export can expose hidden cards and bot
reasoning; it is an owner-facing diagnostic artefact, not public game state.
The client persists returning bot identities and a bounded hand-replay archive
in local storage. Current-session history and diagnostics are assembled in the
runner and exported explicitly; there is no active server-side session store.

Electron loads the built client locally, and Capacitor packages the same client
for Android. Platform-specific code handles windows, native lifecycle and file
export, not betting or hand evaluation. The dormant server workspace has its
own setup instructions in [DEV.md](DEV.md#starting-the-dormant-server-prototype-locally)
and should not be inferred to be part of the offline dependency chain.

## Boundaries and change checks

- Engine-rule changes belong in `packages/poker-engine` with unit and invariant
  tests for legal actions, turn order, pots and showdown. Session tests then
  check their effect on the runner.
- Bot strategy changes belong in the client bot modules and need variant-specific
  tests plus calibration triage. Target corridors are diagnostic guide rails,
  not a substitute for rule correctness or plausible decisions.
- UI changes must not duplicate engine state or legal-action rules. Check the
  affected browser, Electron and Android presentation paths as appropriate.
- NLHE and PLO are the implemented variants. The type model reserves draw
  phases, but `PokerGame` does not execute them; adding draw/stud is not just
  a configuration change.

These boundaries describe the current design, including some deliberately
large modules. Planned splits belong in the [roadmap](ROADMAP.md) and the
[0.8.3 refactoring scope](docs/en/plans/refactoring-v0.8.3.md), not here as if
they had already landed.
