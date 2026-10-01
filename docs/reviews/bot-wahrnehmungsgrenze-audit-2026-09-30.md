# Audit: Wahrnehmungsgrenze der Botentscheidung

Status: Diagnose vom 30.09.2026; Befunde gegen aktuellen Code prüfen.

Stand: 30.09.2026 · Wahrnehmungsgrenze korrigiert, Regression geprüft

## Befund

Vor dem Fix erzeugte `decideAction` mit `applySkillPerception(context)` einen
skillabhängigen Kontext. `scoreActions` erhielt diesen Kontext; danach bekam
`applyPersonalityModifiers` wieder den ursprünglichen objektiven `context`
(`packages/client/src/bot-pipeline.ts`). Der Debugexport hielt beide
Perspektiven bereits getrennt, die Score-Pipeline noch nicht durchgängig.

Zwei deterministische Tests in `bot-pipeline.test.ts` belegen den vorherigen
Informationsrückfluss und prüfen nun das korrigierte Verhalten:

| Variante | Wahrnehmung bei Testskill | Call-Modifikator vorher (objektiv) | Nachher (wahrgenommen) |
|---|---|---:|---:|
| NLHE, Skill 0 | Flushdraw wird übersehen (`drawTypes = []`) | +3,75 | +1,875 |
| PLO 4-Karten, Skill 20 | Wrap-Qualität und danach Draw werden übersehen (`drawTypes = []`) | +1,4423 | +0,7212 |

Der Unterschied entstand in `bot-action-modifiers.ts`: `isDeadAir` las den
objektiven Draw-Status und halbierte den Persönlichkeitseinfluss bei
wahrgenommener Air **nicht**. Das sind gezielt konstruierte Pipeline-Eingaben
mit legalen Aktionen, keine vollständigen Handbewertungs-Integrationstests
oder Behauptungen über die Häufigkeit solcher Hände im Live-Spiel. Die Zahlen
sind Score-Beiträge, keine Wahrscheinlichkeiten oder gemessenen Aktionsraten.

## Korrektur und verbleibende Designfragen

- `applyPersonalityModifiers` erhält jetzt denselben wahrgenommenen Kontext
  wie `scoreActions`. Dies schließt die nachgelagerten Habits,
  Short-Stack-Faktoren, Line-Commitment und Bet-Fold-Modifikatoren ein.
- `deriveStateUpdates` erhält ihn ebenfalls. Ein NLHE-River-Test sichert ab:
  Bei gleicher legaler Bet-Aktion wird der Bet-Fold-Marker nur gesetzt, wenn
  die nötige Handstärke wahrgenommen wurde. Skill 100 dient als Kontrollfall.
  PLO nutzt diesen NLHE-spezifischen Plan nicht.
- `applySkillPerception` verändert unter anderem Stärke, Draws, Outs,
  Pot-Odds und Gegner-Ranges, aber derzeit nicht die Handkategorie oder
  Board-Textur. Ob auch diese groben Begriffe skillabhängig werden sollen,
  ist eine **Designfrage**, kein aus diesen Tests bewiesener Bug.
- Legale Aktionen, Spielphase, öffentliche Boardkarten und Chipbeträge bleiben
  im Perception-Kontext unverändert. Objektive Handbewertung und Gegner-Ranges
  bleiben separat im `DecisionResult` für die Diagnose verfügbar.

## Noch nicht Teil dieses Fixes

- Eine Neudefinition der skillabhängigen Handkategorie, Board-Textur oder
  Gegnerhistorie. Das erfordert eigene, variantenspezifische Designbegründung.
- Eine Anpassung von Persönlichkeit, Zielkorridoren oder
  Kalibrierungs-Snapshot. NLHE- und PLO-Strategieregeln bleiben getrennt.
- Eine manuelle Spielsession oder ein vollständiges 10k-/3k-Release-Gate.

## Verifikation nach dem Fix

`npm run test -w @cpc/client -- --run src/bot-pipeline.test.ts`:
63 Tests bestanden. Gesamte Client-Suite: 457 bestanden, 1 bestehendes TODO.
Client-Build einschließlich TypeScript-Prüfung erfolgreich.

`npm run test:calibration`: 24 Kombinationen, 0 Fehler, 1 Warnung:
NLHE/LAG/Full Ring Turn-C-Bet 38,10 → 42,86 Prozent (+4,76 Prozentpunkte).
Der Snapshot wurde nicht geändert. `npm run test:stakes` bestätigt die
Blind-Skalierungsinvariante für NLHE und PLO. Build-Warnungen zur Vite-Konfig
und einer >500-kB-Chunkgröße sind von diesem Fix unabhängig.
