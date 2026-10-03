# Internal desktop packaging probe

Status: historical local 0.8.2-dev experiment, 3 October 2026. This is **not** a public
release or a replacement for the 0.9.5 packaging gate.

## Build

On Linux x64, with Node.js 24 and project dependencies installed:

```bash
npm run package:linux:internal
```

The script builds the client and Electron shell, then creates an unsigned
AppImage under `dist/desktop-internal/`. The output directory is ignored by
Git. The configuration is in `electron-builder.config.cjs` and uses the
already installed, pinned Electron distribution. It includes only the
compiled Electron shell, built web client, `LICENSE` and `NOTICE.md` as
application resources; the server package and repository files are excluded.
The temporary desktop app ID is `dev.cpcdigital.desktop`. Publishing and
auto-update configuration are disabled. The Electron default icon remains
until the final product identity is chosen.

## What was verified

- The Linux x64 AppImage built successfully from the then-current dirty 0.8.2-dev
  working tree. Its `app.asar` contains `dist/main.js`, `dist/preload.js` and
  the Electron package metadata; the built client and licence notices are
  present in `resources/`.
- From outside the repository with an isolated temporary user profile, the
  unpacked package started with `--disable-gpu`. Its loaded window pointed to
  the packaged `resources/client/index.html`, and the rendered page contained
  the CPCdigital 0.8.2-dev setup controls for NLHE and PLO.
- A direct AppImage launch could not be validated on this host: FUSE is
  unavailable in the test sandbox, and the extraction fallback hit a GPU
  process failure in this environment. The unpacked start above checks the
  packaged application files, but not AppImage mounting on a normal system.
- A workspace-wide `npm audit --omit=dev` at the time reported one high and
  four moderate advisories under the dormant server dependency tree
  (`engine.io`, `ip-address` and `qs`). Compatible lockfile updates resolved
  these later; the 0.8.2 release-candidate production audit found zero
  vulnerabilities. This historical packaging probe has not been repeated on
  the clean release candidate.

## Still required before sharing builds

Test the AppImage without diagnostic flags on a separate Linux machine:
launch, setup, NLHE, PLO, hand replay, exports and offline behaviour. Repeat
from a clean, versioned source tree after the 0.8.2 release gate. A Windows
EXE has not been built or tested. Final naming, icon, Electron security
hardening, platform notices and public-release checks remain on the roadmap.
