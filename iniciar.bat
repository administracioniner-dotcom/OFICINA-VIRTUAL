@echo off
chcp 65001 >nul
cd /d "%~dp0"
title INER SMART Virtual Office

where node >nul 2>nul
if errorlevel 1 (
  echo No se encuentra Node.js.
  echo Instala la version LTS desde https://nodejs.org y vuelve a abrir este archivo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Primera vez: instalando lo necesario, puede tardar un par de minutos...
  call npm install
  if errorlevel 1 (
    echo La instalacion ha fallado. Revisa tu conexion a Internet y vuelve a intentarlo.
    pause
    exit /b 1
  )
)

echo.
echo Abriendo la oficina en http://localhost:5173
echo Deja esta ventana abierta mientras la uses. Para cerrar la oficina, cierra esta ventana.
echo.
call npm run dev -- --open
if errorlevel 1 (
  echo.
  echo No se ha podido arrancar. Si dice que el puerto 5173 esta ocupado, cierra la otra ventana de la oficina.
  pause
)
