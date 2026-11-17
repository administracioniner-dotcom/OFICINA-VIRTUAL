@echo off
rem Lanza la tarea semanal del agente CAE sin pantalla. Lo llama el Programador de tareas (ver programar-tarea.bat).
rem Permisos: buscar y leer en la web, leer y escribir en esta carpeta y solo el comando "node validar.mjs".
rem Todo lo demas se deniega (no hay nadie para aceptar permisos). Tope de gasto por ejecucion: 5 USD (cambialo aqui).
cd /d "%~dp0"
if not exist informes mkdir informes
claude -p "Ejecuta la tarea semanal descrita en tareas\semanal.md" --permission-mode acceptEdits --allowedTools "WebSearch,WebFetch,Read,Glob,Grep,Write,Edit,Bash(node validar.mjs)" --max-budget-usd 5 > "informes\ultima-ejecucion.log" 2>&1
