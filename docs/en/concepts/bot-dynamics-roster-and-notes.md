# Bot Dynamics, Stake Roster and Player Notes

Status: substantive target state; the binding version assignment is set out in
the roadmap.

## Target state

Bot identities should remain recognisable in the long term without becoming a
static solution after only a few sessions. Four levels are therefore kept
cleanly separate:

- **Archetype** determines the long-term baseline of the playing style.
- **Skill** determines how reliably a bot recognises patterns, classifies them,
  answers them and regulates emotional deviations.
- **Mental state** produces time-limited deviations through tilt, confidence,
  patience, momentum and opponent-specific frustration.
- **Session and opponent context** determines against whom, in which position
  and on the basis of which sample an adaptation applies.

A read should improve the user's decision but never deterministically reveal
the next action of a bot.

## Implementation state 0.8.2 (2 October 2026)

The first anti-steal cut observes exclusively public preflop actions: unopened
opportunities recorded separately per opponent, and open raises from the button
or the cutoff. Limps, reraises, forced actions, heads-up situations and open
shoves are not steal attempts in this read. A bot in the blind reacts only
against a single such opener, after at least six opportunities in exactly this
position and above the existing skill threshold for position-specific ranges
(skill 40: no effect yet). The sample effect grows up to 14 opportunities; the
score intervention remains limited to already playable hands and rewards no
all-in. Calling stations rather shift calls, LAGs rather suitable reraises;
PLO deliberately receives a smaller effect than NLHE.

This is a conservative start, **not** a finished anti-exploit control loop:
the success rate of steals, counter-adaptation by opponents and emotional
overreactions are not connected yet. The 300-hand comparison still reports
eight warnings and the two PLO drift cells already documented; target
corridors/baseline were not changed.

## Evidence from the 100-hand probe session for v0.7.9

- Hand #18 is not an isolated all-in outlier. The problematic point is the
  preceding preflop escalation: generic `strong` scores and position/SPR
  bonuses can overrule an explicit fold preference of the range even in 4-bet
  and 5-bet chains.
- Comparable range conflicts occur, among others, in hands #10, #73, #92 and
  #99. Before further anti-steal 3-bets, the actual raise level must therefore
  be modelled structurally.
- The user opened from the button in hands #26, #32, #56, #74 and #98; all
  five steals against Finn and Jan succeeded without resistance.
- The existing opponent reads are general, not position-specific. There is no
  dedicated detection of repeated button/cutoff steals or of successful blind
  attacks.
- Across the entire export there was no decision rationale via `Tilt` or
  `Low confidence`. Juno's visible change can largely be explained by card and
  short-stack dynamics.
- Mental events, opponent-specific frustration and momentum are partially
  prepared but not yet fully recognised or connected as scoring consumers.

## Strategic adaptation and emotional reaction

The same visible counter-play must not have the same cause for every bot.

### Strategic reaction

A skilled bot should:

- observe steal opportunities separately by position and opponent,
- act only with a sufficient sample,
- expand blind defence in a controlled way,
- select calls and 3-bets on the basis of suitable hands,
- react to counter-adaptations by the user,
- return to the baseline after misjudgements.

### Street-spanning hand lines (open for 0.8.2)

The existing action history does preserve visible actions, and there are
individual turn barrel and river bet-fold rules. The intention of the
**chosen** flop action, however, is not retained in general in the hand
memory: `determineLineCommitment()` recomputes the plan on every decision
from the current hand/board evaluation. A bluff can therefore lose its
rationale, or an aggressive line can arise that the bot had not started in
the first place.

For the running hand, the chosen line should be preserved with its starting
street, intention (value, protection, semi-bluff, bluff or pot control) and a
limited continuation frame. On the next street it is **re-evaluated** whether
public opponent actions, board changes, hand/draw quality, stack risk and bet
price still bear the continuation. The result is `fortsetzen`, `umplanen` or
`aufgeben` with a visible debug reason. "Commitment" means plan coherence
here, not sunk-cost justification: a bluff aborted in good time can be the most
consistent decision.

Skill influences whether and how reliably a bot forms and revises such a line;
archetype and later mental events can alter the execution without
retroactively reinterpreting the strategic plan. NLHE and PLO receive separate
continuation/abort conditions: in PLO in particular, turn cards can change the
nuts hierarchy and draw quality more strongly. No bot acquires knowledge of
hidden opponent cards as a result.

Acceptance tests compare the same flop intention with a favourable and an
unfavourable turn card as well as after the opponent's check, call and raise;
they check continuation **and** justified abort, skill differences, the
NLHE/PLO separation and the absence of forced multi-street bluffs or
uncommitted deep-stack shoves.

**First implementation cut:** An actually chosen, unopened flop bet with the
intent `bluff` or `semi-bluff` remains in the hand memory until the turn
decision. A narrow turn review uses the perceived hand, public counter-play
and separate NLHE/PLO conditions. Its result (`continue`, `replan`, `abort`
or, if skill is too low, `unrecognized`) appears in the debug output; the
line then runs out. The evaluation only adds a small, skill-weighted impulse
to the existing turn rules and rewards no all-ins; a review is not a hard
action constraint. Value, protection and pot-control lines remain out of scope
for now. Complete street-spanning planning up to the river remains open.

### Emotional reaction

A weaker or more emotional bot can:

- classify repeated pressure only late or incorrectly,
- build up opponent-specific frustration,
- give back too early, too large or with unsuitable hands,
- instead of a correct 3-bet also react with a donk bet, check-raise or
  call-down outlier,
- become far too tight after a failure,
- deviate from its own baseline for longer or in waves.

Archetypes remain relevant here: under tilt a nit can become even more
passive, a LAG can overplay, and a calling station will rather keep calling
out of spite than suddenly find technically good bluff 3-bets.

## Skill as the direction of the session dynamics

Skill is not merely a linear strength bonus and should not turn bots into
solvers.

- **Low skill:** archetype quickly recognisable, repeatable leaks,
  result-oriented or delayed adaptations, longer emotional phases.
- **Medium skill:** partly correct reads, noisy or excessive countermeasures,
  recognisable recovery.
- **High skill:** context- and position-dependent adaptation, better hand
  selection, controlled variation and shorter or better regulated tilt phases.

High skill does not completely prevent tilt. Tilt sensitivity, emotionality
and archetype still determine whether and how strongly a player reacts; skill
particularly influences classification, quality of action and duration.

Showdown cards displayed in public are not automatically an opponent read:
low-skill bots should where appropriate not include them in later decisions
at all. For higher skills, the derivation from the shown hand **and** the
previous action line needs a separately checked, sample-dependent effect.
NLHE and PLO remain separate; threshold, effect curve and concrete score
effect are still open. The
[information flow audit](../reviews/opponent-reads-information-flow-audit-2026-09-30.md#showdown-cards-skill-boundary-for-a-later-extension)
describes the deferred limits and tests.

The following applies as a state sequence:

```text
Base style
  -> Pattern recognised or emotionally hit
  -> Temporary strategic or emotional deviation
  -> Recovery / re-evaluation
  -> Base style
```

## Stakes-dependent player pools

Stakes do not directly change an action score. They determine the distribution
of suitable identities and skill corridors when the table is populated.
Adjacent pools overlap so that known opponents can credibly move up or down.

Illustrative starting point, not to be read as a fixed ratio before
calibration:

| Stakes | Calling Station | Nit | TAG | LAG |
|---|---:|---:|---:|---:|
| Micros | 35 % | 25 % | 25 % | 15 % |
| Low | 20 % | 25 % | 35 % | 20 % |
| Mid | 5–10 % | 20 % | 40 % | 30–35 % |
| High | 0 % | 15–20 % | 40–45 % | 35–45 % |

Principles:

- On the micros all archetypes remain available.
- Calling stations remain deterministically in the low-skill range, become
  rarer as stakes rise and are absent entirely at high stakes.
- Higher stakes make archetypes subtler, not invisible or perfect.
- Between stake bands there are skill and roster overlaps instead of hard,
  artificial boundaries.
- An identity keeps archetype and plausible skill corridor across sessions;
  stakes do not reshuffle a known bot into a different personality.

## Variant-spanning identities and competence

The global roster remains variant-spanning. Fully separated NLHE, PLO, draw and
stud rosters would unnecessarily dissolve recognition, notes and long-term
rivalries. Instead each identity receives a general poker competence and
correlated competences for variant families.

```text
BotIdentity
├── generalSkill
├── variantProficiency
│   ├── nlhe
│   ├── plo
│   ├── draw
│   └── stud
└── variantAffinity
    └── frequent / occasional / not in the regular pool
```

`generalSkill` influences transferable abilities such as observation, read
quality, logical consistency, emotional regulation and recovery duration.
`variantProficiency` influences in particular ranges, hand/draw evaluation,
board understanding, sizing or fixed-limit lines and typical mistakes. The
values are correlated deterministically instead of rolled independently: a
generally good player may have a clear secondary variant but should not appear
completely incompetent there without reason.

The archetype initially remains stable as a long-term basic personality and is
expressed technically differently in each variant family. A LAG shows itself
for example in NLHE through wide opens and barrels, in draw through snow and
pat bluffs, and in stud through bring-in steals and scare-card pressure.
Individual later special identities may have justified variant profiles
without a known person randomly becoming a different character from table to
table.

Calling-station behaviour remains low-tier for each affected variant. A
generally solid player may show calling-station-like leaks in an unfamiliar
secondary variant; a permanently loose-passive variant identity, however,
receives no high effective skill there.

### Selection and persistence

- Stake selection uses the effective skill of the current variant.
- Variant pools overlap: specialists, mixed-game players and occasional
  participants remain part of the same poker world.
- An identity can be available at high stakes in its main variant, but only at
  low stakes in a secondary variant.
- The same identity must not appear at several open tables or in several
  variants at the same time.
- Opponent reads are separated predominantly by variant; only a rough general
  reputation may continue to have an effect across variants.
- Player notes remain bound to `BotIdentity.id`, but store their observations
  with variant and stake context.
- Calibrations are evaluated in the long term according to
  `variant × skill band × stake × table format`.

The target size of approximately 64 identities applies to the near-term
NLHE/PLO pool, not as a permanent hard limit. Draw and stud may later extend
the roster in a quality-driven way with credible specialists.

## Roster size and repetition control

The initial target size is a global roster of approximately **64 identities**.
Through overlapping stake bands, approximately **24–30** suitable identities
should be available per stake.

For a typical 6-max session:

- usually one to two known opponents,
- usually three to four new opponents or opponents not seen for a long time,
- a short repetition cooldown instead of immediate permanent repetition,
- replacement players preferably from identities not yet seen in the session,
- no rigid table quota; recognisable rivalries may arise randomly.

The selection policy is more important than an arbitrarily long name list.
More than approximately 80 identities would unnecessarily dilute recognition
at first; below approximately 40 a pool filtered by stakes quickly becomes
too small.

## Manual player notes

Notes are bound to the stable `BotIdentity.id` and accompany an identity
across sessions and adjacent stakes.

### MVP

- free text note per identity,
- a few optional manual tags,
- editing at the table and in the replayer,
- date, variant, stake and optional hand reference,
- versioned local persistence as well as export/backup,
- no disclosure or automatic confirmation of archetype and skill.

### Protection against a finite "bot sticker album"

- no completeness display and no reward for "all bots noted",
- no automatically generated opponent description confirmed as true,
- observations can be added chronologically and by stake,
- old reads remain useful but can be temporarily incomplete or outdated due to
  adaptation and mental states,
- no automatic HUD statistics in the first step.

The note function will only be released once dynamic adaptation is connected
far enough. With the currently still relatively constant behaviour, it would
accelerate the permanent dissolution of individual identities too strongly.

## Order

1. Model genuine bet/raise/reraise levels preflop and postflop.
2. Safeguard range and selection gates for deep 4-bet/5-bet chains.
3. Add position-dependent steal detection and strategic blind defence.
4. Connect street-spanning strategic hand lines with a justified plan change.
5. Fully connect mental events, skill regulation, frustration and recovery.
6. Introduce stakes-dependent, overlapping roster and skill pools together
   with the bankroll system.
7. Add player notes and a rough, fair reminder of recurring bots to the user
   as a meta-game layer.

## Later acceptance criteria

- Several successful button steals lead, depending on skill, archetype and
  mental state, to different, traceable reactions.
- Skilled bots react in a more controlled way; weak bots may react late,
  incorrectly or emotionally.
- Mental changes are visible across several hands and subside again without
  permanently overwriting the base archetype.
- Known opponents are easier to assess in the long term, but not
  deterministically predictable.
- Additional counter-play produces no new marginal deep-stack 4-bet or
  all-in chains.
- Flop plans are only continued with a matching turn/river context; plan
  changes and aborts are traceable in the debug output and are not forced by
  chips already invested.
- Probe sessions and calibrations are additionally evaluated by skill and
  stake bands.
