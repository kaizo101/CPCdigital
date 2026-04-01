# Poker — Roadmap

Digitale Heimpokerrunde · Texas Hold'em · Electron Desktop · Home-Server / Cloudflare Tunnel

---

## Produkt in einem Satz

Eine werbefreie, open-source Electron-App, die eine private Pokerrunde unter Freunden digitalisiert —
ohne Lobby-System, ohne Monetarisierung, mit mehreren Pokervarianten und einem Hand-Replayer.

---

## Feature-Scope v1.0

**Must-have**
- Texas Hold'em (vollständige Regellogik inkl. Side Pots, All-in)
- Tischverwaltung ohne Lobby-Browser: Admin erstellt Tisch, teilt Invite-Code
- User-Accounts mit Rollen: `admin` (erstellt Tisch, verteilt Chips, kickt) / `player`
- Admin kann Chips zuteilen und Spieler kicken
- Table-Talk (Chat während laufendem Spiel)
- Hand-History (persistiert pro Session)
- Session-Stats (Gewinne/Verluste, VPIP, Hands gespielt)
- PokerStars-inspiriertes UI — eigener Stil, keine 1:1-Kopie

**Should-have**
- Bomb Pot als optionale Tischeinstellung
- Zweite Pokervariante (Omaha) — Architektur für Varianten von Anfang an einplanen
- Docker + Cloudflare Tunnel für ZimaOS-Betrieb

**Nice-to-have**
- Hand-Replayer (Event-Sourcing macht das günstig)
- Side Bets
- Volumenstatistiken pro Spieler

**Post-1.0**
- Tournament-Modus (Blindstruktur, Bustout, Ranking)
- Weitere Pokervarianten
- Android via Capacitor
- Casual-Bot für Solo-Tests / Tischauffüllung

---

## Architektur-Entscheidungen

| Thema | Entscheidung | Begründung |
|---|---|---|
| Kein Lobby-System | Nur Tischverwaltung | Ziel ist eine feste Runde, kein offenes Matchmaking |
| Web-first | Electron-Wrapper erst 0.6.0 | Schnellerer Dev-Loop im Browser |
| poker-engine isoliert | Eigenes Package, kein IO | Unit-testbar, später für Varianten wiederverwendbar |
| Event-Sourcing | Jede Aktion als Event | Macht Hand-History und Replayer günstig |
| Docker früh | Ab 0.5.0 | Lokal ≠ Container vermeiden |
| RNG | `node:crypto` auf dem Server | Client shuffled nie |

---

## Versioning

`0.x.y-alpha.n` → `0.x.y-beta.n` → `0.9.x-rc.n` → `1.0.0`

---

## Roadmap

### 0.1.0-alpha.1 — Projektfundament ✓

- npm workspaces Monorepo
- `@poker/shared` — Typen, Rollen (`admin`/`player`), Socket.IO-Events (ohne Lobby)
- `@poker/poker-engine` — isolierte Game-Logik, Vitest-Setup
- `@poker/server` — Express + Socket.IO Skeleton
- `@poker/client` — React + Vite Skeleton

---

### 0.2.0-alpha.1 — Tischverwaltung

**Ziel:** Tisch erstellen, beitreten, Admin-Rolle, Invite-Code-Flow.

- `TableManager` auf dem Server (in-memory)
- Admin erstellt Tisch → erhält Invite-Code
- Spieler joinen per Code → bekommen `player`-Rolle
- Admin kann Chips setzen, Spieler kicken
- Disconnect-State: Spieler bleibt im Tisch, markiert als offline
- Alle Socket-Events aus `shared/events.ts` implementiert

**Bot:** Keiner.

---

### 0.3.0-alpha.1 — Erste spielbare Hand

**Ziel:** Eine komplette Hold'em-Hand läuft durch. Unit-Tests greifen.

- Deck mit `node:crypto` RNG
- Dealer-Button, Blinds, Preflop → Flop → Turn → River → Showdown
- Hand-Evaluator: `pokersolver` integrieren
  - Kicker-Regeln, Split-Pots, alle Hand-Rankings
- Side-Pot-Berechnung (All-in)
- Unit-Tests: Deck, Evaluator, Blind-Posting, Side-Pots
- Event-Sourcing: `PlayerActed`, `CardDealt`, `HandEnded`, `PotAwarded`
- Hand-History: Events werden pro Hand persistiert (in-memory zunächst)

**Bot:** **Dummy-Bot v0** — Socket-Client, zufällige gültige Aktionen.

---

### 0.4.0-alpha.1 — Grund-UX + Chat

**Ziel:** Spielbar im Browser, Chat funktioniert.

- Tischansicht, Spielerplätze, Community Cards
- Action-Bar (Fold/Check/Call/Raise-Slider)
- Pot-Anzeige, Chip-Counts, Dealer-Button, Timeout-Timer
- Table-Talk Chat (während laufendem Spiel)
- Admin-Panel: Chips zuteilen, Spieler kicken

**Bot:** **Szenario-Bots v1** — `always-call`, `always-fold`, `min-raise`, `slow-player`.

---

### 0.5.0-alpha.1 — Robustheit + Docker

**Ziel:** Edge-Cases abgesichert, Container-Umgebung steht.

- Disconnect: Auto-Fold nach Timeout, Rejoin-Mechanismus
- Illegale Aktionen sauber ablehnen
- Reconnect: Client erhält aktuellen GameState
- `docker-compose.yml` für Server (dev + prod)
- QA-Bot-Suite als CI-Smoke-Test

**Bot:** **QA-Bots** — `disconnect-after-flop`, `timeout-bot`, `invalid-action-bot`.

---

### 0.6.0-alpha.1 — Electron + Session-Stats

**Ziel:** Desktop-App läuft, erste Statistiken sichtbar.

- Electron-Wrapper (`contextIsolation: true`)
- Vite-Dev-Server ↔ Electron in Development
- Session-Stats: Chips gewonnen/verloren, Hands gespielt, VPIP
- Stats werden in SQLite persistiert (ersetzt in-memory)

---

### 0.7.0-alpha.1 — Home-Server + Variantenarchitektur

**Ziel:** Freunde können von außen joinen. Omaha spielbar.

- SQLite für Sessions, Hand-History, Stats
- Cloudflare Tunnel via docker-compose
- ZimaOS-Deployment
- Varianten-Architektur: `GameVariant`-Interface, Texas Hold'em als erste Implementierung
- **Omaha** als zweite Variante (Hold'em-Engine wiederverwenden, nur Dealing + Handauswertung anpassen)
- Bomb Pot als optionale Tischregel

**Bot:** Bots testen über echten Netzwerkpfad.

---

### 0.8.0-beta.1 — Hand-Replayer + geschlossene Testphase

**Ziel:** Freunde testen. Hand-Replayer läuft.

- Hand-Replayer: Events aus History Schritt für Schritt abspielen
- Bugfixing aus echten Sessions
- UI-Feinschliff, Settings (Blinds, Startchips, Timeout, Variante)
- Table-Theme-Basis

**Bot:** **Casual-Bot optional** — grobe Handstärke-Heuristik.

---

### 0.8.5-beta.2 — UX-Polish + Regression

- Sound, Animationen sparsam
- Bessere Fehlermeldungen
- QA-Bots im Regressionsworkflow verankert

---

### 0.9.0-rc.1 — Release Candidate

- Feature Freeze
- Packaging Windows / macOS / Linux
- README, Server-Setup-Doku, Cloudflare Tunnel Guide
- Lizenz (MIT oder ähnlich)

---

### 0.9.5-rc.2 — Finalisierung

- Letzte Bugfixes, Crash-/Reconnect-Probleme
- Volltisch-Simulation mit Bots

---

### 1.0.0 — Erste stabile Release

- Electron Desktop
- Texas Hold'em + Omaha
- Tischverwaltung mit Admin-Rolle
- Table Talk, Hand-History, Replayer, Session-Stats
- Home-Server / ZimaOS / Cloudflare Tunnel
- Keine Werbung · Open Source

---

## Bot-Plan

| Typ | Ab | Zweck |
|---|---|---|
| **Dummy-Bot** | 0.3.0 | Tische füllen, Flows testen |
| **Szenario-Bots** | 0.4.0 | Reproduzierbare Fehlerfälle |
| **QA-Suite** | 0.5.0 | Server härten (Disconnect, Timeout, Invalid-Action) |
| **Casual-Bot** | 0.8.0 (optional) | Solo-Test, Tischauffüllung |

---

## Meilensteine

- **M1:** Tisch erstellen + beitreten, Admin-Rolle (0.2.0)
- **M2:** Komplette Hold'em-Hand läuft durch (0.3.0)
- **M3:** Spielbar im Browser mit Chat (0.4.0)
- **M4:** Docker + Cloudflare Tunnel läuft (0.5.0–0.7.0)
- **M5:** Omaha spielbar (0.7.0)
- **M6:** Hand-Replayer + Beta mit Freunden (0.8.0)
- **M7:** RC mit Packaging und Doku (0.9.0)
- **M8:** 1.0.0 Desktop Release

---

## Post-1.0

- **1.1.0** — Tournament-Modus (Blindstruktur, Bustout, Ranking)
- **1.2.0** — Weitere Varianten, bessere Stats
- **1.3.0** — Android via Capacitor (experimentell)
- **1.4.0** — Casual-Bot verbessern
