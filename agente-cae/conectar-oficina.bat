@echo off
rem Doble clic: conecta el agente CAE con la oficina virtual (crea .claude\settings.json con los hooks).
rem Si en la oficina llamas al agente de otra forma, ejecuta:  node conectar-oficina.mjs "Otro nombre"
cd /d "%~dp0"
node conectar-oficina.mjs "Agente CAE"
pause
