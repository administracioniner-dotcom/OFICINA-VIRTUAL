@echo off
rem Doble clic: abre una conversacion con el agente CAE (Claude Code dentro de esta carpeta, con sus instrucciones).
rem Ejemplos de lo que puedes escribir:
rem   Quiero una estimacion RES060
rem   Revisa este calculo: casos\mi-caso.xlsx
rem   Que fichas industriales hay para bombas de calor?
cd /d "%~dp0"
claude
