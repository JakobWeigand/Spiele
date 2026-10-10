#!/usr/bin/env python3
"""Spieleabend (Ordner app/): neue Version vorbereiten.

    python3 tools/release.py 1.0.1      # Version setzen und Prüfsummen schreiben
    python3 tools/release.py --check    # prüfen, ob app/sw.js zu den Dateien passt (z. B. vor dem Push)

Was passiert:
  1. Jede HTML-Seite in app/ bekommt <meta name="app-version" content="…">.
  2. Für jede Datei in app/ wird die SHA-256-Prüfsumme berechnet und in app/sw.js eingetragen.
     Der Service Worker lädt bei einem Update jede Datei frisch und verwirft das Update, wenn eine Prüfsumme nicht stimmt.
  3. app/version.json bekommt Version und Datum (die App zeigt sie bei der Update-Suche an).

Danach committen und pushen. GitHub Pages veröffentlicht nach etwa einer Minute,
installierte Apps holen sich die neue Version selbst. Nur Standardbibliothek.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
GENERATED = re.compile(r"// @generated-start\n.*?// @generated-end\n", re.S)
META = re.compile(r'(<meta name="app-version" content=")([^"]*)(">)')
VERSION_RE = re.compile(r"^\d{1,4}\.\d{1,4}\.\d{1,4}$")
SKIP = {"sw.js", "version.json"}


def app_files() -> list[Path]:
    files = []
    for p in sorted(APP.rglob("*")):
        rel = p.relative_to(APP)
        if not p.is_file() or any(part.startswith(".") for part in rel.parts):
            continue
        if rel.as_posix() in SKIP:
            continue
        files.append(p)
    return files


def html_files() -> list[Path]:
    return [p for p in app_files() if p.suffix == ".html"]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def hashes() -> dict[str, str]:
    # "./" und "<spiel>/" liefern dieselben Bytes wie die jeweilige index.html
    table: dict[str, str] = {}
    for p in app_files():
        rel = p.relative_to(APP).as_posix()
        table[rel] = sha256(p)
        if p.name == "index.html":
            folder = rel[: -len("index.html")]
            table[folder or "./"] = table[rel]
    return dict(sorted(table.items()))


def generated_block(version: str) -> str:
    lines = [f'  {json.dumps(k, ensure_ascii=False)}: "{v}",' for k, v in hashes().items()]
    lines[-1] = lines[-1].rstrip(",")
    return (
        "// @generated-start\n"
        f'const VERSION = "{version}";\n'
        "const FILES = {\n" + "\n".join(lines) + "\n};\n"
        "// @generated-end\n"
    )


def page_versions() -> dict[str, str]:
    out = {}
    for p in html_files():
        m = META.search(p.read_text(encoding="utf-8"))
        out[p.relative_to(APP).as_posix()] = m.group(2) if m else ""
    return out


def check() -> int:
    versions = page_versions()
    found = set(versions.values())
    ok = True
    missing = [k for k, v in versions.items() if not v]
    if missing:
        ok = False
        print("Ohne app-version-Meta: " + ", ".join(missing))
    if len(found) != 1:
        ok = False
        print("Uneinheitliche Versionen: " + json.dumps(versions, ensure_ascii=False))
    version = next(iter(found)) if found else ""
    sw = (APP / "sw.js").read_text(encoding="utf-8")
    block = GENERATED.search(sw)
    if not block or block.group(0) != generated_block(version):
        ok = False
        print("app/sw.js passt nicht zu den Dateien.")
    vj = json.loads((APP / "version.json").read_text(encoding="utf-8")) if (APP / "version.json").exists() else {}
    if vj.get("version") != version:
        ok = False
        print(f"app/version.json ({vj.get('version')}) passt nicht zu den Seiten ({version}).")
    print(f"Version {version}: " + ("alles stimmig." if ok else "bitte tools/release.py mit neuer Version ausführen."))
    return 0 if ok else 1


def release(version: str) -> int:
    if not VERSION_RE.match(version):
        print("Version bitte als Zahl.Zahl.Zahl angeben, z. B. 1.0.1")
        return 2
    for p in html_files():
        html = p.read_text(encoding="utf-8")
        if not META.search(html):
            print(f'In {p.relative_to(ROOT)} fehlt <meta name="app-version" content="…">.')
            return 2
        p.write_text(META.sub(lambda m: m.group(1) + version + m.group(3), html), encoding="utf-8")

    sw_path = APP / "sw.js"
    sw = sw_path.read_text(encoding="utf-8")
    if not GENERATED.search(sw):
        print("In app/sw.js fehlen die Markierungen // @generated-start und // @generated-end.")
        return 2
    sw_path.write_text(GENERATED.sub(lambda m: generated_block(version), sw), encoding="utf-8")

    info = {"version": version, "released": dt.date.today().isoformat()}
    (APP / "version.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Version {version} vorbereitet: {len(hashes())} Einträge mit Prüfsumme in app/sw.js.")
    print("Jetzt committen und pushen.")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    return check() if argv[1] == "--check" else release(argv[1])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
