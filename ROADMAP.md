# CPCdigital — Roadmap

**Offline Poker App · Electron Desktop · Single-player against credible bots · future learning and training platform for poker variants**

**As of:** 0.8.2 has been released. Later version numbers
describe planning, not a release commitment.

---

## Vision

CPCdigital aims to be an accessible place where players can try known and rare
poker variants without real money, waiting times or chaotic public tables.

The first priority is a stable, enjoyable single-player poker game with credible
bots. From version 1.0 onwards, a learning layer will be built on top of this:
a wiki, tutorials, session analyses and poker puzzles based on concrete hands.

## Core principles

- **Offline First** — no server and no internet required
- **Credible bots** — personalities, reads, habits and mental states
- **Fair play** — bots only see information that a real player could know
- **Variant-ready architecture** — community card, draw and later stud games
- **Explainable decisions** — bot actions and player decisions should be
  analysable later
- **Learning-ready, not learning-first** — learning interfaces come later, but
  the necessary data is collected from the start
- **Casual rather than solver** — fun and human-like opponents are more
  important than GTO perfection
- **Open source & fair reuse** — transparent forks and AGPL-compliant
  commercial use remain permitted; uncredited, obfuscated or proprietarily
  appropriated copies should remain recognisably traceable

## Recurring calibration and behaviour gate

After changes to ranges, action scores, personality factors or calibration
metrics, the following four checkpoints must be completed for each release:

1. targeted scenario and regression tests for the changed logic
2. deterministic development runs and documented 10k release runs for the
   affected variants, archetypes and table formats with raw counts/denominators;
   target corridors are for diagnosis, not an automatic release block. Larger or
   systematic outliers require a reasoned triage and an explicit approval
   decision. A verifiable release report confirms corridor outliers and metrics
   with fewer than 50 occurrences on an independent seed
3. a focused interactive trial on the current release candidate to check
   recurring lines, stack risk and the subjective recognisability of the
   archetypes. Document its scope and findings; expand the sample when
   anomalies warrant it rather than imposing a fixed hand count
4. triage of conspicuous hands against decision scores or a session debug
   export; structural errors must not be masked by widening target corridors

Invalid actions, violated invariants, non-finite measurements and the secured
deep-shove cases remain hard blockers. Snapshot drift is a separate review
trigger; intended changes only receive a new baseline after that review.

## Reading rule for version blocks

The roadmap describes the goal, core scope and, where applicable, the release
gate for each version. Concrete formulas, file boundaries, raw values and
completed diagnostic runs are documented in linked scope, calibration or release
reports, or in the changelog. This keeps it clear at a glance what has been
completed and what still needs to be done for the next release.

---

## Released baseline through 0.8.2

The completed milestones from 0.1.0 to 0.8.1 are listed in the
[Roadmap archive](docs/en/plans/roadmap-archive-through-0.8.1.md). For published
changes, the [Changelog](CHANGELOG.md) remains the authoritative source;
the 0.8.2 cut is recorded in the [release gate](calibration/v0.8.2-release-gate.md).
Calibration raw values and earlier release reports are available under
[calibration/](calibration/README.md).

---

## Phase 4 — Stabilisation & release preparation

### 0.8.2 — Bot foundation & stabilisation (released)

**Released on 4 October 2026.** The interim cut completed and verified the engine,
perception, diagnostics and initial dynamics building blocks that have already
been implemented. Since the scope freeze on 2 October 2026, no further bot
features were added. The remaining dynamics and mental features are kept in an
unscheduled post-0.8.2 backlog below; they are not retroactive release work.

#### Completed foundation

- [x] Preserve objective hand, board, position and opponent context up to the
  selection point and derive from it a continuously skill-weighted perception.
- [x] Preflop roles, true aggression levels, C-bet-once semantics and paired
  board hierarchy, including context-dependent opponent ranges, are covered by
  regression tests.
- [x] Action candidates are canonicalised, selection boundaries are
  instrumented, and conspicuous uncommitted shoves as well as extreme
  calling-station defence are specifically secured.
- [x] Session debug export v4, compact Android output, readable hand history
  with stable session/hand references and stake invariance have been completed.
- [x] A caller-authorised pot for pot odds, SPR and call/pot ratio has been
  introduced; river protection and hero rebuy balance are covered by regression
  tests.

Details are in the [Changelog](CHANGELOG.md) and the
[0.8.2 session diagnostics report](calibration/v0.8.2-session-diagnostics-2026-08-12.md).
The retrospective offline engine correctness block is separately documented in
the [Review addendum of 29 September 2026](docs/en/reviews/offline-core-review-2026-09-29.md);
the server is excluded from this.

#### Implemented functional scope

- [x] Secure deep 4-bet/5-bet chains according to the actual aggression level
  so that generic bonuses do not structurally override a clear fold preference.
- [x] Initial anti-steal basis: count public, unopened button/cutoff
  opportunities per opponent and position; allow blind reaction only with
  sufficient sample size, skill weighting and a playable range.
- [x] Initial flop→turn line cut: retain the chosen bluff/semi-bluff bet in
  hand memory rather than inventing a retrospective intention; selectively
  continue or abort with a debug reason without creating an all-in incentive.

#### Release gate for the 0.8.2 cut

- [x] Inventory browser storage by function and make cross-visit bot/session/
  replay history optional in the public demo: off by default, explicit opt-in,
  deletion on opt-out. Keep native persistence unchanged. The
  [browser storage inventory](docs/en/reviews/browser-storage-audit-2026-10-03.md)
  records the technical assessment under Section 25 TDDDG without claiming a
  legal guarantee.
- [x] Check the notice's factual details against the deployed GitHub Pages
  demo and project mailbox. The published build's opt-in, opt-out and table
  start were spot-checked; replay remains covered by the local responsive
  smoke test rather than a separate live replay interaction.
- [x] Triage the four formal reports from the 300-hand foundation regression
  with raw denominators and targeted counter-samples; only update the snapshot
  after a conscious review decision, not silently to fit
  ([preflight triage](calibration/v0.8.2-release-preflight-2026-10-02.md)).
- [x] Reproduce and correct the first-hand NLHE 100 BB QJo call against a
  deep shove; test first-encounter overbets separately. Preserve value hands
  and leave PLO's postflop overbet rule unchanged after a same-seed counter-run
  showed harmful Calling Station drift
  ([release preflight addendum](calibration/v0.8.2-release-preflight-2026-10-02.md)).
- [x] Triage the two large 10k shifts with causal and hand-level evidence.
  The narrow PLO TAG heads-up limp-reraise correction moved 3-bets to
  980/5,453 = 17.97% at 10k without adjacent metric misses. NLHE LAG
  full-ring C-bet folds remain 2,559/4,443 = 57.60% (independent seed:
  2,518/4,424 = 56.92%); the reviewed folds are overwhelmingly air/weak and
  price-sensitive, while a blanket raise restoration harms adjacent turn
  opportunities. Treat the latter as a documented gameplay watch item, not
  a rule fix or an automatic release block; do not move its guide corridor
  or development snapshot to fit the run
  ([preflight and plausibility review](calibration/v0.8.2-release-preflight-2026-10-02.md)).
- [x] Triage PLO calling station 6-max separately. The independent 3k run had
  810/1,909 = 42.4% fold-to-C-bet and 47/270 = 17.4% turn C-bet; the 10k
  primary/independent runs reproduced smaller but persistent deviations.
  Category and selected-hand review found deliberate weak-hand passivity plus
  some questionable missed value, but no new rule or pot error. Do not force
  these non-binding corridors with a global bonus or transfer the NLHE overbet
  rule to PLO. Keep strong-draw/near-nut value initiative and short-stack
  eligible-pot pricing as focused future gameplay observations
  ([diagnosis](docs/en/reviews/plo-postflop-session-2026-10-01.md),
  [preflight decision](calibration/v0.8.2-release-preflight-2026-10-02.md)).
- [x] Check PLO first-hand deep calls and short-stack eligible-pot prices
  separately from the accepted Calling Station aggregate deviations. Engine
  tests now prove the opening pot-limit cap and the prior investment needed
  before a deep preflop call; both variants use the caller's eligible pot for
  capped-call odds. Client tests retain the payable price, separate forced
  all-in risk from commitment and keep a very cheap PLO all-in call unpenalized.
  No NLHE overbet rule was transferred
  ([preflight check](calibration/v0.8.2-release-preflight-2026-10-02.md)).
- [x] Final NLHE/PLO validation for full ring, 6-max and heads-up with
  structural invariants, raw counts and independent-seed confirmations on a
  clean 0.8.2 commit; browser/Electron smokes and Android build/start checks
  passed ([release gate](calibration/v0.8.2-release-gate.md)).
- [x] Owner's focused Android gameplay/replayer check on the installed 0.8.2
  candidate passed on 4 October 2026. The device blocks ADB input injection,
  so automated installation/setup checks did not replace this.

### Unscheduled post-0.8.2 bot dynamics backlog

#### Functional scope

- [ ] Observe and respond to button/cutoff steals and blind defence depending
  on opponent, position, sample size and confidence; next, check
  success/failure and counter-adjustment over multiple hands.
- [ ] Street-to-street hand lines: remember the actual chosen intention for the
  current hand (value, protection, semi-bluff, bluff, pot control) and at
  turn/river, based on board, public opponent reaction and cost, either
  continue, replan or abandon the line with a stated reason. Evaluate NLHE/PLO
  separately; do not barrel automatically just because chips were already
  invested. Add further multi-street tests and debug reasons for plan changes;
  value/protection/pot control lines and river continuation are still open.
- [ ] Clearly separate strategic adjustment from emotional overreaction; skill
  governs detection, quality, regulation and recovery without smoothing
  archetypes into solver bots.
- [ ] Use publicly shown showdown cards only as evidence for future opponent
  reads that is skill-, sample- and variant-dependent; low skill may ignore
  them (see [Information flow audit](docs/en/reviews/opponent-reads-information-flow-audit-2026-09-30.md)).
- [ ] Prepare `generalSkill` and deterministically correlated
  `variantProficiency` as the basis for later variant families.
- [ ] Actually use `params.mental` and connect bad beat, cooler, recognised
  bluffs, successful bluffs and suckouts as weighted mental events.
- [ ] Limit frustration, momentum, tilt and confidence and reliably return them
  to the archetypal baseline with hysteresis/decay.

The technical vision and order are detailed in
[Bot dynamics, stake roster and player notes](docs/en/concepts/bot-dynamics-roster-and-notes.md).

#### Future validation gate

- [ ] Separate scenario, sequence and session tests for bet levels, repeated
  steals, high-skill defence, low-skill overreaction and return to baseline;
  marginal deep-stack escalations remain excluded.
- [ ] In baseline mode, test archetypes without adaptive reads and mental events
  against target corridors; document outliers with raw denominators and triage
  by size, reproducibility and gameplay effect, not automatically as a release
  error.
- [ ] In adaptive mode, test targeted, bounded deltas rather than static
  individual values.

---

### 0.8.3 — Refactoring & code quality

**Goal:** Consolidate, clean up the codebase and finalise licence formalities
before the major UI release.

#### Refactoring

- [ ] Split engine, bot scoring, session runner/export and simulation along
  clear functional module boundaries; keep existing public façades and formats
  compatible.
- [ ] Extract table, replay, export and overlay orchestration from large UI
  components without introducing visible geometry changes before 0.9.
- [ ] Extract only truly identical NLHE/PLO rule helpers into shared hand
  analysis helpers and remove obsolete bot files and duplicate helpers.
- [ ] Derive bet level from the actual raise sequence rather than a sizing
  limit to correctly distinguish large opens from small 3-bets.
- [ ] Clean up build paths and developer tools: separate the dormant server
  package from v1 and introduce documented format and lint configuration.
- [x] Make the full 24-combination calibration run observable: show per-cell
  progress and independent-seed confirmation status without changing seeds,
  metrics or report contents (completed early during 0.8.2 release preflight).
- [ ] After module separation, document the bot data flow including information
  boundaries and the engine’s amount/state conventions for contributors.

The intended file and interface boundaries are defined in the
[0.8.3 refactoring scope](docs/en/plans/refactoring-v0.8.3.md).

#### Integration tests

- [ ] Test engine and `LocalGameRunner` as a pipeline from blinds to showdown,
  including empty state, bust-to-end and quick restarts.
- [ ] Split large bot tests according to the new module boundaries without
  widening regressions or merely shifting them.
- [ ] Secure each refactoring as a separate, behaviour-neutral commit: workspace
  tests, build and stake invariance all green; calibration snapshot identical
  (not just within tolerances).

#### Licence clarity & provenance

- [ ] Introduce SPDX notices for central bot/engine files and signed future
  release tags with local verification.
- [ ] Establish a lightweight provenance manifest, Software Heritage archiving
  and a proportionate AGPL evidence preservation guide — without telemetry,
  obfuscation or runtime watermarks.

Boundaries and exact artefacts are also in the
[0.8.3 refactoring scope](docs/en/plans/refactoring-v0.8.3.md#public-readiness-and-provenance-proof).

---

### 0.8.4 — Session flexibility

**Goal:** More control over sessions.

#### Session setup and actions

- [ ] Make hero name, individual bot stacks, buy-in limits of 40–250 BB,
  variant and difficulty mix configurable in setup; only choose blinds from
  maintained presets rather than `Freie Eingabe`.
- [ ] Offer secure pre-selections via a centrally validated
  `pendingHeroAction` pipeline; no automatic raises or unbound calls for now.
- [ ] Introduce optional clock profiles with safe check/fold timeout and pause
  on background, device lock and controlled app resume.

#### Table QoL and diagnostics

- [ ] Display all-in win/split probabilities and the current made hand for NLHE
  and PLO in a rule-compliant, deterministically tested way with no action
  recommendations.
- [ ] Link a session-unique, seed-neutral hand ID at the table, in the replayer
  and in exports to a protected reproduction reference.

#### Bot stack lifecycle

- [ ] Round rebuy target stacks to sensible monetary levels and model
  short-stack rebuy, deep-stack cash-out, limits and substitute players as a
  common between-hand flow.
- [ ] When cashing out, display the actual stack instead of `0,00` and
  consistently record all transitions in replay, session statistics and debug
  export.

#### Release gate

- [ ] Test setup → multiple hands → rebuy/cash-out and substitute players as a
  continuous session flow.
- [ ] Secure pre-selection and clock/resume sequences on desktop and Android.
- [ ] Information displays must not change engine state, bot decisions or
  deterministic replay.

The full functional scope is in the
[0.8.4 scope document](docs/en/plans/session-flexibility-v0.8.4.md). Ongoing
roster, repeat-play and variant rules remain centrally documented in
[Bot dynamics, stake roster and player notes](docs/en/concepts/bot-dynamics-roster-and-notes.md).

---

### 0.8.5 — Persistence & recovery

**Goal:** Load, migrate and recover local user data in a controlled way before
v1, rather than silently discarding corrupted entries or unasked replacing them
with defaults.

- [ ] Define a common versioned persistence layer for roster, replay archive
  and settings
- [ ] Structurally validate stored data before use and run migrations as
  deterministic, separately tested steps
- [ ] Do not silently overwrite corrupted or unknown data; offer recovery with a
  clear message, diagnostic export and conscious reset
- [ ] Provide full local data export for diagnosis and backup before a reset
- [ ] Test storage errors such as invalid JSON, unknown schema version, quota
  exceeded and unavailable `localStorage`
- [ ] Keep roster, replays and settings preserved across supported upgrades; an
  ongoing hand or session will not be resumed

---

### 0.8.6 — UI foundation

**Goal:** Prepare components, styles and tests for the major table refactor
without introducing a second visible geometry before 0.9.0.

- [ ] Decouple `PokerTable` and responsive table styles from `TableScreen`
- [ ] Define responsibilities for TableSurface, TableStage, Pods, Cards, Bets,
  Board, Pot and Controls as component and layer boundaries
- [ ] Styling spike: evaluate Tailwind against CSS classes and design tokens on
  a representative UI component and document the decision before 0.9.0
- [ ] Add component tests for PokerTable, PlayerSeat, ActionButtons and
  HandReplayer as a starting point
- [ ] Record reference viewports and visual acceptance checkpoints for the 0.9
  refactor
- [ ] Prepare a guided alpha with clearly defined roles and the templates from
  the [Test strategy](testing/TESTING_STRATEGY.md); do not broadly promote it
  as a finished product

---

### 0.9.0 — TableSurface & TableGeometry

**Goal:** Establish a shared visual and mathematical table foundation instead of
hard-coded presets. First define the table shell as a normalised surface; then
TableGeometry, Pods, Cards and Bets use the same zones as the single source of
truth (SSOT).

#### Iteration 1 — TableSurface

- [ ] Create a presentational React-SVG with a true ellipse and a fixed target
  aspect ratio of 1.75:1 instead of a stretched stadium/capsule shape
- [ ] Implement pseudo-3D layering with visible bottom edge, dark leather rail,
  inner seam and covered green felt
- [ ] Treat the betting line only as an optional, very subtle skin detail; bet
  positions must not depend on its visibility
- [ ] Visually approve silhouette, rail thickness and material appearance
  separately for desktop and Android landscape before integration

#### Iteration 2 — TableGeometry SSOT

- [ ] Define normalised surface, seat, card and bet ellipses with a common
  centre and traceable insets
- [ ] Derive SVG and position calculations from the same geometry values so that
  no second visual geometry source emerges
- [ ] Calculate heads-up, 6-max and full ring from the geometry instead of
  maintaining separate seat/bet/button presets

#### Iteration 3 — Pod docking and cards

- [ ] Arrange pods horizontally and mostly outside the felt; the felt remains
  free for bets, pot, board and result display
- [ ] Use the avatar centre as a stable docking point; let pod bodies grow away
  from the table, mirrored on the left and right table halves
- [ ] Place hole cards upright behind the respective pod and partially obscure
  them; replace seat-specific clipping corrections with fixed stage safety zones
- [ ] Uniquely assign bets to the respective player along the invisible inner
  bet ellipse

#### Release gate

- [ ] NLHE and PLO with heads-up, 6-max and full ring with no pod, card or bet
  overlaps at desktop reference dimensions
- [ ] Automated geometry tests for symmetry, bounding boxes, bet assignment and
  stable order
- [ ] Visual approval after TableSurface and pod docking, not only at the end
  of the full refactor

---

### 0.9.1 — Responsive UI & replay

**Goal:** Transfer the shared table geometry to all supported surfaces and to
the HandReplayer.

- [ ] Derive desktop, tablet and Android spacing, header compression and table
  shell formula from the same geometry source
- [ ] Finalise phone landscape: action bar usability, visible slider and compact
  buttons based on Android prototype learnings
- [ ] Migrate HandReplayer to the same TableSurface and TableGeometry
- [ ] **Replayer touch:** make the Android overlay and small browser screens
  reliably usable with larger controls and appropriate touch gestures
- [ ] Browser mobile remains a functional fallback; no PWA and no full parity
  with the native Android layout

#### Release gate

- [ ] NLHE and PLO with heads-up, 6-max and full ring on desktop, tablet and
  Android landscape with no pod, card, bet or control overlaps
- [ ] Viewport and device matrix against clipped content, incorrect bet
  assignment and deviations between play and replay
- [ ] Visual approval of the final platform composition
- [ ] Present the browser demo as a public beta with known limitations,
  role-based forms and separate channels for bugs and feedback

#### Language and documentation checkpoint before an English-language project presentation

Not a technical blocker for 0.9.1, but before a wider presentation on
English-language platforms such as Reddit:

- [ ] Offer publicly relevant documentation in English as well: README with
  current status and limitations, getting started for installation/tests,
  current roadmap and release notes, and contribution and security paths.
- [ ] Mutually link German and English entry points and verify content
  consistency on changes. Historical audits and calibration reports remain in
  their original language for now; when publicly referenced, add a brief
  English note.
- [ ] Offer the user-relevant interface in German and English: in particular
  start/setup screen, table actions and status messages, replay, session
  statistics, export dialogs and clear error messages.
- [ ] For this, evaluate a lean i18n structure with central translation keys,
  language selection, fallback and appropriate number/date formats. Internal
  IDs, game rules and machine-readable debug exports remain language-neutral;
  a specific framework will only be chosen at implementation time.

---

### 0.9.2 — Naming, branding & controls

**Goal:** Define the final project identity and an independent appearance
(rather than one resembling external platforms) before release candidate,
packaging and wider communication.

- [ ] **Naming checkpoint:** explicitly review “CPCdigital” as the current
  working title and define the final project/product name before the release
  candidate
- [ ] Evaluate candidate **CheckBack** against documented strengths, collisions
  and availability checks ([Naming notes](docs/en/concepts/product-naming.md))
- [ ] Jointly assess findability, confusion risks, repository/domain names and
  technical identifiers such as package and app IDs before renaming
- [ ] Apply the final name consistently across UI, documentation, package
  metadata, repository description and distribution notes
- [ ] Formulate a lean brand and fork policy only for the final identity:
  allow attribution, do not misrepresent official affiliation, and do not
  restrict AGPL rights
- [ ] Integrate an unobtrusive “About / Licence / Source code” notice with
  copyright, AGPL licence and official repository into the app
- [ ] **Branding review:** change action buttons from the current red to the
  final project colour scheme
- [ ] 4-colour deck option (alternative card display)
- [ ] BB display mode (stacks, bets, pot in big blinds)
- [ ] Extend currency choice to “None” (numbers only, no €/$)
- [ ] Show min/max bet directly in the UI
- [ ] Session log (compact dealer log style, collapsible bottom-left)

---

### 0.9.3 — Essential visual and audio feedback

**Goal:** Create a clear, subtle gameplay feel before v1 without making engine
or replay dependent on a complex animation pipeline.

- [ ] Purely presentational CSS animations for deal/reveal, bet/pot changes,
  active player and winner
- [ ] Animations must not control input, engine progress or deterministic
  replay, and must not block them
- [ ] Subtle offline-generated Web Audio sounds for cards, chips and hand end;
  no music and no voices
- [ ] Persistent global mute switch and conservative default volume
- [ ] Respect `prefers-reduced-motion` and always present all states clearly
  even without animations

---

### 0.9.4 — Hardening, accessibility & UI testing

**Goal:** Specifically secure error cases, desktop security boundaries,
performance and usability before packaging.

- [ ] React ErrorBoundary with local recovery view, restart, return to setup
  and copyable diagnostic report instead of a blank screen
- [ ] Capture unhandled errors and promise rejections only locally for
  diagnostic export; no telemetry or automatic transmission
- [ ] Harden Electron renderer with sandbox and Content Security Policy, and
  restrict navigation, external links and IPC inputs to allowed cases
- [ ] Complete a full gameplay smoke test without network connection for the
  built client and Electron
- [ ] Performance test for long sessions (>500 hands) with UI components
- [ ] Render tests for new UI components (TableGeometry, animations)
- [ ] Responsive test matrix (desktop, tablet, phone landscape)
- [ ] Native Android matrix for cutouts, system bars, back button, resume
  behaviour and supported display sizes
- [ ] Check keyboard control, focus management, contrast and reduced motion

---

### 0.9.5 — Packaging smoke & release candidate

**Goal:** Build the candidate for v1.0 on the actually supported desktop
platforms and run a lean, hobby-project-appropriate final check.
An internal Linux AppImage build probe exists from 0.8.2 development, but it
does not complete any of the public distribution checks below.

- [ ] Build Windows package and Linux AppImage from the versioned source
- [ ] Install/start both packages in a clean environment and test setup, NLHE,
  PLO and replay without network connection
- [ ] Provide licence text, copyright, third-party and source notices in both
  distribution paths
- [ ] Check package contents for local development data, secrets and unnecessary
  server artefacts
- [ ] Document supported systems, installation path and known limitations
  briefly
- [ ] Test Windows and Linux artefacts as a public pre-release with a
  structured bug form against real installations
- [ ] Tag release candidate and keep content unchanged through the full gate to
  v1.0

> Checksums can be added with little effort but do not block v1. Code signing,
> auto-updates, bit-exact reproducible builds, SBOM/provenance pipelines and a
> broad distribution matrix are explicitly not required for the initial release
> without self-monetisation.

---

### 1.0.0 — Stable core release

**Goal:** A stable offline poker game with NLHE and PLO and a solid foundation
for future learning and variant modules.

#### Included

- [x] NLHE fully playable
- [x] Omaha High fully playable
- [x] 4 distinct bot archetypes with personality, skill, reads, mental state
- [x] Full hand history and replay
- [x] Decision records and explainable bot scores
- [x] Session statistics (live VPIP/PFR, BB/100)
- [ ] Stable desktop packaging
- [ ] Documentation for architecture and variant modules

#### Release gates

- [ ] No known critical engine, replay or data integrity errors
- [ ] NLHE and PLO calibration at the documented 10k release level
- [ ] Desktop, tablet and supported landscape layout pass the responsive test
  matrix
- [ ] Migrations for roster, replays and session data are tested for backward
  compatibility
- [ ] Corrupted local data and UI runtime errors lead to a clear recovery
  rather than silent data loss or a blank screen
- [ ] Electron sandbox, CSP, navigation, external links and IPC pass the
  documented security checks
- [ ] Server package is demonstrably not a runtime component of the offline v1
  build
- [ ] Final project name and public appearance are consistently defined before
  packaging and wider distribution
- [ ] Open blockers from guided alpha, browser beta and public release
  candidate are fixed or clearly classified outside the v1 scope
- [ ] The verified 0.9.5 release candidate is published as v1.0.0 with no
  functional changes

#### Packaging

- [ ] Windows
- [ ] Linux / AppImage

The Android prototype remains a development target and does not block v1.0. A
signed APK/AAB and public distribution will only be decided separately after UI
stabilisation.

#### Deferred until after v1.0

- **2-7 draw family** — single draw and triple draw as a shared architecture
  strand
- **Stud light** (architecture proof with open cards) — part of the later stud
  family

---

## Phase 5 — Meta-Game

### 1.0.1 — Bankroll system

**Goal:** Play money acquires value through consistency. Good bankroll
management leads to promotion, poor management to relegation. Short stacks and
"it's fine, it's only play money" are prevented by guardrails.

#### Core scope

- [ ] Training and bankroll mode with persistent bankrolls kept separate per
  variant, plus buy-in and rebuy rules
- [ ] Review variant-specific stake and risk profiles using simulated bankroll
  trajectories; secure promotion and relegation with guardrails
- [ ] Introduce stake-dependent, overlapping opponent pools and skill bands, as
  well as adjustable action-clock presets
- [ ] Add recovery for a depleted bankroll and comprehensible status displays
  for rebuys, stakes and the session result

Provisional amounts, tables, open modelling questions and the complete task
list are documented in the
[Bankroll concept](docs/en/plans/bankroll-v1.0.1.md).

---

### 1.0.2 — Global statistics

**Goal:** Cross-session tracking with filtering and comparison.

- [ ] Persistent, versioned global statistics (sessions, WTSD, W$SD, BB/100)
- [ ] Filter by variant, table size, stakes, period
- [ ] Filter single-table and multitable sessions separately and make them
  comparable
- [ ] BB/100 as the primary comparison metric per stake level
- [ ] Bankroll history as a graph (optional, minimal)

---

### 1.0.3 — Recurring opponents & player notes

**Goal:** Reward observation across multiple sessions without turning the
stable bots into a finite collection of permanently solved profiles.

- [ ] Bind a free-form note and a few optional manual tags to the stable
  `BotIdentity.id`
- [ ] Edit notes at the table and from the replayer; store date, stake and an
  optional hand reference as well as the variant played
- [ ] Include notes in the versioned local persistence as well as in
  export/backup
- [ ] No automatic archetype/skill confirmation, no roster progression and no
  automatic HUD for the time being
- [ ] Support chronological, stake-related observations so that reads are
  updated instead of being ticked off as a final solution
- [ ] Review a rough, fair reminder of recurring bots to the user so that
  recognition does not appear to work unilaterally in the human's favour
- [ ] Only release the note feature once strategic and mental bot dynamics are
  sufficiently wired up and evidenced by a probe session

The detailed concept including roster size, stake weights, anti-exploit limits
and acceptance criteria is documented in
[Bot dynamics, stake roster and player notes](docs/en/concepts/bot-dynamics-roster-and-notes.md).

---

### 1.0.4 — Optional multitable play

**Goal:** Allow experienced players several parallel tables without damaging
the observation-led entry level, the bankroll system or mobile usability.

#### Product boundaries

- [ ] Single Table remains the default and is binding in beginner learning
  paths as well as in guided exercises
- [ ] Unlock multitable play only after an advanced lesson or via an
  explicitly enabled expert option; do not couple it to a stake promotion
  alone
- [ ] Initially allow at most two parallel tables on desktop; only review four
  tables after UX, performance and probe-session evidence
- [ ] Limit Android to one table for the time being because of screen size
- [ ] Treat pre-selections, safe auto-actions, action clock and focus messages
  as technical prerequisites
- [ ] Each bot identity may only sit at one simultaneously running table and
  is drawn from the matching stake pool
- [ ] Book the buy-ins and rebuys of all open tables atomically against the
  available bankroll; show the bound total risk visibly
- [ ] Model independent runners, hand histories, replays and session ends per
  table without mixed actions or timers
- [ ] Clearly highlight the table with a pending hero action; do not add any
  automatic strategic decision support
- [ ] Evaluate statistics and session analysis by the number of parallel
  tables so that lower decision quality and win rate become visible

Multitabling is a voluntary advanced way of playing, not a higher difficulty
level and not a prerequisite for bankroll progress. The corresponding learning
lesson must exist before the regular release.

---

## Phase 6 — Learning layer

> The learning layer is what sets CPCdigital apart from other poker apps.
> Every new variant immediately benefits from the wiki, tutorials and analysis.
> The data has been available since v0.2 — the UI layer is what is coming now.

### 1.1.0 — Wiki and glossary

**Goal:** A shared knowledge base for rules, terms and fundamentals.

- [ ] variant-specific rule overviews
- [ ] hand rankings
- [ ] glossary of poker terms
- [ ] basic strategy concepts
- [ ] typical beginner mistakes
- [ ] examples with concrete hands
- [ ] cross-references between related terms
- [ ] context-sensitive links from table, replay and analysis

---

### 1.2.0 — Tutorial mode

**Goal:** Guide players step by step from understanding the rules to free play.

- [ ] interactive basic-rule tutorials
- [ ] guided example hands
- [ ] explanation of the current betting round
- [ ] explanation of allowed actions and bet limits
- [ ] draw and showdown tutorials
- [ ] optional strategy hints
- [ ] learning paths per variant
- [ ] beginner, standard and purist help level
- [ ] advanced multitable lesson covering attention, decision time,
  pre-selections, total bankroll risk and the declining quality of one's own
  reads
- [ ] controlled comparison exercise with one versus two tables followed by an
  evaluation of decision time and errors

---

### 1.3.0 — Session analysis based on concrete hands

**Goal:** Explain decisions instead of mere results.

- [ ] Select a few interesting hands per session
- [ ] Separate the decision view from the result view
- [ ] Show the relevant factors at the time of the decision
- [ ] Highlight good decisions despite a bad result
- [ ] Explain bad decisions despite a won pot
- [ ] Mark marginal and opponent-dependent spots
- [ ] Classify alternative actions in an understandable way
- [ ] Transferable lesson per example hand
- [ ] Link suitable wiki terms
- [ ] Do not fake GTO precision

#### Analysis format

```text
What happened?
→ Which information was available?
→ Which factors were decisive?
→ How should the action be classified?
→ Which alternatives were there?
→ What can be learned from it?
```

---

### 1.4.0 — Poker puzzles

**Goal:** Train concrete situations — inspired by existing puzzle apps, but
with a deeper explanation layer instead of just "right/wrong".

- [ ] Fixed foundation puzzles (preflop, postflop, bet sizing)
- [ ] Fold, call, raise and all-in decisions
- [ ] Draw and pat decisions
- [ ] Range and read exercises
- [ ] Find the mistake in a hand
- [ ] Replay multi-street hands
- [ ] Difficulty levels
- [ ] **Explanation layer**: why is action X better than Y? Which factors were
  decisive?
- [ ] Generate personal puzzles from own sessions

---

## Phase 7 — More variants

> New variants build on the existing architectural foundation and benefit
> directly from the wiki, tutorials and puzzles from Phase 6.

### Cross-variant bot competence

- [ ] For each new variant family add its own `variantProficiency` and
  `variantAffinity` without re-rolling identity, core personality and general
  skill
- [ ] Translate archetypes into the strategic language of the variant instead
  of transferring NLHE action logic
- [ ] Persist opponent reads and player notes with variant context; a rough
  general reputation may remain tied to the identity
- [ ] Extend the global roster with reviewed draw/stud specialists as needed;
  the near target size of roughly 64 is not a permanent hard limit
- [ ] Plan calibration and probe sessions per variant, skill, stake and table
  format combination

### 1.5.0 — 2-7 Draw family

**Goal:** Introduce draw poker as a coherent variant module on top of the
stable v1 core, starting with single draw and building on that with triple
draw.

- [ ] 2-7 lowball hand ranking
- [ ] `DrawPhaseDefinition`, card exchange and draw history in the engine
- [ ] 2-7 single draw with no-limit betting structure
- [ ] `VariantEvaluator` for draw quality, discards, pat and snowing
- [ ] Then triple draw with three draws and four fixed-limit betting rounds
- [ ] Multi-street pat/draw/bluff strategies for bots
- [ ] Rule hints, tutorial and puzzle material

---

### 1.5.1 — Omaha Hi-Lo

**Goal:** Direct extension of Omaha High (0.7.1) — split pot with a low
qualifier.

- [ ] High/low evaluation (A-5 lowball)
- [ ] Qualifier rules (8 or better)
- [ ] Split and quarter pot logic
- [ ] Low draw and scoop evaluation
- [ ] Bot strategy: two-way hands, scoop potential

---

### 1.6.0 — Badugi

**Goal:** Third draw variant with a fundamentally different hand ranking.

- [ ] Badugi hand ranking (4 cards, different suits, no pairs)
- [ ] Draw rules (exchange 1–4 cards, 3 draw rounds)
- [ ] Pat signals and snowing
- [ ] Bot-side draw and bluff logic

---

### 1.7.0 — Stud family (Razz + Seven Card Stud)

**Goal:** Stud games as their own category — open cards in the `BotContext`.

- [ ] Razz (A-5 lowball, 7 cards, no draws)
- [ ] Seven Card Stud (high, 7 cards, open cards)
- [ ] Extend `BotContext` by `visibleOpponentCards`
- [ ] Ante, bring-in and street logic (3rd–7th street)
- [ ] Simplified bot AI for stud as the first architectural proof

---

## Phase 8 — Platforms & multiplayer

### 1.8.0 — Android distribution (optional)

The technical foundation and the local debug workflow have existed since
v0.7.7. After the UI and device validation from v0.9.0–v0.9.4 it is decided
whether this becomes a publicly distributed Android client. The prototype may
continue to run independently of this as an internal test target.

- [ ] Define supported smartphones, tablets, table formats and variants
- [ ] Finalise app icons, splash screen, permissions and production
  configuration
- [ ] Build a signed APK/AAB reproducibly and test the upgrade path
- [ ] Provide AGPL-compliant source, licence and third-party notices in the
  distribution path
- [ ] Deliberately choose GitHub Release, alternative store or Play Store

> A PWA is not planned. Geometry work stays in 0.9.0, touch integration in
> 0.9.1 and the native device/lifecycle matrix in 0.9.4.

---

### 1.9.0 — Table rules & multiplayer readiness

**Goal:** Prepare special rules as general, deterministic engine extensions.

- [ ] Define a general `TableRules` framework kept separate from variant rules
- [ ] Compatibility check between poker variant, betting structure and special
  rule
- [ ] Model mandatory contributions, skipped phases, additional boards and
  bonus settlements
- [ ] Correctly settle main and side pots with multiple boards or additional
  payouts
- [ ] Fully record special rules in hand history, decision snapshots and
  deterministic replays
- [ ] Prepare protocol-neutral consent, timeout and rejection events for later
  player decisions
- [ ] Single-board bomb pot as the first offline testable proof

#### Release from v2.x

- Make special rules selectable in lobbies or table setups for real players
- Run It Twice, bomb pots and 7-2 game/bounty in multiplayer
- Online multiplayer at the earliest from v2.0 and still only as a long-term
  option

---

## Later / Unexplored

These topics are noted but neither prioritised nor in the scope of a specific
version. They can be sorted into future phases or discarded.

| Topic | Category | Notes |
|-------|-----------|---------|
| Short Deck (6+) | Variant | Community card, 36-card deck, adjusted hand ranks |
| Stud Hi-Lo | Variant | Extension of 1.7.0 |
| Mixed Games (HORSE) | Variant | Rotation of several variants, session format |
| Tournament mode | Game mode | Rising blinds, payout structure, ICM |
| Local multiplayer | Platform | Hot seat, same computer |
