# Übungsbibliothek mit Bildern und Anleitung

Entscheidung Luca (13.11.2026): Fotos aus free-exercise-db (Unlicense), kuratiert ca. 350 Übungen.

1. Kuratieren: Gym (Langhantel, Kurzhantel, Kabel, Maschine, Körpergewicht, SZ, einige Kettlebell/Plyo/Cardio), ohne Dehnen, Strongman, Exoten. Plus ca. 30 Calisthenics-Skills ohne Foto.
2. Deutsch: Name, Kategorie, Muskel (App-Namen), eigene kurze Anleitung (Schritte + Tipp), Aliase.
3. Daten: `src/data/library.json`, Dexie v3 synchronisiert die Bibliothek: Seed-Übungen und passende eigene Übungen bekommen `libId` (kein Duplikat, Verlauf bleibt), Rest wird ergänzt.
4. Bilder: 480 px JPEG unter `public/ex/<id>/0.jpg|1.jpg`, nicht vorab gecacht, Runtime-Cache (CacheFirst).
5. UI: Vorschaubild in Listen, Muskelfilter, Detail mit Start/Ende-Wechselbild und Anleitung, Quellenhinweis.
6. Verifikation: Tests für Sync/Matching, Browser-Check, Offline-Cache, Deploy.
