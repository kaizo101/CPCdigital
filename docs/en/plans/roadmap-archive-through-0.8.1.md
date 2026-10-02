# Roadmap archive through 0.8.1

> German original: [Roadmap-Archiv bis 0.8.1](../../de/plans/roadmap-archiv-bis-0.8.1.md)

This state preserves completed milestones and the open items of the time.
Open checkboxes are historical and not current release blockers. The
[roadmap](../../../ROADMAP.md) is authoritative for the current plan.

## Phase 1 — Playable foundation

### 0.1.0 — Offline foundation

**Goal:** A poker app running fully locally as the technical base.

- [x] Electron app with its own window
- [x] NLHE against dummy bots
- [x] setup screen for blinds, chips and bot count
- [x] poker table UI with action buttons
- [x] automatic start of the next hand
- [x] basic component refactoring

---

### 0.2.0 — Engine hardening and observability

**Goal:** The engine becomes the stable base for bots, replays, analyses and further variants.

- [x] legal actions determined completely by the engine
- [x] provide the complete betting context: pot including current street bets, to call, bet size relative to the pot, min raise and max raise
- [x] determine own and effective stack as well as SPR correctly for every decision
- [x] secure pot odds calculation and betting context with targeted scenario tests
- [x] correct min-raise, all-in and reopen logic
- [x] test side pots and split pots comprehensively
- [x] store the complete action history as events
- [x] enable deterministic hand replays
- [x] introduce a seedable RNG for tests and reproducible sessions
- [x] store decision snapshots for every player action
- [x] separate public and private information cleanly
- [x] define variant-neutral phase and betting structure
- [x] unit and integration tests for central betting edge cases

#### Decision Snapshot

Every decision should record at least:

- visible game state
- own cards
- legal actions
- pot, to call, min raise and max raise
- position and effective stack
- previous action history
- chosen action
- later optionally: hand evaluation, reads and action scores

This data initially serves debugging and replay. Later it forms the basis for
session analyses and personal puzzles.

---

## Phase 2 — Credible bots

### 0.3.0 — General bot architecture

**Goal:** Bots decide via a shared, explainable utility system.

- [x] general `BotContext` without hidden information
- [x] include bet size, pot odds, effective stack and SPR in the evaluation of the actions
- [x] test stack and sizing sensitivity with comparable decision scenarios
- [x] separation of variant evaluation and decision engine
- [x] evaluation of all legal actions via utility scores
- [x] record reasons and influencing factors for every action score
- [x] model skill as perception and evaluation inaccuracy
- [x] separate personality, mental state, reads and memory
- [x] weighted selection between plausible actions
- [x] replace global random errors with traceable misjudgements
- [x] separate artificial reaction time from actual computation time and model it situation-dependent
- [x] debug inspector for context, scores and decision reasons

#### Bot architecture

```text
PokerPlayer
 ├── Personality       constant, with session variance
 ├── Skill             constant, determines evaluation quality
 ├── MentalState       dynamic: tilt, confidence, patience, momentum
 ├── Reads             subjective estimates with uncertainty
 ├── SessionMemory     observed hands and relevant events
 └── DecisionEngine    general utility-based action selection
```

---

### 0.4.0 — First bot personalities

**Goal:** Several clearly distinguishable but not rigid opponents.

- [x] stabilise TAG as the reference bot via seedable full-ring, 6-max and heads-up calibrations
- [x] Nit
- [x] Calling Station
- [x] LAG
- [x] Maniac as a rare extreme form of LAG instead of an independent base strategy
- [x] make skill and personality freely combinable
- [x] session variance within an archetype
- [x] mix archetypes per session in a seedable way and distribute them evenly before repetitions
- [x] model `BotIdentity` with name, `avatarKey` and stable basic tendencies separately from archetype and skill
- [x] build a versioned deterministic identity generator with a first 32-bot test population
- [x] infrastructure for generation, persistence and session selection (roster base stable since v0.4)
- [x] build a persistent local bot roster with identities recurring across several sessions

> **Roster expansion (44→approx. 64):** Runs incrementally and quality-driven.
> New identities are added when session repetitions or missing
> character profiles show a concrete need; there is no quota per release.
> The later target is approximately 24–30 suitable, overlapping identities
> per stake band instead of fully separated pools.
- [x] use identity seed, session variance and hand/decision RNG separately and reproducibly
- [x] allow recognisable habits without making decisions fully predictable
- [x] do not reveal archetype and skill through names or openly visible categories
- [x] individual tilt reactions
- [x] different observation ability
- [x] reads with sample size and confidence
- [x] allow wrong and premature reads
- [x] bot habits instead of only VPIP/aggression controllers
- [x] balancing over longer test sessions

#### Target state

Two TAG bots should have the same base strategy, but should nevertheless be able to differ:

- cautious observer
- arrogant snap judge
- emotionally stable grinder
- solid player with fear of large pots

---

## Phase 3 — Variant-capable core game

### 0.5.0 — NLHE fully playable

**Goal:** The first variant serves as the reference for community-card poker and no limit.

- [x] position-dependent preflop situations
- [x] hand and board assessment
- [x] relative hand strength instead of only the hand category
- [x] draws, outs, blockers and vulnerability
- [x] postflop initiative and action history
- [x] range estimates in simplified form
- [x] no limit bet sizing (including skill-based sizing errors)
- [x] multiway decisions
- [x] credible bot lines across several streets (line commitment system)
- [x] comprehensive tests and bot test sessions

---

### 0.5.1 — Bugfixes and balancing

- [x] fixed queue order after all-in/reraise (clockwise starting from the raiser)
- [x] read type: opponent bet sizing tracking (pot fraction EMA)
- [x] postflop reraise discipline (medium -12, weak/air -18, big bet -10)
- [x] raise sizing: short stack reduction, reraise factor 0.75
- [x] non-premium raises at ≤20 BB penalised (-10)
- [x] parameter system: `bot-params.ts` centralises ~50 tuning knobs
- [x] auto-calibrator: random search optimiser with loss function
- [x] board dangers, flush danger, reraise detection, stack management

---

### 0.6.0 — Rebuys, Hand History & Replay

**Goal:** Bot rebues with personality, reproducible hand replays for debugging and analysis.

- [x] rebuy policy rolled per identity, not fixed per archetype (threshold 10–90 BB)
- [x] auto-rebuy after the end of a hand when chips are below the threshold
- [x] leave on bust: nits (~60%) leave the table, LAGs never
- [x] replacement bot after a random break of 2–6 hands (fresh identity from the roster)
- [x] immediate replacement if the table would otherwise die (only 1 player left)
- [x] setup toggle "Auto-Rebuy & Ersatz-Bots"
- [x] `syncChips` synchronises isSittingOut
- [x] deterministic hand replay from decision snapshots + engine seed
- [x] replay UI: step forward, step backward, table view, text history
- [x] readable hand history text export per hand
- [x] autoplay function in the replayer
- [x] session navigation: all hands of the session browsable (◀▶)
- [x] hand categories: 7 levels (premium > strong > good > medium > marginal > weak > air) with board context
- [x] preflop reraising discipline (no blind escalation with marginal hands)
- [x] pot-to-winner visualisation (pot jumps to 0, chips at the winner)
- [x] separate replay window (Electron: BrowserWindow via IPC + localStorage, browser: overlay fallback)
- [x] "Letzte Hand wiederholen" button (↻ in the header)
- [x] cross-session hand history (localStorage, max 200 hands)
- [x] hand filter by pot size (≥ X BB)
- [x] bot decision reasons in the replay (scores, contributions, hand category)
- [x] split `LocalGameRunner` (rebuy manager moved out into `bot-rebuy-manager.ts`)
- [x] session folder (`session/`) introduced

> **Retrospective** — v0.6.0 bundled 19 features in one release. It would have been better to have had 3 minor releases:
> `v0.5.2` Rebuys · `v0.5.3` Replay · `v0.5.4` 7 categories. From v0.7 onwards each release focuses on **one topic**.

---

### 0.7.0 — Postflop calibration & C-bet fix

**Goal:** Make postflop behaviour measurable and raise the C-bet rate from 20% to 47-60%.

#### Numeric hand score (hybrid)

- [x] `hand.strength` as a numeric value 0-100 with draw bonus (up to +10)
- [x] hybrid scoring: category base + strength bonus (small ±5-10 addition) — final, no full replacement planned

#### Postflop calibration

- [x] **C-bet %**: PFA bets the flop / C-bet opportunities (per position)
- [x] **fold-to-C-bet %**: fold to C-bet / C-bet seen
- [x] **AF (aggression factor)**: (bet+raise)/call postflop
- [x] **WTSD %**: hands to showdown / hands seen flop
- [x] **W$SD %**: won at showdown / went to showdown
- [x] targets defined per archetype (TAG/Nit/LAG/CS, C-bet + AF)
- [x] game loop extended by PFA tracking and postflop counting
- [x] `printStats` outputs postflop metrics
- [x] calibration errors count the postflop metrics along
- [x] **long run**: 50k hands per format validated (all 48 metrics on target)

#### C-bet analysis & bugfix

- [x] **"free card for draw" bug**: bonus incorrectly also applied to PFA on the flop → removed
- [x] **bluff C-bet bonus**: +15 for PFA with air on a dry board
- [x] **C-bet opportunity**: +12 → +18
- [x] **PFA check penalty**: −30 for air-air/weak (not for good+)
- [x] session evaluator extended by C-bet patterns (PFA missed C-bet, fold-to-C-bet with playable hand)

#### Result

| Metric | Before fix | After fix |
|--------|-----------|-----------|
| TAG C-bet% | 20% | 47-60% |
| AF (all) | on target | on target (partly improved) |
| Fold-to-C-bet | 71-93% | unchanged → separate fix for v0.8 |

48 metrics on target (36 preflop + 12 postflop). 228 tests green.

---

### 0.7.1 — Omaha High

**Goal:** Test pot limit and variant-specific hand evaluation.

- [x] Omaha hand evaluation (exactly 2 hole + 3 board) — `evaluateOmahaHand` with 60 combinations
- [x] pot limit calculation (max raise = pot + 2×call, already in the engine)
- [x] Omaha-specific variant context — `omaha-hand-evaluation.ts` as `VariantEvaluator`
- [x] bot strategy: draw density (flush draw, wrap-outs), nut potential, vulnerability, preflop assessment (double suited, connectedness, high card points)
- [x] NLHE and Omaha logic without duplication — common `VariantEvaluator` interface, separate implementations
- [x] variant selector in the SetupScreen (Texas ↔ Omaha)
- [x] type system: `[Card, Card]` → `Card[]` in 58 places (shared, engine, client)
- [x] `findWinnerIndices` dispatched by hole card count
- [x] PlayerSeat renders dynamically 2–4 cards
- [x] TableScreen shows "PLO" instead of "NLHE"
- [x] calibration: 12 archetype formats, TAG VPIP 30.8% / PFR 14.8% / AF 2.89 / WTSD 33.4% (6/6 on target)
- [x] fixed `weightedChoice` fallback (best action instead of blind fold)
- [x] aggression modifier `/5` → `/4` (LAG raise bonus from +6 → +7.5)

---

### 0.7.2 — WTSD (postflop fold behaviour)

**Goal:** Lower the showdown rate — bots fold postflop too rarely.

- [x] variant-specific category scores: `CategoryScoreTable` in `bot-variant-evaluation.ts`
- [x] `VariantEvaluation.categoryScores` → `DecisionContext` → `bot-action-scoring.ts`
- [x] NLHE: scores identical to `params.scoring.handStrength` (no regression)
- [x] PLO: `call.medium` 20→8, `call.weak` −5→−8, `call.marginal` 5→0
- [x] TAG PLO WTSD 52%→36%, VPIP 22.4%, PFR 15.2% — 6/6 in range
- [x] `bot-category-scores.ts` defines `NLHE_CATEGORY_SCORES` + `PLO_CATEGORY_SCORES`

---

### 0.7.3 — Personality tuning (LAG AF / Nit VPIP)

**Goal:** Incremental modifier tuning — LAG more aggressive, Nit tighter.

- [x] aggression modifier `/4` → `/3.5` (LAG raise bonus +1.07)
- [x] riskTolerance call `/6` → `/8` (LAG call −0.75, Nit call +1.04)
- [x] LAG AF 1.60→1.73, Nit WTSD 45→41% (direction correct, but not yet on target)
- [x] NLHE without regression

> **Finding**: personality modifiers (±5–10) cannot sufficiently counteract
> category base scores (±20–30). Incremental denominator tuning hits limits.
> Structural solution (archetype-specific score tables) → v0.7.6.

---

### 0.7.4 — Session statistics

**Goal:** Live feedback during the session.

- [x] live VPIP/PFR/3-bet in a collapsible header (statistics button)
- [x] result in BB per session (green/red)
- [x] BB/100 as the primary comparison metric
- [x] export the session log as text (download button)
- [x] `session-stats.ts` + `SessionStats.tsx` component

---

### 0.7.5 — UI scaling & responsive layout (partly regressed)

**Goal:** Framework for a scalable layout — desktop, tablet, phone landscape.

- [x] cards: clamp minimum reduced (36/50 px instead of 46/64 px)
- [x] action buttons: `minHeight` 74→56 px, `fontSize` 18→16 px
- [x] touch: long press (600 ms) opens the rebuy menu
- [x] short stack rebuy: prevents bot zombies with 0.5 BB
- [ ] **Partly:** actionbar spacing on desktop and tablet present, but very tight
- [ ] **Partly:** `max-height: 450px` rules present, phone landscape however remains unusable
- [ ] implement a real portrait notice or respectively orientation guard
- [ ] render table, hero seat and actionbar on 844×390 without overlap
- [ ] consolidate the table shell calculation as the single traceable source of geometry

> **Rollback audit of 29 July 2026:** 1440×1000 is usable, 1024×768 is tight,
> 844×390 overlaps several seats and 390×844 has no portrait guard.
> The earlier claim "completed" and the documented 470-px formula
> no longer correspond to the current code. The open items go into v0.7.7
> and the geometric revision into v0.9.0.

---

### 0.7.6 — PLO archetype scores & position calibration

**Goal:** PLO bots play position-aware + archetype characteristics correctly.

#### Iteration 1 — Position fix
- `preflopAssess` ignored position → `positionStrengthAdjust()` built in
- multiway: `early: -8, middle: 0, late: +8, blinds: +3`
- HU: `late: +3, blinds: 0`

#### Iteration 2 — Archetype-specific PLO category scores
- Four separate score tables (TAG/Nit/LAG/CS) in `bot-category-scores.ts`
- delta-over-TAG pattern → only deviations from TAG explicitly
- `PLO_CATEGORY_SCORES` → `getPloScores(archetypeId, isPostflop)`

#### Iteration 3 — Preflop/postflop separated
- CS WTSD 75%→46% by lowering the postflop call + lowering the check
- Nit VPIP 24%→17% by raising the preflop marginal scores
- LAG VPIP 28%→32% by reducing the fold scores
- `BotContext.archetypeId` + `createBotContext` parameter added
- `ploCallScale=0.15` (patience call damping) remains active

#### Iteration 4 — LAG AF & C-bet
- LAG AF FR 1.97→**2.49**, C-bet FR 38%→**40.4%**
- raise.medium 8→15, raise.marginal 0→5, call.medium 3→-1, call.marginal -3→-7
- Finding: preflop/postflop split also necessary for LAG; higher postflop raise scores compensate VPIP dilution
- LAG 6-max: AF 2.61, WTSD 26.9% — both on target

#### Correctness, replays and session data

- [x] determine PLO draws via physically unseen cards and exactly 2 hole cards + 3 board cards
- [x] correct flush draws, wraps, wheel outs, river draws and already made straights
- [x] record VPIP/PFR/3-bet once per player and hand
- [x] correct replay stacks, calls, all-ins, uncalled bets, split/side pots and dealer seat
- [x] provide a persistent replay archive of the last 200 hands
- [x] correct opponent reads, mental events and rebuy RNG
- [x] send the PLO pot maximum via keyboard as a legal raise
- [x] correct engine ranking and four PLO hole cards in the debug export

#### Results (10k PLO per archetype and format)

| Archetype | FR VPIP | FR AF | FR WTSD | 6M VPIP | 6M WTSD |
|------------|---------|-------|---------|---------|---------|
| TAG | 26.05% in corridor | 3.74 deviation | 36.4% in corridor | 32.00% in corridor | 35.1% in corridor |
| Nit | 19.36% in corridor | 5.75 deviation | 46.5% deviation | 24.44% in corridor | 46.0% deviation |
| LAG | 34.55% in corridor | 3.15 in corridor | 28.4% in corridor | 41.93% in corridor | 26.3% in corridor |
| CS | 45.54% in corridor | 1.13 in corridor | 42.2% in corridor | 44.64% in corridor | 44.1% in corridor |

The deterministic A/B run against the state before the physical draw
correction reaches 43/72 instead of 44/72 target corridors. The overall quality
therefore remains practically the same, while individual hits shift.
Therefore the domain-correct draw evaluation is not rolled back for old
calibration values.

#### Known deviations

| Metric | Value | Target | Reason |
|--------|-------|--------|--------|
| TAG 3-bet / C-bet | FR 14.71% / 28.9% | 5–11% / 35–55% | Recalibrate in a targeted way after correct `T` and draw evaluation |
| TAG AF | 3.74 FR, 4.71 6-max | 1.5–3.5 | Raise/call ratio shifted after the draw correction |
| Nit AF / WTSD | 5.75 / 46.5% FR | 1.5–3.5 / 25–36% | Structurally separate checked-down play and the low call rate |
| LAG C-bet | 29.0% FR, 36.9% 6-max | 40–60% | Calibrate the initiative separately from overall aggression |
| HU | archetype-dependent | see `simulation.ts` | Needs its own ranges and scores in v0.8.0 |

#### Files
- `packages/client/src/omaha-hand-evaluation.ts` — `positionStrengthAdjust()`, `getPloScores(isPostflop)`
- `packages/client/src/bot-category-scores.ts` — per-archetype + per-street score tables
- `packages/client/src/bot-context.ts` — `archetypeId` in `BotContext` + `createBotContext` parameter

> **Identities:** The roster stays at 44 entries. Growth is no longer
> artificially coupled to every minor version, but treated in a demand- and
> quality-driven way as a continuous product strand.

---

### 0.7.7 — Stabilisation after the UI rollback

**Goal:** Close the regressions evidenced after the rollback and unify the
development tools as well as the public project base before the next
strategy milestone.

#### Public Readiness

- [x] check in AGPL, contribution and security documentation
- [x] server without JWT fallback, local binding by default and private database permissions
- [x] add authentication for history and statistics endpoints
- [x] prepare CI, Dependabot, Dependency Review, CodeQL and gated Pages deployment
- [x] restrict demo sync to a public allow list until the cutover
- [x] document a formal secret scan over the complete Git history
- [x] make the main repository public after the final content check
- [x] switch Pages to the main repository and redirect the old demo repository
- [x] activate secret scanning and push protection after the visibility change
- [x] close the initial CodeQL findings with rate limits for auth, history and statistics routes

#### Responsive Safety Pass

Deliberately without encroaching on the TableGeometry SSOT planned for 0.9.0:
the position presets remain unchanged; only outer layout, operability and
measurable viewport limits are covered.

- [x] phone landscape 844×390 without seat/actionbar overlap
- [x] portrait guard with an understandable notice instead of a broken layout
- [x] desktop 1440×1000 and tablet 1024×768 with a robust safety margin
- [x] responsive component/browser tests for the four tested viewports

#### Android debug prototype

The native state initially serves quick testing on real smartphones. It is
neither a public APK release nor a v1.0 release gate; the browser demo
deliberately remains limited to a functional fallback on mobile.

- [x] Capacitor 8, checked-in `android/` project and reproducible sync, open, run and Gradle check scripts
- [x] landscape full screen with system bar, safe area, display cutout, back button and resume handling
- [x] simple full-screen setup mask and compact native touch actionbar
- [x] improve Android-specific legibility for board and hero hole cards
- [x] close the known top card clips with a limited safety correction without pre-empting the later TableGeometry
- [x] separate web, phone portrait, compact landscape and desktop/tablet via `matchMedia` instead of a user agent heuristic
- [x] carry out the first qualitative APK run on real hardware, collect discrepancies and prioritise by 0.7.7 blocker versus 0.9.0 geometry work
- [x] reproduce the Android HandReplayer: function confirmed, squeezed mobile geometry moved to 0.9.1; hand and session export now available via the native Android share/save menu
- [x] add a limited HandReplayer interim fix for APK diagnostics: real header/table/control rows, availability-based table scaling and 844×390 smoke coverage for heads-up, 6-max and 9-max PLO; the complete TableGeometry/touch migration remains in 0.9.1
- [x] export the session log and the complete debug JSONL on Android as a cache file with content URI; verify the native chooser on real hardware
- [x] complete a shortened control run over NLHE/PLO as well as heads-up/6-max/full ring, back button and resume

> Device run and control matrix are recorded in the
> [APK device report of 30 July 2026](../../../testing/apk/2026-07-30-device-inventory.md).
> The replayer now has a limited landscape interim fix; its shared mobile
> table geometry and the complete touch redesign deliberately remain part
> of 0.9.1.

#### Release gate

- [x] carry out a qualitative APK inventory and classify findings into 0.7.7 blockers versus later TableGeometry/UX work
- [x] classify the Android HandReplayer as functional but not yet release-ready geometrically; add native file export and move the complete touch/geometry redesign to 0.9.1
- [x] re-run the existing client, responsive and Android debug builds successfully
- [x] complete the shortened variant, format and lifecycle matrix on real hardware

---

### 0.7.8 — PLO 3-bet control & strategy table

**Goal:** Calibrate all four PLO archetypes in full ring and 6-max to
humanly plausible VPIP, PFR, 3-bet, C-bet, AF and WTSD corridors.

#### Implemented

- **PLO preflop strategy table** (`PLO_PREFLOP_STRATEGY`): archetype-, situation- and hand-category-dependent preferred action for all 4 archetypes (TAG/Nit/LAG/CS). Missing categories are treated as fold preference; the category scores remain part of the decision.
- **PLO-scaled strategy matrix** in `preflopStrategyFactors()`: For PLO weakened values are used (raise→raise=12, call→call=10, call→raise=0, fold→raise=-20). NLHE path unchanged.
- **Bot tag integration**: `preflopRangeAction` is populated for PLO via `getPloPreflopAction()` (previously `undefined`).
- **LAG correction**: facing open good→call instead of raise, facing 3-bet good→fold (reduces excessive 3-bets without suppressing VPIP).
- **CS correction**: unopened medium→call removed (CS VPIP lowered from 56% to 45%).
- **Nit FR correction**: `good` cold calls reduced; VPIP 24.9%→21.7%.
- **Nit 6-max correction**: own preflop scores plus `raise-or-call` mix for `good` and `call-or-fold` mix for `medium` against an open; the broader, mixed postflop range lowers AF/WTSD without global postflop interventions.
- **Metric audit**: WTSD now counts all flop participants in the denominator, passive all-ins count as calls in AF, and later backraise opportunities flow correctly into the 3-bet denominator.
- **Calibration filter**: `CALIB_PROFILE` and `CALIB_FORMAT` allow targeted development and confirmation runs.

#### Results (10k PLO)

| Archetype | Format | VPIP | PFR | 3-bet | AF | WTSD | C-bet |
|------------|--------|------|-----|-------|----|------|-------|
| Nit | FR | 21.67% | 13.16% | 3.31% | 3.12 | 35.0% | 42.0% |
| Nit | 6-max | 25.43% | 16.69% | 4.78% | 3.64 | 37.7% | 45.1% |
| TAG | FR | 32.57% | 16.27% | 8.36% | 2.21 | 32.2% | 44.0% |
| TAG | 6-max | 38.03% | 21.41% | 8.10% | 2.91 | 33.6% | 46.0% |
| LAG | FR | 36.61% | 18.72% | 12.89% | 2.06 | 24.1% | 50.8% |
| LAG | 6-max | 45.43% | 24.66% | 13.90% | 2.31 | 27.7% | 53.2% |
| CS | FR | 45.62% | 5.92% | 0.59% | 1.09 | 36.6% | 40.1% |
| CS | 6-max | 46.40% | 9.77% | 1.35% | 1.95 | 43.9% | 38.0% |

#### Known deviations

- For full ring and 6-max there are no open target deviations.
- The final Nit 6-max corridor is deliberately limited after the metric audit to AF 1.5–4.0 and WTSD 25–38; the temporarily broader values 4.5/40 were discarded.
- Heads-up remains noted for 0.8.0. The NLHE regression run after the metric audit confirms a concrete open point: calling station HU reaches 1.79% 3-bet (63/3512 opportunities) at 10k hands instead of the previous corridor of 2–13%. Behaviour and target deliberately remain unchanged in 0.7.8.
- The NLHE C-bet metric and its targets are completed separately in `calibration/v0.7.8.md`.

#### Release gate

- [x] 3k development runs without invalid-action fallbacks
- [x] 10k confirmation runs executed for all four PLO archetypes in full ring and 6-max
- [x] Nit 6-max within the limited AF/WTSD corridor after the structural audit
- [ ] heads-up calibration (deliberately moved to 0.8.0)
- [x] NLHE regression test: full ring and 6-max completely on target; CS-HU 3-bet finding confirmed with 10k and moved to 0.8.0
- [x] 304 workspace unit tests green (194 client, 103 engine, 7 server)
- [x] version the calibration report with the final 10k values

---

### 0.7.9 — Bot evidence & calibration stabilisation

**Goal:** Structurally stabilise the existing NLHE/PLO behaviour before the
HU work, without broadening target corridors to paper over errors.

#### Implemented

- aggressive bet sizes normalised in session, street analysis and reads to a common pot fraction; passive all-in calls excluded
- line, long-term opponent and sizing evidence merged in an action-dependent way; reaction to small bets coupled to the own aggression tendency
- removed the semantically incorrect, unused `iAmInPosition` field; a real position calculation is only introduced when there is a concrete scoring consumer with seat/button context
- added PLO-specific board worsening for flush, pairing and straight windows; connected the protection score and raise sizing
- PLO reaction strength dosed separately due to more frequent board changes and calling station flop/turn/river defence structurally calibrated from traces
- PLO preflop hand quality structurally rebuilt: real suit shapes instead of triple suit as double suit, unique rank/wheel connectivity without pair bonus, pair quality, nut suits and danglers; category independent of position and previous action
- Omaha showdown comparison within the same hand categories corrected and tested order-independently with the Q-Q-2-2 vs 9-9-2-2 case from hand #68
- PLO flop, turn and river resolved separately; vulnerable made hands receive dosed protection before the river, LAG all-ins were reduced in favour of normal pressure raises
- unified the opponent read observation between the real session and the simulation
- introduced calibration metric schema v2 with a central hand accumulator, golden-hand tests and counter invariants
- calling station skills limited deterministically via generator v3 to the low tier 15–49 and existing rosters migrated identity-stable
- deep stack open shoves and uncommitted all-ins removed from the regular raise selection via explicit stack/commitment limits
- made deep stack open shoves over 40 BB and uncommitted deep shoves visible as separate calibration invariants; every hit fails the run. The raise-to-max legalisation path respects the lock as well
- NLHE calling stations keep their low bluff initiative, but are no longer punished twice by passivity on value bets with made hands
- NLHE sticky calls decrease across flop, turn and river; weak hands without draws react to repeated street pressure and missing showdown value. PLO stays with its separately calibrated street tables
- archetype-dependent cash out between hands added: base thresholds of 240–480 BB are individually shifted by the risk appetite, at the latest at the personal hard limit up to 800 BB is cashed out; replacement bots enter with the normal starting stack
- live seat fully synchronised with name, avatar and engine player when replacing bots
- Android bot debug made touch-capable and persistently switchable via five quick taps of the version display; `Strg+D` remains the desktop shortcut
- Android export for session log, replayer text and the complete debug JSONL added via cache file and native share/save menu; Capacitor app, filesystem and share plugins explicitly registered in the workspace
- equipped 40 of the 44 stable bot identities with their own portraits and updated transitive high-severity dependencies

#### Release gate

- [x] keep unchanged targets instead of corridor expansions
- [x] deterministic 10k runs for all four archetypes in NLHE and PLO, each full ring and 6-max, without invalid-action fallbacks
- [x] neither deep stack open shoves over 40 BB nor uncommitted deep shoves in all 16 release runs
- [x] heads-up unchanged, limited to v0.8.0
- [x] workspace tests, production build and high-severity audit successful
- [x] calibration report `calibration/v0.7.9.md` versioned
- [x] NLHE 6-max probe session over 100 hands with the current 0.7.9 APK triaged; no new deep open shoves or multi-street weak call-downs, preflop reraise escalation documented as a structural follow-up finding for 0.8.1
- [x] PLO 6-max pre-probe session ended after 80 hands and fully triaged: 100% raised pots, oversized TAG/LAG opens, passive top-set line in hand #70 and incorrect pot allocation in hand #68 identified
- [x] engine, preflop, protection and all-in corrections derived from this implemented; all unchanged PLO targets reconfirmed over 10k
- [ ] complete a short PLO 6-max post-fix control session with debug export; the first APK run was salvaged via ADB after eight hands and did not yet pass the gate because of the nut straight/flush transition in hand #8. In particular check the raised-pot share, made-hand re-evaluation after draw completion, top-set protection and correct showdowns
- [ ] final 0.7.9 push only after this post-fix control session

---

## Phase 4 — Stabilisation & release preparation

### 0.8.0 — Calibration stabilisation

**Goal:** Put the calibration across all archetypes, variants and formats on
a solid foundation before new strategy paths and dynamic opponents build on
it.

#### Result

- [x] PLO nut potential, dirty outs, board changes and second-nut detection corrected relative to the hand; shared straight detection secured for NLHE and PLO.
- [x] calibration metrics extended by fold-to-C-bet and turn C-bet as well as target corridors and score tables re-evaluated traceably.
- [x] separated the fixed table format from the number of active players and isolated the heads-up strategy explicitly from 6-max.
- [x] pot commitment, fold thresholds and multiway dynamics corrected as structural causes instead of via individual target cells.
- [x] established 19 randomised engine invariants for NLHE and PLO and completed a review of 30 modules ([historical review](../reviews/review-2026-08-07.md)).
- [x] generated versioned 10k NLHE/3k PLO baselines for all archetypes and formats; the still planned regression levels were implemented in 0.8.1.

The complete rationale, raw values, known deviations and reproduction
commands are in the
[0.8.0 calibration report](../../../calibration/v0.8.0.md).

#### Release status

**Completed.** Format isolation, diagnostics, invariants and all 24
archetype/format combinations were released. Remaining postflop tuning was
deliberately moved to 0.8.1 instead of adapting target corridors to
temporary decision paths.

---

### 0.8.1 — PLO strategy & NLHE refinement

**Goal:** Close PLO-specific score gaps and improve NLHE decision depth.

> **Release of 11 August 2026:** Strategy scope, commitment limits and
> WTSD diagnostics are implemented. All technical gates as well as the
> unchanged NLHE/PLO target ranges are green in the final 10k/3k runs.
> Raw values and invariants are in the
> [release gate report](../../../calibration/v0.8.1-release-gate.md).

#### Implemented core scope

- [x] PLO strategy deepened via gradual SPR zones, board equity collapse, position-dependent equity realisation and stricter river discipline.
- [x] nut, mixed, second and bottom wraps including dominated outs as well as blocker, freeroll and reverse implied odds effects differentiated by skill.
- [x] NLHE lines extended by real check-raises, turn double barrels, float defence, 4-bet/5-bet stages and planned river bet folds.
- [x] separated voluntary pot commitment from forced all-in risk and made both quantities diagnosable with explicit skill and price limits.
- [x] introduced deterministic calibration regression and parameter validation as the second and third test level.

The individual domain rules are described in the [changelog](../../../CHANGELOG.md);
raw values, limit tests and the release decision are in the
[0.8.1 release gate report](../../../calibration/v0.8.1-release-gate.md).

#### Release status

**Completed on 11 August 2026.** All static target ranges are green in the 10k
runs for full ring and 6-max as well as in the 3k heads-up runs. The technical
gates, exact commitment limits, WTSD path diagnostics and skill
differentiation were released with unchanged target corridors.

---
