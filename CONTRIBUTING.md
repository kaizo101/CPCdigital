# Contributing to CPCdigital

Thank you for your interest in CPCdigital.

By submitting a contribution you confirm that you hold the necessary rights to
it and that you provide it under the
[GNU Affero General Public License Version 3](LICENSE) (`AGPL-3.0-only`).
Existing licence and copyright notices must not be removed.

Third-party material may only be included if its licence is compatible with
`AGPL-3.0-only` and if origin, licence and required notices are documented in a
traceable way. Generated or AI-assisted assets must likewise be checked with
regard to usage rights and documented as such.

For larger changes, please open an issue first with goal, scope and possible
effects on engine, replays, persistent data or calibration.

Suspected security vulnerabilities or accidentally published credentials should
not be reported as a public issue; please submit them confidentially as
described in [`SECURITY.md`](SECURITY.md).

For local Electron development, use `npm ci`: this installs the released
install scripts and the Electron binary. The `npm ci --ignore-scripts` variant
used in CI is suitable for tests and builds, but does not install a runnable
Electron binary. Further prerequisites and start commands are in
[DEV.md](DEV.md#quick-start).

Before changing module boundaries, read the current ownership and information
flow in [ARCHITECTURE.md](ARCHITECTURE.md).

Before a pull request, please run at least the following checks locally:

```bash
npm test
npm run build
```

Additionally run the checks that correspond to the type of change:

| Change | Additional check |
|--------|------------------|
| Bot decision, ranges, calibration or engine amounts | `npm run test:calibration` and `npm run test:stakes`; justify deliberate snapshot deviations instead of silently updating them |
| Table, setup, replay or responsive rendering | `npm run test:responsive` after the client build; Chrome/Chromium required, set `CHROME_PATH` if necessary |
| Android runtime or native integration | `npm run android:check` in a suitable Android SDK environment and one device run if the behaviour depends on it |

`npm run calibrate:release` is a separate release verification run and not a
requirement for every pull request. The test commands and their prerequisites
are described in [DEV.md](DEV.md#tests).
