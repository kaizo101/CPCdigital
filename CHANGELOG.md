# Changelog

All significant published changes to CPCdigital are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/1.1.0/),
and the project uses semantic versioning. Planned features are listed
exclusively in the [Roadmap](ROADMAP.md).

## [Unreleased]

## [0.8.2] — 2026-10-04

### Added

-  **Privacy notice:** A concise German notice for the public browser
  demo covers GitHub Pages hosting, browser-local game/replay storage and
  project-email contact. Both notices are linked directly in setup and share
  a small legal-info dialog at the table, separate from the session statistics.
  The revised notice lists the actual Local Storage categories and conditional
  GDPR rights; a technical inventory records each storage trigger. In the plain
  browser demo, cross-visit bot and hand history is now off by default and
  requires an explicit opt-in. Opting out removes that history, including
  legacy replay keys. Electron and Android retain their existing persistence.
-  **Current architecture guide:** A root-level architecture document now
  separates engine rules, offline session orchestration, bot information and
  decision flow, platform shells and persistence. Developer instructions link
  to it instead of maintaining a competing architecture summary.
-  **Demo imprint:** A directly accessible German imprint page is linked from
  setup and the game toolbar. The in-app view keeps the current session open;
  generic liability and non-commercial-only copyright boilerplate was omitted
  because it does not match the current DDG wording or the project's AGPL licence.
-  **Internal Linux packaging probe:** A locally built, unsigned AppImage now
  packages the Electron shell, client assets and licence notices without the
  dormant server. The development build keeps the temporary CPCdigital name,
  app ID and Electron icon; public release and Windows packaging remain open.
-  **Observable release calibration:** The 24-combination release run now shows
  per-cell hand progress, independent-seed confirmation status and periodic
  heartbeat messages. Seeds, metrics and the validated report format are
  unchanged; checkpoint/resume is not included.
-  **First cross-street bot line:** A bet chosen on the flop (bluff or
  semi-bluff) remains active until the turn decision. The turn review can
  continue it based on public action, board, skill and variant, re-evaluate it
  as value, or cancel it with a clear rationale; the decision is visible in
  debug output. No sunk-cost bonus or all-in bonus; value/protection lines and
  river continuation remain open.
-  **First 0.8.2 anti-steal foundation:** Bots remember per opponent and
  separately for the button and cutoff unraised steal opportunities and actual
  raises. After sufficient observations, a skill-dependent archetypal read can
  cautiously shift blind defence for playable hands; limps, reraises, heads-up
  opens, short-stack shoves and unsuitable hands do not trigger an anti-steal
  counter. Success/failure and opponent adjustments across multiple hands remain
  part of the unscheduled post-0.8.2 dynamics backlog.
-  **PLO4 preflop pilot:** Separate structural profiles for pair strength,
  four-card coordination and usable suit strength; coordination and A-high suit
  only apply in a skill-dependent, limited way in later positions with small
  local score factors. The pilot effect has not yet been manually verified;
  details and raw counts are in the PLO preflop audit.
-  **Complete decision context:** Bots preserve public position, preflop role
  and the ordered aggression level for each street. C-Bet logic only applies to
  the first valid flop attack; opening bets are no longer treated as reraises.
-  **Skill-dependent context perception:** The paired-board hierarchy,
  position-dependent ranges, board interaction and card removal are gradually
  introduced at their respective skill thresholds. The effect is exactly zero at
  the threshold and only reaches the objective value at skill 100.
-  **NLHE paired-board hierarchy:** Board play, pocket pairs, top pair with
  kicker and trips are evaluated separately on single-paired boards. Opponent
  trips representation takes into account preflop role, position, hole cards and
  multiway fields.
-  **Selection and export diagnostics v4:** Action candidates have stable IDs,
  large-stack raises are consolidated into exactly one all-in candidate and the
  unchanged 85% plausibility threshold is shown with candidate count and utility
  gap. The full session debug export contains all decisions, contributions and
  both objective and perceived analysis values; the normal export clearly
  distinguishes between hand history and debug JSONL. A session header, exactly
  one compact line per hand and a verifiable footer replace the memory-intensive
  pretty JSON.
-  **Calibration snapshot:** The deterministic 300-hand smoke test has its own
  0.8.2 foundation baseline after the intentionally gameplay-relevant context
  and candidate changes. The 0.8.1 file remains unchanged as a historical
  comparison; structural invariants still apply unchanged.
-  **Unique session and hand references:** New sessions receive a stable session
  ID, which appears in the hand history header, in every hand reference and in
  the file names for hand history and debug JSONL. Multiple saved sessions are
  exported as a separate archive with its own archive ID; existing replays
  without an ID remain readable.

### Changed

-  **0.8.2 release validation:** The clean-commit 10k NLHE/PLO run
  and 21 independent-seed confirmations passed all structural invariants.
  The [release report](calibration/v0.8.2-release-gate.md) keeps diagnostic
  corridor deviations visible. The focused manual Android check and live-demo
  verification passed before publication.
-  **Calibration script execution:** The stake and 300-hand regression checks
  invoke the simulation directly through Node's TypeScript import hook. The
  npm commands use the same entry path, avoiding the `tsx` CLI's local IPC
  socket while leaving seeds and calibration logic unchanged.
-  **Ten-card display:** Face-up cards at the table and in the hand replayer
  show `10` instead of the internal `T` rank. Poker rules, hand histories and
  debug exports keep their existing rank notation; the compact landscape
  replayer is covered by a visual smoke fixture.
-  **PLO TAG heads-up limp-reraise discipline:** After a button limp and a
  big-blind raise, weakly structured hands no longer receive the full generic
  late-position raise bonus. Coordinated or nut-suited hands and good-or-better
  value hands retain it. In this one pathway, opponent-range score modifiers
  now interpolate continuously across diagnostic strength labels, avoiding a
  sudden five-point raise swing near a score of 60. The deterministic 3,000-hand
  heads-up probe moved 3-bets from 455/1,604 to 276/1,604; the 10,000-hand
  check moved from 1,586/5,453 to 980/5,453. Big-blind defence and the other
  PLO table formats were unchanged. See the
  [release preflight](calibration/v0.8.2-release-preflight-2026-10-02.md).
-  **PLO postflop on paired boards:** Board-only trips are no longer treated
  as a strong made hand; straights take into account possible full houses and
  flushes for nut potential. The SPR commitment bonus now requires strong nut
  potential for `good` hands without artificially removing low-skill
  misjudgements. The
  [session addendum](docs/en/reviews/plo-postflop-session-2026-10-01.md)
  documents hands #10/#24/#26, regression tests and the deliberately verified
  0.8.2 development baseline; target corridors remain unchanged.
-  **PLO session sequence fix:** Strong made hands are classified as value when
  betting, not as bluffs. Drawless weak hands receive less blanket defence
  bonuses against expensive C-Bets on paired or wet multiway flops; a second
  session export revealed a previously excessive call/pot threshold. For a
  capped bet size, a recognised river straight on a safe board retains a small
  value bet as an alternative to check/all-in. The
  [session addendum](docs/en/reviews/plo-postflop-session-2026-10-01.md) also
  records the still open 300-hand calibration drift.
-  **Vite configuration:** The package version import now uses a JSON import
  attribute, keeping it compatible with native configuration loading in future.
  The separate chunk-size warning remains reserved for targeted checks during
  the 0.8.3 refactoring.
-  **Project documentation cleanup:** The main README remains a compact project
  overview; `docs/README.md` links to concepts, plans, reviews and guides. Test
  strategy and forms are bundled under `testing/`, and outdated paths have been
  updated. The roadmap separates ongoing and future planning from the archived
  version history and links detailed concepts separately; its headings have been
  unified without status emojis. The released state, current development state
  and historical review findings are clearly separated; outdated statements
  about session seeds and external hand history compatibility have been
  corrected.
-  **Calibration documentation:** The active calibration guide and new 0.8.2
  release-preflight analysis are in English. Historical German reports remain
  available unchanged; manual trial scope is finding-driven rather than a
  fixed hand quota.
-  **Developer onboarding clarified:** The variant guide lists the actual
  engine, bot, runner and export entry points as well as current extension
  limits. `CONTRIBUTING.md` separates local Electron installation from the CI
  installation path and categorises additional tests by change type; the
  detailed bot and engine convention guides are planned for 0.8.3.
-  **Calibration gate clarified:** Target corridors are diagnostic guardrails,
  not automatic exit conditions. Release runs and justified outlier triage
  remain mandatory; structural invariants still stop a run. Zero denominators
  are shown as not evaluable. A machine-verifiable release report checks
  metadata, all 24 combinations and raw denominators; conspicuous or rare
  metrics receive an independent confirmation seed.
-  **Clear hand history export:** The label refers to the app's own text export
  without naming a third-party platform; external replay compatibility is not
  claimed.
-  **Caller-eligible pot as decision basis:** Pot odds, call/pot ratio and SPR
  now use only the pot that the acting player can actually win for short-stack
  calls. Uncallable overbet portions and other players' side-pot contributions
  no longer undervalue decisions; live pot and pot-limit raise limits remain
  separate.
-  **Deep preflop escalations:** In clear fold-to-5-bet zones, the concrete
  escalation model replaces the coarser hand-strength and archetype bonuses.
  Value cores and committed ace-blocker lines retain their special paths.
-  **Targeted river discipline:** Draw protection ends on the turn. NLHE calls
  without a made hand only receive an additional brake against a range perceived
  as very strong; calling-station hero calls against weak ranges remain
  possible.
-  **Calibration snapshot:** The 0.8.2 foundation baseline was updated after the
  intentionally gameplay-relevant engine and scoring corrections. The target
  corridors themselves remain unchanged. Following the PLO wrap-out correction,
  only the PLO section was re-aligned to the new behaviour using a documented
  3k-hand A/B counter-check. Before the release cut, the snapshot was refreshed
  again after review of six drift alerts, including the intended PLO TAG
  heads-up limp-reraise change; the 24-cell regression then passed without
  warnings or errors. This does not close the final 10k release gate.

-  **Targeted all-in depth guard:** Non-premium open shoves are no longer
  selectable candidates from 25 BB; from 40 BB, the block also applies to
  premium hands after at most one opponent raise, as long as the bot has not
  invested substantially. Normal raises and short or already committed
  4-bet/5-bet all-ins remain available.
-  **Calling-station C-Bet defence:** The extra call/raise bonus for drawless,
  unimproved hands is reduced to 25% when at least four players see the flop or
  the required call costs the entire remaining stack. Normal heads-up and
  three-player floats remain unchanged.
-  **Memory-safe debug export:** The running rich debug buffer is limited to the
  last 50 decisions; only the current hand remains fully rich for inspector and
  replay. The full compact hand dataset continues to grow without a hand limit
  and is written as blob chunks in the web version or sequentially in blocks of
  approximately 256 KB on Android. Duplicate score strings and session-wide
  duplicate decision snapshots have been removed; repeated taps are blocked
  during export.
-  **Readable hand history diagnostics:** Hand timestamps refer to the actual
  hand start and are output in the human-readable export with the local timezone
  and explicit UTC offset; machine-readable data retains the UTC timestamp.
  Decision blocks name the bot name, street, archetype, skill and order instead
  of only the internal bot ID, and long contribution values are rounded only for
  text display.

-  **C-Bet defence with a weak made hand:** Aggressive bots may still apply
  pressure against a C-Bet, but no longer receive the same raise boost as a
  genuine draw. In the reproduced Alva-like spot, calls and raises remain within
  the existing selection variance rather than structurally forcing the shove
  path.

### Fixed

-  **Expensive-call defence:** An uncommitted NLHE bot no longer treats a
  merely strong starting hand such as QJo as an automatic call against a deep
  preflop shove. On later streets, non-nut one- and two-pair hands receive
  graded caution when the *effective* call price exceeds a pot-sized bet;
  sets and strong draws are not blanket-folded. Preflop medium-hand calls are
  no longer mislabeled as bluff-catching. The postflop change is NLHE-only:
  a same-seed PLO counter-run showed that transferring it to PLO would
  materially worsen Calling Station C-Bet defence.
-  **Preflop perception:** The placeholder vulnerability `0` and a non-existent
  blocker no longer create apparent perception errors. Protection against future
  board draws is only evaluated from the flop onwards; random draws are
  preserved for stability of subsequent perceptions.
-  **PLO wrap quality:** Straight outs that also enable an opponent flush are no
  longer counted as clean outs when the player has no stronger hand; partially
  dominated wraps are no longer labelled `nut-wrap`. Already made flushes do
  not collect weaker straight outs.
  [Specific hands and limits](docs/en/reviews/plo-wrap-outs-review-2026-09-30.md)
  are documented.
-  **PLO draw outs behind full house/quads:** Weaker straight and flush hits are
  no longer treated as clean improvements or semi-bluff draws. True
  nut-straight-flush redraws remain clean outs;
  [reproductions and oracle checks](docs/en/reviews/plo-made-hand-redraw-review-2026-09-30.md)
  document the boundary.
-  **PLO straight-flush nuts:** The highest opponent-possible straight flush is
  now determined from exactly three board cards and two unseen cards. Hole
  blockers prevent false-positive higher combinations; a
  [reproduced Q-high nuts case](docs/en/reviews/plo-straight-flush-nut-review-2026-09-29.md)
  is regression-tested.
-  **PLO quads nut potential:** Higher quads are only evaluated as a possible
  opponent hand when the board structure matches and cards are available. A
  genuinely possible straight flush prevents classification as absolute nuts;
  hole cards can block that possibility. Four reproducible cases are described
  in the [PLO addendum](docs/en/reviews/plo-quads-nut-review-2026-09-29.md).
-  **Offline engine correctness:** Uncalled bets are returned before an
  uncontested pot award; orphaned side-pot layers are assigned in fold order
  rather than to an ineligible short stack. Invalid actions, fractions of a cent
  and tables that cannot be fully dealt are rejected before state changes.
  Physical seat order and the dealer anchor remain stable across seat changes.
  The local runner only counts a nested hand-end once. Reproductions and limits
  are in the
  [offline core addendum](docs/en/reviews/offline-core-review-2026-09-29.md).
-  **NLHE flush draw provenance:** Four board cards of the same suit do not
  create a personal flush draw without a hole card of that suit. Genuine draws
  only count unknown cards as outs and distinguish nut from non-nut draws based
  on the highest available hole card.
-  **NLHE pocket pair strength:** Pocket pairs below board cards are no longer
  automatically given `High relative strength`. Overpairs remain strong; one,
  two or at least three overcards reduce relative strength in a targeted way.
-  **Hero rebuy balance:** Hand results are recorded before result animation and
  any interim rebuy. A bust followed by a 100 BB rebuy therefore remains
  `-100 BB` instead of reverting to `+0.0 BB`; immediate and pending rebuys are
  still not counted as winnings.
-  **River protection:** `Protection against draws` and
  `Board got more dangerous — protect harder` are no longer awarded on the
  river, where no future card remains to protect against.

### Security

-  **Release dependency audit:** Compatible lockfile updates resolve the
  production audit findings in the dormant server dependency tree. The
  production audit now reports zero vulnerabilities. A full development audit
  still flags unpatched issues in the Electron packaging and Capacitor CLI
  dependency trees; they are tracked as tooling risk, not hidden by the
  production-only gate.
-  **High-severity dependencies closed:** Electron was updated to `41.10.7`,
  `@xmldom/xmldom` to `0.9.12` and `nanoid` to `3.3.19`. The earlier
  high-severity production findings were closed; the remaining development
  toolchain advisories are assessed separately above.
-  **Electron download dependency secured:** The transitive `undici` was updated
  to `7.30.0`. This also closes the TLS certificate verification alert rated
  high by GitHub for versions below `7.29.1`.

## [0.8.1] — 2026-08-11

### Added

-  **Separate commitment semantics:** Bot decisions now distinguish between
  genuine voluntary pot participation (`potCommitment`) and the size of a
  required call relative to the remaining stack (`forcedAllInRatio`). Blinds do
  not generate a sunk-cost signal; low skill, archetype, tilt and patience scale
  a limited human commitment tendency. Large remaining-stack calls with weak
  hands are evaluated more cautiously, while strong hands and very favourable
  pot odds remain protected. Both values are visible in bot debug and in the
  session debug export.
-  **Calibration regression (layer 2):** A deterministic 300-hand smoke test
  compares all 24 variant/archetype/format combinations against a versioned
  snapshot. Rates warn above 2 percentage points and fail above 5 percentage
  points; AF uses its own absolute thresholds of 0.2 and 0.5. Structural
  violations remain hard errors.
-  **WTSD path diagnostics:** Optional calibration details separate all-in,
  call-down, aggressor and check-down showdowns, roles, opponent fields, price
  classes and fold exits. Preservation tests prevent double-counted or
  unassigned showdown paths.
-  **Parameter validation (layer 3):** Tests verify all resolved NLHE and PLO
  score tables, clamp limits, skill-tier ordering and negative all-in money
  lost. The calibration regression also runs in CI.
-  **PLO SPR zones:** Postflop decisions now blend gradually between commitment,
  protection and draw realisation. Low SPR distinguishes strong made hands and
  premium draws from non-nut equity, medium SPR favours protection for
  vulnerable made hands, and high SPR realises strong clean draws; risk
  tolerance and aggression retain their archetype differences.
-  **PLO board dynamics:** Turn and river transitions now provide a
  hand-relative equity collapse value instead of a binary `boardGotWorse`
  signal. Paired boards devalue flushes and straights, newly possible flushes
  devalue non-flush hands, and tightening straight boards are scaled by actual
  hand strength and nut strength. Against bets, the factor applies fully; with
  no action, it only acts as a small pot-control signal; high risk tolerance
  dampens it.
-  **PLO river discipline:** Weak and medium bluff catchers now respond to
  multi-street pressure and missing nut blockers. Nut, near-nut and second-nut
  value are excluded; real flush/straight blockers, archetype risk tolerance and
  an already accounted-for equity collapse reduce the penalty in a controlled
  way.
-  **PLO position leverage:** The true postflop action order correctly
  determines IP/OOP even after folds. In position, thin redraws can be realised
  for free, realisable OOP equity folds less often, and made hands with clean
  nut redraws get a separate freeroll line.
-  **PLO wrap combinatorics:** `wrap-8+` and `wrap-13+` now distinguish nut,
  mixed, second and bottom wraps by each physical out card. Dominated straight
  outs are no longer counted as `cleanOuts` or premium SPR equity; low skills
  can still overestimate the raw out count archetypally.
-  **Analysis skill gates:** Central, validated thresholds tier PLO board
  dynamics, river discipline, nut potential, freerolls, blockers and wrap
  dominance. Skill 20 continues to use the raw out count in complex wrap spots;
  skill 90 uses all levels. Perception errors and simplified assumptions are
  visible in bot debug.
-  **PLO blocker lines:** Recognised nut and partial blockers now specifically
  affect bluff catches, bluff raises and value pressure. The effect scales with
  blocker quality, skill and aggression or risk tolerance; low-skill bots and
  NLHE are kept separate from this PLO-specific path.
-  **Dynamic implied odds:** The previous blanket +7 call bonus now takes into
  account effective opponent stack, perceived nut potential and active
  opponents. Deep multiway pots strengthen nut-adjacent draws, while dominable
  draws receive less bonus due to reverse implied odds; preflop is not affected.
-  **Check-raise strategy:** Street analysis now correctly detects classic
  opponent check-raises and only on the current street. Calls, folds and
  reraises respond differentially by hand protection, price, skill, archetype
  and variant. Suitable OOP heads-up spots also receive executable value and
  nut-draw check-raise plans for NLHE and PLO.
-  **NLHE turn double-barrel habit:** Bots with an existing three-barrel
  tendency can now fire again on suitable blank turns. Value, draw and bluff
  candidates are evaluated separately; skill, deterministic habit consistency
  and weighted action selection keep the line individual. The habit remains
  limited to heads-up-in-hand NLHE spots, does not change PLO and does not
  re-assign existing stored identities.
-  **NLHE float defence:** Street history now precisely detects when the same
  opponent calls a flop C-Bet and bets the turn after the aggressor checks.
  Suitable bluff catchers, draws, value hands and genuine blocker rebluffs
  respond by price, board development, skill, personality and opponent reads;
  normal turn bets, air without blockers and PLO receive no float bonus.
-  **Preflop 4-bet/5-bet model:** Preflop escalations now distinguish value
  core, controlled NLHE A5s/A4s blocker bluffs and clear fold ranges. 5-bets
  require suitable stack commitment; after a 5-bet, non-core raises and shoves
  are excluded. PLO uses a separate linear value/fold logic, and deep-stack
  shove safeguards remain intact.
-  **NLHE river bet-fold lines:** Bots can store a thin heads-up value bet as a
  concrete bet-fold plan in hand memory. Continuation only activates after the
  exact sequence: own opening bet → opponent raise. Fold wins control against
  the bluff catch, while reraises and shoves are removed from selection.
  Nut-adjacent hands, multiway, PLO and low skill remain protected; the active
  plan appears in bot debug.
-  **Format-accurate postflop calibration:** C-Bet defence, turn barrels and PLO
  preflop reraises have targeted variant/archetype/format levers. A C-Bet
  defence factor only applies against the true flop C-Bet of the preflop
  aggressor; NLHE HU LAG and calling station can continue to play dead air in a
  controlled way without changing other formats.

### Fixed

-  **Correct turn C-Bet metric:** Turn bets after a checked-through flop are no
  longer counted as double barrel. An opportunity only arises when the same
  player was preflop aggressor and flop C-Bettor and the turn has not yet been
  opened.
-  **PLO reraise calibration:** The generic preflop reraise penalty scales by
  archetype and format. This limits previously excessive LAG 3-bets in full ring
  and 6-max without cutting PLO HU initiative for all archetypes.
-  **PLO wheel nut recognition:** The wheel straight is treated as five-high in
  the ordered straight search rather than mistakenly as ace-high.

-  **Hand-isolated calibration seeds:** Deck and decision RNG are derived
  separately per hand and the dealer is explicitly rotated. Differing postflop
  runout lengths can no longer shift all subsequent deals and decisions in an
  A/B run.

-  **Android HandReplayer:** Header, table area and replay controls now occupy
  separate layout rows. The table scales from the actual available middle area
  in compact landscape instead of from a viewport height reduced by 260 px; a
  responsive smoke test covers heads-up, 6-max and 9-max PLO at 844×390.
-  **NLHE on double-paired boards:** Hole cards that do not improve a shared
  two-pair board hand are no longer treated as an own `marginal` made hand.
  Board plays such as `5-2` on `A-A-T-T-5` receive the weak river assessment,
  while genuine kickers and full houses remain separate.
-  **Release calibration:** Format- and archetype-specific preflop, C-Bet,
  barrel, probe, pot-control and bounded-call levers cover all unchanged
  NLHE/PLO target ranges in full ring, 6-max and heads-up. The 10k-/3k-hand
  gates contain no invalid-action fallbacks or uncommitted deep-stack shoves.

## [0.8.0] — 2026-08-09

### Added

-  **Table format isolation:** A central resolution distinguishes full ring,
  6-max and heads-up by fixed seat count. The number of active players in the
  pot still affects multiway decisions but can no longer reclassify the table
  format retroactively.
-  **Explicit PLO HU strategy:** Heads-up has its own preflop, flop, turn and
  river score tables and no longer implicitly inherits 6-max overrides.
-  **Calibration diagnostics:** Raw denominators for C-Bet, fold-to-CBet, turn
  C-Bet, AF and WTSD, plus AF by street, PFA role and pressure situation.
-  **Engine invariants suite:** 19 randomised NLHE/PLO tests of 1,000 hands each
  check chip, pot, stack, queue, blind and card integrity.

-  **Code review:** Systematic review of 30 modules (engine, game loop, scoring,
  modifiers, support, habits, identities, replay, rebuy, NLHE/PLO hand
  evaluation). 22 bugs found and fixed, 19 modules confirmed bug-free
  ([historical review](docs/en/reviews/review-2026-08-07.md)).
-  **PLO nut recognition refined:** `'second-nuts'` level added between
  `'near-nuts'` and `'strong'` for more granular PLO evaluation (quads K vs A,
  FH KKKAA vs AAA, K-high flush vs A-high flush, straight gap). Dedicated
  scoring parameter `secondNutPotential: 4` dampens aggression with second-best
  hands.
-  **PLO straight-flush and quads nuts:** SF checks the highest possible
  straight flush via board suit ranks; quads detect blocked higher ranks via
  `ourCount`.
-  ** `findStraightTop` algorithm:** O(10) enumeration over all 10 straight runs
  for NLHE and PLO — replaces broken heuristics in `isNutStraight` (NLHE) and
  `findNutStraightTop` (PLO).
-  **PLO flush nuts:** Correct hole-vs-board separation instead of a
  hand-cards-minus-board hack; the highest non-board rank of the flush suit
  determines nut status.

### Changed

-  **Calibration gate:** v0.8.0 freezes a format-isolated static baseline. Exact
  postflop tuning follows the strategy changes of v0.8.1; adaptive preflop/HU
  validation follows after v0.8.2. The target ranges were not relaxed for this.

-  **PLO score tables recalibrated:** LAG raise scores reverted to v0.7.8
  levels, TAG raise scores increased, nit fold scores increased, protection
  bonuses reverted to original values, board-worse sensitivity changed from 0.6
  to 0.4.
-  **Calibration targets updated:** NLHE C-Bet (LAG 80–90% → 68–78%, nit 45–58%
  → 60–72%), NLHE/PLO AF caps lowered, PLO WTSD targets set according to PLO
  realism criteria (TAG 22–32%, nit 22–28%, LAG 28–34%, CS 28–45%).
-  **ROADMAP:** PLO nut recognition, `findStraightTop` and code review marked as
  completed in v0.8.0.

### Fixed

-  ** `calculateOmahaStrength`:** if-chain without `else` — all rank levels ≥4
  collapsed into the same formula (rank 9 became 72 instead of 88).
-  ** `isDominatedStraightOut`:** opponent trial always empty — `out` checked
  against board and hole simultaneously, opponent check never executed.
-  ** `findNutStraightTop` (PLO):** `boardRanks` parameter never used, always
  returned 14 — false-positive nut straight detection.
-  **PLO flush nuts:** Board ace was counted among our hole-card ranks — every
  board-ace flush treated as `near-nuts`.
-  **PLO full house/trips/two pair:** Nut heuristic lacked opponent trips
  calculation (`boardCount+min(2,4-bc-ourCount)≥3`).
-  ** `limp-reraise-premium`:** checked `'strong'` instead of `'premium'` —
  AA/KK did not trigger the habit.
-  ** `three-barrel-bluff`:** fired on every river bluff without checking for
  flop/turn aggression.
-  **Nit rebuy policy:** `rebuyThresholdBb` and `maxRebuys` rolled independently
  — 28% of nits had `null` threshold with `maxRebuys:1`.
-  ** `getCashOutPolicy` **: LAG missing from the ternary chain — it fell
  through to the default fallback.
-  **Turn card twice**: the hand-history text showed the turn card in the board
  segment and again as a single card.
-  **Double penalty for `marginal` **: reraise penalties hit `marginal` twice
  (−30) vs. `weak` (−18).
-  ** `findStraightDraw` (NLHE)**: A-high wrap (J,Q,K,A) was classified as OESD
  (8 outs) instead of a gutshot (4 outs).
-  ** `calculateCleanOuts` **: JSDoc comment misplaced in the function body,
  bracket indentation broken.
-  All other bugs from the
  [historical code review](docs/en/reviews/review-2026-08-07.md).
## [0.7.9] — 2026-08-04

### Added

- **Native Android export**: Session logs, replayer hand histories and the full
  debug JSON are written as real files in the app cache and exported through the
  Android share/save menu. Web and desktop keep the direct browser download.
- **Bot portraits**: 36 further roster identities receive cropped and optimised
  512×512 WebP portraits from the new avatar arcs. 40 of the 44 stable bot
  identities now have images; the remaining four still use the initials
  fallback.
- **PLO board delta**: Flush completions, board pairings and straight windows
  that arise newly under the Omaha three-board rule now trigger a protection
  reaction dosed per variant.
- **Calibration schema v2**: A central hand accumulator defines VPIP, PFR,
  3-Bet, C-Bet, Fold-to-C-Bet and AF; golden-hand tests and invariants guard
  against impossible counter relations.
- **Bot cash-outs**: Winners leave the table after an archetype-dependent
  minimum duration starting from a base threshold of 240–480 BB, shifted
  individually by their risk appetite, and at the latest at their personal hard
  limit of 800 BB. The existing replacement mechanism then reseats the seat with
  the normal starting stack.

### Changed

- **Opponent evidence**: Line and sizing signals act jointly on fold, call and
  raise, depending on the action. Small bets are attacked depending on one's own
  aggression tendency, large deviations are treated cautiously.
- **Session-faithful calibration**: Simulation and real local session use the
  same opponent read observation. All unchanged full-ring and 6-max targets were
  confirmed for NLHE and PLO with deterministic 10k runs; heads-up stays in
  v0.8.0.
- **PLO calling station**: Flop defence in full ring and 6-max broadened and the
  later call-down tendency calibrated separately. This lowers implausibly high
  Fold-to-C-Bet values without widening the AF or WTSD corridors.
- **PLO preflop hand quality**: Suit structure, nut suits, pairs, rundowns,
  wheel connectivity and danglers are evaluated independently of position and
  previous action. Triple-suit/monotone suits no longer count as double-suited
  and pairs no longer generate fictitious connectedness.
- **PLO format and street separation**: A common absolute hand evaluation feeds
  format-specific full-ring/6-max actions as well as separate flop/turn/river
  scores. LAG river pressure and calling-station defence therefore stay locally
  calibratable without dragging other formats along.
- **Calling-station skill profile**: Permanently loose-passive identities remain
  fully within the low tier from 15 to 49 with a deterministic distribution of
  38 ± 6. Generator v3 migrates existing CS skills without redrawing names, IDs
  or individual non-CS skills.
- **Manual behaviour check**: After changes to calibration, ranges or action
  scores, a 100–150 hand trial session with hand triage is documented in
  addition to deterministic runs as a recurring release gate.

### Fixed

- **Android debug access**: The bot debug mode in the native client is no longer
  reachable only via the desktop keyboard shortcut `Ctrl+D`. Five quick taps on
  the version display toggle it in a touch-friendly way; the state remains
  stored locally for subsequent sessions.
- **Capacitor plugin sync in the workspace**: The plugins `App`, `Filesystem`
  and `Share` used by the client are explicitly included in the native Android
  build in the monorepo; previously the generated plugin list stayed empty.
- **Omaha showdown comparison**: `evaluateOmahaHand()` now selects the actually
  strongest five-card combination within the same hand category instead of the
  first one iterated. The incorrect win of 9-9-2-2 against Q-Q-2-2 visible in
  the PLO trial session is guarded by an order-independent regression test.
- **PLO made-hand protection**: Vulnerable sets, straights and flushes receive
  their own dosed equity-denial impulse on flop and turn; the river is exempt
  from it. Protection therefore no longer deterministically overrides the
  archetype.
- **PLO LAG commitment**: Non-nut-oriented preflop and postflop all-ins damped
  considerably, normal raises however retained. Full ring and 6-max have
  separate late pressure/fold weights instead of a common compromise table.

- **Sizing normalisation**: Historical and current aggressive actions are
  compared uniformly as chips actually invested relative to the pot before the
  action; the current observation is factored out of its EMA comparison.
- **Passive all-ins**: All-in calls that are too short produce neither
  aggression nor sizing evidence and are treated like calls in reads.
- **VPIP on free checks**: A free check in the big blind counts neither in
  session reads nor in calibration as voluntary pot participation.
- **Bot swap at the table**: Name, avatar, engine player and replayer now switch
  to the new identity together; previously the old name stayed at the live seat.
- **Protection sizing**: `boardGotWorse` is passed on to the raise sizing
  calculation; the previously ineffective `any` access is removed.
- **Opponent reads**: A normally passive opponent bet no longer
  blanket-generates a call bonus; preflop and postflop reactions are dosed to
  different degrees.
- **Deep-stack all-ins**: Open-shoves over 40 BB as well as deep all-ins that
  are not yet invested sufficiently receive hard commitment limits instead of
  remaining selectable as a normal raise alternative up to 400+ BB. Calibration
  counts such open-shoves and uncommitted deep-shoves separately and fails on
  every hit. Normal raises that would round up to the maximum amount stay below
  the all-in as long as the shove is locked.
- **NLHE calling-station value**: Low aggression still reduces value bets, but
  no longer additionally triggers the bluff/initiative lock for made hands. The
  `sticky-postflop` influence decreases across the streets; repeated pressure
  punishes weak drawless call-downs on turn and river. PLO keeps its separately
  calibrated street tables.
- **Latent position field**: Removed the semantically wrong and unused
  `iAmInPosition` from the street analysis before it can accidentally be
  connected to scoring.

### Security

- **Transitive npm dependencies**: `brace-expansion` updated to 5.0.9 and
  `socket.io-parser` to 4.2.7; the high-severity audit is therefore free of
  findings again.
- **Electron security update**: Electron updated within the compatible 41 series
  to 41.10.4 and the install-script release approval brought up to date exactly
  by version; the high-severity advisories reported on 5 August are fixed by
  this.

## [0.7.8] — 2026-08-03

### Added

- **PLO preflop strategy table**: Archetype, situation, hand category and table
  size steer the preferred action; PLO uses a strategy weighting weakened
  compared to NLHE.
- **Mixed nit 6-max actions**: `raise-or-call` for good hands and `call-or-fold`
  for medium hands against an open broaden the range in a controlled way,
  without manipulating global postflop aggression.
- **Calibration diagnostics**: Profile and format filters as well as optional
  traces by street, hand category, PFA role and bet pressure added.
- **Calibration reports**: NLHE C-Bet redefinition, PLO metric audit and the
  final deterministic 10k values documented traceably.

### Changed

- **PLO calibration completed**: TAG, nit, LAG and calling station are within
  their humanly plausible target corridors in full ring and 6-max via VPIP, PFR,
  3-Bet, C-Bet, AF and WTSD.
- **PLO archetypes sharpened**: TAG/LAG 3-Bets, calling-station VPIP and the nit
  ranges for full ring and 6-max calibrated depending on the situation.
- **NLHE C-Bet**: The technically more precise metric counts the last preflop
  aggressor on an open flop; the target corridors were reset using the unchanged
  deterministic baseline.
- **Metric-dependent PLO targets**: Small corridor corrections take the cleaned
  AF, WTSD and 3-Bet definitions into account; the interim broad nit 6-max
  expansion to AF 4.5 / WTSD 40 was discarded.

### Fixed

- **WTSD denominator**: Players who see the flop and fold later remain in the
  denominator; preflop all-ins with automatic board runout are added correctly.
- **AF on all-ins**: Too short passive all-in calls count as calls instead of
  bets or raises.
- **3-Bet opportunities**: Later backraise opportunities are also counted after
  a previous action by the player in the denominator.
- **Calibration typecheck**: Test fixture adapted to the mandatory
  `preflopRaiseCount` specification.

### Known limitations

- **Heads-up calibration**: Remains fully planned for v0.8.0. The corrected NLHE
  run confirms 1.79% 3-Bet for calling station HU over 10k hands (63/3,512
  opportunities) against the previous corridor of 2–13%; behaviour and target
  deliberately remain unchanged in v0.7.8.

## [0.7.7] — 2026-07-30

### Added

- **Licensing**: Source code and original project assets placed under
  `AGPL-3.0-only`; licence scope, copyright and contribution rules documented.
- **Android prototype**: Capacitor 8, a checked-in Android project and scripts
  for sync, Android Studio, debug deployment and Gradle validation added.
- **Native runtime layer**: Web and Android are distinguished without a
  user-agent query; Android gets landscape orientation, immersive system bars,
  display cutout support as well as resume and back-button handling.
- **Local Electron start**: Version-bound releases for required dependency
  install scripts and a runtime check with a concrete repair instruction added.
- **Demo security**: Public demo sync initially switched to an allowlist and
  replaced after the Pages cutover by a static redirect to the main repository.
- **Dependencies**: Vite/Vitest as well as security-relevant transitive
  Express/Socket.IO dependencies updated to fixed versions.
- **Public readiness**: Security policy, reproducible CI, Dependabot, dependency
  review, CodeQL and a Pages deployment limited to public visibility added; main
  repository and official demo published.
- **Server configuration tests**: JWT secret, host and port validation included
  in the root test suite.
- **Responsive regression tests**: Production build in Chrome/Chromium for
  desktop, tablet, phone landscape and phone portrait secured against visible
  cards, seats, actions and viewport boundaries.
- **Test and distribution strategy**: Role-related alpha, beta and RC phases as
  well as feedback triage, privacy and suitable times for broader project
  presentations documented.
- **Local tester forms**: Standalone HTML sheets for blind NLHE FR realism,
  newcomer usability, UI/table design and general beta feedback with browser
  autosave, text file export, copying and optional smartphone sharing added.

### Changed

- **Mobile focus**: The GitHub Pages demo remains a functional, deliberately
  rudimentary smartphone fallback; the more extensive mobile operation is
  developed in the native Android prototype. A PWA is not planned.
- **Android operation**: Setup and table use the available landscape screen; the
  action bar combines main actions, amount, step control and slider in one
  compact row.
- **Small viewports**: Layout modes are determined via `matchMedia` from width,
  height and orientation, so that suitable tablets can continue to use the
  desktop layout.

### Fixed

- **Start script**: Build and Electron start use the defined npm workspace
  scripts and abort reliably on errors.
- **Responsive safety pass**: Action bar gets its own compact area in phone
  landscape, desktop and tablet keep distance from the hero seat, and portrait
  shows an understandable landscape hint.
- **Android fullscreen**: White stripe at the camera cutout removed and safe
  areas adopted in the native page frame.
- **Android setup and table**: Line wrap of "Starting Amount", too small
  hero/board cards and cut-off cards of the upper seats corrected in the
  prototype.
- **Android device onboarding**: Unreadable native blind preset dialog replaced
  by a fully visible app-specific selection, compact statistics anchored
  directly above the metadata in the header, direct touch peek of folded hero
  cards as well as mirrored safety margins for dealer buttons at hero and
  opposite bot corrected.
- **Android action bar**: Main actions distributed evenly, slider made
  touch-friendly in a vertically centred frame with a coarse scale, and
  3-BB/3×, pot and max presets permanently docked to the left above the visible
  action bar; free input remains as a deliberate secondary action.
- **Android export**: Hand and session exports that cannot be used reliably in
  the WebView hidden in the debug prototype.
- **Session start dealer**: The first dealer no longer sits permanently to the
  left of the hero in every session, but is chosen via its own random stream;
  set session seeds remain reproducible and subsequent hands rotate regularly.

### Known limitations

- **Android hand replayer**: The replay function is fundamentally available, but
  table and controls still appear too small and cramped on small displays. The
  responsive revision is planned for the common UI/replayer pass.
- **Android distribution**: There exists exclusively a local debug prototype
  without release signing, publication process or promised device
  compatibility.

### Security

- **Server fail-closed**: Insecure JWT default removed; the prototype now only
  starts with a secret at least 32 bytes long.
- **Local attack surface**: Default binding limited to `127.0.0.1` and
  history/statistics endpoints protected with bearer authentication.
- **Persistence**: SQLite data, WAL and SHM created with private file
  permissions; Docker build context excludes local secrets, databases and
  working files.
- **QA credentials**: Fixed dummy passwords replaced by random values generated
  per process.
- **Rate limits**: Registration and login as well as authenticated history and
  statistics routes limited against automated abuse and unthrottled queries.
- **GitHub hardening**: Secret scanning, push protection, private vulnerability
  reporting, SHA pinning for Actions and protection of `master` against
  deletion and force-push activated.

## [0.7.6] — 2026-07-29

### Added

- **Replay archive**: The last 200 locally stored hands are reachable via the
  table interface.
- **Regression tests**: Tests for PLO draws, session statistics, replay special
  cases, mental events, pot-limit actions and debug exports added.

### Changed

- **PLO personalities**: Position-dependent preflop evaluation as well as
  archetype- and street-specific score tables for TAG, nit, LAG and calling
  station introduced.
- **PLO draw evaluation**: Outs determined via physical unseen cards with
  exactly two hole cards and three board cards; wraps use 8/13 cards as
  thresholds.
- **Opponent reads**: Bots now also observe actions of other bots and record
  actions after their own fold.
- **Rebuy determinism**: Replacement identity and waiting time use the seedable
  session RNG.
- **Session replays**: No additional 50-hand limit in memory; the persistent
  archive remains limited to 200 hands.
- **PLO calibration**: Deterministic A/B run with 10,000 hands per archetype
  and format documented; the physically correct draw evaluation remains
  unchanged despite shifted target hits.

### Fixed

- **PLO flush draws**: A single hole card or runner-runner possibilities are no
  longer reported as a direct flush draw; nut and second-nut draws take the
  actually available hole cards into account.
- **PLO straight draws**: Omaha constraint, wheel-outs, already made straights
  and physical out counting corrected.
- **PLO tens**: `T` had the value 0 in the rank value table and distorted
  straight evaluations.
- **Session statistics**: VPIP/PFR/3-Bet counted once per player and hand;
  3-Bet opportunities arise only on the first action against exactly one raise.
- **Replay/export**: Dealer seat, call amounts, bet/raise/all-in types, running
  stacks, uncalled bets as well as split- and side-pot payouts corrected.
- **Mental events**: Folding bots are evaluated by their own net loss instead of
  the entire later pot; uncalled bets are deducted.
- **Pot-limit keyboard action**: The pot maximum is sent as `raise` instead of
  an invalid `all-in` on a legal full raise.
- **Archive navigation**: Hand numbers may occur twice between sessions without
  opening the wrong hand.
- **Card order**: `T` is sorted correctly between jack and nine in engine views.
- **Session debug export**: Omaha decisions contain all four hole cards; compact
  decision snapshots typed without `any`.

## [0.7.5] — 2026-07-24

### Added

- **Hero bust handling**: `startHand()` tries to start again every 2 seconds
  after a bust.
- **Setup formats**: Three direct buttons for heads-up, 6-max and full ring
  replace the bot slider.
- **Touch support**: Long press (600 ms) opens the rebuy menu.

### Changed

- NLHE think time reduced from 1.8–4.5 s to 1.2–3.0 s.
- Session stats moved inline into the header via toggle; bot data stay behind
  `Ctrl+D`.
- Cards, action buttons and table spacing scaled for smaller displays.
- Short-stack rebuy probability increased so that bots do not keep playing
  permanently with 0.5 BB.
- Format name replaces the generic player count in the header.
- Setup label "Starting Chips" changed to "Starting Amount".

### Fixed

- **BB tracking**: First hand was not counted (`heroPrevChips` started as
  `null`), rebuy falsified the balance (was counted as profit)
- **Runout spoiler**: Chips, `isSittingOut` and BB stats no longer jump
  prematurely — they wait for `finishHandPresentation`
- **Replayer crash**: `step` out of bounds on hand change (last move → previous
  hand)
- **Hero rebuy**: `applyPendingRebuys` now sets `isSittingOut = false` — hero
  remained stuck on "Sitting Out" after rebuy
- **Session log privacy**: "Dealt to" lines now only show hero cards, not bot
  hole cards
- **Bot rebuy spoiler**: `savedState` is now captured BEFORE
  `processAutoRebuys` — rebuyed stack not visible during runout
- **Omaha split pot**: `findWinnerIndices` only compared rank (1–9), ignored
  kicker. Now pokersolver `Hand.winners()` for correct comparison
- **Actionbar overlap**: Bottom padding 130→260px, table shell formula adapted
  to new paddings (320→470)
- **Landscape phone**: Media query `max-height: 450px` prevents scrolling,
  reduces paddings

## [0.7.4] — 2026-07-23

### Added

- **Session statistics**: Live VPIP/PFR/3-Bet for all players in a collapsible
  panel (📊)
- Session result in BB (green/red) and BB/100 in the header bar
- Session log export as readable poker text (download button in the stats
  panel)
- `session-stats.ts`: VPIP/PFR/3B tracking + BB/100 calculation + session log
  generator
- `SessionStats.tsx`: Collapsible component with player table and export

## [0.7.3] — 2026-07-23

### Changed

- **Personality tuning**: Aggression modifier `/4` → `/3.5` (LAG raise bonus
  +1.07), RiskTolerance call `/6` → `/8` (LAG call −0.75, nit call +1.04)
- TAG PLO: VPIP 22.7% / PFR 15.3% / AF 2.89 / WTSD 34.1% — 6/6 in range
- Nit PLO: WTSD 45→41% (direction is right, but still above target)
- LAG PLO: AF 1.60→1.73 (direction is right, but still below target)
- CS PLO 6-max: VPIP 60.0% now in range (was 60.8%)

## [0.7.2] — 2026-07-23

### Changed

- **WTSD fix**: Postflop showdown rate lowered via variant-specific category
  scores
  - `CategoryScoreTable` defined in `bot-variant-evaluation.ts`
  - `VariantEvaluation.categoryScores` → `DecisionContext.categoryScores` →
    `bot-action-scoring.ts`
  - NLHE: Scores identical to previous `params.scoring.handStrength` (no
    regression)
  - PLO: `call.medium` 20→8, `call.weak` −5→−8, `call.marginal` 5→0 (WTSD
    52%→36%)
  - TAG PLO 9-max: 6/6 metrics on target, TAG PLO 6-max: 6/6

### Fixed

- **PLO bot think time**: 3–8s → 2–5.5s (preflop was too slow)

## [0.7.1] — 2026-07-23

### Added

- **Omaha High**: Fully playable pot-limit Omaha variant
  - Variant selector in the SetupScreen (No Limit Texas Hold'em / Pot Limit
    Omaha High)
  - Omaha hand evaluation: `evaluateOmahaHand` with 60 2-of-4 + 3-of-5
    combinations
  - Engine support: 4 hole cards, pot-limit betting, `findWinnerIndices`
    dispatch
  - `omaha-hand-evaluation.ts`: Draw density (flush draw, wrap-outs), nut
    potential, preflop assessment (double-suited, connectedness)
- **Variant-specific bot think time**: NLHE 1.8–4.5s (max 12s), PLO 2–5.5s
  (max 20s)
- **Omaha calibration**: 12 archetype formats, TAG FR VPIP 30.8% / PFR 14.8% /
  AF 2.89 / WTSD 33.4% (10k hands)
- **Omaha UI**: 4-card layout with overlap (−16px), card backs adapt to the
  variant, hole cards sorted descending by rank (A→2)
- **Hand history export**: Variant-dependent header ("Omaha Pot Limit" /
  "Hold'em No Limit")
- **PLO/NLHE badge** in the TableScreen header bar
- `BettingStructure` type moved out into `betting.ts`, variants in `variants/`
  one file per variant
- `formatVariantName()` helper, `holeCardCount` prop for PlayerSeat/Replay

### Changed

- **Type system**: `[Card, Card]` → `Card[]` in 58 places (shared, engine,
  client)
- **Aggression modifier**: `/5` → `/4` (LAG NLHE AF 1.45→1.91, TAG unchanged)
- **Bot think time**: Min 900→1800ms, Max 1800→4500ms, Hard-Max 6000→12000ms
  (NLHE); PLO separately (see above)
- **Calling station**: Personality call bonus at dead air (no pair, no draws)
  scaled to 50%
- **Rebuy migration**: Old identities without `rebuyPolicy` get an
  archetype-true policy when loaded (no longer blanket 40 BB)

### Fixed

- **Top set (rank 4) in Omaha**: Was wrongly "weak" → now "good" (Lio checked
  top set on a Q-high flop instead of betting)
- **`detectFlushDanger`**: NLHE assumption "1 Hole Card = Flush-Redraw" → now
  Omaha-aware (needs 2 cards of the same suit)
- **ActionButtons**: Pot-limit all-in bug — button no longer sends `all-in`
  when `raise` is legal
- **`weightedChoice` fallback**: `fold` only when no other action is legal
  (previously blind fold with all negative scores)
- **Replay pot display**: Bet stacks accumulated too much (`totalBet` instead
  of `amount`)
- **Export menu**: Rendered via portal to `document.body` (no hiding by footer)
- **Debug mode in the replay**: `localStorage.replay-debug` for IPC window
- **Hand history header**: Foreign platform label replaced by "CPCdigital"

## [0.7.0] — 2026-07-22

### Added

- **Postflop calibration**: 5 new metrics in `simulation.ts` (C-Bet%,
  Fold-to-CBet, AF, WTSD, W$SD)
- **C-Bet targets**: Per archetype and format (TAG 35-55%, Nit 33-55%,
  LAG 42-70%, CS 25-45%)
- **PFA tracking**: Preflop aggressor detected and c-bet chances counted per
  position
- **`hand.strength`**: Numeric hand strength value 0-100 with draw quality bonus
  (up to +10)
- **Hybrid scoring**: Strength bonus (±5-10) in addition to the category system
- **Bluff c-bet bonus**: +15 for PFA with air on a dry board
- **Session evaluator c-bet patterns**: "PFA missed C-Bet", "Folded playable
  hand to C-Bet"

### Changed

- **C-Bet opportunity bonus**: Increased from +12 to +18
- **Check base values lowered**: air +20→+10, weak +20→+10, marginal +15→+8,
  medium +10→+5
- **Min reaction time bots**: 600ms → 900ms

### Fixed

- **"Free card for draw" bug**: Bonus wrongly also applied to PFA on the flop
  (contradicts c-bet logic)
- **PFA check penalty**: −30 for air/weak on the flop (not for good+)
- **C-Bet% raised from 20% to 47-60%** (TAG 6-max: 20% → 52%)
- **"You wins" → "You win"** in the result display

## [0.6.0] — 2026-07-22

### Added

- **Rebuy system**: Auto-rebuy on bust (rolled per identity, threshold 10–90
  BB), leave-on-bust, replacement bots with a 2–6 hand pause
- **Setup toggle**: "Auto-Rebuy & Ersatz-Bots" in the setup mask
- **Hand replay**: Deterministic replay from decision snapshots, table view with
  step forward/back, autoplay
- **Session navigation**: All hands of the session browsable (◀▶)
- **Hand history in poker text style**: Export per hand and for the whole
  session
- **Pot filter**: Filter the replay by minimum pot size (≥ X BB)
- **Cross-session history**: localStorage, max 200 hands
- **Bot decision reasons**: Scores and contributions as an export option
  (debug-only)
- **7-level hand evaluation**: premium > strong > good > medium > marginal >
  weak > air with board context
- **Board relativisation**: Top pair ≠ bottom pair, flush/straight/full house
  graded depending on board danger
- **Protection betting**: Board worsening detection (turn brings a third heart
  → sizing +0.08, scoring +8)
- **Parameter system**: `bot-params.ts` centralises ~50 tuning knobs,
  auto-calibrator via env vars
- **Auto-calibrator**: Random search optimiser with loss function, progressive
  narrowing
- **Rebuy manager**: `bot-rebuy-manager.ts` extracted from `LocalGameRunner`
  (907 → 241 lines)
- **Session folder**: `session/` for LocalGameRunner, rebuy manager, session
  evaluator, hand replay

### Changed

- **ReadTyp**: Bots track opponent bet sizing (pot fraction EMA), deviation
  detection (>2× overbet)
- **Raise sizing**: Short-stack reduction (effBb/50), reraise factor (×0.75),
  non-premium raises at ≤20 BB punished
- **Preflop reraising**: No more blind escalation with marginal hands (−35
  penalty)
- **Scoring tuning**: call.weak −5, fold.weak +5 (7-category system brought up
  to date), float-flop habit +10→+7
- **Pot visualisation**: Win amount appears at the winner, pot jumps to 0
- **Debug mode**: BotDebugInspector, cards-on, decision export behind Ctrl+D
- **Tidy up routes**: v0.6 → 19 points (better distributed on v0.5.2–v0.5.4 in
  retrospect)

### Fixed

- **Queue order**: `reopenBettingAfterRaise` now sorts clockwise from the raiser
  (was seat index)
- **Hand history format**: Blinds correct (via dealer position), chips without
  /100 division, raise format "raises to X"
- **All-in crash**: Game no longer freezes when only the hero is left (forced
  replacement)
- **Rebuy crash**: Missing `rebuyPolicy` field in old roster identities →
  default policy fallback
- **Replay data**: All hole cards stored (not only showdown), community cards
  accumulate correctly

## [0.5.1] — 2026-07-22 (unpublished, folded into 0.6.0)

## [0.4.0] — 2026-07-20

### Added

- Maniac as a rare extreme LAG expression (20% of the LAG identities, +15 on
  aggression/VPIP)
- 12 habits with archetype-specific preferences and consistency 55–90%
- Persistent local bot roster via localStorage with recurring identities
- Archetype-specific tilt reactions (LAG tips faster, nit recovers faster)
- Weighted observability per archetype (nit notices folds, LAG sees aggression)
- Reads with sample size, confidence and distorted priors (Beta distribution)
- Over-hasty reads: LAG/CS act from 2 samples, from 1 when tilted
- Roster expanded to 44 identities (12 new for 0.4, target 100+ by v1.0)
- Session debug export v2 with incremental action history and deduplicated
  context
- Mixed-table calibration across all archetypes with BB/100, W$SD and
  aggression/street
- Balance simulation with 7 randomised table compositions

### Changed

- `BotIdentity` extended by `maniac` flag and filled `habitIds`
- `DecisionContext` extended by `botHabits`, habits flow into action scoring
- Mental event multiplier per archetype introduced (LAG 1.3×, CS 0.5×)
- Tilt/confidence/patience modifier per archetype instead of uniform
- Session bot selection from strictly balanced to weighted random distribution
- `scoreCheck`/`scoreCall`: Trap intent only pre-river or out of position
- River check with a strong hand gets −20 malus in position
- `slowplay-monsters` habit only fires at `nuts`, not at `strong`
- Debug export limited to the last 5 hands, contributions flattened to strings
- Versioning in package.json, README and CHANGELOG set to 0.4.0

### Fixed

- TAG 3-bet full ring back in the calibration range (12.7% of 13.0%)
- Top pair on the river no longer wrongly classified as slowplay

## [0.3.1] — 2026-07-19

### Added

- Visible version number in the app
- Selection between dollar and euro display
- Typical blind presets with automatic 100-BB starting stack
- Simple right-click rebuy to the configured starting stack between hands
- Time-delayed reveal of flop, turn and river on all-in runouts
- Additional tests for runout, session history and amount formatting

### Changed

- Action button now switches appropriately between bet, raise and all-in
- Individual bet and raise amounts can be confirmed with Enter
- Money amounts avoid unnecessary decimal places and take the chosen currency
  into account
- Setup and table display further improved for test operation
- Roadmap extended by bot identities, session customisations, statistics and
  later table rules

## [0.3.0] — 2026-07-19

### Added

- General `BotContext` without hidden information
- Utility scores and traceable influencing factors for all legal actions
- Perception and evaluation imprecision depending on bot skill
- Separate states for personality, mental state, reads and session memory
- Weighted selection between plausible actions
- Situation-dependent bot reaction times
- Debug inspector for context, evaluations and decision reasons
- Variant registry and separate NLHE hand evaluation as a basis for further
  poker variants
- Extensive scenario tests for bot context, pipeline, skill, timing and decision
  sensitivity

### Changed

- Bot decisions take bet size, pot odds, effective stack and SPR into account
- Previous TAG logic transferred into a general, explainable decision pipeline
- Random errors replaced by traceable perception and evaluation deviations

## [0.2.1] — 2026-07-19

### Added

- More convenient bet size control with presets, slider and manual input
- Additional tests for position logic and amount formatting

### Changed

- Setup mask, table scaling, hole cards and community cards reworked for better
  legibility
- Raise presets adapted to preceding raises
- Display of small blinds and unnecessary decimal places corrected
- Action panel and keyboard operation stabilised

## [0.2.0] — 2026-07-18

### Added

- Fully local Electron runtime without a required server
- Legal actions determined by the engine and full betting context
- Correct min-raise, all-in, reopen, side-pot and split-pot logic
- Structured action history as events
- Deterministic hand replays and seedable random number generator
- Decision snapshots for every player action
- Separation of public and private game information
- Variant-neutral phase and betting structure
- Comprehensive unit and integration tests for central engine special cases
- First local NLHE bot pipeline and test simulations

### Changed

- Project focus definitively aligned to offline-first and singleplayer until
  v1.0
- Client split into setup, table, actions, cards and local game control

[Unreleased]: https://github.com/kaizo101/CPCdigital/compare/v0.8.2...HEAD
[0.8.2]: https://github.com/kaizo101/CPCdigital/compare/v0.8.1...v0.8.2
[0.8.1]: https://github.com/kaizo101/CPCdigital/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/kaizo101/CPCdigital/compare/v0.7.9...v0.8.0
[0.7.9]: https://github.com/kaizo101/CPCdigital/compare/v0.7.8...v0.7.9
[0.7.8]: https://github.com/kaizo101/CPCdigital/compare/v0.7.7...v0.7.8
[0.7.7]: https://github.com/kaizo101/CPCdigital/compare/v0.7.6...v0.7.7
[0.7.6]: https://github.com/kaizo101/CPCdigital/compare/v0.7.5...v0.7.6
[0.7.5]: https://github.com/kaizo101/CPCdigital/compare/v0.7.4...v0.7.5
[0.7.4]: https://github.com/kaizo101/CPCdigital/compare/v0.7.3...v0.7.4
[0.7.3]: https://github.com/kaizo101/CPCdigital/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/kaizo101/CPCdigital/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/kaizo101/CPCdigital/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/kaizo101/CPCdigital/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/kaizo101/CPCdigital/compare/v0.4.0...v0.6.0
[0.4.0]: https://github.com/kaizo101/CPCdigital/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/kaizo101/CPCdigital/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/kaizo101/CPCdigital/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kaizo101/CPCdigital/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kaizo101/CPCdigital/releases/tag/v0.2.0
