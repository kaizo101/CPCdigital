# Poker — Roadmap

Texas Hold'em · Private Lobbys · Electron Desktop · Home-Server / Cloudflare Tunnel

---

## Änderungen gegenüber dem ursprünglichen Plan

| Thema | Original | Hier |
|---|---|---|
| Electron | 0.1.0 | 0.6.0 — Web-first iterieren, Wrapper erst wenn Core stabil |
| Poker-Engine | Teil des Servers | Eigenes isoliertes Package ab Tag 1 |
| Hand-Evaluator | Nicht explizit | Explizit als Task in 0.3.0 (komplexe Kicker-/Tie-Regeln) |
| Unit-Tests | Nur Bot-QA | Engine-Tests ab 0.3.0, Bots testen Netzwerk/Integration |
| Docker | 0.7.0 | 0.5.0 — früher, damit lokale und Container-Umgebung sich nicht unterscheiden |
| Game State | Implizit | Event-Sourcing von Anfang an (`PlayerBet`, `CardDealt`, ...) |

---

## Versioning

`0.x.y-alpha.n` → `0.x.y-beta.n` → `0.9.x-rc.n` → `1.0.0`

---

## Roadmap

### 0.1.0-alpha.1 — Projektfundament ✓

**Ziel:** Monorepo-Skeleton, alle Packages angelegt, erste Socket.IO-Verbindung steht.

- pnpm/npm workspaces Monorepo
- `@poker/shared` — Typen + Socket.IO Event-Interface
- `@poker/poker-engine` — isolierte Game-Logik, framework-agnostisch
- `@poker/server` — Express + Socket.IO Skeleton
- `@poker/client` — React + Vite Skeleton
- Socket-Verbindung Client↔Server funktioniert
- Vitest-Setup in `poker-engine`

**Bot:** Keiner.

---

### 0.2.0-alpha.1 — Netzwerkbasis

**Ziel:** Lobby erstellen/beitreten, Session-Management, Event-Protokoll final.

- LobbyManager auf dem Server (in-memory)
- Lobby erstellen / beitreten / verlassen
- Player-Sessions (Socket-ID ↔ Player-State)
- Alle Socket-Events aus `shared/events.ts` implementiert
- Bot-Schnittstelle mitgedacht (Socket-Client von außen joinbar)

**Bot:** Keiner.

---

### 0.3.0-alpha.1 — Erste spielbare Hand

**Ziel:** Eine komplette Hold'em-Hand läuft technisch durch. Unit-Tests greifen.

- Deck, Fisher-Yates mit `node:crypto`
- Dealer-Button, Blinds, Preflop → Flop → Turn → River → Showdown
- Hand-Evaluator: `pokersolver` oder eigene Implementierung
  - Kicker-Regeln, Split-Pots, alle Hand-Rankings
- Gewinnerermittlung, Pot-Verteilung
- Side-Pots (All-in) als expliziter Task
- Unit-Tests für Engine: Deck, Evaluator, Blind-Posting, Side-Pot-Berechnung
- Event-Sourcing: Spielzüge als Events (`PlayerActed`, `CardDealt`, `HandEnded`)

**Bot:** **Dummy-Bot v0** — verbindet sich als Socket-Client, macht zufällige gültige Aktionen.

---

### 0.4.0-alpha.1 — Grund-UX

**Ziel:** Das Spiel ist spielbar im Browser, ohne dass es hässlich ist.

- Tischansicht, Spielerplätze, Community Cards
- Action-Bar (Fold/Check/Call/Raise-Slider)
- Pot-Anzeige, Chip-Counts, Dealer-Button
- Timer-Anzeige für aktiven Spieler
- Basic Chat

**Bot:** **Szenario-Bots v1** — `always-call`, `always-fold`, `min-raise`, `slow-player` (für reproduzierbare Tests).

---

### 0.5.0-alpha.1 — Robustheit + Docker

**Ziel:** Edge-Cases abgesichert, lokale Container-Umgebung steht.

- Disconnect-Handling: Auto-Fold nach Timeout, Rejoin-Mechanismus
- Illegale Aktionen sauber ablehnen
- Reconnect: Client erhält aktuellen GameState nach Reconnect
- `docker-compose.yml` für Server (development + production)
- Regression-Tests: Bot-Suite läuft als CI-Smoke-Test

**Bot:** **QA-Bot-Suite** — `disconnect-after-flop`, `timeout-bot`, `invalid-action-bot`.

---

### 0.6.0-alpha.1 — Electron

**Ziel:** App läuft als Desktop-App, Dev-Loop bleibt schnell.

- Electron-Wrapper mit `contextIsolation: true`
- Vite-Dev-Server ↔ Electron in Development
- Gepackte App für lokalen Test
- Dev-Tools: Event-Log-Viewer, GameState-Inspector

**Bot:** Bots laufen weiterhin standalone (kein Electron nötig).

---

### 0.7.0-alpha.1 — Home-Server

**Ziel:** Freunde können von außen joinen.

- SQLite für persistente Sessions (optional Postgres)
- Cloudflare Tunnel via `docker-compose`
- ZimaOS-Deployment-Anleitung
- Echte externe Sessions mit Freunden

**Bot:** Bots testen über echten Netzwerkpfad (Tunnel, Reconnect).

---

### 0.8.0-beta.1 — Geschlossene Testphase

**Ziel:** Freunde testen, alles fliegt auf.

- Bugfixing aus echten Sessions
- Performance unter echtem Netzwerk
- UI-Feinschliff: Animationen sparsam, Fehlertext verständlich
- Settings (Blind-Größen, Startchips, Timeout)
- Table-Theme-Basis

**Bot:** **Casual-Bot optional** — grobe Handstärke-Heuristik für Solo-Test.

---

### 0.8.5-beta.2 — UX-Polish

- Lobby-Filter, Sound, bessere Fehlermeldungen
- Stabilitäts- und Regressionstests
- QA-Bots fest im Regressionsworkflow

---

### 0.9.0-rc.1 — Release Candidate

- Feature Freeze
- Packaging für Desktop (Windows/macOS/Linux)
- Install/Update-Flow testen
- README, Server-Setup-Doku, Cloudflare Tunnel Guide
- Open-Source-Hinweise (Lizenz)

**Bot:** Nur noch Smoke Tests.

---

### 0.9.5-rc.2 — Finalisierung

- Letzte Bugfixes, Crash-/Reconnect-Probleme
- Volltisch-Simulation mit Bots für Netzwerk-Check
- Stabile Builds auf allen Plattformen

---

### 1.0.0 — Erste stabile Release

- Electron Desktop (Windows / macOS / Linux)
- Texas Hold'em, Private Lobbys
- Home-Server / ZimaOS / Cloudflare Tunnel
- Keine Werbung, keine Monetarisierung
- Open Source
- Test-Bots enthalten

---

## Bot-Plan

| Typ | Ab | Zweck | Verhalten |
|---|---|---|---|
| **Dummy-Bot** | 0.3.0 | Tische füllen, Flows testen | Zufällige gültige Aktionen |
| **Szenario-Bot** | 0.4.0 | Reproduzierbare Fehlerfälle | Feste Profile: `always-call`, `disconnect-after-flop`, ... |
| **QA-Bot-Suite** | 0.5.0 | Server härten | Timeout, Invalid-Action, Reconnect-Abuse |
| **Casual-Bot** | 0.8.0 | Solo-Test, Tischauffüllung | Grobe Handstärke + Position-Heuristik |

Casual-Bot ist für v1.0 **optional** — kein Blocker.

---

## Meilensteine

- **M1:** Client und Server verbunden (0.1.0 ✓)
- **M2:** Eine komplette Hold'em-Hand läuft durch (0.3.0)
- **M3:** Dummy-Bots füllen Tische automatisch (0.3.0)
- **M4:** Regellogik + Sonderfälle stabil genug für Freunde (0.5.0)
- **M5:** Docker + Cloudflare Tunnel läuft (0.7.0)
- **M6:** Beta mit Freunden (0.8.0)
- **M7:** RC mit Packaging und Doku (0.9.0)
- **M8:** 1.0.0 Desktop Release

---

## Post-1.0

- **1.1.0** — Omaha
- **1.2.0** — Freundesliste, bessere Lobby-Filter, Table-Customization
- **1.3.0** — Capacitor/Android-Port (experimentell)
- **1.4.0** — Casual-Bot deutlich besser
- **2.0.0** — Bei größerem Architekturbruch
