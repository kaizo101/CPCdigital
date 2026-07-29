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

## Bewusst verbleibende Schritte

- Repository bleibt bis zur expliziten Freigabe privat.
- CodeQL und Pages sind vorbereitet, aber durch die Repository-Sichtbarkeit gegated.
- GitHub Secret Scanning und Push Protection werden erst nach dem Wechsel auf
  öffentlich aktiviert und kontrolliert.
- Repository-Rulesets sind im aktuellen privaten Tarifzustand nicht verfügbar
  und werden nach dem Visibility-Wechsel eingerichtet.
- GitHub Actions ist aktiv; die Repository-Einstellung erzwingt derzeit keine
  SHA-Pins. Alle eingecheckten Workflows pinnen ihre Actions dennoch bereits auf
  vollständige Commit-SHAs.
- Das bestehende Demo-Repository bleibt bis zum bestätigten Pages-Cutover live.
- Ein `v0.7.7`-Tag wird erst nach Abschluss der übrigen Roadmap-Gates erstellt.

## Werkzeuggrenzen

Der Scan reduziert das Risiko versehentlich veröffentlichter Secrets, beweist
aber nicht die Abwesenheit jedes denkbaren vertraulichen Inhalts. Vor dem
Visibility-Wechsel ist deshalb weiterhin eine bewusste Inhaltsprüfung von
Roadmap, Kalibrierungsdaten, Server-Prototyp und historischen Commits erforderlich.
