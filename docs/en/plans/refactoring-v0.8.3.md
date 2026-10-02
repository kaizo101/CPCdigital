# v0.8.3 — Refactoring scope

Status: planning state under the previous version number; re-scoping open.

This document specifies the technical scope of version 0.8.3, which is
deliberately kept compact in the [roadmap](../../../ROADMAP.md). All
refactorings remain behaviour-neutral and are carried out in separate
commits.

## Domain module boundaries

- `game.ts`: separate showdown logic, player management and betting round into
  their own modules.
- `bot-action-scoring.ts`: keep as a small public facade; move out preflop,
  NLHE postflop, PLO postflop, risk/candidate gate and shared scoring
  responsibilities. Parameters, selection limits and behaviour remain
  unchanged.
- `LocalGameRunner.ts`: separate session control, replay/history recording,
  bot timing and export integration from each other.
- `session-debug-record.ts`: separate schema, compression, JSONL codec and
  platform-specific download or respectively Android streaming; export format
  v4 and backwards compatibility remain unchanged.
- `simulation.ts`: separate calibration targets/profiles, simulation run,
  statistics/invariants and reporting so that release gates do not remain
  coupled to bot strategy.
- `TableScreen.tsx`: reduce to table orchestration and move replay, export
  and overlay control into delimited hooks or components. Only afterwards
  split `ActionButtons.tsx` along the existing rendering, amount and action
  limits.

## Tests and shared helpers

- Split the large bot tests along the new domain modules, in particular
  `bot-pipeline.test.ts` and `bot-action-scoring.test.ts`; do not move
  regressions nor replace them by broader assertions.
- Check NLHE/PLO hand evaluation for genuinely shared board, draw and
  made-hand helpers. Variant rules stay separate if they are not identical.
- `bot-params.ts` stays together as long as the file predominantly contains
  declarative configuration; size alone is not a reason to split.
- Add integration tests for the continuous Engine → `LocalGameRunner` pipeline
  from blinds to showdown.
- Cover empty state, going bust and quick session restarts as edge cases.

## Architecture and convention documentation

- After the module split, document the actual bot data flow for external
  developers using a concrete decision: public engine view and hand history,
  variant evaluation, objective context, skill-dependent perception,
  scoring/modifiers and candidate selection. Name data ownership, information
  boundaries and NLHE/PLO-specific assumptions; the short sketch in `DEV.md`
  remains only an entry point until then.
- Briefly record the amount and state conventions of the engine at the new
  module boundaries: currency unit and rounding, street total amount of a
  raise versus the additionally payable call, live pot versus winnable pot,
  main/side pot contributions and responsibility for the action order. Verify
  the description against existing types and edge case tests, do not derive it
  from identifiers alone.

## Domain cleanup required

- Derive the bet level action-based as `unopened`, open, 3-bet and 4-bet+ from
  the actual number of raises instead of from a 4-BB sizing limit. Unusually
  large opens and small 3-bets must be separated correctly.
- Remove obsolete bot files such as `bot.ts` and duplicate helpers.
- Keep the dormant `server` package clearly separated from the v1 build path
  and document its v2 interface assumptions.
- Introduce the Prettier configuration in a separate mechanical commit and add
  documented format and lint commands.
- Measure the production bundle again at the 0.8.3 cut. The starting value is
  a main chunk of **522.03 KB minified or respectively 144.55 KB gzip** with a
  general Vite warning threshold of 500 KB. Only split dynamically along
  domain boundaries that arise anyway and check the start/replay path in
  Electron and Android afterwards. Do not merely raise the warning threshold;
  getting below 500 KB without a measurable runtime benefit is not a release
  gate of its own.

## Behaviour-neutral gate

- Workspace tests, production build and stake invariance stay green after
  every structural commit.
- The deterministic calibration snapshot remains exactly identical; a result
  merely within the warning or error tolerances is not sufficient.
- Public facades, debug format v4, replay archives and existing persistence
  data remain compatible.

## Public readiness and provenance proof

- Central bot and engine files receive machine-readable
  `SPDX-FileCopyrightText` and `SPDX-License-Identifier` notices.
- Future release tags are cryptographically signed and the local verification
  is documented briefly; the published tag `v0.7.7` is not changed afterwards.
- Per release a lightweight bot provenance manifest is created from exact file
  hashes and normalised token/AST fingerprints.
- Published releases are additionally archived at Software Heritage and
  documented with their content-based SWHID.
- A short monitoring and evidence preservation guide describes the handling of
  characteristic public code fragments, suspicious repositories and AGPL
  compliance cases.

These measures are not directed at transparent forks or AGPL-compliant
commercial use. Neither telemetry nor phone-home logic, obfuscation,
deliberate dead code nor a hidden runtime watermark is created.
