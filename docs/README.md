# Dokumentation

Diese Seite ist der Einstieg in die vertiefende Projektdokumentation. Der
[Projektüberblick](../README.md) bleibt bewusst kurz; die
[Roadmap](../ROADMAP.md) beschreibt geplante Arbeit und der
[Changelog](../CHANGELOG.md) tatsächlich umgesetzte Änderungen. Eine geplante
Versionsnummer in einem älteren Dokument ist keine Release-Zusage.

## Aktuell nutzen

| Frage | Maßgebliche Stelle |
|-------|--------------------|
| Wie baue, teste oder debugge ich die App? | [Entwicklerdokumentation](../DEV.md) |
| Was ist geplant oder bereits veröffentlicht? | [Roadmap](../ROADMAP.md) und [Changelog](../CHANGELOG.md) |
| Wie prüfe ich Bot-Statistiken und Regressionen? | [Kalibrierung](../calibration/README.md) |
| Wie organisiere ich externe Tests? | [Teststrategie](../testing/TESTING_STRATEGY.md) und [Formulare](../testing/TESTER_FORMS.md) |
| Wie melde ich Sicherheitsprobleme? | [Sicherheitsrichtlinie](../SECURITY.md) |

## Vertiefende Dokumente

- **Konzepte und Evidenz:** [Literatur- und Evidenzregister](concepts/literatur-und-evidenz.md),
  [Bot-Dynamik und Stake-Roster](concepts/bot-dynamics-roster-and-notes.md) sowie
  [Produktnamen-Notizen](concepts/product-naming.md). Das sind Arbeitsgrundlagen,
  keine fertig implementierten Spezifikationen.
- **Planung:** [Refactoring-Scope](plans/refactoring-v0.8.3.md),
  [Session-Flexibilität](plans/session-flexibility-v0.8.4.md),
  [Bankroll-Konzept](plans/bankroll-v1.0.1.md) und das
  [historische Architektur-Zielbild](plans/architektur-zielbild.md). Die
  Dateinamen bewahren die ursprüngliche Versionsplanung; die Roadmap ist für
  aktuelle Priorisierung maßgeblich. Abgeschlossene Meilensteine bis 0.8.1
  stehen im [Roadmap-Archiv](plans/roadmap-archiv-bis-0.8.1.md).
- **Reviews und Audits:** [Offline-Kern-Nachtrag](reviews/offline-core-review-2026-09-29.md),
  [Wahrnehmungsgrenzen](reviews/bot-wahrnehmungsgrenze-audit-2026-09-30.md),
  [Gegner-Reads](reviews/gegner-reads-informationsfluss-audit-2026-09-30.md)
  und die PLO-Nachträge zu [Wrap-Outs](reviews/plo-wrap-outs-review-2026-09-30.md),
  [Made-Hand-Redraws](reviews/plo-made-hand-redraw-review-2026-09-30.md),
  [Straight-Flush-Nuts](reviews/plo-straight-flush-nut-review-2026-09-29.md)
  und [Vierlingen](reviews/plo-quads-nut-review-2026-09-29.md).
  Der [ältere Modul-Review](reviews/review-2026-08-07.md) ist ein historischer
  Prüfstand, kein aktuelles Gesamturteil.
- **Anleitungen:** Der [optionale Avatar-Workflow](guides/avatar-workflow.md)
  beschreibt die externe Erstellung von Bildmaterial.

Releasebezogene Messwerte und Baselines bleiben in
[`calibration/`](../calibration/), Gerätebefunde in
[`testing/apk/`](../testing/apk/) und Sicherheitsprüfungen in
[`security/audits/`](../security/audits/). Diese Ablageorte sind Teil der
jeweiligen Arbeitsabläufe und werden nicht allein für eine flachere
Verzeichnisstruktur verschoben.

Neue Dokumente sollten zu genau einer dieser Rollen passen. Historische
Befunde bekommen Datum und Status; aktuelle Regeln gehören in die maßgebliche
Einstiegsdatei statt in mehrere konkurrierende Kopien.
