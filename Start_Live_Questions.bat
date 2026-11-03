@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 scripts\launch_live_questions.py
) else (
  python scripts\launch_live_questions.py
)
pause
