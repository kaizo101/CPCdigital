# Bankroll System — Concept for 1.0.1

The values and rules in this document are preliminary design assumptions.
The [roadmap](../../../ROADMAP.md) determines the current prioritisation.

### Concept

The setup screen gets a mode toggle:

| Mode | Stakes | Buy-in | Rebues | Bankroll |
|-------|--------|--------|--------|----------|
| **Training** (status quo) | Freely selectable | Starting stack = 100 BB | Unlimited, automatic | No tracking |
| **Bankroll** (1.0.1) | Guardrail (20 BI min) | 60–100 BB | 1×/hand, deducted from BR | Persistent, promotion/demotion |

Training is the sandbox: try out new variants, test strategies, without consequences.
Bankroll is the real case: every buy-in counts, every rebuy costs, poor BRM → demotion.
Session stats (VPIP/PFR/BB from 0.7.4) run in both modes.

- **Starting bankroll**: A fixed but variant-specific amount from the
  respective risk profile. No free choice — the player starts with enough
  depth for the variance of the chosen variant.
- **Stake ladder**:

  | Stake | Blinds | Buy-in (60–100 BB) | Promotion from | Demotion below |
  |-------|--------|---------------------|---------------|----------------|
  | NL2  | 0.01/0.02 | €1.20–2.00 | €80 (40 BI) | €40 (20 BI) |
  | NL5  | 0.02/0.05 | €3.00–5.00 | €200 | €100 |
  | NL10 | 0.05/0.10 | €6.00–10.00 | €400 | €200 |
  | NL25 | 0.10/0.25 | €15.00–25.00 | €1,000 | €500 |
  | NL50 | 0.25/0.50 | €30.00–50.00 | €2,000 | €1,000 |

- **Guardrails**: Players CAN jump to higher stakes, but only if the bankroll
  covers the minimum (20 BI for the target stake). The stake button is greyed
  out, tooltip: "You need at least €X for NL50". No short-stack option — the
  buy-in is always 60–100 BB.

- **Rebuy**: Possible 1× per hand, the amount is deducted from the bankroll.
  Buy-in amount freely selectable within the range (60–100 BB). No auto-rebuy.

- **Promotion/demotion**: Automatic. 40 BI reached for the next higher stake →
  promotion. Dropped below 20 BI → demotion with a message.

- **Separate bankrolls**: NLHE and PLO separately — different games, different
  bankrolls. The player can be on NL25 in NLHE and on NL5 in PLO.

- **Variant-specific risk profile**: A universal number of buy-ins does not
  apply to all games. PLO receives higher starting, promotion and demotion
  reserves than NLHE because of tighter equities, more frequent multiway pots
  and larger pots. Fixed-limit families are tracked later in big bets instead
  of in 100-BB buy-ins; tournaments use their own tournament buy-ins.

  | Variant family | Preliminary starting reserve | Promotion | Demotion |
  |----------------|------------------------------|-----------|-----------|
  | NLHE | approx. 40 buy-ins | 40–50 BI of the target stake | below 20–25 BI |
  | PLO | approx. 60–80 buy-ins | 60–80 BI of the target stake | below 35–40 BI |
  | Fixed Limit | still open, in big bets | calibrate empirically | calibrate empirically |

  These values are design corridors, not final rules. Simulated bankroll
  trajectories with CPCdigital's actual bot win rates, variance, table formats
  and rake model are authoritative.

- **Stake-dependent opponent pools**: Stakes do not select an action directly,
  but weight suitable identities and the skill of the current variant.
  Adjacent stake and variant pools overlap. On micros all archetypes remain
  available; calling stations become rarer as stakes rise and are missing at
  high stakes. Higher stakes increase above all the quality and dynamics of
  the adaptation, not solver-like perfection.

- **Action clock**: Stake bands may suggest a suitable clock profile, but must
  not enforce an unchangeable operating pressure. Training can run without a
  time limit; bankroll starts with `Standard`, higher stakes can preselect
  `Schnell`. A timeout leads exclusively to check or fold.

- **Game over**: Bankroll below 1 BI for NL2 → back to the setup with the
  option to start again. Session stats are retained (lessons learned).

- [ ] variant-specific starting bankroll in the setup
- [ ] stake selector with guardrails (greyed out when the bankroll is too low)
- [ ] buy-in slider (60–100 BB) in the setup + rebuy dialog
- [ ] bankroll tracking persistent across sessions
- [ ] define a versioned `VariantBankrollProfile` with unit, regular buy-in,
  starting reserve and promotion/demotion limits per variant family
- [ ] when a variant family is unlocked for the first time, create a separate
  starting bankroll at its lowest stake; winnings from other variants do not
  unlock high stakes of the new variant
- [ ] run risk-of-ruin and bankroll trajectory simulations for NLHE and PLO
  over several plausible user win rates and calibrate the design corridors
- [ ] model the fixed-limit bankroll in big bets and the later tournament
  bankroll in tournament buy-ins without a shared 100-BB assumption
- [ ] promotion/demotion notification
- [ ] BB/100 and bankroll in the session stats header
- [ ] versioned stake/skill profiles and weighted archetype distribution
- [ ] overlapping identity pools for adjacent stakes with stable archetypes
  and plausible personal skill corridors
- [ ] take variant affinity and effective variant skill into account when
  filling tables, admitting stakes and choosing replacement players
- [ ] add calibration and probe session gates by stake/skill band
- [ ] predefine the clock profile per mode and stake, but leave it changeable
  as an accessibility/comfort option
