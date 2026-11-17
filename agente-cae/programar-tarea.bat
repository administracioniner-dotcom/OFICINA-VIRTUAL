@echo off
rem Doble clic para programar la tarea semanal (miercoles 23:00).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0programar-tarea.ps1"
pause
