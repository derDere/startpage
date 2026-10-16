# Baut dist/windows/MyStartPage.exe
python -m venv .venv
.venv\Scripts\python -m pip install -q -r requirements.txt
.venv\Scripts\pyinstaller MyStartPage.spec --noconfirm --distpath dist/windows --workpath build/windows
