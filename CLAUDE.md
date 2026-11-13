# Satzbuch (workout-tracker)

Privates Projekt von Luca, gehört nicht zu Spotstar oder Primodeus.

- Live: https://trevio1.github.io/workout-tracker/ (iPhone: Safari → Teilen → „Zum Home-Bildschirm“)
- Repo: https://github.com/Trevio1/workout-tracker (öffentlich, nur Code, keine Nutzerdaten)
- Deployment: Push auf `main` → GitHub Action baut und veröffentlicht auf Pages (ca. 1 Min.)
- Stack: Vite + React + TypeScript, PWA über vite-plugin-pwa, Daten lokal in IndexedDB (Dexie)
- Übungsbibliothek: Texte in `scripts/library/entries_*.py`, bauen mit `python3 scripts/library/build.py <free-exercise-db exercises.json> --images <tmp-ordner>` → `src/data/library.json` + Fotos in `public/ex/`. Beim App-Start verknüpft `syncLibrary()` bestehende Übungen per Name/Alias (keine Duplikate).
- Tests: `npm test` (Vitest, Logik in `src/lib/*.test.ts`, v. a. Steigerungs-Assistent `progression.ts`)
- Lokal: `npm run dev`; Build mit Unterpfad: `BASE=/workout-tracker/ npm run build`
- Daten liegen nur auf dem Gerät. Änderungen am Datenmodell (`src/db.ts`) immer mit neuer Dexie-Version + Migration, sonst gehen Nutzerdaten kaputt.
