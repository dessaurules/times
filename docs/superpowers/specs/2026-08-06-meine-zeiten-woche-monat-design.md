# Meine Zeiten: Wöchentlich- & Monatlich-Ansicht im Karussell

**Datum**: 2026-08-06
**Status**: Design approved

## Übersicht

Die Seite „Meine Zeiten" (mitarbeiter-app, `/zeiten`) zeigt aktuell ausschließlich eine
tägliche Aufschlüsselung der aktuellen Woche (Kommt/Geht/Pause/Ist/Status pro Tag). Diese
Ansicht wird um zwei weitere Granularitäten erweitert — **Wöchentlich** (Ist/Soll/Diff pro
Woche) und **Monatlich** (Ist/Soll/Diff pro Monat) — und die drei Ansichten werden als
horizontal wischbares Karussell mit drei Karten dargestellt, statt weiterhin eine
Einzelansicht zu sein.

## Ist-Zustand (Referenz)

`mitarbeiter-app/src/pages/Zeiten/Zeiten.tsx` (350 Zeilen) rendert eine einzelne Karte:

- Header: Titel „Meine Zeiten" + Kachel „Überstunden {Jahr}" (Jahres-Gesamt, aus allen
  abgeschlossenen Einträgen des Jahres berechnet — `overtimeMins`)
- Zeitraum-Navigation: Pfeile links/rechts über der Karte, mittig „KW {n}" +
  Datumsspanne, verschiebt `weekStart` um ±1 Woche
- Tabelle: eine Zeile pro Tag (Mo–So) mit Spalten Tag/Kommt/Geht/Pause/Ist/Status;
  Wochenende/Feiertag grau hinterlegt, aktueller Tag indigo hinterlegt, laufende Session
  grün/live
- Footer: „Woche gesamt" Zeile mit Summen-Ist/Diff, darunter eine Soll-Hinweiszeile
  („Soll 40:00 h · 40 h/Woche Vertrag") — **diese Hinweiszeile entfällt in der neuen
  Version, auch bei Täglich**, da sie redundant zur SOLL-Spalte der neuen Ansichten ist
  und implizit aus Ist/Diff ableitbar bleibt

Berechnungs-Bausteine, die weiterverwendet werden:
- `netMins(entry, now)` — Netto-Minuten eines Eintrags (Ende−Start−Pause)
- `dailySoll(weeklyHours) = weeklyHours / 5 * 60` — Tages-Soll in Minuten
- Soll einer Periode = Tages-Soll × Anzahl Werktage (kein Wochenende, kein Feiertag) in der
  Periode

## Anforderungen

### Karussell-Struktur

- Drei Karten: **Täglich** (bestehende Logik, nur ohne Hinweiszeile) · **Wöchentlich**
  (neu) · **Monatlich** (neu)
- Reihenfolge links→rechts: Täglich, Wöchentlich, Monatlich
- Start-/Mittelposition beim Öffnen der Seite: **Täglich**
- Nachbarkarten sind am linken/rechten Rand angeschnitten sichtbar (Peek), als visueller
  Hinweis auf die Wischbarkeit
- Titel-Leiste über dem Karussell zeigt die drei Bezeichnungen, die aktive ist hervorgehoben
  (z.B. beim Start „**Täglich** · Wöchentlich · Monatlich")
- Dot-Indikatoren unter dem Karussell (● ○ ○) als zusätzlicher Positions-Hinweis
- Wischen (Touch/Drag) und Klick auf Titel/Dots wechseln die aktive Karte
- Die „Überstunden {Jahr}"-Kachel im Header bleibt fix über allen drei Karten (ändert sich
  nicht beim Kartenwechsel)
- Implementierung mit **embla-carousel-react** (v8.6.0, offiziell React-19-kompatibel,
  gleiche Basis wie shadcn/ui's `Carousel`-Komponente) — headless, unterstützt
  `align: 'center'` mit prozentualer Slide-Breite für den Peek-Effekt sowie eine
  Ereignis-API (`on('select')`), um die aktive Karte für Titel-Leiste/Dots zu bestimmen

### Karte „Täglich" (bestehend, unverändert außer Hinweiszeile-Entfernung)

Keine funktionalen Änderungen an Datenlogik, Layout oder Navigation. Einzige Änderung:
die Soll-Hinweiszeile am unteren Kartenrand entfällt.

### Karte „Wöchentlich" (neu)

- Zeitraum-Navigation über der Karte: Pfeile paginieren **blockweise um 7 Wochen**
  (nicht rollierend); mittig wird die KW-Spanne des sichtbaren Blocks angezeigt
  (z.B. „KW 26 – KW 32" + Datumsspanne)
- Tabelle: **7 Zeilen**, eine pro Woche, Spalten **WOCHE | IST | SOLL | DIFFERENZ**
  - Reihenfolge: aktuelle Woche oben, die 6 vorherigen darunter (absteigend chronologisch)
  - Aktuelle Woche visuell hervorgehoben (analog zum aktuellen Tag bei Täglich: indigo)
  - Jede Zeile zusätzlich mit KW-Nummer + Datumsspanne (z.B. „KW 32 / 3.–9. Aug")
  - IST: Summe `netMins` aller Einträge der Woche (inkl. laufender Session bei aktueller
    Woche, wie bei Täglich)
  - SOLL: Tages-Soll × Werktage (ohne Wochenende/Feiertag) der jeweiligen Woche
  - DIFFERENZ: IST − SOLL, Vorzeichen-Farbe wie bestehend (grün ≥0, rot <0)
- **Keine** zusätzliche Gesamt-Fußzeile (keine Summe über die 7 sichtbaren Wochen)
- Wochenenden/Feiertage werden nicht als eigene Zeilen dargestellt (sind bereits in der
  Soll-Berechnung berücksichtigt)

### Karte „Monatlich" (neu)

- Zeitraum-Navigation über der Karte: Pfeile wechseln **jahresweise** (±1 Jahr)
- Tabelle: **immer 12 Zeilen**, Januar oben bis Dezember unten (chronologisch aufsteigend),
  unabhängig vom gewählten Jahr
- Spalten: **MONAT | IST | SOLL | DIFFERENZ**
- Zukünftige Monate (relativ zu heute, nur relevant im aktuellen Jahr) werden **ausgegraut**
  dargestellt, zeigen keine Ist/Soll/Diff-Werte (Platzhalter statt Zahlen) und fließen
  **nicht** in die Berechnung ein
- Vergangene Monate + aktueller Monat: volle Werte, aktueller Monat visuell hervorgehoben
  (indigo, analog zur aktuellen Woche/Tag)
- IST: Summe `netMins` aller Einträge des Monats
- SOLL: Tages-Soll × Werktage (ohne Wochenende/Feiertag) des Monats — Soll wird für den
  aktuellen Monat über den **gesamten** Monat berechnet (nicht anteilig bis heute),
  konsistent mit dem bestehenden Verhalten der aktuellen Woche bei Täglich/Wöchentlich
- DIFFERENZ: IST − SOLL, gleiche Vorzeichen-Farbe wie bestehend
- Vergangene Jahre: alle 12 Monate zählen zur Berechnung (keine Monate ausgegraut)
- **Keine** zusätzliche Gesamt-Fußzeile

## Technische Architektur

### Neue Abhängigkeit
- `embla-carousel-react` (^8.6.0) in `mitarbeiter-app/package.json`

### Mitarbeiter-App Frontend

- **Neue Komponentenstruktur** unter `mitarbeiter-app/src/pages/Zeiten/`:
  - `Zeiten.tsx` — schrumpft zum Seiten-Rahmen: Header (Titel + Überstunden-Kachel),
    Karussell-Wrapper (embla), Titel-Leiste, Dots
  - `TaeglichCard.tsx` — bestehende Tages-Tabellen-Logik aus dem heutigen `Zeiten.tsx`
    extrahiert (ohne Hinweiszeile)
  - `WoechentlichCard.tsx` — neue Wochen-Aggregat-Tabelle
  - `MonatlichCard.tsx` — neue Monats-Aggregat-Tabelle
  - Gemeinsame Hilfsfunktionen (`fmtDuration`, `netMins`, `dailySoll`, Soll-Berechnung für
    einen Datumsbereich) wandern in eine gemeinsame Datei, z.B. `lib/zeitenCalc.ts`, damit
    Täglich/Wöchentlich/Monatlich dieselbe Berechnungsbasis nutzen und nicht divergieren
- **State**: Jede Karte verwaltet ihren eigenen Navigations-State (aktuelle Woche für
  Täglich, sichtbarer 7-Wochen-Block für Wöchentlich, sichtbares Jahr für Monatlich)
  unabhängig; das Umschalten der Karussell-Karte ändert diesen State nicht
- **Datenladen**: Wöchentlich und Monatlich benötigen größere Zeitfenster als Täglich
  (7 Wochen bzw. 1 Jahr). Ladepfad analog zum bestehenden `allEntries`-Fetch fürs
  Überstundenkonto (ein `getFullList` pro sichtbarem Zeitraum, gefiltert per
  `start_time`-Range), nicht pro Zeile einzeln nachladen

### Fehlerbehandlung
- Ladezustand pro Karte separat (Skeleton/„Lade…" wie bestehend bei Täglich)
- Keine Einträge im Zeitraum → Zeilen zeigen „—"/0:00 h, keine Fehlermeldung

## Success Criteria

- ✅ Täglich-Karte funktional identisch zu heute, nur ohne Soll-Hinweiszeile
- ✅ Wöchentlich-Karte zeigt 7 Wochen (aktuelle + 6 vorherige), blockweise Paginierung,
  gleiche Card-Optik wie Täglich
- ✅ Monatlich-Karte zeigt alle 12 Monate eines Jahres, Zukunftsmonate ausgegraut und aus
  der Berechnung ausgeschlossen, Jahres-Navigation
- ✅ Karussell mit 3 Karten, Täglich aktiv beim Start, Nachbarn am Rand
  angeschnitten sichtbar, per Wisch oder Titel/Dots wechselbar
- ✅ „Überstunden {Jahr}"-Kachel bleibt über allen Karten sichtbar und unverändert
- ✅ Berechnungslogik (Ist/Soll/Diff) konsistent zwischen allen drei Granularitäten

## Open Questions (Resolved)

- ✅ Wöchentlich-Tabelle: 7 Zeilen oder 7 Spalten? → 7 Zeilen, 4 Spalten (WOCHE/IST/SOLL/DIFF)
- ✅ „Design nicht verändern" bei Wöchentlich? → Gemeint war: gleiche Card-Optik wie Täglich
  übernehmen (keine bereits existierende Wöchentlich-Ansicht im Code vorhanden)
- ✅ Karussell-Umfang? → Genau 3 Karten (Täglich/Wöchentlich/Monatlich), Start bei Täglich
- ✅ Wochen-Paging? → Blockweise um 7 Wochen, nicht rollierend
- ✅ Monats-Soll-Formel? → Tages-Soll × Werktage im Monat (wie bei Woche)
- ✅ Gesamt-Fußzeile bei neuen Karten? → Nein
- ✅ Reihenfolge Wöchentlich? → Aktuelle Woche oben (absteigend)
- ✅ Soll-Hinweiszeile? → Entfällt überall, auch bei Täglich
- ✅ Carousel-Bibliothek? → embla-carousel-react
