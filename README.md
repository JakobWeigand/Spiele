# Spiele

Zwei Würfel-Apps für das Handy, jede als eigene Web-App, die nach der Installation offline läuft.

| App | Ordner | Adresse |
|---|---|---|
| Kniffel | [`kniffel/`](kniffel/) | https://jakobweigand.github.io/Spiele/kniffel/ |
| Quixx | [`quixx/`](quixx/) | https://jakobweigand.github.io/Spiele/quixx/ |

Die Startseite https://jakobweigand.github.io/Spiele/ verlinkt beide Apps.

## Funktionen

- **Würfel und Block:** Jede App hat zwei Seiten. Du wischst zwischen „Würfel“ und „Block“ oder tippst oben auf die Tabs.
- **Kniffel-Block:** Grau zeigt jedes freie Feld, wie viele Punkte der aktuelle Wurf dort bringen würde. Ein Tipp trägt ein, danach ist automatisch der nächste Spieler dran. Bonus ab 63 und alle Summen werden berechnet.
- **Quixx-Block:** Ankreuzen nur von links nach rechts, das letzte Feld erst ab 5 Kreuzen, das Schloss kreuzt sich dann selbst an und der Farbwürfel wird weggelegt. Fehlwürfe zählen −5. Das Spiel endet bei zwei geschlossenen Reihen oder vier Fehlwürfen.
- **Spieler:** 1 bis 6 Spieler mit Namen. Dort startest du auch ein neues Spiel.
- **Hoch- und Querformat:** Im Querformat stehen die Würfel links, Status und Buttons rechts. Ausgelegt für iPhone 15/16/17 Pro.
- **Spielstand bleibt erhalten:** auch wenn die App geschlossen wird. Gespeichert wird nur auf dem jeweiligen Gerät.

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
2. In `sw.js` derselben App die Versionsnummer erhöhen (z. B. `v2` → `v3`). Erst dann holen sich installierte Apps die neue Version, beim nächsten Start mit Internet.
