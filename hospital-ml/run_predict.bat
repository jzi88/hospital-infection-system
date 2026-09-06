@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat
python predict_and_alert.py
pause
