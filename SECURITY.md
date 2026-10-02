# Security Policy

## Supported Versions

CPCdigital is in early development. Security fixes are provided for the current
state on `master` and, where practical, for the latest release. Older versions
do not receive guaranteed updates.

## Reporting a Security Issue Confidentially

Please do not publish suspected security vulnerabilities, credentials or private
game data in a public issue.

Instead, use a
[private GitHub security advisory](https://github.com/kaizo101/CPCdigital/security/advisories/new).
If possible, describe:

- affected version or commit
- reproducible steps
- expected and actual impact
- known prerequisites or possible mitigations

Please only submit credentials or personal test data to the minimum extent
necessary.

## Security Boundaries

The v1 product path is a local offline application without accounts, real
money, a public server or a required network connection.

`packages/server` is a dormant prototype for a possible v2 integration. It is
not documented as production ready and is not executed by the GitHub Pages
demo. Anyone running it locally must set at least `JWT_SECRET`, `CLIENT_ORIGIN`
and a suitable `DB_PATH`. Without explicit configuration, the server only binds
to `127.0.0.1`.

The GitHub Pages demo is a static build. It stores game states, replays and
settings exclusively in the browser and operates no server-side user
management.

## No Real-Money Features

CPCdigital processes no stakes, payouts or payment data. Bugs that presuppose a
real-money system are out of scope of the current feature set; reports about
unexpected network or payment integration are nevertheless explicitly welcome.