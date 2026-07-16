@echo off
echo Creating virtual environment...
python -m venv venv

echo Activating environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ✅ Setup complete!
echo To run the app:
echo   1. venv\Scripts\activate.bat
echo   2. python main.py
pause
