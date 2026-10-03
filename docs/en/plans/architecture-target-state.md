# Historical Architecture Target State

> German original: [Historisches Architektur-Zielbild](../../de/plans/architektur-zielbild.md)

This older structural draft is not a description of the current file tree.
For the current state see the [architecture overview](../../../ARCHITECTURE.md); for
prioritisation see the [roadmap](../../../ROADMAP.md).

---

## Technical structure

```text
packages/
├── client/src/                    currently flat, long-term:
│   ├── session/                   LocalGameRunner, rebues, replay, export
│   ├── components/                PokerTable, PlayerSeat, Cards
│   ├── screens/                   SetupScreen, TableScreen
│   └── utils/                     format, positions
├── poker-engine/                  rules, state machine, hand evaluator
├── shared/                        shared types
├── electron/                      desktop wrapper (main, preload)
├── server/                        dormant online prototype for a possible v2 integration
│
│   # Target architecture (not yet implemented):
├── variant-modules/               NLHE, Omaha, 2-7 Draw, Stud (one folder each)
├── bots/                          decision engine, personality, reads, mental state
├── analysis/                      decision records, replay, session analysis
└── knowledge/                     wiki, tutorial and puzzle content
```

---

## Transition to the learning platform

Until version 1.0 the app remains primarily a stable singleplayer poker game.
It is, however, already built in such a way that every decision can later be
explained, replayed and used as learning content.

```text
Before v1.0:
play, test bots, save hands, make decisions traceable

From v1.0 onwards:
explain, train, analyse and generate personal puzzles
```

### Core idea

> First build a good poker game. But in doing so, do not lose any data or
> architectural decisions that will later be needed for a good learning
> platform.
