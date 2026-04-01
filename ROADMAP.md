# CPC-Online — Roadmap

Digitale Heimpokerrunde · Texas Hold'em · Electron Desktop · Home-Server / Cloudflare Tunnel

---

## Produkt in einem Satz

Eine werbefreie, open-source Electron-App, die eine private Pokerrunde unter Freunden digitalisiert —
ein einzelner Tisch, echte User-Accounts, kein Lobby-Browser, kein Monetarisierungsgedanke.

---

## Geklärte Rahmenbedingungen

| Frage | Entscheidung |
|---|---|
| Authentifizierung | User-Accounts mit Username + Passwort |
| Chip-Persistenz | Nur innerhalb einer Session — neuer Abend, frische Startchips |
| Anzahl Tische | Genau ein aktiver Tisch zur Zeit |
| Omaha | Post-1.0 (v1.1.0) |
| Android / Capacitor | Post-1.0, explizit nicht trivial |

---

## Feature-Scope v1.0

**Must-have**
- Texas Hold'em (vollständige Regellogik inkl. Side Pots, All-in)
- User-Accounts mit Passwort — Rollen: `admin` / `player`
- Admin erstellt Session, teilt Invite-Code; Spieler joinen per Code
- Admin kann Chips zuteilen und Spieler kicken
- Table-Talk (Chat während laufendem Spiel)
- Hand-History (in-memory während Session, SQLite ab 0.6.0)
- Hand-Replayer (Events ab 0.3.0 gespeichert → Replayer in 0.6.0 günstig)
- Session-Stats: Chips +/−, Hands gespielt, VPIP
- PokerStars-inspiriertes UI — funktional zuerst, polished danach

**Should-have**
- Bomb Pot als optionale Tischregel
- Docker + Cloudflare Tunnel für ZimaOS-Betrieb

**Post-1.0 (nicht v1.0)**
- Side Bets — interagieren mit Side-Pot-Berechnung auf nicht-triviale Weise
- Omaha (v1.1.0)
- Tournament-Modus (v1.1.0) — nicht nur "Blindlevel hinzufügen", sondern Bustout, Rebuys, Payouts
- Android via Capacitor (v1.2.0) — Electron und Capacitor teilen React-Code, aber nicht das
  Verbindungsverhalten; Socket.IO im mobilen Background wird vom OS gekillt, braucht eigene Adapter
- Weitere Pokervarianten (v1.2.0+)

---

## Architektur-Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Kein Lobby-System | Ein Tisch, Invite-Code | Feste Runde, kein Matchmaking |
| Web-first | Electron-Wrapper erst 0.6.0 | Schnellerer Dev-Loop im Browser |
| poker-engine isoliert | Eigenes Package, kein IO | Unit-testbar; `GameVariant`-Interface früh anlegen, auch ohne Omaha |
| Event-Sourcing | Jede Aktion als Event | Hand-History und Replayer kommen fast gratis |
| Client State | Zustand | Minimal, kein Boilerplate, gut mit Socket.IO kombinierbar |
| Auth | JWT bei Login, mitgeschickt bei Socket-Connect | Einfach, kein Session-Cookie-Overhead |
| RNG | `node:crypto` — nur auf dem Server | Client sieht nie das komplette Deck; jeder Spieler erhält nur seine eigenen 2 Karten |
| Chip-Persistenz | In-memory pro Session | Kein cross-session State, vereinfacht das Datenbankmodell erheblich |
| Docker früh | Ab 0.5.0 | Lokal ≠ Container frühzeitig ausschließen |
| Tisch-UI | Funktional zuerst | Ein polished Pokertisch-UI (Animationen, kreisförmige Seats, Chips) ist teurer als er aussieht — erst polishen wenn die Logik stabil ist |

---

## Versioning

`0.x.y-alpha.n` → `0.x.y-beta.n` → `0.9.x-rc.n` → `1.0.0`

---

## Roadmap

### 0.1.0-alpha.1 — Projektfundament ✓

- npm workspaces Monorepo
- `@cpc/shared` — Typen, Rollen (`admin`/`player`), Socket.IO-Events
- `@cpc/poker-engine` — isolierte Game-Logik, Vitest-Setup
- `@cpc/server` — Express + Socket.IO Skeleton
- `@cpc/client` — React + Vite Skeleton

---

### 0.2.0-alpha.1 — Auth + Tischverwaltung ✓

**Ziel:** Spieler melden sich mit Account an, Admin erstellt Session, alle kommen rein.

- User-Accounts: Registrierung + Login (Username + Passwort, bcrypt, SQLite)
- JWT-Ausstellung bei Login; Socket.IO-Handshake verifiziert Token server-seitig
- `TableManager` (in-memory): Admin erstellt Tisch → Invite-Code
- Spieler joinen per Code, bekommen `player`-Rolle
- Admin kann Chips setzen und Spieler kicken (mit Rollenprüfung auf dem Server)
- Disconnect-State: Spieler bleibt im Tisch, markiert als offline

> **Warum Auth in 0.2.0 und nicht später:** Admin-Rollen müssen server-seitig verifiziert werden.
> Rollenprüfung ohne Auth nachzurüsten ist ein Refactor — besser von Anfang an sauber.

---

### 0.3.0-alpha.1 — Erste spielbare Hand

**Ziel:** Eine komplette Hold'em-Hand läuft durch. Unit-Tests greifen. Events werden gespeichert.

- Deck mit `node:crypto` RNG — Shuffling ausschließlich server-seitig
- Server hält vollständiges Deck; jeder Spieler erhält via `game:your-cards` nur seine 2 Karten
- Dealer-Button, Blinds, Preflop → Flop → Turn → River → Showdown
- Hand-Evaluator via `pokersolver` — Kicker-Regeln, Split-Pots, alle Hand-Rankings
- Side-Pot-Berechnung für All-in-Szenarien
- Unit-Tests: Deck, Evaluator, Blind-Posting, Side-Pot-Logik
- Event-Sourcing: `PlayerActed`, `CardDealt`, `HandEnded`, `PotAwarded`
- Hand-History: Events in-memory pro Hand gesammelt (Grundlage für Replayer)
- `GameVariant`-Interface als leeres Konzept anlegen — Texas Hold'em als erste Implementierung
  (Omaha kommt erst in 1.1.0, aber das Interface jetzt zu designen spart später einen Refactor)

**Bot:** **Dummy-Bot v0** — verbindet sich als Socket-Client mit gültigem JWT, macht zufällige gültige Aktionen.

---

### 0.4.0-alpha.1 — Grund-UX + Chat

**Ziel:** Spielbar im Browser. Funktionales UI, noch kein polished Design.

- **Zustand** als State-Management einführen (ersetzt lokalen useState-Wildwuchs)
- Tischansicht: Spielerplätze, Community Cards, Pot-Anzeige, Chip-Counts
- Action-Bar: Fold / Check / Call / Raise-Slider
- Dealer-Button-Visualisierung, Timeout-Timer für aktiven Spieler
- Table-Talk Chat
- Admin-Panel: Chips zuteilen, Spieler kicken

> **UI-Hinweis:** Spielersitze kreisförmig anordnen, Chip-Animationen und Card-Flips sind
> überraschend teuer. Hier erst funktional bauen — das polishing kommt in 0.8.5.

**Bot:** **Szenario-Bots v1** — `always-call`, `always-fold`, `min-raise`, `slow-player`.

---

### 0.5.0-alpha.1 — Robustheit + Docker

**Ziel:** Edge-Cases abgesichert. Lokale und Container-Umgebung sind identisch.

- Disconnect: Auto-Fold nach Timeout, Rejoin-Mechanismus
- Reconnect: Client erhält vollständigen GameState nach Reconnect (kein verlorener Spielzug)
- Illegale Aktionen werden server-seitig hart abgelehnt (nicht client-seitig verhindert)
- `docker-compose.yml` für Server (dev + prod)
- QA-Bot-Suite als erster CI-Smoke-Test

**Bot:** **QA-Suite** — `disconnect-after-flop`, `timeout-bot`, `invalid-action-bot`.

---

### 0.6.0-alpha.1 — Electron + Hand-Replayer + Session-Stats

**Ziel:** Desktop-App läuft. Replayer und Stats nutzbar.

- Electron-Wrapper (`contextIsolation: true`, kein `nodeIntegration`)
- Vite-Dev-Server ↔ Electron in Development, gepackte App für lokalen Test
- **Hand-Replayer:** Events aus History Schritt für Schritt abspielen
  (günstig, weil Event-Sourcing seit 0.3.0 aktiv ist)
- Session-Stats: Chips +/−, Hands gespielt, VPIP
- SQLite für Hand-History und Stats (ersetzt in-memory)

---

### 0.7.0-alpha.1 — Home-Server + Bomb Pot

**Ziel:** Freunde können von außen joinen. Bomb Pot spielbar.

- Cloudflare Tunnel via docker-compose
- ZimaOS-Deployment-Anleitung
- Echte externe Sessions mit Freunden
- Bomb Pot als optionale Tischregel (Admin aktiviert vor Hand)
- Bots testen über echten Netzwerkpfad (Tunnel, Reconnect)

---

### 0.8.0-beta.1 — Geschlossene Testphase

**Ziel:** Freunde testen, alles fliegt auf.

- Bugfixing aus echten Sessions
- Settings-Screen: Blinds, Startchips, Timeout, Bomb-Pot-Toggle
- Table-Theme-Basis (Farben, Tischdesign)
- Performance unter echtem Netzwerk

**Bot:** Casual-Bot optional — grobe Handstärke-Heuristik für Solo-Test.

---

### 0.8.5-beta.2 — UX-Polish

- Animationen: Card-Flip, Chip-Movement — sparsam und sinnvoll
- Sounds
- Bessere Fehlermeldungen
- QA-Bots im Regressionsworkflow verankert

---

### 0.9.0-rc.1 — Release Candidate

- Feature Freeze
- Packaging Windows / macOS / Linux
- README, Server-Setup-Doku, Cloudflare Tunnel Guide
- Lizenz (MIT)

---

### 0.9.5-rc.2 — Finalisierung

- Letzte Bugfixes, Crash- und Reconnect-Probleme
- Volltisch-Simulation mit Bots für Netzwerk-Checks

---

### 1.0.0 — Erste stabile Release

- Electron Desktop (Windows / macOS / Linux)
- Texas Hold'em, ein Tisch, Invite-Code-Flow
- User-Accounts mit Admin-Rolle
- Table Talk, Hand-History, Hand-Replayer, Session-Stats
- Bomb Pot optional
- Home-Server / ZimaOS / Cloudflare Tunnel
- Keine Werbung · Open Source

---

## Bot-Plan

| Typ | Ab | Zweck |
|---|---|---|
| **Dummy-Bot** | 0.3.0 | Tisch füllen, Flows testen |
| **Szenario-Bots** | 0.4.0 | Reproduzierbare Fehlerfälle (`always-call`, etc.) |
| **QA-Suite** | 0.5.0 | Server härten (Disconnect, Timeout, Invalid-Action) |
| **Casual-Bot** | 0.8.0 (optional) | Solo-Test, Tischauffüllung |

---

## Meilensteine

- **M1:** Login funktioniert, Tisch erstellen + beitreten, Admin-Rolle (0.2.0)
- **M2:** Komplette Hold'em-Hand läuft durch (0.3.0)
- **M3:** Spielbar im Browser mit Chat (0.4.0)
- **M4:** Docker läuft, Edge-Cases stabil (0.5.0)
- **M5:** Desktop-App + Hand-Replayer + Session-Stats (0.6.0)
- **M6:** Cloudflare Tunnel, erste externe Session (0.7.0)
- **M7:** Beta mit Freunden (0.8.0)
- **M8:** RC mit Packaging und Doku (0.9.0)
- **M9:** 1.0.0 Desktop Release

---

## Post-1.0

- **1.1.0** — Omaha + Tournament-Modus
- **1.2.0** — Android via Capacitor (mit realistischer Einschätzung des Aufwands)
- **1.3.0** — Side Bets, weitere Varianten
- **1.4.0** — Casual-Bot verbessern
