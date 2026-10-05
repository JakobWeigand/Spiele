# Spiele

## ▶ Direkt spielen

- **Kniffel:** https://jakobweigand.github.io/Spiele/kniffel/
- **Quixx:** https://jakobweigand.github.io/Spiele/quixx/
- **Wortbombe:** https://jakobweigand.github.io/Spiele/wortbombe/
- **Chooser:** https://jakobweigand.github.io/Spiele/chooser/
- **Startseite mit allen Spielen:** https://jakobweigand.github.io/Spiele/

Aufs iPhone: Link in Safari öffnen → Teilen → „Zum Home-Bildschirm“ → einmal mit Internet öffnen. Danach läuft die App offline.

---

Vier Spiele-Apps für das Handy, jede als eigene Web-App, die nach der Installation offline läuft.

| App | Ordner | Adresse |
|---|---|---|
| Kniffel | [`kniffel/`](kniffel/) | https://jakobweigand.github.io/Spiele/kniffel/ |
| Quixx | [`quixx/`](quixx/) | https://jakobweigand.github.io/Spiele/quixx/ |
| Wortbombe | [`wortbombe/`](wortbombe/) | https://jakobweigand.github.io/Spiele/wortbombe/ |
| Chooser | [`chooser/`](chooser/) | https://jakobweigand.github.io/Spiele/chooser/ |

Die Startseite https://jakobweigand.github.io/Spiele/ verlinkt alle Apps.

## Funktionen

- **Mit Block oder nur Würfel:** Oben in der Mitte schaltest du um. „Nur Würfel“ blendet Block, Tabs und Spieler aus.
- **Würfel und Block:** Jede App hat zwei Seiten. Du wischst zwischen „Würfel“ und „Block“ oder tippst oben auf die Tabs.
- **Kniffel-Block:** Nach dem Würfeln führt „Eintragen“ zum Block. Ein Tipp auf die Zeile trägt den Wurf beim Spieler am Zug ein, danach ist automatisch der nächste Spieler dran. Korrigieren geht über einen Tipp auf das ausgefüllte Feld. Grau steht in jedem freien Feld, was der Wurf dort bringt, unterstrichen das beste freie Feld. Bonus ab 63 und alle Summen werden berechnet.
- **Quixx-Block:** Ankreuzen nur von links nach rechts, das letzte Feld erst ab 5 Kreuzen, das Schloss kreuzt sich dann selbst an und der Farbwürfel wird weggelegt. Fehlwürfe zählen −5. Das Spiel endet bei zwei geschlossenen Reihen oder vier Fehlwürfen.
- **Spieler:** 1 bis 6 Spieler mit Namen. Dort startest du auch ein neues Spiel.
- **Hoch- und Querformat:** Im Querformat stehen die Würfel links, Status und Buttons rechts. Ausgelegt für iPhone 15/16/17 Pro.
- **Spielstand bleibt erhalten:** auch wenn die App geschlossen wird. Gespeichert wird nur auf dem jeweiligen Gerät.

## Wortbombe

Das Handy liegt flach zwischen den Spielern. Um den Rand liegen 24 Buchstaben (A–Z ohne Q und X), in der Mitte stehen Uhr und Kategorie. Die obere Hälfte steht auf dem Kopf, damit die Person gegenüber mitlesen kann.

- 427 Kategorien, darunter Satzanfänge wie „In der Dusche ist immer …“, die man mit einem Wort ergänzt.
- Uhr antippen startet die Runde. Wer dran ist, nennt ein Wort zur Kategorie und drückt dessen Anfangsbuchstaben. Gedrückte Buchstaben werden durchsichtig.
- Die Uhr zeigt keine Restzeit, sie tickt nur. Läuft sie ab, explodiert die Bombe: Wer dran war, verliert die Runde.
- **Zeit pro Zug:** Jeder Buchstabe startet eine neue, geheime Zeit. **Zeit pro Runde:** Eine geheime Zeit für die ganze Runde.
- Wer dran ist, hat die Hälfte in der Mitte dunkelblau hinterlegt; wer verliert, rot.
- Bei „Zeit pro Runde“ hat die nächste Person nach dem Weitergeben immer noch mindestens 1,5 Sekunden.
- Tempo, Ton, 2–5 Spieler und Punkte unter „Einstellungen“. Uhr antippen während der Runde pausiert, „Neustart“ setzt Runde oder Punkte zurück.

## Chooser

Alle legen einen Finger aufs Display. Sobald keine Finger mehr dazukommen, läuft ein kurzer Countdown, dann wählt die App zufällig aus. Gewählte Finger werden grün, die anderen verblassen. Alle Finger loslassen startet die nächste Runde.

- Oben in der Mitte stellst du ein, wie viele gewählt werden: mit −/+ oder indem du die Zahl antippst und eintippst. Keine Obergrenze.
- Es braucht immer mindestens einen Finger mehr, als gewählt werden. Wie viele Finger gleichzeitig erkannt werden, begrenzt nur das Handy selbst.

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
