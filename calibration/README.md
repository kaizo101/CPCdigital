# Calibration history

Calibration results are retained per release as reproducible comparison data.

## Release gate: required measurements, not mandatory corridor compliance

Before a release that changes bot behaviour, run deterministic NLHE and PLO
calibrations for every affected archetype and table format. Record the app
version and commit, hand count, seed procedure, metric definitions, and raw
numerators and denominators. Target corridors are **diagnostic guardrails**,
not automatic release blockers. Small deviations may be accepted with a
reason or recorded for follow-up; large, systematic, or gameplay-relevant
deviations need causal triage and an explicit release decision. Never adjust
corridors merely to fit a run.

Invalid actions, broken metric or showdown invariants (including a mismatch
between a rate and its raw counts), non-finite measurements, and the protected
deep-shove cases remain **blocking**. A rate with zero opportunities is `n/a`,
not 0% or a corridor violation. AF without calls is likewise not evaluable.
The 300-hand snapshot is a separate drift alarm: investigate failures after
intentional strategy changes and update the baseline only after review, not
by widening target corridors.

Depending on the release, reports contain:

- VPIP, PFR, 3-bet, C-bet, AF, and WTSD for calibrated archetypes and formats
- deterministic development runs and 10,000-hand confirmation runs
- metric definitions and reasons for any change to a target corridor
- structural invariants such as invalid actions, deep-stack open shoves, and
  uncommitted deep shoves
- documented, finding-driven manual trial sessions without a fixed hand quota;
  triage conspicuous hands and expand the sample when warranted
- reproduction instructions using `npm run calibrate:bots`

Run the short Layer-2 regression with `npm run test:calibration`. It simulates
300 hands for all 24 combinations of NLHE/PLO, four archetypes, and three
formats, then compares them with the
[v0.8.2 foundation snapshot](v0.8.2-foundation-300-hand.json). Changes of more
than 2 percentage points warn; changes of more than 5 percentage points or
structural violations fail. For the non-percentage aggression factor, the
warning and failure thresholds are 0.2 and 0.5.

`npm run test:stakes` also compares deterministic NLHE and PLO 6-max runs at
proportionally identical `0.01/0.02` and `10/20` tables, each with 100 BB.
Given the same identity, skill, and situation, normalized statistics and
structural invariants must agree. Different real stack depths or chip units
are intentionally outside this invariant.

Normal tests do not modify the snapshot. After an intentionally approved
strategy change, regenerate it with `npm run calibrate:baseline` and inspect
the diff.

### Machine-verifiable release report

`npm run calibrate:release -- --output calibration/evidence/<unique-name>.json`
runs 10,000 hands per combination for NLHE and PLO by default. The output
file must be new; the command will not overwrite an existing report.
`--hands N` is only for development and smoke runs. Validate an existing
report with `npm run calibrate:release -- --validate <path>`.
The command prints the current primary or independent-seed confirmation run,
each cell's completed hand count at roughly ten-second intervals, and a
30-second heartbeat if a run is still active. These messages are diagnostic
only; seeds, metrics, and the final report schema are unchanged. The report is
written only after all runs complete and validation passes, so this does not
provide checkpoint/resume support.

The report contains app version, commit, dirty-worktree status, timestamp,
metric schema, hand count, seed salts, and all 24 variant/archetype/format
combinations with metrics, target ranges, and raw numerators/denominators.
Validation requires exactly those 24 combinations, plausible raw counts,
structural invariants, and all required confirmation runs. The short 300-hand
snapshot remains a separate regression and is not replaced by this report.

A second, independent seed series is run **only** for combinations with at
least one metric outside its corridor or fewer than 50 opportunities,
including a zero denominator. Confirmations use the same hand count and
record the affected metrics and full raw values. They do not automatically
decide release approval: persistence, sample size, and gameplay impact must
be assessed in the release report. A dirty-worktree report is marked as such
and must be matched to a commit before release.

Deck and decision seeds are derived separately for each hand from profile,
format, and hand number; the dealer rotates explicitly. Ending a runout
earlier or later therefore no longer changes the cards or random streams of
all subsequent hands. Session state remains intentionally persistent so
genuine strategic follow-on effects stay visible.

## Origin and status of target corridors

Research, data sources, and their review status are recorded in the
[literature and evidence register](../docs/en/concepts/literature-and-evidence.md).
A paper listed there does not, by itself, change a target corridor.

The target corridors (VPIP, PFR, 3-bet, C-bet, AF, WTSD, and others) are not
empirically exact point estimates. They are a plausibility-checked synthesis
of publicly discussed poker literature, forum knowledge, and repeated
cross-checks with several AI models. AI-model comparisons are used only as
plausibility checks, not as substitutes for reliable sources or expert
reasoning.

The corridors do not claim to define *the one correct number* for an
archetype. Plausible values for a LAG's VPIP, for example, depend heavily on
stakes, era, format, and player pool. PLO theory in particular has shifted
noticeably over the past two decades in aggression, range construction, and
3-bet frequency.

Corridors are therefore a **current, defensible assessment**, not timeless
truth. They are explicitly open to revision.

### When a corridor changes

Proposals are welcome but must meet a clear entry threshold so a difference
of opinion becomes assessable rather than an open-ended debate. A proposal
should include:

1. **A traceable rationale:** a source, calculation, or plausible argument,
   not merely an impression that something feels too tight or loose.
2. **A concrete target:** identify which corridor should move, by how much,
   and in which direction.
3. **Ideally, a pull request** containing both the rationale and proposed
   values so it can be reviewed like any other contribution.

Corridor changes are never silently tailored to individual run results.
Whether a proposal originates internally or externally, justify and document
it in the relevant calibration report.

A regression snapshot is not a target corridor; it records a specific
software state. A deviation from it alone justifies neither a strategic nor
a corridor change. Before any adjustment, also check whether only the
definition or denominator of a metric has changed.

### What this does not mean

Openness is not an invitation to endless fundamental debates without a
decision. Proposals without a traceable rationale or concrete target will
not be adopted. The maintainers retain the final decision for this project.

## Reports

- [v0.8.2 — release-candidate gate and final 10k raw report](v0.8.2-release-gate.md)
- [v0.8.2 — release preflight and four-cell regression triage](v0.8.2-release-preflight-2026-10-02.md)
- [v0.8.2 — selected flop-to-turn line checkpoint and drift analysis](v0.8.2-flop-turn-line-checkpoint.md) (German, historical)
- [v0.8.2 — shove-depth protection and Calling Station C-bet defence](v0.8.2-session-diagnostics-2026-08-12.md) (German, historical)
- [v0.8.2 — foundation snapshot after context, selection, and diagnostic changes](v0.8.2-foundation-300-hand.json)
- [v0.8.1 — passed release gate and final raw values](v0.8.1-release-gate.md) (German, historical)
- [v0.8.0 — format isolation and structural NLHE/PLO baseline](v0.8.0.md) (German, historical)
- [v0.7.8 — NLHE C-bet metric and regression](v0.7.8.md) (German, historical)
- [v0.7.8 — PLO conclusion after metric audit](plo-nit-kalibrierung.md) (German, historical)
- [v0.7.9 — opponent evidence and metric schema v2](v0.7.9.md) (German, historical)
- [v0.7.6 — PLO baseline](v0.7.6.md) (German, historical)
