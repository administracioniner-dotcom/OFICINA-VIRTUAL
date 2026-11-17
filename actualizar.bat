@echo off
rem Doble clic: baja las ultimas novedades de GitHub y reinstala lo necesario. Solo vale si la carpeta se bajo con "git clone".
cd /d "%~dp0"
git pull
if errorlevel 1 (
  echo.
  echo No se pudo actualizar. Si te sale un aviso de cambios locales, mandame una captura.
  pause
  exit /b 1
)
call npm install
echo.
echo Listo. Cierra y vuelve a abrir la oficina con iniciar.bat.
pause
