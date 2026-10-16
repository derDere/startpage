# PyInstaller-Spezifikation für Windows und Linux: eine einzelne Exe ohne Konsole.
from glob import glob

datas = [(file, ".") for file in ("startpage.html", "script.js", "style.css", "example_config.json")]
datas += [(file, "gfx") for file in glob("gfx/*.*")]

a = Analysis(["app/main.py"], datas=datas)
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, a.binaries, a.datas, name="MyStartPage", console=False)
