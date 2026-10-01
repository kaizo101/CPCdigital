# Beiträge zu CPCdigital

Vielen Dank für dein Interesse an CPCdigital.

Mit dem Einreichen eines Beitrags bestätigst du, dass du die notwendigen Rechte
an diesem Beitrag besitzt und ihn unter der
[GNU Affero General Public License Version 3](LICENSE) (`AGPL-3.0-only`)
bereitstellst. Bereits bestehende Lizenz- und Copyright-Hinweise dürfen nicht
entfernt werden.

Material Dritter darf nur aufgenommen werden, wenn seine Lizenz mit
`AGPL-3.0-only` vereinbar ist und Herkunft, Lizenz sowie erforderliche Hinweise
nachvollziehbar dokumentiert sind. Generierte oder KI-unterstützte Assets müssen
ebenfalls hinsichtlich ihrer Nutzungsrechte geprüft und als solche dokumentiert
werden.

Für größere Änderungen bitte zunächst ein Issue mit Ziel, Umfang und möglichen
Auswirkungen auf Engine, Replays, persistente Daten oder Kalibrierung anlegen.

Vermutete Sicherheitslücken oder versehentlich veröffentlichte Zugangsdaten
bitte nicht als öffentliches Issue melden, sondern gemäß
[`SECURITY.md`](SECURITY.md) vertraulich einreichen.

Für die lokale Electron-Entwicklung `npm ci` verwenden: So werden die
freigegebenen Install-Skripte und das Electron-Binary eingerichtet. Das in der
CI verwendete `npm ci --ignore-scripts` ist für Tests und Builds geeignet,
installiert aber kein startfähiges Electron-Binary. Weitere Voraussetzungen
und Startbefehle stehen in [DEV.md](DEV.md#quick-start).

Vor einem Pull Request bitte mindestens folgende Prüfungen lokal ausführen:

```bash
npm test
npm run build
```

Zusätzlich die vom Änderungstyp betroffenen Prüfungen ausführen:

| Änderung | Zusätzliche Prüfung |
|----------|---------------------|
| Bot-Entscheidung, Ranges, Kalibrierung oder Engine-Beträge | `npm run test:calibration` und `npm run test:stakes`; bewusste Snapshot-Abweichungen begründen, nicht still aktualisieren |
| Tisch, Setup, Replay oder responsive Darstellung | `npm run test:responsive` nach dem Client-Build; Chrome/Chromium nötig, bei Bedarf `CHROME_PATH` setzen |
| Android-Runtime oder native Integration | `npm run android:check` in einer passenden Android-SDK-Umgebung und einen Gerätelauf, falls das Verhalten davon abhängt |

`npm run calibrate:release` ist ein eigener Release-Prüflauf und keine
Pflicht für jeden Pull Request. Die Testbefehle und ihre Voraussetzungen sind
in [DEV.md](DEV.md#tests) beschrieben.
