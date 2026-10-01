# Bankroll-System — Konzept für 1.0.1

Die Werte und Regeln in diesem Dokument sind vorläufige Designannahmen.
Die [Roadmap](../../ROADMAP.md) bestimmt die aktuelle Priorisierung.

### Konzept

Der Setup-Screen bekommt einen Modus-Toggle:

| Modus | Stakes | Buy-in | Rebuys | Bankroll |
|-------|--------|--------|--------|----------|
| **Training** (Status quo) | Frei wählbar | Startstack = 100 BB | Unbegrenzt, Auto | Kein Tracking |
| **Bankroll** (1.0.1) | Guardrail (20 BI min) | 60–100 BB | 1×/Hand, von BR abgezogen | Persistent, Auf-/Abstieg |

Training ist die Sandbox: neue Varianten ausprobieren, Strategien testen, ohne Konsequenzen.
Bankroll ist der Ernstfall: jedes Buy-in zählt, jeder Rebuy kostet, schlechtes BRM → Abstieg.
Session-Stats (VPIP/PFR/BB aus 0.7.4) laufen in beiden Modi.

- **Start-Bankroll**: Fester, aber variantenspezifischer Betrag aus dem
  jeweiligen Risikoprofil. Kein freies Wählen — der Spieler startet mit genug
  Tiefe für die Varianz der gewählten Variante.
- **Stake-Leiter**:

  | Stake | Blinds | Buy-in (60–100 BB) | Aufstieg ab | Abstieg unter |
  |-------|--------|---------------------|-------------|---------------|
  | NL2  | 0.01/0.02 | €1.20–2.00 | €80 (40 BI) | €40 (20 BI) |
  | NL5  | 0.02/0.05 | €3.00–5.00 | €200 | €100 |
  | NL10 | 0.05/0.10 | €6.00–10.00 | €400 | €200 |
  | NL25 | 0.10/0.25 | €15.00–25.00 | €1.000 | €500 |
  | NL50 | 0.25/0.50 | €30.00–50.00 | €2.000 | €1.000 |

- **Guardrails**: Spieler KANN auf höhere Stakes springen, aber nur wenn die
  Bankroll das Minimum (20 BI für den Ziel-Stake) deckt. Der Stake-Button ist
  ausgegraut, Tooltip: "Du brauchst mindestens €X für NL50". Keine Short-Stack-
  Option — Buy-in immer 60–100 BB.

- **Rebuy**: 1× pro Hand möglich, Betrag wird von der Bankroll abgezogen.
  Buy-in-Betrag frei wählbar innerhalb der Range (60–100 BB). Kein Auto-Rebuy.

- **Auf-/Abstieg**: Automatisch. 40 BI für den nächsthöheren Stake erreicht → Aufstieg.
  Unter 20 BI gefallen → Abstieg mit Meldung.

- **Getrennte Bankrolls**: NLHE und PLO separat — verschiedene Spiele, verschiedene
  Bankrolls. Der Spieler kann in NLHE auf NL25 sein und in PLO auf NL5.

- **Variantenspezifisches Risikoprofil**: Eine universelle Zahl von Buy-ins
  gilt nicht für alle Spiele. PLO erhält wegen engerer Equities, häufigerer
  Multiway-Pots und größerer Pots höhere Start-, Aufstiegs- und
  Abstiegsreserven als NLHE. Fixed-Limit-Familien werden später in Big Bets
  statt in 100-BB-Buy-ins geführt; Turniere verwenden eigene Tournament-Buy-ins.

  | Variantenfamilie | Vorläufige Startreserve | Aufstieg | Abstieg |
  |------------------|--------------------------|----------|---------|
  | NLHE | ca. 40 Buy-ins | 40–50 BI des Ziel-Stakes | unter 20–25 BI |
  | PLO | ca. 60–80 Buy-ins | 60–80 BI des Ziel-Stakes | unter 35–40 BI |
  | Fixed Limit | noch offen, in Big Bets | empirisch kalibrieren | empirisch kalibrieren |

  Diese Werte sind Designkorridore, keine finalen Regeln. Maßgeblich werden
  simulierte Bankrollverläufe mit CPCdigitals tatsächlichen Bot-Winrates,
  Varianz, Tischformaten und Rake-Modell.

- **Stakeabhängige Gegnerpools**: Stakes wählen keine Aktion direkt, sondern
  gewichten geeignete Identitäten und den Skill der aktuellen Variante.
  Benachbarte Stake- und Varianten-Pools überlappen sich. Auf Micros bleiben
  alle Archetypen verfügbar; Calling Stations werden mit steigenden Stakes
  seltener und fehlen auf hohen Stakes. Höhere Stakes erhöhen vor allem
  Qualität und Dynamik der Anpassung, nicht solverartige Perfektion.

- **Action Clock**: Stake-Bänder dürfen ein passendes Clock-Profil vorschlagen,
  aber keinen unveränderlichen Bedienungsdruck erzwingen. Training kann ohne
  Zeitlimit laufen; Bankroll startet mit `Standard`, höhere Stakes können
  `Schnell` vorauswählen. Timeout führt ausschließlich zu Check oder Fold.

- **Game Over**: Bankroll unter 1 BI für NL2 → zurück zum Setup mit der Option
  neu zu starten. Session-Stats bleiben erhalten (Lessons Learned).

- [ ] variantenspezifische Start-Bankroll im Setup
- [ ] Stake-Selector mit Guardrails (ausgegraut wenn Bankroll zu niedrig)
- [ ] Buy-in-Slider (60–100 BB) im Setup + Rebuy-Dialog
- [ ] Bankroll-Tracking persistent über Sessions
- [ ] versioniertes `VariantBankrollProfile` mit Einheit, regulärem Buy-in,
  Startreserve sowie Auf-/Abstiegsgrenzen pro Variantenfamilie definieren
- [ ] beim erstmaligen Freischalten einer Variantenfamilie eine eigene
  Startbankroll auf deren niedrigstem Stake anlegen; Gewinne anderer Varianten
  schalten keine hohen Stakes der neuen Variante frei
- [ ] Risk-of-Ruin- und Bankrollverlaufs-Simulationen für NLHE und PLO über
  mehrere plausible Nutzer-Winrates ausführen und Designkorridore kalibrieren
- [ ] Fixed-Limit-Bankroll in Big Bets und spätere Turnierbankroll in
  Tournament-Buy-ins ohne gemeinsame 100-BB-Annahme modellieren
- [ ] Aufstiegs-/Abstiegs-Benachrichtigung
- [ ] BB/100 und Bankroll in der Session-Stats-Kopfleiste
- [ ] versionierte Stake-/Skill-Profile und gewichtete Archetypenverteilung
- [ ] überlappende Identity-Pools für benachbarte Stakes mit stabilen
  Archetypen und plausiblen persönlichen Skillkorridoren
- [ ] Variantenaffinität und effektiven Variantenskill bei Tischbesetzung,
  Stake-Zulassung und Ersatzspielern berücksichtigen
- [ ] Kalibrierungs- und Probesession-Gates nach Stake-/Skillband ergänzen
- [ ] Clock-Profil pro Modus und Stake vorbelegen, aber als
  Accessibility-/Komfortoption änderbar lassen
