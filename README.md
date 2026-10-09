# Spiele

## ▶ Direkt spielen

- **Kniffel:** https://jakobweigand.github.io/Spiele/kniffel/
- **Quixx:** https://jakobweigand.github.io/Spiele/quixx/
- **Wortbombe:** https://jakobweigand.github.io/Spiele/wortbombe/
- **Chooser:** https://jakobweigand.github.io/Spiele/chooser/
- **Heiß & Kalt:** https://jakobweigand.github.io/Spiele/heisskalt/
- **Codenames Duett:** https://jakobweigand.github.io/Spiele/codenames/
- **Startseite mit allen Spielen:** https://jakobweigand.github.io/Spiele/
- **Datenschutz:** https://jakobweigand.github.io/Spiele/datenschutz.html

Aufs iPhone: Link in Safari öffnen → Teilen → „Zum Home-Bildschirm“ → einmal mit Internet öffnen. Danach läuft die App offline.

---

Sechs Spiele-Apps für das Handy, jede als eigene Web-App, die nach der Installation offline läuft.

| App | Ordner | Adresse |
|---|---|---|
| Kniffel | [`kniffel/`](kniffel/) | https://jakobweigand.github.io/Spiele/kniffel/ |
| Quixx | [`quixx/`](quixx/) | https://jakobweigand.github.io/Spiele/quixx/ |
| Wortbombe | [`wortbombe/`](wortbombe/) | https://jakobweigand.github.io/Spiele/wortbombe/ |
| Chooser | [`chooser/`](chooser/) | https://jakobweigand.github.io/Spiele/chooser/ |
| Codenames Duett | [`codenames/`](codenames/) | https://jakobweigand.github.io/Spiele/codenames/ |

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
- **Zeit pro Zug:** Jeder Buchstabe startet eine neue, geheime Zeit, die im Lauf der Runde im Schnitt kürzer wird. **Zeit pro Runde:** Eine geheime Zeit für die ganze Runde. Beides stellst du unter „Einstellungen“ um.
- Die Zeiten schwanken stark (bei „Normal“ 4 bis 13 Sekunden pro Zug, 18 bis 75 Sekunden pro Runde), kurze kommen etwas häufiger vor als lange.
- Wer dran ist, hat die Hälfte in der Mitte dunkelblau hinterlegt; wer verliert, rot.
- Bei „Zeit pro Runde“ hat die nächste Person nach dem Weitergeben immer noch mindestens 1,5 Sekunden.
- Spielweise, Tempo, Ton, 2–5 Spieler und Punkte unter „Einstellungen“. Uhr antippen während der Runde pausiert, „Neustart“ setzt Runde oder Punkte zurück.

### Wortbombe online (zwei Handys)

Zum Spielen, wenn ihr nicht am selben Ort seid, zum Beispiel beim Telefonieren:

1. Beide öffnen die Wortbombe und tippen auf **„Online spielen“**.
2. Eine Person tippt **„Spiel erstellen“** und sagt den vierstelligen Code an.
3. Die andere tippt **„Beitreten“**, gibt den Code ein und tippt **„Verbinden“**.

Danach sehen beide dieselbe Kategorie. Wer dran ist, drückt den Buchstaben auf seinem Handy, beim anderen verschwindet er sofort. Uhr, Explosion und Punkte laufen auf beiden gleich; das Handy, das das Spiel erstellt hat, führt die geheime Uhr.

Technik: Die Handys finden sich über den kostenlosen Vermittlungsdienst von PeerJS. Die Bibliothek liegt als Kopie im App-Ordner und wird erst beim Tippen auf „Online spielen“ geladen. Die Spieldaten gehen danach direkt von Handy zu Handy. Der Online-Modus braucht Internet, alles andere läuft weiter offline. Welche Daten dabei an wen gehen, steht unter [Datenschutz](datenschutz.html).

## Heiß & Kalt

Kooperatives Wortspiel: 16 Begriffe liegen aus, eines ist das Geheimwort. Nur der Hinweisgeber kennt es.

1. Der Hinweisgeber wählt aus drei Gegensatzpaaren eines (zum Beispiel „heiß ↔ kalt“) und zeigt auf einer Skala mit vier Stufen, wo das Geheimwort liegt („eher heiß“).
2. Die Rater streichen danach mindestens einen Begriff, der nicht passt.
3. Nach 5 Hinweisen soll nur noch das Geheimwort übrig sein. Wird es gestrichen oder falsch getippt, habt ihr gemeinsam verloren. Mit „Ich weiß es“ kann man jederzeit direkt tippen.

- **An einem Handy:** Die App verdeckt das Geheimwort, bis der Hinweisgeber es aufdeckt, und fordert danach zum Weitergeben auf.
- **Online zu zweit:** wie bei der Wortbombe per vierstelligem Code. Das Geheimwort bekommt nur das Handy der Person, die die Hinweise gibt. Nach jedem Spiel werden die Rollen getauscht.
- 313 Begriffe und 110 Gegensatzpaare.

## Chooser

Alle legen einen Finger aufs Display. Sobald keine Finger mehr dazukommen, pochen die Ringe dreimal im Sekundentakt, dann wählt die App zufällig aus. Gewählte Finger werden dunkelblau hervorgehoben, die anderen verblassen. Bei genau einer gewählten Person flutet Navy den Bildschirm. Alle Finger loslassen startet die nächste Runde.

- Oben in der Mitte stellst du ein, wie viele gewählt werden: mit −/+ oder indem du die Zahl antippst und eintippst. Keine Obergrenze.
- Es braucht immer mindestens einen Finger mehr, als gewählt werden. Wie viele Finger gleichzeitig erkannt werden, begrenzt nur das Handy selbst.

## Codenames Duett

Kooperatives Wortspiel für zwei nach dem Vorbild von Codenames Duett. 25 Wörter liegen auf dem Brett. Jede Seite hat einen eigenen Schlüssel mit 9 Agenten, 3 Attentätern und 13 Passanten, zusammen gibt es 15 Agenten. Abwechselnd gibt eine Person einen Hinweis (ein Wort und eine Zahl), die andere tippt Wörter an. Agent heißt weiter raten, Passant beendet den Zug, ein Attentäter beendet das Spiel. Nach 9 Zügen (einstellbar 6 bis 12) folgt der plötzliche Tod ohne Hinweise.

**Drei Spielarten**

- **Zwei Handys:** Ein Handy erstellt das Spiel und zeigt einen Spiel-Code (z. B. `KX7-P3M`), das zweite tritt mit dem Code bei. Jedes Handy zeigt nur den eigenen Schlüssel.
  - *Mit Internet:* Hinweise und Tipps erscheinen live auf beiden Handys. Die Züge laufen verschlüsselt (AES-GCM, Schlüssel aus dem Spiel-Code) über den freien Dienst ntfy.sh. Nach einem Funkloch holt das Handy verpasste Züge nach.
  - *Ohne Internet:* Der Code erzeugt auf beiden Handys dasselbe Brett und dieselben Schlüssel. Hinweise sagt ihr laut, jeden Tipp tippt ihr auf beiden Handys an. Der „Stand“ oben muss auf beiden Handys gleich sein.
- **Ein Handy zu zweit:** Ihr gebt das Handy weiter. Vor jedem Wechsel verdeckt ein Sichtschutz den Schlüssel („Handy an Lea“ → „Ich bin Lea“). Komplett offline.
- **Allein mit KI-Partner:** Die KI spielt die zweite Seite. Sie gibt Hinweise mit Zahl und versteht deine Hinweise, solange sie das Wort kennt (Vorschläge beim Tippen). Nach jedem Zug zeigt der Verlauf, welche Wörter die KI gemeint hat. Komplett offline.

**Virtueller Gegner (ein- und ausschaltbar):** Ein KI-Team spielt vorab dasselbe Brett, in drei Stärken. Oben steht, wie viele Agenten es nach gleich vielen Zügen hatte. Am Ende gewinnt das Duell, wer mit weniger Zügen fertig wird. Bei Zwei Handys steckt die Einstellung im Spiel-Code, beide Handys sehen denselben Gegner.

Die KI kennt 418 Spielwörter mit je 15 bis 18 Assoziationen (gut 3.100 Begriffe), Doppelbedeutungen inklusive (Bank, Schloss, Kiefer, Strauß). Sie gibt keine Hinweise, die auf dem Brett liegen oder ein Brettwort enthalten.

Weitere Funktionen: letzter Schritt zurücknehmen, Verlauf aller Züge, beide Schlüssel nach dem Spiel aufdecken, Spielstand bleibt beim Schließen erhalten, Hoch- und Querformat, helles und dunkles Design.

## Aufbau

Jede App ist ein eigenständiger Ordner ohne externe Abhängigkeiten:

- `index.html`: die komplette App (HTML, CSS und JavaScript in einer Datei)
- `manifest.webmanifest`: Name, Icon und Startverhalten für „Zum Home-Bildschirm“
- `sw.js`: Service Worker, der die App beim ersten Öffnen speichert und danach offline ausliefert
- `icon-180.png`, `icon-192.png`, `icon-512.png`: App-Icons
- `peerjs.min.js` und `peerjs-LICENSE.txt` (nur Wortbombe sowie Heiß & Kalt): PeerJS 1.5.4 für den Online-Modus, unverändert aus dem npm-Paket, MIT-Lizenz

Im Hauptordner liegen außerdem die Startseite `index.html` und die Datenschutzhinweise `datenschutz.html`.

Die Würfel nutzen `crypto.getRandomValues` mit Rejection Sampling, damit jede Augenzahl gleich wahrscheinlich ist.
Das Design folgt dem Designsystem Navy Research.

## Auf dem Handy installieren

1. Adresse der App öffnen: auf dem iPhone in Safari, auf Android in Chrome.
2. iPhone: Teilen → „Zum Home-Bildschirm“. Android: Menü → „App installieren“.
3. Die App einmal mit Internet über das neue Icon öffnen. Danach läuft sie offline.

## Eine App ändern

1. Datei im Ordner der App bearbeiten und pushen. GitHub Pages veröffentlicht die Änderung nach etwa einer Minute.
2. In `sw.js` derselben App die Versionsnummer erhöhen (z. B. `v2` → `v3`). Erst dann holen sich installierte Apps die neue Version, beim nächsten Start mit Internet.

## Sicherheit und Datenschutz

- Alles, was vom anderen Handy kommt, wird vor dem Anzeigen geprüft. Das passiert in `applyState` (Wortbombe), `cleanState` (Heiß & Kalt) und `sanitize` (Codenames Duett). Neue Felder im Online-Stand dort mit aufnehmen und nie ungeprüft per `innerHTML` anzeigen.
- Keine Skripte, Schriften oder Bilder von fremden Servern einbinden. Bibliotheken als Kopie in den App-Ordner legen.
- Kommt ein neuer Online-Dienst dazu, `datenschutz.html` ergänzen.
- Ein eigener Relay-Server für Codenames per `?relay=` wirkt nur unter `localhost` zum Testen.
