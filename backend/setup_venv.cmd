@echo off
python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
echo.
echo Virtual environment is ready.
echo To activate later, run:
echo .venv\Scripts\activate.bat
