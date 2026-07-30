# Android-Debug-Prototyp — Geräteaufnahme vom 30.07.2026

## Rahmen

- Gerät: `2412DPC0AG` (`rodin`, 1220 × 2712 Pixel)
- Runtime: Capacitor 8 / Android-WebView
- geprüfter Quellstand: Arbeitsstand nach dem mobilen 0.7.7-Safety-Pass
- Build: `npm run android:sync` und Gradle `assembleDebug`
- Installation: bestehende Debug-App mit `adb install -r` aktualisiert; lokale
  App-Daten wurden nicht gelöscht
- Methode: manueller qualitativer Durchlauf auf echter Hardware

Diese Aufnahme ist die erste qualitative Bestandsaufnahme, noch nicht die
abschließende Matrix über NLHE/PLO und Heads-up/6-max/Full Ring. Nach den
begrenzten 0.7.7-Korrekturen folgt ein kürzerer Kontrolllauf über alle Formate,
Replayer, Zurück-Taste und Resume.

## Unmittelbare 0.7.7-Befunde

| Bereich | Befund | Behandlung |
|---|---|---|
| Setup | Blind-Preset-Optionen zeigen schwarze Schrift auf schwarzem Hintergrund | Nachkontrolle: nativer Android-Dialog ignorierte CSS; deshalb durch kompakte app-eigene Android-Auswahl ohne abgeschnittene letzte Zeile ersetzt |
| Positionen | Hole Cards verdecken Bet-Einsatz und Dealer-Button bei Hero sowie beim direkt gegenüberliegenden Bot | Nachkontrolle: begrenzte spiegelbildliche Android-Sicherheitsabstände, keine neue Geometrie |
| Statistik | aufgeklappte Statistikleiste verdrängt und überdeckt den kompakten Header | Nachkontrolle: direkt im Header verankert; überdeckt bewusst Variante, Blinds und Format, ohne Layoutverschiebung |
| Actionbar | Presets erscheinen erst beim Fokus der freien Eingabe; die Tastatur verdrängt die Oberfläche | Nachkontrolle: 3 BB/3×, Pot und Max dauerhaft links oberhalb der sichtbaren Actionbar angedockt; freie Eingabe ist nachrangige Aktion |
| Actionbar | Slider-Streifen zu dünn, möglicherweise zu lang und optisch nicht vertikal zentriert | Nachkontrolle: eigener Sliderrahmen mit begrenzter Breite, größerem Track/Thumb, fünf dezenten Skalenmarken und gerätespezifischem 5-px-Vertikalausgleich |
| Actionbar | Hauptaktionen verwenden unterschiedliche Breiten | umgesetzt: gemeinsame Grid-Spalten |
| Folded Cards | erster direkter Tap auf gefoldete Hero-Karten bleibt wirkungslos; nach Tap außerhalb funktioniert die Ansicht | umgesetzt: explizites Touch-Peek statt indirektem Hover-Verhalten |
| Export | Hand-/Session-Export ist im Android-WebView nicht nutzbar | umgesetzt: im Debug-Prototyp mobil bewusst ausgeblendet |
| Sessionstart | erster Dealer sitzt unabhängig von der Session immer links vom Hero | runtimeübergreifend behoben: zufälliger, bei gesetztem Seed reproduzierbarer Startdealer |

Die gemeldete Tischzentrierung wird nur in 0.7.7 korrigiert, falls der
Kontrolllauf einen tatsächlichen Container- oder Safe-Area-Versatz belegt.
Eine rein optische Unwucht bleibt Bestandteil der gemeinsamen TableGeometry.

## Bewusst auf 0.9.0 verschoben

- Tisch ist zu schmal und horizontal zu langgezogen.
- Bot-Pods sind zu klein, schwer erkennbar und wirken wie eine geschrumpfte
  Desktopansicht.
- Bot-Hole-Cards sind gegenüber den Pods leicht nach rechts versetzt.
- Bets an den langen Tischenden sind nicht eindeutig zuzuordnen.
- Bot-Aktionen benötigen möglicherweise ein separates, am Pod angedocktes
  Feld.

Diese Punkte werden gemeinsam mit TableSurface, Seat-/Card-/Bet-Ellipsen und
Pod-Docking gelöst. Weitere sitzspezifische Presets in 0.7.7 würden die
geplante SSOT vorwegnehmen.

## Bewusst auf 0.9.1 verschoben

- Der HandReplayer ist grundsätzlich funktional, sein Tisch wirkt auf Android
  jedoch zu klein und gequetscht.
- Die endgültige mobile Komposition von Pods, Actionbar, Header und
  Replayer-Controls benötigt einen gemeinsamen responsiven Durchlauf.
- Ein nativer Teilen-/Dateiexport kann neu bewertet werden, sobald eine
  veröffentlichungsreife Android-Distribution tatsächlich geplant wird.

## Kontrolllauf nach den 0.7.7-Fixes

Technische Vorprüfung:

- Root-Test-Suite: 45 Dateien und 274 Tests bestanden
- Produktionsbuild und TypeScript-Builds aller Workspaces bestanden
- Responsive-Smoke: Desktop, Tablet, 844 × 390 und Portrait-Guard bestanden
- Capacitor-Sync und Gradle-`assembleDebug` bestanden
- aktualisiertes APK mit erhaltenen App-Daten auf dem Referenzgerät installiert

Der manuelle Kontrolllauf auf der echten Android-WebView wurde anschließend
abgeschlossen:

- [x] app-eigener Android-Blind-Picker vollständig lesbar
- [x] gefoldete Hero-Karten reagieren auf den ersten direkten Tap
- [x] Statistik-Overlay verändert die Headerbreite nicht
- [x] 3 BB/3×, Pot und Max ohne Bildschirmtastatur erreichbar
- [x] freie Eingabe bleibt als bewusste Sekundäraktion möglich
- [x] Slider und alle drei Hauptaktionen sind touch-tauglich und gleichmäßig
- [x] Hero-Bet sowie Dealer-Buttons bei Hero und gegenüberliegendem Bot
  bleiben neben zwei und vier Hole Cards sichtbar
- [x] Android-Replayer zeigt keinen funktionslosen Export
- [x] erste Dealerposition variiert zwischen neu gestarteten Sessions
- [x] NLHE und PLO in Heads-up, 6-max und Full Ring kurz geprüft
- [x] native Zurück-Taste, App-Wechsel und Resume geprüft

Ergebnis: Der Android-Stand ist als Alpha-Debug-Prototyp akzeptiert. Der
HandReplayer ist soweit beurteilbar funktional, sein Tisch bleibt auf kleinen
Displays jedoch zu klein und gequetscht. Diese bekannte Geometrieabweichung ist
kein 0.7.7-Blocker und wird mit dem gemeinsamen responsiven Replayer-Pass in
v0.9.1 behoben.
