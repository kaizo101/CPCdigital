# CPCdigital

CPCdigital is an offline poker app primarily developed for the desktop:
singleplayer poker against credible bots, without real money, account or
server. The desktop app needs no internet connection to play; the public
browser demo has to be loaded online first.

The focus is human-like casual poker rather than simulated solver perfection.
Bots only receive information that a real player could know as well.

The latest release is **v0.8.2**. `CPCdigital` is still the internal working
title; the final product name is not required for this stabilisation cut.

## Highlights

- **Two variants:** No-Limit Texas Hold'em and Pot-Limit Omaha High
- **Flexible tables:** Heads-up, 6-max and Full Ring with adjustable blinds,
  starting stack and display in Euro or Dollar
- **Credible opponents:** TAG, Nit, LAG and Calling Station with different
  personalities, skills, reads and habits
- **Recurring identities:** 44 bots with their own behaviour; 40 have
  individual portraits
- **Traceable hands:** hand replay, optional browser-local archive, readable
  hand history as a text file and a compact debug export
- **Shared rules engine:** it handles side pots, split pots, all-ins, min-raises
  and staged runouts
- **Diagnostics and reproduction:** structured decision records and an optional
  debug inspector; session seeds are available for tests and simulations via
  the internal interface, not as a setup option
- **Multiple development platforms:** Electron desktop app, public browser demo
  and native Android debug prototype

## Project status

CPCdigital is under active development. The current focus is bot realism,
calibration and a stable offline playing experience for NLHE and PLO. Planned
work is governed by the [Roadmap](ROADMAP.md); changes that are actually
released are listed in the [Changelog](CHANGELOG.md).

Version 0.8.1 passed all technical and unchanged calibration gates. The final
10k/3k raw values and engine safety invariants are documented in the
[0.8.1 release gate report](calibration/v0.8.1-release-gate.md).
The [0.8.2 release gate](calibration/v0.8.2-release-gate.md) records the
clean-commit 10k validation, manual Android sign-off and live browser-demo
check. Diagnostic bot corridors remain guide rails rather than automatic
release blockers.

The official **[browser demo](https://kaizo101.github.io/CPCdigital/)** is built
directly from this public repository. It is suitable for a quick try-out;
desktop remains the primary development platform.

### Known limitations

- There are no public, validated platform-specific installers or signed release
  packages yet. An internal Linux AppImage packaging probe is available for
  developers, but is not a release.
- Bot balance and in particular complex PLO/heads-up postflop situations are
  still being calibrated.
- The hand history is a custom text format; common external replayers do not
  support importing it at the moment.
- Android is an unsigned landscape debug prototype. A limited interim fix keeps
  the hand replayer readable in the compact landscape layout; the full
  responsive replay and touch redesign will still follow together with the
  shared table geometry.
- The mobile browser view is only a functional fallback; a PWA and full mobile
  feature parity are not planned.
- Persistent session statistics, tutorials, deeper analyses and additional
  poker variants are not yet part of the stable feature set.
- The existing server is a dormant prototype. Online multiplayer is not part of
  the current offline app.

Concrete bugs and technical follow-up findings are not maintained in this list
permanently, but are documented in the roadmap, the changelog and the
respective test reports.

## Contact

For project questions, collaboration or non-sensitive feedback, write to
[kaizo101.poker@gmail.com](mailto:kaizo101.poker@gmail.com). Please report
security vulnerabilities or exposed private data through the confidential
channel described in the [Security Policy](SECURITY.md).

## Local development

[Node.js 24 LTS](.nvmrc), npm and, for the desktop app, a graphical environment
with Electron are required.

```bash
npm ci
npm run dev
```

On Linux, the built offline app can alternatively be started via `./start.sh`.
For an internal Linux x64 AppImage probe, run `npm run package:linux:internal`;
see the [desktop packaging notes](docs/en/guides/desktop-packaging-smoke.md)
before using the resulting artifact. This is not a public release build.

The Android prototype additionally requires Android Studio and SDK 36. The
complete workflow, calibration and debugging notes are in the
[developer documentation](DEV.md); current module boundaries are in
[ARCHITECTURE.md](ARCHITECTURE.md).

## Tests and build

```bash
npm test             # all workspace tests
npm run build        # build all packages and type-check the client
npm run test:responsive
```

The responsive smoke test requires a previous client build as well as Chrome or
Chromium. Bot calibrations are a separate release gate due to their runtime;
reproduction and baselines are documented in the
[calibration directory](calibration/README.md).

## Documentation

- [Documentation overview](docs/README.md) — entry point, status and storage of
  the in-depth documents
- [Roadmap](ROADMAP.md) — development phases and long-term vision
- [Changelog](CHANGELOG.md) — released changes per version
- [Architecture](ARCHITECTURE.md) — current offline runtime, state ownership and
  bot information flow
- [Developer documentation](DEV.md) — setup, Android, calibration and debugging
- [Calibration reports](calibration/README.md) — reproducible bot baselines;
  older reports remain in German
- [Testing and distribution strategy](testing/TESTING_STRATEGY.md) — test
  levels, roles and release communication (German)
- [Tester forms](testing/TESTER_FORMS.md) — templates for realism, usability,
  UI and betting tests (German)
- [Contribution guidelines](CONTRIBUTING.md) — contributions, rights and
  licensing
- [Security policy](SECURITY.md) — supported versions and confidential
  reports

## License

CPCdigital is licensed under the
[GNU Affero General Public License Version 3](LICENSE) (`AGPL-3.0-only`).
Copyright © 2026 Lukas Schäfer.

The licence scope covers the source code and the project assets created for
CPCdigital, including the avatar images generated with ChatGPT. Dependencies
and third-party material keep their respective licences; details are documented
in [NOTICE.md](NOTICE.md).

Anyone who distributes a modified version or offers it over a network must
comply with the applicable AGPLv3 conditions, including providing the
corresponding source code.

## Note

CPCdigital is a game and learning project without real-money features. The
current state is a development version and not a finished product.
