# Workout-Tracker (eigene App, iPhone)

## Context
Lucas bisherige Workout-App erlaubt im Free-Plan nur 3 Trainingspläne. Ziel: eine eigene Tracker-App im Look der Screenshots (dunkle Routinen-Übersicht mit Karten, Live-Workout mit Tabelle Satz / Vorher / kg / Wdh. / Haken, grüne abgehakte Zeilen, gelbe angeheftete Notiz, blauer Fortschrittsbalken für Pausen-Timer, Scheiben-Rechner). Eigenes Design und eigener Name, keine Kopie von Logo/Branding der Vorbild-App. Ohne Limits, kostenlos, auf dem iPhone als Home-Bildschirm-App nutzbar und offline im Gym.

Entscheidungen (vom User bestätigt): iPhone, GitHub Pages, Ordner `~/ClaudeProjects/workout-tracker`, Umfang = Kern + Pausen-Timer + Fortschritt & Notizen + Scheiben-Rechner.

## Ansatz
- **PWA** (Web-App, die sich wie eine App installiert): Vite + React + TypeScript (kein `any`). Abweichung vom Standard Next.js, weil es eine reine Offline-App ohne Server ist; Vite ist dafür schlanker und läuft problemlos auf GitHub Pages.
- `vite-plugin-pwa`: Manifest, App-Icon, Service Worker (Offline-Cache), `display: standalone`, iOS-Meta-Tags (`apple-mobile-web-app-capable`, Statusleiste, Safe-Area-Abstände).
- **Daten lokal im Handy**: IndexedDB über `dexie`. Keine Konten, kein Tracking, nichts verlässt das Gerät (DSGVO unkritisch).
- **Backup**: Export als JSON-Datei (Teilen-Menü / Dateien-App) und Import. Hinweis in den Einstellungen mit Datum des letzten Backups.
- Diagramme: `recharts` (oder leichter: eigenes SVG, falls Bundle zu groß).
- Theme: folgt iPhone hell/dunkel (Screenshot 1 = dunkel, 3 = hell), Farben als CSS-Variablen.

## Datenmodell (`src/db.ts`)
- `exercises`: id, name, kategorie (Langhantel, Kurzhantel, Maschine, Körpergewicht, Cardio), muskelgruppe, pinnedNote
- `routines`: id, name, notiz, übungen[] (exerciseId, geplante Sätze mit kg/Wdh.), sortierung
- `workouts`: id, routineId?, name, start, ende, notiz, übungen[] (exerciseId, sätze[]: typ normal/Aufwärmen, kg, wdh, erledigt)
- `settings`: Pausenzeit-Standard, Stangengewicht (20 kg), verfügbare Scheiben, letztes Backup
- Vorbefüllt mit ca. 60 gängigen Übungen (deutsche Namen).

## Screens (`src/screens/`)
1. **Start** (`Home.tsx`): „Leeres Workout starten“, Routinen-Raster mit Karten (Name, Übungsvorschau, letztes Datum, „…“-Menü: bearbeiten, duplizieren, löschen), „+ Routine“, Ordner optional später.
2. **Routine bearbeiten** (`RoutineEditor.tsx`): Name, Übungen hinzufügen/sortieren/entfernen, geplante Sätze.
3. **Live-Workout** (`ActiveWorkout.tsx`, als Sheet von unten): Laufzeit-Uhr, Timer-Button, „Fertig“. Pro Übung: Name (tippbar → Verlauf), angeheftete Notiz (gelb), Tabelle Satz / Vorher (letzter Wert dieser Übung) / kg / Wdh. / Haken, „+ Satz“, Wischen zum Löschen, „Übungen hinzufügen“, „Workout abbrechen“. Laufendes Workout bleibt beim Schließen der App erhalten.
4. **Pausen-Timer** (`RestTimer.tsx`): startet beim Abhaken automatisch, blauer Balken, ±15 s, Vibration/Ton am Ende (iOS: Vibration in Safari nicht verfügbar, daher Ton + Bildschirm-Hinweis).
5. **Scheiben-Rechner** (`PlateCalculator.tsx`): beim Tippen ins kg-Feld einer Langhantel-Übung eigene Zahlentastatur mit Grafik der Scheiben pro Seite.
6. **Verlauf** (`History.tsx`): Liste vergangener Workouts, Detailansicht, bearbeiten/löschen.
7. **Übungen** (`Exercises.tsx` + `ExerciseDetail.tsx`): Suche, eigene Übungen anlegen; Detail mit Diagramm (bestes Gewicht, geschätztes 1RM, Volumen) und Rekorden.
8. **Einstellungen**: Pausenzeit, Stange/Scheiben, kg, Export/Import.
Navigation: Tab-Leiste unten (Start, Verlauf, Übungen, Einstellungen).

## Umsetzungsschritte
1. Projekt anlegen in `~/ClaudeProjects/workout-tracker`, `git init`, `.claude/settings.local.json` mit `autoMemoryDirectory` (Vault `memory/allgemein` oder eigener Ordner) + in `.gitignore`. Plan nach `.planning/plan.md`.
2. Grundgerüst: Vite/React/TS, PWA-Plugin, Theme, Tab-Navigation, Datenbank + Übungs-Startliste. Commit.
3. Routinen (Start-Screen + Editor). Commit.
4. Live-Workout inkl. „Vorher“-Werte, Abhaken, Fortsetzen nach App-Neustart. Commit.
5. Pausen-Timer + Scheiben-Rechner. Commit.
6. Verlauf, Übungsdetail mit Diagramm, Notizen. Commit.
7. Export/Import + Einstellungen. Commit.
8. GitHub-Repo `workout-tracker` (Konto Trevio1) anlegen, GitHub Action für Deployment auf Pages. **Hinweis:** Mit kostenlosem GitHub-Konto muss das Repo für Pages öffentlich sein. Das ist nur der Code, deine Trainingsdaten sind nicht drin. Vor dem Anlegen/Pushen kurz bestätigen lassen.
9. Kurzanleitung fürs iPhone: Link in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

## Risiken / Hinweise
- Daten nur auf dem Gerät: Handy verloren oder Safari-Daten gelöscht = Daten weg, wenn kein Backup. Deshalb Export-Button und Erinnerung.
- iOS kann Speicher von Webseiten nach längerer Nichtnutzung löschen; als Home-Bildschirm-App installiert ist das nicht der Fall. Also wirklich installieren, nicht im Safari-Tab nutzen.
- Kein Apple-Watch-Support, keine Push-Benachrichtigung wenn die App im Hintergrund ist (Timer-Ton kommt nur bei geöffneter App).

## Verifikation
- `npm run build` ohne Fehler, `tsc --noEmit` sauber.
- Dev-Server starten, im Browser-Pane mit iPhone-Größe (375×812) durchklicken: Routine anlegen → Workout starten → Sätze abhaken → Timer läuft → Fertig → im Verlauf und Diagramm sichtbar; Screenshots hell und dunkel.
- Offline-Test: Build per `vite preview`, Service Worker aktiv, Seite ohne Netz neu laden.
- Export → Datenbank leeren → Import → Daten wieder da.
- Nach Deployment: Pages-URL per curl prüfen (200), Manifest erreichbar. Endtest auf dem echten iPhone macht Luca.
