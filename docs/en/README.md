# Documentation

> German version of this page: [Dokumentation](../de/README.md)

This page is the entry point to the in-depth project documentation. The
[project overview](../../README.md) stays deliberately short; the
[roadmap](../../ROADMAP.md) describes planned work and the
[changelog](../../CHANGELOG.md) the changes actually implemented. A planned
version number in an older document is not a release commitment.

The root documents `README.md`, `DEV.md`, `ROADMAP.md` and `CHANGELOG.md` still
exist in German only and are linked from here in their German form.

## Use this now

| Question | Authoritative source |
|-------|--------------------|
| How do I build, test or debug the app? | [Developer documentation](../../DEV.md) (German) |
| What is planned or already released? | [Roadmap](../../ROADMAP.md) and [Changelog](../../CHANGELOG.md) (German) |
| How do I check bot statistics and regressions? | [Calibration](../../calibration/README.md) (German) |
| How do I organise external tests? | [Testing strategy](../../testing/TESTING_STRATEGY.md) and [forms](../../testing/TESTER_FORMS.md) (German) |
| How do I report a security issue? | [Security policy](../../SECURITY.md) (German) |

## In-depth documents

- **Concepts and evidence:** [literature and evidence register](concepts/literature-and-evidence.md),
  [bot dynamics and stake roster](concepts/bot-dynamics-roster-and-notes.md) and
  [product naming notes](concepts/product-naming.md). These are working
  foundations, not fully implemented specifications.
- **Planning:** [refactoring scope](plans/refactoring-v0.8.3.md),
  [session flexibility](plans/session-flexibility-v0.8.4.md),
  [bankroll concept](plans/bankroll-v1.0.1.md) and the
  [historical architecture target state](plans/architecture-target-state.md).
  The file names preserve the original version planning; the roadmap is
  authoritative for current prioritisation. Completed milestones up to 0.8.1
  are in the [roadmap archive](plans/roadmap-archive-through-0.8.1.md).
- **Reviews and audits:** [offline core addendum](reviews/offline-core-review-2026-09-29.md),
  [perception limits](reviews/bot-perception-limit-audit-2026-09-30.md),
  [opponent reads](reviews/opponent-reads-information-flow-audit-2026-09-30.md),
  [PLO preflop abstraction](reviews/plo-preflop-abstraction-audit-2026-10-01.md),
  [PLO postflop session](reviews/plo-postflop-session-2026-10-01.md)
  and the PLO addenda on [wrap-outs](reviews/plo-wrap-outs-review-2026-09-30.md),
  [made-hand redraws](reviews/plo-made-hand-redraw-review-2026-09-30.md),
  [straight-flush nuts](reviews/plo-straight-flush-nut-review-2026-09-29.md)
  and [quads](reviews/plo-quads-nut-review-2026-09-29.md).
  The [older module review](reviews/review-2026-08-07.md) is a historical
  review state, not a current overall assessment.
- **Guides:** The [optional avatar workflow](guides/avatar-workflow.md)
  describes the external creation of image material.

Release-related measurements and baselines stay in
[`calibration/`](../../calibration/) (German), device findings in
[`testing/apk/`](../../testing/apk/) (German) and security checks in
[`security/audits/`](../../security/audits/). These locations are part of the
respective workflows and are not moved merely for a flatter directory
structure.

New documents should fit exactly one of these roles. Historical findings get a
date and a status; current rules belong in the authoritative entry point rather
than in several competing copies.
