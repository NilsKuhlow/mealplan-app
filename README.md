# Mealplan · Vorrat

Persönliche PWA zur Vorratsverwaltung für meinen 4-Wochen-Mealplan
(Muskelaufbau, Architekturstudium). Single-User, keine Backend.

## Funktionen

- **Einkauf** — automatisch berechnete Liste: Soll-Bestand der aktuellen
  Rotationswoche minus aktueller Vorrat. Gruppiert nach Donnerstag (Frische)
  und Samstag (Großeinkauf). Checkbox = Gekauft → wird in den Vorrat addiert.
- **Vorrat** — alle Zutaten mit Plus/Minus-Buttons. Lange auf − drücken setzt
  auf 0. Nur relevante Zutaten der aktuellen Woche werden gezeigt.
- **Diese Woche** — Power Meal + Abendessen der aktuellen Rotationswoche mit
  Zutatenliste, Zubereitung und „Kochsession durchgeführt"-Button (zieht die
  Zutaten ab). Plus Tagesbasis (Frühstück A/B/C, Snack 1).

Die Rotation startet am **Mo 04.05.2026** mit Woche 1 und läuft monatlich
durch (Woche 1 → 2 → 3 → 4 → 1 …).

## Auf dem Handy installieren

1. Im Chrome auf Android `https://<github-user>.github.io/<repo>/` öffnen.
2. Menü → „Zum Startbildschirm hinzufügen" / „App installieren".
3. Icon erscheint wie eine native App, läuft offline, eigenes Vollbild.

Daten liegen lokal im Browser (`localStorage`) — kein Account, keine
Synchronisation. Cache löschen = Vorrat zurückgesetzt.

## Lokal entwickeln

```bash
# Einfacher HTTP-Server reicht (Service Worker braucht http://, kein file://)
python -m http.server 8000
# oder
npx serve .
```

Dann `http://localhost:8000` aufrufen.

## Datenmodell

- `data.js` — Master-Liste aller Zutaten (`ingredients`), Rezepte (`recipes`),
  4-Wochen-Mapping (`weeks`), Tagesbasis (`breakfast` A/B/C, `snack1`).
- Soll-Bestand pro Woche = `baseTarget` jeder Zutat + Mengen aus den Rezepten
  der aktuellen Rotationswoche.

Plan-Anpassung (z. B. Mengen, neues Rezept) → `data.js` editieren, committen,
GitHub Pages deployt automatisch.

## Stack

Vanilla HTML/CSS/JS, Service Worker, Web App Manifest. Kein Build-Step,
keine Abhängigkeiten.
