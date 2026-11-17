@echo off
rem Doble clic: conecta un agente de la oficina virtual con Claude Code (crea .claude\settings.json con los hooks).
rem El nombre debe ser IGUAL al del agente real en la oficina (mayusculas y tildes da igual; los espacios no).
cd /d "%~dp0"
set "NOMBRE=Agente CAE"
set /p "NOMBRE=Nombre del agente en la oficina (Intro = Agente CAE): "
if "%NOMBRE%"=="" set "NOMBRE=Agente CAE"
node conectar-oficina.mjs "%NOMBRE%"
pause
