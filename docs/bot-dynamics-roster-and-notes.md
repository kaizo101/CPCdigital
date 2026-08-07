# Bot-Dynamik, Stake-Roster und Spielernotizen

## Zielbild

Bot-Identitäten sollen langfristig wiedererkennbar sein, ohne nach wenigen
Sessions zu einer statischen Lösung zu werden. Dafür werden vier Ebenen sauber
getrennt:

- **Archetyp** bestimmt die langfristige Grundlinie des Spielstils.
- **Skill** bestimmt, wie zuverlässig ein Bot Muster erkennt, einordnet,
  beantwortet und emotionale Abweichungen reguliert.
- **Mental State** erzeugt zeitlich begrenzte Abweichungen durch Tilt,
  Confidence, Patience, Momentum und gegnerspezifische Frustration.
- **Session- und Gegnerkontext** bestimmt, gegen wen, in welcher Position und
  aufgrund welcher Stichprobe eine Anpassung gilt.

Ein Read soll die Entscheidung des Nutzers verbessern, aber niemals die
nächste Aktion eines Bots deterministisch verraten.

## Evidenz aus der 100-Hand-Probesession zu v0.7.9

- Hand #18 ist kein isolierter All-in-Ausreißer. Die problematische Stelle ist
  die vorherige Preflop-Eskalation: generische `strong`-Scores und
  Positions-/SPR-Boni können eine ausdrückliche Fold-Präferenz der Range auch
  in 4-Bet- und 5-Bet-Ketten überstimmen.
- Vergleichbare Range-Konflikte treten unter anderem in den Händen #10, #73,
  #92 und #99 auf. Vor weiteren Anti-Steal-3-Bets muss deshalb die tatsächliche
  Raise-Stufe strukturell modelliert werden.
- Der Nutzer eröffnete in den Händen #26, #32, #56, #74 und #98 vom Button;
  alle fünf Steals gegen Finn und Jan waren ohne Gegenwehr erfolgreich.
- Die vorhandenen Gegner-Reads sind allgemein, nicht positionsbezogen. Es gibt
  keine eigene Erkennung wiederholter Button-/Cutoff-Steals oder erfolgreicher
  Blind-Angriffe.
- Im gesamten Export erschien keine Entscheidungsbegründung durch `Tilt` oder
  `Low confidence`. Die sichtbare Veränderung von Juno lässt sich überwiegend
  durch Karten- und Short-Stack-Dynamik erklären.
- Mentale Ereignisse, gegnerspezifische Frustration und Momentum sind teilweise
  vorbereitet, aber noch nicht vollständig erkannt beziehungsweise als
  Scoring-Verbraucher angeschlossen.

## Strategische Anpassung und emotionale Reaktion

Dieselbe sichtbare Gegenwehr darf nicht für jeden Bot dieselbe Ursache haben.

### Strategische Reaktion

Ein skilliger Bot soll:

- Steal-Gelegenheiten nach Position und Gegner getrennt beobachten,
- erst mit ausreichender Stichprobe handeln,
- Blind-Defense kontrolliert erweitern,
- Calls und 3-Bets anhand geeigneter Hände auswählen,
- auf Gegenanpassungen des Nutzers reagieren,
- nach Fehlannahmen wieder zur Grundlinie zurückkehren.

### Emotionale Reaktion

Ein schwächerer oder emotionalerer Bot kann:

- wiederholten Druck erst spät oder falsch einordnen,
- gegnerspezifische Frustration aufbauen,
- zu früh, zu groß oder mit ungeeigneten Händen zurückspielen,
- statt einer korrekten 3-Bet auch durch einen Donkbet-, Check-Raise- oder
  Call-down-Ausreißer reagieren,
- nach einem Fehlschlag übermäßig tight werden,
- länger oder in Wellen von der eigenen Grundlinie abweichen.

Archetypen bleiben dabei relevant: Ein Nit kann unter Tilt noch passiver
werden, ein LAG kann überspielen und eine Calling Station eher aus Trotz
weitercallen als plötzlich technisch gute Bluff-3-Bets zu finden.

## Skill als Richtung der Session-Dynamik

Skill ist keine bloße lineare Stärkeprämie und soll Bots nicht in Solver
verwandeln.

- **Niedriger Skill:** Archetyp schnell erkennbar, wiederholbare Leaks,
  ergebnisorientierte oder verspätete Anpassungen, längere emotionale Phasen.
- **Mittlerer Skill:** teilweise korrekte Reads, verrauschte oder überzogene
  Gegenmaßnahmen, erkennbare Erholung.
- **Hoher Skill:** kontext- und positionsbezogene Anpassung, bessere
  Handauswahl, kontrollierte Variation und kürzere beziehungsweise besser
  regulierte Tilt-Phasen.

Hoher Skill verhindert Tilt nicht vollständig. Tilt-Sensitivität,
Emotionalität und Archetyp bestimmen weiterhin, ob und wie stark ein Spieler
reagiert; Skill beeinflusst besonders Einordnung, Handlungsqualität und Dauer.

Als Zustandsfolge gilt:

```text
Grundstil
  -> Muster erkannt oder emotional getroffen
  -> temporäre strategische oder emotionale Abweichung
  -> Erholung / Neubewertung
  -> Grundstil
```

## Stakeabhängige Spielerpools

Stakes verändern nicht direkt einen Action Score. Sie bestimmen bei der
Tischbesetzung die Verteilung geeigneter Identitäten und Skillkorridore.
Benachbarte Pools überlappen sich, damit bekannte Gegner glaubwürdig auf- oder
absteigen können.

Illustrativer Ausgangspunkt, vor Kalibrierung nicht als feste Quote zu lesen:

| Stakes | Calling Station | Nit | TAG | LAG |
|---|---:|---:|---:|---:|
| Micros | 35 % | 25 % | 25 % | 15 % |
| Low | 20 % | 25 % | 35 % | 20 % |
| Mid | 5–10 % | 20 % | 40 % | 30–35 % |
| High | 0 % | 15–20 % | 40–45 % | 35–45 % |

Grundsätze:

- Auf den Micros bleiben alle Archetypen verfügbar.
- Calling Stations bleiben deterministisch im Low-Skill-Bereich, werden mit
  steigenden Stakes seltener und fehlen auf hohen Stakes vollständig.
- Höhere Stakes machen Archetypen subtiler, nicht unsichtbar oder perfekt.
- Zwischen Stake-Bändern bestehen Skill- und Roster-Überlappungen statt harter
  künstlicher Grenzen.
- Eine Identität behält Archetyp und plausiblen Skillkorridor über Sessions;
  Stakes würfeln keinen bekannten Bot zu einer anderen Persönlichkeit um.

## Variantenübergreifende Identitäten und Kompetenz

Der globale Roster bleibt variantenübergreifend. Vollständig getrennte
NLHE-, PLO-, Draw- und Stud-Roster würden Wiedererkennung, Notizen und
langfristige Rivalitäten unnötig auflösen. Stattdessen erhält jede Identität
eine allgemeine Pokerkompetenz und korrelierte Kompetenzen für
Variantenfamilien.

```text
BotIdentity
├── generalSkill
├── variantProficiency
│   ├── nlhe
│   ├── plo
│   ├── draw
│   └── stud
└── variantAffinity
    └── häufig / gelegentlich / nicht im regulären Pool
```

`generalSkill` beeinflusst übertragbare Fähigkeiten wie Beobachtung,
Read-Qualität, logische Konsistenz, emotionale Regulation und Erholungsdauer.
`variantProficiency` beeinflusst insbesondere Ranges, Hand-/Drawbewertung,
Boardverständnis, Sizing beziehungsweise Fixed-Limit-Linien und typische
Fachfehler. Die Werte werden deterministisch korreliert statt unabhängig
ausgewürfelt: Ein allgemein guter Spieler darf eine klare Nebenvariante haben,
soll dort aber nicht ohne Grund vollständig inkompetent wirken.

Der Archetyp bleibt zunächst als langfristige Grundpersönlichkeit stabil und
wird in jeder Variantenfamilie fachlich anders ausgedrückt. Ein LAG zeigt sich
beispielsweise in NLHE über weite Opens und Barrels, in Draw über Snows und
Pat-Bluffs und in Stud über Bring-in-Steals und Scare-Card-Druck. Einzelne
spätere Spezialidentitäten dürfen begründete Variantenprofile besitzen, ohne
dass eine bekannte Person pro Tisch zufällig zu einem anderen Charakter wird.

Calling-Station-Verhalten bleibt pro betroffener Variante Low-Tier. Ein
allgemein solider Spieler kann in einer wenig vertrauten Nebenvariante
calling-stationartige Leaks zeigen; eine dauerhaft loose-passive
Variantenidentität erhält dort jedoch keinen hohen effektiven Skill.

### Auswahl und Persistenz

- Stake-Auswahl verwendet den effektiven Skill der aktuellen Variante.
- Varianten-Pools überlappen sich: Spezialisten, Mixed-Game-Spieler und
  gelegentliche Teilnehmer bleiben Teil derselben Pokerwelt.
- Eine Identität kann auf hohen Stakes ihrer Hauptvariante, aber nur auf
  niedrigen Stakes einer Nebenvariante verfügbar sein.
- Dieselbe Identität darf nicht gleichzeitig an mehreren offenen Tischen oder
  in mehreren Varianten erscheinen.
- Gegner-Reads werden überwiegend nach Variante getrennt; nur eine grobe
  allgemeine Reputation darf variantenübergreifend fortwirken.
- Spielernotizen bleiben an `BotIdentity.id` gebunden, speichern ihre
  Beobachtungen aber mit Varianten- und Stake-Kontext.
- Kalibrierungen werden langfristig nach
  `Variante × Skillband × Stake × Tischformat` ausgewertet.

Die Zielgröße von ungefähr 64 Identitäten gilt für den nahen NLHE-/PLO-Pool,
nicht als dauerhaftes hartes Limit. Draw und Stud dürfen den Roster später
qualitätsgetrieben um glaubwürdige Spezialisten erweitern.

## Rostergröße und Wiederholungssteuerung

Zielgröße ist zunächst ein globaler Roster von ungefähr **64 Identitäten**.
Durch überlappende Stake-Bänder sollen pro Stake ungefähr **24–30** geeignete
Identitäten verfügbar sein.

Für eine typische 6-max-Session:

- meistens ein bis zwei bekannte Gegner,
- meistens drei bis vier neue oder länger nicht gesehene Gegner,
- kurzer Wiederholungs-Cooldown statt unmittelbarer Dauerwiederholung,
- Ersatzspieler bevorzugt aus in der Session noch nicht gesehenen Identitäten,
- keine starre Tischquote; erkennbare Rivalitäten dürfen zufällig entstehen.

Die Auswahlpolitik ist wichtiger als eine beliebig große Namensliste. Mehr als
ungefähr 80 Identitäten würden Wiedererkennung zunächst unnötig verdünnen;
unter ungefähr 40 wird ein nach Stakes gefilterter Pool schnell zu klein.

## Manuelle Spielernotizen

Notizen werden an die stabile `BotIdentity.id` gebunden und begleiten eine
Identität über Sessions und benachbarte Stakes.

### MVP

- freie Textnotiz pro Identität,
- wenige optionale manuelle Tags,
- Bearbeitung am Tisch und im Replayer,
- Datum, Variante, Stake und optionale Handreferenz,
- versionierte lokale Persistenz sowie Export/Backup,
- keine Offenlegung oder automatische Bestätigung von Archetyp und Skill.

### Schutz vor einem endlichen „Bot-Sammelalbum"

- keine Vollständigkeitsanzeige und keine Belohnung für „alle Bots notiert",
- keine automatisch erzeugte, als wahr bestätigte Gegnerbeschreibung,
- Beobachtungen chronologisch und stakebezogen ergänzbar,
- alte Reads bleiben nützlich, können durch Anpassung und mentale Zustände aber
  zeitweise unvollständig oder veraltet sein,
- keine automatischen HUD-Statistiken im ersten Schritt.

Die Notizfunktion wird erst veröffentlicht, wenn dynamische Anpassung weit
genug angeschlossen ist. Mit dem aktuell noch relativ konstanten Verhalten
würde sie das dauerhafte Lösen einzelner Identitäten zu stark beschleunigen.

## Reihenfolge

1. Preflop und postflop echte Bet-/Raise-/Reraise-Stufen modellieren.
2. Range- und Selection-Gates für tiefe 4-Bet-/5-Bet-Ketten absichern.
3. Positionsbezogene Steal-Erkennung und strategische Blind-Defense ergänzen.
4. Mentale Ereignisse, Skill-Regulation, Frustration und Erholung vollständig
   anschließen.
5. Stakeabhängige, überlappende Roster- und Skill-Pools mit dem Bankrollsystem
   einführen.
6. Spielernotizen und eine grobe faire Erinnerung wiederkehrender Bots an den
   Nutzer als Meta-Game-Schicht ergänzen.

## Spätere Akzeptanzkriterien

- Mehrere erfolgreiche Button-Steals führen abhängig von Skill, Archetyp und
  Mentalität zu unterschiedlichen, nachvollziehbaren Reaktionen.
- Skillige Bots reagieren kontrollierter; schwache Bots dürfen verspätet,
  fehlerhaft oder emotional reagieren.
- Mentale Veränderungen sind über mehrere Hände sichtbar und klingen wieder
  ab, ohne den Grundarchetyp dauerhaft zu überschreiben.
- Bekannte Gegner sind langfristig besser einschätzbar, aber nicht
  deterministisch vorhersagbar.
- Zusätzliche Gegenwehr erzeugt keine neuen marginalen Deep-Stack-4-Bet- oder
  All-in-Ketten.
- Probesessions und Kalibrierungen werden zusätzlich nach Skill- und
  Stake-Bändern ausgewertet.
