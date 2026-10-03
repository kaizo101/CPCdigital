# Historisches Architektur-Zielbild

> Englische Fassung: [Historical Architecture Target State](../../en/plans/architecture-target-state.md)

Dieser ältere Strukturentwurf ist keine Beschreibung des aktuellen Dateibaums.
Für den Ist-Zustand gilt die [aktuelle Architekturübersicht](../../../ARCHITECTURE.md); für die
Priorisierung die [Roadmap](../../../ROADMAP.md).

---

## Technische Struktur

```text
packages/
├── client/src/                    aktuell flach, langfristig:
│   ├── session/                   LocalGameRunner, Rebuys, Replay, Export
│   ├── components/                PokerTable, PlayerSeat, Cards
│   ├── screens/                   SetupScreen, TableScreen
│   └── utils/                     format, positions
├── poker-engine/                  Regeln, State Machine, Hand-Evaluator
├── shared/                        gemeinsame Typen
├── electron/                      Desktop-Wrapper (main, preload)
├── server/                        ruhender Online-Prototyp für eine mögliche v2-Integration
│
│   # Zielarchitektur (noch nicht umgesetzt):
├── variant-modules/               NLHE, Omaha, 2-7 Draw, Stud (je eigener Ordner)
├── bots/                          Decision Engine, Personality, Reads, Mental State
├── analysis/                      Decision Records, Replay, Session-Analyse
└── knowledge/                     Wiki-, Tutorial- und Rätselinhalte
```

---

## Übergang zur Lernplattform

Die App bleibt bis Version 1.0 primär ein stabiles Singleplayer-Pokerspiel. Sie wird aber bereits so gebaut, dass jede Entscheidung später erklärt, wiederholt und als Lerninhalt verwendet werden kann.

```text
Vor v1.0:
spielen, Bots testen, Hände speichern, Entscheidungen nachvollziehbar machen

Ab v1.0:
erklären, trainieren, analysieren und persönliche Rätsel erzeugen
```

### Leitgedanke

> Erst ein gutes Pokerspiel bauen. Dabei aber keine Daten oder Architekturentscheidungen verlieren, die später für eine gute Lernplattform notwendig sind.
