# Spiele

Zwei Würfel-Apps für das Handy, jede als eigene Web-App, die nach der Installation offline läuft.

| App | Ordner | Adresse |
|---|---|---|
| Kniffel | [`kniffel/`](kniffel/) | https://jakobweigand.github.io/Spiele/kniffel/ |
| Quixx | [`quixx/`](quixx/) | https://jakobweigand.github.io/Spiele/quixx/ |

Die Startseite https://jakobweigand.github.io/Spiele/ verlinkt beide Apps.

## Aufbau

Jede App ist ein eigenständiger Ordner ohne Abhängigkeiten:

- `index.html`: die komplette App (HTML, CSS und JavaScript in einer Datei)
- `manifest.webmanifest`: Name, Icon und Startverhalten für „Zum Home-Bildschirm“
- `sw.js`: Service Worker, der die App beim ersten Öffnen speichert und danach offline ausliefert
- `icon-180.png`, `icon-192.png`, `icon-512.png`: App-Icons

Die Würfel nutzen `crypto.getRandomValues` mit Rejection Sampling, damit jede Augenzahl gleich wahrscheinlich ist.
Das Design folgt dem Designsystem Navy Research.

## Auf dem Handy installieren

1. Adresse der App öffnen: auf dem iPhone in Safari, auf Android in Chrome.
2. iPhone: Teilen → „Zum Home-Bildschirm“. Android: Menü → „App installieren“.
3. Die App einmal mit Internet über das neue Icon öffnen. Danach läuft sie offline.

## Eine App ändern

1. Datei im Ordner der App bearbeiten und pushen. GitHub Pages veröffentlicht die Änderung nach etwa einer Minute.
2. In `sw.js` derselben App die Versionsnummer erhöhen (`v1` → `v2`). Erst dann holen sich installierte Apps die neue Version, beim nächsten Start mit Internet.
