# Developer documentation

## Quick-Start

Use Node.js 24 LTS from [`.nvmrc`](.nvmrc); Node.js 26 lies outside the
supported range.

```bash
npm ci
npm run dev          # Vite + Electron
npm test             # all workspace tests
npm run build        # build all workspaces and type-check the client
npm run test:responsive
```

The version-bound `allowScripts` policy in `package.json` permits only the
required install scripts of Electron, esbuild, bcrypt and better-sqlite3. When
these packages are updated, the approved version must deliberately be updated
along with them. `npm run dev` and `./start.sh` check before starting whether
the Electron binary is fully installed.

## Android debug workflow

The Android state is a local Capacitor 8 prototype, no release artefact. The
native project under `android/`, `capacitor.config.ts` and the runtime
integration are versioned. Copied web assets, `local.properties`, Gradle
outputs and APKs stay generated and are not checked in.

Prerequisites are Node.js 24, Android Studio, SDK 36 as well as a device that
is reachable via ADB or an emulator. The usual change cycle is:

```bash
npm run android:sync    # build the client and sync web assets/plugins
npm run android:open    # open the project in Android Studio
npm run android:run     # alternatively sync and deploy directly
npm run android:check   # sync plus Gradle assembleDebug
```

`scripts/android-gradle.mjs` looks for `CPC_ANDROID_JAVA_HOME` first, then for
the JBR of an Android Studio installation found via `CPC_ANDROID_STUDIO_HOME`
or at the usual locations. The SDK is determined via `ANDROID_HOME`,
`ANDROID_SDK_ROOT` or `~/Android/Sdk`. This keeps the build reproducible even on
a system with an incompatible Java 26.

The native runtime is detected in `native-runtime.ts`. Android runs in
`sensorLandscape`, hides the system bars, handles display cutouts via CSS safe
areas and restores the immersive state after `resume`. The native back button
first closes UI layers that were opened and only then quits the app. Setup and
table have a simple Android-specific full-screen path; the browser demo
remains a separate rudimentary mobile fallback. A PWA is not planned.

### Completed APK inventory

The qualitative run-through and the shortened control matrix on real hardware
are complete. The following was checked:

1. Check setup, table and action bar in NLHE and PLO.
2. Check heads-up, 6-max and Full Ring each for assignment, overlap and
   clipped cards or bets.
3. Trace camera cutout, system bars, native back button as well as app switch
   and resume.
4. Compare board, hero hole cards, upper pods, card backs, stack and bet
   displays photographically or by means of screen recording.
5. Spot-check the functional but geometrically too small Android hand replayer
   in all formats; its complete redesign remains in v0.9.1.
6. Classify findings as blocker for 0.7.7, ordinary mobile UX topic or
   TableGeometry work for 0.9.0.

Device run and control matrix are documented in the
[APK device report of 30 July 2026](testing/apk/2026-07-30-device-inventory.md).
It separates immediately correctable 0.7.7 errors from the points that are
deliberately deferred to TableGeometry and responsive UI. As far as can be
assessed, the Android replayer is functional; its too small and squeezed table
geometry remains documented for v0.9.1.

## System architecture

The current offline runtime, state ownership, bot information boundary and
game loop are described in [ARCHITECTURE.md](ARCHITECTURE.md). The older
[architecture target state](docs/en/plans/architecture-target-state.md) is a
historical planning document, not an alternative description of current code.

## Adding a new variant

The existing variants are NLHE and PLO; `omaha-hand-evaluation.ts` is already
the PLO implementation, not a template for a file to be newly created. A
further variant needs at least the following coordinated steps:

1. Define the engine rules as `GameVariant` under
   `packages/poker-engine/src/variants/` and export them via
   `packages/poker-engine/src/index.ts`. The phase types are in
   `game-variant.ts`; showdown ranking and card usage in `hand-evaluator.ts`
   must be explicitly checked for the new rules.
2. Implement a variant-specific `VariantEvaluator` in the client and register
   it in `bot-variant-registry.ts`. `evaluate(context)` returns a complete
   `VariantEvaluation`, including `handAssessment`, `boardTexture` and
   `categoryScores` (optionally `preferredRaiseTo`).
3. Extend the variant selection in `session/LocalGameRunner.ts` and
   `screens/SetupScreen.tsx`. The runner currently maps only `omaha-high`
   explicitly and falls back to NLHE for other IDs; merely registering the
   evaluator is therefore not enough. Also check the replay/hand history labels
   in `session/hand-replay.ts` and the affected UI card rendering.
4. Add engine, bot, session and replay tests for the variant. Calibration
   profiles and target corridors are currently limited to NLHE/PLO; a new
   variant needs its own justified test plan instead of a silent inclusion in
   the existing 24-combination report.

The shared bot pipeline uses `VariantHandAssessment`, but variant-specific
scoring assumptions and skill perception must be checked for technical
correctness; unchanged behaviour is not automatically correct. The engine
currently only runs community card variants with two or four hole cards. Draw
phases are reserved in the type model, but not yet implemented in `PokerGame`;
draw and stud games therefore require more than new configuration.

## Starting the dormant server prototype locally

The server is not part of the v1 runtime path and is not started by
`npm run dev`. For a deliberate local run, at least a strong JWT secret and a
local database path must be set:

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
export DB_PATH="./.local-data/cpcdigital.db"
npm run dev --workspace @cpc/server
```

Without `HOST` the process binds exclusively to `127.0.0.1`. For a container or
network release, `HOST`, `CLIENT_ORIGIN`, TLS on the upstream proxy and
persistence must be deliberately configured. History and statistics endpoints
require a valid bearer token. The example variables are in
[`.env.example`](.env.example).

## Calibration

The bot calibration (VPIP, PFR, 3-Bet, C-Bet, Fold-to-CBet, Turn C-Bet, AF
and WTSD) is measured with `npm run calibrate:bots`. Without `CALIB_HANDS` the
release stage runs with 10,000 hands per format × 3 formats × 4 archetypes.

For PLO, `CALIB_VARIANT=omaha-high` is set. Seeds and hand count must remain
identical in A/B comparisons. `CALIB_DETAIL=1` adds raw denominators and the
AF breakdown. `CALIB_PROFILE` and `CALIB_FORMAT` limit targeted development
runs. Corridor outliers are reported, but on their own no longer lead to an
exit code different from zero. Structural violations remain blocking even in a
diagnostic run; `CALIB_NO_EXIT` is obsolete.

The results are stored under version control in `calibration/`. The
format-isolated baseline is documented in the
[v0.8.0 report](calibration/v0.8.0.md).

The published 0.8.1 state is recorded in the
[release gate report](calibration/v0.8.1-release-gate.md). Tests, build,
responsive smoke, layer 2 regression, structural invariants and all unchanged
target ranges are green. The 300-hand snapshot from that time is retained as a
historical reference. The regression currently in use references the later
[0.8.2 foundation snapshot](calibration/v0.8.2-foundation-300-hand.json).

For new releases, complete versioned raw reports are mandatory. Zero
denominators appear as `n/a`; outliers are triaged by magnitude,
repeatability and effect on play. An explicitly justified acceptance is
possible, a structural violation is not. Details are in
[calibration/README.md](calibration/README.md).

Since metric schema v2, Turn C-Bet denotes exclusively a genuine double
barrel: the same player was preflop aggressor and flop c-bettor and opens a
previously unopened turn. A turn bet after a checked flop does not count as a
Turn C-Bet.

`npm run test:calibration` runs the deterministic layer 2 smoke for all 24
variant/archetype/format combinations. It compares 300 hands per combination
with the versioned 0.8.2 foundation snapshot and also runs in CI. Rates warn
at more than 2 percentage points of drift and fail above 5 percentage points;
AF uses absolute thresholds of 0.2 and 0.5. `npm run calibrate:baseline`
updates the reference only after a deliberately approved behaviour change.

For the bot-relevant release gate,
`npm run calibrate:release -- --output calibration/evidence/<eindeutiger-name>.json`
produces a machine-checkable raw report. It checks all 24 combinations for
completeness and confirms outliers as well as metrics with fewer than 50
opportunities with an independent seed. `--hands N` serves short development
runs; the default is 10,000 hands per combination. With
`npm run calibrate:release -- --validate <pfad>` a report can be checked again.
The selection rule and release triage are in
[calibration/README.md](calibration/README.md).

For fair A/B comparisons, individual calibration hands have their own deck and
decision seeds as well as a dealer rotated explicitly from the hand number.
Later deals therefore remain identical, even if a strategy change shortens an
earlier runout. Bot session states, on the other hand, are deliberately not
reset, so that real knock-on effects on reads and behaviour remain
measurable.

### Sample sizes

| Stage | Hands/format | Total | Purpose |
|-------|-------------:|------:|---------|
| Smoke | 300 | 3,600 | runtime errors, invalid actions, gross outliers |
| Development | 3,000 | 36,000 | directional comparison during targeted tuning |
| Release | 10,000 | 120,000 | reproducible report before bot-relevant releases |
| Confirmation | 20,000–50,000 | 240,000–600,000 | close thresholds or statistically conspicuous A/B differences |

The runtime depends strongly on the variant and evaluator; physical PLO outs
are considerably more expensive than NLHE. A 20k–50k run is therefore not a
blanket minor release ritual, but a targeted confirmation when 10k does not
allow a clear decision.

Example of a PLO smoke run:

```bash
CALIB_VARIANT=omaha-high CALIB_HANDS=300 npm run calibrate:bots
```

## Parameter system

`bot-params.ts` centralises ~120 tuning-relevant constants in one object.
Categories concerned:

- Archetype means (12 parameters)
- Scoring weights (fold/check/call/raise/all-in per category)
- Betting factors (pot odds, sizing, SPR, reraise penalties)
- Preflop coverage tables
- Stack depth thresholds
- Mental state magnitudes

The auto-calibrator (`scripts/calibrate.ts`) varies only the archetype means.
Scoring weights and betting factors are tuned manually.

## Tests

- `npm test` runs all workspace tests with Vitest
- `npm run test:calibration` checks the deterministic 300-hand baseline of all
  24 bot combinations; this short calibration smoke runs in CI
- Test files are located next to the source files (`*.test.ts`)
- Client, engine and server configuration tests run in separate workspaces
- `npm run test:responsive` starts the built client in Chrome/Chromium and
  checks 1440×1000, 1024×768, 844×390 and 390×844 for clipped cards, seats,
  action bar overlaps and the portrait guard
- Development and release calibrations with 3k/10k hands remain separate
  scripts because of their runtime

The responsive smoke requires a previous client build and uses `CHROME_PATH`
if Chrome/Chromium is not located at a usual system path. With
`CPC_RESPONSIVE_SCREENSHOT_DIR=/ziel` it additionally writes one screenshot
per viewport. It deliberately defines only outer acceptance boundaries and does
not preempt the TableGeometry SSOT planned for 0.9.0.

### External tests

External tests follow the
[testing and distribution strategy](testing/TESTING_STRATEGY.md). Poker
realism, usability for newcomers and technical bet tests are separate test
assignments, each with its own form from
[TESTER_FORMS.md](testing/TESTER_FORMS.md). They complement automated tests and
calibrations, but do not replace their release gates.

## Debug mode

`Ctrl+D` in the game activates the debug mode:
- BotDebugInspector (decision details, scores, reads per bot)
- "Cards on" in the replay (all hole cards visible)
- Decision export in the replay

The session debug export (`.jsonl`, schema v4) contains the complete course of
the game including private bot cards and is intended for offline analysis.
Earlier v1-v3 JSON files remain historical formats; there is no silent import
or a rewriting of old exports.

The first JSON line describes the session, app version, profiles, identities
and the legends of the compact tuple fields. After that follows exactly one
line per hand, also for a hand that is still running. It contains unchanged
player events, private hole cards once per player and all bot decisions. The
last line is a footer with the hand and decision count. If it is missing or
the counters do not match, the file counts as incomplete.

Each bot decision contains the stable ID of the selected candidate, all legal
candidates, all non-zero contributions, the unchanged 85% selection
diagnostics, objective hand/range values as well as deltas of the
skill-dependent perceived view. Preflop roles, positions and the actual
sequence of aggression are retained. Diagnostic floating-point numbers are
limited to a maximum of six decimal places; chips and player events remain
unchanged. Duplicate formatted score strings and session-wide duplicated
decision snapshots are not part of v4.

At runtime, the last 50 rich decisions stay in memory for the inspector and all
rich decisions of the current hand for the replayer. The complete compact hand
record has no session limit. On export, chunks of roughly 256 KB are produced:
Android first writes a cache file and appends the remaining chunks before the
share dialog is opened; in the browser a blob is created from the same chunks.
A 100-hand stress test with ten complete bot decisions per hand forces at most
102 JSONL lines and less than 4 MB. The file contains private cards and is
therefore not intended for public sharing.

The export button in the session statistics opens a selection:

- Hand history in its own text format (`.txt`) for compact reading and sharing;
  compatibility with external replayers is not promised
- compact complete debug session (`.jsonl`) for reproducible root cause
  analysis

## Bug reproduction

1. Create a complete debug session via the export button in the session
   statistics or the button in the debug inspector
2. Open the replay of the affected hand (↻ button)
3. Trace the course of the game with step-through and "Cards on"
4. Check the bot decision reasons in the debug inspector

## Licence and distribution

The repository is licensed under `AGPL-3.0-only`. The full terms are in
[`LICENSE`](LICENSE), copyright and scope statements in
[`NOTICE.md`](NOTICE.md). Contributions are accepted under the same licence in
accordance with [`CONTRIBUTING.md`](CONTRIBUTING.md).

For later binary packages, the following applies in particular:

- ship the licence text and the required copyright notices
- make the corresponding source code belonging exactly to the binary package
  available on equivalent terms
- retain the licences and required notices of bundled third-party components
- for a modified network-capable v2 version, provide a clearly visible free
  source access

The direct Pages build is in `.github/workflows/pages.yml`. It deploys only
`packages/client/dist` from `master` and embeds this repository as a source
link. The official demo is available at
<https://kaizo101.github.io/CPCdigital/>.

The former repository `cpcdigital-demo` now only delivers a static redirect.
Its old source state is preserved in the Git history; the previous allowlist
sync was removed after the successful cutover. Archiving will only take place
after a reasonable transition period.

## Public release and operational controls

The public cutover of 29 July 2026 covered:

1. complete secret scan across working tree and Git history
2. `npm ci --ignore-scripts`, `npm test`, `npm run build` and `npm audit`
3. check for tracked databases, `.env` files, keys and credentials
4. Secret Scanning, Push Protection, Private Vulnerability Reporting and CodeQL
5. exclusively GitHub's own actions, fully pinned by commit SHA
6. protection of `master` against deletion and force push
7. check of the Pages bundle for version, AGPL notice and source link
8. browser check of the redirect from the former demo repository

For further releases, tests, build, audit, CodeQL and the variant-specific
calibration gates remain mandatory. Release tags are only created after a
successful gate on the checked release commit and are published together with
the associated branch.

The current technical finding is documented in the
[public readiness audit of 29 July 2026](security/audits/2026-07-29-public-readiness.md).

## Known limitations

- **Scoring is additive**: contributions are summed, there is no clamping
  between layers. An extreme habit (+30) can override all other modifiers.
- **No GTO basis**: all decisions are based on heuristics, not on
  game-theoretic calculations. This is intentional (casual instead of solver).
- **Reads heuristically calibrated**: bots observe Hero and other bots; real
  human playing behaviour is not yet validated.
- **Persistent roster**: bot identities are stored in localStorage. After
  deleting the browser data, a new roster is generated.
- **Local hand archive**: the last 200 replays are stored in localStorage and
  are lost when the browser data is deleted.
- **Replay per platform**: separate browser windows only work in Electron.
  Browser and Android use an overlay; the compact Android landscape replayer
  is usable again thanks to an interim fix and is covered in the responsive
  smoke for 2-max, 6-max and 9-max. The shared responsive revision still
  follows with the TableGeometry SSOT.
- **Android only as a debug prototype**: device compatibility, release
  signing, distribution and complete mobile feature parity are not yet
  promised. The qualitative first inventory is complete; the full
  variant/format/lifecycle matrix is still outstanding.
- **Mobile geometry**: safety fixes prevent the currently known top card
  clips. Consistent seat, card and bet geometry follows only with the
  TableGeometry SSOT in v0.9.0.
- **Dormant server prototype**: `packages/server` is deliberately retained for
  a possible v2 integration, but is not imported by the offline client and is
  not a v1 production path. Its current hardening does not replace a production
  security audit.
- **Formatting**: a shared Prettier configuration is not yet checked in; the
  mechanical standardisation is planned for the code quality block in v0.8.3.
