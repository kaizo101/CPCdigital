# Public-Readiness-Audit — 2026-07-29

## Umfang

Geprüft wurden der aktuelle Arbeitsbaum, alle erreichbaren lokalen Git-Commits,
getrackte Dateinamen, Abhängigkeiten, GitHub-Actions-Workflows und die
Sicherheitsgrenzen des ruhenden Server-Prototyps.

Lokale, durch `.gitignore` ausgeschlossene Datenbanken und Referenzdateien
wurden auf ihren Git-Status und ihre Dateirechte geprüft, aber nicht inhaltlich
veröffentlicht.

## Ergebnisse

- Gitleaks `8.30.1`: vollständige erreichbare Git-Historie einschließlich der
  Public-Readiness-Commits, keine Leaks
- Gitleaks-Binärarchiv vor Ausführung gegen die offizielle SHA-256-Prüfsumme verifiziert
- keine getrackten `.env`-, Datenbank-, Private-Key- oder Credential-Dateien
- keine eingebetteten Zugangsdaten in der Git-Remote-URL
- `npm audit`: 0 bekannte Schwachstellen
- 258 Tests bestanden: 150 Client, 101 Poker-Engine, 7 Server-Konfiguration
- alle Workspaces und der typgeprüfte Webclient erfolgreich gebaut
- Actionlint `1.7.12`: alle Haupt- und Demo-Workflows ohne Befund
- Actionlint-Binärarchiv vor Ausführung gegen die offizielle SHA-256-Prüfsumme verifiziert
- Demo-Allowlist in einem frischen Checkout reproduziert: 251 Tests, Build und
  npm-Audit ohne Befund
- erzeugtes Demo-Repository enthält weiterhin weder Server-/Electron-Pakete
  noch interne Arbeits- oder Referenzpfade

## Server-Smoke-Test

- Start ohne `JWT_SECRET`: erwarteter Abbruch
- Start mit mindestens 32 Byte langem Testsecret: erfolgreich
- Standard-/Testbindung: ausschließlich `127.0.0.1`
- Health-Endpunkt: HTTP 200
- History ohne Token: HTTP 401
- History mit gültigem Token: HTTP 200
- Stats mit ungültigem Token: HTTP 401
- neu erzeugte SQLite-, WAL- und SHM-Dateien: Modus `600`

## Kontrollierter öffentlicher Cutover

Nach expliziter Freigabe wurden am 29.07.2026 zusätzlich geprüft und umgesetzt:

- Hauptrepository auf öffentlich umgestellt
- Secret Scanning und Push Protection aktiviert; keine Alerts nach dem
  History-Backfill
- Dependabot-Sicherheitsupdates und Private Vulnerability Reporting aktiviert
- GitHub Actions auf GitHub-eigene Actions mit vollständigem Commit-SHA-Pinning
  beschränkt
- aktives Ruleset schützt `master` gegen Löschen und Force-Push, ohne direkte
  Fast-Forward-Pushes oder den bisherigen Entwicklungsfluss zu blockieren
- GitHub Pages unter <https://kaizo101.github.io/CPCdigital/> aktiviert und das
  Live-Bundle auf Version `0.7.6`, AGPL-Hinweis und korrekten Source-Link geprüft
- initialer CodeQL-Lauf fand fünf fehlende Rate Limits in Auth-, History- und
  Statistik-Routen; Commit `66e5505` behob alle fünf Alerts, der Folgelauf
  markierte sie automatisch als `fixed`
- die frühere URL <https://kaizo101.github.io/cpcdigital-demo/> liefert eine
  statische Weiterleitung auf die neue Demo; Repository und Historie bleiben
  während der Übergangszeit erhalten

Die optionalen Secret-Scanning-Modi für Non-Provider-Patterns und Validity
Checks waren für das aktuelle Konto nicht verfügbar und blieben deaktiviert.
Die regulären Provider-Scans und Push Protection sind aktiv.

## Bewusst verbleibende Schritte

- Ein `v0.7.7`-Tag wird erst nach Abschluss der übrigen Roadmap-Gates erstellt.
- Das frühere Demo-Repository wird erst nach einer Übergangszeit archiviert.

## Werkzeuggrenzen

Der Scan reduziert das Risiko versehentlich veröffentlichter Secrets, beweist
aber nicht die Abwesenheit jedes denkbaren vertraulichen Inhalts. GitHub Secret
Scanning, Push Protection und wiederkehrende Inhaltsprüfungen bleiben deshalb
auch nach dem Visibility-Wechsel erforderlich.
