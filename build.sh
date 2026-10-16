#!/usr/bin/env bash
# Baut dist/linux/MyStartPage (unter Windows über WSL: wsl bash build.sh)
set -e
# Die venv liegt im Linux-Home, weil sie auf einem Windows-Laufwerk unter WSL sehr langsam ist.
venv="$HOME/.venvs/mystartpage"
python3 -m venv "$venv"
"$venv/bin/pip" install -q -r requirements.txt
"$venv/bin/pyinstaller" MyStartPage.spec --noconfirm --distpath dist/linux --workpath build/linux
