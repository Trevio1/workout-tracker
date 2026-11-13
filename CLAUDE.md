# Satzbuch (workout-tracker)

Privates Projekt von Luca, gehört nicht zu Spotstar oder Primodeus.

- Live: https://trevio1.github.io/workout-tracker/ (iPhone: Safari → Teilen → „Zum Home-Bildschirm“)
- Repo: https://github.com/Trevio1/workout-tracker (öffentlich, nur Code, keine Nutzerdaten)
- Deployment: Push auf `main` → GitHub Action baut und veröffentlicht auf Pages (ca. 1 Min.)
- Stack: Vite + React + TypeScript, PWA über vite-plugin-pwa, Daten lokal in IndexedDB (Dexie)
- Lokal: `npm run dev`; Build mit Unterpfad: `BASE=/workout-tracker/ npm run build`
- Daten liegen nur auf dem Gerät. Änderungen am Datenmodell (`src/db.ts`) immer mit neuer Dexie-Version + Migration, sonst gehen Nutzerdaten kaputt.
